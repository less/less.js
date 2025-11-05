# Task: Fix Import Reference Functionality

**Status**: Available
**Priority**: High (Runtime Failure)
**Estimated Time**: 2-3 hours
**Complexity**: Medium

## Overview

Fix the import reference functionality so that files imported with `(reference)` option are handled correctly - they should not output CSS by default, but their selectors/mixins should be available when explicitly referenced via extends or mixin calls.

## Failing Tests

- `import-reference` (main suite)
- `import-reference-issues` (main suite)

## Current Behavior

**Error Message**: Test likely shows one of:
1. Referenced imports outputting CSS when they shouldn't
2. "undefined" errors when trying to reference imported selectors
3. Import not being processed at all

**Test Command**:
```bash
pnpm -w test:go:filter -- "import-reference"
```

## Expected Behavior

From less.js documentation and tests:
1. Files imported with `@import (reference) "file.less";` should **not** output their CSS
2. Selectors/mixins from referenced files should be **available** for:
   - Extending via `:extend()`
   - Calling as mixins
   - Variable lookup
3. Only the **explicitly used** parts should appear in the output
4. CSS imports like `@import (reference) "file.css";` should remain as `@import` statements

## Investigation Starting Points

### JavaScript Implementation

**Key files to examine**:
- `packages/less/src/less/import-visitor.js` - How imports are processed
- `packages/less/src/less/tree/import.js` - Import node definition
- `packages/less/src/less/tree/ruleset.js` - How rulesets check reference flag

**Key logic** (search for "reference" in these files):
- How the `reference` option is stored and propagated
- How rulesets check if they're from a referenced import before outputting
- How the extend visitor accesses referenced selectors

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/import.go` - Import node
- `packages/less/src/less/less_go/import_visitor.go` - Import processing
- `packages/less/src/less/less_go/import_manager.go` - Import resolution
- `packages/less/src/less/less_go/ruleset.go` - Ruleset CSS generation

### Debugging Commands

```bash
# See the actual vs expected output
LESS_GO_DIFF=1 pnpm -w test:go:filter -- "import-reference"

# Trace execution to see where reference flag gets lost
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "import-reference"

# Full debug mode
LESS_GO_DEBUG=1 LESS_GO_TRACE=1 LESS_GO_DIFF=1 pnpm -w test:go:filter -- "import-reference"
```

## Likely Root Cause

Based on common porting issues:

**Hypothesis 1**: Reference flag not preserved
- The `reference` option is parsed but not stored on the Import node
- Or stored but not passed to the imported ruleset
- Or passed but not checked during CSS generation

**Hypothesis 2**: Ruleset doesn't check reference flag
- The Go `Ruleset.GenCSS()` doesn't check if it's from a referenced import
- JavaScript checks `this.isReferenced` or similar before outputting

**Hypothesis 3**: Flag propagation issue
- Nested imports within a referenced file don't inherit the flag
- Or the flag gets lost when the ruleset is evaluated/cloned

## Implementation Hints

### If Hypothesis 1 is correct:

1. Add/fix a `Reference` field on the `Import` struct
2. Ensure it's populated from options during parsing
3. Pass it to the imported `Ruleset` (maybe via options or a field)

### If Hypothesis 2 is correct:

1. Add a `IsReferenced` or `Reference` field to `Ruleset` struct
2. In `Ruleset.GenCSS()`, check this field before outputting
3. Match the JavaScript logic exactly

### If Hypothesis 3 is correct:

1. Find where rulesets are cloned/evaluated
2. Ensure reference flag is copied
3. Ensure nested imports inherit the flag

## Test Data Location

```
Input:  packages/test-data/less/_main/import-reference.less
Output: packages/test-data/css/_main/import-reference.css

Import test data: packages/test-data/less/_main/import/
```

Examine the `.less` file to understand what it's testing, and the `.css` file to see expected output.

## Success Criteria

- ✅ `import-reference` test shows "Perfect match!"
- ✅ `import-reference-issues` test shows "Perfect match!"
- ✅ All unit tests still pass (`pnpm -w test:go:unit`)
- ✅ No regressions in other import tests
- ✅ Overall success rate increases

## Related Documentation

See the original investigation notes (can be deleted once fixed):
- `/home/user/less.go/IMPORT_REFERENCE_INVESTIGATION.md`

## Historical Context

Previous similar fixes:
- Issue #2: Detached ruleset frame scoping - frames being lost during evaluation
- Issue #6: Mixin closure - flags not being preserved during mixin evaluation

The pattern is often: **flag is set but gets lost during evaluation/cloning**.

## Validation Checklist

Before creating PR:

```bash
# 1. Specific tests pass
pnpm -w test:go:filter -- "import-reference"
# Expected: ✅ import-reference: Perfect match!
# Expected: ✅ import-reference-issues: Perfect match!

# 2. Unit tests pass
pnpm -w test:go:unit
# Expected: All tests pass

# 3. No regressions
pnpm -w test:go:summary | grep "Perfect CSS Matches"
# Expected: Count increases by 2

# 4. Other import tests still work
pnpm -w test:go:filter -- "import"
# Expected: No new failures
```

## Notes

- This is a **high-impact** fix - import reference is a commonly used feature
- The fix should be **minimal** - likely just preserving and checking a flag
- Compare carefully with JavaScript - the logic should match exactly
- Watch for edge cases: nested imports, circular references, CSS imports
