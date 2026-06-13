import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CONFIG_PATH = path.join(process.cwd(), "harbormaster.config.json");

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(data);
    // Return config without full secrets for UI
    return NextResponse.json({
      geminiKey: config.geminiKey ? "••••••••" : "",
      githubToken: config.githubToken ? "••••••••" : "",
      githubOwner: config.githubOwner || "",
      githubRepo: config.githubRepo || "",
      discordToken: config.discordToken ? "••••••••" : "",
      discordChannel: config.discordChannel || "",
      notionToken: config.notionToken ? "••••••••" : "",
    });
  } catch (error) {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Read existing to preserve hidden secrets
    let existing: any = {};
    try {
      existing = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));
    } catch (e) {}

    const newConfig = {
      ...existing,
      geminiKey: body.geminiKey === "••••••••" ? existing.geminiKey : body.geminiKey,
      githubToken: body.githubToken === "••••••••" ? existing.githubToken : body.githubToken,
      githubOwner: body.githubOwner,
      githubRepo: body.githubRepo,
      discordToken: body.discordToken === "••••••••" ? existing.discordToken : body.discordToken,
      discordChannel: body.discordChannel,
      notionToken: body.notionToken === "••••••••" ? existing.notionToken : body.notionToken,
    };

    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));

    // Try to register the live sources with Coral
    const env = { ...process.env, ...newConfig, GITHUB_TOKEN: newConfig.githubToken, DISCORD_BOT_TOKEN: newConfig.discordToken, DISCORD_CHANNEL_ID: newConfig.discordChannel };
    
    try {
      if (newConfig.githubToken) {
        await execFileAsync("coral", ["source", "add", "--file", "coral/source-specs/hm_github_live.yaml"], { env, windowsHide: true });
      }
      if (newConfig.discordToken) {
        await execFileAsync("coral", ["source", "add", "--file", "coral/source-specs/discord.yaml"], { env, windowsHide: true });
      }
    } catch (coralErr) {
      console.error("Coral source add failed (maybe CLI not available?):", coralErr);
      // We still succeed the save, because we might just use the LLM
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
