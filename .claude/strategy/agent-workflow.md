# Agent Workflow Guide

This document describes the step-by-step workflow for AI agents working on less.go test fixes.

## Prerequisites

Before starting, agents should have:
- ✅ Access to the less.go repository
- ✅ Ability to run Go tests locally
- ✅ Ability to create git branches and PRs
- ✅ Understanding of the less.js → Go porting process

## Standard Workflow

### Step 1: Environment Setup

```bash
# Pull latest changes from main branch
git fetch origin
git checkout main
git pull origin main

# Verify development environment
pnpm -w test:go:unit  # Should pass all unit tests
```

### Step 2: Task Selection

```bash
# Review available tasks
cat .claude/tracking/assignments.json

# Choose an 'available' task that matches your capabilities
# Priority: runtime-failures > output-differences > polish
```

### Step 3: Claim Task

Update `.claude/tracking/assignments.json`:

```json
{
  "task-id": "fix-import-reference",
  "status": "in-progress",
  "agent_session_id": "YOUR_SESSION_ID_HERE",
  "claimed_at": "2025-11-05T15:00:00Z",
  "tests_affected": ["import-reference", "import-reference-issues"]
}
```

```bash
# Commit the claim
git add .claude/tracking/assignments.json
git commit -m "Claim task: fix-import-reference"
git push origin main
```

**Important**: If the file has been modified by another agent, you've encountered a collision. Pick a different task.

### Step 4: Create Feature Branch

```bash
# Create branch with specific naming convention
# Format: claude/fix-{task-name}-{session-id}
git checkout -b claude/fix-import-reference-YOUR_SESSION_ID
```

### Step 5: Understand the Issue

```bash
# Read the task specification
cat .claude/tasks/runtime-failures/import-reference.md

# Run the failing test to see current behavior
pnpm -w test:go:filter -- "import-reference"

# Compare with JavaScript behavior if needed
# Original JS is in: packages/less/src/less/
```

### Step 6: Investigate Root Cause

Use the debugging tools:

```bash
# Trace execution to understand the flow
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "import-reference"

# Enhanced debugging
LESS_GO_DEBUG=1 LESS_GO_DIFF=1 pnpm -w test:go:filter -- "import-reference"
```

Compare with JavaScript implementation:
1. Find the relevant JS file in `packages/less/src/less/`
2. Understand the JS behavior
3. Find the corresponding Go file in `packages/less/src/less/less_go/`
4. Identify discrepancies

### Step 7: Implement Fix

**Critical Rules**:
- ✅ **DO** modify Go files in `packages/less/src/less/less_go/`
- ❌ **NEVER** modify original JavaScript files
- ❌ **NEVER** modify test data files
- ✅ **DO** maintain 1:1 functional parity with JavaScript
- ✅ **DO** follow Go idioms and conventions

Make focused changes:
- Keep changes minimal and targeted
- Comment complex logic
- Preserve existing code style
- Add unit tests if appropriate

### Step 8: Validate Fix

**CRITICAL**: You MUST run ALL tests to verify no regressions before creating a PR.

Run tests in this exact order:

```bash
# 1. Verify the specific test now passes
pnpm -w test:go:filter -- "import-reference"
# Expected: ✅ Test passes or shows significant improvement

# 2. Run ALL unit tests (catch regressions) - REQUIRED
pnpm -w test:go:unit
# Expected: ✅ All unit tests pass (no failures)

# 3. Run FULL integration test suite - REQUIRED
pnpm -w test:go
# Expected: No new failures, ideally improved results

# 4. Check overall integration test summary
pnpm -w test:go:summary
# Expected: Success rate improved or stayed same
```

**Success Criteria** (ALL must be met):
- ✅ Target test(s) now pass or show improvement
- ✅ **ALL unit tests still pass (zero failures)**
- ✅ **ALL integration tests run without new failures**
- ✅ No previously passing integration tests now fail
- ✅ Overall success rate increased (or at minimum, stayed same)

**IMPORTANT**: If ANY unit test fails or ANY previously passing integration test now fails, you MUST fix the regression before proceeding. Do NOT create a PR with regressions.

If validation fails, iterate on Steps 6-8 until all criteria are met.

### Step 9: Commit Changes

```bash
# Stage your changes
git add packages/less/src/less/less_go/

# Write a clear commit message
git commit -m "$(cat <<'EOF'
Fix import reference functionality

Issue: Tests import-reference and import-reference-issues were failing
because referenced imports were outputting CSS when they shouldn't.

Root Cause: The 'reference' option wasn't being properly preserved
during import processing, causing referenced rulesets to be included
in the output.

Fix: Updated import_visitor.go to preserve the reference flag and
modified ruleset.go to check this flag before outputting CSS.

Tests Fixed:
- import-reference (now passes)
- import-reference-issues (now passes)

Validation:
- All unit tests pass
- Integration test success rate: 38.4% → 39.5%
- No regressions in previously passing tests
EOF
)"
```

**Commit Message Format**:
- Line 1: Brief summary (50 chars or less)
- Line 2: Blank
- Lines 3+: Detailed explanation including:
  - Issue description
  - Root cause
  - Fix applied
  - Tests fixed
  - Validation results

### Step 10: Push and Create PR

```bash
# Push to your feature branch
git push -u origin claude/fix-import-reference-YOUR_SESSION_ID

# Create PR using GitHub CLI
gh pr create \
  --title "Fix import reference functionality" \
  --body "$(cat <<'EOF'
## Summary
Fixes import reference functionality to prevent referenced imports from outputting CSS.

## Tests Fixed
- ✅ `import-reference` - now passes
- ✅ `import-reference-issues` - now passes

## Root Cause
The `reference` option wasn't being properly preserved during import processing.

## Changes Made
- Updated `import_visitor.go` to preserve reference flag
- Modified `ruleset.go` to check reference flag before CSS output
- Added reference flag propagation through import chain

## Validation
```bash
# Specific tests now pass
pnpm -w test:go:filter -- "import-reference"
✅ import-reference: Perfect match!
✅ import-reference-issues: Perfect match!

# All unit tests pass
pnpm -w test:go:unit
✅ All tests pass

# Overall improvement
pnpm -w test:go:summary
📈 Success rate: 38.4% → 39.5% (+1.1%)
📈 Perfect matches: 14 → 16 (+2)
```

## JavaScript Comparison
Matches behavior of `import-visitor.js` lines 45-67 where reference
flag is checked before including imported content.

## Related Issues
Closes tasks in `.claude/tasks/runtime-failures/import-reference.md`
EOF
)"
```

### Step 11: Update Tracking

Update `.claude/tracking/assignments.json`:

```json
{
  "task-id": "fix-import-reference",
  "status": "completed",
  "agent_session_id": "YOUR_SESSION_ID_HERE",
  "claimed_at": "2025-11-05T15:00:00Z",
  "completed_at": "2025-11-05T16:30:00Z",
  "pr_url": "https://github.com/toakleaf/less.go/pull/123",
  "tests_affected": ["import-reference", "import-reference-issues"],
  "success_rate_change": "+1.1%"
}
```

## Special Scenarios

### Scenario: Task is Blocked

If you discover the task depends on another incomplete task:

1. Update assignment status to `blocked`
2. Add `blocked_by` field with dependency task ID
3. Choose a different task
4. Optionally leave notes in tracking file

### Scenario: Multiple Approaches Possible

If there are multiple valid ways to fix the issue:

1. Document all approaches in your investigation notes
2. Choose the approach that **most closely matches the JavaScript implementation**
3. Add comments in code explaining your choice
4. Mention alternative approaches in PR description

### Scenario: Test Seems Wrong

If you believe the test expectation is incorrect:

1. **DO NOT** modify test data files
2. Document your findings thoroughly
3. Compare with less.js behavior carefully
4. Create a PR with your analysis
5. Tag for human review with detailed explanation

The test is probably correct - less.js behavior is the source of truth.

### Scenario: Merge Conflict

If you encounter a merge conflict when pushing:

```bash
# Pull latest changes
git fetch origin main
git rebase origin/main

# Resolve conflicts
# Edit conflicting files
git add <resolved-files>
git rebase --continue

# Force push (your branch only)
git push -f origin claude/fix-import-reference-YOUR_SESSION_ID
```

If conflict is complex, coordinate with other agents via tracking file.

### Scenario: Fix Causes Regression

If your fix breaks previously passing tests:

1. **STOP** - do not create PR
2. **DO NOT PUSH** - regression fixes must happen before pushing
3. Investigate why the regression occurred
4. Refine your approach to avoid the regression
5. Re-run ALL tests (unit + integration) after fixing
6. Consider if this task is `blocked` by another issue
7. If you can't resolve, document findings and mark task as `blocked`

**Zero regressions tolerance** - we're improving, not trading one bug for another.

**Reminder**: You MUST run the full test suite (unit + integration) before every PR. Regressions caught after PR creation waste time and resources.

## Best Practices

### Investigation
- ✅ Start with the JavaScript implementation
- ✅ Use TRACE mode to understand execution flow
- ✅ Create minimal reproduction cases
- ✅ Test against edge cases

### Implementation
- ✅ Make smallest change that fixes the issue
- ✅ Follow existing code patterns
- ✅ Add comments for non-obvious logic
- ✅ Keep functions focused and testable

### Testing
- ✅ Test the happy path
- ✅ Test edge cases
- ✅ **ALWAYS run FULL unit test suite (`pnpm -w test:go:unit`)**
- ✅ **ALWAYS run FULL integration test suite (`pnpm -w test:go`)**
- ✅ Verify zero regressions before creating PR
- ✅ Check that success rate improved or stayed same

### Communication
- ✅ Write clear commit messages
- ✅ Document root cause and fix in PR
- ✅ Update tracking file promptly
- ✅ Include validation evidence

## Time Estimates

Based on historical fixes:

- **Simple fixes** (variable scoping, flag propagation): 30-60 minutes
- **Medium fixes** (function evaluation, mixin logic): 1-2 hours
- **Complex fixes** (import system, namespace resolution): 2-4 hours
- **Large tests** (bootstrap4, complex integrations): 4-8 hours

If you're exceeding these estimates significantly, consider:
- Is this task actually `blocked` by something else?
- Are you over-complicating the solution?
- Does this need human architectural guidance?

## Success Metrics

Your work is successful when:

- ✅ Tests transition from ❌ → ✅
- ✅ Overall success rate increases
- ✅ Zero regressions introduced
- ✅ Code follows project conventions
- ✅ PR clearly explains the fix
- ✅ Changes are minimal and focused

## Questions?

If you have questions:
1. Check `.claude/strategy/MASTER_PLAN.md` for high-level context
2. Check task-specific files in `.claude/tasks/` for details
3. Review `RUNTIME_ISSUES.md` for historical context on similar issues
4. Examine previous successful PRs for examples
5. If still unclear, mark task as `blocked` and request human guidance

---

**Remember**: We're doing a faithful port of less.js to Go. The JavaScript implementation is always the source of truth for behavior.
