-- HarborMaster community pain radar: surface user complaints linked to open work
SELECT
  dc.channel_name,
  dc.author_name,
  dc.content,
  dc.issue_key,
  dc.created_at,
  li.title         AS linear_issue,
  li.priority,
  gh.title         AS active_pr,
  gh.ci_state
FROM hm_discord.messages dc
LEFT JOIN hm_linear.issues li  ON li.key = dc.issue_key
LEFT JOIN hm_github.pull_requests gh ON gh.issue_key = dc.issue_key
WHERE dc.sentiment IN ('blocked', 'negative')
ORDER BY dc.created_at DESC;
