import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { jsonRequestTooLarge } from "@/lib/request-security";
import { createUser, listUsers, publicUser, type UserRole } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });
  return Response.json({ users: (await listUsers()).map(publicUser) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (jsonRequestTooLarge(request, 16_384)) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });

  try {
    const body = await request.json() as { username?: string; displayName?: string; email?: string; role?: UserRole; password?: string };
    if (!body.username || !body.password || !["admin", "editor"].includes(body.role ?? "")) throw new Error("Preencha os campos obrigatórios.");
    const user = await createUser({ username: body.username, displayName: body.displayName ?? "", email: body.email ?? "", role: body.role!, password: body.password });
    await recordAudit({ action: "user.created", outcome: "success", request, userId: session.userId, username: session.username, target: user.username, detail: { role: user.role } });
    return Response.json({ user: publicUser(user) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o utilizador." }, { status: 400 });
  }
}
