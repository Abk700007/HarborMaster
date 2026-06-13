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
  Notion: "border-slate-500/20 bg-slate-500/5 text-slate-300",
  Discord: "border-sky-500/20 bg-sky-500/5 text-sky-300",
};

const categoryIcon = {
  Fix: Activity,
  Review: GitPullRequest,
  Reply: MessageSquare,
  Ship: Sparkles,
};

const schemaList = [
  {
    name: "hm_github",
    description: "GitHub PRs, authors, review comments, and CI pipeline checks.",
    table: "pull_requests",
    columns: [
      { name: "id", type: "Utf8 (PR number)" },
      { name: "title", type: "Utf8" },
      { name: "issue_key", type: "Utf8 (references common key)" },
      { name: "status", type: "Utf8 (open / closed)" },
      { name: "review_state", type: "Utf8 (changes_requested / approved)" },
      { name: "ci_state", type: "Utf8 (failed / passed)" },
      { name: "updated_at", type: "Utf8" },
      { name: "author", type: "Utf8" },
      { name: "url", type: "Utf8" },
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

  // Workspace scope for onboarding
  const [workspaceScope, setWorkspaceScope] = useState<"single" | "organization">("single");

  // Settings / connection credentials states (mirrored in onboarding)
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [discordChannel, setDiscordChannel] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [githubUser, setGithubUser] = useState("");

  // Testing states
  const [testingConnection, setTestingConnection] = useState(false);
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [githubPatInput, setGithubPatInput] = useState("");
  const [userRepos, setUserRepos] = useState<{ name: string; owner: string; fullName: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Dashboard Data State
  const [brief, setBrief] = useState<BriefResponse>(() => ({
    mode: "coral-live",
    generatedAt: new Date().toISOString(),
    sourceStatuses: [
      { id: "github", label: "GitHub", schema: "hm_github_live", status: "missing", tables: 1, latencyMs: 0, description: "Live GitHub pull requests, commits, and checks" },
      { id: "discord", label: "Discord", schema: "discord", status: "missing", tables: 1, latencyMs: 0, description: "Live Discord messages from your community channels" },
      { id: "notion", label: "Notion", schema: "hm_notion_live", status: "missing", tables: 1, latencyMs: 0, description: "Live Notion workspace page checklist documentation" },
    ],
    actions: [],
    risks: [],
    queryCount: 0,
    cacheHitRate: 0,
    latencyMs: 0,
    sql: sqlPlaybooks,
  }));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to HarborMaster! Connect your GitHub repositories, Discord text channels, and Notion workspace to generate your first live cross-source morning brief and run Coral federated SQL queries.",
      sql: "",
      evidence: [],
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
  const [actionType, setActionType] = useState<"discord" | "github" | "notion" | null>(null);
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
    // Check if GitHub OAuth is enabled on the server
    fetch("/api/auth/github/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.oauthEnabled) {
          setOauthEnabled(true);
        }
      })
      .catch((err) => console.error("Could not check OAuth config", err));

    // Parse cookies to load credentials statelessly
    const cookiesObj = document.cookie.split("; ").reduce((acc, c) => {
      const [k, v] = c.split("=");
      if (k && v) acc[k] = decodeURIComponent(v);
      return acc;
    }, {} as Record<string, string>);

    const gToken = cookiesObj["harbormaster_github_token"] || "";
    const gUser = cookiesObj["harbormaster_github_user"] || "";
    const gOwner = cookiesObj["harbormaster_github_owner"] || cookiesObj["harbormaster_github_user"] || "";
    const gRepo = cookiesObj["harbormaster_github_repo"] || "";
    const dToken = cookiesObj["harbormaster_discord_token"] || "";
    const dChan = cookiesObj["harbormaster_discord_channel"] || "";
    const nToken = cookiesObj["harbormaster_notion_token"] || "";
    const gKey = cookiesObj["harbormaster_gemini_key"] || "";

    if (gToken) {
      setGithubToken(gToken);
      setGithubSyncOk(true);
    }
    if (gUser) setGithubUser(gUser);
    if (gOwner) setGithubOwner(gOwner);
    if (gRepo) setGithubRepo(gRepo);
    if (dToken) {
      setDiscordToken(dToken);
      setDiscordSyncOk(true);
    }
    if (dChan) setDiscordChannel(dChan);
    if (nToken) {
      setNotionToken(nToken);
      setNotionSyncOk(true);
    }
    if (gKey) setGeminiKey(gKey);

    // Also fetch from API settings for fallback
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.geminiKey && data.geminiKey !== "••••••••") setGeminiKey(data.geminiKey);
        if (data.githubToken && data.githubToken !== "••••••••") {
          setGithubToken(data.githubToken);
          setGithubSyncOk(true);
        }
        if (data.githubUser) setGithubUser(data.githubUser);
        if (data.githubOwner) setGithubOwner(data.githubOwner);
        if (data.githubRepo) setGithubRepo(data.githubRepo);
        if (data.discordToken && data.discordToken !== "••••••••") {
          setDiscordToken(data.discordToken);
          setDiscordSyncOk(true);
        }
        if (data.discordChannel) setDiscordChannel(data.discordChannel);
        if (data.notionToken && data.notionToken !== "••••••••") {
          setNotionToken(data.notionToken);
          setNotionSyncOk(true);
        }
      })
      .catch((err) => console.error("Could not load credentials", err));

    // Handle OAuth redirect callback
    const params = new URLSearchParams(window.location.search);
    const stageParam = params.get("stage");
    if (stageParam === "onboarding") {
      setStage("onboarding");
      setOnboardingStep(1); // Go straight to onboarding
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedStage = localStorage.getItem("hm_stage") as any;
      if (storedStage) {
        setStage(storedStage);
      }
    }

    void refreshBrief();
  }, []);

  // Load user repositories dynamically once authenticated
  useEffect(() => {
    if (githubToken && stage === "onboarding" && onboardingStep === 2) {
      setLoadingRepos(true);
      fetch("/api/github/repos")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load repositories");
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setUserRepos(data);
          }
        })
        .catch((err) => console.error("Could not fetch user repos:", err))
        .finally(() => setLoadingRepos(false));
    }
  }, [githubToken, stage, onboardingStep]);

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
    
    // Reset state credentials
    setGeminiKey("");
    setGithubToken("");
    setGithubOwner("");
    setGithubRepo("");
    setDiscordToken("");
    setDiscordChannel("");
    setNotionToken("");
    setGithubPatInput("");

    // Clear cookies
    const cookiesToClear = [
      "harbormaster_github_token",
      "harbormaster_github_owner",
      "harbormaster_github_user",
      "harbormaster_github_repo",
      "harbormaster_discord_token",
      "harbormaster_discord_channel",
      "harbormaster_notion_token",
      "harbormaster_gemini_key"
    ];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

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
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to fetch answer");
      }
      const answer = (await response.json()) as ChatResponse;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer.answer,
          sql: answer.sql,
          evidence: answer.evidence,
        },
      ]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Error asking HarborMaster: ${err.message || String(err)}`,
          sql: "",
          evidence: [],
        },
      ]);
      void showToast("Chat request failed", "error");
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

  async function handleOpenAction(action: ActionItem, type: "discord" | "github" | "notion") {
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
  async function runTestConnection(type: "github" | "discord" | "gemini" | "notion") {
    setTestingConnection(true);
    let payload = {};
    if (type === "github") {
      payload = { githubToken, githubOwner, githubRepo };
    } else if (type === "discord") {
      payload = { discordToken, discordChannel };
    } else if (type === "notion") {
      payload = { notionToken };
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
        showToast(data.message || `Connected to ${type} successfully!`, "success");
        if (type === "github") setGithubSyncOk(true);
        if (type === "discord") setDiscordSyncOk(true);
        if (type === "notion") setNotionSyncOk(true);
      } else {
        showToast(data.error || `Connection to ${type} failed`, "error");
      }
    } catch (e) {
      showToast(`Network error testing ${type}`, "error");
    } finally {
      setTestingConnection(false);
    }
  }

  // Onboarding Step Switcher (Scope → GitHub → Discord → Notion → Sync)
  const handleOnboardingNext = () => {
    // Step 1 is workspace scope — no sync needed
    if (onboardingStep === 2 && !githubSyncOk) {
      setGithubSyncOk(true);
    }
    if (onboardingStep === 3 && !discordSyncOk) {
      setDiscordSyncOk(true);
    }
    if (onboardingStep === 4) {
      setNotionSyncOk(true);
      // Auto-save all credentials entered during onboarding
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey,
          githubToken,
          githubUser,
          githubOwner,
          githubRepo,
          discordToken,
          discordChannel,
          notionToken,
        }),
      })
        .then((res) => {
          if (res.ok) void refreshBrief();
        })
        .catch((err) => console.error("Failed to save onboarding settings:", err));
    }

    if (onboardingStep < 4) {
      setOnboardingStep((prev) => prev + 1);
    } else {
      // Step 5: Build Workspace Animation
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
          githubUser,
          githubOwner,
          githubRepo,
          discordToken,
          discordChannel,
          notionToken,
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
    if (syncProgress >= 10) logs.push("Importing repositories...");
    if (syncProgress >= 20) logs.push("Scanning pull requests, issues, and CI pipelines...");
    if (syncProgress >= 35) logs.push("Analyzing community conversations...");
    if (syncProgress >= 50) logs.push("Detecting sentiment patterns in support channels...");
    if (syncProgress >= 65) logs.push("Indexing documentation...");
    if (syncProgress >= 75) logs.push("Building cross-source relationships...");
    if (syncProgress >= 85) logs.push("Identifying release blockers and risk signals...");
    if (syncProgress >= 95) logs.push("Generating first maintainer brief...");
    if (syncProgress >= 100) logs.push("✓ Workspace ready. Your first brief is waiting.");
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
                x1="22%" y1="38%" x2="50%" y2="52%"
                stroke={hoveredNode === "github" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "github" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="78%" y1="38%" x2="50%" y2="52%"
                stroke={hoveredNode === "discord" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "discord" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}
              />
              <line
                x1="50%" y1="76%" x2="50%" y2="52%"
                stroke={hoveredNode === "notion" ? "oklch(0.76 0.12 195 / 65%)" : (hoveredNode ? "oklch(0.76 0.12 195 / 22%)" : "oklch(0.76 0.12 195 / 12%)")}
                strokeWidth={hoveredNode === "notion" ? "2.0" : "1.0"}
                className="hm-signal-line transition-all duration-300"
                filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}
              />

              {/* Flowing animated telemetry packets */}
              {/* GitHub Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "github" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="22%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="38%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "github" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "github" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="22%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="38%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>

              {/* Discord Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "discord" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="78%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="38%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "discord" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "discord" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="78%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="38%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              </circle>

              {/* Notion Packets */}
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "notion" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="50%" to="50%" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cy" from="76%" to="52%" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="oklch(0.76 0.12 195)" opacity={hoveredNode === "notion" ? 0.95 : (hoveredNode ? 0.3 : 0.15)} filter={hoveredNode === "notion" ? "url(#glow-cyan)" : ""}>
                <animate attributeName="cx" from="50%" to="50%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="cy" from="76%" to="52%" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
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
              style={{ left: "22%", top: "38%", transform: "translate(-50%, -50%)" }}
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
                    <span className="text-slate-500">Utf8 (PK)</span>
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
              style={{ left: "78%", top: "38%", transform: "translate(-50%, -50%)" }}
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

            {/* Notion Node */}
            <div
              className={cn(
                "absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer group transition-all duration-300",
                hoveredNode && hoveredNode !== "notion" ? "opacity-35 scale-95" : "opacity-100 scale-100"
              )}
              style={{ left: "50%", top: "76%", transform: "translate(-50%, -50%)" }}
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
              <button
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 transition-colors"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See How It Works
              </button>
              <Button variant="outline" className="border-slate-800 bg-slate-950/40 text-xs hover:bg-slate-900/50" onClick={() => transitionToStage("dashboard")}>
                View Live Demo
              </Button>
              <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs shadow-sm shadow-teal-950/10" onClick={() => transitionToStage("auth")}>
                Build Workspace
              </Button>
            </div>
          </header>

          {/* Landing Hero */}
          <main className="w-full max-w-5xl mx-auto px-6 pt-12 pb-20 flex flex-col items-center justify-start text-center z-10 flex-1 space-y-12">
            <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
              <Badge variant="outline" className="border-teal-500/20 bg-teal-500/5 text-teal-300 font-mono text-[10px] tracking-wide py-0.5 px-2.5">
                ⚓ FOR OPEN-SOURCE MAINTAINERS
              </Badge>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-heading max-w-3xl mx-auto font-sans">
                Stop Context Switching.<br />
                <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Start Maintaining.</span>
              </h1>
              <p className="text-sm text-slate-405 max-w-xl mx-auto leading-relaxed font-sans">
                HarborMaster analyzes GitHub repositories, Discord communities, and Notion documentation to automatically identify release blockers, support trends, and documentation gaps.
              </p>
            </div>

            <div className="flex items-center gap-4 z-20">
              <Button 
                size="lg" 
                className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] px-8 font-semibold text-sm rounded-lg transition-all duration-300" 
                onClick={() => transitionToStage("auth")}
              >
                Build My Workspace
              </Button>
              <Button 
                size="lg" 
                variant="ghost" 
                className="text-slate-500 hover:text-slate-300 bg-transparent hover:bg-white/[0.02] border-transparent text-sm transition-all duration-300 px-8" 
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See How It Works
              </Button>
            </div>

            {/* Outcomes Grid */}
            <div className="w-full max-w-4xl pt-8 space-y-4">
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest text-center">Ecosystem Insights & Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="rounded-xl border border-white/[0.04] bg-[#101424]/60 p-5 space-y-2 hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="size-4 text-blue-400" />
                    Identify Release Blockers
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Coral joins failing test runs and open bugs to highlight critical path release risks before branch cuts.
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-[#101424]/60 p-5 space-y-2 hover:border-sky-500/20 hover:-translate-y-0.5 transition-all duration-300">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="size-4 text-sky-400" />
                    Detect Community Signals
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Identify recurring user complaints and bugs in Discord support channels before they flood your issue tracker.
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-[#101424]/60 p-5 space-y-2 hover:border-slate-500/20 hover:-translate-y-0.5 transition-all duration-300">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="size-4 text-slate-400" />
                    Review Documentation Gaps
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically cross-reference community support requests with Notion wikis to find missing FAQs and setup guides.
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-[#101424]/60 p-5 space-y-2 hover:border-teal-500/20 hover:-translate-y-0.5 transition-all duration-300">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bot className="size-4 text-teal-400" />
                    AI-Prioritized Actions
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Get a daily prioritized action plan of the high-leverage moves that keep your open-source project moving forward.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div id="how-it-works" className="w-full max-w-4xl pt-16 pb-12 space-y-8 scroll-mt-6 border-t border-white/[0.03]">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-white font-heading">How HarborMaster Works</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Coral SQL federates your developer tooling into one relational interface, allowing Gemini to analyze your entire system.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                {/* Step 1 */}
                <div className="rounded-xl border border-white/[0.03] bg-slate-950/40 p-5 space-y-4 relative group">
                  <div className="size-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-400 text-xs font-mono font-bold">
                    01
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-white">Connect Ecosystem</h3>
                    <p className="text-[11px] text-slate-450 leading-relaxed">
                      Securely link your GitHub repo, Discord channels, and Notion wiki guides in the onboarding step.
                    </p>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Github className="size-3.5 text-slate-500" />
                    <MessageSquare className="size-3.5 text-slate-500" />
                    <Globe className="size-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-xl border border-white/[0.03] bg-slate-950/40 p-5 space-y-4 relative group">
                  <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                    02
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-white">Federate with Coral</h3>
                    <p className="text-[11px] text-slate-450 leading-relaxed">
                      Coral SQL virtualizes your sources as local tables. Run relational joins directly across files and API objects.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-xl border border-white/[0.03] bg-slate-950/40 p-5 space-y-4 relative group">
                  <div className="size-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
                    03
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-white">Analyze Relations</h3>
                    <p className="text-[11px] text-slate-450 leading-relaxed">
                      Gemini reviews the cross-source joins to pinpoint the root cause bugs that block your releases.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="rounded-xl border border-white/[0.03] bg-slate-950/40 p-5 space-y-4 relative group">
                  <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 text-xs font-mono font-bold">
                    04
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-white">Take AI Actions</h3>
                    <p className="text-[11px] text-slate-450 leading-relaxed">
                      Review proposed actions and dispatch AI-drafted commits, PR reviews, or Discord channel replies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Landing Footer */}
          <footer className="w-full py-6 text-center text-xs text-slate-500 z-10 border-t border-white/[0.03] bg-slate-950/20 font-sans">
            Powered by Coral. Developed for the We Make Devs Hackathon. Focuses exclusively on GitHub, Discord, and Notion.
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
            <CardContent className="p-0 space-y-4">
              {oauthEnabled ? (
                <Button 
                  className="w-full py-5 bg-slate-950 hover:bg-[#121629] border border-white/[0.04] text-sm font-medium text-white flex items-center justify-center gap-2 rounded-lg transition-all duration-200 shadow-sm"
                  onClick={() => {
                    window.location.href = "/api/auth/github/login";
                  }}
                >
                  <Github className="size-4" />
                  Continue with GitHub (OAuth)
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">GitHub Personal Access Token (PAT)</label>
                    <Input 
                      type="password" 
                      placeholder="ghp_..." 
                      value={githubPatInput} 
                      onChange={(e) => setGithubPatInput(e.target.value)} 
                      className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600 h-9" 
                    />
                    <p className="text-[9px] text-slate-500 font-sans leading-normal mt-1">
                      OAuth is not configured. Enter a classic GitHub PAT with <code className="text-teal-400 font-mono">repo</code> scope.
                    </p>
                  </div>
                  {testingConnection && (
                    <div className="text-[10px] text-teal-400 flex items-center gap-1.5 font-mono justify-center animate-pulse">
                      <Loader2 className="size-3 animate-spin" /> Verifying token...
                    </div>
                  )}
                  <Button 
                    className="w-full py-2.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold rounded-lg transition-all duration-200" 
                    disabled={testingConnection}
                    onClick={async () => {
                      if (!githubPatInput) {
                        void showToast("Please enter a GitHub token", "error");
                        return;
                      }
                      setTestingConnection(true);
                      try {
                        const res = await fetch("/api/auth/github/pat-login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ token: githubPatInput }),
                        });
                        const data = await res.json();
                        if (res.ok && data.ok) {
                          setGithubToken(githubPatInput);
                          setGithubOwner(data.username);
                          setGithubSyncOk(true);
                          void showToast(`Authenticated as @${data.username}`, "success");
                          transitionToStage("onboarding");
                        } else {
                          void showToast(data.error || "Invalid token", "error");
                        }
                      } catch (err) {
                        void showToast("Verification failed", "error");
                      } finally {
                        setTestingConnection(false);
                      }
                    }}
                  >
                    Authenticate & Log In
                  </Button>
                </div>
              )}
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
                  <span>BUILD YOUR WORKSPACE</span>
                  <span>STEP {onboardingStep} OF 4</span>
                </div>
                <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${onboardingStep * 25}%` }} />
                </div>
              </div>
            )}

            {/* Step 1: Workspace Scope */}
            {onboardingStep === 1 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Compass className="size-5 text-teal-400" />
                        <CardTitle className="text-base text-white font-heading">1. Workspace Scope</CardTitle>
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        Choose whether HarborMaster should analyze one repository or your entire organization.
                      </CardDescription>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div
                          onClick={() => setWorkspaceScope("single")}
                          className={cn(
                            "rounded-xl border p-4 cursor-pointer transition-all space-y-2",
                            workspaceScope === "single"
                              ? "border-teal-400 bg-teal-400/5 shadow-md shadow-teal-950/20"
                              : "border-white/[0.05] bg-slate-950/45 hover:border-slate-700"
                          )}
                        >
                          <h4 className="text-xs font-semibold text-white">Single Repository</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Monitor and manage a single repository, its linked community chat, and documents.
                          </p>
                        </div>

                        <div
                          onClick={() => setWorkspaceScope("organization")}
                          className={cn(
                            "rounded-xl border p-4 cursor-pointer transition-all space-y-2",
                            workspaceScope === "organization"
                              ? "border-teal-400 bg-teal-400/5 shadow-md shadow-teal-950/20"
                              : "border-white/[0.05] bg-slate-950/45 hover:border-slate-700"
                          )}
                        >
                          <h4 className="text-xs font-semibold text-white">Organization Scope</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Monitor and manage all repositories under your organization or workspace automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-white/[0.04] bg-transparent">
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Repositories
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Tree Visualizer */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      Ecosystem Tree Preview
                    </span>
                    <svg viewBox="0 0 200 120" className="w-full max-w-[200px] z-10" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="100" cy="25" r="5" fill="#2dd4bf" opacity="0.9" />
                      <text x="100" y="16" textAnchor="middle" fill="#2dd4bf" fontSize="6" fontFamily="monospace">Ecosystem</text>
                      
                      <line x1="100" y1="25" x2="50" y2="60" stroke="#1e293b" strokeWidth="1.2" />
                      <line x1="100" y1="25" x2="150" y2="60" stroke="#1e293b" strokeWidth="1.2" />
                      
                      <circle cx="50" cy="60" r="4" fill="#3b82f6" opacity="0.8" />
                      <text x="50" y="72" textAnchor="middle" fill="#3b82f6" fontSize="5.5" fontFamily="monospace">
                        {workspaceScope === "single" ? "Single Repo" : "Org Repos"}
                      </text>
                      
                      <circle cx="150" cy="60" r="4" fill="#38bdf8" opacity="0.8" />
                      <text x="150" y="72" textAnchor="middle" fill="#38bdf8" fontSize="5.5" fontFamily="monospace">Channels & Wiki</text>
                    </svg>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Connect GitHub */}
            {onboardingStep === 2 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Github className="size-5 text-blue-300" />
                          <CardTitle className="text-base text-white font-heading">2. Connect Repositories</CardTitle>
                        </div>
                        {githubSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Connected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        HarborMaster uses GitHub to understand issues, pull requests, releases, discussions, and CI failures.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">PERSONAL ACCESS TOKEN (CLASSIC)</label>
                          <Input type="password" placeholder="ghp_..." value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">Requires a classic GitHub token with <code className="text-teal-400 font-mono">repo</code> scope.</p>
                        </div>
                        
                        {loadingRepos ? (
                        <div className="py-2 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Loader2 className="size-3.5 animate-spin text-teal-400" /> Loading repositories...
                        </div>
                        ) : userRepos.length > 0 ? (
                        <div className="space-y-2">
                        <div className="flex justify-between items-center">
                        <label className="text-[10px] font-mono text-slate-400">SELECT REPOSITORIES (CHOOSE MULTIPLE)</label>
                        <button 
                        type="button"
                        className="text-[9px] text-teal-400 underline hover:text-teal-300 font-sans"
                        onClick={() => setUserRepos([])}
                        >
                        Enter manually
                        </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-slate-900 bg-slate-950 rounded-lg p-2.5 space-y-1.5 scrollbar-thin text-left">
                        {userRepos.map((r) => {
                        const currentRepos = githubRepo.split(",").map(x => x.trim()).filter(Boolean);
                        const isChecked = currentRepos.includes(r.fullName) || currentRepos.includes(r.name);
                        return (
                        <label key={r.fullName} className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none py-1">
                        <input
                        type="checkbox"
                        checked={isChecked}
                        className="accent-teal-500 rounded border-slate-800 bg-slate-950 size-3.5"
                        onChange={(e) => {
                        let updatedRepos = [...currentRepos];
                        if (e.target.checked) {
                        if (!updatedRepos.includes(r.fullName)) {
                        updatedRepos.push(r.fullName);
                        }
                        } else {
                        updatedRepos = updatedRepos.filter(x => x !== r.fullName && x !== r.name);
                        }
                        setGithubRepo(updatedRepos.join(", "));
                        if (updatedRepos.length > 0) {
                        const firstRepo = updatedRepos[0];
                        if (firstRepo.includes("/")) {
                        setGithubOwner(firstRepo.split("/")[0]);
                        } else {
                        setGithubOwner(r.owner || "");
                        }
                        }
                        }}
                        />
                        <span className="truncate">{r.fullName}</span>
                        </label>
                        );
                        })}
                        </div>
                        </div>
                        ) : (
                        <>
                        <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 flex justify-between">
                        <span>OWNER / ORGANIZATION</span>
                        <span className="text-[9px] text-slate-500 lowercase">e.g. vercel</span>
                        </label>
                        <Input placeholder="e.g., vercel" value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                        <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 flex justify-between">
                        <span>REPOSITORY NAMES (COMMA SEPARATED)</span>
                        <span className="text-[9px] text-slate-500 lowercase">e.g. next.js, hyper</span>
                        </label>
                        <Input placeholder="e.g., next.js, hyper" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                        </>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-white/[0.04] bg-transparent">
                      <Button variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900 text-slate-300" onClick={() => runTestConnection("github")} disabled={testingConnection}>
                        {testingConnection ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                        Test connection
                      </Button>
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Community
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: GitHub Git Graph SVG */}
                  <div className="md:col-span-5 bg-black/40 rounded-xl border border-white/[0.04] p-4 flex flex-col items-center justify-center relative overflow-hidden h-[300px] select-none pointer-events-none">
                    <div className="absolute inset-0 hm-grid-pattern opacity-[0.06]" />
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mb-3 z-10">
                      {githubSyncOk ? "✦ PIPELINE LIVE" : "GIT REPOSITORY GRAPH"}
                    </span>
                    <svg viewBox="0 0 220 140" className="w-full max-w-[240px] z-10" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="70" x2="220" y2="70" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,6" />
                      <line x1="15" y1="55" x2="205" y2="55"
                        stroke={githubSyncOk ? "#34d399" : "#475569"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        style={{ transition: "stroke 0.6s" }}
                      />
                      <path d="M 55 55 C 75 100, 140 100, 160 55"
                        stroke="#22d3ee"
                        strokeWidth="1.2"
                        fill="none"
                        strokeDasharray={githubSyncOk ? "none" : "4,3"}
                        opacity="0.8"
                      />
                      <circle r="3" fill="#22d3ee" opacity="0.9">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M 55 55 C 75 100, 140 100, 160 55" />
                      </circle>
                      <circle r="2.5" fill={githubSyncOk ? "#34d399" : "#64748b"} opacity="0.85">
                        <animateMotion dur="1.8s" repeatCount="indefinite" begin="0.6s" path="M 15 55 L 205 55" />
                      </circle>
                      <circle cx="30" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="55" cy="55" r="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
                      <circle cx="100" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="140" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="160" cy="55" r="5"
                        fill="#0f172a"
                        stroke={githubSyncOk ? "#34d399" : "#22d3ee"}
                        strokeWidth="2"
                        style={{ transition: "stroke 0.6s" }}
                      />
                      <circle cx="190" cy="55" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <text x="30" y="45" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">a1b2</text>
                      <text x="55" y="45" textAnchor="middle" fill="#22d3ee" fontSize="6" fontFamily="monospace">c3f8</text>
                      <text x="160" y="45" textAnchor="middle" fill={githubSyncOk ? "#34d399" : "#22d3ee"} fontSize="6" fontFamily="monospace">MERGE</text>
                      <text x="108" y="113" textAnchor="middle" fill="#22d3ee" fontSize="6.5" fontFamily="monospace" opacity="0.8">feat/oauth-fix</text>
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

            {/* Step 3: Connect Discord */}
            {onboardingStep === 3 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-5 text-sky-300" />
                          <CardTitle className="text-base text-white font-heading">3. Connect Community Channels</CardTitle>
                        </div>
                        {discordSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Connected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        HarborMaster uses Discord to identify recurring complaints, support trends, maintainer discussions, and release conversations.
                      </CardDescription>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">DISCORD BOT TOKEN</label>
                          <Input type="password" placeholder="MTA..." value={discordToken} onChange={(e) => setDiscordToken(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">Configure a Discord Bot token with message reading scopes.</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">DISCORD CHANNEL IDS (COMMA-SEPARATED)</label>
                          <Input placeholder="e.g., 104239840239480, 104239840239481" value={discordChannel} onChange={(e) => setDiscordChannel(e.target.value)} className="bg-slate-950 border-slate-900 text-xs focus-visible:ring-teal-500/20 text-white placeholder:text-slate-600" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-white/[0.04] bg-transparent">
                      <Button variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900 text-slate-300" onClick={() => runTestConnection("discord")} disabled={testingConnection}>
                        {testingConnection ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                        Test connection
                      </Button>
                      <Button className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-medium" onClick={handleOnboardingNext}>
                        Next: Connect Documentation
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
                      <line x1="10" y1="60" x2="210" y2="60" stroke="#1e293b" strokeWidth="0.8" />
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
                      <rect x="34" y="82" width="44" height="11" rx="2.5" fill="#0c1220" stroke="#22d3ee" strokeWidth="0.6" opacity="0.9" />
                      <text x="56" y="90" textAnchor="middle" fill="#22d3ee" fontSize="5.5" fontFamily="monospace">frustration</text>
                      <rect x="107" y="82" width="50" height="11" rx="2.5" fill="#0c1220" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.9" />
                      <text x="132" y="90" textAnchor="middle" fill="#7dd3fc" fontSize="5.5" fontFamily="monospace">#general-help</text>
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

            {/* Step 4: Connect Notion */}
            {onboardingStep === 4 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 shadow-xl shadow-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Form */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="size-5 text-slate-350" />
                          <CardTitle className="text-base text-white font-heading">4. Connect Documentation Workspace</CardTitle>
                        </div>
                        {notionSyncOk && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Enabled
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                        HarborMaster uses documentation to understand release notes, architecture decisions, project knowledge, and roadmaps.
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
                      <Button className="bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 text-xs shadow-md shadow-teal-950/20 font-medium" onClick={handleOnboardingNext}>
                        Build HarborMaster Workspace
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
                      <rect x="18" y="8" width="124" height="124" rx="5" fill="#0b1120" stroke={notionSyncOk ? "#34d399" : "#334155"} strokeWidth="1" style={{ transition: "stroke 0.6s" }} />
                      <rect x="18" y="8" width="124" height="18" rx="5" fill={notionSyncOk ? "#052e16" : "#111827"} style={{ transition: "fill 0.6s" }} />
                      <circle cx="30" cy="17" r="3" fill={notionSyncOk ? "#34d399" : "#475569"} style={{ transition: "fill 0.6s" }} />
                      <rect x="38" y="13" width="55" height="5" rx="2" fill="#1e293b" />
                      <rect x="26" y="34" width="108" height="5" rx="2" fill="#1e293b" opacity="0.9" />
                      <rect x="26" y="44" width="88" height="5" rx="2" fill="#1e293b" opacity="0.7" />
                      <rect x="26" y="54" width="96" height="5" rx="2" fill="#1e293b" opacity="0.8" />
                      <line x1="26" y1="65" x2="134" y2="65" stroke="#1e293b" strokeWidth="0.8" />
                      <rect x="26" y="72" width="70" height="5" rx="2" fill="#1e293b" opacity="0.9" />
                      <rect x="26" y="82" width="100" height="5" rx="2" fill="#1e293b" opacity="0.7" />
                      <rect x="26" y="92" width="82" height="5" rx="2" fill="#1e293b" opacity="0.8" />
                      <rect x="26" y="102" width="60" height="5" rx="2" fill="#1e293b" opacity="0.6" />
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

            {/* Step 5: Sync Workspace Animation */}
            {onboardingStep === 5 && (
              <Card className="border-white/[0.06] bg-[#101424]/85 backdrop-blur-md p-6 md:p-8 text-center space-y-6 shadow-xl shadow-slate-950/40 w-full max-w-2xl mx-auto">
                {/* 3-Port Converging Core Reactor SVG */}
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

                    {/* Conduit lines */}
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

                    {/* Sync % arc label */}
                    <text x="140" y="80" dy="4" textAnchor="middle" fill={syncProgress === 100 ? "#34d399" : "#2dd4bf"} fontSize="5.5" fontFamily="monospace" fontWeight="bold" style={{ transition: "fill 0.5s" }}>
                      {syncProgress}%
                    </text>
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white font-heading">Building Your Workspace...</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-sans">
                    Coral SQL is loading repositories, scanning Discord community channels, and indexing Notion documentation.
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
                    <span>BUILDING WORKSPACE</span>
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
                    { name: "GitHub", connected: brief.sourceStatuses.find(s => s.id === "github")?.status === "live" },
                    { name: "Discord", connected: brief.sourceStatuses.find(s => s.id === "discord")?.status === "live" },
                    { name: "Notion", connected: brief.sourceStatuses.find(s => s.id === "notion")?.status === "live" },
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
                  <span className="text-[10px] font-bold text-teal-400 font-heading">{(githubUser || "DM").slice(0, 2).toUpperCase()}</span>
                  <div className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full border border-[#06080f]" title="Coral DB Connected" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">{githubUser || "Developer Maintainer"}</p>
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
                  className="text-[9px] font-mono border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                >
                  Live Workspace
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
                      Verify response before sending comment to {actionType === "discord" ? "Discord channel" : actionType === "github" ? "GitHub pull request" : "Notion page"}.
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
                          Good morning, {githubUser || "Developer"}.
                        </h2>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                          {brief.actions.length > 0 ? (
                            <>There are <span className="text-teal-400 font-semibold">{brief.actions.length} priority issue{brief.actions.length !== 1 ? "s" : ""}</span> demanding your attention across connected repositories and community channels.</>
                          ) : brief.notice ? (
                            <span className="text-slate-400">{brief.notice}</span>
                          ) : (
                            <>Connect your GitHub, Discord, and Notion to begin receiving prioritized ecosystem actions.</>
                          )}
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
                              <span className="text-[10px] text-slate-500 font-mono">Priority action</span>
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
                            <p className="font-mono text-[9px] text-slate-500 mb-1.5 uppercase">{message.role === "assistant" ? "HarborMaster AI" : `${githubUser || "Developer"} (Maintainer)`}</p>
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
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-teal-400 font-medium" onClick={() => handleOpenAction(action, "github")}>
                                    Draft Git Review
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
                                  <Button size="sm" className="h-7 text-[10px] bg-slate-950 border border-slate-850 hover:bg-slate-900 text-violet-400 font-medium" onClick={() => handleOpenAction(action, "notion")}>
                                    Update Notion
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
                      <p className="text-xs text-slate-400">Blocked branches, failing CI builds, and deployment risks detected from your live connected repositories.</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.04] bg-[#0E1326]/40 backdrop-blur-md p-6 relative">
                      {/* Central vertical line */}
                      <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-slate-800" />

                      <div className="space-y-8 relative">
                        {brief.risks.length > 0 ? (
                          brief.risks.map((node, i) => (
                            <div key={node.id} className="flex gap-6 items-start">
                              {/* Circle bullet node */}
                              <div className={cn(
                                "size-6 rounded-full border flex items-center justify-center shrink-0 z-10",
                                node.score > 80 ? "border-red-500 bg-[#0B1020] text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                                  "border-amber-500 bg-[#0B1020] text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                              )}>
                                <AlertTriangle className="size-3.5" />
                              </div>

                              <div className="space-y-1 flex-1">
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white text-xs">{node.linkedWork}: {node.blocker}</span>
                                    <Badge variant="outline" className={cn(
                                      "text-[8px] font-mono font-bold",
                                      node.score > 80 ? "border-red-500/20 bg-red-500/5 text-red-400" :
                                        "border-amber-500/20 bg-amber-500/5 text-amber-400"
                                    )}>
                                      {node.score > 80 ? "BLOCKED" : "PENDING"}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono">Live</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">{node.impact}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] text-slate-550 font-mono font-sans">Source:</span>
                                  {node.sources.map(src => (
                                    <Badge key={src} variant="outline" className={cn("text-[8px] font-mono py-0 px-1.5 h-4.5", sourceTone[src] || "border-slate-800 text-slate-500")}>
                                      {src}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-xs text-slate-500 font-mono">
                            No active release risks found in the live database.
                          </div>
                        )}
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
                      {brief.communitySignals && brief.communitySignals.length > 0 ? (
                        brief.communitySignals.map((item, i) => (
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
                              <span className="text-[10px] font-mono text-slate-500">By @{item.author}</span>
                            </div>
                            <div>
                              <h3 className="text-xs font-semibold text-white leading-normal">{item.title}</h3>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-1 italic">"{item.excerpt}"</p>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-2 border-t border-white/[0.03]">
                              <span>PLATFORM: {item.source.toUpperCase()}</span>
                              <span className="text-teal-400">SIGNAL ACTIVE</span>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-12 border border-dashed border-white/[0.04] rounded-xl text-xs text-slate-500 font-mono">
                          No live community signals found in the database.
                        </div>
                      )}
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

                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-white">Notion Workspace</h3>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-slate-500">INTEGRATION TOKEN</label>
                            <div className="flex gap-2">
                              <Input type="password" value={notionToken} onChange={(e) => setNotionToken(e.target.value)} placeholder="secret_..." className="bg-slate-950 border-slate-900 text-xs flex-1" />
                              <Button type="button" variant="outline" className="border-slate-800 bg-slate-950 text-xs hover:bg-slate-900" onClick={() => runTestConnection("notion")}>
                                Test
                              </Button>
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