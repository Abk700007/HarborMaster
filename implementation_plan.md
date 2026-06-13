# Plan: Multi-Source Support, Windows Coral CLI Fix, and Dynamic Dashboard Data Binding

This plan details how to resolve the `spawn coral ENOENT` errors on Windows local development, support connecting multiple GitHub repositories and Discord channels, dynamically synchronize real API data into a local JSONL database format, and bind the dashboard views to pull from Coral rather than utilizing static mock values.

---

## User Review Required

> [!IMPORTANT]
> **No Database Needed / JSONL Sync Engine:** To bypass Coral's complex HTTP source schema limitations and dynamically support multi-repository and multi-discord-channel syncing, the Next.js backend will fetch live data directly using the standard Node `fetch` API. It will then union and write this data into local `.jsonl` files in a workspace data directory.
> 
> **Stateless & Resilient:** The workspace data directory will reside in `.coral/live-data` for local development and in `/tmp/harbormaster-data` on Vercel. Since Coral executes on these files via a fast, local-first `jsonl` parser, queries run instantly and are highly resilient to Vercel's execution timeouts and API rate-limiting issues.

---

## Proposed Changes

### Component: CLI Setup & Binary Resolution
#### [MODIFY] [prebuild.js](file:///d:/Desktop/We%20make%20Devs%20hackathon/scripts/prebuild.js)
- Update to download the appropriate pre-compiled binary based on the platform.
- On Windows, download the official release `coral-x86_64-pc-windows-msvc.zip` from GitHub and unzip it to `bin/coral.exe` using PowerShell.
- On Unix/macOS, run the standard installation script `https://withcoral.com/install.sh`.

#### [MODIFY] [coral.ts](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/lib/coral.ts)
- Update binary resolution to check for `bin/coral.exe` on Windows (`process.platform === 'win32'`) and `bin/coral` on other platforms.
- Map env input variables `GITHUB_DATA_DIR`, `DISCORD_DATA_DIR`, and `NOTION_DATA_DIR` into the Coral process environment.

---

### Component: Multi-Source JSONL Sync Engine
#### [NEW] [sync-live.ts](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/lib/sync-live.ts)
- Create a synchronization module that fetches data from connected APIs and writes it to `.jsonl` files:
  - **GitHub**: Parse the comma-separated repositories string. Query `/repos/{owner}/{repo}/pulls` in parallel, map response objects to standard columns, union them, sort by `updated_at` descending, and write to `github_live/pull_requests.jsonl`.
  - **Discord**: Parse the comma-separated channel IDs string. Query `/channels/{channelId}/messages` in parallel, map response objects, union them, sort by `timestamp` descending, and write to `discord/messages.jsonl`.
  - **Notion**: Query `/search` for page objects, map response objects, and write to `notion_live/pages.jsonl`.
  - **Fallback**: Write an empty string `""` to files if the source is not configured, preventing Coral directory errors.

#### [MODIFY] [hm_github_live.yaml](file:///d:/Desktop/We%20make%20Devs%20hackathon/coral/source-specs/hm_github_live.yaml)
- Switch backend to `jsonl`. Point location to `{{input.GITHUB_DATA_DIR}}/github_live/` and glob to `*.jsonl`.

#### [MODIFY] [discord.yaml](file:///d:/Desktop/We%20make%20Devs%20hackathon/coral/source-specs/discord.yaml)
- Switch backend to `jsonl`. Point location to `{{input.DISCORD_DATA_DIR}}/discord/` and glob to `*.jsonl`.

#### [MODIFY] [hm_notion_live.yaml](file:///d:/Desktop/We%20make%20Devs%20hackathon/coral/source-specs/hm_notion_live.yaml)
- Switch backend to `jsonl`. Point location to `{{input.NOTION_DATA_DIR}}/notion_live/` and glob to `*.jsonl`.

---

### Component: Onboarding and Dashboard UI
#### [MODIFY] [harbormaster-app.tsx](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/components/harbormaster-app.tsx)
- **Multi-Select Repositories**: Show a checklist of repositories in Step 2 of onboarding when loading user repos. Let the user check multiple repositories and save them comma-separated.
- **Multi-Select Channels**: In Step 3, support entering multiple Discord Channel IDs. Show them as nice UI badges or comma-separated.
- **Header & Sidebar Greetings**: Retrieve the authenticated username from the `harbormaster_github_user` cookie/state and render it dynamically (replacing "Alex").
- **Dynamic Release Watch**: Bind the timeline timeline cards to render from `brief.risks` instead of a hardcoded array.
- **Dynamic Community Signals**: Populate the Community Signals view by querying `communityPain` in `getBrief` and returning `communitySignals` in the `BriefResponse`.

---

### Component: Settings & API Hooks
#### [MODIFY] [route.ts](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/app/api/settings/route.ts)
- Fix binary resolution path (`bin/coral.exe` on Windows).
- Run `syncLiveWorkspace(config)` before registering the Coral sources to populate initial JSONL files.

#### [MODIFY] [route.ts](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/app/api/brief/route.ts)
- Run `syncLiveWorkspace(config)` before calling `getBrief` to ensure the dashboard always renders fresh data.

#### [MODIFY] [harbormaster-service.ts](file:///d:/Desktop/We%20make%20Devs%20hackathon/src/lib/harbormaster-service.ts)
- Update `getBrief` to query `communityPain` from Coral SQL and include the rows as `communitySignals` in the return object.

---

## Verification Plan

### Automated Tests
- Build and run the app locally: `npm run dev`
- Ensure build completes successfully: `npm run build`

### Manual Verification
- Log in and verify that the sidebar and main header greeting correctly display the authenticated GitHub username.
- Check multiple repositories and verify they sync successfully.
- Verify Release Watch and Community Signals lists display live PRs and messages fetched from Coral.
