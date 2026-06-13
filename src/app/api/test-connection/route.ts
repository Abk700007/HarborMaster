import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const CONFIG_PATH = path.join(process.cwd(), "harbormaster.config.json");

export const runtime = "nodejs";

async function getStoredSecret(key: string): Promise<string> {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    const json = JSON.parse(data);
    return json[key] || "";
  } catch (e) {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const { sourceType, payload } = await request.json();
    if (!sourceType || !payload) {
      return NextResponse.json({ error: "Missing sourceType or payload" }, { status: 400 });
    }

    if (sourceType === "github") {
      let token = payload.githubToken;
      const owner = payload.githubOwner;
      const repo = payload.githubRepo;

      if (token === "••••••••") {
        token = await getStoredSecret("githubToken");
      }

      if (!token || !owner || !repo) {
        return NextResponse.json({ ok: false, error: "Missing token, owner, or repository name" });
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "HarborMaster-Test",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err.message || `GitHub error: ${res.statusText}` });
      }

      return NextResponse.json({ ok: true, message: `Successfully connected to repository ${owner}/${repo}!` });
    }

    if (sourceType === "discord") {
      let token = payload.discordToken;
      const channelId = payload.discordChannel;

      if (token === "••••••••") {
        token = await getStoredSecret("discordToken");
      }

      if (!token || !channelId) {
        return NextResponse.json({ ok: false, error: "Missing bot token or channel ID" });
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: {
          Authorization: `Bot ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err.message || `Discord error: ${res.statusText}` });
      }

      const data = await res.json();
      return NextResponse.json({
        ok: true,
        message: `Successfully connected to channel #${data.name || channelId}!`,
      });
    }

    if (sourceType === "gemini") {
      let key = payload.geminiKey;

      if (key === "••••••••") {
        key = await getStoredSecret("geminiKey");
      }

      if (!key) {
        return NextResponse.json({ ok: false, error: "Missing Gemini API Key" });
      }

      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const started = Date.now();
        await generateText({
          model: google("gemini-2.5-flash"),
          prompt: "Say 'OK'",
        });

        return NextResponse.json({
          ok: true,
          message: `Connection successful! Gemini responded in ${Date.now() - started}ms.`,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message || String(err) });
      }
    }

    return NextResponse.json({ error: "Unsupported source type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
}
