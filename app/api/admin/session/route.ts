import { adminConfigured, challengeCookie, createMfaChallenge, expiredChallengeCookie, expiredSessionCookie, readAdminSession, readMfaChallenge, revokeAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { canAttemptLogin, clearLoginFailures, loginKey, recordLoginFailure } from "@/lib/login-rate-limit";
import { jsonRequestTooLarge } from "@/lib/request-security";
import { createTotpSetup, totpSetupFromEncrypted } from "@/lib/totp";
import { findUserById, findUserByUsername, passwordNeedsUpgrade, publicUser, type BackofficeUser, updateUser, verifyUserPassword } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!adminConfigured()) return Response.json({ authenticated: false, configured: false, stage: "credentials" });
  const session = await readAdminSession(request);
  if (session) return Response.json({ authenticated: true, configured: true, stage: "authenticated", username: session.username, role: session.role });

  const challenge = await readMfaChallenge(request);
  if (challenge) {
    const user = await findUserById(challenge.userId);
    if (user?.active) {
      if (challenge.purpose === "password") return Response.json({ authenticated: false, configured: true, stage: "password", username: user.username });
      if (challenge.purpose === "setup" && user.mfaSecretEncrypted) {
        const setup = await totpSetupFromEncrypted(user.username, user.mfaSecretEncrypted);
        return Response.json({ authenticated: false, configured: true, stage: "setup", username: user.username, setup });
      }
      return Response.json({ authenticated: false, configured: true, stage: "mfa", username: user.username });
    }
  }
  return Response.json({ authenticated: false, configured: true, stage: "credentials" });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  if (jsonRequestTooLarge(request, 8_192)) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  if (!adminConfigured()) return Response.json({ error: "Configure as credenciais do backoffice no servidor." }, { status: 503 });
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body) return Response.json({ error: "Pedido inválido." }, { status: 400 });

  const key = loginKey(request, body.username ?? "");
  if (!canAttemptLogin(key)) return Response.json({ error: "Demasiadas tentativas. Aguarde 15 minutos." }, { status: 429 });
  const user = await findUserByUsername(body.username ?? "").catch(() => null);
  if (!user || !user.active || !await verifyUserPassword(user, body.password ?? "")) {
    recordLoginFailure(key);
    await recordAudit({ action: "auth.login", outcome: "failure", request, username: body.username ?? "" });
    return Response.json({ error: "Utilizador ou palavra-passe inválidos." }, { status: 401 });
  }
  clearLoginFailures(key);
  const verifiedUser = passwordNeedsUpgrade(user)
    ? await updateUser(user.id, { password: body.password ?? "", mustChangePassword: user.mustChangePassword })
    : user;
  await recordAudit({ action: "auth.password_verified", outcome: "success", request, userId: verifiedUser.id, username: verifiedUser.username });

  if (verifiedUser.mustChangePassword) {
    const token = await createMfaChallenge(verifiedUser.id, "password");
    return Response.json({ authenticated: false, stage: "password", username: verifiedUser.username }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
  }
  return nextAuthenticationStep(verifiedUser, request);
}

async function nextAuthenticationStep(user: BackofficeUser, request: Request) {
  if (!user.mfaSecretEncrypted) {
    const setup = await createTotpSetup(user.username);
    await updateUser(user.id, { mfaSecretEncrypted: setup.encryptedSecret, mfaEnabled: false });
    const token = await createMfaChallenge(user.id, "setup");
    return Response.json({ authenticated: false, stage: "setup", username: user.username, setup: { secret: setup.secret, uri: setup.uri, qrCode: setup.qrCode } }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
  }
  if (!user.mfaEnabled) {
    const setup = await totpSetupFromEncrypted(user.username, user.mfaSecretEncrypted);
    const token = await createMfaChallenge(user.id, "setup");
    return Response.json({ authenticated: false, stage: "setup", username: user.username, setup }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
  }
  const token = await createMfaChallenge(user.id, "mfa");
  return Response.json({ authenticated: false, stage: "mfa", username: user.username, user: publicUser(user) }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  await revokeAdminSession(request);
  await recordAudit({ action: "auth.logout", outcome: "success", request, userId: session?.userId, username: session?.username });
  const headers = new Headers({ "Cache-Control": "no-store", "Clear-Site-Data": '"cache", "cookies", "storage"' });
  headers.append("Set-Cookie", expiredSessionCookie());
  headers.append("Set-Cookie", expiredChallengeCookie());
  return Response.json({ authenticated: false }, { headers });
}
