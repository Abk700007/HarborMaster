# HarborMaster

HarborMaster is a Coral-powered command center for open-source maintainers. It answers one question fast:

> What should I fix, review, reply to, or ship next?

It joins GitHub, Linear, Slack, Notion, and Discord-shaped data through Coral SQL, then turns the joined evidence into ranked actions with visible SQL and citations.

## Why It Fits Pirates of the Coral-bean

- Cross-source JOINs are the core product moment.
- The app can run fully local with Coral CLI.
- Demo data is exposed as separate Coral JSONL sources, not only UI fixtures.
- A custom Discord HTTP source spec is included for the source-spec bounty path.
- The UX is built for a short judge demo: action queue, risk board, source health, chat, and SQL drawer.

## Quick Start

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

By default, HarborMaster runs in demo preview mode. The UI still shows the same SQL and evidence structure, so the app is usable before Coral credentials are configured.

## Run With Coral Demo Sources

Install Coral first, then run:

```powershell
.\scripts\setup-coral-demo.ps1
$env:HARBORMASTER_USE_CORAL="1"
npm run dev
```

The setup script generates local source specs from `coral/source-specs/demo/*.yaml.template` and installs five Coral schemas:

- `hm_github`
- `hm_linear`
- `hm_slack`
- `hm_notion`
- `hm_discord`

Try a query directly:

```powershell
coral sql --format json (Get-Content .\coral\queries\morning-brief.sql -Raw)
```

## Custom Discord Source

`coral/source-specs/discord.yaml` exposes recent messages from one Discord channel:

```powershell
$env:DISCORD_CHANNEL_ID="your_channel_id"
$env:DISCORD_BOT_TOKEN="your_bot_token"
coral source lint .\coral\source-specs\discord.yaml
coral source add --file .\coral\source-specs\discord.yaml
coral source test discord
```

The bot needs View Channel and Read Message History permissions.

## Demo Script

1. Open HarborMaster.
2. Show the Morning Brief top action.
3. Open the Coral SQL drawer on the top action.
4. Switch to Risk Board and Sources.
5. Ask: `What is blocking the v1.4 release?`
6. Show the answer evidence and SQL.
7. Mention that Discord is both in the product story and included as a custom Coral source spec.

## Tech

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Coral CLI via `coral sql --format json`
