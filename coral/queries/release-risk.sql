-- HarborMaster release risk board
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
ORDER BY gh.updated_at DESC;
