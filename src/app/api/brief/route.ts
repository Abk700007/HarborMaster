import { getBrief } from "@/lib/harbormaster-service";
import { syncLiveWorkspace } from "@/lib/sync-live";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
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

  await syncLiveWorkspace(config);

  const brief = await getBrief(config);
  return Response.json(brief);
}
