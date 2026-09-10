#!/bin/bash
set -e

# Non-draft PRs to rebase in order
PRS=(43 44 47 48 51 54 61 62 66 98)

for PR in "${PRS[@]}"; do
  echo "=== Rebasing PR #$PR ==="
  gh pr checkout "$PR"
  
  if git rebase origin/main; then
    echo "✓ PR #$PR rebased cleanly"
    git push origin HEAD --force-with-lease
    echo "✓ PR #$PR pushed"
  else
    echo "✗ PR #$PR has conflicts - manual intervention needed"
    git rebase --abort
  fi
  
  git checkout main
done

echo "=== Rebase batch complete ==="
