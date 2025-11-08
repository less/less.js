# Task: Fix Extend Functionality

**Status**: Available
**Priority**: High (Quick Win - Last test in category!)
**Estimated Time**: 1-2 hours
**Complexity**: Medium
**Updated**: 2025-11-08

## Overview

Fix the last remaining extend test to complete the entire extend category! Only `extend-chaining` remains - all other extend tests are now passing as perfect matches.

## Affected Tests

✅ **COMPLETED** (6 tests now passing):
- ~~`extend-clearfix`~~ - ✅ Perfect match!
- ~~`extend-exact`~~ - ✅ Perfect match!
- ~~`extend-media`~~ - ✅ Perfect match!
- ~~`extend-nest`~~ - ✅ Perfect match!
- ~~`extend-selector`~~ - ✅ Perfect match!
- ~~`extend`~~ - ✅ Perfect match!

⚠️ **REMAINING** (1 test):
- `extend-chaining` - Extends that reference other extends (multi-level chaining)

**Total**: 1 test remaining (would complete extend category to 7/7!)

## Current Behavior

Tests compile and run without errors, but CSS output doesn't match expected. Common issues likely include:
- Missing extended selectors
- Extended selectors in wrong place
- Selector combinators not being preserved
- Media query handling incorrect

**Test Command**:
```bash
# See all extend tests
pnpm -w test:go:filter -- "extend"

# See differences for specific test
LESS_GO_DIFF=1 pnpm -w test:go:filter -- "extend-chaining"
```

## Expected Behavior

From less.js, extend works like this:

```less
// Source
.a {
  color: red;
}
.b:extend(.a) {
  background: blue;
}

// Output
.a,
.b {
  color: red;
}
.b {
  background: blue;
}
```

The `.a` selector gets `.b` added to its selector list.

**Key points**:
- Extends happen at the selector level (not property level)
- Extended selectors are added to existing rulesets
- Order matters (extends processed after all parsing)
- Nested extends create chains
- `all` keyword extends everywhere, `exact` keyword requires exact match
- Media queries need special handling

## Investigation Starting Points

### JavaScript Implementation

**Key files to examine**:
- `packages/less/src/less/tree/extend.js` - Extend node definition
- `packages/less/src/less/visitors/extend-visitor.js` - Main extend processing logic
- `packages/less/src/less/tree/selector.js` - How selectors are matched and modified
- `packages/less/src/less/tree/ruleset.js` - How rulesets collect extends

**Key concepts**:
1. **Extend collection**: Extends are collected during evaluation
2. **Selector matching**: Find selectors that match the extend target
3. **Selector replacement**: Add extending selector to matched rulesets
4. **Chaining**: Extends can extend other extends
5. **Specificity**: Extended selectors maintain proper specificity

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/extend.go` - Extend node
- `packages/less/src/less/less_go/extend_visitor.go` - Extend visitor
- `packages/less/src/less/less_go/selector.go` - Selector matching
- `packages/less/src/less/less_go/ruleset.go` - Ruleset extend handling

**Look for**:
- Is the extend visitor being run?
- Are extends being collected correctly?
- Is selector matching working?
- Are extended selectors being added to rulesets?

### Debugging Commands

```bash
# See what's different
LESS_GO_DIFF=1 pnpm -w test:go:filter -- "extend-chaining"

# Trace to see extend processing
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "extend"

# Check multiple tests
for test in extend extend-chaining extend-exact; do
  echo "=== $test ==="
  pnpm -w test:go:filter -- "$test" 2>&1 | grep -A 5 "Output differs"
done
```

## Likely Root Causes

**Hypothesis 1**: Extend visitor not running
- JavaScript has a visitor pass specifically for extends
- Go might not be running this visitor
- Or running it at the wrong time (before/after it should)

**Hypothesis 2**: Selector matching incomplete
- The logic to find selectors that match the extend target is missing/broken
- JavaScript has complex matching logic (handles combinators, pseudo-classes, etc.)
- Go might only handle simple cases

**Hypothesis 3**: Selector addition logic wrong
- Found the right selectors but not adding extending selector correctly
- Or adding it but with wrong combinator/structure
- Or adding it in the wrong place in the selector list

**Hypothesis 4**: Media query handling missing
- Extends inside media queries need special handling
- JavaScript tracks media context when processing extends
- Go might not be doing this

**Hypothesis 5**: Chaining not implemented
- When A extends B and B extends C, A should also extend C
- JavaScript resolves these chains
- Go might only do one level

## Implementation Strategy

### Step 1: Verify Extend Visitor Runs

Check that the extend visitor is:
1. Created and added to the visitor list
2. Run at the right time (usually after eval, before to-CSS)
3. Actually visiting rulesets and collecting extends

### Step 2: Test Basic Extend

Start with the simplest test (`extend.less`):
```bash
LESS_GO_DIFF=1 pnpm -w test:go:filter -- "extend"
```

Focus on getting this one working first, then move to more complex tests.

### Step 3: Implement Selector Matching

The core algorithm:
1. For each extend: `.b:extend(.a)`
2. Find all selectors that match `.a`
3. For each matching selector, add `.b` to its ruleset

Matching needs to handle:
- Simple selectors (`.a`, `#id`, `element`)
- Combinators (`.a .b`, `.a > .b`, `.a + .b`)
- Pseudo-classes (`.a:hover`)
- Exact vs all matching

### Step 4: Implement Selector Addition

When adding `.b` to a ruleset that has `.a`:
1. Clone the selector `.a`
2. Replace matched part with `.b`
3. Add to the ruleset's selector list
4. Preserve source order and specificity

### Step 5: Handle Special Cases

- **Chaining**: Resolve multi-level extends
- **Media queries**: Track context, handle cross-media extends
- **All keyword**: Match in all positions, not just exact
- **Exact keyword**: Only exact matches, no partial

## Test Data Location

```
Input:  packages/test-data/less/_main/extend*.less
Output: packages/test-data/css/_main/extend*.css
```

Read these files in order of complexity:
1. `extend.less` - Basic functionality
2. `extend-exact.less` - Exact matching
3. `extend-chaining.less` - Multi-level extends
4. `extend-media.less` - Media query handling
5. Others - Various edge cases

## Success Criteria

- ✅ All 7 extend tests show "Perfect match!" or significant improvement
- ✅ All unit tests still pass (`pnpm -w test:go:unit`)
- ✅ No regressions in non-extend tests
- ✅ Overall success rate increases by ~3-4%

## Progressive Implementation

You don't have to fix all 7 tests at once. A good approach:

1. **Phase 1**: Fix basic `extend` test
   - Get simple extend working
   - PR this alone if it's complex

2. **Phase 2**: Fix `extend-exact` and `extend-selector`
   - Add exact matching and selector patterns
   - Can be same or separate PR

3. **Phase 3**: Fix `extend-chaining`
   - Add chain resolution
   - Separate PR is fine

4. **Phase 4**: Fix `extend-media` and `extend-nest`
   - Add context tracking
   - Separate PR is fine

Each phase can be a separate PR if needed. Or do all at once if the fix is straightforward.

## Historical Context

Previous similar fixes:
- Issue #6: Mixin closure - Visitor pattern and frame management
- Issue #7: Mixin recursion - Complex lookup and matching logic

The pattern: **Visitors need to run, and complex matching needs careful implementation**.

## Validation Checklist

Before creating PR:

```bash
# 1. All extend tests improve
pnpm -w test:go:filter -- "extend"
# Expected: Multiple tests show improvement

# 2. Unit tests pass
pnpm -w test:go:unit
# Expected: All tests pass

# 3. Check overall impact
pnpm -w test:go:summary | grep -A 20 "Perfect CSS Matches"
# Expected: Extend tests appear in the passing list

# 4. No regressions
pnpm -w test:go:summary | grep "failed"
# Expected: No increase in failures
```

## Code Review Focus

When creating PR, explain:
1. How extend visitor is invoked
2. How selector matching algorithm works
3. How extended selectors are added
4. What edge cases are handled vs not handled yet
5. Which tests pass now and which still have issues

## Notes

- Extend is a **complex feature** - don't expect to fix everything in one PR
- Start simple, build up to complex cases
- The JavaScript implementation is intricate - study it carefully
- Media queries make this much more complex
- It's OK to fix basic cases first and iterate
