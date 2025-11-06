# Fix namespace value lookups in guard conditions

## Issue
The `namespacing-7` test is failing because guard conditions (`& when`) are not evaluating namespace value lookups correctly, causing all guarded rulesets to be skipped.

**Test file:** `packages/test-data/less/namespacing/namespacing-7.less`

**Current output:**
```css
/* Empty - no output */
```

**Expected output:**
```css
.output {
  a: b;
}
.output-2 {
  c: d;
}
.dr {
  a: b;
}
.dr-2 {
  c: d;
}
```

## Root Cause
Guard conditions like `& when (#ns.options[option])` and `& when (@ns[@options][option] = true)` are not properly evaluating the namespace lookups. The guard evaluation is likely receiving unevaluated NamespaceValue nodes instead of the actual boolean value `true`.

## Test Input Explanation
```less
#ns {
  .options() {
    option: true;  // This should evaluate to true
  }
}

& when (#ns.options[option]) {  // Should evaluate to: when (true)
  .output { a: b; }
}

& when (#ns.options[option] = true) {  // Should evaluate to: when (true = true)
  .output-2 { c: d; }
}
```

## Investigation Steps
1. Check how guard conditions evaluate their condition expressions
2. Trace through how `#ns.options[option]` is evaluated in guard context
3. Verify that NamespaceValue nodes are being evaluated before comparison
4. Check if the issue is in Condition.Eval() or in how guards process their expressions

## Files to Check
- `packages/less/src/less/less_go/condition.go` - Guard condition evaluation
- `packages/less/src/less/less_go/ruleset.go` - Method `matchCondition()` or similar
- `packages/less/src/less/less_go/namespace_value.go` - Ensure proper evaluation
- Look for where guards are processed during evaluation

## Solution Approach
The guard evaluation needs to:
1. Fully evaluate NamespaceValue expressions before checking the condition
2. Extract the actual value from Declaration nodes if that's what namespace lookups return
3. Ensure boolean/keyword values like `true` are properly compared

## Test Command
```bash
go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-7.less
```

Should output 4 rulesets (.output, .output-2, .dr, .dr-2) and skip 2 (.no-reach, .dr-no-reach).
