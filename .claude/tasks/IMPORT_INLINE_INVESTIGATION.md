# Import-Inline Media Query Bug Investigation

## Problem Statement

The `import-inline` test is failing because inline CSS imports with media queries are not generating CSS output.

**Test file**: `/home/user/less.go/packages/test-data/less/_main/import-inline.less`

**Failing line**:
```less
@import (inline) url("import/import-test-d.css") (min-width:600px);
```

**File being imported** (`import/import-test-d.css`):
```css
#css { color: yellow; }
```

**Expected output**:
```css
#import {
  color: red;
}
@media (min-width: 600px) {
  #css { color: yellow; }

}
this isn't very valid CSS.
```

**Actual output** (media query block is missing):
```css
#import {
  color: red;
}
this isn't very valid CSS.
```

## Previous Work

### PR #91 (Commit 6136506)
Fixed parameter passing to `NewMedia` by passing `i._index` and `i._fileInfo` instead of `0` and `nil`. However, the commit message explicitly states: *"The import-inline test still fails. Further investigation needed to determine why Media nodes from inline imports aren't generating CSS output. The issue appears to be in Media evaluation or CSS generation, not in the NewMedia construction itself."*

### Current Investigation Findings

1. **Media.GenCSS() IS being called** - Debug output confirmed that the Media node's GenCSS method is invoked during output generation

2. **Features extraction complexity** - The evaluated `features` from imports comes as a `*Paren` object containing a `*Value` object, which itself contains the actual media query expressions

3. **Double-wrapping issue suspected** - When features are extracted from `*Paren` and passed to `NewMedia`, the constructor wraps them in another `*Value`, potentially creating incorrect nesting

4. **Working manual test** - A standalone Go program that manually creates the same Media structure DOES generate correct output, suggesting the issue is in how Import.DoEval constructs or passes the features

## Key Code Locations

### 1. Import.DoEval - Where inline imports create Media nodes
**File**: `packages/less/src/less/less_go/import.go`
**Lines**: 440-460 (inline imports) and 479-495 (regular imports with features)

Current code (lines 447-457):
```go
if features != nil {
    // Match JavaScript: new Media([contents], this.features.value)
    var featuresValue any = features
    if featuresMap, ok := features.(map[string]any); ok {
        if val, exists := featuresMap["value"]; exists {
            featuresValue = val
        }
    } else if featuresWithValue, ok := features.(interface{ GetValue() any }); ok {
        featuresValue = featuresWithValue.GetValue()
    }
    return NewMedia([]any{contents}, featuresValue, i._index, i._fileInfo, nil), nil
}
```

**The Issue**: When `features` is a `*Paren`, the current extraction logic doesn't handle it properly. The `*Paren` contains a `*Value` object, and we need to extract the underlying value array.

### 2. NewMedia Constructor
**File**: `packages/less/src/less/less_go/media.go`
**Lines**: 16-60

The constructor wraps the features parameter in a `*Value`:
```go
// Match JavaScript: this.features = new Value(features)
featuresValue, _ := NewValue(features)
```

### 3. Media.GenCSS
**File**: `packages/less/src/less/less_go/media.go`
**Lines**: 386-408

Generates the `@media` CSS output. This IS being called, so the node exists in the tree.

### 4. JavaScript Reference
**File**: `packages/less/src/less/tree/import.js`
**Line**: 167

JavaScript does:
```javascript
return this.features ? new Media([contents], this.features.value) : [contents];
```

The key is `this.features.value` - it extracts the `.value` property.

## Debug Information Collected

### Features Object Structure (from debug output)
```
DEBUG DoEval: i.features = &{Node:0xc000357980 Value:[0xc0005bd110]} (type: *less_go.Value)
DEBUG DoEval: features after eval = &{Node:0xc000354540 Value:0xc0004b5b80} (type: *less_go.Paren)
```

So the flow is:
1. `i.features` starts as `*Value` with an array value
2. After `.Eval()`, it becomes a `*Paren`
3. The `*Paren.Value` is `0xc0004b5b80` (likely another `*Value`)

### Media.GenCSS Debug Output
One of the Media nodes has:
```
m.Features=*less_go.Paren: &{Node:0xc0002bd500 Value:0xc0003c70e0}
```

This suggests a `*Paren` object is still in `m.Features`, which means the extraction didn't work.

## Attempted Fixes (That Didn't Work)

### Attempt 1: Extract from *Value
```go
if val, ok := features.(*Value); ok {
    featuresValue = val.Value
}
```
Didn't work because features is a `*Paren`, not `*Value`.

### Attempt 2: Extract from *Paren
```go
if paren, ok := features.(*Paren); ok {
    featuresValue = paren.Value
}
```
This extracts to a `*Value`, but then `NewMedia` wraps it in ANOTHER `*Value`, creating double-wrapping.

### Attempt 3: Double extraction
```go
// Extract from *Paren
if paren, ok := features.(*Paren); ok {
    featuresValue = paren.Value
}
// Then extract from *Value
if val, ok := featuresValue.(*Value); ok {
    featuresValue = val.Value
}
```
Still didn't work - test still fails.

## Hypotheses for Root Cause

### Hypothesis 1: The Media node isn't in the output tree
**Status**: DISPROVEN - Media.GenCSS() is being called

### Hypothesis 2: Features are incorrectly structured
**Status**: LIKELY - The features may be double-wrapped or have incorrect structure that prevents proper CSS generation

### Hypothesis 3: The Media node is returned but not added to parent
**Status**: POSSIBLE - Check how `Import.Eval()` returns the Media node and how `Ruleset.EvalImports()` handles it

### Hypothesis 4: Visibility/reference import blocking
**Status**: POSSIBLE - Check if the Media node is being marked as hidden due to reference import logic

## Recommended Next Steps

### Step 1: Understand Paren.Value structure
Look at the `Paren` type definition and understand what `Value` contains:
```bash
grep -A 20 "^type Paren struct" packages/less/src/less/less_go/*.go
```

### Step 2: Compare with working Media nodes
Add debug output in Media.GenCSS() to compare:
- A working media query (from a regular `@media` rule)
- The failing inline import media query

Compare the `m.Features` structure between them.

### Step 3: Check JavaScript Paren handling
Look at how JavaScript handles `Paren` evaluation:
```bash
grep -A 10 "Paren.prototype.eval" packages/less/src/less/tree/*.js
```

### Step 4: Trace the full evaluation flow
Add comprehensive debug logging:
1. In `Import.DoEval()` - log the exact structure of `features` before and after extraction
2. In `NewMedia()` - log what gets passed and what `featuresValue` becomes
3. In `Media.Eval()` - log how features are transformed
4. In `Media.GenCSS()` - log the final features structure

### Step 5: Check if the issue is in Media.Eval() not Import
The Media node might be created correctly, but `Media.Eval()` might be transforming it incorrectly. Look at:
```go
// packages/less/src/less/less_go/media.go lines 410-507
func (m *Media) Eval(context any) (any, error)
```

Specifically check if inline import Media nodes go through a different evaluation path.

## How to Test

### Run the specific failing test:
```bash
pnpm -w test:go -- -run "TestIntegrationSuite/main/import-inline$"
```

### Check test output:
The test output shows expected vs actual. The media query block should appear between the first import and the invalid CSS text.

### Add debug output:
```go
// In import.go DoEval, around line 447
fmt.Printf("DEBUG: features type=%T, value=%+v\n", features, features)
if paren, ok := features.(*Paren); ok {
    fmt.Printf("  Paren.Value type=%T, value=%+v\n", paren.Value, paren.Value)
}

// In media.go GenCSS, around line 387
fmt.Printf("DEBUG Media.GenCSS: Features type=%T\n", m.Features)
if val, ok := m.Features.(*Value); ok {
    fmt.Printf("  Value.Value=%+v\n", val.Value)
}
```

### Create a minimal reproduction test:
Create a standalone Go test that:
1. Parses `@import (inline) url("test.css") (min-width:600px);`
2. Evaluates it
3. Generates CSS
4. Checks if the media query appears

## Critical Questions to Answer

1. **What is the exact type structure** of `features` after evaluation? Is it `*Paren{Value: *Value{Value: []any{...}}}`?

2. **What does NewMedia expect?** Does it expect the raw array `[]any{...}` or does it expect a `*Value`?

3. **How do regular @media rules work?** Compare the features structure of a working `@media (min-width: 600px) { ... }` rule

4. **Is the Media node actually in the output tree?** Or is it being filtered out somewhere?

5. **What does the JavaScript code actually pass?** Look at the exact JavaScript implementation of how `this.features.value` is extracted

## Files to Review

- `packages/less/src/less/less_go/import.go` - Import evaluation
- `packages/less/src/less/less_go/media.go` - Media node implementation
- `packages/less/src/less/less_go/paren.go` - Paren type definition
- `packages/less/src/less/less_go/value.go` - Value type definition
- `packages/less/src/less/tree/import.js` - JavaScript reference
- `packages/less/src/less/tree/media.js` - JavaScript Media implementation
- `packages/less/src/less/tree/paren.js` - JavaScript Paren implementation

## Success Criteria

The test passes when running:
```bash
pnpm -w test:go -- -run "TestIntegrationSuite/main/import-inline$"
```

Expected output in test results:
```
✅ import-inline: Perfect match!
```

And the actual CSS output includes:
```css
@media (min-width: 600px) {
  #css { color: yellow; }

}
```

## Additional Context

- This is a Go port of less.js
- The goal is 1:1 functionality with the JavaScript version
- The parser works correctly (the import is parsed)
- The evaluation creates a Media node
- The Media.GenCSS() method is called
- But somehow the output is missing

**The bug is subtle and likely involves the exact structure/nesting of Value/Paren/Expression objects.**

## Current Git State

- Branch: `claude/fix-inline-import-media-queries-011CUuVZ9TJewC5KgGhR5zaq`
- Last commit: 6136506 (Fix import inline CSS: Pass correct index and fileInfo to NewMedia)
- No uncommitted changes (investigation was cleaned up)

## Validation Requirements

Before creating a PR:
- ✅ Run ALL unit tests: `pnpm -w test:go:unit` (must pass 100%)
- ✅ Run ALL integration tests: `pnpm -w test:go`
- ✅ Zero regressions tolerance
- See `.claude/VALIDATION_REQUIREMENTS.md` for details
