import type { ActionItem, BriefResponse, ChatResponse, EvidenceItem, RiskRow, SourceStatus } from "./harbormaster-types";
import { listCoralSources, runCoralSql } from "./coral";
import { sqlPlaybooks } from "./sql-playbooks";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import fs from "node:fs/promises";
import path from "node:path";

async function getEffectiveConfig(passedConfig: any = {}) {
  if (passedConfig && (passedConfig.githubToken || passedConfig.discordToken || passedConfig.notionToken)) {
    return passedConfig;
  }
  try {
    const data = await fs.readFile(path.join(process.cwd(), "harbormaster.config.json"), "utf-8");
    return { ...JSON.parse(data), ...passedConfig };
  } catch (e) {
    try {
      const data = await fs.readFile("/tmp/harbormaster.config.json", "utf-8");
      return { ...JSON.parse(data), ...passedConfig };
    } catch (err) {
      return passedConfig;
    }
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
  const result = await runCoralSql<CoralBriefRow>(sqlPlaybooks.morningBrief, config);
  const statuses = await getSourceStatuses(config);

  let actions: ActionItem[] = [];
  let notice: string | undefined;

  if (!result.ok) {
    notice = `Failed to query Coral workspace: ${result.error}`;
  } else {
    actions = result.rows.map(rowToAction);
  }

  // Generate live risks from the active releaseRisk query results
  let risks: RiskRow[] = [];
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

  return {
    mode: "coral-live",
    generatedAt: new Date().toISOString(),
    sourceStatuses: statuses,
    actions,
    risks,
    queryCount: 2,
    cacheHitRate: 0,
    latencyMs: result.durationMs + (riskResult.durationMs || 0),
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

  const sources = await listCoralSources(config);
  if (!sources.ok) {
    return baseSources;
  }

  const raw = sources.rows[0]?.raw ?? "";
  return baseSources.map((source) => ({
    ...source,
    status: raw.includes(source.schema) ? "live" : "missing",
    latencyMs: sources.durationMs,
  }));
}

export async function answerQuestion(question: string, passedConfig: any = {}): Promise<ChatResponse> {
  const config = await getEffectiveConfig(passedConfig);
  let sql = chooseSql(question);
  let finalAnswer = "";
  let queryRunSucceeded = false;
  let rows: any[] = [];
  let durationMs = 0;

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
- Ensure the query has valid JOIN conditions if querying multiple tables. Use LIKE joins: e.g. ON dc.content LIKE '%' || gh.id || '%' if joining Discord messages to GitHub PR numbers.
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

  // If dynamic query failed or Gemini key wasn't supplied, run the playbook SQL
  if (!queryRunSucceeded) {
    const result = await runCoralSql<Record<string, unknown>>(sql, config);
    if (result.ok) {
      rows = result.rows;
      durationMs = result.durationMs;
      queryRunSucceeded = true;
    }
  }

  // Synthesize answer using Gemini if key is active
  if (config.geminiKey && rows.length > 0) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });
      const prompt = `You are HarborMaster, a helpful AI first mate for open-source project maintainers.
The user asked: "${question}"

Here is the data pulled from the database via Coral SQL (which executes cross-source joins):
${JSON.stringify(rows.slice(0, 5), null, 2)}

Please write a concise, helpful, and natural answer (1-3 sentences) based STRICTLY on the data above. Reference key details (e.g., issue keys, PR titles, usernames) from the database where relevant. Do not make up facts.`;

      const aiResponse = await generateText({
        model: google("gemini-2.5-flash"),
        prompt,
      });

      finalAnswer = aiResponse.text.trim();
    } catch (e) {
      finalAnswer = `Coral returned ${rows.length} rows (query duration: ${durationMs}ms).`;
    }
  } else {
    finalAnswer = rows.length > 0 
      ? `Coral returned ${rows.length} rows (query duration: ${durationMs}ms). Configure a Gemini API Key in Settings to enable natural language summaries.`
      : `No matching records found in the live workspace database. Make sure your GitHub repos, Discord bot, and Notion integrations are configured.`;
  }

  return {
    mode: "coral-live",
    sql,
    evidence: rowsToEvidence(rows),
    answer: finalAnswer,
    followups: [
      "Show me the latest open pull requests.",
      "Check recent Discord community support messages.",
      "What docs pages exist in my Notion workspace?"
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

function rowToAction(row: CoralBriefRow): ActionItem {
  const score = row.pr_status === "closed" ? 60 : 88;
  const evidence: EvidenceItem[] = [
    {
      source: "GitHub",
      label: `PR #${row.pr_number}`,
      excerpt: `${row.pr_title} (Author: ${row.author || "maintainer"}) is currently ${row.pr_status}.`,
      ref: `https://github.com/${row.author || "maintainer"}/repo/pull/${row.pr_number}`,
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
    owner: row.author || "You",
    summary: `Coral cross-source federated action unifies contexts for PR #${row.pr_number}.`,
    sqlKey: "morningBrief",
    links: [
      { label: `PR #${row.pr_number}`, href: `https://github.com/${row.author || "maintainer"}/repo/pull/${row.pr_number}` }
    ],
    evidence,
  };
}

function rowsToEvidence(rows: Record<string, unknown>[]): EvidenceItem[] {
  return rows.slice(0, 4).map((row, index) => {
    let source = "GitHub";
    if ("content" in row || "author_name" in row || "author__username" in row || "mention_usernames" in row) {
      source = "Discord";
    } else if ("last_edited" in row || ("content" in row && !("author_name" in row))) {
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
