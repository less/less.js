# 🚨 URGENT: Fix Mixin Regressions

**Priority**: CRITICAL
**Status**: Not Started
**Estimated Time**: 2-4 hours
**Tests Affected**: 3 tests (mixins, mixins-interpolated, mixins-guards)

## Problem Description

Three tests that were previously passing as perfect matches are now broken after recent mixin-related commits. All three tests compile successfully but produce incorrect CSS output.

### Affected Tests

1. **`mixins`** (main suite)
   - Status: Was perfect match, now has output differences
   - Issue: Missing selector `#foo-foo > .bar .baz` in output

2. **`mixins-interpolated`** (main suite)
   - Status: Was perfect match, now has output differences
   - Issue: Same as mixins - missing selector `#foo-foo > .bar .baz`

3. **`mixins-guards`** (main suite)
   - Status: Was perfect match, now has output differences
   - Note: The math-always version of mixins-guards still works perfectly
   - Issue: Output differences in guard evaluation

### Root Cause Analysis

Based on git history analysis, the regressions were likely introduced by:
- **Commit #102**: `9752674` - "Fix mixins-nested test by preventing nested rulesets from being output"
- **Commit #103**: `58a9706` - "Fix mixins-nested: prevent output of nested rulesets in mixin definitions"
- **Commit #110**: `636d263` - "Fix recursive mixin calls in detached rulesets by removing circular dependency check"

These commits modified mixin evaluation logic to fix `mixins-nested`, but inadvertently broke selector output for other mixin tests.

## Test Output Comparison

### mixins-interpolated Test

**Expected Output (partial)**:
```css
#foo-foo > .bar .baz {
  c: c;
}
mi-test-c-1 > .bar .baz {
  c: c;
}
mi-test-c-2 .baz {
  c: c;
}
mi-test-c-3 {
  c: c;
}
```

**Actual Output (partial)**:
```css
mi-test-c-1 > .bar .baz {
  c: c;
}
mi-test-c-2 .baz {
  c: c;
}
mi-test-c-3 {
  c: c;
}
```

**Problem**: The selector `#foo-foo > .bar .baz` is completely missing from the output.

## Investigation Steps

### 1. Compare Test Files

Run the failing tests to see the full diff:
```bash
pnpm -w test:go 2>&1 | grep -A 50 "mixins-interpolated"
pnpm -w test:go 2>&1 | grep -A 50 "mixins\$"
pnpm -w test:go 2>&1 | grep -A 50 "mixins-guards"
```

### 2. Review Recent Changes

Examine the changes made in the suspect commits:
```bash
git show 9752674  # mixins-nested fix #1
git show 58a9706  # mixins-nested fix #2
git show 636d263  # recursive mixin calls fix
```

Look for changes to:
- `mixin_definition.go`
- `mixin_call.go`
- `ruleset.go`
- Any visitor files that process mixins

### 3. Check mixins-nested Test

Verify that mixins-nested still passes while you're fixing the regressions:
```bash
pnpm -w test:go 2>&1 | grep "mixins-nested"
```

**Goal**: Fix the regressions WITHOUT breaking mixins-nested again.

### 4. Trace Execution

Use the runtime tracing to understand what's happening:
```bash
LESS_GO_TRACE=1 go run cmd/lessc/main.go test-data/less/_main/mixins-interpolated.less
```

Compare with the JavaScript version to see where they diverge.

## Files Likely Modified

Based on the commits and the nature of the issue:
- `internal/engine/mixin_definition.go` - Mixin definition and expansion logic
- `internal/engine/mixin_call.go` - Mixin call evaluation
- `internal/engine/ruleset.go` - Ruleset evaluation and output
- Possibly visitor files in `internal/visitors/`

## Strategy

### Approach 1: Git Bisect (Fastest)

1. Create a test script that checks if all 4 tests pass (3 regressions + mixins-nested):
   ```bash
   #!/bin/bash
   pnpm -w test:go 2>&1 | grep -E "(mixins-nested|mixins-interpolated|mixins-guards|^mixins)" | grep "Perfect match" | wc -l
   # Should return 4 if all pass
   ```

2. Use git bisect to find the exact breaking commit:
   ```bash
   git bisect start
   git bisect bad HEAD  # Current state is bad
   git bisect good a80044e  # Before the breaking changes
   # Run test script at each step
   ```

### Approach 2: Code Review (More Understanding)

1. Read the changes in commits #102, #103, #110 carefully
2. Understand what logic was added/modified to fix mixins-nested
3. Identify where that logic might be suppressing valid selector output
4. Look for conditional logic that might be too broad:
   - Checks for "nested rulesets" that catch too much
   - Visibility flags that are incorrectly set
   - Output suppression that affects more than intended

### Approach 3: Targeted Debugging

1. Add debug logging to mixin evaluation:
   ```go
   fmt.Printf("DEBUG: Processing mixin %s, selectors: %v\n", mixinName, selectors)
   fmt.Printf("DEBUG: Output suppressed: %v\n", shouldSuppress)
   ```

2. Run the failing test and compare debug output with JavaScript behavior

3. Look for places where selectors are being filtered or skipped incorrectly

## Success Criteria

✅ All 4 tests must pass as perfect matches:
1. mixins ✅
2. mixins-interpolated ✅
3. mixins-guards (main suite) ✅
4. mixins-nested ✅ (must NOT regress!)

✅ Run full integration test suite - no new regressions:
```bash
pnpm -w test:go
```

✅ All unit tests must still pass:
```bash
pnpm -w test:go:unit
```

## Notes

- This is a **blocking issue** - no other work should proceed until fixed
- The fix should be surgical - only change what's necessary
- Document WHY the fix works in the commit message
- Consider adding a test specifically for this scenario to prevent future regressions

## Commit Message Template

```
Fix mixin regressions: restore selector output for mixins/mixins-interpolated/mixins-guards

Three tests that were passing broke after commits #102, #103 fixing mixins-nested.
The issue was [specific cause found during debugging].

Changes:
- [Specific file]: [What changed and why]
- [Another file if needed]: [What changed and why]

The fix ensures that:
1. Nested rulesets in mixin definitions don't output (mixins-nested requirement)
2. Regular mixin selector output is preserved (fixes regressions)

Tests affected:
- mixins: ✅ restored
- mixins-interpolated: ✅ restored
- mixins-guards (main): ✅ restored
- mixins-nested: ✅ still passing

Fixes #[issue number if applicable]
```

## Related Files

- Test files: `test-data/less/_main/mixins.less`, `mixins-interpolated.less`, `mixins-guards.less`
- Expected output: `test-data/css/main/mixins.css`, etc.
- Integration test: `test/integration_suite_test.go`

## Questions to Answer During Investigation

1. What selector patterns does mixins-nested suppress that should NOT be suppressed?
2. Is there a way to distinguish between "nested rulesets that shouldn't output" vs "valid selector output"?
3. What does the JavaScript version do differently?
4. Are there visibility flags or other metadata being set incorrectly?
5. Is the issue in mixin expansion, evaluation, or CSS generation?

Good luck! This is critical work that will restore project momentum.
