import { getBrief } from "@/lib/harbormaster-service";

export const runtime = "nodejs";

export async function GET() {
  const brief = await getBrief();
  return Response.json(brief);
}
