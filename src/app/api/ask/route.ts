import { answerQuestion } from "@/lib/harbormaster-service";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: string };
  const question = body.question?.trim() || "What should I work on next?";
  
  const cookieStore = await cookies();
  const config = {
    githubToken: cookieStore.get("harbormaster_github_token")?.value || "",
    githubOwner: cookieStore.get("harbormaster_github_owner")?.value || "",
    githubRepo: cookieStore.get("harbormaster_github_repo")?.value || "",
    discordToken: cookieStore.get("harbormaster_discord_token")?.value || "",
    discordChannel: cookieStore.get("harbormaster_discord_channel")?.value || "",
    notionToken: cookieStore.get("harbormaster_notion_token")?.value || "",
    geminiKey: cookieStore.get("harbormaster_gemini_key")?.value || "",
  };

  const answer = await answerQuestion(question, config);
  return Response.json(answer);
}
