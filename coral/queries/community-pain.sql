-- HarborMaster community pain radar
SELECT
  dc.id AS message_id,
  dc.author__username AS author_name,
  dc.content,
  gh.title AS active_pr
FROM discord.messages dc
LEFT JOIN hm_github_live.pull_requests gh ON dc.content LIKE '%' || gh.id || '%'
ORDER BY dc.timestamp DESC
LIMIT 10;
