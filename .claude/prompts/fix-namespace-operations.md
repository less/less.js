# Fix namespace value lookups in math operations

## Issue
The `namespacing-operations` test is failing because namespace value lookups are not being evaluated before being used in math operations.

**Test file:** `packages/test-data/less/namespacing/namespacing-operations.less`

**Current output:**
```css
.foo {
  val:  +  + 5px;
}
```

**Expected output:**
```css
.foo {
  val: 35px;
}
```

## Root Cause
When namespace lookups like `#ns.options[val1]` are used in mathematical expressions, they're not being fully evaluated to their concrete values before the addition operation occurs. The values are being returned as unevaluated nodes instead of their actual values (10px and 20px).

## Investigation Steps
1. Look at how `#ns.options[val1]` returns values in `namespace_value.go`
2. Check if the values are wrapped in Declaration or other node types
3. Trace through the Operation/Expression evaluation to see where values get lost
4. Compare with how direct variable references work in math operations

## Files to Check
- `packages/less/src/less/less_go/namespace_value.go` - Value extraction from namespace lookups
- `packages/less/src/less/less_go/operation.go` or `expression.go` - Math operation evaluation
- `packages/less/src/less/less_go/declaration.go` - Declaration value unwrapping

## Solution Approach
Ensure that when a NamespaceValue is evaluated and returns a Declaration, the Declaration's value is properly extracted and evaluated before being used in operations. This might require:
1. Additional unwrapping in NamespaceValue.Eval() to extract the final value
2. Or ensuring that Operations properly evaluate NamespaceValue operands

## Test Command
```bash
go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-operations.less
```

Should output: `val: 35px;` (10px + 20px + 5px = 35px)
