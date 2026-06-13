import type { ActionItem, BriefResponse, ChatResponse, EvidenceItem, SourceStatus } from "./harbormaster-types";
import { listCoralSources, runCoralSql } from "./coral";
import { buildDemoBrief, buildDemoChat, demoSources } from "./demo-data";
import { sqlPlaybooks } from "./sql-playbooks";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import fs from "node:fs/promises";
import path from "node:path";

async function getConfig() {
  try {
    const data = await fs.readFile(path.join(process.cwd(), "harbormaster.config.json"), "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

type CoralBriefRow = {
  id: string;
  title: string;
  issue_key: string;
  status: string;
  review_state: string;
  ci_state: string;
  community_signal?: string | null;
  roadmap_item?: string | null;
};

const enabled = () => process.env.HARBORMASTER_USE_CORAL === "1";

export async function getBrief(): Promise<BriefResponse> {
  if (!enabled()) {
    return buildDemoBrief("Demo preview is active. Set HARBORMASTER_USE_CORAL=1 after installing the Coral demo sources.");
  }

  const result = await runCoralSql<CoralBriefRow>(sqlPlaybooks.morningBrief);

  if (!result.ok || result.rows.length === 0) {
    return buildDemoBrief(
      `Coral mode was requested, but the morning brief query could not return rows: ${
        result.ok ? "no rows" : result.error
      }`
    );
  }

  const actions = result.rows.map(rowToAction);
  const statuses = await getSourceStatuses();

  return {
    ...buildDemoBrief(),
    mode: "coral-live",
    generatedAt: new Date().toISOString(),
    sourceStatuses: statuses,
    actions,
    queryCount: 1,
    latencyMs: result.durationMs,
    notice: undefined,
  };
}

export async function getSourceStatuses(): Promise<SourceStatus[]> {
  if (!enabled()) {
    return demoSources;
  }

  const sources = await listCoralSources();
  if (!sources.ok) {
    return demoSources.map((source) => ({
      ...source,
      status: "missing",
      description: `Coral source list failed: ${sources.error}`,
    }));
  }

  const raw = sources.rows[0]?.raw ?? "";
  return demoSources.map((source) => ({
    ...source,
    status: raw.includes(source.schema) ? "live" : "missing",
    latencyMs: sources.durationMs,
  }));
}

export async function answerQuestion(question: string): Promise<ChatResponse> {
  const fallback = buildDemoChat(question);
  const config = await getConfig();

  // If Coral isn't enabled, return the mock preview right away
  if (!enabled()) {
    return fallback;
  }

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

      const schemasPrompt = `
You are an expert SQL generator for the Coral Query Engine.
Coral allows joining multiple data sources (GitHub, Discord, Notion) as SQL tables.

Here are the available schemas and tables in the system:

1. Local Demo Schemas (Use these for general queries or if live credentials are not set):
   - hm_github.pull_requests:
     - id (Utf8) - PR ID (e.g. pr-184)
     - title (Utf8)
     - issue_key (Utf8) - references common join key (e.g. key-431)
     - status (Utf8) - 'open', 'merged', etc.
     - review_state (Utf8) - 'changes_requested', 'review_requested', 'approved', 'none'
     - ci_state (Utf8) - 'failed', 'passed', 'not_applicable'
     - updated_at (Utf8)
     - author (Utf8)
     - url (Utf8)
   - hm_notion.pages:
     - id (Utf8)
     - title (Utf8)
     - issue_key (Utf8) - references common join key
     - status (Utf8)
     - last_edited (Utf8)
     - url (Utf8)
     - content (Utf8)
   - hm_discord.messages:
     - id (Utf8)
     - channel_name (Utf8)
     - author_name (Utf8)
     - content (Utf8)
     - issue_key (Utf8) - references common join key
     - created_at (Utf8)
     - sentiment (Utf8) - 'blocked', 'negative', 'neutral', 'positive'

2. Live Schemas:
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

Write a standard SQL query for the following user question:
"${question}"

Rules:
- Output ONLY the raw SQL query. Do NOT wrap it in any explanation or markdown code blocks (like \`\`\`sql).
- If the user asks about live GitHub PRs, use 'hm_github_live.pull_requests' (only if configured).
- If the user asks about live Discord messages, use 'discord.messages' (only if configured).
- If the question is about Notion, use the local demo tables (e.g. 'hm_notion.pages', 'hm_github.pull_requests', 'hm_discord.messages').
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
        const result = await runCoralSql<any>(sql);
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
    const result = await runCoralSql<Record<string, unknown>>(sql);
    if (result.ok && result.rows.length > 0) {
      rows = result.rows;
      durationMs = result.durationMs;
      queryRunSucceeded = true;
    }
  }

  // If no queries returned data, fallback to demo mode
  if (!queryRunSucceeded || rows.length === 0) {
    return {
      ...fallback,
      answer: `${fallback.answer} (Coral did not return data; using fallback preview).`,
    };
  }

  // Synthesize answer using Gemini if key is active
  if (config.geminiKey) {
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
      finalAnswer = `Coral returned ${rows.length} rows (query duration: ${durationMs}ms). Highest priority item matches: ${fallback.answer}`;
    }
  } else {
    finalAnswer = `Coral returned ${rows.length} rows (query duration: ${durationMs}ms). Configure a Gemini API Key in Settings to enable natural language summaries.`;
  }

  return {
    ...fallback,
    mode: "coral-live",
    sql,
    evidence: rowsToEvidence(rows),
    answer: finalAnswer,
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
  const score = row.ci_state === "failed" ? 97 : row.review_state === "changes_requested" ? 88 : 72;
  const evidence: EvidenceItem[] = [
    {
      source: "GitHub",
      label: `PR #${row.id.replace("pr-", "")}`,
      excerpt: `${row.title} has CI state ${row.ci_state} and review state ${row.review_state}.`,
      ref: row.id,
      time: "live",
    },
  ];

  if (row.community_signal) {
    evidence.push({
      source: "Discord",
      label: "Community signal",
      excerpt: row.community_signal,
      ref: row.issue_key,
      time: "live",
    });
  }

  if (row.roadmap_item) {
    evidence.push({
      source: "Notion",
      label: "Roadmap details",
      excerpt: row.roadmap_item,
      ref: row.issue_key,
      time: "live",
    });
  }

  return {
    id: row.id,
    title: row.title,
    category: row.ci_state === "failed" ? "Fix" : "Review",
    priority: score > 90 ? "Critical" : score > 80 ? "High" : "Medium",
    score,
    status: row.ci_state === "failed" ? "CI failing" : row.review_state,
    due: "Today",
    owner: "You",
    summary: `Coral joined ${row.issue_key} across GitHub, Discord, and Notion to rank this work.`,
    sqlKey: "morningBrief",
    links: [],
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
    
    // Label
    const label = String(row.issue_key || row.key || row.id || `Ref-${index + 1}`);
    
    // Excerpt
    const excerpt = String(
      row.title || 
      row.content || 
      row.text || 
      row.community_signal || 
      JSON.stringify(row)
    );
    
    // Ref
    const ref = String(row.url || row.html_url || row.ref || `id-${index + 1}`);

    return {
      source,
      label,
      excerpt,
      ref,
      time: "live",
    };
  });
}
