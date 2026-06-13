-- HarborMaster review queue: PRs waiting for your action
SELECT
  gh.title,
  gh.url,
  gh.author,
  gh.review_state,
  gh.ci_state,
  li.key,
  li.priority,
  li.assignee,
  sl.text AS team_note
FROM hm_github.pull_requests gh
JOIN hm_linear.issues li ON li.key = gh.issue_key
LEFT JOIN hm_slack.messages sl ON sl.issue_key = li.key
WHERE gh.review_state IN ('changes_requested', 'review_requested')
ORDER BY
  CASE li.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
  gh.updated_at DESC;
