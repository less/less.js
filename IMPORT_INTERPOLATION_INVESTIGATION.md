# Import Interpolation Bug Investigation

**⚠️ SUPERSEDED - See `.claude/tasks/runtime-failures/import-interpolation.md` for current task**

> **Note**: This file contains historical investigation notes showing this is an architectural issue.
> For current task (if/when ready to tackle), see: **`.claude/tasks/runtime-failures/import-interpolation.md`**
> This file can be deleted once the import-interpolation task is completed.

**Bug**: BUG-002: import-interpolation
**Status**: ⏸️ **DEFERRED - Skip for now, revisit after frame/context architecture refactored**
**Date**: 2025-11-01 (Initial Investigation), 2025-11-03 (Deferred Decision)
**Test File**: `packages/test-data/less/_main/import-interpolation.less`

---

## ⚠️ CURRENT STATUS (2025-11-03)

**Decision**: This bug is being **DEFERRED** until the frame/context architecture is refactored.

**Reason**: After 3 separate implementation attempts (documented below), each caused identical regressions in error detection tests. The root cause is architectural - modifying `Quoted.Eval()` to work with `*Eval.Frames` (changing from `[]ParserFrame` to `[]any`) breaks error propagation in unexpected ways.

**Action Items**:
1. ✅ Keep this document for reference
2. ✅ Updated PARSER_BUGS.md to mark BUG-002 as deferred
3. ✅ Focus on other parser bugs (BUG-003/004, BUG-009, BUG-008, BUG-001)
4. 🔄 Revisit after refactoring `*Ruleset` to properly implement `ParserFrame` interface
5. 🔄 Revisit after standardizing `*Eval.Frames` to use `[]ParserFrame` consistently

**Partial Progress Preserved**:
- ✅ `isVariableImport()` now detects `*Import` structs correctly
- ✅ Import sequencer properly defers variable imports
- ✅ Basic infrastructure in place for future fix

---

## Problem Statement

Variable interpolation in Less import paths (e.g., `@import "path/@{variable}.less"`) is not working in the Go port. The test case expects variables to be resolved before the import path is processed.

### Test Input
```less
@my_theme: "test";

@import "import/import-@{my_theme}-e.less";
@import "import/import-@{in}@{terpolation}.less";
@import "import/interpolation-vars.less";
```

### Expected Behavior
- First import should resolve to `import/import-test-e.less`
- Second import has forward references and should be deferred until variables are available
- Third import loads additional variables

### Current Behavior
Import paths are not being evaluated for variable interpolation, resulting in file-not-found errors.

---

## Root Cause Analysis

### The Import Processing Flow

1. **Parser** creates `*Import` structs with `*Quoted` path nodes
2. **ImportVisitor.VisitImport()** checks if import contains variables via `isVariableImport()`
3. Variable imports are deferred via `ImportSequencer.AddVariableImport()`
4. **ImportVisitor.processImportNode()** calls `evalForImport()` to evaluate the import path
5. **Import.EvalForImport()** calls `Quoted.Eval()` to resolve `@{variable}` interpolations

### Key Components

#### 1. Import Struct (`import.go`)
```go
type Import struct {
    path     any  // Usually *Quoted
    // ...
}

func (i *Import) IsVariableImport() bool {
    if quotedPath, ok := path.(*Quoted); ok {
        return quotedPath.ContainsVariables()  // Checks for @{...} pattern
    }
    return true  // Conservative default
}

func (i *Import) EvalForImport(context any) *Import {
    // Evaluates path.Eval(context) to resolve variables
}
```

#### 2. ImportVisitor Helpers (`import_visitor.go`)
```go
func (iv *ImportVisitor) isVariableImport(node any) bool {
    // Only handles map-based nodes, NOT *Import structs
    if n, ok := node.(map[string]any); ok {
        // ...
    }
    return false
}

func (iv *ImportVisitor) evalForImport(node any, context *Eval) any {
    // Only handles map-based nodes, NOT *Import structs
}
```

**Problem**: Parser creates `*Import` structs, but helpers only handle map-based nodes.

#### 3. Quoted.Eval() (`quoted.go`)
```go
func (q *Quoted) Eval(context any) (any, error) {
    // Get frames from context
    var frames []ParserFrame
    if evalCtx, ok := context.(interface{ GetFrames() []ParserFrame }); ok {
        frames = evalCtx.GetFrames()
    }
    // ...
}
```

**Problem**: `*Eval` context has `Frames []any`, not `[]ParserFrame`, so frame access fails.

---

## Three Attempted Solutions

### Attempt 1: Add *Import Support + Modify Quoted.Eval() for *Eval

**Changes**:
1. Added `*Import` handling to `isVariableImport()` and `evalForImport()`
2. Modified `Quoted.Eval()` to accept `*Eval` context with `[]any` frames
3. Added duck-typing for frame variable lookup

**Results**:
- ✅ Variable interpolation worked (`@{my_theme}` → "test")
- ✅ Unit tests passed
- ❌ **REGRESSION**: `import-subfolder1` and `property-in-root2` compiled when they should error
- ❌ Net: 68 passing (down from 69 baseline)

### Attempt 2: Same Approach with Better Logging

**Changes**:
- Same as Attempt 1, but added debug logging to trace execution
- Added `*Expression` handling for `Value.Eval()` results

**Results**:
- ✅ Variable resolution improved
- ✅ `@{my_theme}` correctly resolved to "test"
- ❌ **SAME REGRESSION**: Lost 2 error tests
- ❌ Net: 68 passing

### Attempt 3: Minimal Changes with Duck-Typing

**Changes**:
1. Added ONLY `*Import` support to helpers (no logging)
2. Changed `Quoted.Eval()` frames from `[]ParserFrame` to `[]any` with duck-typing
3. Added `*Expression` and direct `*Quoted` handling for `Value.Eval()` results

**Results**:
- ✅ Unit tests passed
- ✅ Variable imports correctly detected
- ✅ Import sequencing worked
- ❌ **SAME REGRESSION**: import-subfolder1 and property-in-root2 regression
- ❌ Net: 68 passing

---

## Critical Finding: The Persistent Regression

All three attempts caused the **exact same regression**:

### Failing Tests
- `import-subfolder1.less`: Should error with "mixin-not-defined is undefined" but compiles successfully
- `property-in-root2.less`: Should error with "Properties must be inside selector blocks" but compiles successfully

### What These Tests Do
```less
// import-subfolder1.less
@import "imports/import-subfolder1.less";
  // → imports "subfolder/mixin-not-defined.less"
  //   → imports "../../mixin-not-defined.less" (doesn't exist)
  //     → Should ERROR calling undefined mixin

// property-in-root2.less
@import "property-in-root";
  // → Has property at root level
  //   → Should ERROR "properties must be inside selector blocks"
```

### The Mystery

**Key Observation**: Adding `*Import` struct support to helpers alone does NOT cause the regression. The regression only occurs when `Quoted.Eval()` is modified to work with `*Eval.Frames` (changing from `[]ParserFrame` to `[]any`).

**Hypothesis**: The frame type change somehow interferes with error detection during import evaluation, possibly by:
1. Changing how variables are resolved during error conditions
2. Affecting the evaluation order or context
3. Causing errors to be swallowed or transformed into successful compilations

---

## What Works vs. What Doesn't

### ✅ Works Without Regression
- Adding `*Import` support to `isVariableImport()` and `evalForImport()`
- Detecting variable imports correctly
- Import sequencing (deferred vs immediate)
- `*Expression` and `*Quoted` handling in `Quoted.Eval()`

### ❌ Causes Regression
- Changing `Quoted.Eval()` frames from `[]ParserFrame` to `[]any`
- Adding `*Eval` context support to frame access
- Any modification that allows `Quoted.Eval()` to access `*Eval.Frames`

---

## Technical Debt & Design Issues

### 1. Type Inconsistency
- `*Eval` has `Frames []any`
- `ParserFrame` interface expects specific methods
- `*Ruleset` doesn't fully implement `ParserFrame` (method signature mismatch)
- Tests use `MockEvalContext` with `[]ParserFrame`

### 2. Dual Node Representation
- Parser creates `*Import` structs
- ImportVisitor helpers expect map-based nodes
- Visitor pattern not consistently applied

### 3. Duck-Typing Fragility
- Frame iteration uses duck-typing to check for `Variable()` method
- Changes to frame handling affect error propagation in unexpected ways

---

## Recommended Next Steps

### Option 1: Deep Debug Investigation (High Effort)
1. Add comprehensive logging to trace:
   - Import evaluation lifecycle
   - Frame population and access
   - Error propagation through import chain
   - Variable resolution timing
2. Compare JavaScript and Go execution flows step-by-step
3. Identify where error detection breaks with `[]any` frames

### Option 2: Refactor Frame Handling (Medium Effort)
1. Make `*Ruleset` properly implement `ParserFrame`
2. Standardize `*Eval.Frames` to use `[]ParserFrame`
3. Update all frame consumers to use interface consistently
4. Revisit import-interpolation with clean types

### Option 3: Alternative Approach (Low Effort)
1. Pre-process import paths separately before ImportVisitor
2. Resolve variables in a dedicated pass
3. Avoid modifying `Quoted.Eval()` frame handling

### Option 4: Defer Fix (Current Decision)
- Mark import-interpolation as complex/blocked
- Focus on easier parser bugs first (comments2, import-options, detached-rulesets)
- Revisit after more codebase understanding

---

## Lessons Learned

1. **Frame Type Matters**: The type of frames (`[]ParserFrame` vs `[]any`) has non-obvious effects on error detection
2. **Regression Consistency**: Same regression across 3 different implementations suggests fundamental design issue
3. **Import Complexity**: Import processing involves multiple coordinated systems (sequencing, evaluation, visitor pattern)
4. **Error Propagation**: Changes to core types like `Quoted.Eval()` can break error detection in distant code paths

---

## Current Baseline

**Test Results**: 69/185 passing (37.3%)
- 11 Perfect CSS matches
- 58 Correct error handling
- 88 Output differs
- 28 Failing tests

**Status**: All changes reverted, baseline restored
