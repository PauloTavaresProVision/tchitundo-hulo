import { readAdminSession } from "@/lib/admin-auth";
import { readAnalyticsSummary } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  return Response.json(await readAnalyticsSummary(days), { headers: { "Cache-Control": "no-store" } });
}
