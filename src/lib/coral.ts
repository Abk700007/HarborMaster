import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

export type CoralResult<T> =
  | { ok: true; rows: T[]; durationMs: number }
  | { ok: false; error: string; durationMs: number };

export const DATA_DIR = process.env.VERCEL ? "/tmp/harbormaster-data" : path.join(process.cwd(), ".coral", "live-data");

export function getCoralEnv(config: any = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CORAL_CONFIG_DIR: process.env.VERCEL ? "/tmp/coral-config" : path.join(process.cwd(), ".coral"),
    GITHUB_DATA_DIR: DATA_DIR,
    DISCORD_DATA_DIR: DATA_DIR,
    NOTION_DATA_DIR: DATA_DIR,
  };

  if (config.githubToken && config.githubToken !== "••••••••") {
    env.GITHUB_TOKEN = config.githubToken;
    env.GITHUB_OWNER = config.githubOwner || "";
    env.GITHUB_REPO = config.githubRepo || "";
  }
  if (config.discordToken && config.discordToken !== "••••••••") {
    env.DISCORD_BOT_TOKEN = config.discordToken;
    env.DISCORD_CHANNEL_ID = config.discordChannel || "";
  }
  if (config.notionToken && config.notionToken !== "••••••••") {
    env.NOTION_TOKEN = config.notionToken;
  }

  return env;
}

let sourcesRegistered = false;

export function resetSourcesRegistered() {
  sourcesRegistered = false;
}

export async function ensureCoralSources(config: any): Promise<void> {
  if (sourcesRegistered) return;

  const env = getCoralEnv(config);
  
  const isWindows = process.platform === "win32";
  let coralBin = process.env.CORAL_BIN ?? "coral";
  const localBin = path.join(process.cwd(), "bin", isWindows ? "coral.exe" : "coral");
  if (fs.existsSync(localBin)) {
    coralBin = localBin;
    if (!isWindows) {
      try {
        fs.chmodSync(coralBin, 0o755);
      } catch (e) {
        console.warn("Failed to chmod Coral binary:", e);
      }
    }
  }

  // Get current sources
  const listResult = await listCoralSources(config);
  const rawList = listResult.ok ? listResult.rows[0]?.raw ?? "" : "";

  // Register sources if configured and missing
  if (config.githubToken && !rawList.includes("hm_github_live")) {
    console.log("Registering live GitHub source dynamically...");
    try {
      await execFileAsync(
        coralBin,
        ["source", "add", "--file", "coral/source-specs/hm_github_live.yaml"],
        { env, windowsHide: true, timeout: 15000 }
      );
    } catch (err) {
      console.error("Failed to register GitHub source:", err);
    }
  }

  if (config.discordToken && !rawList.includes("discord")) {
    console.log("Registering live Discord source dynamically...");
    try {
      await execFileAsync(
        coralBin,
        ["source", "add", "--file", "coral/source-specs/discord.yaml"],
        { env, windowsHide: true, timeout: 15000 }
      );
    } catch (err) {
      console.error("Failed to register Discord source:", err);
    }
  }

  if (config.notionToken && !rawList.includes("hm_notion_live")) {
    console.log("Registering live Notion source dynamically...");
    try {
      await execFileAsync(
        coralBin,
        ["source", "add", "--file", "coral/source-specs/hm_notion_live.yaml"],
        { env, windowsHide: true, timeout: 15000 }
      );
    } catch (err) {
      console.error("Failed to register Notion source:", err);
    }
  }

  sourcesRegistered = true;
}

export async function runCoralSql<T>(sql: string, config: any = {}): Promise<CoralResult<T>> {
  const started = Date.now();
  try {
    const isWindows = process.platform === "win32";
    let coralBin = process.env.CORAL_BIN ?? "coral";
    const localBin = path.join(process.cwd(), "bin", isWindows ? "coral.exe" : "coral");
    if (fs.existsSync(localBin)) {
      coralBin = localBin;
      if (!isWindows) {
        try {
          fs.chmodSync(coralBin, 0o755);
        } catch (e) {}
      }
    }

    // Ensure configured sources are registered
    await ensureCoralSources(config);

    const env = getCoralEnv(config);

    const { stdout } = await execFileAsync(
      coralBin,
      ["sql", "--format", "json", sql],
      {
        timeout: Number(process.env.HARBORMASTER_CORAL_TIMEOUT_MS ?? 25000),
        maxBuffer: 1024 * 1024 * 10,
        env,
        windowsHide: true,
      }
    );

    return {
      ok: true,
      rows: JSON.parse(stdout.trim() || "[]") as T[],
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function listCoralSources(config: any = {}): Promise<CoralResult<{ raw: string }>> {
  const started = Date.now();
  try {
    const isWindows = process.platform === "win32";
    let coralBin = process.env.CORAL_BIN ?? "coral";
    const localBin = path.join(process.cwd(), "bin", isWindows ? "coral.exe" : "coral");
    if (fs.existsSync(localBin)) {
      coralBin = localBin;
      if (!isWindows) {
        try {
          fs.chmodSync(coralBin, 0o755);
        } catch (e) {}
      }
    }

    const env = getCoralEnv(config);

    const { stdout } = await execFileAsync(coralBin, ["source", "list"], {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      env,
      windowsHide: true,
    });

    return {
      ok: true,
      rows: [{ raw: stdout }],
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}
