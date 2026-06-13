/**
 * direct-reader.ts
 * 
 * Reads JSONL data files written by sync-live.ts directly without needing the Coral CLI.
 * Used as fallback when Coral is unavailable or not configured.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./coral";

async function readJsonlFile(filePath: string): Promise<any[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function readGithubPRs(): Promise<any[]> {
  const filePath = path.join(DATA_DIR, "github_live", "pull_requests.jsonl");
  return readJsonlFile(filePath);
}

export async function readDiscordMessages(): Promise<any[]> {
  const filePath = path.join(DATA_DIR, "discord", "messages.jsonl");
  return readJsonlFile(filePath);
}

export async function readNotionPages(): Promise<any[]> {
  const filePath = path.join(DATA_DIR, "notion_live", "pages.jsonl");
  return readJsonlFile(filePath);
}

export type DirectBriefData = {
  prs: any[];
  messages: any[];
  pages: any[];
};

export async function readAllLiveData(): Promise<DirectBriefData> {
  const [prs, messages, pages] = await Promise.all([
    readGithubPRs(),
    readDiscordMessages(),
    readNotionPages(),
  ]);
  return { prs, messages, pages };
}

/** Build morning brief rows from raw JSONL data (no Coral required) */
export function buildBriefRows(data: DirectBriefData) {
  const { prs, messages, pages } = data;

  return prs
    .filter((pr) => pr.state === "open")
    .slice(0, 5)
    .map((pr) => {
      // Find a Discord message referencing this PR number
      const communitySignal =
        messages.find((m) =>
          m.content && m.content.includes(String(pr.id))
        )?.content || null;

      // Find a Notion page matching the PR title keywords
      const titleWords = pr.title
        ? pr.title.toLowerCase().split(" ").filter((w: string) => w.length > 4)
        : [];
      const roadmapItem =
        pages.find(
          (p) =>
            p.title &&
            titleWords.some((w: string) => p.title.toLowerCase().includes(w))
        )?.title || null;

      return {
        pr_number: pr.id,
        pr_title: pr.title || "Untitled PR",
        pr_status: pr.state || "open",
        author: pr.author_login || "unknown",
        community_signal: communitySignal,
        roadmap_item: roadmapItem,
        draft: !!pr.draft,
        html_url: pr.html_url || "",
      };
    });
}

/** Build community signals from Discord messages */
export function buildCommunitySignals(messages: any[]) {
  return messages.slice(0, 10).map((msg) => {
    const content = msg.content || "";
    const isNegative =
      /error|bug|fail|broken|crash|timeout|issue|problem|wrong/i.test(content);

    return {
      title: "Community Feedback",
      count: 1,
      source: "Discord",
      sentiment: isNegative ? "Negative" : "Neutral",
      excerpt: content,
      author: msg.author__username || "User",
      channelId: msg.channel_id || "",
      timestamp: msg.timestamp || "",
    };
  });
}

/** Build release risk rows from open/draft PRs */
export function buildReleaseRisks(prs: any[]) {
  return prs
    .filter((pr) => pr.draft || pr.state === "open")
    .slice(0, 5)
    .map((pr, idx) => ({
      id: `risk-${idx + 1}`,
      surface: "Live Release Work",
      blocker: pr.draft ? "PR is Draft" : "Review pending",
      linkedWork: `PR #${pr.id}`,
      impact: pr.draft
        ? `Draft PR '${pr.title}' is not ready for merge.`
        : `Open PR '${pr.title}' is pending review and may block release.`,
      score: pr.draft ? 85 : 72,
      sources: ["GitHub"],
    }));
}
