import { adminConfigured, challengeCookie, createMfaChallenge, expiredChallengeCookie, expiredSessionCookie, readAdminSession, readMfaChallenge, sameOrigin } from "@/lib/admin-auth";
import { canAttemptLogin, clearLoginFailures, loginKey, recordLoginFailure } from "@/lib/login-rate-limit";
import { createTotpSetup, totpSetupFromEncrypted } from "@/lib/totp";
import { findUserById, findUserByUsername, publicUser, updateUser, verifyUserPassword } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!adminConfigured()) return Response.json({ authenticated: false, configured: false, stage: "credentials" });
  const session = await readAdminSession(request);
  if (session) return Response.json({ authenticated: true, configured: true, stage: "authenticated", username: session.username, role: session.role });

  const challenge = await readMfaChallenge(request);
  if (challenge) {
    const user = await findUserById(challenge.userId);
    if (user?.active) {
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
  if (!adminConfigured()) return Response.json({ error: "Configure as credenciais do backoffice no servidor." }, { status: 503 });
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body) return Response.json({ error: "Pedido inválido." }, { status: 400 });

  const key = loginKey(request, body.username ?? "");
  if (!canAttemptLogin(key)) return Response.json({ error: "Demasiadas tentativas. Aguarde 15 minutos." }, { status: 429 });

  const user = await findUserByUsername(body.username ?? "").catch(() => null);
  if (!user || !user.active || !await verifyUserPassword(user, body.password ?? "")) {
    recordLoginFailure(key);
    return Response.json({ error: "Utilizador ou palavra-passe inválidos." }, { status: 401 });
  }
  clearLoginFailures(key);

  if (!user.mfaSecretEncrypted) {
    const setup = await createTotpSetup(user.username);
    await updateUser(user.id, { mfaSecretEncrypted: setup.encryptedSecret, mfaEnabled: false });
    const challenge = await createMfaChallenge(user.id, "setup");
    return Response.json(
      { authenticated: false, stage: "setup", username: user.username, setup: { secret: setup.secret, uri: setup.uri, qrCode: setup.qrCode } },
      { headers: { "Set-Cookie": challengeCookie(challenge, request) } },
    );
  }

  if (!user.mfaEnabled) {
    const setup = await totpSetupFromEncrypted(user.username, user.mfaSecretEncrypted);
    const challenge = await createMfaChallenge(user.id, "setup");
    return Response.json(
      { authenticated: false, stage: "setup", username: user.username, setup },
      { headers: { "Set-Cookie": challengeCookie(challenge, request) } },
    );
  }

  const challenge = await createMfaChallenge(user.id, "mfa");
  return Response.json(
    { authenticated: false, stage: "mfa", username: user.username, user: publicUser(user) },
    { headers: { "Set-Cookie": challengeCookie(challenge, request) } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const headers = new Headers();
  headers.append("Set-Cookie", expiredSessionCookie());
  headers.append("Set-Cookie", expiredChallengeCookie());
  return Response.json({ authenticated: false }, { headers });
}
