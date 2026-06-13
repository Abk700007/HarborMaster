"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Anchor,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Cable,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  DatabaseZap,
  ExternalLink,
  Flame,
  Gauge,
  GitPullRequest,
  Globe,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
  AlertTriangle,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  Search,
  Bell,
} from "lucide-react";

function Github({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildDemoBrief, buildDemoChat } from "@/lib/demo-data";
import { sqlPlaybooks } from "@/lib/sql-playbooks";
import type { ActionItem, BriefResponse, ChatMessage, ChatResponse, EvidenceItem, RiskRow, SourceStatus } from "@/lib/harbormaster-types";
import { cn } from "@/lib/utils";

const starterQuestions = [
  "What is blocking the v1.4 release?",
  "What should I work on next?",
  "Which PR needs my review first?",
  "What are users complaining about in Discord?",
];

const sourceTone: Record<string, string> = {
  GitHub: "border-blue-500/20 bg-blue-500/5 text-blue-300",
  Linear: "border-violet-500/20 bg-violet-500/5 text-violet-300",
  Slack: "border-teal-500/20 bg-teal-500/5 text-teal-300",
  Notion: "border-slate-500/20 bg-slate-500/5 text-slate-300",
  Discord: "border-sky-500/20 bg-sky-500/5 text-sky-300",
};

const categoryIcon = {
  Fix: Activity,
  Review: GitPullRequest,
  Reply: MessageSquare,
  Ship: ShieldAlert,
};

const schemaList = [
  {
    name: "hm_github",
    description: "GitHub PRs, authors, review comments, and CI pipeline checks.",
    table: "pull_requests",
    columns: [
      { name: "id", type: "Utf8 (PR number)" },
      { name: "title", type: "Utf8" },
      { name: "issue_key", type: "Utf8 (references Linear)" },
      { name: "status", type: "Utf8 (open / closed)" },
      { name: "review_state", type: "Utf8 (changes_requested / approved)" },
      { name: "ci_state", type: "Utf8 (failed / passed)" },
      { name: "updated_at", type: "Utf8" },
      { name: "author", type: "Utf8" },
      { name: "url", type: "Utf8" },
    ]
  },
  {
    name: "hm_linear",
    description: "Linear issues, task priorities, team owners, release versions, and due dates.",
    table: "issues",
    columns: [
      { name: "key", type: "Utf8 (e.g., LIN-431)" },
      { name: "title", type: "Utf8" },
      { name: "priority", type: "Utf8 (urgent / high / medium)" },
      { name: "status", type: "Utf8" },
      { name: "assignee", type: "Utf8" },
      { name: "due_date", type: "Utf8" },
      { name: "release", type: "Utf8 (e.g., v1.4)" },
      { name: "score", type: "Int64 (0-100)" },
      { name: "url", type: "Utf8" },
    ]
  },
  {
    name: "hm_slack",
    description: "Slack messages containing incident discussions and cross-functional blockers.",
    table: "messages",
    columns: [
      { name: "id", type: "Utf8" },
      { name: "channel_name", type: "Utf8" },
      { name: "text", type: "Utf8" },
      { name: "author", type: "Utf8" },
      { name: "issue_key", type: "Utf8 (references Linear)" },
      { name: "created_at", type: "Utf8" },
      { name: "sentiment", type: "Utf8" },
    ]
  },
  {
    name: "hm_notion",
    description: "Notion wiki pages detailing release plans, documentation FAQs, and specs.",
    table: "pages",
    columns: [
      { name: "id", type: "Utf8" },
      { name: "title", type: "Utf8" },
      { name: "issue_key", type: "Utf8" },
      { name: "status", type: "Utf8" },
      { name: "last_edited", type: "Utf8" },
      { name: "url", type: "Utf8" },
      { name: "content", type: "Utf8" },
    ]
  },
  {
    name: "hm_discord",
    description: "Discord community messages reflecting user support tickets and bug complaints.",
    table: "messages",
    columns: [
      { name: "id", type: "Utf8" },
      { name: "channel_name", type: "Utf8" },
      { name: "author_name", type: "Utf8" },
      { name: "content", type: "Utf8" },
      { name: "issue_key", type: "Utf8" },
      { name: "created_at", type: "Utf8" },
      { name: "sentiment", type: "Utf8" },
    ]
  }
];

function renderEvidencePreview(ev: EvidenceItem, key?: string | number) {
  const src = ev.source.toLowerCase();

  if (src === "github") {
    const isFailed = ev.excerpt.toLowerCase().includes("fail") || ev.excerpt.toLowerCase().includes("error");
    return (
      <div key={key} className="preview-github text-xs border border-white/[0.05] rounded-lg p-3 bg-slate-950/40 hover:bg-slate-900/50 transition-colors flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Github className="size-3.5 text-slate-400" />
            <span>pull_requests / {ev.ref || "#184"}</span>
          </div>
          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase",
            isFailed ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
          )}>
            {isFailed ? "checks failing" : "checks passing"}
          </span>
        </div>
        <p className="font-semibold text-white text-[11px] leading-tight mt-0.5">{ev.label}</p>
        <div className="bg-[#0b0d19]/80 border border-white/[0.03] rounded p-2 text-[10px] font-mono text-slate-400 mt-1 leading-relaxed">
          <div className="flex justify-between text-[8px] text-slate-500 pb-1 mb-1 border-b border-white/[0.02]">
            <span>DIFF EXCERPT</span>
            <span>{ev.time || "2 hours ago"}</span>
          </div>
          <p className="whitespace-pre-wrap line-clamp-3 font-mono">{ev.excerpt}</p>
        </div>
      </div>
    );
  }

  if (src === "discord") {
    return (
      <div key={key} className="preview-discord text-xs rounded-lg p-3 bg-[#2b2d31] border border-white/[0.04] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-sky-400 font-mono">
            <MessageSquare className="size-3.5 text-sky-400" />
            <span>#general-help / Discord</span>
          </div>
          <span className="text-slate-500 text-[9px] font-mono">{ev.time || "3 hours ago"}</span>
        </div>
        <div className="flex items-start gap-2.5 mt-1">
          <div className="size-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            U
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-white text-[11px]">DiscordUser</span>
              <span className="text-[8px] text-slate-500 font-mono">USER</span>
            </div>
            <p className="text-slate-300 text-[10.5px] leading-normal italic bg-black/10 p-2 rounded border border-white/[0.02]">
              "{ev.excerpt}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (src === "slack") {
    return (
      <div key={key} className="preview-slack text-xs rounded-lg p-3 bg-[#1a1d21] border border-white/[0.04] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-teal-400 font-mono">
            <Activity className="size-3.5 text-teal-400" />
            <span>#incidents-alerts / Slack</span>
          </div>
          <span className="text-slate-500 text-[9px] font-mono">{ev.time || "1 hour ago"}</span>
        </div>
        <div className="flex items-start gap-2.5 mt-1">
          <div className="size-6 rounded bg-[#4a154b] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            S
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-white text-[11px]">Slack Bot</span>
              <span className="text-[8px] text-slate-400 font-mono">{ev.ref || "INCIDENT-40"}</span>
            </div>
            <p className="text-slate-300 text-[10.5px] leading-normal bg-white/[0.02] p-2 rounded border border-white/[0.02]">
              {ev.excerpt}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (src === "linear") {
    return (
      <div key={key} className="preview-linear text-xs rounded-lg p-3 bg-[#141416] border border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-violet-400 font-mono">
            <ShieldAlert className="size-3.5 text-violet-400" />
            <span>{ev.ref || "LIN-421"} / Linear</span>
          </div>
          <span className="text-slate-500 text-[9px] font-mono">{ev.time || "Today"}</span>
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-white text-[11px] leading-tight">{ev.label}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold font-mono">
              High Priority
            </span>
            <span className="text-[8px] uppercase tracking-wide bg-white/5 border border-white/10 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              Backlog
            </span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed italic bg-black/20 p-2 rounded border border-white/[0.02] mt-1.5">
            "{ev.excerpt}"
          </p>
        </div>
      </div>
    );
  }

  // Fallback (Notion or other)
  return (
    <div key={key} className="text-xs rounded-lg p-3 bg-card border border-white/[0.04] flex flex-col gap-2 hover:bg-slate-900/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
          <Globe className="size-3.5 text-slate-400" />
          <span>notion.pages / {ev.ref || "Docs"}</span>
        </div>
        <span className="text-slate-500 text-[9px] font-mono">{ev.time || "Yesterday"}</span>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-white text-[11px] leading-tight">{ev.label}</h4>
        <p className="text-slate-400 text-[10px] leading-relaxed italic bg-black/10 p-2 rounded border border-white/[0.02] mt-1">
          "{ev.excerpt}"
        </p>
      </div>
    </div>
  );
}

export function HarborMasterApp() {
  // Navigation Flow State
  const [stage, setStage] = useState<"landing" | "auth" | "onboarding" | "dashboard">("landing");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [sidebarView, setSidebarView] = useState<"brief" | "incidents" | "release" | "community" | "console" | "sources" | "settings">("brief");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Onboarding synced data previews
  const [githubSyncOk, setGithubSyncOk] = useState(false);
  const [discordSyncOk, setDiscordSyncOk] = useState(false);
  const [notionSyncOk, setNotionSyncOk] = useState(false);
  const [slackSyncOk, setSlackSyncOk] = useState(false);

  // Settings / connection credentials states (mirrored in onboarding)
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [discordChannel, setDiscordChannel] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");

  // Testing states
  const [testingConnection, setTestingConnection] = useState(false);

  // Dashboard Data State
  const [brief, setBrief] = useState<BriefResponse>(() => ({
    ...buildDemoBrief(),
    generatedAt: new Date().toISOString(),
  }));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Morning brief ready. Your highest leverage move is resolving the OAuth token expiration bug. Under the hood, Coral SQL has joined failing pull requests, Discord user support logs, and Linear release items to confirm this blocks your upcoming v1.4 release.",
      sql: buildDemoChat("next").sql,
      evidence: buildDemoChat("next").evidence,
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [asking, setAsking] = useState(false);

  // SQL Console State
  const [consoleSql, setConsoleSql] = useState(sqlPlaybooks.morningBrief);
  const [consoleResults, setConsoleResults] = useState<{
    ok: boolean;
    rows: any[];
    durationMs: number;
    cacheHit: boolean;
    error?: string;
  } | null>(null);
  const [executingConsole, setExecutingConsole] = useState(false);
  const [expandedSchema, setExpandedSchema] = useState<string | null>("hm_github");

  // Action modal state
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [actionType, setActionType] = useState<"discord" | "slack" | "github" | "linear" | null>(null);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" | "info" } | null>(null);

  // Collapsible evidence maps on cards
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  // Sync state stage
  const [syncProgress, setSyncProgress] = useState(0);

  // Check state persistence on mount
  useEffect(() => {
    const storedStage = localStorage.getItem("hm_stage") as any;
    if (storedStage) {
      setStage(storedStage);
    }
    // Load config secrets
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.geminiKey) setGeminiKey(data.geminiKey);
        if (data.githubToken) setGithubToken(data.githubToken);
        if (data.githubOwner) setGithubOwner(data.githubOwner);
        if (data.githubRepo) setGithubRepo(data.githubRepo);
        if (data.discordToken) setDiscordToken(data.discordToken);
        if (data.discordChannel) setDiscordChannel(data.discordChannel);
      })
      .catch((err) => console.error("Could not load credentials", err));

    void refreshBrief();
  }, []);

  const transitionToStage = (newStage: "landing" | "auth" | "onboarding" | "dashboard") => {
    setStage(newStage);
    localStorage.setItem("hm_stage", newStage);
  };

  const handleResetState = () => {
    localStorage.removeItem("hm_stage");
    setStage("landing");
    setOnboardingStep(1);
    setGithubSyncOk(false);
    setDiscordSyncOk(false);
    setNotionSyncOk(false);
    setSlackSyncOk(false);
    showToast("Application stage reset to Landing Page", "info");
  };

  const topAction = brief.actions[0];
  const liveSourcesCount = brief.sourceStatuses.filter((s) => s.status === "live").length;
  const activeSourceCount = liveSourcesCount || brief.sourceStatuses.length;

  async function showToast(message: string, type: "success" | "error" | "info" = "success") {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  async function refreshBrief() {
    setLoadingBrief(true);
    try {
      const response = await fetch("/api/brief", { cache: "no-store" });
      if (response.ok) {
        setBrief((await response.json()) as BriefResponse);
      }
    } finally {
      setLoadingBrief(false);
    }
  }

  async function askHarborMaster(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;

    setQuestion("");
    setAsking(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const answer: ChatResponse = response.ok ? ((await response.json()) as ChatResponse) : buildDemoChat(trimmed);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer.answer,
          sql: answer.sql,
          evidence: answer.evidence,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function onSubmitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askHarborMaster(question);
  }

  async function runConsoleQuery() {
    if (!consoleSql.trim()) return;
    setExecutingConsole(true);
    setConsoleResults(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: consoleSql }),
      });

      if (response.ok) {
        const data = await response.json();
        setConsoleResults(data);
      } else {
        const err = await response.json().catch(() => ({}));
        setConsoleResults({
          ok: false,
          rows: [],
          durationMs: 0,
          cacheHit: false,
          error: err.error || "Execution failed",
        });
      }
    } catch (e: any) {
      setConsoleResults({
        ok: false,
        rows: [],
        durationMs: 0,
        cacheHit: false,
        error: e.message || "Failed to query API endpoint",
      });
    } finally {
      setExecutingConsole(false);
    }
  }

  async function handleOpenAction(action: ActionItem, type: "discord" | "slack" | "github" | "linear") {
    setSelectedAction(action);
    setActionType(type);
    setDraftText("");
    setDrafting(true);

    try {
      const ticketMatch = action.evidence.find(e => e.source.toLowerCase() === type);
      const payload = {
        category: action.category,
        title: action.title,
        issueKey: action.id,
        status: action.status,
        summary: action.summary,
        excerpt: ticketMatch?.excerpt || "",
      };

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: type,
          payload,
          draft: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDraftText(data.text || "");
      } else {
        throw new Error("Drafting failed");
      }
    } catch (err) {
      setDraftText(`Failed to generate AI draft. Please compose manually.`);
    } finally {
      setDrafting(false);
    }
  }

  async function handleExecuteAction() {
    if (!selectedAction || !actionType) return;
    setExecutingAction(true);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          payload: {
            text: draftText,
            prNumber: selectedAction.id.replace("pr-", ""),
            issueKey: selectedAction.id,
          },
          draft: false,
        }),
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        showToast(
          data.live
            ? `Posted action successfully to live integration!`
            : `[Simulated Mode] Action successfully dispatched.`,
          "success"
        );
        setSelectedAction(null);
        setActionType(null);
      } else {
        showToast(data.error || "Action dispatch failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to dispatch action", "error");
    } finally {
      setExecutingAction(false);
    }
  }

  // Trigger test-connection in onboarding or settings
  async function runTestConnection(type: "github" | "discord" | "gemini") {
    setTestingConnection(true);
    let payload = {};
    if (type === "github") {
      payload = { githubToken, githubOwner, githubRepo };
    } else if (type === "discord") {
      payload = { discordToken, discordChannel };
    } else {
      payload = { geminiKey };
    }

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: type, payload }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Connected to ${type} successfully!`, "success");
        if (type === "github") setGithubSyncOk(true);
        if (type === "discord") setDiscordSyncOk(true);
      } else {
        showToast(data.error || `Connection to ${type} failed`, "error");
      }
    } catch (e) {
      showToast(`Network error testing ${type}`, "error");
    } finally {
      setTestingConnection(false);
    }
  }

  // Onboarding Step Switcher
  const handleOnboardingNext = () => {
    if (onboardingStep === 1 && !githubSyncOk) {
      setGithubSyncOk(true); // Auto-mock pass if they skip
    }
    if (onboardingStep === 2 && !discordSyncOk) {
      setDiscordSyncOk(true); // Auto-mock pass if they skip
    }
    if (onboardingStep === 3) {
      setNotionSyncOk(true);
    }
    if (onboardingStep === 4) {
      setSlackSyncOk(true);
    }

    if (onboardingStep < 4) {
      setOnboardingStep((prev) => prev + 1);
    } else {
      // Step 5: Sync Workspace Animation stage
      setOnboardingStep(5);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setSyncProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            transitionToStage("dashboard");
          }, 800);
        }
      }, 250);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey,
          githubToken,
          githubOwner,
          githubRepo,
          discordToken,
          discordChannel,
        }),
      });
      if (res.ok) {
        showToast("Configuration saved successfully", "success");
        void refreshBrief();
      } else {
        showToast("Failed to save configuration settings", "error");
      }
    } catch (e) {
      showToast("Error updating settings", "error");
    }
  };

  const handleSelectPlaybook = (playbookKey: keyof typeof sqlPlaybooks) => {
    setConsoleSql(sqlPlaybooks[playbookKey]);
    setConsoleResults(null);
  };

  const toggleEvidence = (actionId: string) => {
    setExpandedEvidence(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  const syncLogs = useMemo(() => {
    const logs: string[] = [];
    if (syncProgress >= 10) logs.push("[SYNC] Initiating handshake with hm_github database...");
    if (syncProgress >= 20) logs.push("[SYNC] Handshake OK. Pulling branch metadata and commit shas...");
    if (syncProgress >= 30) logs.push("[SYNC] Synced 24 active PRs. Analyzing check_run status...");
    if (syncProgress >= 40) logs.push("[SYNC] Initiating handshake with hm_discord server...");
    if (syncProgress >= 50) logs.push("[SYNC] Synced 18 recent support messages from #general-help...");
    if (syncProgress >= 60) logs.push("[SYNC] Indexing hm_linear board keys: LIN-421, LIN-431...");
    if (syncProgress >= 70) logs.push("[SYNC] Connecting to hm_notion pages. Fetching release v1.4 FAQs...");
    if (syncProgress >= 80) logs.push("[CORAL] Compiling federated table query index mappings...");
    if (syncProgress >= 90) logs.push("[CORAL] Resolving join keys: github.pr.issue_key <-> linear.issues.key...");
    if (syncProgress >= 100) logs.push("[SUCCESS] Schema synchronization complete. Brief cached.");
    return logs;
  }, [syncProgress]);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans select-none overflow-x-hidden antialiased">
      {/* Toast Overlay */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 py-3 px-4 rounded-xl border backdrop-blur-xl shadow-lg transition-all duration-300 transform scale-100",
          toast.type === "success" ? "border-emerald-500/20 bg-slate-900/90 text-emerald-300 shadow-emerald-950/20" :
            toast.type === "error" ? "border-red-500/20 bg-slate-900/90 text-red-300 shadow-red-950/20" :
              "border-slate-700 bg-slate-900/90 text-slate-300"
        )}>
          {toast.type === "success" && <CheckCircle2 className="size-4 text-emerald-400" />}
          {toast.type === "error" && <XCircle className="size-4 text-red-400" />}
          {toast.type === "info" && <Info className="size-4 text-blue-400" />}
          <span className="text-xs font-medium font-sans">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* STAGE 1: LANDING PAGE */}
      {stage === "landing" && (
        <div className="min-h-screen relative flex flex-col justify-between hm-fade-stage overflow-hidden bg-[#070913]">

          {/* Interactive animated background grid, mesh, & radar */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* Animated background mesh gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#080a16] via-[#050710] to-[#04050a]" />
            <div className="absolute inset-0 hm-grid-pattern opacity-15" />

            {/* Concentric rings and radar sweep inside a centered square container to prevent aspect warping */}
            <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] pointer-events-none select-none">
              <svg className="w-full h-full opacity-35" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="radar-sweep-grad" cx="500" cy="500" r="400" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="oklch(0.76 0.12 195)" stopOpacity="0.18" />
                    <stop offset="50%" stopColor="oklch(0.76 0.12 195)" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="oklch(0.76 0.12 195)" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Concentric rings */}
                <circle cx="500" cy="500" r="160" fill="none" stroke="oklch(0.76 0.12 195 / 8%)" strokeWidth="0.75" strokeDasharray="3 5" />
                <circle cx="500" cy="500" r="300" fill="none" stroke="oklch(0.76 0.12 195 / 10%)" strokeWidth="0.75" />
                <circle cx="500" cy="500" r="450" fill="none" stroke="oklch(0.76 0.12 195 / 5%)" strokeWidth="0.75" strokeDasharray="4 8" />
                <circle cx="500" cy="500" r="600" fill="none" stroke="oklch(0.76 0.12 195 / 2%)" strokeWidth="0.5" />

                {/* Crosshair axes */}
                <line x1="500" y1="0" x2="500" y2="1000" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.75" strokeDasharray="2 4" />
                <line x1="0" y1="500" x2="1000" y2="500" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.75" strokeDasharray="2 4" />

                {/* Scanning Sweep Line */}
                <g className="hm-radar-sweep" style={{ transformOrigin: "500px 500px" }}>
                  <line x1="500" y1="500" x2="500" y2="100" stroke="oklch(0.76 0.12 195 / 35%)" strokeWidth="1.2" />
                  <path d="M 500 500 L 500 100 A 400 400 0 0 1 800 280 Z" fill="url(#radar-sweep-grad)" />
                </g>
              </svg>
            </div>

            {/* Dynamic percentage-based connection lines and flowing packets */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Connection lines from nodes to HarborMaster hub (50% left, 52% top) */}
              <line
                x1="22%" y1="35%" x2="50%" y2="52%"
                stroke={hoveredNode === "github" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "github" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="78%" y1="32%" x2="50%" y2="52%"
                stroke={hoveredNode === "discord" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "discord" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="18%" y1="68%" x2="50%" y2="52%"
                stroke={hoveredNode === "slack" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "slack" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "slack" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="82%" y1="65%" x2="50%" y2="52%"
                stroke={hoveredNode === "linear" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "linear" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "linear" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="50%" y1="82%" x2="50%" y2="52%"
                stroke={hoveredNode === "notion" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "notion" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}
              />

              {/* Flowing animated telemetry packets - Staggered 3-packet streams */}
              {/* GitHub Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "github" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="22%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="35%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "github" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="22%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="35%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "github" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="22%" to="50%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" from="35%" to="52%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Discord Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "discord" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="78%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="32%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "discord" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="78%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="32%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "discord" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="78%" to="50%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" from="32%" to="52%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Slack Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "slack" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "slack" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="18%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="68%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "slack" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "slack" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="18%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="68%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "slack" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "slack" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="18%" to="50%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" from="68%" to="52%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Linear Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "linear" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "linear" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="82%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="65%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "linear" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "linear" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="82%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="65%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "linear" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "linear" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="82%" to="50%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" from="65%" to="52%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Notion Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "notion" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="50%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="82%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "notion" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="50%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="82%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "notion" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="50%" to="50%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" from="82%" to="52%" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Concentric telemetry pulses */}
            <div className="absolute top-[52%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-teal-500/5 animate-pulse pointer-events-none" />
          </div>

          {/* Absolute layout nodes for interactive workspace sources */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Central Hub Node */}
            <div
              className="absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer transition-all duration-300"
              style={{
                left: "50%",
                top: "52%",
                transform: hoveredNode ? "translate(-50%, -50%) scale(1.08)" : "translate(-50%, -50%) scale(1)"
              }}
            >
              <div className={cn(
                "size-12 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shadow-lg transition-all duration-300",
                hoveredNode
                  ? "border border-teal-400 shadow-teal-500/30"
                  : "border border-teal-500/40 shadow-teal-950/40"
              )}>
                <Anchor className="size-6 animate-pulse" />
              </div>
              <span className="font-mono text-[9px] text-teal-300 uppercase tracking-wider font-semibold bg-slate-950/85 px-1.5 py-0.5 rounded border border-teal-500/20 shadow-md">
                Coral Core
              </span>
            </div>

            {/* GitHub Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "github" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "22%", top: "35%", transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredNode("github")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative">
                {/* Pulsing glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-blue-500/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                <div className="relative size-10 rounded-xl bg-slate-900 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-950/20 group-hover:scale-110 group-hover:border-blue-400 group-hover:shadow-blue-500/20 transition-all duration-300 hm-floating">
                  <Github className="size-5" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-slate-500 group-hover:text-blue-300 transition-colors uppercase tracking-wider font-semibold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/[0.03]">
                GitHub
              </span>
              <div className="absolute hidden group-hover:flex flex-col z-30 bottom-14 w-52 bg-slate-950/90 border border-blue-500/40 rounded-xl shadow-2xl shadow-blue-950/50 text-left pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-mono text-[9px]">
                <div className="bg-blue-500/10 border-b border-blue-500/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-blue-300 font-bold">github.pull_requests</span>
                  <span className="text-[8px] text-slate-500 uppercase">table</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-slate-300">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-blue-400 font-semibold">id</span>
                    <span className="text-slate-500">Int64 (PK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-blue-400 font-semibold">title</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-blue-400 font-semibold">issue_key</span>
                    <span className="text-slate-500">Utf8 (FK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-blue-400 font-semibold">ci_state</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400 font-semibold">author</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Discord Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "discord" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "78%", top: "32%", transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredNode("discord")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative">
                {/* Pulsing glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-sky-500/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                <div className="relative size-10 rounded-xl bg-slate-900 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-lg shadow-sky-950/20 group-hover:scale-110 group-hover:border-sky-400 group-hover:shadow-sky-500/20 transition-all duration-300 hm-float-delayed-1">
                  <MessageSquare className="size-5" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-slate-500 group-hover:text-sky-300 transition-colors uppercase tracking-wider font-semibold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/[0.03]">
                Discord
              </span>
              <div className="absolute hidden group-hover:flex flex-col z-30 bottom-14 w-52 bg-slate-950/90 border border-sky-500/40 rounded-xl shadow-2xl shadow-sky-950/50 text-left pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-mono text-[9px]">
                <div className="bg-sky-500/10 border-b border-sky-500/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-sky-300 font-bold">discord.messages</span>
                  <span className="text-[8px] text-slate-500 uppercase">table</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-slate-300">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-sky-400 font-semibold">id</span>
                    <span className="text-slate-500">Utf8 (PK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-sky-400 font-semibold">author_name</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-sky-400 font-semibold">content</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-sky-400 font-semibold">sentiment</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-400 font-semibold">issue_key</span>
                    <span className="text-slate-500">Utf8 (FK)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slack Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "slack" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "18%", top: "68%", transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredNode("slack")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative">
                {/* Pulsing glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-teal-500/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                <div className="relative size-10 rounded-xl bg-slate-900 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-950/20 group-hover:scale-110 group-hover:border-teal-400 group-hover:shadow-teal-500/20 transition-all duration-300 hm-float-delayed-2">
                  <Activity className="size-5" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-slate-500 group-hover:text-teal-300 transition-colors uppercase tracking-wider font-semibold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/[0.03]">
                Slack
              </span>
              <div className="absolute hidden group-hover:flex flex-col z-30 bottom-14 w-52 bg-slate-950/90 border border-teal-500/40 rounded-xl shadow-2xl shadow-teal-950/50 text-left pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-mono text-[9px]">
                <div className="bg-teal-500/10 border-b border-teal-500/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-teal-300 font-bold">slack.messages</span>
                  <span className="text-[8px] text-slate-500 uppercase">table</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-slate-300">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-teal-400 font-semibold">id</span>
                    <span className="text-slate-500">Utf8 (PK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-teal-400 font-semibold">channel_name</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-teal-400 font-semibold">text</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-teal-400 font-semibold">sentiment</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-400 font-semibold">issue_key</span>
                    <span className="text-slate-500">Utf8 (FK)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linear Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "linear" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "82%", top: "65%", transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredNode("linear")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative">
                {/* Pulsing glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-violet-500/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                <div className="relative size-10 rounded-xl bg-slate-900 border border-violet-500/30 text-violet-400 flex items-center justify-center shadow-lg shadow-violet-950/20 group-hover:scale-110 group-hover:border-violet-400 group-hover:shadow-violet-500/20 transition-all duration-300 hm-float-delayed-3">
                  <ShieldAlert className="size-5" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-slate-500 group-hover:text-violet-300 transition-colors uppercase tracking-wider font-semibold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/[0.03]">
                Linear
              </span>
              <div className="absolute hidden group-hover:flex flex-col z-30 bottom-14 w-52 bg-slate-950/90 border border-violet-500/40 rounded-xl shadow-2xl shadow-violet-950/50 text-left pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-mono text-[9px]">
                <div className="bg-violet-500/10 border-b border-violet-500/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-violet-300 font-bold">linear.issues</span>
                  <span className="text-[8px] text-slate-500 uppercase">table</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-slate-300">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-violet-400 font-semibold">key</span>
                    <span className="text-slate-500">Utf8 (PK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-violet-400 font-semibold">title</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-violet-400 font-semibold">priority</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-violet-400 font-semibold">score</span>
                    <span className="text-slate-500">Int64</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-violet-400 font-semibold">release</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notion Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "notion" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "50%", top: "82%", transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredNode("notion")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative">
                {/* Pulsing glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-slate-500/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                <div className="relative size-10 rounded-xl bg-slate-900 border border-slate-500/30 text-slate-400 flex items-center justify-center shadow-lg shadow-slate-950/20 group-hover:scale-110 group-hover:border-slate-300 group-hover:shadow-slate-500/20 transition-all duration-300 hm-floating">
                  <Globe className="size-5" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-wider font-semibold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/[0.03]">
                Notion
              </span>
              <div className="absolute hidden group-hover:flex flex-col z-30 bottom-14 w-52 bg-slate-950/90 border border-slate-500/40 rounded-xl shadow-2xl shadow-slate-950/50 text-left pointer-events-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-mono text-[9px]">
                <div className="bg-slate-500/10 border-b border-slate-500/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-slate-300 font-bold">notion.pages</span>
                  <span className="text-[8px] text-slate-500 uppercase">table</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-slate-300">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-slate-400 font-semibold">id</span>
                    <span className="text-slate-500">Utf8 (PK)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-slate-400 font-semibold">title</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-slate-400 font-semibold">content</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1">
                    <span className="text-slate-400 font-semibold">status</span>
                    <span className="text-slate-500">Utf8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">issue_key</span>
                    <span className="text-slate-500">Utf8 (FK)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Landing Header */}
          <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg border border-slate-750 bg-slate-900 text-teal-400 shadow-sm">
                <Anchor className="size-5" />
              </div>
              <span className="font-semibold text-lg tracking-tight font-heading">HarborMaster</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-slate-800 bg-slate-950/40 text-xs hover:bg-slate-900/50" onClick={() => transitionToStage("dashboard")}>
                View Live Demo
              </Button>
              <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs shadow-sm shadow-teal-950/10" onClick={() => transitionToStage("auth")}>
                Sign In
              </Button>
            </div>
          </header>

          {/* Landing Hero */}
          <main className="w-full max-w-5xl mx-auto px-6 pt-12 pb-20 flex flex-col items-center justify-start text-center z-10 flex-1 space-y-12">
            <div className="space-y-5 max-w-3xl mx-auto">
              <Badge variant="outline" className="border-teal-500/20 bg-teal-500/5 text-teal-300 font-mono text-[10px] tracking-wide py-0.5 px-2.5">
                ⚓ CORAL SQL INTERACTION ENGINE
              </Badge>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-heading max-w-3xl mx-auto">
                Your AI First Mate for <br />
                <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Open Source Operations</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed font-sans">
                HarborMaster connects GitHub, Discord, Notion, Slack, and Linear into one intelligent command center powered by Coral SQL. It translates multiple messy developer channels into actionable operational priorities.
              </p>
            </div>

            {/* <div className="flex items-center gap-5">
              <Button 
                size="lg" 
                className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] px-8 font-semibold text-sm rounded-lg transition-all duration-300" 
                onClick={() => transitionToStage("auth")}
              >
                Start Morning Brief
              </Button>
              <Button 
                size="lg" 
                variant="ghost" 
                className="text-slate-500 hover:text-slate-300 bg-transparent hover:bg-white/[0.02] border-transparent text-sm transition-all duration-300 px-8" 
                onClick={() => transitionToStage("dashboard")}
              >
                Skip Onboarding
              </Button>
            </div> */}

            {/* Product Story Visual Grid */}
            <div className="w-full max-w-4xl pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Feature 1 */}
                <div className="rounded-xl border border-white/[0.05] bg-[#101424]/85 hover:bg-[#141930]/95 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-950/20 hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between space-y-5 group">
                  <div className="space-y-3">
                    <div className="size-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-400 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all duration-350">
                      <Cable className="size-4" />
                    </div>
                    <h3 className="text-xs font-semibold text-white font-heading">1. Connect Data Sources</h3>
                    <div className="flex items-center justify-between gap-1 text-[9px] font-mono bg-slate-950/60 p-2 rounded-lg border border-white/[0.03]">
                      <span className="flex items-center gap-1 text-blue-300 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
                        <Github className="size-2.5" /> PR
                      </span>
                      <ChevronRight className="size-2 text-slate-600 animate-pulse" />
                      <span className="flex items-center gap-1 text-sky-300 bg-sky-500/5 px-1.5 py-0.5 rounded border border-sky-500/10">
                        <MessageSquare className="size-2.5" /> Discord
                      </span>
                      <ChevronRight className="size-2 text-slate-600 animate-pulse" />
                      <span className="text-teal-300 bg-teal-500/5 px-1.5 py-0.5 rounded border border-teal-500/10">
                        Join
                      </span>
                      <ChevronRight className="size-2 text-slate-600 animate-pulse" />
                      <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                        Blocker
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.02]">
                    <span className="text-[8px] font-mono text-slate-500 uppercase mr-1">CONNECTS:</span>
                    <div className="flex gap-1">
                      <div className="p-1 rounded bg-slate-950 border border-white/[0.04]" title="GitHub"><Github className="size-3 text-slate-400" /></div>
                      <div className="p-1 rounded bg-slate-950 border border-white/[0.04]" title="Discord"><MessageSquare className="size-3 text-sky-400" /></div>
                      <div className="p-1 rounded bg-slate-950 border border-white/[0.04]" title="Slack"><Activity className="size-3 text-teal-400" /></div>
                      <div className="p-1 rounded bg-slate-950 border border-white/[0.04]" title="Linear"><ShieldAlert className="size-3 text-violet-400" /></div>
                      <div className="p-1 rounded bg-slate-950 border border-white/[0.04]" title="Notion"><Globe className="size-3 text-slate-400" /></div>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="rounded-xl border border-white/[0.05] bg-[#101424]/85 hover:bg-[#141930]/95 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-950/20 hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between space-y-5 group">
                  <div className="space-y-3">
                    <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-350">
                      <DatabaseZap className="size-4" />
                    </div>
                    <h3 className="text-xs font-semibold text-white font-heading">2. Coral Joins Data</h3>
                    <div className="font-mono text-[9px] bg-slate-950/80 p-2 rounded-lg border border-white/[0.04] overflow-x-auto select-none leading-normal">
                      <div>
                        <span className="text-violet-400">SELECT</span> <span className="text-slate-300">*</span> <span className="text-violet-400">FROM</span> <span className="text-blue-300">pull_requests</span> <span className="text-slate-400">pr</span>
                      </div>
                      <div>
                        <span className="text-violet-400">JOIN</span> <span className="text-sky-300">discord.messages</span> <span className="text-slate-400">msg</span>
                      </div>
                      <div className="pl-3">
                        <span className="text-violet-400">ON</span> <span className="text-slate-300">pr.issue_key = msg.issue_key</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/[0.02]">
                    <span className="text-[8px] font-mono text-slate-500 uppercase mr-1">STRATEGY:</span>
                    <span className="text-[9px] text-blue-300 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">In-Memory Hash Join</span>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="rounded-xl border border-white/[0.05] bg-[#101424]/85 hover:bg-[#141930]/95 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-950/20 hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between space-y-5 group">
                  <div className="space-y-3">
                    <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-350">
                      <Bot className="size-4" />
                    </div>
                    <h3 className="text-xs font-semibold text-white font-heading">3. AI Prioritizes Actions</h3>
                    <div className="space-y-1.5 font-sans text-[10px]">
                      <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 px-2 py-1 rounded text-red-300">
                        <span className="flex items-center gap-1 font-semibold text-[9px]">
                          <ShieldAlert className="size-3 text-red-400 animate-pulse" /> [Critical]
                        </span>
                        <span className="text-slate-300 font-mono text-[9px]">OAuth Token Expiry</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded text-amber-300">
                        <span className="flex items-center gap-1 font-semibold text-[9px]">
                          <AlertTriangle className="size-3 text-amber-400" /> [High]
                        </span>
                        <span className="text-slate-300 font-mono text-[9px]">CI Pipeline Failure</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.02]">
                    <span className="text-[8px] font-mono text-slate-500 uppercase mr-1">OUTPUT:</span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Bot className="size-2.5" /> 1 Blocker Identified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Landing Footer */}
          <footer className="w-full py-6 text-center text-xs text-slate-500 z-10 border-t border-white/[0.03] bg-slate-950/20 font-sans">
            Powered by Coral. Developed for the We Make Devs Hackathon.
          </footer>
        </div>
      )}

      {/* STAGE 2: AUTH SCREEN */}
      {stage === "auth" && (
        <div className="min-h-screen relative flex items-center justify-center hm-fade-stage bg-[#070913] overflow-hidden">
          <div className="absolute inset-0 hm-grid-pattern opacity-25 z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080a16] via-transparent to-[#04050a] z-0" />

          <Card className="w-full max-w-sm border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 space-y-6 shadow-2xl shadow-slate-950/60 z-10">
            <CardHeader className="text-center p-0 space-y-2">
              <div className="flex size-10 items-center justify-center rounded-xl border border-teal-500/20 bg-slate-950 text-teal-400 mx-auto hm-connection-glow">
                <Anchor className="size-6 animate-pulse" />
              </div>
              <CardTitle className="text-xl font-heading text-white">Secure Access</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                To continue onboarding your HarborMaster agent, authenticate with your developer credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Button className="w-full py-5 bg-slate-950 hover:bg-[#121629] border border-white/[0.04] text-sm font-medium text-white flex items-center justify-center gap-2 rounded-lg transition-all duration-200" onClick={() => transitionToStage("onboarding")}>
                <Github className="size-4" />
                Continue with GitHub
              </Button>
            </CardContent>
            <CardFooter className="p-0 text-center flex flex-col space-y-2 border-t-0 bg-transparent">
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-500 font-mono">
                <Lock className="size-3" />
                SECURE END-TO-END VERIFICATION
              </div>
              <button className="text-[10px] text-slate-400 underline hover:text-white" onClick={() => transitionToStage("landing")}>
                Back to landing page
              </button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STAGE 3: ONBOARDING WIZARD */}
      {stage === "onboarding" && (
        <div className="min-h-screen relative flex flex-col justify-between hm-fade-stage py-12 px-6 bg-[#070913]">
          <div className="absolute inset-0 hm-grid-pattern opacity-25 z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080a16] via-transparent to-[#04050a] z-0" />

          <div className="w-full max-w-4xl mx-auto space-y-8 flex-1 flex flex-col justify-center animate-fade-in z-10">

            {/* Step indicator header */}
            {onboardingStep <= 4 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>ONBOARDING WIZARD</span>
                  <span>STEP {onboardingStep} OF 4</span>
                </div>
                <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${onboardingStep * 25}%` }} />
                </div>
              </div>
            )}

            {/* Step 1: Connect GitHub */}
            {onboardingStep === 1 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Github className="size-5 text-blue-300" />
                          <CardTitle className="text-base text-white font-heading">1. Configure GitHub Live Source</CardTitle>
                        </div>
                        {githubSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Connected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        Allow Coral SQL to query active PR branches, pull reviews, and test pipeline statuses.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 flex justify-between">
                            <span>OWNER / ORGANIZATION</span>
                            <span className="text-[9px] text-slate-500 lowercase">e.g. facebook</span>
                          </label>
                          <Input placeholder="e.g., vercel" value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 flex justify-between">
                            <span>REPOSITORY NAME</span>
                            <span className="text-[9px] text-slate-500 lowercase">e.g. react</span>
                          </label>
                          <Input placeholder="e.g., next.js" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">PERSONAL ACCESS TOKEN (CLASSIC)</label>
                          <Input type="password" placeholder="ghp_..." value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">Requires a classic GitHub token with <code className="text-teal-400 font-mono">repo</code> scope.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-white/[0.04] bg-transparent">
                      <Button variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900 text-slate-300" onClick={() => runTestConnection("github")} disabled={testingConnection}>
                        {testingConnection ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                        Test connection
                      </Button>
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Discord
                      </Button>
                    </div>
                  </div>                  {/* Right Column: GitHub Git Graph SVG */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {githubSyncOk ? "✦ PIPELINE LIVE" : "GIT REPOSITORY GRAPH"}
                    </span>
                    <svg viewBox="0 0 220 140" className="w-full max-w-[240px] z-10" xmlns="http://www.w3.org/2000/svg">
                      {/* Grid subtle lines */}
                      <line x1="0" y1="70" x2="220" y2="70" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,6" />

                      {/* Main branch line */}
                      <line x1="15" y1="55" x2="205" y2="55"
                        stroke={githubSyncOk ? "#34d399" : "#475569"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        style={{ transition: "stroke 0.6s" }}
                      />

                      {/* Feature branch curve */}
                      <path d="M 55 55 C 75 100, 140 100, 160 55"
                        stroke="#22d3ee"
                        strokeWidth="1.2"
                        fill="none"
                        strokeDasharray={githubSyncOk ? "none" : "4,3"}
                        opacity="0.8"
                      />

                      {/* Animated packet on feature branch */}
                      <circle r="3" fill="#22d3ee" opacity="0.9">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M 55 55 C 75 100, 140 100, 160 55" />
                      </circle>

                      {/* Animated packet on main branch (delayed) */}
                      <circle r="2.5" fill={githubSyncOk ? "#34d399" : "#64748b"} opacity="0.85">
                        <animateMotion dur="1.8s" repeatCount="indefinite" begin="0.6s" path="M 15 55 L 205 55" />
                      </circle>

                      {/* Commit nodes on main branch */}
                      <circle cx="30" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="55" cy="55" r="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
                      <circle cx="100" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="140" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      {/* Merge node */}
                      <circle cx="160" cy="55" r="5"
                        fill="#0f172a"
                        stroke={githubSyncOk ? "#34d399" : "#22d3ee"}
                        strokeWidth="2"
                        style={{ transition: "stroke 0.6s" }}
                      />
                      <circle cx="190" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />

                      {/* Commit labels */}
                      <text x="30" y="45" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">a1b2</text>
                      <text x="55" y="45" textAnchor="middle" fill="#22d3ee" fontSize="6" fontFamily="monospace">c3f8</text>
                      <text x="160" y="45" textAnchor="middle" fill={githubSyncOk ? "#34d399" : "#22d3ee"} fontSize="6" fontFamily="monospace">MERGE</text>

                      {/* Branch label */}
                      <text x="108" y="113" textAnchor="middle" fill="#22d3ee" fontSize="6.5" fontFamily="monospace" opacity="0.8">feat/oauth-fix</text>

                      {/* PR badge */}
                      <rect x="72" y="118" width="76" height="14" rx="3" fill="#0f172a" stroke={githubSyncOk ? "#34d399" : "#1e3a3a"} strokeWidth="0.8" />
                      <circle cx="82" cy="125" r="2.5" fill={githubSyncOk ? "#34d399" : "#22d3ee"} opacity="0.9" />
                      <text x="88" y="128" fill={githubSyncOk ? "#34d399" : "#94a3b8"} fontSize="6" fontFamily="monospace">PR #182  open</text>
                    </svg>
                    <p className="text-[9px] text-slate-500 font-sans text-center mt-2 z-10 max-w-[180px] leading-relaxed">
                      {githubSyncOk ? "github.pull_requests indexed & live." : "Establish repo pipeline to stream commits."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Connect Discord */}
            {onboardingStep === 2 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-5 text-sky-300" />
                          <CardTitle className="text-base text-white font-heading">2. Configure Discord Live Source</CardTitle>
                        </div>
                        {discordSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Connected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        Import user complaint tickets and support channels to measure community sentiment.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">DISCORD BOT TOKEN</label>
                          <Input type="password" placeholder="MTA..." value={discordToken} onChange={(e) => setDiscordToken(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">Configure a Discord Bot token with message reading scopes.</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">DISCORD CHANNEL ID</label>
                          <Input placeholder="e.g., 104239840239480" value={discordChannel} onChange={(e) => setDiscordChannel(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-white/[0.04] bg-transparent">
                      <Button variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900 text-slate-300" onClick={() => runTestConnection("discord")} disabled={testingConnection}>
                        {testingConnection ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                        Test connection
                      </Button>
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Notion
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Discord NLP Frequency Wave SVG */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {discordSyncOk ? "✦ SENTIMENT LIVE" : "NLP SIGNAL ANALYSIS"}
                    </span>
                    <svg viewBox="0 0 220 120" className="w-full max-w-[240px] z-10" xmlns="http://www.w3.org/2000/svg">
                      {/* Baseline */}
                      <line x1="10" y1="60" x2="210" y2="60" stroke="#1e293b" strokeWidth="0.8" />

                      {/* Undulating sentiment wave — path animates via transform */}
                      <path
                        d="M10,60 C25,35 40,85 55,60 C70,35 85,85 100,60 C115,35 130,85 145,60 C160,35 175,85 190,60 C200,50 205,55 210,60"
                        stroke={discordSyncOk ? "#34d399" : "#22d3ee"}
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.85"
                        style={{ transition: "stroke 0.6s" }}
                      >
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="-55 0"
                          to="55 0"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </path>

                      {/* Dimmer echo wave */}
                      <path
                        d="M10,60 C25,42 40,78 55,60 C70,42 85,78 100,60 C115,42 130,78 145,60 C160,42 175,78 190,60 C200,53 205,57 210,60"
                        stroke="#0e7490"
                        strokeWidth="0.8"
                        fill="none"
                        opacity="0.4"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="0 0"
                          to="110 0"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </path>

                      {/* Message dots with sonar rings */}
                      <circle cx="55" cy="60" r="3" fill={discordSyncOk ? "#34d399" : "#22d3ee"} opacity="0.9" />
                      <circle cx="55" cy="60" r="3" fill="none" stroke={discordSyncOk ? "#34d399" : "#22d3ee"} strokeWidth="1" opacity="0">
                        <animate attributeName="r" from="3" to="12" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
                      </circle>

                      <circle cx="130" cy="60" r="3" fill="#7dd3fc" opacity="0.85" />
                      <circle cx="130" cy="60" r="3" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0">
                        <animate attributeName="r" from="3" to="12" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                      </circle>

                      {/* NLP label chips */}
                      <rect x="34" y="82" width="44" height="11" rx="2.5" fill="#0c1220" stroke="#22d3ee" strokeWidth="0.6" opacity="0.9" />
                      <text x="56" y="90" textAnchor="middle" fill="#22d3ee" fontSize="5.5" fontFamily="monospace">frustration</text>

                      <rect x="107" y="82" width="50" height="11" rx="2.5" fill="#0c1220" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.9" />
                      <text x="132" y="90" textAnchor="middle" fill="#7dd3fc" fontSize="5.5" fontFamily="monospace">#general-help</text>

                      {/* Channel badge top */}
                      <rect x="68" y="10" width="84" height="14" rx="3" fill="#0f172a" stroke={discordSyncOk ? "#34d399" : "#1e3a5f"} strokeWidth="0.7" />
                      <circle cx="78" cy="17" r="2.5" fill={discordSyncOk ? "#34d399" : "#22d3ee"} opacity="0.9" />
                      <text x="84" y="20" fill={discordSyncOk ? "#34d399" : "#94a3b8"} fontSize="6" fontFamily="monospace">discord.messages</text>
                    </svg>
                    <p className="text-[9px] text-slate-500 font-sans text-center mt-2 z-10 max-w-[180px] leading-relaxed">
                      {discordSyncOk ? "discord.messages indexed & streaming." : "Configure credentials to stream community signals."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3: Connect Notion */}
            {onboardingStep === 3 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="size-5 text-slate-300" />
                          <CardTitle className="text-base text-white font-heading">3. Connect Notion Wiki Database</CardTitle>
                        </div>
                        {notionSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Enabled
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        Link release design documents, product specs, and development FAQs.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">NOTION INTEGRATION TOKEN (OPTIONAL)</label>
                          <Input type="password" placeholder="secret_..." value={notionToken} onChange={(e) => setNotionToken(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                        <p className="text-[10px] text-slate-500 font-sans italic leading-relaxed">Note: Leaving token blank will run the integration database in high-fidelity sandbox mode.</p>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-white/[0.04] bg-transparent">
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Slack Alerts
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Notion Document Scanner SVG */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {notionSyncOk ? "✦ DOCS INDEXED" : "DOCUMENT SCANNER"}
                    </span>
                    <svg viewBox="0 0 160 140" className="w-full max-w-[200px] z-10" xmlns="http://www.w3.org/2000/svg">
                      {/* Document border */}
                      <rect x="18" y="8" width="124" height="124" rx="5" fill="#0b1120" stroke={notionSyncOk ? "#34d399" : "#334155"} strokeWidth="1" style={{ transition: "stroke 0.6s" }} />

                      {/* Doc header bar */}
                      <rect x="18" y="8" width="124" height="18" rx="5" fill={notionSyncOk ? "#052e16" : "#111827"} style={{ transition: "fill 0.6s" }} />
                      <circle cx="30" cy="17" r="3" fill={notionSyncOk ? "#34d399" : "#475569"} style={{ transition: "fill 0.6s" }} />
                      <rect x="38" y="13" width="55" height="5" rx="2" fill="#1e293b" />

                      {/* Content skeleton rows */}
                      <rect x="26" y="34" width="108" height="5" rx="2" fill="#1e293b" opacity="0.9" />
                      <rect x="26" y="44" width="88" height="5" rx="2" fill="#1e293b" opacity="0.7" />
                      <rect x="26" y="54" width="96" height="5" rx="2" fill="#1e293b" opacity="0.8" />

                      {/* Section divider */}
                      <line x1="26" y1="65" x2="134" y2="65" stroke="#1e293b" strokeWidth="0.8" />

                      <rect x="26" y="72" width="70" height="5" rx="2" fill="#1e293b" opacity="0.9" />
                      <rect x="26" y="82" width="100" height="5" rx="2" fill="#1e293b" opacity="0.7" />
                      <rect x="26" y="92" width="82" height="5" rx="2" fill="#1e293b" opacity="0.8" />
                      <rect x="26" y="102" width="60" height="5" rx="2" fill="#1e293b" opacity="0.6" />

                      {/* Vertical laser scan line */}
                      <line x1="18" y1="26" x2="142" y2="26" stroke={notionSyncOk ? "#34d399" : "#2dd4bf"} strokeWidth="1.2" opacity="0.85" style={{ transition: "stroke 0.6s" }}>
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="0 0"
                          to="0 104"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      </line>
                      {/* Laser glow */}
                      <rect x="18" y="24" width="124" height="4" fill={notionSyncOk ? "#34d399" : "#2dd4bf"} opacity="0.08" style={{ transition: "fill 0.6s" }}>
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="0 0"
                          to="0 104"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      </rect>

                      {/* Page type badge */}
                      <rect x="90" y="11" width="46" height="11" rx="2.5" fill="#0f172a" stroke={notionSyncOk ? "#34d399" : "#1e3a3a"} strokeWidth="0.6" />
                      <text x="113" y="19" textAnchor="middle" fill={notionSyncOk ? "#34d399" : "#64748b"} fontSize="5.5" fontFamily="monospace">notion.pages</text>
                    </svg>
                    <p className="text-[9px] text-slate-500 font-sans text-center mt-2 z-10 max-w-[180px] leading-relaxed">
                      {notionSyncOk ? "notion.pages indexed & synced to Coral." : "Attach token to begin document scanning."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 4: Connect Slack */}
            {onboardingStep === 4 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="size-5 text-teal-300" />
                          <CardTitle className="text-base text-white font-heading">4. Configure Slack Notifications</CardTitle>
                        </div>
                        {slackSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Enabled
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        Send incident alerts and release watch updates to internal teams automatically.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">SLACK WEBHOOK URL (OPTIONAL)</label>
                          <Input placeholder="https://hooks.slack.com/services/..." value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">Used to post critical alerts to your internal channels.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-white/[0.04] bg-transparent">
                      <Button className="bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 text-xs shadow-md shadow-teal-950/20 font-medium" onClick={handleOnboardingNext}>
                        Finish & Sync Workspace
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Slack Webhook Dispatcher SVG */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {slackSyncOk ? "✦ WEBHOOK LIVE" : "ALERT DISPATCHER"}
                    </span>
                    <svg viewBox="0 0 220 120" className="w-full max-w-[240px] z-10" xmlns="http://www.w3.org/2000/svg">
                      {/* Source: First Mate box */}
                      <rect x="5" y="44" width="44" height="32" rx="4" fill="#0b1120" stroke="#2dd4bf" strokeWidth="1" />
                      <text x="27" y="57" textAnchor="middle" fill="#2dd4bf" fontSize="5.5" fontFamily="monospace">CORAL</text>
                      <text x="27" y="67" textAnchor="middle" fill="#2dd4bf" fontSize="5" fontFamily="monospace">ENGINE</text>

                      {/* Router box center */}
                      <rect x="82" y="38" width="56" height="44" rx="5" fill="#0f172a" stroke={slackSyncOk ? "#34d399" : "#334155"} strokeWidth="1.2" style={{ transition: "stroke 0.6s" }} />
                      <text x="110" y="56" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#475569"} fontSize="5.5" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>WEBHOOK</text>
                      <text x="110" y="67" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#475569"} fontSize="5" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>ROUTER</text>

                      {/* Destination: Slack badge */}
                      <rect x="170" y="44" width="44" height="32" rx="4" fill="#0b1120" stroke={slackSyncOk ? "#34d399" : "#1e3a3a"} strokeWidth="1" style={{ transition: "stroke 0.6s" }} />
                      <text x="192" y="57" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#64748b"} fontSize="5.5" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>SLACK</text>
                      <text x="192" y="67" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#64748b"} fontSize="5" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>API</text>

                      {/* Pipeline tracks */}
                      <line x1="49" y1="60" x2="82" y2="60" stroke="#334155" strokeWidth="1" />
                      <line x1="138" y1="60" x2="170" y2="60" stroke="#334155" strokeWidth="1" />

                      {/* Animated packet: Coral → Router */}
                      <circle r="3" fill="#2dd4bf" opacity="0.9">
                        <animateMotion dur="1.4s" repeatCount="indefinite" path="M 49 60 L 82 60" />
                      </circle>
                      {/* Animated packet: Router → Slack (delayed) */}
                      <circle r="3" fill={slackSyncOk ? "#34d399" : "#2dd4bf"} opacity="0.9">
                        <animateMotion dur="1.2s" begin="0.7s" repeatCount="indefinite" path="M 138 60 L 170 60" />
                      </circle>

                      {/* Alert chips above track */}
                      <rect x="52" y="30" width="56" height="12" rx="2.5" fill="#0f172a" stroke="#f87171" strokeWidth="0.6" />
                      <text x="80" y="39" textAnchor="middle" fill="#f87171" fontSize="5.5" fontFamily="monospace">⚠ CI FAILURE</text>

                      {/* Success checkmark badge */}
                      <circle cx="192" cy="88" r="8" fill={slackSyncOk ? "#052e16" : "#0f172a"} stroke={slackSyncOk ? "#34d399" : "#1e3a3a"} strokeWidth="1" style={{ transition: "all 0.6s" }} />
                      <text x="192" y="92" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#334155"} fontSize="8" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>✓</text>

                      {/* Delivery status label */}
                      <text x="110" y="100" textAnchor="middle" fill={slackSyncOk ? "#34d399" : "#475569"} fontSize="5.5" fontFamily="monospace" style={{ transition: "fill 0.6s" }}>
                        {slackSyncOk ? "delivered · 0ms latency" : "awaiting webhook url"}
                      </text>
                    </svg>
                    <p className="text-[9px] text-slate-500 font-sans text-center mt-2 z-10 max-w-[180px] leading-relaxed">
                      {slackSyncOk ? "Alert dispatch active. Routing to workspace." : "Paste a webhook URL to activate dispatch pipeline."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 5: Sync Workspace Animation */}
            {onboardingStep === 5 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 md:p-8 text-center space-y-6 shadow-xl shadow-slate-950/40 w-full max-w-2xl mx-auto">
                {/* 4-Port Converging Core Reactor SVG */}
                <div className="relative w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/[0.02] bg-slate-950/20 select-none pointer-events-none py-2">
                  <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                  <svg viewBox="0 0 280 160" className="w-full max-w-[340px] z-10" xmlns="http://www.w3.org/2000/svg">
                    {/* Center core */}
                    <circle cx="140" cy="80" r="18" fill="#0b1120" stroke="#2dd4bf" strokeWidth="1.5"
                      opacity={syncProgress > 20 ? "1" : "0.3"}
                      style={{ transition: "opacity 0.5s" }}
                    />
                    <circle cx="140" cy="80" r="18" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.2">
                      <animate attributeName="r" from="18" to="28" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="140" y="84" textAnchor="middle" fill="#2dd4bf" fontSize="7" fontFamily="monospace" fontWeight="bold">CORAL</text>

                    {/* Conduit lines: each lights up at 25% increments */}
                    {/* Left: GitHub → core */}
                    <line x1="24" y1="80" x2="122" y2="80"
                      stroke={syncProgress >= 25 ? "#3b82f6" : "#1e293b"}
                      strokeWidth="1.5" strokeDasharray={syncProgress >= 25 ? "none" : "4,4"}
                      style={{ transition: "stroke 0.5s" }}
                    />
                    {syncProgress >= 25 && (
                      <circle r="3" fill="#3b82f6" opacity="0.9">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path="M 24 80 L 122 80" />
                      </circle>
                    )}

                    {/* Top: Discord → core */}
                    <line x1="140" y1="14" x2="140" y2="62"
                      stroke={syncProgress >= 50 ? "#38bdf8" : "#1e293b"}
                      strokeWidth="1.5" strokeDasharray={syncProgress >= 50 ? "none" : "4,4"}
                      style={{ transition: "stroke 0.5s" }}
                    />
                    {syncProgress >= 50 && (
                      <circle r="3" fill="#38bdf8" opacity="0.9">
                        <animateMotion dur="1.0s" repeatCount="indefinite" path="M 140 14 L 140 62" />
                      </circle>
                    )}

                    {/* Right: Notion → core */}
                    <line x1="158" y1="80" x2="256" y2="80"
                      stroke={syncProgress >= 75 ? "#94a3b8" : "#1e293b"}
                      strokeWidth="1.5" strokeDasharray={syncProgress >= 75 ? "none" : "4,4"}
                      style={{ transition: "stroke 0.5s" }}
                    />
                    {syncProgress >= 75 && (
                      <circle r="3" fill="#94a3b8" opacity="0.9">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path="M 256 80 L 158 80" />
                      </circle>
                    )}

                    {/* Bottom: Slack → core */}
                    <line x1="140" y1="98" x2="140" y2="146"
                      stroke={syncProgress >= 90 ? "#2dd4bf" : "#1e293b"}
                      strokeWidth="1.5" strokeDasharray={syncProgress >= 90 ? "none" : "4,4"}
                      style={{ transition: "stroke 0.5s" }}
                    />
                    {syncProgress >= 90 && (
                      <circle r="3" fill="#2dd4bf" opacity="0.9">
                        <animateMotion dur="1.0s" repeatCount="indefinite" path="M 140 146 L 140 98" />
                      </circle>
                    )}

                    {/* Source nodes */}
                    {/* GitHub — Left */}
                    <rect x="4" y="66" width="20" height="28" rx="4" fill="#0b1120" stroke={syncProgress >= 25 ? "#3b82f6" : "#1e293b"} strokeWidth="1" style={{ transition: "stroke 0.5s" }} />
                    <text x="14" y="77" textAnchor="middle" fill={syncProgress >= 25 ? "#3b82f6" : "#334155"} fontSize="4.5" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>GH</text>
                    <text x="14" y="86" textAnchor="middle" fill={syncProgress >= 25 ? "#3b82f6" : "#334155"} fontSize="4" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>repos</text>

                    {/* Discord — Top */}
                    <rect x="126" y="2" width="28" height="20" rx="4" fill="#0b1120" stroke={syncProgress >= 50 ? "#38bdf8" : "#1e293b"} strokeWidth="1" style={{ transition: "stroke 0.5s" }} />
                    <text x="140" y="11" textAnchor="middle" fill={syncProgress >= 50 ? "#38bdf8" : "#334155"} fontSize="4.5" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>DISC</text>
                    <text x="140" y="19" textAnchor="middle" fill={syncProgress >= 50 ? "#38bdf8" : "#334155"} fontSize="4" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>msgs</text>

                    {/* Notion — Right */}
                    <rect x="256" y="66" width="20" height="28" rx="4" fill="#0b1120" stroke={syncProgress >= 75 ? "#94a3b8" : "#1e293b"} strokeWidth="1" style={{ transition: "stroke 0.5s" }} />
                    <text x="266" y="77" textAnchor="middle" fill={syncProgress >= 75 ? "#94a3b8" : "#334155"} fontSize="4.5" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>NTN</text>
                    <text x="266" y="86" textAnchor="middle" fill={syncProgress >= 75 ? "#94a3b8" : "#334155"} fontSize="4" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>docs</text>

                    {/* Slack — Bottom */}
                    <rect x="126" y="138" width="28" height="20" rx="4" fill="#0b1120" stroke={syncProgress >= 90 ? "#2dd4bf" : "#1e293b"} strokeWidth="1" style={{ transition: "stroke 0.5s" }} />
                    <text x="140" y="148" textAnchor="middle" fill={syncProgress >= 90 ? "#2dd4bf" : "#334155"} fontSize="4.5" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>SLCK</text>
                    <text x="140" y="155" textAnchor="middle" fill={syncProgress >= 90 ? "#2dd4bf" : "#334155"} fontSize="4" fontFamily="monospace" style={{ transition: "fill 0.5s" }}>hooks</text>

                    {/* Sync % arc label */}
                    <text x="140" y="80" dy="4" textAnchor="middle" fill={syncProgress === 100 ? "#34d399" : "#2dd4bf"} fontSize="5.5" fontFamily="monospace" fontWeight="bold" style={{ transition: "fill 0.5s" }}>
                      {syncProgress}%
                    </text>
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white font-heading">Syncing Workspace Schemas...</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-sans">
                    Coral SQL is loading tables, indexing Linear keys, and joining community feedback with git commits.
                  </p>
                </div>

                {/* Scrolling Console Logs box */}
                <div className="rounded-lg border border-white/[0.05] bg-black/40 p-4 font-mono text-[10px] text-left text-teal-400 space-y-1.5 h-36 overflow-y-auto shadow-inner">
                  {syncLogs.map((log, idx) => (
                    <div key={idx} className={cn("truncate", log.startsWith("[SUCCESS]") ? "text-emerald-400 font-semibold" : "text-slate-400")}>
                      <span className="text-teal-500 mr-1.5">&gt;</span>
                      {log}
                    </div>
                  ))}
                  {syncProgress < 100 && (
                    <div className="flex items-center gap-1 text-teal-500 animate-pulse">
                      <span className="mr-1.5">&gt;</span>
                      <span className="size-1 bg-teal-400 rounded-full animate-ping" />
                      <span>Synchronizing...</span>
                    </div>
                  )}
                </div>

                <div className="max-w-xs mx-auto space-y-1.5 pt-2">
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 transition-all duration-200" style={{ width: `${syncProgress}%` }} />
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-slate-500">
                    <span>INDEXING DATABASES</span>
                    <span>{syncProgress}%</span>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </div>
      )}

      {/* STAGE 4: MAIN DASHBOARD */}
      {stage === "dashboard" && (
        <div className="min-h-screen flex bg-[#0B1020] text-slate-200 relative hm-fade-stage overflow-hidden">
          {/* Constellation background layer */}
          <div className="absolute inset-0 hm-grid-pattern opacity-10 pointer-events-none" />

          {/* Left Sidebar */}
          <aside className="w-64 border-r border-white/[0.04] bg-[#0E1326]/80 backdrop-blur-md flex flex-col justify-between z-20 shrink-0">
            <div className="flex-1 flex flex-col min-h-0">

              {/* Sidebar Header */}
              <div className="px-4 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <Anchor className="size-4.5" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight font-heading text-white">HarborMaster</span>
                </div>
                <Badge variant="outline" className="border-slate-800 bg-slate-950 text-[9px] text-slate-500 font-mono">
                  v1.4
                </Badge>
              </div>

              {/* Navigation Menu */}
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {[
                  { id: "brief", label: "Captain's Brief", icon: Bot },
                  { id: "incidents", label: "Active Incidents", icon: Activity, count: brief.actions.length },
                  { id: "release", label: "Release Watch", icon: ShieldAlert },
                  { id: "community", label: "Community Signals", icon: MessageSquare },
                  { id: "console", label: "SQL Console", icon: TerminalSquare },
                  { id: "sources", label: "Synced Sources", icon: Cable, count: activeSourceCount },
                  { id: "settings", label: "Integrations & Setup", icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = sidebarView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSidebarView(item.id as any)}
                      className={cn(
                        "w-full flex items-center justify-between py-2 px-3 text-xs rounded-lg transition-colors font-sans",
                        active
                          ? "bg-white/[0.04] border border-white/[0.06] text-white font-medium shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("size-4", active ? "text-teal-400" : "text-slate-500")} />
                        <span>{item.label}</span>
                      </div>
                      {item.count ? (
                        <span className={cn(
                          "font-mono text-[9px] px-1.5 py-0.5 rounded-full border",
                          item.id === "incidents" ? "border-amber-500/20 bg-amber-500/5 text-amber-400" : "border-slate-800 bg-slate-950 text-slate-500"
                        )}>
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>

              {/* Active Connections Pulse List */}
              <div className="px-4 py-3.5 border-t border-white/[0.04] space-y-2.5 bg-black/10">
                <span className="text-[9.5px] font-mono font-bold text-slate-500 tracking-widest block uppercase">Active Pipelines</span>
                <div className="space-y-2">
                  {[
                    { name: "GitHub", connected: !!githubToken || brief.mode === "coral-live" || brief.mode === "demo-preview" },
                    { name: "Discord", connected: !!discordToken || brief.mode === "coral-live" || brief.mode === "demo-preview" },
                    { name: "Linear", connected: brief.mode === "coral-live" || brief.mode === "demo-preview" || !!geminiKey },
                    { name: "Slack", connected: !!slackWebhook || brief.mode === "coral-live" || brief.mode === "demo-preview" },
                  ].map((src) => (
                    <div key={src.name} className="flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className={cn("size-1.5 rounded-full shrink-0", src.connected ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-700")} />
                        <span>{src.name}</span>
                      </div>
                      <span className="text-[8px] font-mono font-semibold text-slate-500">
                        {src.connected ? "SYNCED" : "OFFLINE"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar Profile / Reset Actions */}
            <div className="p-4 border-t border-white/[0.04] bg-[#0c0e17]/80 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative size-8 rounded-full bg-[#181c2d] flex items-center justify-center border border-white/[0.08] shrink-0 overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-transparent" />
                  <span className="text-[10px] font-bold text-teal-400 font-heading">AM</span>
                  <div className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full border border-[#06080f]" title="Coral DB Connected" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">Alex Maintainer</p>
                  <div className="flex items-center gap-1">
                    <span className="size-1 rounded-full bg-emerald-500/85" />
                    <span className="text-[9px] text-slate-400 font-mono">Ecosystem Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleResetState}
                title="Reset App State"
                className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04] shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </aside>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

            {/* Top Navigation */}
            <header className="h-14 border-b border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white capitalize font-heading">
                  {sidebarView === "brief" ? "Captain's Brief" : sidebarView === "incidents" ? "Active Incidents" : sidebarView === "release" ? "Release Watch" : sidebarView === "community" ? "Community Signals" : sidebarView === "console" ? "SQL Console" : sidebarView === "sources" ? "Synced Sources" : "Integrations & Setup"}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">/</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-mono",
                    brief.mode === "coral-live" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                  )}
                >
                  {brief.mode === "coral-live" ? "Live" : "Demo Preview"}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-48 xl:w-64 hidden sm:block">
                  <Search className="absolute left-2.5 top-2 size-3 text-slate-500" />
                  <Input placeholder="Global search..." className="h-7 pl-8 bg-slate-950/40 border-slate-900 text-[11px] placeholder:text-slate-600" />
                </div>
                <div className="relative">
                  <Bell className="size-4 text-slate-400 hover:text-slate-200 cursor-pointer" />
                  <span className="absolute top-0 right-0 size-1.5 bg-amber-500 rounded-full animate-pulse" />
                </div>
              </div>
            </header>

            {/* Action Modal (Draft Overlay) */}
            {selectedAction && actionType && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <Card className="w-full max-w-lg border-white/[0.08] bg-[#0E1326] shadow-xl overflow-hidden">
                  <CardHeader className="border-b border-white/[0.04] relative">
                    <button
                      onClick={() => { setSelectedAction(null); setActionType(null); }}
                      className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <X className="size-4.5" />
                    </button>
                    <CardTitle className="flex items-center gap-2 text-sm text-white">
                      <Bot className="size-4 text-teal-400" />
                      Draft First Mate Action
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Verify response before sending comment to {actionType === "discord" ? "Discord channel" : actionType === "slack" ? "Slack workspace" : actionType === "github" ? "GitHub pull request" : "Linear board"}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono">ACTION TARGET</span>
                      <div className="rounded-lg border border-white/[0.04] bg-slate-950/40 p-2.5">
                        <p className="text-xs font-semibold text-white">{selectedAction.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{selectedAction.summary}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">RESPONSE PREVIEW (AI PROPOSED)</span>
                        {drafting && <span className="text-[10px] text-teal-400 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> drafting...</span>}
                      </div>
                      <Textarea
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        placeholder="Drafting message text..."
                        disabled={drafting}
                        className="min-h-28 bg-slate-950 border-slate-900 text-xs text-slate-200 placeholder:text-slate-600 focus-visible:ring-teal-500/30 resize-none font-sans"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-white/[0.04] bg-slate-950/20 flex justify-end gap-2.5 pt-3 pb-3">
                    <Button
                      variant="outline"
                      onClick={() => { setSelectedAction(null); setActionType(null); }}
                      className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={executingAction || drafting}
                      onClick={handleExecuteAction}
                      className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium"
                    >
                      {executingAction && <Loader2 className="size-3 animate-spin mr-1.5" />}
                      Dispatch to {actionType}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Sidebar View Switchboard */}
            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-[1000px] mx-auto space-y-6">

                {/* VIEW 1: CAPTAIN'S BRIEF */}
                {sidebarView === "brief" && (
                  <div className="space-y-6">

                    {/* Primary Hero Section */}
                    <div className="rounded-xl border border-white/[0.06] bg-[#181c2d]/40 backdrop-blur-md p-7 md:p-8 space-y-5 shadow-lg shadow-black/25">
                      <div className="space-y-1.5">
                        <span className="text-[9.5px] font-mono text-teal-400 tracking-widest uppercase font-semibold">Ecosystem Summary</span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight font-heading">
                          Good morning, Alex.
                        </h2>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                          There are <span className="text-teal-400 font-semibold">3 priority issues</span> demanding your attention across connected repositories and community channels.
                        </p>
                      </div>

                      {/* Top Action item highlight */}
                      {topAction ? (
                        <div className="border-t border-white/[0.05] pt-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                                Critical Task
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">1.4 release blocker</span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-100 leading-snug">{topAction.title}</h3>
                            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{topAction.summary}</p>
                          </div>
                          <Button size="sm" className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:text-teal-200 text-xs font-semibold shrink-0 self-start md:self-auto px-4 py-2 h-9 rounded-lg transition-all" onClick={() => setSidebarView("incidents")}>
                            Review Incident Group
                            <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {/* Chat assistant container */}
                    <Card className="border-white/[0.04] bg-slate-900/10 backdrop-blur-md flex flex-col overflow-hidden">
                      <CardHeader className="border-b border-white/[0.04] py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="size-4 text-teal-400" />
                          <CardTitle className="text-xs font-semibold text-white">First Mate Consultation</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 min-h-[220px]">
                        {messages.map((message, i) => (
                          <div key={i} className={cn("p-3 rounded-lg border text-xs leading-relaxed max-w-3xl", message.role === "assistant" ? "bg-slate-900/20 border-white/[0.03]" : "ml-auto bg-teal-500/5 border-teal-500/20 text-teal-200")}>
                            <p className="font-mono text-[9px] text-slate-500 mb-1.5 uppercase">{message.role === "assistant" ? "HarborMaster AI" : "Alex (Maintainer)"}</p>
                            <p>{message.content}</p>

                            {message.evidence?.length ? (
                              <div className="mt-3 grid gap-2 md:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                {message.evidence.map((ev, evIdx) => renderEvidencePreview(ev, evIdx))}
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {asking && (
                          <div className="p-3 rounded-lg border border-teal-500/10 bg-teal-500/5 text-xs text-teal-300 animate-pulse flex items-center gap-2 w-max">
                            <Loader2 className="size-3.5 animate-spin" />
                            Synthesizing Coral SQL query...
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t border-white/[0.04] bg-slate-950/20 p-3 flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 mb-1.5">
                          {starterQuestions.map((q) => (
                            <button
                              key={q}
                              onClick={() => askHarborMaster(q)}
                              type="button"
                              className="text-[10.5px] bg-[#181c2d]/60 hover:bg-[#181c2d] text-slate-300 hover:text-white border border-white/[0.05] rounded-full py-1.5 px-3.5 transition-all shadow-sm cursor-pointer"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                        <form onSubmit={onSubmitChat} className="flex items-center gap-2 w-full mt-1.5 font-sans">
                          <Input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question about the active repository or release blockers..."
                            className="bg-slate-950/60 border-white/[0.05] focus-visible:ring-teal-500/30 text-xs flex-1 placeholder:text-slate-600 h-10 rounded-lg px-3.5"
                          />
                          <Button type="submit" disabled={asking} className="bg-teal-500 hover:bg-teal-600 text-[#06080f] font-semibold text-xs h-10 px-4 rounded-lg flex items-center gap-1.5 shrink-0 transition-all shadow-lg shadow-teal-500/10">
                            {asking ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                            <span>Send</span>
                          </Button>
                        </form>
                      </CardFooter>
                    </Card>

                  </div>
                )}

                {/* VIEW 2: ACTIVE INCIDENTS LIST */}
                {sidebarView === "incidents" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-base font-semibold text-white">Ecosystem Incidents</h2>
                        <p className="text-xs text-slate-400">Coral federated priority actions needing immediate attention.</p>
                      </div>
                      <Badge variant="outline" className="border-slate-800 bg-slate-950 text-xs">
                        {brief.actions.length} Total items
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {brief.actions.map((action) => {
                        const isExpanded = !!expandedEvidence[action.id];
                        return (
                          <Card key={action.id} className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-4 transition-all hover:border-white/[0.08]">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] font-mono",
                                    action.priority === "Critical" ? "border-red-500/20 bg-red-500/5 text-red-400" :
                                      action.priority === "High" ? "border-amber-500/20 bg-amber-500/5 text-amber-400" :
                                        "border-blue-500/20 bg-blue-500/5 text-blue-400"
                                  )}>
                                    {action.priority} Priority
                                  </Badge>
                                  <Badge variant="outline" className="border-slate-800 bg-slate-950/60 text-[9px] text-slate-400">
                                    Score: {action.score}
                                  </Badge>
                                </div>
                                <h3 className="text-sm font-semibold text-white leading-snug">{action.title}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{action.summary}</p>
                              </div>

                              <div className="flex gap-2">
                                {action.links.map((link) => (
                                  <Button key={link.label} variant="outline" size="sm" className="border-slate-800 bg-slate-950 text-[10px] h-7 hover:bg-slate-900" render={<a href={link.href} target="_blank" rel="noreferrer" />}>
                                    {link.label}
                                    <ExternalLink className="size-3 ml-1" />
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Dispatch actions row */}
                            <div className="mt-3 flex items-center justify-between border-t border-white/[0.03] pt-3">
                              <button
                                onClick={() => toggleEvidence(action.id)}
                                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 font-mono transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                VIEW CORAL EVIDENCE ({action.evidence.length})
                              </button>

                              <div className="flex gap-2">
                                {action.category === "Fix" && (
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-teal-400 font-medium" onClick={() => handleOpenAction(action, "slack")}>
                                    Draft Slack Alert
                                  </Button>
                                )}
                                {action.category === "Review" && (
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-blue-400 font-medium" onClick={() => handleOpenAction(action, "github")}>
                                    Draft Git Review
                                  </Button>
                                )}
                                {action.category === "Reply" && (
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-sky-400 font-medium" onClick={() => handleOpenAction(action, "discord")}>
                                    Reply to Discord
                                  </Button>
                                )}
                                {action.category === "Ship" && (
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-violet-400 font-medium" onClick={() => handleOpenAction(action, "linear")}>
                                    Update Linear
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Collapsible evidence detail */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-white/[0.03] grid gap-2.5 md:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                {action.evidence.map((ev, evIdx) => renderEvidencePreview(ev, evIdx))}
                              </div>
                            )}

                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIEW 3: RELEASE WATCH TIMELINE */}
                {sidebarView === "release" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white font-heading">Release Watch Timeline</h2>
                      <p className="text-xs text-slate-400">Blocked branches, failing CI builds, and deployment risks tagged against v1.4.</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-6 relative">
                      {/* Central vertical line */}
                      <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-slate-800" />

                      <div className="space-y-8 relative">
                        {[
                          { title: "Authentication Flow Blocker", status: "BLOCKED", source: "Linear", desc: "Issue LIN-421: OAuth retry count exhaustion fails to catch silent timeouts.", time: "2 hours ago", type: "error" },
                          { title: "PR #184 CI Compilation", status: "FAILING", source: "GitHub", desc: "Build action check failed on verify-deployment check in nextjs-turbopack bundle.", time: "4 hours ago", type: "error" },
                          { title: "Documentation updates verification", status: "PENDING", source: "Notion", desc: "Wiki sync lists 4 release FAQ paragraphs needing updates before publish.", time: "Yesterday", type: "warning" },
                          { title: "QA Testing Verification", status: "SUCCESS", source: "Slack", desc: "Internal engineers signed off on manual staging regression checks.", time: "2 days ago", type: "success" }
                        ].map((node, i) => (
                          <div key={i} className="flex gap-6 items-start">
                            {/* Circle bullet node */}
                            <div className={cn(
                              "size-6 rounded-full border flex items-center justify-center shrink-0 z-10",
                              node.type === "error" ? "border-red-500 bg-[#0B1020] text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                                node.type === "warning" ? "border-amber-500 bg-[#0B1020] text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]" :
                                  "border-emerald-500 bg-[#0B1020] text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                            )}>
                              {node.type === "success" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                            </div>

                            <div className="space-y-1 flex-1">
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-xs">{node.title}</span>
                                  <Badge variant="outline" className={cn(
                                    "text-[8px] font-mono font-bold",
                                    node.type === "error" ? "border-red-500/20 bg-red-500/5 text-red-400" :
                                      node.type === "warning" ? "border-amber-500/20 bg-amber-500/5 text-amber-400" :
                                        "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                                  )}>
                                    {node.status}
                                  </Badge>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">{node.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">{node.desc}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-slate-505 font-mono font-sans">Source:</span>
                                <Badge variant="outline" className={cn("text-[8px] font-mono py-0 px-1.5 h-4.5", sourceTone[node.source] || "border-slate-800 text-slate-500")}>
                                  {node.source}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 4: COMMUNITY SIGNALS */}
                {sidebarView === "community" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">Community Signals</h2>
                      <p className="text-xs text-slate-400">Repeated complaints, trending support request tickets, and sentiment analysis patterns.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { title: "OAuth Timeout Issues", count: 8, source: "Discord", sentiment: "Negative", excerpt: "Users reporting 'Token expired' redirect loops immediately after auth click." },
                        { title: "PR #184 CI pipeline failures", count: 4, source: "GitHub Comments", sentiment: "Warning", excerpt: "CI failed on verify-deployment task in next-turbopack check." },
                        { title: "Linear Sync Delays", count: 2, source: "Slack Alert", sentiment: "Neutral", excerpt: "Board syncing delays reported between org workspace and client." },
                      ].map((item, i) => (
                        <Card key={i} className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-mono",
                              item.sentiment === "Negative" ? "border-red-500/20 text-red-400" :
                                item.sentiment === "Warning" ? "border-amber-500/20 text-amber-400" :
                                  "border-slate-800 text-slate-500"
                            )}>
                              {item.sentiment} Sentiment
                            </Badge>
                            <span className="text-[10px] font-mono text-slate-500">{item.count} occurrences</span>
                          </div>
                          <div>
                            <h3 className="text-xs font-semibold text-white leading-normal">{item.title}</h3>
                            <p className="text-[10px] text-slate-400 leading-relaxed mt-1 italic">"{item.excerpt}"</p>
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-2 border-t border-white/[0.03]">
                            <span>PLATFORM: {item.source.toUpperCase()}</span>
                            <span className="text-teal-400">CLUSTER ACTIVE</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIEW 5: SQL CONSOLE */}
                {sidebarView === "console" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">Developer SQL Console</h2>
                      <p className="text-xs text-slate-400">Federated command console to query synced schemas via Coral SQL.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[250px_1fr]">

                      {/* Schema Explorer */}
                      <Card className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-0 flex flex-col h-[520px] overflow-hidden">
                        <CardHeader className="border-b border-white/[0.04] py-2.5 px-3">
                          <CardTitle className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 text-teal-400">
                            <DatabaseZap className="size-3" />
                            Active Tables
                          </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-2">
                          <div className="space-y-1">
                            {schemaList.map((schema) => (
                              <div key={schema.name} className="rounded-lg overflow-hidden border border-white/[0.02]">
                                <button
                                  onClick={() => setExpandedSchema(expandedSchema === schema.name ? null : schema.name)}
                                  className={cn(
                                    "w-full flex items-center justify-between py-1.5 px-2 text-[10px] text-left transition-colors font-medium font-mono",
                                    expandedSchema === schema.name ? "bg-white/5 text-teal-300" : "hover:bg-white/[0.01] text-slate-400"
                                  )}
                                >
                                  <span className="truncate">{schema.name}</span>
                                  {expandedSchema === schema.name ? <ChevronDown className="size-3 text-slate-500" /> : <ChevronRight className="size-3 text-slate-500" />}
                                </button>
                                {expandedSchema === schema.name && (
                                  <div className="bg-slate-950/40 px-2 py-1.5 border-t border-white/[0.02] space-y-1 text-[9px] font-mono leading-normal text-slate-500">
                                    <p className="italic text-slate-600 mb-1 leading-normal">{schema.description}</p>
                                    <p className="text-teal-400 font-semibold mb-1">table: {schema.table}</p>
                                    <div className="space-y-0.5">
                                      {schema.columns.map((col) => (
                                        <div key={col.name} className="flex justify-between border-b border-white/[0.02] py-0.5">
                                          <span className="text-slate-400">{col.name}</span>
                                          <span className="text-slate-600 text-[8px]">{col.type}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </Card>

                      {/* SQL Console Workspace */}
                      <div className="space-y-4">
                        <Card className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-4">
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-3">
                            <span className="text-xs font-semibold text-white">Console Query</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">Playbooks:</span>
                              <select
                                onChange={(e) => handleSelectPlaybook(e.target.value as any)}
                                className="bg-slate-950 border border-slate-900 rounded px-2 py-0.5 text-[10px] text-slate-300 font-mono"
                              >
                                <option value="morningBrief">Morning Brief</option>
                                <option value="releaseRisk">Release Risks</option>
                                <option value="reviewQueue">Review Queue</option>
                                <option value="communityPain">Community Pain</option>
                              </select>
                            </div>
                          </div>

                          <div className="relative">
                            <Textarea
                              value={consoleSql}
                              onChange={(e) => setConsoleSql(e.target.value)}
                              className="font-mono text-xs min-h-[140px] bg-slate-950/80 border-slate-900 text-teal-300 placeholder:text-slate-700 focus-visible:ring-teal-500/20"
                            />
                            <Button
                              onClick={runConsoleQuery}
                              disabled={executingConsole}
                              className="absolute bottom-2.5 right-2.5 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 text-[10px] h-7 text-teal-300"
                            >
                              {executingConsole ? <Loader2 className="size-3 animate-spin mr-1" /> : <Play className="size-3 mr-1" />}
                              Run SQL
                            </Button>
                          </div>

                          {/* Subtle Query performance telemetry */}
                          {consoleResults && (
                            <div className="mt-3 pt-3 border-t border-white/[0.03] flex flex-wrap gap-4 text-[10px] font-mono text-slate-500 justify-between">
                              <div className="flex gap-1.5 items-center">
                                <span>STATUS:</span>
                                <span className={consoleResults.ok ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                                  {consoleResults.ok ? "SUCCESS" : "ERROR"}
                                </span>
                              </div>
                              <div className="flex gap-1.5 items-center">
                                <span>LATENCY:</span>
                                <span className="text-slate-300">{consoleResults.durationMs}ms</span>
                              </div>
                              <div className="flex gap-1.5 items-center">
                                <span>CACHE STATE:</span>
                                <span className={cn("px-1 rounded text-[8px]", consoleResults.cacheHit ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                                  {consoleResults.cacheHit ? "HIT" : "MISS"}
                                </span>
                              </div>
                            </div>
                          )}
                        </Card>

                        {/* SQL output table */}
                        <Card className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-4 min-h-[180px] overflow-hidden flex flex-col justify-center">
                          {!consoleResults ? (
                            <div className="text-center space-y-2 py-8 text-slate-600">
                              <TerminalSquare className="size-6 mx-auto opacity-30" />
                              <p className="text-[10px] font-mono">No query executed. Input SQL and click Run SQL.</p>
                            </div>
                          ) : !consoleResults.ok ? (
                            <div className="p-3 bg-red-950/20 border border-red-500/15 rounded text-red-400 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                              {consoleResults.error}
                            </div>
                          ) : consoleResults.rows.length === 0 ? (
                            <div className="text-center text-[10px] font-mono text-slate-500">0 rows returned.</div>
                          ) : (
                            <div className="rounded-lg border border-white/[0.03] overflow-x-auto max-h-[220px]">
                              <Table>
                                <TableHeader className="bg-slate-950/60 sticky top-0">
                                  <TableRow className="border-b border-white/[0.04] hover:bg-transparent">
                                    {Object.keys(consoleResults.rows[0]).map((h) => (
                                      <TableHead key={h} className="font-mono text-[10px] text-slate-400 py-1.5 h-auto">
                                        {h}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {consoleResults.rows.map((row, rowIdx) => (
                                    <TableRow key={rowIdx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                                      {Object.values(row).map((val: any, valIdx) => (
                                        <TableCell key={valIdx} className="font-mono text-[10px] text-slate-300 py-1.5 max-w-[180px] truncate h-auto">
                                          {val === null || val === undefined ? (
                                            <span className="text-slate-600 italic">null</span>
                                          ) : typeof val === "boolean" ? (
                                            <span className={val ? "text-emerald-400" : "text-red-400"}>{String(val)}</span>
                                          ) : (
                                            String(val)
                                          )}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </Card>
                      </div>

                    </div>
                  </div>
                )}

                {/* VIEW 6: SYNCED SOURCES */}
                {sidebarView === "sources" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">Synced Data Sources</h2>
                      <p className="text-xs text-slate-400">Coral federated table sources registered in the SQL workspace.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {brief.sourceStatuses.map((src) => (
                        <Card key={src.id} className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{src.label}</span>
                              <span className="text-[10px] font-mono text-slate-500">({src.schema})</span>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-mono",
                              src.status === "live" ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-400"
                            )}>
                              {src.status === "live" ? "LIVE SYNCED" : "SANDBOX PREVIEW"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed h-12 overflow-y-auto">{src.description}</p>
                          <div className="flex gap-4 text-[10px] font-mono text-slate-500 pt-2 border-t border-white/[0.03]">
                            <div>TABLES: <span className="text-slate-300">{src.tables}</span></div>
                            <div>LATENCY: <span className="text-slate-300">{src.latencyMs}ms</span></div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIEW 7: SETTINGS PANEL */}
                {sidebarView === "settings" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white font-heading">Integrations Setup</h2>
                      <p className="text-xs text-slate-400">Manage credentials, API scopes, and client application states.</p>
                    </div>

                    <Card className="border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-5">
                      <form onSubmit={handleSaveSettings} className="space-y-5">

                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-white">AI Assistant Keys</h3>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-slate-500">GOOGLE GEMINI API KEY</label>
                            <div className="flex gap-2">
                              <Input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="bg-slate-950 border-slate-900 text-xs flex-1" />
                              <Button type="button" variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900" onClick={() => runTestConnection("gemini")}>
                                Test
                              </Button>
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-white/[0.03]" />

                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-white">GitHub Integration</h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500">OWNER</label>
                              <Input value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)} placeholder="e.g. facebook" className="bg-slate-950 border-slate-900 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500">REPO NAME</label>
                              <Input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="e.g. react" className="bg-slate-950 border-slate-900 text-xs" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-slate-500">PERSONAL ACCESS TOKEN (CLASSIC)</label>
                            <div className="flex gap-2">
                              <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="bg-slate-950 border-slate-900 text-xs flex-1" />
                              <Button type="button" variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900" onClick={() => runTestConnection("github")}>
                                Test
                              </Button>
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-white/[0.03]" />

                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-white">Discord Support Channels</h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500">CHANNEL ID</label>
                              <Input value={discordChannel} onChange={(e) => setDiscordChannel(e.target.value)} placeholder="1042..." className="bg-slate-950 border-slate-900 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500">BOT ACCESS TOKEN</label>
                              <div className="flex gap-2">
                                <Input type="password" value={discordToken} onChange={(e) => setDiscordToken(e.target.value)} placeholder="MTA..." className="bg-slate-950 border-slate-900 text-xs flex-1" />
                                <Button type="button" variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900" onClick={() => runTestConnection("discord")}>
                                  Test
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-white/[0.03]" />

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={handleResetState}
                            className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1.5"
                          >
                            <Trash2 className="size-3.5" />
                            RESET ONBOARDING WIZARD
                          </button>
                          <Button type="submit" className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-medium px-6 h-8 shadow-md shadow-teal-950/15">
                            Save Configurations
                          </Button>
                        </div>

                      </form>
                    </Card>
                  </div>
                )}

              </div>
            </ScrollArea>

          </div>
        </div>
      )}

    </div>
  );
}
