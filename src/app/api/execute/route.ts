import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const CONFIG_PATH = path.join(process.cwd(), "harbormaster.config.json");

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { actionType, payload, draft } = await request.json();
    if (!actionType || !payload) {
      return NextResponse.json({ error: "Missing actionType or payload" }, { status: 400 });
    }

    // Read config
    let config: any = {};
    try {
      const data = await fs.readFile(CONFIG_PATH, "utf-8");
      config = JSON.parse(data);
    } catch (e) {}

    const isDraft = !!draft;

    if (isDraft) {
      let draftText = "";
      if (config.geminiKey) {
        try {
          const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });
          const prompt = `You are HarborMaster, an AI first mate for open-source maintainers.
Draft a short, highly professional message for ${actionType === "discord" ? "the Discord support channel" : actionType === "slack" ? "the internal Slack engineering channel" : "the Linear task comment"}.

Context:
- Action Category: ${payload.category || "General"}
- Title: "${payload.title}"
- Issue/PR Key: "${payload.issueKey || "General"}"
- Current Status: "${payload.status || "Pending"}"
- Additional context: "${payload.summary || ""}"

Write only the draft text. Do not wrap in quotes or add extra introductory sentences. Keep it short (2-3 sentences max) and helpful, citing the issue key and status.`;

          const res = await generateText({
            model: google("gemini-2.5-flash"),
            prompt,
          });
          draftText = res.text.trim();
        } catch (err) {
          console.error("Gemini drafting failed:", err);
        }
      }

      if (!draftText) {
        // Fallback realistic drafts
        if (actionType === "discord") {
          draftText = `Hi community! Regarding "${payload.title}" (${payload.issueKey}), we have identified the issue. The current status is ${payload.status || "in progress"} and we are verifying the fix. We will update you as soon as it's merged.`;
        } else if (actionType === "slack") {
          draftText = `Hey team, quick update on ${payload.issueKey} (${payload.title}). Status is currently ${payload.status || "CI failing"}. I'm jumping on this now to unblock the release.`;
        } else {
          draftText = `Status update: marking "${payload.title}" as under active review. CI state is ${payload.status || "pending"}. Linked PR is being verified.`;
        }
      }

      return NextResponse.json({
        ok: true,
        draft: true,
        text: draftText,
      });
    }

    // Actual execution
    if (actionType === "discord") {
      const token = config.discordToken;
      const channelId = config.discordChannel;
      const messageText = payload.text;

      if (token && channelId && token !== "••••••••") {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ content: messageText }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({
            ok: false,
            error: errData.message || `Discord API returned status ${res.status}`,
          });
        }

        return NextResponse.json({
          ok: true,
          live: true,
          message: "Message posted successfully to Discord channel!",
        });
      } else {
        return NextResponse.json({
          ok: true,
          live: false,
          message: "Simulated Discord Post (No active bot credentials):",
          details: { channelId, text: messageText },
        });
      }
    }

    if (actionType === "github") {
      const token = config.githubToken;
      const owner = config.githubOwner;
      const repo = config.githubRepo;
      const commentText = payload.text;
      const prNumber = payload.prNumber || "184";

      if (token && owner && repo && token !== "••••••••") {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "HarborMaster-App",
          },
          body: JSON.stringify({ body: commentText }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({
            ok: false,
            error: errData.message || `GitHub API returned status ${res.status}`,
          });
        }

        return NextResponse.json({
          ok: true,
          live: true,
          message: `Comment posted successfully to PR #${prNumber}!`,
        });
      } else {
        return NextResponse.json({
          ok: true,
          live: false,
          message: "Simulated GitHub Comment (No active credentials):",
          details: { repo: `${owner}/${repo}`, prNumber, text: commentText },
        });
      }
    }

    if (actionType === "slack" || actionType === "linear") {
      return NextResponse.json({
        ok: true,
        live: false,
        message: `Simulated ${actionType === "slack" ? "Slack Post" : "Linear Status Update"} successful!`,
        details: payload,
      });
    }

    return NextResponse.json({ error: "Unsupported action type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
}
