import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { resetSourcesRegistered, getCoralEnv } from "@/lib/coral";
import { syncLiveWorkspace } from "@/lib/sync-live";

const execFileAsync = promisify(execFile);

const CONFIG_PATH = path.join(process.cwd(), "harbormaster.config.json");
const TMP_CONFIG_PATH = "/tmp/harbormaster.config.json";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const config = {
      geminiKey: cookieStore.get("harbormaster_gemini_key")?.value || "",
      githubToken: cookieStore.get("harbormaster_github_token")?.value || "",
      githubUser: cookieStore.get("harbormaster_github_user")?.value || "",
      githubOwner: cookieStore.get("harbormaster_github_owner")?.value || "",
      githubRepo: cookieStore.get("harbormaster_github_repo")?.value || "",
      discordToken: cookieStore.get("harbormaster_discord_token")?.value || "",
      discordChannel: cookieStore.get("harbormaster_discord_channel")?.value || "",
      notionToken: cookieStore.get("harbormaster_notion_token")?.value || "",
    };

    const hasCookies = config.githubToken || config.discordToken || config.notionToken;
    if (hasCookies) {
      return NextResponse.json({
        geminiKey: config.geminiKey ? "••••••••" : "",
        githubToken: config.githubToken ? "••••••••" : "",
        githubUser: config.githubUser,
        githubOwner: config.githubOwner,
        githubRepo: config.githubRepo,
        discordToken: config.discordToken ? "••••••••" : "",
        discordChannel: config.discordChannel,
        notionToken: config.notionToken ? "••••••••" : "",
      });
    }

    // Fallback to reading file
    let fileData = "";
    try {
      fileData = await fs.readFile(CONFIG_PATH, "utf-8");
    } catch (e) {
      fileData = await fs.readFile(TMP_CONFIG_PATH, "utf-8");
    }
    
    const fileConfig = JSON.parse(fileData);
    return NextResponse.json({
      geminiKey: fileConfig.geminiKey ? "••••••••" : "",
      githubToken: fileConfig.githubToken ? "••••••••" : "",
      githubUser: fileConfig.githubUser || "",
      githubOwner: fileConfig.githubOwner || "",
      githubRepo: fileConfig.githubRepo || "",
      discordToken: fileConfig.discordToken ? "••••••••" : "",
      discordChannel: fileConfig.discordChannel || "",
      notionToken: fileConfig.notionToken ? "••••••••" : "",
    });
  } catch (error) {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    
    // Read existing to preserve hidden secrets
    let existing: any = {};
    try {
      const dataObj = cookieStore.get("harbormaster_github_token")?.value
        ? {
            geminiKey: cookieStore.get("harbormaster_gemini_key")?.value || "",
            githubToken: cookieStore.get("harbormaster_github_token")?.value || "",
            githubOwner: cookieStore.get("harbormaster_github_owner")?.value || "",
            githubRepo: cookieStore.get("harbormaster_github_repo")?.value || "",
            discordToken: cookieStore.get("harbormaster_discord_token")?.value || "",
            discordChannel: cookieStore.get("harbormaster_discord_channel")?.value || "",
            notionToken: cookieStore.get("harbormaster_notion_token")?.value || "",
          }
        : null;

      if (dataObj) {
        existing = dataObj;
      } else {
        try {
          existing = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));
        } catch (e) {
          existing = JSON.parse(await fs.readFile(TMP_CONFIG_PATH, "utf-8"));
        }
      }
    } catch (e) {}

    const newConfig = {
      ...existing,
      geminiKey: body.geminiKey === "••••••••" ? existing.geminiKey : body.geminiKey || "",
      githubToken: body.githubToken === "••••••••" ? existing.githubToken : body.githubToken || "",
      githubUser: body.githubUser || existing.githubUser || "",
      githubOwner: body.githubOwner || "",
      githubRepo: body.githubRepo || "",
      discordToken: body.discordToken === "••••••••" ? existing.discordToken : body.discordToken || "",
      discordChannel: body.discordChannel || "",
      notionToken: body.notionToken === "••••••••" ? existing.notionToken : body.notionToken || "",
    };

    // Save to cookies
    const oneMonth = 60 * 60 * 24 * 30;
    const cookieOpts = { path: "/", secure: process.env.NODE_ENV === "production", maxAge: oneMonth };
    
    if (newConfig.githubToken) cookieStore.set("harbormaster_github_token", newConfig.githubToken, cookieOpts);
    if (newConfig.githubUser) cookieStore.set("harbormaster_github_user", newConfig.githubUser, cookieOpts);
    if (newConfig.githubOwner) cookieStore.set("harbormaster_github_owner", newConfig.githubOwner, cookieOpts);
    if (newConfig.githubRepo) cookieStore.set("harbormaster_github_repo", newConfig.githubRepo, cookieOpts);
    if (newConfig.discordToken) cookieStore.set("harbormaster_discord_token", newConfig.discordToken, cookieOpts);
    if (newConfig.discordChannel) cookieStore.set("harbormaster_discord_channel", newConfig.discordChannel, cookieOpts);
    if (newConfig.notionToken) cookieStore.set("harbormaster_notion_token", newConfig.notionToken, cookieOpts);
    if (newConfig.geminiKey) cookieStore.set("harbormaster_gemini_key", newConfig.geminiKey, cookieOpts);

    // Save to filesystem (best effort)
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    } catch (e) {
      try {
        await fs.writeFile(TMP_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
      } catch (err) {
        console.warn("Could not write config to filesystem:", err);
      }
    }

    // Reset sources registration state in Coral helper
    resetSourcesRegistered();

    // Dynamically attempt to register Coral sources
    try {
      await syncLiveWorkspace(newConfig);

      const env = getCoralEnv(newConfig);

      const isWindows = process.platform === "win32";
      let coralBin = process.env.CORAL_BIN ?? "coral";
      const localBin = path.join(process.cwd(), "bin", isWindows ? "coral.exe" : "coral");
      try {
        await fs.access(localBin);
        coralBin = localBin;
        if (!isWindows) {
          try {
            await fs.chmod(coralBin, 0o755);
          } catch (e) {}
        }
      } catch (e) {}

      if (newConfig.githubToken) {
        await execFileAsync(coralBin, ["source", "add", "--file", "coral/source-specs/hm_github_live.yaml"], { env, windowsHide: true });
      }
      if (newConfig.discordToken) {
        await execFileAsync(coralBin, ["source", "add", "--file", "coral/source-specs/discord.yaml"], { env, windowsHide: true });
      }
      if (newConfig.notionToken) {
        await execFileAsync(coralBin, ["source", "add", "--file", "coral/source-specs/hm_notion_live.yaml"], { env, windowsHide: true });
      }
    } catch (coralErr) {
      console.warn("Settings post Coral registration warning:", coralErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
