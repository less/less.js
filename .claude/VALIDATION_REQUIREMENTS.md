# Standard Validation Requirements for All Tasks

**CRITICAL**: Before creating any PR, you MUST run ALL tests to verify no regressions.

## Required Validation Steps

Every agent must complete ALL of these steps before creating a PR:

### 1. Verify Specific Test Passes
```bash
# Run the test(s) you were working on
pnpm -w test:go:filter -- "your-test-name"
# Expected: ✅ Test passes or shows significant improvement
```

### 2. Run ALL Unit Tests (REQUIRED)
```bash
# This catches regressions in core functionality
pnpm -w test:go:unit
# Expected: ✅ All unit tests pass (zero failures)
```

**STOP**: If ANY unit test fails, you have introduced a regression. Fix it before proceeding.

### 3. Run FULL Integration Test Suite (REQUIRED)
```bash
# This verifies no existing passing tests broke
pnpm -w test:go
# Or alternatively:
pnpm -w test:go:full
# Expected: No new failures compared to baseline
```

**STOP**: If ANY previously passing integration test now fails, you have introduced a regression. Fix it before proceeding.

### 4. Check Overall Success Rate
```bash
# Verify overall improvement
pnpm -w test:go:summary
# Expected: Success rate increased or stayed same
```

## Success Criteria (ALL must be met)

- ✅ Target test(s) improved or fixed
- ✅ **ALL unit tests pass (100%)**
- ✅ **ALL previously passing integration tests still pass**
- ✅ Zero new failures introduced
- ✅ Overall success rate increased or stayed same

## If Tests Fail

**If unit tests fail**:
1. STOP - do not create PR
2. Your change broke core functionality
3. Review your changes and fix the regression
4. Re-run all validation steps

**If integration tests fail**:
1. STOP - do not create PR
2. Check which test(s) now fail
3. Determine if they were passing before your change
4. Fix the regression or reconsider your approach
5. Re-run all validation steps

**If you cannot resolve regressions**:
1. Mark the task as `blocked` in assignments.json
2. Document what regressions you encountered
3. Consider if this task depends on another fix first
4. Do NOT create a PR with regressions

## Zero Tolerance for Regressions

We are **improving** the codebase, not trading bugs. A PR that:
- ✅ Fixes 2 tests
- ❌ Breaks 1 test

Is NOT acceptable. The broken test must be fixed first.

## Time Estimates

Full validation should take:
- Unit tests: ~30-60 seconds
- Integration tests: ~1-2 minutes
- Total: ~2-3 minutes

This is a small price to pay for quality and avoiding wasted review time.
