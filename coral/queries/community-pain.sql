-- HarborMaster community pain radar
SELECT
  dc.channel_name,
  dc.author_name,
  dc.content,
  dc.issue_key,
  gh.title AS active_pr
FROM hm_discord.messages dc
LEFT JOIN hm_github.pull_requests gh ON gh.issue_key = dc.issue_key
WHERE dc.sentiment IN ('blocked', 'negative')
ORDER BY dc.created_at DESC;
