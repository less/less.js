# Task: Fix URL Processing

**Status**: Available
**Priority**: High (Runtime Failure)
**Estimated Time**: 1-2 hours
**Complexity**: Medium

## Overview

Fix URL processing so that `url()` functions in LESS are correctly handled - paths should be resolved, quotes should be managed properly, and URL arguments should work.

## Failing Tests

- `urls` (main suite)
- `urls` (static-urls suite)

## Current Behavior

**Error Message**: Likely crashes during URL evaluation or produces malformed URLs

**Test Command**:
```bash
pnpm -w test:go:filter -- "urls"
```

## Expected Behavior

From less.js, URLs work like this:

```less
// Basic URL
background: url('image.png');       // → url('image.png')

// URL with relative path resolution
background: url('../img/pic.png');  // → url('../img/pic.png') (or rewritten)

// URL with variables
@path: 'images/';
background: url('@{path}icon.png'); // → url('images/icon.png')

// URL with urlArgs option
// If urlArgs: '?v=123'
background: url('style.css');       // → url('style.css?v=123')
```

## Investigation Starting Points

### JavaScript Implementation

**Key files to examine**:
- `packages/less/src/less/tree/url.js` - URL node definition and evaluation
- `packages/less/src/less/tree/quoted.js` - How quoted strings in URLs are handled
- `packages/less/src/less/visitors/import-visitor.js` - URL resolution during imports

**Key logic** to understand:
- How URL paths are resolved (relative to what?)
- How `urlArgs` option is applied
- How variable interpolation works in URLs
- When URLs are quoted vs unquoted

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/url.go` - URL node
- `packages/less/src/less/less_go/quoted.go` - Quoted strings
- `packages/less/src/less/less_go/import_manager.go` - Path resolution

**Look for**:
- How `Url.Eval()` is implemented
- How the `Value` field is processed
- How options like `urlArgs` are accessed
- Path resolution logic

### Debugging Commands

```bash
# See the error
pnpm -w test:go:filter -- "urls"

# See output difference
LESS_GO_DIFF=1 pnpm -w test:go:filter -- "urls"

# Trace execution
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "urls"
```

## Likely Root Causes

**Hypothesis 1**: URL value not being evaluated
- The URL might contain a variable reference or expression
- JavaScript evaluates the value field, Go might not
- Or evaluation happens but the result isn't used correctly

**Hypothesis 2**: Path resolution missing
- URLs need their paths resolved relative to the importing file
- JavaScript uses file manager to resolve paths
- Go might be skipping this step

**Hypothesis 3**: urlArgs not being applied
- The `urlArgs` option should append query string to URLs
- JavaScript checks for this option during URL generation
- Go might not implement this

**Hypothesis 4**: Quote handling incorrect
- URLs can be quoted or unquoted
- Different rules for different URL types (imports vs images)
- Go might be adding/removing quotes incorrectly

## Implementation Hints

### URL Evaluation Steps (from JavaScript)

1. **Evaluate the value**:
   - If value is an expression/variable, evaluate it
   - If value is a quoted string, get its content
   - Result is the URL path

2. **Apply urlArgs** (if option is set):
   - Append `?{urlArgs}` to the path
   - But only for certain URL types (not data: URIs, etc.)

3. **Resolve path** (sometimes):
   - For `@import` URLs, resolve relative to current file
   - For `url()` in CSS, may need rewriting based on options
   - Check `rewriteUrls` option

4. **Generate CSS**:
   - Output as `url(path)` or `url('path')`
   - Preserve or add quotes based on content

### Common Patterns

```go
// In url.go Eval method:
func (u *Url) Eval(context any) (any, error) {
    // 1. Evaluate the value
    evaluatedValue := u.Value
    if evaler, ok := u.Value.(interface{ Eval(any) (any, error) }); ok {
        val, err := evaler.Eval(context)
        if err != nil {
            return nil, err
        }
        evaluatedValue = val
    }

    // 2. Get path string
    pathStr := getPathString(evaluatedValue)

    // 3. Apply urlArgs from options
    if urlArgs := getOption(context, "urlArgs"); urlArgs != "" {
        pathStr = pathStr + "?" + urlArgs
    }

    // 4. Create new URL with evaluated value
    return &Url{
        Value: evaluatedValue,
        // ... other fields
    }, nil
}
```

## Test Data Location

```
Input:  packages/test-data/less/_main/urls.less
        packages/test-data/less/static-urls/urls.less

Output: packages/test-data/css/_main/urls.css
        packages/test-data/css/static-urls/urls.css
```

Compare the test inputs to see what patterns are being tested.

## Success Criteria

- ✅ `urls` test in main suite shows "Perfect match!" or significant improvement
- ✅ `urls` test in static-urls suite shows "Perfect match!" or significant improvement
- ✅ All unit tests still pass (`pnpm -w test:go:unit`)
- ✅ No regressions in URL-related tests
- ✅ Overall success rate increases

## Related Tests

These tests might also improve (but focus on failing tests first):
- `url-args` suite (tests urlArgs option specifically)
- `rewrite-urls-all` suite
- `rewrite-urls-local` suite
- `rootpath-rewrite-urls-*` suites

## Historical Context

Previous similar fixes:
- Issue #4: Parenthesized expression evaluation - expressions not being evaluated before use
- Issue #1b: Type function wrapping - functions not being called correctly

The pattern: **Values need evaluation before use**.

## Validation Checklist

Before creating PR:

```bash
# 1. Specific tests improve
pnpm -w test:go:filter -- "urls"
# Expected: Tests pass or show significant improvement

# 2. Unit tests pass
pnpm -w test:go:unit
# Expected: All tests pass

# 3. Check URL-related tests
pnpm -w test:go:filter -- "url"
# Expected: Multiple tests improve

# 4. No regressions
pnpm -w test:go:summary
# Expected: Success rate increases
```

## Edge Cases to Consider

- Data URLs (`url(data:image/png;base64,...)`)
- Absolute URLs (`url(http://example.com/image.png)`)
- Protocol-relative URLs (`url(//example.com/image.png)`)
- URLs with fragments (`url(image.png#hash)`)
- URLs with query strings (`url(image.png?v=1)`)
- Empty URLs (`url()`)

Don't necessarily need to fix all of these, but be aware they exist.

## Notes

- URL handling is surprisingly complex in LESS
- Different options affect URL behavior (`rewriteUrls`, `rootpath`, `urlArgs`)
- The test might be failing on a simple case - fix that first
- Compare very carefully with JavaScript - lots of edge cases
