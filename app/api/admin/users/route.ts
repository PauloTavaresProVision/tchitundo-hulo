import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { createUser, listUsers, publicUser, type UserRole } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });
  return Response.json({ users: (await listUsers()).map(publicUser) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });

  try {
    const body = await request.json() as { username?: string; displayName?: string; email?: string; role?: UserRole; password?: string };
    if (!body.username || !body.password || !["admin", "editor"].includes(body.role ?? "")) throw new Error("Preencha os campos obrigatórios.");
    const user = await createUser({ username: body.username, displayName: body.displayName ?? "", email: body.email ?? "", role: body.role!, password: body.password });
    return Response.json({ user: publicUser(user) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o utilizador." }, { status: 400 });
  }
}
