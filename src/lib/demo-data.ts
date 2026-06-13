import type { ActionItem, BriefResponse, ChatResponse, RiskRow, SourceStatus } from "./harbormaster-types";
import { sqlPlaybooks } from "./sql-playbooks";

export const demoSources: SourceStatus[] = [
  {
    id: "github",
    label: "GitHub",
    schema: "hm_github",
    status: "demo",
    tables: 3,
    latencyMs: 84,
    description: "PRs, CI state, review state, issue references",
  },
  {
    id: "linear",
    label: "Linear",
    schema: "hm_linear",
    status: "demo",
    tables: 2,
    latencyMs: 71,
    description: "Issue priority, owner, due date, release scope",
  },
  {
    id: "slack",
    label: "Slack",
    schema: "hm_slack",
    status: "demo",
    tables: 1,
    latencyMs: 52,
    description: "Team blockers and handoff context",
  },
  {
    id: "notion",
    label: "Notion",
    schema: "hm_notion",
    status: "demo",
    tables: 1,
    latencyMs: 66,
    description: "Roadmap notes and launch checklist",
  },
  {
    id: "discord",
    label: "Discord",
    schema: "hm_discord",
    status: "demo",
    tables: 1,
    latencyMs: 93,
    description: "Community complaints and maintainer support signals",
  },
];

export const demoActions: ActionItem[] = [
  {
    id: "act-1",
    title: "Unblock OAuth retry fix before v1.4 branch cut",
    category: "Fix",
    priority: "Critical",
    score: 97,
    status: "CI failing",
    due: "Today 18:00",
    owner: "You",
    summary:
      "The same issue appears in the release board, a failing PR, the engineering channel, and two community complaints. Fixing this removes the biggest launch blocker.",
    sqlKey: "morningBrief",
    links: [
      { label: "PR #184", href: "https://github.com/acme/harbor/pull/184" },
      { label: "LIN-431", href: "https://linear.app/acme/issue/LIN-431" },
    ],
    evidence: [
      {
        source: "GitHub",
        label: "PR #184",
        excerpt: "fix OAuth token refresh retry loop",
        ref: "acme/harbor#184",
        time: "31m ago",
      },
      {
        source: "Linear",
        label: "LIN-431",
        excerpt: "Urgent release blocker, assigned to you, due today.",
        ref: "LIN-431",
        time: "47m ago",
      },
      {
        source: "Slack",
        label: "#engineering",
        excerpt: "LIN-431 is still blocking the v1.4 smoke test.",
        ref: "1729.18",
        time: "24m ago",
      },
      {
        source: "Discord",
        label: "#support",
        excerpt: "Login loops after refresh token expires on Windows.",
        ref: "1240971001",
        time: "18m ago",
      },
    ],
  },
  {
    id: "act-2",
    title: "Review streaming logs PR while context is fresh",
    category: "Review",
    priority: "High",
    score: 88,
    status: "Review requested",
    due: "Today 21:00",
    owner: "Maya",
    summary:
      "The PR is clean, linked to a high-priority Linear issue, and Slack shows the owner is waiting on your review to unblock docs.",
    sqlKey: "reviewQueue",
    links: [
      { label: "PR #177", href: "https://github.com/acme/harbor/pull/177" },
      { label: "LIN-426", href: "https://linear.app/acme/issue/LIN-426" },
    ],
    evidence: [
      {
        source: "GitHub",
        label: "PR #177",
        excerpt: "stream parser logs through Coral trace sink",
        ref: "acme/harbor#177",
        time: "2h ago",
      },
      {
        source: "Linear",
        label: "LIN-426",
        excerpt: "High priority; docs work depends on final API shape.",
        ref: "LIN-426",
        time: "2h ago",
      },
      {
        source: "Slack",
        label: "#maintainers",
        excerpt: "Waiting for final review on LIN-426 before I update the guide.",
        ref: "1729.77",
        time: "1h ago",
      },
    ],
  },
  {
    id: "act-3",
    title: "Answer Discord thread about schema discovery limits",
    category: "Reply",
    priority: "High",
    score: 82,
    status: "Community waiting",
    due: "This afternoon",
    owner: "You",
    summary:
      "A negative Discord thread references the same Notion FAQ gap and a GitHub issue without an owner. A short answer plus issue assignment would defuse it.",
    sqlKey: "communityPain",
    links: [
      { label: "Issue #91", href: "https://github.com/acme/harbor/issues/91" },
      { label: "LIN-422", href: "https://linear.app/acme/issue/LIN-422" },
    ],
    evidence: [
      {
        source: "Discord",
        label: "#support",
        excerpt: "Schema discovery hangs on huge repos and the docs do not explain the cap.",
        ref: "1240971442",
        time: "43m ago",
      },
      {
        source: "Notion",
        label: "FAQ draft",
        excerpt: "Missing section: large catalogs and table paging.",
        ref: "notion:faq-large-catalogs",
        time: "Yesterday",
      },
      {
        source: "GitHub",
        label: "Issue #91",
        excerpt: "Add docs for paginated table discovery.",
        ref: "acme/harbor#91",
        time: "5h ago",
      },
    ],
  },
];

export const demoRisks: RiskRow[] = [
  {
    id: "risk-1",
    surface: "v1.4 release",
    blocker: "OAuth retry loop",
    linkedWork: "LIN-431 / PR #184",
    impact: "Login failures repeated in support and Discord",
    score: 97,
    sources: ["GitHub", "Linear", "Slack", "Discord"],
  },
  {
    id: "risk-2",
    surface: "Docs launch",
    blocker: "Schema discovery FAQ gap",
    linkedWork: "LIN-422 / Issue #91",
    impact: "Negative community sentiment is rising",
    score: 82,
    sources: ["Discord", "Notion", "GitHub"],
  },
  {
    id: "risk-3",
    surface: "Trace sink beta",
    blocker: "Review not merged",
    linkedWork: "LIN-426 / PR #177",
    impact: "Docs cannot finalize examples",
    score: 76,
    sources: ["GitHub", "Linear", "Slack"],
  },
];

export function buildDemoBrief(notice?: string): BriefResponse {
  return {
    mode: "demo-preview",
    generatedAt: new Date().toISOString(),
    sourceStatuses: demoSources,
    actions: demoActions,
    risks: demoRisks,
    queryCount: 4,
    cacheHitRate: 73,
    latencyMs: 190,
    sql: sqlPlaybooks,
    notice,
  };
}

export function buildDemoChat(question: string): ChatResponse {
  const normalized = question.toLowerCase();
  const action =
    normalized.includes("review") || normalized.includes("pr")
      ? demoActions[1]
      : normalized.includes("discord") ||
          normalized.includes("community") ||
          normalized.includes("complain") ||
          normalized.includes("support")
        ? demoActions[2]
        : demoActions[0];

  const sql =
    action.sqlKey === "reviewQueue"
      ? sqlPlaybooks.reviewQueue
      : action.sqlKey === "communityPain"
        ? sqlPlaybooks.communityPain
        : sqlPlaybooks.morningBrief;

  return {
    mode: "demo-preview",
    answer: `${action.title}. Score ${action.score}/100 because ${action.summary}`,
    sql,
    evidence: action.evidence,
    followups: [
      "What is blocking the v1.4 release?",
      "Which PR needs my review first?",
      "What are users complaining about?",
    ],
  };
}
