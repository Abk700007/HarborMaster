export const sqlPlaybooks = {
  morningBrief: `-- HarborMaster morning brief: one decision row from five Coral sources
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
LIMIT 5;`,
  releaseRisk: `-- HarborMaster release risk board
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
ORDER BY li.score DESC;`,
  reviewQueue: `-- HarborMaster review queue
SELECT
  gh.title,
  gh.url,
  gh.author,
  gh.review_state,
  gh.ci_state,
  li.key,
  li.priority,
  li.assignee
FROM hm_github.pull_requests gh
JOIN hm_linear.issues li ON li.key = gh.issue_key
WHERE gh.review_state IN ('changes_requested', 'review_requested')
ORDER BY gh.updated_at DESC;`,
  communityPain: `-- HarborMaster community pain radar
SELECT
  dc.channel_name,
  dc.author_name,
  dc.content,
  dc.issue_key,
  li.title,
  gh.title AS active_pr
FROM hm_discord.messages dc
LEFT JOIN hm_linear.issues li ON li.key = dc.issue_key
LEFT JOIN hm_github.pull_requests gh ON gh.issue_key = dc.issue_key
WHERE dc.sentiment IN ('blocked', 'negative')
ORDER BY dc.created_at DESC;`,
};
