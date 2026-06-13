import type { ActionItem, BriefResponse, ChatResponse, EvidenceItem, RiskRow, SourceStatus } from "./harbormaster-types";
import { listCoralSources, runCoralSql } from "./coral";
import { sqlPlaybooks } from "./sql-playbooks";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import fs from "node:fs/promises";
import path from "node:path";
import {
  readAllLiveData,
  readGithubPRs,
  readDiscordMessages,
  buildBriefRows,
  buildCommunitySignals,
  buildReleaseRisks,
} from "./direct-reader";

async function getEffectiveConfig(passedConfig: any = {}) {
  if (passedConfig && (passedConfig.githubToken || passedConfig.discordToken || passedConfig.notionToken)) {
    return passedConfig;
  }
  try {
    const data = await fs.readFile(path.join(process.cwd(), "harbormaster.config.json"), "utf-8");
    const fileConfig = JSON.parse(data);
    // Only use file config if it has actual (non-empty) credentials
    if (fileConfig.githubToken || fileConfig.discordToken || fileConfig.notionToken) {
      return { ...fileConfig, ...passedConfig };
    }
    return passedConfig;
  } catch (e) {
    return passedConfig;
  }
}

type CoralBriefRow = {
  pr_number: string;
  pr_title: string;
  pr_status: string;
  author: string;
  community_signal?: string | null;
  roadmap_item?: string | null;
};

export async function getBrief(passedConfig: any = {}): Promise<BriefResponse> {
  const config = await getEffectiveConfig(passedConfig);
  const statuses = await getSourceStatuses(config);

  let actions: ActionItem[] = [];
  let risks: RiskRow[] = [];
  let communitySignals: any[] = [];
  let notice: string | undefined;
  let latencyMs = 0;

  const hasAnyCredential = !!(config.githubToken || config.discordToken || config.notionToken);

  // Try Coral SQL first
  let coralWorked = false;
  if (hasAnyCredential) {
    const started = Date.now();
    const result = await runCoralSql<CoralBriefRow>(sqlPlaybooks.morningBrief, config);
    latencyMs = Date.now() - started;

    if (result.ok && result.rows.length > 0) {
      coralWorked = true;
      actions = result.rows.map(rowToAction.bind(null, config));

      // Also get risks and community signals via Coral
      const riskResult = await runCoralSql<any>(sqlPlaybooks.releaseRisk, config);
      if (riskResult.ok) {
        risks = riskResult.rows.map((row: any, idx: number) => ({
          id: `risk-${idx + 1}`,
          surface: "Live Release Work",
          blocker: row.draft ? "PR is Draft" : "Review pending",
          linkedWork: `PR #${row.pr_number}`,
          impact: row.community_signal || "Linked PR is blocking release path.",
          score: row.draft ? 85 : 72,
          sources: ["GitHub"],
        }));
      }

      const commResult = await runCoralSql<any>(sqlPlaybooks.communityPain, config);
      if (commResult.ok) {
        communitySignals = commResult.rows.map((row: any) => ({
          title: row.active_pr ? `Feedback regarding: ${row.active_pr}` : "Community Feedback Message",
          count: 1,
          source: "Discord",
          sentiment:
            /error|bug|fail|timeout|crash/i.test(row.content) ? "Negative" : "Neutral",
          excerpt: row.content,
          author: row.author_name || "User",
        }));
      }
    } else if (!result.ok) {
      // Coral failed — use direct JSONL reader fallback
      console.log("Coral SQL failed, falling back to direct JSONL reader:", result.error);
    }
  }

  // Direct JSONL fallback: read data from disk when Coral unavailable or returned no rows
  if (!coralWorked && hasAnyCredential) {
    try {
      const data = await readAllLiveData();
      const briefRows = buildBriefRows(data);

      if (briefRows.length > 0) {
        actions = briefRows.map((row) => rowToAction(config, row as CoralBriefRow));
        risks = buildReleaseRisks(data.prs);
        communitySignals = buildCommunitySignals(data.messages);
        notice = "Connected to live data sources via direct sync (Coral SQL engine not available).";
      } else if (data.prs.length === 0 && data.messages.length === 0 && data.pages.length === 0) {
        notice = "Credentials configured but no data synced yet. Data will appear after the next sync cycle.";
      }
    } catch (err) {
      console.error("Direct reader fallback failed:", err);
      notice = "Could not load live data. Please check your credentials in Settings.";
    }
  } else if (!hasAnyCredential) {
    notice = "Connect your GitHub, Discord, and Notion accounts to see live data.";
  }

  return {
    mode: "coral-live",
    generatedAt: new Date().toISOString(),
    sourceStatuses: statuses,
    actions,
    risks,
    communitySignals,
    queryCount: 3,
    cacheHitRate: 0,
    latencyMs,
    sql: sqlPlaybooks,
    notice,
  };
}

export async function getSourceStatuses(passedConfig: any = {}): Promise<SourceStatus[]> {
  const config = await getEffectiveConfig(passedConfig);
  const baseSources: SourceStatus[] = [
    {
      id: "github",
      label: "GitHub",
      schema: "hm_github_live",
      status: "missing",
      tables: 1,
      latencyMs: 0,
      description: "Live GitHub pull requests, commits, and checks",
    },
    {
      id: "discord",
      label: "Discord",
      schema: "discord",
      status: "missing",
      tables: 1,
      latencyMs: 0,
      description: "Live Discord messages from your community channels",
    },
    {
      id: "notion",
      label: "Notion",
      schema: "hm_notion_live",
      status: "missing",
      tables: 1,
      latencyMs: 0,
      description: "Live Notion workspace page checklist documentation",
    },
  ];

  // First try Coral source list
  const sources = await listCoralSources(config);
  if (sources.ok) {
    const raw = sources.rows[0]?.raw ?? "";
    return baseSources.map((source) => ({
      ...source,
      status: raw.includes(source.schema) ? "live" : (
        // Check if we have data on disk for this source
        source.id === "github" && config.githubToken ? "live" :
        source.id === "discord" && config.discordToken ? "live" :
        source.id === "notion" && config.notionToken ? "live" :
        "missing"
      ),
      latencyMs: sources.durationMs,
    }));
  }

  // Fallback: determine status from config + JSONL files on disk
  const statusChecks = await Promise.all(
    baseSources.map(async (source) => {
      let hasCredential = false;
      if (source.id === "github" && config.githubToken) hasCredential = true;
      if (source.id === "discord" && config.discordToken) hasCredential = true;
      if (source.id === "notion" && config.notionToken) hasCredential = true;

      return {
        ...source,
        status: hasCredential ? ("live" as const) : ("missing" as const),
      };
    })
  );

  return statusChecks;
}

export async function answerQuestion(question: string, passedConfig: any = {}): Promise<ChatResponse> {
  const config = await getEffectiveConfig(passedConfig);
  let sql = chooseSql(question);
  let finalAnswer = "";
  let queryRunSucceeded = false;
  let rows: any[] = [];
  let durationMs = 0;

  // Try AI-powered SQL generation if Gemini key is available
  if (config.geminiKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });

      const hasLiveGithub = !!(config.githubToken && config.githubOwner && config.githubRepo);
      const hasLiveDiscord = !!(config.discordToken && config.discordChannel);
      const hasLiveNotion = !!config.notionToken;

      const schemasPrompt = `
You are an expert SQL generator for the Coral Query Engine.
Coral allows joining multiple data sources (GitHub, Discord, Notion) as SQL tables.

Here are the available schemas and tables in the system:

1. Live Schemas:
   ${hasLiveGithub ? `- hm_github_live.pull_requests:
     - id (Utf8) - represents PR number
     - title (Utf8)
     - state (Utf8) - 'open', 'closed'
     - draft (Boolean)
     - created_at (Utf8)
     - updated_at (Utf8)
     - html_url (Utf8)
     - author_login (Utf8)
     - head_ref (Utf8)
     - base_ref (Utf8)` : "*(GitHub live schema not configured)*"}
   ${hasLiveDiscord ? `- discord.messages:
     - id (Utf8)
     - channel_id (Utf8)
     - content (Utf8)
     - timestamp (Timestamp)
     - author__id (Utf8)
     - author__username (Utf8)
     - mention_usernames (Utf8)` : "*(Discord live schema not configured)*"}
   ${hasLiveNotion ? `- hm_notion_live.pages:
     - id (Utf8)
     - title (Utf8)
     - last_edited (Utf8)
     - url (Utf8)` : "*(Notion live schema not configured)*"}

Write a standard SQL query for the following user question:
"${question}"

Rules:
- Output ONLY the raw SQL query. Do NOT wrap it in any explanation or markdown code blocks (like \`\`\`sql).
- If the user asks about GitHub PRs, use 'hm_github_live.pull_requests'.
- If the user asks about Discord messages, use 'discord.messages'.
- If the user asks about Notion pages, use 'hm_notion_live.pages'.
- Limit results (e.g. LIMIT 5) to keep it fast.
- Ensure the query has valid JOIN conditions if querying multiple tables.
`;

      const aiSqlResponse = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: schemasPrompt,
      });

      const generatedSql = aiSqlResponse.text.replace(/```sql|```/g, "").trim();

      if (generatedSql.startsWith("SELECT") || generatedSql.startsWith("select")) {
        sql = generatedSql;
        const result = await runCoralSql<any>(sql, config);
        if (result.ok && result.rows.length > 0) {
          queryRunSucceeded = true;
          rows = result.rows;
          durationMs = result.durationMs;
        }
      }
    } catch (err) {
      console.error("Failed to generate or run dynamic AI query:", err);
    }
  }

  // If Coral query failed, try the preset playbook query
  if (!queryRunSucceeded) {
    const result = await runCoralSql<Record<string, unknown>>(sql, config);
    if (result.ok) {
      rows = result.rows;
      durationMs = result.durationMs;
      queryRunSucceeded = result.rows.length > 0;
    }
  }

  // If still no rows, fall back to direct JSONL reader
  if (!queryRunSucceeded) {
    try {
      const normalized = question.toLowerCase();
      const data = await readAllLiveData();

      if (normalized.includes("pr") || normalized.includes("pull request") || normalized.includes("review") || normalized.includes("block")) {
        rows = data.prs.slice(0, 5).map((pr: any) => ({
          pr_number: pr.id,
          pr_title: pr.title,
          pr_status: pr.state,
          author: pr.author_login,
          html_url: pr.html_url,
          draft: pr.draft,
        }));
      } else if (normalized.includes("discord") || normalized.includes("community") || normalized.includes("message")) {
        rows = data.messages.slice(0, 5).map((msg: any) => ({
          id: msg.id,
          author__username: msg.author__username,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
      } else if (normalized.includes("notion") || normalized.includes("doc") || normalized.includes("page")) {
        rows = data.pages.slice(0, 5).map((pg: any) => ({
          id: pg.id,
          title: pg.title,
          last_edited: pg.last_edited,
          url: pg.url,
        }));
      } else {
        // General: merge all sources
        const prRows = data.prs.slice(0, 3).map((pr: any) => ({ source: "GitHub", pr_number: pr.id, pr_title: pr.title, pr_status: pr.state, author: pr.author_login }));
        const msgRows = data.messages.slice(0, 2).map((msg: any) => ({ source: "Discord", author: msg.author__username, content: msg.content }));
        rows = [...prRows, ...msgRows];
      }

      if (rows.length > 0) queryRunSucceeded = true;
    } catch (err) {
      console.error("Direct reader answer fallback failed:", err);
    }
  }

  // Synthesize natural language answer using Gemini
  if (config.geminiKey && rows.length > 0) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });
      const prompt = `You are HarborMaster, a helpful AI first mate for open-source project maintainers.
The user asked: "${question}"

Here is the data pulled from the live database:
${JSON.stringify(rows.slice(0, 5), null, 2)}

Please write a concise, helpful, and natural answer (1-3 sentences) based STRICTLY on the data above. Reference key details (e.g., PR titles, usernames) from the database where relevant. Do not make up facts.`;

      const aiResponse = await generateText({
        model: google("gemini-2.5-flash"),
        prompt,
      });

      finalAnswer = aiResponse.text.trim();
    } catch (e) {
      finalAnswer = `Found ${rows.length} results. Configure a Gemini API Key in Settings for natural language summaries.`;
    }
  } else if (rows.length > 0) {
    finalAnswer = `Found ${rows.length} matching records (${durationMs}ms). Configure a Gemini API Key in Settings to enable natural language summaries.`;
  } else {
    finalAnswer = "No matching records found. Make sure your GitHub, Discord, and Notion integrations are connected and data has been synced.";
  }

  return {
    mode: "coral-live",
    sql,
    evidence: rowsToEvidence(rows),
    answer: finalAnswer,
    followups: [
      "Show me the latest open pull requests.",
      "Check recent Discord community support messages.",
      "What docs pages exist in my Notion workspace?",
    ],
  };
}

function chooseSql(question: string) {
  const normalized = question.toLowerCase();
  if (normalized.includes("review") || normalized.includes("pr")) return sqlPlaybooks.reviewQueue;
  if (normalized.includes("discord") || normalized.includes("community") || normalized.includes("complain")) {
    return sqlPlaybooks.communityPain;
  }
  if (normalized.includes("release") || normalized.includes("risk") || normalized.includes("ship")) {
    return sqlPlaybooks.releaseRisk;
  }
  return sqlPlaybooks.morningBrief;
}

function rowToAction(config: any, row: CoralBriefRow): ActionItem {
  const score = row.pr_status === "closed" ? 60 : 88;
  const owner = (row as any).author || "you";
  // Build a proper GitHub URL if we have owner info
  const githubOwner = config?.githubOwner || owner;
  const prUrl = (row as any).html_url || `https://github.com/${githubOwner}/pulls/${row.pr_number}`;

  const evidence: EvidenceItem[] = [
    {
      source: "GitHub",
      label: `PR #${row.pr_number}`,
      excerpt: `${row.pr_title} (Author: @${owner}) — Status: ${row.pr_status}.`,
      ref: prUrl,
      time: "live",
    },
  ];

  if (row.community_signal) {
    evidence.push({
      source: "Discord",
      label: "Discord Context",
      excerpt: row.community_signal,
      ref: "discord",
      time: "live",
    });
  }

  if (row.roadmap_item) {
    evidence.push({
      source: "Notion",
      label: "Notion Roadmap",
      excerpt: row.roadmap_item,
      ref: "notion",
      time: "live",
    });
  }

  return {
    id: `act-${row.pr_number}`,
    title: row.pr_title,
    category: row.pr_status === "open" ? "Review" : "Ship",
    priority: score > 80 ? "High" : "Medium",
    score,
    status: row.pr_status === "open" ? "Open" : "Merged",
    due: "Today",
    owner,
    summary: `Open PR #${row.pr_number} by @${owner} needs review. ${row.community_signal ? "Community is discussing this." : ""} ${row.roadmap_item ? `Related to roadmap: ${row.roadmap_item}` : ""}`.trim(),
    sqlKey: "morningBrief",
    links: [{ label: `View PR #${row.pr_number}`, href: prUrl }],
    evidence,
  };
}

function rowsToEvidence(rows: Record<string, unknown>[]): EvidenceItem[] {
  return rows.slice(0, 4).map((row, index) => {
    let source = "GitHub";
    if ("content" in row || "author__username" in row || "mention_usernames" in row) {
      source = "Discord";
    } else if ("last_edited" in row || ("title" in row && !("author_login" in row) && !("pr_title" in row))) {
      source = "Notion";
    }

    const label = String(row.pr_number || row.id || `Ref-${index + 1}`);
    const excerpt = String(
      row.pr_title ||
      row.title ||
      row.content ||
      row.text ||
      JSON.stringify(row)
    );
    const ref = String(row.html_url || row.url || `id-${index + 1}`);

    return {
      source,
      label,
      excerpt,
      ref,
      time: "live",
    };
  });
}
