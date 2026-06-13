-- HarborMaster release risk board
SELECT
  li.key,
  li.title,
  li.priority,
  gh.title AS pull_request,
  gh.ci_state,
  sl.text AS team_blocker,
  dc.content AS community_signal,
  no.title AS release_note
FROM hm_linear.issues li
JOIN hm_github.pull_requests gh ON gh.issue_key = li.key
LEFT JOIN hm_slack.messages sl ON sl.issue_key = li.key
LEFT JOIN hm_discord.messages dc ON dc.issue_key = li.key
LEFT JOIN hm_notion.pages no ON no.issue_key = li.key
WHERE li.release = 'v1.4'
ORDER BY li.score DESC;
