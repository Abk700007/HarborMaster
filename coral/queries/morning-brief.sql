-- HarborMaster morning brief: join live GitHub, Discord, and Notion via Coral
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
LIMIT 5;
