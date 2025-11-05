# Task: Fix Namespacing Output - Variable/Mixin Lookups

**Status**: Available
**Priority**: HIGH (10 tests affected)
**Estimated Time**: 3-4 hours
**Complexity**: Medium
**Builds On**: `fix-namespace-resolution` (completed)

## Overview

Fix namespace value lookups so that variables, mixins, and properties accessed via `#namespace > [variable]` or `#namespace.mixin()` return actual values instead of Go internal structures.

## Failing Tests (Output Differences)

1. `namespacing-1` - Variable lookups return `map[rules:[...]]` instead of values
2. `namespacing-2` - Variable lookups return empty/wrong values
3. `namespacing-3` - Output differences
4. `namespacing-4` - Variable lookups empty
5. `namespacing-5` - Detached ruleset variable lookups fail
6. `namespacing-7` - Detached ruleset calls don't output
7. `namespacing-8` - CSS variable name interpolation fails
8. `namespacing-functions` - Function returns from namespaces wrong
9. `namespacing-media` - Variable interpolation in media queries fails
10. `namespacing-operations` - Operations on namespace values return wrong results

**Impact**: 10 tests, very common feature in LESS

## Current Behavior

**Example from `namespacing-1` output**:
```css
.foo {
  color1: map[rules:[0xc000518a50 0xc000518aa0]];
  color2: map[rules:[0xc000518b40 0xc000518b90]];
  prop:;
  var:;
}
```

**Expected**:
```css
.foo {
  color1: red;
  color2: yellow;
  prop: uno;
  var: dos;
}
```

The Go code is returning internal map structures instead of evaluating the namespace lookup to get the actual value.

**Test Command**:
```bash
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/namespacing"
```

## Expected Behavior

Namespace syntax in LESS:
```less
#namespace {
  @color: red;
  .mixin() {
    prop: value;
  }
  @rules: {
    prop: value;
  };
}

// Access via >
.foo {
  color: #namespace > [@color];  // Should output: color: red;
  #namespace > .mixin();          // Should call mixin
  #namespace > @rules();          // Should call detached ruleset
}

// Access via .
.foo {
  #namespace.mixin();  // Alternative syntax
}
```

## Investigation Starting Points

### Test Data

```bash
# Look at test inputs
cat packages/test-data/less/namespacing/namespacing-1.less
cat packages/test-data/less/namespacing/namespacing-2.less
# etc.

# See expected outputs
cat packages/test-data/css/namespacing/namespacing-1.css
cat packages/test-data/css/namespacing/namespacing-2.css
```

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/namespace-value.js` - How namespace lookups work
- `packages/less/src/less/tree/variable.js` - How variables are looked up
- `packages/less/src/less/tree/ruleset.js` - How namespace rulesets provide values

**Key methods to understand**:
- `NamespaceValue.eval()` - How the lookup is evaluated
- `Ruleset.variable()` - How a ruleset returns a variable value
- How `>` operator triggers namespace lookup

### Go Implementation (Already Partially Fixed!)

The previous `fix-namespace-resolution` task fixed `variable_call.go` to handle namespace lookups. That got `namespacing-6` to pass, but more work is needed.

**Files to check**:
- `packages/less/src/less/less_go/namespace_value.go` - Namespace lookup logic
- `packages/less/src/less/less_go/variable_call.go` - Already fixed for basic case
- `packages/less/src/less/less_go/ruleset.go` - How rulesets provide namespace values
- `packages/less/src/less/less_go/variable.go` - Variable evaluation

### Debugging Commands

```bash
# See detailed differences
LESS_GO_DIFF=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/namespacing/namespacing-1"

# Trace evaluation
LESS_GO_TRACE=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/namespacing/namespacing-1"

# Compare with JavaScript
cd packages/less && npx lessc test-data/less/namespacing/namespacing-1.less -
```

## Likely Root Causes

### Issue 1: NamespaceValue not fully evaluated
- `namespace_value.go` returns a partially evaluated result
- The lookup finds the variable but doesn't evaluate it
- Need to add `.Eval(context)` call on the result

### Issue 2: Bracket notation not triggering evaluation
- Syntax `#namespace > [@variable]` parsed correctly
- But the `>` operator or bracket notation doesn't trigger the right evaluation path
- May need to handle specially in NamespaceValue or VariableCall

### Issue 3: Ruleset.Variable() returns wrong type
- When a namespace lookup queries a ruleset for a variable
- The ruleset returns the Variable node instead of its evaluated value
- Or returns a RuleList instead of the specific rule

### Issue 4: Detached rulesets in namespaces
- Detached rulesets (@rules: { ... };) have special evaluation
- When accessed via namespace, they need to be callable
- May need DetachedRuleset handling in namespace lookups

## Implementation Hints

### Start Here (Most Likely Fix):

1. Look at `namespace_value.go`, find the `Eval()` method
2. After finding the value from the namespace, ensure it's evaluated:
```go
// Find the value
result := namespace.FindVariable(name, context)

// EVALUATE IT before returning
if result != nil {
    result = result.Eval(context)
}

return result
```

### If that's not enough:

3. Check `ruleset.go`, find the `FindVariable()` or similar method
4. Ensure it returns the variable's VALUE, not the Variable node itself
5. Match JavaScript implementation exactly

### For detached rulesets:

6. In `namespace_value.go`, detect if result is a DetachedRuleset
7. Return it wrapped in a way that makes it callable
8. See how JavaScript handles this in `namespace-value.js`

### For operations on namespace values:

9. Ensure that when `namespacing-operations` does `#namespace > [@var] + 5px`
10. The namespace lookup returns an evaluated Dimension, not a Variable
11. So the Operation sees two Dimensions and can add them

## Test Cases Pattern

Common patterns in the tests:
```less
// Pattern 1: Variable lookup
#ns { @var: red; }
.foo { color: #ns > [@var]; }  // Should output: color: red;

// Pattern 2: Mixin call
#ns { .mixin() { prop: val; } }
.foo { #ns > .mixin(); }  // Should output mixin contents

// Pattern 3: Detached ruleset
#ns { @rules: { prop: val; }; }
.foo { #ns > @rules(); }  // Should call and output

// Pattern 4: Operations
#ns { @width: 10px; }
.foo { width: #ns > [@width] + 5px; }  // Should output: width: 15px;

// Pattern 5: CSS variables
#ns { @varname: background-color; }
:root { --#ns > [@varname]: black; }  // Should output: --background-color: black;
```

## Success Criteria

- ✅ At least 5 of the 10 namespacing tests show "Perfect match!"
- ✅ No Go map structures in output (no `map[rules:[...]]`)
- ✅ Variables return actual values (colors, dimensions, strings)
- ✅ Operations on namespace values work correctly
- ✅ Unit tests still pass
- ✅ `namespacing-6` still passes (no regression from previous fix)

## Validation Checklist

```bash
# 1. Run all namespacing tests
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/namespacing"
# Expected: 5+ perfect matches

# 2. Check no Go internals in output
go test -v -run "TestIntegrationSuite/namespacing" 2>&1 | grep "map\["
# Expected: No output (grep finds nothing)

# 3. Verify previous fix still works
go test -v -run "TestIntegrationSuite/namespacing/namespacing-6"
# Expected: Still perfect match

# 4. Unit tests pass
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass

# 5. Check overall stats
go test -v -run "TestIntegrationSuite" 2>&1 | grep "Perfect match" | wc -l
# Expected: Should increase by ~5
```

## Files Likely Modified

- `namespace_value.go` - Add evaluation of looked-up values
- Possibly `ruleset.go` - Fix what FindVariable returns
- Possibly `variable_call.go` - Additional tweaks for edge cases

## Related Issues

- ✅ `fix-namespace-resolution` (completed) - Fixed basic VariableCall handling
- This task builds on that work but goes deeper into evaluation

## Notes

- **Previous fix** got us partway there (1 perfect match)
- This task should get most of the remaining 10 tests passing
- The core issue is: **lookup succeeds but result isn't evaluated**
- Compare carefully with JavaScript - evaluation patterns should match exactly
- Some tests (`namespacing-4`, `namespacing-8`) may have additional issues beyond basic evaluation
- Focus on getting `namespacing-1`, `namespacing-2`, `namespacing-operations` working first
- Consider if detached rulesets need special handling (may be separate sub-issue)
