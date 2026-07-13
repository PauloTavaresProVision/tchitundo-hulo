import { readAdminSession } from "@/lib/admin-auth";
import { readAuditEntries } from "@/lib/audit-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });
  const entries = await readAuditEntries(500);
  if (new URL(request.url).searchParams.get("download") === "1") {
    return new Response(entries.slice().reverse().map((entry) => JSON.stringify(entry)).join("\n") + "\n", {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Content-Disposition": "attachment; filename=auditoria-tchitundo-hulo.jsonl", "Cache-Control": "no-store" },
    });
  }
  return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}
