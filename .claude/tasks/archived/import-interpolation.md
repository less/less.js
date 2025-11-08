# Task: Fix Import Interpolation

**Status**: Available (but consider deferring)
**Priority**: Medium (Architectural complexity)
**Estimated Time**: 3-4 hours
**Complexity**: High

## ⚠️ Warning: Architectural Issue

This task involves an architectural challenge with variable interpolation in import paths. It may require refactoring how imports are processed. Consider tackling simpler runtime failures first.

## Overview

Fix import interpolation so that variable interpolation in `@import` paths works correctly:

```less
@path: "subfolder/";
@import "@{path}file.less";  // Should import from subfolder/file.less
```

## Failing Test

- `import-interpolation` (main suite)

## Current Behavior

**Error**: Import path with interpolation is not being resolved correctly. The variable is either not evaluated before the import, or the import happens at the wrong time.

**Test Command**:
```bash
pnpm -w test:go:filter -- "import-interpolation"
```

## Expected Behavior

1. Variables used in import paths should be evaluated **before** the import is processed
2. The resolved path should then be used for the import
3. The behavior should match JavaScript exactly

## The Architectural Challenge

From the investigation notes (see `/IMPORT_INTERPOLATION_INVESTIGATION.md`), the issue is:

**In JavaScript**:
- Imports are collected during parsing
- They're processed by import visitor
- Variables in import paths are evaluated at the right time
- The evaluation context includes variables from parent scope

**In Go**:
- Import paths might be processed before variable evaluation
- Or the evaluation context might not include the right variables
- The timing of when imports are resolved vs when variables are evaluated is misaligned

This might require changing **when** imports are processed in the Go port.

## Investigation Starting Points

### Historical Investigation

See `/IMPORT_INTERPOLATION_INVESTIGATION.md` for detailed analysis. Key findings:
- This was marked as "deferred" after initial investigation
- The issue is in the evaluation/import timing, not the parser
- Requires understanding the full import processing pipeline

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/import.js` - Import node
- `packages/less/src/less/visitors/import-visitor.js` - Import processing
- `packages/less/src/less/import-manager.js` - Import resolution

**Key questions**:
- When are import paths evaluated for variables?
- What context is used for that evaluation?
- How does JavaScript ensure variables are available?

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/import.go`
- `packages/less/src/less/less_go/import_visitor.go`
- `packages/less/src/less/less_go/import_manager.go`

### Debugging Commands

```bash
# See the error
LESS_GO_DEBUG=1 pnpm -w test:go:filter -- "import-interpolation"

# Trace to understand timing
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "import-interpolation"
```

## Likely Root Causes

**Hypothesis 1**: Import path evaluated too early
- The path string is processed before variables are available
- Need to defer path evaluation until variable context is ready

**Hypothesis 2**: Wrong evaluation context
- Import path is evaluated in a context that doesn't include the variables
- Need to pass the right frames/scope when evaluating the path

**Hypothesis 3**: Interpolation not being applied
- The `@{path}` syntax isn't being recognized or processed in import paths
- Parser might handle it differently than in other contexts

## Implementation Approach

### Option 1: Defer Import Path Evaluation

1. During parsing, keep import path as unevaluated expression
2. In import visitor, evaluate the path expression with full context
3. Then resolve the import with the evaluated path

### Option 2: Ensure Correct Context

1. Find where import path is evaluated
2. Ensure the evaluation context includes parent scope variables
3. Similar to how mixin closure works (Issue #6)

### Option 3: Two-Pass Import Processing

1. First pass: Collect imports but don't resolve paths
2. Evaluation phase: Evaluate variables
3. Second pass: Resolve import paths and load files

## Why This Might Be Deferred

This task was previously marked "deferred" because:
- It might require significant refactoring of the import pipeline
- Other runtime failures are simpler and higher impact
- The fix might be clearer after other import issues are resolved

**Recommendation**: Fix `import-reference` and other simpler import issues first. Come back to this after those are working.

## Success Criteria

- ✅ `import-interpolation` test shows "Perfect match!"
- ✅ All unit tests still pass
- ✅ Other import tests not affected
- ✅ Overall success rate increases

## Test Data Location

```
Input:  packages/test-data/less/_main/import-interpolation.less
Output: packages/test-data/css/_main/import-interpolation.css
```

## Validation Checklist

Before creating PR:

```bash
# 1. Specific test passes
pnpm -w test:go:filter -- "import-interpolation"
# Expected: ✅ import-interpolation: Perfect match!

# 2. All unit tests pass
pnpm -w test:go:unit

# 3. All import tests still work
pnpm -w test:go:filter -- "import"

# 4. No regressions
pnpm -w test:go:summary
```

## Notes

- This is **complex** - don't feel bad about deferring it
- May become easier after other import fixes
- Architectural changes need careful review
- Compare very carefully with JavaScript timing/flow
- Consider asking for human guidance if stuck

## Related Tasks

Should be done **after**:
- `import-reference` - Simpler import issue
- Other import-related fixes

Might help with:
- Understanding overall import flow
- Fixing other variable interpolation issues
