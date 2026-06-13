# Checklist

- [x] Configure cross-platform binary downloading in `scripts/prebuild.js`
- [x] Modify `src/lib/coral.ts` and settings route to support resolving `coral.exe` on Windows
- [x] Implement the live-data JSONL synchronization logic in `src/lib/sync-live.ts`
- [x] Update YAML source specs (`hm_github_live.yaml`, `discord.yaml`, `hm_notion_live.yaml`) to use JSONL backend
- [x] Integrate live sync trigger inside API settings, API brief, API ask, and API query routes
- [x] Modify `src/lib/harbormaster-service.ts` to include community signals in brief response
- [x] Update frontend `harbormaster-app.tsx` UI for multi-select, dynamic username, and dynamic data bindings
- [/] Verify build and functionality
