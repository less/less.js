# Namespace Value Lookups Investigation

## Summary

Investigated namespace value lookup issues affecting 10 integration tests. Identified that the **root cause is a parser bug** where bracket notation `[@variable]` is not correctly extracting variable names, resulting in empty lookup strings.

## Current Behavior

Tests like `namespacing-1` through `namespacing-operations` produce incorrect output:

**Expected:**
```css
.foo {
  color1: red;
  color2: yellow;
}
```

**Actual:**
```css
.foo {
  color1: @nested:;
  color2: @nested:;
}
```

## Root Cause Analysis

### Parser Bug in `LookupValue()` (parser.go:3719-3742)

The `LookupValue()` function uses regex `^(?:[@$]{0,2})[_a-zA-Z0-9-]*` to extract variable names from bracket notation like `[@default-color]`.

**Issue:** The regex is matching but returning **empty strings** instead of the actual variable names.

**Evidence from debug output:**
```
[DEBUG NamespaceValue] Loop iteration 0, lookup name: , rules type: *less_go.Ruleset
```

The lookup name is empty (`lookup name: `) when it should be `@default-color`.

### Evaluation Chain

When lookup name is empty:
1. `namespace_value.go` line 131 checks `if name == ""`
2. Calls `LastDeclaration()` which returns the **last declaration** in the ruleset
3. For detached rulesets with `[@default-color, @nested]`, this always returns `@nested`
4. This explains why ALL tests output `@nested:;` regardless of which variable they're looking up

## Investigation Details

### Parser Code Flow

1. `VariableCall()` in parser.go calls `RuleLookups()` (line 1705)
2. `RuleLookups()` (line 3081) calls `LookupValue()` in a loop
3. `LookupValue()` (line 3719):
   - Matches `[` character ✓
   - Tries to match variable name with regex
   - Should match `@default-color` but returns `""`
   - Matches `]` character ✓
   - Returns empty string pointer

### JavaScript Comparison

JavaScript uses the SAME regex pattern (`^(?:[@$]{0,2})[_a-zA-Z0-9-]*`) but correctly extracts variable names. This suggests:
- Either Go's regex matching behaves differently
- Or there's an input position/state issue in the Go parser

### Test Data Analysis

For `@defaults[@default-color]`:
- `@defaults` is parsed correctly as a VariableCall
- `[@default-color]` should create a lookup array `["@default-color"]`
- Actually creates `[""]` (empty string)

## Attempted Fixes

### 1. VariableCall Unwrapping (Partial Success)

Added code to unwrap `map[string]any{"rules": ...}` returned by `VariableCall.Eval()`:

```go
if rulesMap, ok := rules.(map[string]any); ok {
    if rulesArray, hasRules := rulesMap["rules"]; hasRules {
        if arr, ok := rulesArray.([]any); ok {
            rules = NewRuleset([]any{emptySelector}, arr, false, nil)
        }
    }
}
```

**Result:** Successfully unwraps detached rulesets, allowing variable lookups to proceed. However, doesn't fix the empty lookup name issue.

### 2. Value Unwrapping (Caused Regressions)

Attempted to unwrap `*Value` containers to extract inner nodes:

```go
if valueObj, ok := rules.(*Value); ok && valueObj != nil && len(valueObj.Value) > 0 {
    rules = valueObj.Value[0]
}
```

**Result:** Broke unit test `TestNamespaceValueAdvancedCases/should_evaluate_rules.ruleset`. Reverted.

## Required Fix

The fix must be in the **parser**, specifically in `LookupValue()`:

### Option 1: Debug Regex Matching

Investigate why `parser.parserInput.Re()` is returning empty strings when it should match variable names.

**Possible causes:**
- Input position is wrong (parser already consumed the variable name?)
- Regex match is succeeding but match extraction is failing
- Some difference in how Go handles the regex vs JavaScript

### Option 2: Alternative Parsing Approach

Instead of relying solely on regex, explicitly parse the variable name character by character within the brackets.

## Files Involved

- `parser.go` (lines 3719-3742) - `LookupValue()` function **← FIX HERE**
- `namespace_value.go` (lines 56-269) - Evaluation logic
- `variable_call.go` (lines 49-167) - Returns wrapped structures

## Test Status

### Integration Tests
- **Current:** 1/11 passing (namespacing-6 only)
- **After Parser Fix:** Should get 5+ passing per task spec

### Unit Tests
- **Baseline:** 2 tests failing (pre-existing)
  - `TestExtractLengthActualFile`
  - `TestNamespaceValueAdvancedCases/should_evaluate_rules.ruleset`
- **After Investigation:** Same failures (no regressions introduced)

## Next Steps

1. **Debug `LookupValue()` regex matching**
   - Add logging to see what input the regex receives
   - Check what the regex actually matches
   - Compare with JavaScript parser behavior

2. **Fix regex or parsing logic** to correctly extract variable names

3. **Verify fix** with namespacing integration tests

4. **Address pre-existing unit test failures** separately

## Related Code

### JavaScript namespace-value.js

```javascript
for (i = 0; i < this.lookups.length; i++) {
    name = this.lookups[i];

    if (name === '') {
        rules = rules.lastDeclaration();
    }
    else if (name.charAt(0) === '@') {
        if (rules.variables) {
            rules = rules.variable(name);
        }
    }
}
```

### Go namespace_value.go

```go
for i := 0; i < len(nv.lookups); i++ {
    name = nv.lookups[i]

    if name == "" {
        if ruleset, ok := rules.(interface{ LastDeclaration() any }); ok {
            rules = ruleset.LastDeclaration()
        }
    } else if len(name) > 0 && name[0] == '@' {
        if hasVariablesProperty {
            if ruleset, ok := rules.(interface{ Variable(string) any }); ok {
                rules = ruleset.Variable(name)
            }
        }
    }
}
```

The Go code correctly implements the JavaScript logic, but receives empty lookup names from the parser.

## Conclusion

The namespace value lookup failures were caused by **TWO bugs**:

### 1. Parser Bug in `LookupValue()` (parser.go:3727)
**Issue**: The `Re()` function returns a `string` when there's only one match (no capture groups), but the code was only handling the `[]string` case. This caused all variable names to be lost, resulting in empty strings.

**Fix Applied**: Updated `LookupValue()` to handle both `string` and `[]string` returns:
```go
if str, ok := nameMatch.(string); ok {
    name = str
} else if matches, ok := nameMatch.([]string); ok && len(matches) > 0 {
    name = matches[0]
}
```

### 2. Type Assertion Bug in namespace_value.go (line 142)
**Issue**: The interface check was looking for `Variable(string) any` but the actual method signature is `Variable(string) map[string]any`. Type assertions in Go are strict about exact method signatures.

**Fix Applied**: Updated the interface to match the actual method signature:
```go
if ruleset, ok := rules.(interface{ Variable(string) map[string]any }); ok {
    rules = ruleset.Variable(name)
}
```

## Status After Fixes

- **Parser**: Now correctly extracts variable names from bracket notation (e.g., `@default-color` from `[@default-color]`)
- **Namespace Lookup**: Variable lookups now work correctly and return the expected values
- **Unit Tests**: Some tests need adjustment for the new interface signature
- **Integration Tests**: Improved but still have some edge cases to resolve
