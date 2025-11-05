# Task: Fix Namespace Resolution

**Status**: Available
**Priority**: High (Runtime Failure)
**Estimated Time**: 2-4 hours
**Complexity**: Medium-High

## Overview

Fix namespace resolution so that lookups like `#Namespace > .mixin()` and calls to functions within namespaces work correctly. Currently these fail with "undefined" errors.

## Failing Tests

- `namespacing-6` (namespacing suite)
- `namespacing-functions` (namespacing suite)

## Current Behavior

**Error Message**: "#Namespace > .mixin is undefined" or similar

**Test Command**:
```bash
pnpm -w test:go:filter -- "namespacing-6"
pnpm -w test:go:filter -- "namespacing-functions"
```

## Expected Behavior

From less.js, namespaces work like this:

```less
// Define a namespace (just a ruleset)
#namespace {
  .mixin() {
    color: red;
  }
  @function: {
    width: 100px;
  };
}

// Call mixin from namespace
.test {
  #namespace > .mixin();  // Should expand to: color: red;
}

// Access variable from namespace
.test2 {
  width: #namespace > @function;  // Should expand to: width: 100px;
}
```

The `>` operator means "look inside this ruleset for the mixin/variable".

## Investigation Starting Points

### JavaScript Implementation

**Key files to examine**:
- `packages/less/src/less/tree/mixin-call.js` - How mixin calls with namespaces are resolved
- `packages/less/src/less/tree/namespace-value.js` - How namespace values are looked up
- `packages/less/src/less/tree/ruleset.js` - How rulesets index their contents for namespace lookup

**Key logic** to understand:
- How `#namespace > .mixin` is parsed into a mixin call with a namespace prefix
- How the namespace part is resolved to find the ruleset
- How the mixin/variable part is looked up within that ruleset
- How the `>` combinator is different from just `.namespace.mixin`

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/mixin_call.go` - Mixin call with namespace
- `packages/less/src/less/less_go/namespace_value.go` - Namespace value lookup
- `packages/less/src/less/less_go/ruleset.go` - Ruleset indexing and lookup methods

### Debugging Commands

```bash
# See the error
pnpm -w test:go:filter -- "namespacing-6"

# Trace to see where lookup fails
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "namespacing-6"

# Full debug
LESS_GO_DEBUG=1 LESS_GO_TRACE=1 pnpm -w test:go:filter -- "namespacing-6"
```

## Likely Root Causes

Based on the error "namespace > mixin is undefined":

**Hypothesis 1**: Namespace prefix not being resolved
- The mixin call has namespace elements, but they're not being used to narrow the lookup
- JavaScript probably resolves `#namespace` to a ruleset first, then looks for `.mixin` in it
- Go might be skipping the namespace resolution step

**Hypothesis 2**: Ruleset lookup methods incomplete
- The `Ruleset` struct needs methods like `find()` or `variable()` for namespace lookups
- These might be missing or not working correctly
- JavaScript has helper methods that Go doesn't implement

**Hypothesis 3**: Scope chain not including namespace contents
- When evaluating inside a namespace-accessed mixin, the scope needs to include the namespace
- The frames might not be set up correctly
- Similar to the closure issue (Issue #6) but for namespaces

## Implementation Hints

### Namespace Resolution Algorithm (from JavaScript)

1. **Parse**: `#namespace > .mixin()` becomes a MixinCall with:
   - `selector`: Elements array with `#namespace` and `.mixin`
   - The `>` combinator matters - it means "direct child lookup"

2. **Resolve namespace part**:
   - Take all elements before the last one (`#namespace`)
   - Look them up in current scope to find the ruleset
   - This ruleset becomes the search context

3. **Resolve mixin/variable**:
   - Take the last element (`.mixin`)
   - Look for it within the namespace ruleset (not global scope)
   - Return the match

4. **Evaluate**:
   - Call/access the found mixin/variable
   - Use the namespace ruleset's frames as part of the context

### Key Code Patterns

Look for code like this in JavaScript:

```javascript
// In mixin-call.js or similar
var namespace = this.selector.slice(0, -1);  // All but last element
var mixinName = this.selector.slice(-1);     // Last element

// Resolve namespace to a ruleset
var namespaceRuleset = resolveNamespace(namespace, context);

// Find mixin within that ruleset
var mixin = namespaceRuleset.find(mixinName);
```

The Go code should mirror this logic.

### Common Mistakes

- Treating namespace lookup like a normal selector match (wrong)
- Not creating proper scope when evaluating namespace-accessed items
- Confusing namespace lookup with selector nesting
- Not handling the `>` combinator specially

## Test Data Location

```
Input:  packages/test-data/less/namespacing/namespacing-6.less
        packages/test-data/less/namespacing/namespacing-functions.less

Output: packages/test-data/css/namespacing/namespacing-6.css
        packages/test-data/css/namespacing/namespacing-functions.css
```

Read these files to understand the specific patterns being tested.

## Success Criteria

- ✅ `namespacing-6` test shows "Perfect match!"
- ✅ `namespacing-functions` test shows "Perfect match!"
- ✅ All unit tests still pass (`pnpm -w test:go:unit`)
- ✅ Other namespacing tests with output differences may improve
- ✅ Overall success rate increases

## Related Work

This fix may also improve (but not necessarily fix) these tests with output differences:
- `namespacing-1` through `namespacing-8`
- `namespacing-media`
- `namespacing-operations`

Don't worry about those for now - focus on fixing the runtime failures first. The output difference tests can be a separate task.

## Historical Context

Previous similar fixes:
- Issue #6: Mixin closure - Proper frame capture during evaluation
- Issue #7: Mixin recursion - Proper ruleset tracking

The pattern: **lookups need correct scope and frame management**.

## Validation Checklist

Before creating PR:

```bash
# 1. Specific tests pass
pnpm -w test:go:filter -- "namespacing-6"
pnpm -w test:go:filter -- "namespacing-functions"
# Expected: ✅ namespacing-6: Perfect match!
# Expected: ✅ namespacing-functions: Perfect match!

# 2. Unit tests pass
pnpm -w test:go:unit
# Expected: All tests pass

# 3. Check for improvements in related tests
pnpm -w test:go:filter -- "namespacing"
# Expected: At least 2 new passes, possibly more

# 4. No regressions
pnpm -w test:go:summary | grep "Perfect CSS Matches"
# Expected: Count increases by at least 2
```

## Code Review Focus

When creating PR, explain:
1. How namespace resolution was broken
2. What JavaScript code you're matching
3. How the fix handles edge cases (nested namespaces, etc.)
4. Why this doesn't break non-namespace mixin calls

## Notes

- Namespacing is a **core LESS feature** - used heavily in real codebases
- The syntax can be confusing - `#ns > .mx` is different from `#ns.mx` or `#ns .mx`
- Edge cases: nested namespaces, guards on namespaced mixins, variables vs mixins
- The Go implementation likely has the structure but is missing key lookup logic
