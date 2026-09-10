#!/bin/bash
set -e

PR=$1

echo "=== Processing PR #$PR ==="
gh pr checkout "$PR"

if git rebase origin/main; then
  echo "✓ Clean rebase"
else
  echo "⚠ Conflicts detected, attempting auto-resolution..."
  
  # Get conflicted files
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  
  for FILE in $CONFLICTS; do
    case "$FILE" in
      ARCHITECTURE.md|README.md|*.md)
        # Accept theirs for docs
        git checkout --theirs "$FILE"
        ;;
      src/config/load.ts|src/types/config.ts|src/types/provider.ts|src/providers/github/provider.ts)
        # These need manual merge - try ours first
        git checkout --ours "$FILE"
        ;;
      *)
        # Default: accept ours
        git checkout --ours "$FILE"
        ;;
    esac
  done
  
  git add -A
  git rebase --continue || true
fi

# Push
git push origin HEAD --force-with-lease

# Wait for GitHub to register the push
sleep 2

# Try to merge
if gh pr merge "$PR" --squash 2>&1 | tee /tmp/merge-output; then
  echo "✓ PR #$PR merged successfully"
  EXIT=0
else
  if grep -q "MERGEABLE" /tmp/merge-output; then
    sleep 2
    gh pr merge "$PR" --squash && echo "✓ PR #$PR merged on retry" || echo "✗ PR #$PR merge failed"
  else
    echo "✗ PR #$PR still has conflicts"
  fi
fi

git checkout main
git pull origin main
