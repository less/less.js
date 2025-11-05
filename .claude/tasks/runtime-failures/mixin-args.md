# Task: Fix Mixin Args Matching with Division

**Status**: Available
**Priority**: HIGH (Runtime Failure - blocks 3 test suites)
**Estimated Time**: 2-3 hours
**Complexity**: Medium

## Overview

Fix mixin pattern matching when arguments contain division operators. This is blocking ALL tests in the math-parens, math-parens-division, and math-always test suites.

## Failing Tests

- `mixins-args` in suite `math-parens`
- `mixins-args` in suite `math-parens-division`
- `mixins-args` in suite `math-always`

**Impact**: Fixing this will enable 10+ additional tests to run (all tests in the math suites depend on this working).

## Current Behavior

**Error Message**:
```
Syntax: No matching definition was found for `.m3()` in test-data/less/math/*/mixins-args.less
```

**Test Command**:
```bash
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens/mixins-args"
```

## Expected Behavior

From the test files, mixins with arguments containing division should:
1. Match correctly against mixin definitions
2. Evaluate the division based on the math mode setting
3. Pass the evaluated values to the mixin body

## Investigation Starting Points

### Test Data

Look at these files to understand what's being tested:
```
packages/test-data/less/math/strict/mixins-args.less
packages/test-data/less/math/parens/mixins-args.less
packages/test-data/less/math/parens-division/mixins-args.less
packages/test-data/css/math/*/mixins-args.css (expected outputs)
```

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/mixin-call.js` - How mixin calls match definitions
- `packages/less/src/less/tree/mixin-definition.js` - How patterns are matched
- Look for how division in arguments is handled during matching

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/mixin_call.go` - Mixin call matching logic
- `packages/less/src/less/less_go/mixin_definition.go` - Pattern matching
- `packages/less/src/less/less_go/operation.go` - Division handling
- `packages/less/src/less/less_go/contexts.go` - Math mode settings

### Debugging Commands

```bash
# See the actual vs expected output (if it gets that far)
LESS_GO_DIFF=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens/mixins-args"

# Trace execution to see where matching fails
LESS_GO_TRACE=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens/mixins-args"

# Check what the JavaScript version does
cd packages/less && npx lessc test-data/less/math/parens/mixins-args.less -
```

## Likely Root Causes

### Hypothesis 1: Division not evaluated before matching
- When matching `.m3()` call against definitions, arguments containing division aren't evaluated
- The pattern matcher sees `16/9` as two separate values instead of one evaluated value
- JavaScript evaluates args first, Go doesn't

### Hypothesis 2: Pattern matching too strict
- The pattern matcher fails because it expects exact argument count/types
- Division creates an Operation node that doesn't match expected Dimension node
- Need to evaluate operations before type checking

### Hypothesis 3: Math mode not applied during matching
- The math mode (strict, parens, parens-division) affects when division is evaluated
- This mode isn't being considered during mixin argument matching
- Need to pass context through matching logic

## Implementation Hints

### If Hypothesis 1 is correct:

1. In `mixin_call.go`, find where arguments are prepared for matching
2. Add evaluation step before matching: `arg = arg.Eval(context)`
3. Ensure this respects math mode settings

### If Hypothesis 2 is correct:

1. In `mixin_definition.go`, find the pattern matching logic
2. Add operation evaluation for Operation nodes before type comparison
3. Match the JavaScript behavior for argument coercion

### If Hypothesis 3 is correct:

1. Ensure `context` is passed through all matching calls
2. Check that math mode from context is applied during arg evaluation
3. Look at how JavaScript handles `mathOn` during matching

## Test Cases to Understand

From the test files, look for:
```less
// Likely structure based on error
.m1() { /* ... */ }
.m2(@a) { /* ... */ }
.m3(@a, @b) { /* ... */ }  // This one is failing to match

// Call site (causing error)
.test {
  .m3(16/9, something);  // Can't find matching definition
}
```

The issue is that `16/9` isn't being evaluated or matched correctly.

## Success Criteria

- ✅ All three `mixins-args` tests compile successfully
- ✅ At least one shows "Perfect match!" (ideally all three)
- ✅ Other mixin tests still pass (no regressions)
- ✅ Math suite tests can now run (even if output differs)
- ✅ Unit tests still pass

## Validation Checklist

```bash
# 1. Specific tests compile
cd packages/less/src/less/less_go
go test -v -run "TestIntegrationSuite/math-parens/mixins-args"
go test -v -run "TestIntegrationSuite/math-parens-division/mixins-args"
# Expected: Both compile (may have output differences initially)

# 2. No mixin regressions
go test -v -run "TestIntegrationSuite/main/mixins"
# Expected: Still perfect matches

# 3. Unit tests pass
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass

# 4. Check if math tests can now run
go test -v -run "TestIntegrationSuite/math-parens"
# Expected: All tests at least compile
```

## Files Likely Modified

- `mixin_call.go` - Add argument evaluation before matching
- `mixin_definition.go` - Update pattern matching logic
- Possibly `operation.go` - Ensure division evaluates correctly with context

## Related Issues

- Math operations (separate task) - But this is about matching, not output
- The math mode settings are already parsed and in context
- Other mixin tests work fine, it's specifically division in args that fails

## Notes

- This is **HIGH IMPACT** - blocks 3 entire test suites (10+ tests)
- The fix should be **localized** to mixin matching logic
- Other operations in mixins work, so it's specifically the matching phase
- JavaScript handles this correctly, so compare implementations carefully
- Don't change how division is evaluated, just ensure it's evaluated *before* matching
