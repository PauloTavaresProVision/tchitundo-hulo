import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { deleteUser, findUserById, listUsers, publicUser, updateUser, type UserRole } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });

  try {
    const { id } = await context.params;
    const current = await findUserById(id);
    if (!current) return Response.json({ error: "Utilizador não encontrado." }, { status: 404 });
    const body = await request.json() as { displayName?: string; email?: string; role?: UserRole; active?: boolean; password?: string; resetMfa?: boolean };
    if (body.role && !["admin", "editor"].includes(body.role)) throw new Error("Perfil inválido.");
    if (id === session.userId && (body.active === false || body.role === "editor")) throw new Error("Não pode remover as suas próprias permissões de administrador.");
    if (current.role === "admin" && (body.role === "editor" || body.active === false)) {
      const otherAdmins = (await listUsers()).filter((user) => user.id !== id && user.active && user.role === "admin");
      if (otherAdmins.length === 0) throw new Error("O backoffice deve manter pelo menos um administrador activo.");
    }

    const user = await updateUser(id, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.password ? { password: body.password } : {}),
      ...(body.resetMfa ? { mfaEnabled: false, mfaSecretEncrypted: null } : {}),
    });
    return Response.json({ user: publicUser(user) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível actualizar o utilizador." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await context.params;
  if (id === session.userId) return Response.json({ error: "Não pode eliminar a sua própria conta." }, { status: 400 });
  const user = await findUserById(id);
  if (!user) return Response.json({ error: "Utilizador não encontrado." }, { status: 404 });
  if (user.role === "admin") {
    const otherAdmins = (await listUsers()).filter((item) => item.id !== id && item.active && item.role === "admin");
    if (otherAdmins.length === 0) return Response.json({ error: "O backoffice deve manter pelo menos um administrador activo." }, { status: 400 });
  }
  await deleteUser(id);
  return new Response(null, { status: 204 });
}
