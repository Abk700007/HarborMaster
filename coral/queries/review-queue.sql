-- HarborMaster review queue
SELECT
  gh.id AS pr_number,
  gh.title AS pr_title,
  gh.url,
  gh.author,
  gh.review_state,
  gh.ci_state
FROM hm_github.pull_requests gh
WHERE gh.review_state IN ('changes_requested', 'review_requested')
ORDER BY gh.updated_at DESC;
