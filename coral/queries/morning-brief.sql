-- HarborMaster morning brief: one decision row from five Coral sources
SELECT
  gh.id,
  gh.title,
  gh.issue_key,
  gh.status,
  gh.review_state,
  gh.ci_state,
  li.priority,
  li.due_date,
  li.assignee,
  sl.text AS slack_blocker,
  no.title AS roadmap_item,
  dc.content AS community_signal
FROM hm_github.pull_requests gh
JOIN hm_linear.issues li ON li.key = gh.issue_key
LEFT JOIN hm_slack.messages sl ON sl.issue_key = li.key
LEFT JOIN hm_notion.pages no ON no.issue_key = li.key
LEFT JOIN hm_discord.messages dc ON dc.issue_key = li.key
WHERE gh.status != 'merged'
ORDER BY
  CASE li.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
  gh.updated_at DESC
LIMIT 5;
