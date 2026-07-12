import { adminConfig, createAdminSession, expiredSessionCookie, readAdminSession, sameOrigin, sessionCookie, validCredentials } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = adminConfig();
  if (!config) return Response.json({ authenticated: false, configured: false });
  const session = await readAdminSession(request);
  return Response.json({ authenticated: Boolean(session), configured: true, username: session?.username ?? null });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  if (!adminConfig()) return Response.json({ error: "Configure as credenciais do backoffice no servidor." }, { status: 503 });

  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body || !await validCredentials(body.username ?? "", body.password ?? "")) {
    return Response.json({ error: "Utilizador ou palavra-passe inválidos." }, { status: 401 });
  }

  const token = await createAdminSession(body.username!);
  return Response.json(
    { authenticated: true, username: body.username },
    { headers: { "Set-Cookie": sessionCookie(token, request) } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": expiredSessionCookie() } });
}
