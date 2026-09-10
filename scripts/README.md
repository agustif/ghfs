# Repository Maintenance Scripts

This directory contains scripts for repository hygiene and maintenance tasks.

## apply-hygiene.sh

Applies repository hygiene tasks that require GitHub API write permissions.

### Requirements

- `curl` and `jq` installed
- GitHub Personal Access Token with `repo` scope
- Write access to the repository

### Usage

```bash
# Set your GitHub token with write permissions
export GITHUB_TOKEN=ghp_your_token_here

# Run the script
./scripts/apply-hygiene.sh
```

### What it does

1. **Closes duplicate issue #6** (keeps #16)
   - Posts comment: "Duplicate of #16. Closing in favor of #16 to consolidate discussion."
   - Closes issue with reason: "not_planned"

2. **Closes duplicate issue #7** (keeps #12)
   - Posts comment: "Duplicate of #12. Closing in favor of #12 to consolidate discussion."
   - Closes issue with reason: "not_planned"

3. **Updates epic #4** with real child issue numbers
   - Replaces `#TBD` placeholders with actual issue numbers
   - Marks completed items (#25, #30) with checkboxes
   - Updates PR link to #19

### Alternative: Manual Execution

If you prefer to do this manually through the GitHub UI:

1. Go to https://github.com/agustif/ghfs/issues/6
   - Add comment: "Duplicate of #16. Closing in favor of #16 to consolidate discussion."
   - Close as "Not planned"

2. Go to https://github.com/agustif/ghfs/issues/7
   - Add comment: "Duplicate of #12. Closing in favor of #12 to consolidate discussion."
   - Close as "Not planned"

3. Go to https://github.com/agustif/ghfs/issues/4
   - Click "Edit" on the issue body
   - Replace the content with the updated version from `HYGIENE_NOTES.md`

### Why These Changes

See `HYGIENE_NOTES.md` in the repository root for detailed rationale and context.
