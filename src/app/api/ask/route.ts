import { answerQuestion } from "@/lib/harbormaster-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: string };
  const question = body.question?.trim() || "What should I work on next?";
  const answer = await answerQuestion(question);
  return Response.json(answer);
}
