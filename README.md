# HarborMaster

HarborMaster is a live intelligence command center for open-source maintainers. It answers one question fast:

> What should I fix, review, reply to, or ship next?

It connects your **GitHub** repositories, **Discord** community channels, and **Notion** workspace, federates their data through Coral SQL, and turns the joined evidence into ranked actions with visible SQL and citations.

## Quick Start

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Using HarborMaster

1. **Build My Workspace** — click the button on the landing page
2. **Authenticate with GitHub** — enter a Personal Access Token (classic) with `repo` scope
3. **Connect Repositories** — select one or more repositories from the list (multi-select supported)
4. **Connect Community Channels** — enter your Discord bot token and one or more channel IDs (comma-separated)
5. **Connect Documentation** — enter your Notion integration token (optional)
6. **Open your Dashboard** — HarborMaster syncs live data and shows you priority actions

## Data Flow

1. You enter credentials in the onboarding UI
2. Credentials are stored in browser cookies (30-day session, never sent to any server except your own)
3. On each API request, HarborMaster syncs live data from GitHub, Discord, and Notion to local JSONL files
4. The Coral SQL engine reads those JSONL files to execute federated cross-source JOIN queries
5. If Coral is unavailable, HarborMaster falls back to reading JSONL files directly
6. Gemini AI (optional) synthesizes natural language answers from the data

## Multiple Repositories & Channels

HarborMaster supports connecting **multiple repositories** and **multiple Discord channels**:

- **Repositories**: Select as many as you want using the checkboxes in the onboarding flow
- **Discord channels**: Enter multiple channel IDs separated by commas (e.g. `104239840239480, 104239840239481`)

## Setting Up Discord

Your Discord bot needs:
- **View Channel** permission on each channel you want to monitor
- **Read Message History** permission

To get a bot token: Go to [discord.com/developers/applications](https://discord.com/developers/applications) → New Application → Bot → Reset Token.

## Getting GitHub Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Copy and paste into HarborMaster onboarding

## Getting Notion Token

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration with read access
3. Share the pages/databases you want with the integration
4. Copy the token (starts with `secret_`)

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Coral CLI (JSONL-backed federated SQL engine)
- Google Gemini AI (via `@ai-sdk/google`)
- lucide-react icons

## Architecture

```
Browser → Next.js API Routes → sync-live.ts (fetch from GitHub/Discord/Notion APIs)
                             → Write JSONL files to .coral/live-data/
                             → Coral SQL engine reads JSONL files
                             → direct-reader.ts (fallback if Coral unavailable)
                             → harbormaster-service.ts (business logic)
                             → Gemini AI (natural language synthesis)
```
