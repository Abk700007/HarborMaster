export const sqlPlaybooks = {
  morningBrief: `-- HarborMaster morning brief: join live GitHub, Discord, and Notion via Coral
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.state AS pr_status,
  gh.author_login AS author,
  dc.content AS community_signal,
  no.title AS roadmap_item
FROM hm_github_live.pull_requests gh
LEFT JOIN discord.messages dc ON dc.content LIKE '%' || gh.id || '%'
LEFT JOIN hm_notion_live.pages no ON no.title LIKE '%' || gh.title || '%'
WHERE gh.state = 'open'
ORDER BY gh.updated_at DESC
LIMIT 5;`,
  releaseRisk: `-- HarborMaster release risk board
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.draft,
  dc.content AS community_signal,
  no.title AS release_note
FROM hm_github_live.pull_requests gh
LEFT JOIN discord.messages dc ON dc.content LIKE '%' || gh.id || '%'
LEFT JOIN hm_notion_live.pages no ON no.title LIKE '%' || gh.title || '%'
WHERE gh.draft = true OR gh.state = 'open'
ORDER BY gh.updated_at DESC;`,
  reviewQueue: `-- HarborMaster review queue
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.html_url AS url,
  gh.author_login AS author,
  gh.state AS review_state
FROM hm_github_live.pull_requests gh
WHERE gh.state = 'open'
ORDER BY gh.updated_at DESC;`,
  communityPain: `-- HarborMaster community pain radar
SELECT
  dc.id AS message_id,
  dc.author__username AS author_name,
  dc.content,
  gh.title AS active_pr
FROM discord.messages dc
LEFT JOIN hm_github_live.pull_requests gh ON dc.content LIKE '%' || gh.id || '%'
ORDER BY dc.timestamp DESC
LIMIT 10;`,
};
