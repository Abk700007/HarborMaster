export type SourceState = "live" | "demo" | "missing";

export type SourceStatus = {
  id: string;
  label: string;
  schema: string;
  status: SourceState;
  tables: number;
  latencyMs: number;
  description: string;
};

export type EvidenceItem = {
  source: string;
  label: string;
  excerpt: string;
  ref: string;
  time: string;
};

export type ActionItem = {
  id: string;
  title: string;
  category: "Fix" | "Review" | "Reply" | "Ship";
  priority: "Critical" | "High" | "Medium";
  score: number;
  status: string;
  due: string;
  owner: string;
  summary: string;
  sqlKey: string;
  links: Array<{ label: string; href: string }>;
  evidence: EvidenceItem[];
};

export type RiskRow = {
  id: string;
  surface: string;
  blocker: string;
  linkedWork: string;
  impact: string;
  score: number;
  sources: string[];
};

export type BriefResponse = {
  mode: "coral-live" | "demo-preview";
  generatedAt: string;
  sourceStatuses: SourceStatus[];
  actions: ActionItem[];
  risks: RiskRow[];
  queryCount: number;
  cacheHitRate: number;
  latencyMs: number;
  sql: Record<string, string>;
  notice?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sql?: string;
  evidence?: EvidenceItem[];
};

export type ChatResponse = {
  answer: string;
  sql: string;
  evidence: EvidenceItem[];
  followups: string[];
  mode: BriefResponse["mode"];
};
