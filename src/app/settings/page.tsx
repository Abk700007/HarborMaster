"use client";

import { FormEvent, useState, useEffect } from "react";
import { Anchor, Save, Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [discordChannel, setDiscordChannel] = useState("");

  // Connection testing states
  const [geminiStatus, setGeminiStatus] = useState<ConnectionStatus>("idle");
  const [geminiMsg, setGeminiMsg] = useState("");
  const [githubStatus, setGithubStatus] = useState<ConnectionStatus>("idle");
  const [githubMsg, setGithubMsg] = useState("");
  const [discordStatus, setDiscordStatus] = useState<ConnectionStatus>("idle");
  const [discordMsg, setDiscordMsg] = useState("");

  useEffect(() => {
    // Load existing config on mount
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
      .catch((err) => console.error("Could not load settings", err));
  }, []);

  async function testConnection(type: "gemini" | "github" | "discord") {
    let payload = {};
    if (type === "gemini") {
      setGeminiStatus("testing");
      setGeminiMsg("");
      payload = { geminiKey };
    } else if (type === "github") {
      setGithubStatus("testing");
      setGithubMsg("");
      payload = { githubToken, githubOwner, githubRepo };
    } else if (type === "discord") {
      setDiscordStatus("testing");
      setDiscordMsg("");
      payload = { discordToken, discordChannel };
    }

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: type, payload }),
      });
      const data = await res.json();
      
      if (res.ok && data.ok) {
        if (type === "gemini") {
          setGeminiStatus("success");
          setGeminiMsg(data.message);
        } else if (type === "github") {
          setGithubStatus("success");
          setGithubMsg(data.message);
        } else if (type === "discord") {
          setDiscordStatus("success");
          setDiscordMsg(data.message);
        }
      } else {
        const errorMsg = data.error || "Connection failed";
        if (type === "gemini") {
          setGeminiStatus("error");
          setGeminiMsg(errorMsg);
        } else if (type === "github") {
          setGithubStatus("error");
          setGithubMsg(errorMsg);
        } else if (type === "discord") {
          setDiscordStatus("error");
          setDiscordMsg(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Network error";
      if (type === "gemini") {
        setGeminiStatus("error");
        setGeminiMsg(errorMsg);
      } else if (type === "github") {
        setGithubStatus("error");
        setGithubMsg(errorMsg);
      } else if (type === "discord") {
        setDiscordStatus("error");
        setDiscordMsg(errorMsg);
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/settings", {
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status: ConnectionStatus, message: string) {
    if (status === "testing") {
      return (
        <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-300 gap-1 animate-pulse">
          <Loader2 className="size-3 animate-spin" />
          Testing...
        </Badge>
      );
    }
    if (status === "success") {
      return (
        <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 gap-1">
          <CheckCircle2 className="size-3" />
          Connected
        </Badge>
      );
    }
    if (status === "error") {
      return (
        <Badge variant="outline" className="border-rose-400/30 bg-rose-400/10 text-rose-300 gap-1">
          <XCircle className="size-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
        Unchecked
      </Badge>
    );
  }

  return (
    <div className="min-h-screen bg-background/0 text-foreground pb-20">
      <header className="border-b border-white/[0.06] bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="relative flex size-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-teal-500/10 text-cyan-200 hover:bg-cyan-400/30 transition-colors shadow-[0_0_15px_-4px_oklch(0.78_0.14_195/30%)]">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-xl font-semibold tracking-normal text-transparent">
                  Configuration Center
                </h1>
                <Badge variant="outline" className="border-violet-400/30 bg-violet-400/10 text-violet-300 text-[10px] font-medium">
                  Settings
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Manage your Coral data sources and model credentials.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] gap-5 px-4 py-8 sm:px-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <Alert className="border-rose-400/30 bg-rose-400/10 text-rose-200">
              <XCircle className="size-4 text-rose-300" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
              <CheckCircle2 className="size-4 text-emerald-300" />
              <AlertTitle>Configuration Saved</AlertTitle>
              <AlertDescription>Your settings have been saved and live sources are updating.</AlertDescription>
            </Alert>
          )}

          {/* AI Integration Card */}
          <Card className="border-cyan-400/20 bg-card/50 backdrop-blur-md transition-all hover:border-cyan-400/30 shadow-[0_4px_24px_-4px_oklch(0.78_0.14_195/10%)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <CardTitle className="text-lg">AI Assistant Integration</CardTitle>
                <CardDescription>Power dynamic Coral SQL generation and morning brief synthesis.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(geminiStatus, geminiMsg)}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection("gemini")}
                  disabled={geminiStatus === "testing"}
                  className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 text-xs"
                >
                  Test Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Google Gemini API Key</label>
                <Input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-cyan-400/50"
                />
                <p className="text-xs text-muted-foreground">Powering the agent's Text-to-SQL logic using Gemini 2.5.</p>
              </div>
              {geminiMsg && (
                <div className={`text-xs p-3 rounded-lg border ${geminiStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300"}`}>
                  {geminiMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Live Configuration */}
          <Card className="border-white/[0.07] bg-card/40 backdrop-blur-md transition-all hover:border-white/[0.12]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <CardTitle className="text-lg">GitHub Live Source</CardTitle>
                <CardDescription>Query live pull requests and branches directly using Coral SQL.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(githubStatus, githubMsg)}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection("github")}
                  disabled={githubStatus === "testing"}
                  className="border-white/10 bg-white/5 text-foreground hover:bg-white/10 text-xs"
                >
                  Test Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">GitHub Personal Access Token (classic)</label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-white/30"
                />
                <p className="text-xs text-muted-foreground">Needs <code>repo</code> or <code>read:user</code> scopes.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Repository Owner</label>
                  <Input
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                    placeholder="e.g. vercel"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Repository Name</label>
                  <Input
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="e.g. next.js"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
              </div>
              {githubMsg && (
                <div className={`text-xs p-3 rounded-lg border ${githubStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300"}`}>
                  {githubMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord Live Configuration */}
          <Card className="border-white/[0.07] bg-card/40 backdrop-blur-md transition-all hover:border-white/[0.12]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <CardTitle className="text-lg">Discord Live Source</CardTitle>
                <CardDescription>Analyze community messages and sentiment from live support channels.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(discordStatus, discordMsg)}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection("discord")}
                  disabled={discordStatus === "testing"}
                  className="border-white/10 bg-white/5 text-foreground hover:bg-white/10 text-xs"
                >
                  Test Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Discord Bot Token</label>
                <Input
                  type="password"
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                  placeholder="MTA..."
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground font-sans">Requires the bot to have <code>Read Messages</code> and <code>Read Message History</code> scopes.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Discord Channel ID</label>
                <Input
                  value={discordChannel}
                  onChange={(e) => setDiscordChannel(e.target.value)}
                  placeholder="e.g. 124097144218987498"
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              {discordMsg && (
                <div className={`text-xs p-3 rounded-lg border ${discordStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300"}`}>
                  {discordMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
            <p className="text-xs text-muted-foreground max-w-md">
              Saving credentials automatically registers the live schemas (<code>hm_github_live</code>, <code>discord</code>) in Coral SQL.
            </p>
            <Button type="submit" disabled={saving} className="min-w-[140px] bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-200 border border-cyan-400/30 hover:from-cyan-500/30 hover:to-teal-500/30 shadow-[0_0_15px_-4px_oklch(0.78_0.14_195/20%)]">
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
