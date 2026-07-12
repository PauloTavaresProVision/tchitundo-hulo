import { challengeCookie, createMfaChallenge, readMfaChallenge, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { jsonRequestTooLarge } from "@/lib/request-security";
import { revokeUserSessions } from "@/lib/sessions-store";
import { createTotpSetup, totpSetupFromEncrypted } from "@/lib/totp";
import { findUserById, updateUser, validatePassword } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  if (jsonRequestTooLarge(request, 8_192)) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  const challenge = await readMfaChallenge(request);
  if (!challenge || challenge.purpose !== "password") return Response.json({ error: "O pedido expirou. Inicie novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as { password?: string; confirmation?: string } | null;
  if (!body?.password || body.password !== body.confirmation) return Response.json({ error: "As palavras-passe não coincidem." }, { status: 400 });
  try {
    validatePassword(body.password);
    const user = await findUserById(challenge.userId);
    if (!user?.active) return Response.json({ error: "Utilizador inválido." }, { status: 401 });
    const updated = await updateUser(user.id, { password: body.password, mustChangePassword: false });
    await revokeUserSessions(user.id);
    await recordAudit({ action: "auth.password_changed", outcome: "success", request, userId: user.id, username: user.username });

    if (!updated.mfaSecretEncrypted) {
      const setup = await createTotpSetup(updated.username);
      await updateUser(updated.id, { mfaSecretEncrypted: setup.encryptedSecret, mfaEnabled: false });
      const token = await createMfaChallenge(updated.id, "setup");
      return Response.json({ stage: "setup", username: updated.username, setup: { secret: setup.secret, uri: setup.uri, qrCode: setup.qrCode } }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
    }
    if (!updated.mfaEnabled) {
      const setup = await totpSetupFromEncrypted(updated.username, updated.mfaSecretEncrypted);
      const token = await createMfaChallenge(updated.id, "setup");
      return Response.json({ stage: "setup", username: updated.username, setup }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
    }
    const token = await createMfaChallenge(updated.id, "mfa");
    return Response.json({ stage: "mfa", username: updated.username }, { headers: { "Set-Cookie": challengeCookie(token, request), "Cache-Control": "no-store" } });
  } catch (error) {
    await recordAudit({ action: "auth.password_changed", outcome: "failure", request, userId: challenge.userId });
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível alterar a palavra-passe." }, { status: 400 });
  }
}
