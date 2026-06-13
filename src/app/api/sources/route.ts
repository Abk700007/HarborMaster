import { getSourceStatuses } from "@/lib/harbormaster-service";

export const runtime = "nodejs";

export async function GET() {
  const sources = await getSourceStatuses();
  return Response.json({ sources });
}
