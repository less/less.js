# Import Reference Test Investigation

**Date**: 2025-11-04
**Status**: Partial Fix Applied, Further Investigation Needed
**Test**: `import-reference`
**Error**: `open test.css: no such file or directory`

## Summary

Investigation into the `import-reference` test failure revealed a critical bug in how CSS imports are detected in `import_visitor.go`. A fix was applied that corrects the type checking logic, though the specific test still requires additional work.

## Critical Bug Found & Fixed ✅

### Location
`packages/less/src/less/less_go/import_visitor.go` - `processImportNode()` method, lines 186-210

### The Bug
```go
// OLD CODE (BUGGY):
evaldCSS := iv.getProperty(evaldImportNode, "css")
isCSS := evaldCSS != nil && evaldCSS.(bool)
```

**Problem**: The code used `getProperty()` which only works for map-based nodes. However, `evaldImportNode` is actually an `*Import` struct, so `getProperty()` always returned `nil`, making `isCSS` always `false`. This caused **all CSS imports to be processed when they should have been skipped**.

### The Fix
```go
// NEW CODE (FIXED):
isCSS := false
cssUndefined := false
if evaldImp, ok := evaldImportNode.(*Import); ok {
    // Handle Import struct directly
    isCSS = evaldImp.css
    cssUndefined = false
} else {
    // Handle map-based nodes
    evaldCSS := iv.getProperty(evaldImportNode, "css")
    if evaldCSS == nil {
        cssUndefined = true
        isCSS = false
    } else {
        cssUndefined = false
        isCSS = evaldCSS.(bool)
    }
}
```

**Impact**: This fix ensures CSS imports are correctly detected regardless of whether they're represented as `*Import` structs or map-based nodes.

### Related Improvements

Also improved `VisitImport()` to handle both Import struct and map-based import nodes:

```go
// Handle Import struct directly
if imp, ok := importNode.(*Import); ok {
    if imp.options != nil {
        if inline, hasInline := imp.options["inline"].(bool); hasInline {
            inlineCSS = inline
        }
    }
    css = imp.css
} else if node, ok := importNode.(map[string]any); ok {
    // Handle legacy map-based Import nodes
    // ... (map handling code)
}
```

## Test Results

### Unit Tests: ✅ PASS
All unit tests pass with no regressions:
```bash
pnpm -w test:go:unit
# Result: PASS - All tests passing
```

### Integration Test: ❌ STILL FAILING
```bash
pnpm -w test:go:filter -- "import-reference"
# Error: open test.css: no such file or directory
```

## Why the Test Still Fails

Despite the fix, the `import-reference` test still fails with the same error. Investigation revealed:

1. **The visitor code is never reached for test.css** - Debug output showed `VisitImport` is never called for the problematic import
2. **Error happens during parsing, not visiting** - The error occurs before the import visitor runs
3. **Nested import issue** - The test imports `css-import.less` with `@import (reference)`, which itself contains `@import url("test.css")`

## How JavaScript Handles This

From `packages/less/src/less/tree/import.js`:

```javascript
genCSS(context, output) {
    if (this.css && this.path._fileInfo.reference === undefined) {
        output.add('@import ', this._fileInfo, this._index);
        this.path.genCSS(context, output);
        // ...
        output.add(';');
    }
}
```

**Key insight**: CSS imports are **never loaded from disk** in JavaScript. They're kept as Import AST nodes and only output during CSS generation.

## Files Modified

1. **`packages/less/src/less/less_go/import_visitor.go`**
   - Lines 79-113: Enhanced `VisitImport()` to handle Import structs
   - Lines 143-156: Enhanced `processImportNode()` inline CSS detection
   - Lines 192-210: **CRITICAL FIX** - Proper CSS detection for Import structs

2. **`packages/less/src/less/less_go/import.go`**
   - Lines 47-105: **NEW FIX** - Enhanced CSS detection in `NewImport` to handle:
     - `*Quoted` objects that weren't unwrapped by `GetPath()`
     - `*Anonymous` nodes used by evaluated imports
     - This fixes the issue where `EvalForImport()` creates new Import with evaluated path

## Latest Investigation (2025-11-04 Session 2)

### Key Discovery: CSS Detection Bug in EvalForImport

Found critical issue where CSS detection fails after `EvalForImport()`:

1. **Initial Import Creation** (during parsing):
   - Parser creates Import with path = `URL(Quoted("test.css"))`
   - `GetPath()` unwraps correctly: URL → Quoted → string "test.css" ✓
   - CSS regex matches, sets `css = true` ✓

2. **After EvalForImport** (during import visitor):
   - `EvalForImport()` evaluates path and creates NEW Import with path = `Quoted("test.css")`
   - `GetPath()` can't unwrap Quoted because `GetValue()` signature doesn't match interface ✗
   - Returns Quoted object instead of string
   - CSS detection fails, `css` stays `false` ✗
   - ImportVisitor tries to load the file!

### Attempted Fix

Modified `NewImport` to explicitly handle:
- `*Quoted` objects
- `*Anonymous` nodes (used by some evaluated imports)

### Current Status

Test still fails - `processImportNode` is never called for test.css, suggesting the error occurs earlier in the process, possibly during parsing or initial import loading.

### Theory

The error may be occurring when `css-import.less` is being loaded and parsed. Even though it's imported with `@import (reference)`, the parser might be creating Import nodes that trigger file loading before the ImportVisitor can process them.

## Next Steps for Debugging

### Recommended Command for Fresh Session

```bash
# Run the test with visual diff
pnpm -w test:go:filter -- "import-reference"

# Check the test files
cat packages/test-data/less/_main/import-reference.less
cat packages/test-data/less/_main/import/css-import.less
cat packages/test-data/css/_main/import-reference.css

# Key question to answer:
# Why is test.css being loaded during parse instead of being kept as an Import node?
```

### Investigation Areas

1. **Parser Behavior**: Check if the parser is trying to load CSS files immediately
   - Look at `packages/less/src/less/less_go/parser.go` around lines 2218 and 2904 where `NewImport` is called

2. **ImportManager.Push()**: Check if CSS imports should be skipped earlier
   - File: `packages/less/src/less/less_go/import_manager.go` line 192+
   - JavaScript reference: `packages/less/src/less/import-manager.js` line 40+

3. **Nested Imports with Reference**: Investigate how `@import (reference)` should affect nested imports
   - When `css-import.less` is imported with `(reference)`, should its CSS imports also be treated specially?

### Alternative Tests to Try

If `import-reference` remains too complex, try these simpler failing tests instead:

```bash
# Namespace resolution (may be simpler)
pnpm -w test:go:filter -- "namespacing-6"

# URL processing
pnpm -w test:go:filter -- "urls"

# Mixin arguments
pnpm -w test:go:filter -- "mixins-args"
```

## Key Learnings

1. **Type Assertions Matter**: The Go code uses both `*Import` structs and `map[string]any` representations. Always check both types.

2. **JavaScript is Source of Truth**: When in doubt, check the JavaScript implementation in `packages/less/src/less/tree/` and `packages/less/src/less/visitors/`

3. **CSS Imports Are Special**: They should NOT be loaded from disk, just kept as AST nodes and output during generation

4. **Test Incrementally**: The `import-reference` test involves multiple layers (reference imports, nested imports, CSS imports). Simpler tests may be easier to fix first.

## Success Criteria for Complete Fix

- [ ] Test compiles successfully
- [ ] No file loading errors for CSS imports
- [ ] CSS output matches expected
- [ ] All unit tests still pass
- [ ] No regressions in other tests

## References

- JavaScript Import: `packages/less/src/less/tree/import.js`
- JavaScript ImportVisitor: `packages/less/src/less/visitors/import-visitor.js`
- JavaScript ImportManager: `packages/less/src/less/import-manager.js`
- Go Import: `packages/less/src/less/less_go/import.go`
- Go ImportVisitor: `packages/less/src/less/less_go/import_visitor.go`
- Go ImportManager: `packages/less/src/less/less_go/import_manager.go`
