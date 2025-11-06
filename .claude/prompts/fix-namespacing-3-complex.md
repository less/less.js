# Fix namespacing-3: Complex nested namespace lookups and media queries

## Issue
The `namespacing-3` test is failing with multiple issues:
1. Missing `@media` query output entirely
2. Math operations showing raw operators instead of results (`0 /2` instead of `0 5px`)
3. Missing `!important` flags on some properties

**Test file:** `packages/test-data/less/namespacing/namespacing-3.less`

**Current output:**
```css
.cell {
  margin: 0 /2 !important;  // Should be: 0 5px !important
}
.class1 {
  color: #33acfe;           // Missing !important
  margin: 20px;             // Missing !important
  padding: 20px;            // Missing !important
  width: 0 !important;
}
.class2 {
  color: #efca44;
  margin: 10px;
  padding: 40px 10px;
  width: 0 !important;
}
```

**Expected output:**
```css
@media (min-width: 320px) {
  .toolbar {
    width: 400px;
    height: 200px;
    background: red;
    color: inherit;
  }
}
.cell {
  margin: 0 5px !important;
}
.class1 {
  color: #33acfe !important;
  margin: 20px !important;
  padding: 20px !important;
  width: 0 !important;
}
.class2 {
  color: #efca44;
  margin: 10px;
  padding: 40px 10px;
  width: 0 !important;
}
```

## Root Causes (Multiple Issues)

### 1. Missing Media Query
The test has a complex media query with nested namespace lookups:
```less
@breakpoints: { mobile: 320px; tablet: 768px; desktop: 1024px; };
@media (min-width: @breakpoints[mobile]) { ... }
```
This entire block is not being output.

### 2. Math Operations
```less
@offset: 5px;
margin: 0 (@offset / 2) !important;  // Currently outputs: 0 /2 !important
```
The division is not being evaluated, suggesting operator precedence or evaluation issues with parenthesized expressions.

### 3. Missing !important Flags
Properties that use `&` (extend) or merging seem to be losing their `!important` flags.

## Investigation Steps

### For Media Query Issue:
1. Check if `@breakpoints[mobile]` is being evaluated in media query context
2. Verify media queries with detached ruleset property access work
3. Look for where media queries are generated/evaluated

### For Math Operation Issue:
1. Check how parenthesized expressions are evaluated
2. Verify division operations work correctly
3. Look for evaluation order issues in expressions with !important

### For !important Issue:
1. Check how !important flags are preserved during mixin/extend operations
2. Verify important scope handling in declaration merging

## Files to Check
- `packages/less/src/less/less_go/media.go` - Media query generation
- `packages/less/src/less/less_go/operation.go` - Math operations
- `packages/less/src/less/less_go/expression.go` - Parenthesized expressions
- `packages/less/src/less/less_go/declaration.go` - !important flag handling
- `packages/less/src/less/less_go/ruleset.go` - Mixin/extend handling

## Solution Approach

**Priority 1:** Fix the missing media query output
- Ensure `@breakpoints[mobile]` evaluates correctly in media query context
- Verify the entire media block is being included in output

**Priority 2:** Fix math operations
- Ensure parenthesized divisions are evaluated before being output
- Check if the issue is specific to expressions with !important

**Priority 3:** Fix !important propagation
- Ensure important flags are preserved through mixin calls and property merging

## Test Command
```bash
go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-3.less
```

This is the most complex test - consider fixing the simpler issues (operations, guard conditions, each()) first, as they may provide insights for this one.

## Note
This test may actually represent 2-3 separate bugs that should be fixed independently:
1. Media queries with detached ruleset property lookups
2. Division operations in parentheses with !important
3. !important flag propagation through mixins
