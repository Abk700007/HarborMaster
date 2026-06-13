export const sqlPlaybooks = {
  morningBrief: `-- HarborMaster morning brief: join GitHub, Discord, and Notion via Coral
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
LIMIT 5;`,
  releaseRisk: `-- HarborMaster release risk board
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.ci_state,
  dc.content AS community_signal,
  no.title AS release_note
FROM hm_github.pull_requests gh
LEFT JOIN hm_discord.messages dc ON dc.issue_key = gh.issue_key
LEFT JOIN hm_notion.pages no ON no.issue_key = gh.issue_key
WHERE gh.review_state = 'changes_requested' OR gh.ci_state = 'failed'
ORDER BY gh.updated_at DESC;`,
  reviewQueue: `-- HarborMaster review queue
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.url,
  gh.author,
  gh.review_state,
  gh.ci_state
FROM hm_github.pull_requests gh
WHERE gh.review_state IN ('changes_requested', 'review_requested')
ORDER BY gh.updated_at DESC;`,
  communityPain: `-- HarborMaster community pain radar
SELECT
  dc.channel_name,
  dc.author_name,
  dc.content,
  dc.issue_key,
  gh.title AS active_pr
FROM hm_discord.messages dc
LEFT JOIN hm_github.pull_requests gh ON gh.issue_key = dc.issue_key
WHERE dc.sentiment IN ('blocked', 'negative')
ORDER BY dc.created_at DESC;`,
};

