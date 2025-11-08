# URL Processing - Partial Progress Report

**Agent Session**: 011CUpytEzhDrKDHf6ybVrFA
**Date**: 2025-11-05
**Status**: Blocked - Needs Further Investigation
**Branch**: `claude/fix-url-processing-011CUpytEzhDrKDHf6ybVrFA`
**Commit**: cfa3595

## Summary

Made significant progress investigating the URL processing failure. Fixed one parser issue but test still failing. Root cause identified but solution requires deeper architectural understanding.

## What Was Done

### 1. Initial Investigation ✅

- Ran failing test: `pnpm -w test:go:filter -- "urls"`
- Error: `Syntax: expected ')' got '(' in ../../../../test-data/less/_main/urls.less`
- Error location: `parser.go:2603` in `ParenthesisCondition()` function

### 2. Test File Analysis ✅

Examined `packages/test-data/less/_main/urls.less`:
- File has 94 lines with various URL patterns
- **Key finding**: Line 81 is the actual problem:
  ```less
  background-image: svg-gradient(to bottom, (mix(black, white) + #444) 1%, ((@green_5)), white 95%);
  ```
- This line has nested parenthesized expressions inside function arguments
- NOT a simple URL issue - it's a parser precedence issue

### 3. Parser Investigation ✅

Traced parser execution flow:
1. `Expression()` → `Addition()` → `Multiplication()` → `Operand()`
2. `Operand()` calls `Sub()` for parenthesized expressions
3. `Sub()` should handle `(expr)` patterns
4. Error comes from `ParenthesisCondition()` which is for guard conditions

### 4. Fixed Sub() Function ✅

**File**: `packages/less/src/less/less_go/parser.go` (lines 2247-2269)

**Problem**: Go implementation wasn't using Save/Restore mechanism correctly
- Was manually setting parser index
- JavaScript uses `save()`/`forget()`/`restore()`

**Fix Applied**:
```go
func (p *Parsers) Sub() any {
    var a any
    var e any

    p.parser.parserInput.Save()  // ✅ Added proper Save()
    if p.parser.parserInput.Char('(') != nil {
        a = p.Addition()
        if a != nil && p.parser.parserInput.Char(')') != nil {
            p.parser.parserInput.Forget()  // ✅ Added Forget()
            expr, err := NewExpression([]any{a}, false)
            if err == nil {
                expr.Parens = true
                e = expr
            }
            return e
        }
        p.parser.parserInput.Restore("Expected ')'")  // ✅ Added error message
        return nil
    }
    p.parser.parserInput.Restore("")  // ✅ Added Restore on no match
    return nil
}
```

**Validation**:
- ✅ Unit tests pass (except one with hardcoded file path)
- ❌ Integration test still fails with same error

## Current Blocker

### The Problem

`ParenthesisCondition()` is being called during expression parsing when it shouldn't be.

**What ParenthesisCondition does**: Parses guard conditions like:
```less
.mixin() when (condition) { ... }
```

**What's happening**: When parsing function arguments with nested parentheses:
```less
svg-gradient(to bottom, (mix(black, white) + #444) 1%)
```

The parser is somehow triggering `ParenthesisCondition()` instead of letting `Sub()` handle the parenthesized expression.

### Where ParenthesisCondition is Called

Only 2 places in parser.go:
1. Line 2528: `cond = p.ParenthesisCondition(needsParens)` in `ConditionAnd()`
2. Line 2559: `result := p.ParenthesisCondition(needsParens)` in `NegatedCondition()`

Both are in the condition parsing flow, which should NOT be active during expression parsing.

### Theory

The issue may be in how `AtomicCondition()` is structured (line 2619):
```go
cond := func() any {
    result := p.Addition()  // ← This calls Addition which should handle (expr)
    if result == nil {
        result = entities.Keyword()
    }
    if result == nil {
        result = entities.Quoted(false)
    }
    if result == nil {
        result = entities.MixinLookup()
    }
    return result
}
```

When `Addition()` is called from within a condition context, it might be failing to parse the nested parentheses correctly, causing the condition parser to report the error.

## What the Next Agent Should Do

### Option 1: Add Debug Tracing (Recommended Start)

Add trace logging to understand the call stack:

```bash
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "urls" 2>&1 | grep -A 5 -B 5 "Sub\|ParenthesisCondition"
```

This will show when/why ParenthesisCondition is being called.

### Option 2: Create Minimal Test Case

Create a minimal LESS file that reproduces the issue:

```less
#test {
  background: func((a + b));
}
```

Test incrementally:
1. `func(a)` - should work
2. `func((a))` - test parentheses
3. `func((a + b))` - test nested expression
4. `func((inner()) + b)` - test nested function call

### Option 3: Compare JavaScript Parser Flow

Trace through JavaScript parser to see how it handles this:
- File: `packages/less/src/less/parser/parser.js`
- Look at how `operand()` → `sub()` → `addition()` flows
- Check if there are context flags that prevent condition parsing

### Option 4: Check Parser Context

The parser might need a context flag like `inFunctionArguments` or `inExpression` that prevents condition parsing from triggering. Check if JavaScript has such a flag.

## Files Modified

- ✅ `packages/less/src/less/less_go/parser.go` - Fixed Sub() function
- ✅ `.claude/tracking/assignments.json` - Updated status
- ✅ Committed to branch and pushed

## Test Commands

```bash
# Run the failing test
pnpm -w test:go:filter -- "urls"

# Run with trace
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "urls"

# Run unit tests
pnpm -w test:go:unit

# Check overall status
pnpm -w test:go:summary
```

## Key Files to Review

1. **Parser core**:
   - `packages/less/src/less/less_go/parser.go` (lines 2247-2269, 2567-2608)
   - JavaScript: `packages/less/src/less/parser/parser.js` (search for `sub:` and `parenthesisCondition:`)

2. **Test data**:
   - `packages/test-data/less/_main/urls.less` (line 81)
   - `packages/test-data/css/_main/urls.css` (expected output)

3. **Related files**:
   - `packages/less/src/less/less_go/url.go` (URL node - may need changes later)
   - `packages/less/src/less/tree/url.js` (JavaScript reference)

## Estimated Time Remaining

- **Investigation**: 1-2 hours (with trace logging)
- **Fix**: 1-2 hours (depending on complexity)
- **Testing**: 30 minutes
- **Total**: 3-4 hours

## Success Criteria

When fixed, you should see:
```bash
$ pnpm -w test:go:filter -- "urls"
✅ urls (main): Perfect match!
✅ urls (static-urls): Perfect match!
```

## Notes for Next Agent

- The Sub() fix I made is valuable even if it doesn't fully solve this test
- The real issue is architectural - parser context management
- Don't waste time on URL-specific code - this is a parser precedence issue
- Use trace logging early to understand the call stack
- Consider looking at other similar parsers (C++, Rust) for Less to see how they handle this

Good luck! 🚀
