-- HarborMaster release risk board
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
ORDER BY gh.updated_at DESC;
