import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./coral";

export async function syncLiveWorkspace(config: any, force = false): Promise<void> {
  const GITHUB_TOKEN = config.githubToken;
  const GITHUB_OWNER = config.githubOwner || "";
  const GITHUB_REPO = config.githubRepo || "";
  const DISCORD_BOT_TOKEN = config.discordToken;
  const DISCORD_CHANNEL_ID = config.discordChannel || "";
  const NOTION_TOKEN = config.notionToken;

  // Ensure top-level directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  const lastSyncFile = path.join(DATA_DIR, "last_sync.json");
  if (!force) {
    try {
      const lastSyncData = await fs.readFile(lastSyncFile, "utf-8");
      const { timestamp } = JSON.parse(lastSyncData);
      const ageMs = Date.now() - timestamp;
      // 2 minutes cache
      if (ageMs < 2 * 60 * 1000) {
        console.log(`[Sync Engine] Live data was synced ${Math.round(ageMs / 1000)}s ago. Skipping sync.`);
        return;
      }
    } catch (e) {
      // Cache file doesn't exist or is invalid, proceed with sync
    }
  }

  console.log("--- Starting Live Data Sync Engine ---");

  // 1. GITHUB SYNC
  const githubDir = path.join(DATA_DIR, "github_live");
  const githubFile = path.join(githubDir, "pull_requests.jsonl");
  await fs.mkdir(githubDir, { recursive: true });

  if (GITHUB_TOKEN && GITHUB_TOKEN !== "••••••••" && GITHUB_OWNER && GITHUB_REPO) {
    try {
      const repos = GITHUB_REPO.split(",").map((r: string) => r.trim()).filter(Boolean);
      const allPrs: any[] = [];

      for (const repo of repos) {
        const fullRepo = repo.includes("/") ? repo : `${GITHUB_OWNER}/${repo}`;
        console.log(`Fetching GitHub PRs for: ${fullRepo}`);
        
        const res = await fetch(`https://api.github.com/repos/${fullRepo}/pulls?state=open&per_page=50`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "HarborMaster-Sync",
          },
        });

        if (res.ok) {
          const prs = await res.json();
          if (Array.isArray(prs)) {
            for (const pr of prs) {
              allPrs.push({
                id: pr.number.toString(),
                title: pr.title,
                state: pr.state,
                draft: !!pr.draft,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                html_url: pr.html_url,
                author_login: pr.user?.login || "",
              });
            }
          }
        } else {
          console.warn(`GitHub API failed for ${fullRepo}: ${res.statusText}`);
        }
      }

      allPrs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      const jsonlContent = allPrs.map(pr => JSON.stringify(pr)).join("\n") + (allPrs.length ? "\n" : "");
      await fs.writeFile(githubFile, jsonlContent, "utf-8");
      console.log(`Synced ${allPrs.length} GitHub PRs successfully.`);
    } catch (err) {
      console.error("Failed to sync GitHub live data:", err);
      await fs.writeFile(githubFile, "", "utf-8");
    }
  } else {
    await fs.writeFile(githubFile, "", "utf-8");
  }

  // 2. DISCORD SYNC
  const discordDir = path.join(DATA_DIR, "discord");
  const discordFile = path.join(discordDir, "messages.jsonl");
  await fs.mkdir(discordDir, { recursive: true });

  if (DISCORD_BOT_TOKEN && DISCORD_BOT_TOKEN !== "••••••••" && DISCORD_CHANNEL_ID) {
    try {
      const channels = DISCORD_CHANNEL_ID.split(",").map((c: string) => c.trim()).filter(Boolean);
      const allMsgs: any[] = [];

      for (const channelId of channels) {
        console.log(`Fetching Discord messages for channel: ${channelId}`);
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const msgs = await res.json();
          if (Array.isArray(msgs)) {
            for (const msg of msgs) {
              allMsgs.push({
                id: msg.id,
                channel_id: msg.channel_id,
                content: msg.content || "",
                timestamp: msg.timestamp,
                author__id: msg.author?.id || "",
                author__username: msg.author?.username || "",
                mention_usernames: msg.mentions?.map((m: any) => m.username).join(", ") || "",
              });
            }
          }
        } else {
          console.warn(`Discord API failed for channel ${channelId}: ${res.statusText}`);
        }
      }

      allMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const jsonlContent = allMsgs.map(msg => JSON.stringify(msg)).join("\n") + (allMsgs.length ? "\n" : "");
      await fs.writeFile(discordFile, jsonlContent, "utf-8");
      console.log(`Synced ${allMsgs.length} Discord messages successfully.`);
    } catch (err) {
      console.error("Failed to sync Discord live data:", err);
      await fs.writeFile(discordFile, "", "utf-8");
    }
  } else {
    await fs.writeFile(discordFile, "", "utf-8");
  }

  // 3. NOTION SYNC
  const notionDir = path.join(DATA_DIR, "notion_live");
  const notionFile = path.join(notionDir, "pages.jsonl");
  await fs.mkdir(notionDir, { recursive: true });

  if (NOTION_TOKEN && NOTION_TOKEN !== "••••••••") {
    try {
      console.log("Fetching Notion search pages...");
      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { value: "page", property: "object" },
          page_size: 50,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const mappedPages = results.map((page: any) => {
          let title = "Untitled";
          const props = page.properties || {};
          
          for (const key of Object.keys(props)) {
            if (props[key]?.title && Array.isArray(props[key].title)) {
              title = props[key].title[0]?.plain_text || title;
              break;
            }
            if (props[key]?.Name?.title && Array.isArray(props[key].Name.title)) {
              title = props[key].Name.title[0]?.plain_text || title;
              break;
            }
          }

          return {
            id: page.id,
            title,
            last_edited: page.last_edited_time,
            url: page.url || "",
          };
        });

        const jsonlContent = mappedPages.map((p: any) => JSON.stringify(p)).join("\n") + (mappedPages.length ? "\n" : "");
        await fs.writeFile(notionFile, jsonlContent, "utf-8");
        console.log(`Synced ${mappedPages.length} Notion pages successfully.`);
      } else {
        console.warn(`Notion API failed: ${res.statusText}`);
        await fs.writeFile(notionFile, "", "utf-8");
      }
    } catch (err) {
      console.error("Failed to sync Notion live data:", err);
      await fs.writeFile(notionFile, "", "utf-8");
    }
  } else {
    await fs.writeFile(notionFile, "", "utf-8");
  }

  try {
    const lastSyncFile = path.join(DATA_DIR, "last_sync.json");
    await fs.writeFile(lastSyncFile, JSON.stringify({ timestamp: Date.now() }), "utf-8");
  } catch (e) {
    console.warn("Failed to write last_sync.json timestamp:", e);
  }
}
