# Fix each() function with detached ruleset iteration

## Issue
The `namespacing-8` test is failing because the `each()` function is not properly iterating over detached ruleset properties, resulting in malformed CSS variable declarations.

**Test file:** `packages/test-data/less/namespacing/namespacing-8.less`

**Current output:**
```css
:root {
  --:;
}
:root {
  --:;
}
```

**Expected output:**
```css
:root {
  --background-color: black;
  --color: #fff;
}
```

## Root Cause
The `each()` function is being called with a detached ruleset but is not correctly:
1. Extracting the key-value pairs from the detached ruleset
2. Making `@key` and `@value` variables available in the iteration callback
3. The interpolation `--@{key}` is outputting empty instead of the property names

## Test Input Explanation
```less
@vars: {
  background-color: black;
  color: contrast($background-color, #000, #fff);
}

:root {
  each(@vars, {
    --@{key}: @value;  // For each property in @vars, create CSS var
  });
}
```

Expected behavior:
- First iteration: `@key = "background-color"`, `@value = black`
- Second iteration: `@key = "color"`, `@value = #fff` (from contrast() function)

## Investigation Steps
1. Find the `each()` function implementation in Go
2. Check how it handles detached rulesets vs arrays
3. Verify that `@key` and `@value` variables are being set in the iteration context
4. Check if the iteration callback is receiving the correct frames/context

## Files to Check
- `packages/less/src/less/less_go/functions_list.go` or similar - each() implementation
- Compare with JavaScript: `packages/less/src/less/functions/list.js` - search for `each` function
- `packages/less/src/less/less_go/mixin_call.go` - How the callback ruleset is evaluated

## JavaScript Reference
The JavaScript `each()` function should:
1. Handle both arrays and detached rulesets (objects)
2. For rulesets: iterate over rules, setting `@key` to rule name and `@value` to rule value
3. Evaluate the callback ruleset once per iteration with proper scope

## Solution Approach
1. Ensure `each()` recognizes detached rulesets and extracts their properties
2. Create proper variable bindings for `@key` and `@value` in each iteration
3. Evaluate the callback ruleset with these variables in scope
4. Verify interpolation `@{key}` can access the key variable

## Test Command
```bash
go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-8.less
```

Should output proper CSS custom properties with names and values.
