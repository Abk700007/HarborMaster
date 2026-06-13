-- HarborMaster review queue
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.html_url AS url,
  gh.author_login AS author,
  gh.state AS review_state
FROM hm_github_live.pull_requests gh
WHERE gh.state = 'open'
ORDER BY gh.updated_at DESC;
