import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type UserRole = "admin" | "editor";

export type BackofficeUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: string;
};

export type PublicBackofficeUser = Omit<BackofficeUser, "passwordHash" | "passwordSalt" | "passwordIterations" | "mfaSecretEncrypted">;

const PASSWORD_ITERATIONS = 600_000;
let writeQueue: Promise<unknown> = Promise.resolve();

function usersPath() {
  return process.env.BACKOFFICE_USERS_PATH || path.join(process.cwd(), "data", "users.json");
}

export async function listUsers() {
  return ensureUsers();
}

export async function findUserById(id: string) {
  return (await ensureUsers()).find((user) => user.id === id) ?? null;
}

export async function findUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  return (await ensureUsers()).find((user) => user.username === normalized) ?? null;
}

export async function createUser(input: { username: string; displayName: string; email: string; role: UserRole; password: string }) {
  validatePassword(input.password);
  const username = normalizeUsername(input.username);
  if (!username) throw new Error("Indique um nome de utilizador válido.");

  return mutateUsers(async (users) => {
    if (users.some((user) => user.username === username)) throw new Error("Este utilizador já existe.");
    const password = await hashPassword(input.password);
    const now = new Date().toISOString();
    const user: BackofficeUser = {
      id: crypto.randomUUID(),
      username,
      displayName: input.displayName.trim() || username,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      active: true,
      ...password,
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      mustChangePassword: true,
      passwordChangedAt: now,
    };
    users.push(user);
    return user;
  });
}

export async function updateUser(id: string, input: Partial<Pick<BackofficeUser, "displayName" | "email" | "role" | "active" | "mfaEnabled" | "mfaSecretEncrypted" | "lastLoginAt" | "mustChangePassword">> & { password?: string }) {
  if (input.password) validatePassword(input.password);
  return mutateUsers(async (users) => {
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) throw new Error("Utilizador não encontrado.");
    const current = users[index];
    const password = input.password ? await hashPassword(input.password) : {};
    users[index] = {
      ...current,
      ...input,
      ...password,
      displayName: input.displayName?.trim() || current.displayName,
      email: input.email?.trim().toLowerCase() ?? current.email,
      mustChangePassword: input.password ? (input.mustChangePassword ?? false) : (input.mustChangePassword ?? current.mustChangePassword),
      passwordChangedAt: input.password ? new Date().toISOString() : current.passwordChangedAt,
      updatedAt: new Date().toISOString(),
    };
    delete (users[index] as BackofficeUser & { password?: string }).password;
    return users[index];
  });
}

export async function deleteUser(id: string) {
  return mutateUsers(async (users) => {
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) throw new Error("Utilizador não encontrado.");
    const [removed] = users.splice(index, 1);
    return removed;
  });
}

export async function verifyUserPassword(user: BackofficeUser, password: string) {
  const candidate = await derivePassword(password, user.passwordSalt, user.passwordIterations);
  return constantTimeEqual(candidate, user.passwordHash);
}

export function publicUser(user: BackofficeUser): PublicBackofficeUser {
  const safe = { ...user } as Partial<BackofficeUser>;
  delete safe.passwordHash;
  delete safe.passwordSalt;
  delete safe.passwordIterations;
  delete safe.mfaSecretEncrypted;
  return safe as PublicBackofficeUser;
}

export function validatePassword(password: string) {
  if (password.length < 12) throw new Error("A palavra-passe deve ter pelo menos 12 caracteres.");
  if (password.length > 128) throw new Error("A palavra-passe deve ter no máximo 128 caracteres.");
}

export function passwordNeedsUpgrade(user: BackofficeUser) {
  return user.passwordIterations < PASSWORD_ITERATIONS;
}

async function ensureUsers(): Promise<BackofficeUser[]> {
  try {
    const raw = await readFile(usersPath(), "utf8");
    const users = JSON.parse(raw) as BackofficeUser[];
    if (!Array.isArray(users)) throw new Error("Invalid users store");
    return users.map(normalizeStoredUser);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    return bootstrapUsers();
  }
}

async function bootstrapUsers() {
  const username = process.env.BACKOFFICE_USERNAME?.trim();
  const password = process.env.BACKOFFICE_PASSWORD;
  if (!username || !password) throw new Error("Configure BACKOFFICE_USERNAME e BACKOFFICE_PASSWORD no servidor.");
  validatePassword(password);
  const passwordData = await hashPassword(password);
  const now = new Date().toISOString();
  const users: BackofficeUser[] = [{
    id: crypto.randomUUID(),
    username: normalizeUsername(username),
    displayName: "Administrador",
    email: "",
    role: "admin",
    active: true,
    ...passwordData,
    mfaEnabled: false,
    mfaSecretEncrypted: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    mustChangePassword: false,
    passwordChangedAt: now,
  }];
  await writeUsers(users);
  return users;
}

async function mutateUsers<T>(mutation: (users: BackofficeUser[]) => Promise<T> | T): Promise<T> {
  const operation = writeQueue.then(async () => {
    const users = await ensureUsers();
    const result = await mutation(users);
    await writeUsers(users);
    return result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function writeUsers(users: BackofficeUser[]) {
  const target = usersPath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(users, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

async function hashPassword(password: string) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64Url(saltBytes);
  return {
    passwordHash: await derivePassword(password, salt, PASSWORD_ITERATIONS),
    passwordSalt: salt,
    passwordIterations: PASSWORD_ITERATIONS,
  };
}

async function derivePassword(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(salt), iterations }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
}

function normalizeStoredUser(user: BackofficeUser): BackofficeUser {
  return {
    ...user,
    mustChangePassword: Boolean(user.mustChangePassword),
    passwordChangedAt: typeof user.passwordChangedAt === "string" ? user.passwordChangedAt : user.updatedAt,
  };
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function isMissingFile(error: unknown) {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
