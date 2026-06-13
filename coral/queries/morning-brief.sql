-- HarborMaster morning brief: join GitHub, Discord, and Notion via Coral
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.status AS pr_status,
  gh.review_state,
  gh.ci_state,
  dc.content AS community_signal,
  no.title AS roadmap_item
FROM hm_github.pull_requests gh
LEFT JOIN hm_discord.messages dc ON dc.issue_key = gh.issue_key
LEFT JOIN hm_notion.pages no ON no.issue_key = gh.issue_key
WHERE gh.status != 'merged'
ORDER BY gh.updated_at DESC
LIMIT 5;
