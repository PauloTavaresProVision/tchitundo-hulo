import { createAdminSession, expiredChallengeCookie, readMfaChallenge, sameOrigin, sessionCookie } from "@/lib/admin-auth";
import { canAttemptLogin, clearLoginFailures, loginKey, recordLoginFailure } from "@/lib/login-rate-limit";
import { verifyTotp } from "@/lib/totp";
import { findUserById, publicUser, updateUser } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const challenge = await readMfaChallenge(request);
  if (!challenge) return Response.json({ error: "O desafio de autenticação expirou. Inicie novamente." }, { status: 401 });

  const body = await request.json().catch(() => null) as { code?: string } | null;
  const user = await findUserById(challenge.userId);
  const key = loginKey(request, `mfa-${challenge.userId}`);
  if (!canAttemptLogin(key)) return Response.json({ error: "Demasiadas tentativas. Aguarde 15 minutos." }, { status: 429 });
  if (!body?.code || !user?.active || !user.mfaSecretEncrypted || !await verifyTotp(user.mfaSecretEncrypted, body.code)) {
    recordLoginFailure(key);
    return Response.json({ error: "Código inválido. Confirme a hora do dispositivo e tente novamente." }, { status: 401 });
  }
  clearLoginFailures(key);

  const updated = await updateUser(user.id, { mfaEnabled: true, lastLoginAt: new Date().toISOString() });
  const token = await createAdminSession(updated);
  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie(token, request));
  headers.append("Set-Cookie", expiredChallengeCookie());
  return Response.json({ authenticated: true, stage: "authenticated", username: updated.username, role: updated.role, user: publicUser(updated) }, { headers });
}
