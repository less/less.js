# Task: Fix Guards and Conditionals

**Status**: Available
**Priority**: MEDIUM (2 tests remaining, common feature)
**Estimated Time**: 1-2 hours (reduced - CSS guards already working!)
**Complexity**: Low-Medium (reduced from Medium - main guard logic is working)

## Overview

Fix guard evaluation on mixins so that rules are only included when their guard conditions evaluate to true.

**UPDATE (2025-11-06)**: The `css-guards` test is now FIXED and showing "Perfect match!" ✅

## Remaining Failing Tests (Output Differences)

1. ~~`css-guards`~~ - ✅ FIXED! Now showing "Perfect match!"
2. `mixins-guards-default-func` - Guards with default() function
3. `mixins-guards` - General mixin guards (Note: `math-always/mixins-guards` is already passing)

## Current Behavior

**Example from `css-guards` output**:

**Expected**:
```css
.light {
  color: green;
}
.see-the {
  color: green;
}
.hide-the {
  color: green;
}
.multiple-conditions-1 {
  color: red;
}
/* ... more rules ... */
```

**Actual**:
```css
.see-the {

}
.dont-split-me-up {
  width: 1px;
}
```

Most guarded rules are either missing entirely or empty.

**Test Command**:
```bash
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/css-guards"
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-guards"
```

## Expected Behavior

Guards in LESS:
```less
// Mixin guards
.mixin() when (@mode = dark) {
  color: black;
}

.mixin() when (@mode = light) {
  color: white;
}

// CSS guards
.foo when (@mobile = true) {
  width: 100%;
}

// Guard operators
.foo when (@x > 0) { ... }
.foo when (@x >= 0) { ... }
.foo when (@x = 0) { ... }
.foo when (@x < 0) { ... }
.foo when not (@x = 0) { ... }
.foo when (@x = 0) and (@y = 1) { ... }
.foo when (@x = 0), (@y = 1) { ... }  // OR (comma)

// default() function
.mixin() when (default()) {
  // Used when no other guards match
}
```

Rules/mixins should only be included in output if their guard evaluates to truthy.

## Investigation Starting Points

### Test Data

```bash
# Look at guard test inputs
cat packages/test-data/less/_main/css-guards.less
cat packages/test-data/less/_main/mixins-guards.less
cat packages/test-data/less/_main/mixins-guards-default-func.less

# See expected outputs
cat packages/test-data/css/_main/css-guards.css
cat packages/test-data/css/_main/mixins-guards.css
```

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/ruleset.js` - CSS guard evaluation
- `packages/less/src/less/tree/mixin-definition.js` - Mixin guard evaluation
- `packages/less/src/less/tree/condition.js` - How conditions are evaluated
- `packages/less/src/less/tree/guard.js` - Guard node

**Key logic**:
- How guards are evaluated before including a rule/mixin
- When `default()` is used and how it's detected
- How guard results determine if content is included

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/ruleset.go` - CSS guards
- `packages/less/src/less/less_go/mixin_definition.go` - Mixin guards
- `packages/less/src/less/less_go/condition.go` - Condition evaluation
- `packages/less/src/less/less_go/default.go` - default() function

### Debugging Commands

```bash
# See differences
LESS_GO_DIFF=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/css-guards"

# Trace evaluation
LESS_GO_TRACE=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/css-guards"

# Compare with JavaScript
cd packages/less && npx lessc test-data/less/_main/css-guards.less -
```

## Likely Root Causes

### Issue 1: Guards not evaluated at all
- Rules have guards attached but they're not being checked
- The `Eval()` or `GenCSS()` methods don't check the guard before proceeding
- JavaScript checks `this.evalGuards()` before outputting

### Issue 2: Guards always evaluate to false
- Guards are evaluated but condition logic is wrong
- Comparison operators not working correctly
- Boolean logic (and/or/not) not implemented properly

### Issue 3: Guard evaluation context wrong
- Guards are evaluated but variables aren't in scope
- Need to pass correct frame/context for variable lookup
- JavaScript uses specific scope for guard evaluation

### Issue 4: default() function not implemented
- The `default()` function in guards has special meaning
- Should return true only if no other mixin guards matched
- Needs special tracking of whether other options matched

## Implementation Hints

### For CSS Guards (Issue 1 likely):

1. In `ruleset.go`, find the `Eval()` method
2. Before processing rules, check if there's a guard:
```go
func (r *Ruleset) Eval(context *Context) Node {
    // Check guard first
    if r.Guard != nil {
        if !r.Guard.Eval(context) {
            // Guard failed, return empty or nil
            return &Ruleset{...empty...}
        }
    }

    // Guard passed, proceed with normal evaluation
    // ...
}
```

### For Mixin Guards:

3. In `mixin_definition.go`, find where mixins are matched/called
4. Only include mixins whose guards evaluate to true
5. Track if any guards matched (for `default()`)

### For Condition Evaluation:

6. Check `condition.go` - ensure Eval returns correct boolean
7. Verify comparison operators work: `=`, `>`, `<`, `>=`, `<=`, `!=`
8. Verify logical operators: `and`, `or`, `not`, `,` (comma = or)

### For default():

9. In `default.go`, implement tracking:
```go
// When evaluating mixin calls
hadMatch := false
for _, mixin := range candidates {
    if mixin.Guard == nil || mixin.Guard.Eval(context) {
        hadMatch = true
        // use this mixin
    }
}

// When evaluating default() guard
func (d *Default) Eval(context *Context) bool {
    // Return true only if no non-default guards matched
    return !context.HadNonDefaultMatch
}
```

## Test Cases Pattern

Common patterns to support:
```less
// Pattern 1: Simple condition
@mode: light;
.foo when (@mode = light) {
  color: white;
}

// Pattern 2: Comparison operators
@x: 10;
.foo when (@x > 5) { ... }
.foo when (@x >= 10) { ... }

// Pattern 3: Logical operators
.foo when (@a = 1) and (@b = 2) { ... }
.foo when not (@x = 0) { ... }

// Pattern 4: Multiple guards (OR)
.foo when (@mode = dark), (@mode = light) {
  // Matches if either condition is true
}

// Pattern 5: default()
.mixin() when (@x = 1) { ... }
.mixin() when (@x = 2) { ... }
.mixin() when (default()) {
  // Only used if neither above matched
}
```

## Success Criteria

- ✅ `css-guards` shows "Perfect match!"
- ✅ `mixins-guards` shows "Perfect match!"
- ✅ `mixins-guards-default-func` shows "Perfect match!"
- ✅ Guarded rules only appear when conditions are true
- ✅ Non-guarded rules still work
- ✅ Unit tests still pass

## Validation Checklist

```bash
# 1. CSS guards work
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/css-guards"
# Expected: ✅ css-guards: Perfect match!

# 2. Mixin guards work
go test -v -run "TestIntegrationSuite/main/mixins-guards"
# Expected: ✅ mixins-guards: Perfect match!

# 3. default() works
go test -v -run "TestIntegrationSuite/main/mixins-guards-default-func"
# Expected: ✅ mixins-guards-default-func: Perfect match!

# 4. No regressions on non-guarded mixins
go test -v -run "TestIntegrationSuite/main/mixins"
# Expected: Still perfect match

# 5. Unit tests
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass
```

## Files Likely Modified

- `ruleset.go` - Add guard checking in Eval/GenCSS
- `mixin_definition.go` - Add guard checking for mixin matching
- `condition.go` - Ensure proper boolean evaluation
- `default.go` - Implement default() tracking

## Related Issues

- Conditionals used in other places (if() function) likely already work
- This is specifically about guards on rules and mixins
- default() is LESS-specific, not in CSS

## Notes

- Guards are a **very common** LESS feature
- Implementation should be straightforward if conditions already work
- The main work is checking guards at the right points
- default() is tricky - needs tracking across mixin matching
- Compare with JavaScript implementation for exact behavior
- Watch for edge cases: nested guards, guards in media queries, etc.
