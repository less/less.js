# Task: Fix Mixin Output Issues

**Status**: ✅ COMPLETED
**Priority**: MEDIUM (was 4 tests)
**Estimated Time**: 2-3 hours
**Complexity**: Medium
**Completed**: 2025-11-08
**Updated**: All tests now passing!

## Overview

~~Fix various mixin-related output issues including named arguments, nested mixins, and important flag handling.~~

**UPDATE**: All mixin output issues have been resolved! All tests mentioned below are now passing as perfect CSS matches.

## ✅ COMPLETED Tests

1. ~~`mixins-named-args`~~ - ✅ Perfect match! (was: Missing `text-align` property)
2. ~~`mixins-nested`~~ - ✅ Perfect match! (was: Extra empty ruleset)
3. ~~`mixins-important`~~ - ✅ Perfect match! (was: Important flag not applied correctly)
4. Note: `mixins-args` still has output differences (separate from this task)

## Current Behavior

### mixins-named-args Issue

**Expected**:
```css
.named-arg {
  color: blue;
  width: 5px;
  height: 99%;
  args: 1px 100%;
  text-align: center;
}
```

**Actual**:
```css
.named-arg {
  color: blue;
  width: 5px;
  height: 99%;
  args: 1px 100%;
}
```

The `text-align: center` property is missing.

### mixins-nested Issue

**Expected**:
```css
.class .inner {
  height: 300;
}
.class .inner .innest {
  width: 30;
  border-width: 60;
}
```

**Actual**:
```css
{
  height:  * 10;
}
.class .inner {
  height: 300;
}
```

Extra empty ruleset with wrong calculation appearing.

**Test Command**:
```bash
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-named-args"
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-nested"
```

## Expected Behavior

### Named Arguments (@arguments variable)

When mixins are called with named arguments, the special `@arguments` variable should contain all argument values:

```less
.mixin(@width: 5px, @height: 10px, @align: center) {
  width: @width;
  height: @height;
  text-align: @align;
  args: @arguments;  // Should be: 5px 10px center
}

.foo {
  .mixin(@align: left);  // Named argument
}
```

The `@arguments` variable should include both explicitly passed and default values.

### Nested Mixins

Mixins can contain other mixin calls:

```less
.outer(@factor: 10) {
  .inner {
    height: @factor * 30;
    .mixin-call();
  }
}
```

Should output correctly nested selectors without extra empty rulesets.

### Important Flag

The `!important` flag should propagate to all properties:

```less
.mixin() {
  color: red;
  background: blue;
}

.foo {
  .mixin() !important;  // All properties should get !important
}

// Output:
.foo {
  color: red !important;
  background: blue !important;
}
```

## Investigation Starting Points

### Test Data

```bash
# Examine test inputs
cat packages/test-data/less/_main/mixins-named-args.less
cat packages/test-data/less/_main/mixins-nested.less
cat packages/test-data/less/_main/mixins-important.less

# Expected outputs
cat packages/test-data/css/_main/mixins-named-args.css
cat packages/test-data/css/_main/mixins-nested.css
cat packages/test-data/css/_main/mixins-important.css
```

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/mixin-call.js` - How mixins are called
- `packages/less/src/less/tree/mixin-definition.js` - Mixin evaluation
- `packages/less/src/less/tree/ruleset.js` - How mixin content is included

**Key logic**:
- How `@arguments` is populated from named + default args
- How nested mixin calls are evaluated
- How `!important` is propagated

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/mixin_call.go` - Mixin calling logic
- `packages/less/src/less/less_go/mixin_definition.go` - Mixin evaluation
- `packages/less/src/less/less_go/ruleset.go` - Content generation

### Debugging Commands

```bash
# See differences
LESS_GO_DIFF=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-named-args"

# Trace evaluation
LESS_GO_TRACE=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-nested"

# Compare with JavaScript
cd packages/less && npx lessc test-data/less/_main/mixins-named-args.less -
```

## Likely Root Causes

### For mixins-named-args:

**Issue**: @arguments not populated correctly for named arguments
- When using named args, @arguments may only include explicitly passed values
- Should include both passed values and defaults
- May need to populate @arguments in mixin evaluation

### For mixins-nested:

**Issue**: Nested mixin calls creating extra rulesets
- When a mixin contains another mixin call, output is doubled or malformed
- May be evaluating mixin content incorrectly
- Selector nesting may be wrong

### For mixins-important:

**Issue**: !important not propagated
- Important flag on mixin call not being applied to properties
- Need to mark all declarations as important during mixin evaluation

## Implementation Hints

### For @arguments in named args:

1. In `mixin_definition.go`, find where mixin is evaluated with arguments
2. Create `@arguments` variable from all arguments (named + defaults):
```go
// Collect all argument values (in definition order, not call order)
var argsValues []Node
for _, param := range mixin.Params {
    value := getArgumentValue(param, calledArgs)  // From named args or default
    argsValues = append(argsValues, value)
}

// Create @arguments variable
argumentsVar := NewVariable("@arguments", Expression{Values: argsValues})
frame.Put("@arguments", argumentsVar)
```

3. Ensure this happens for both positional and named argument calls

### For nested mixins:

4. In `mixin_definition.go` or `ruleset.go`, check how nested content is evaluated
5. Ensure that mixin calls inside mixins are evaluated in correct context
6. Check that selectors are properly nested (parent selectors maintained)

### For !important:

7. In `mixin_call.go`, check if `Important` flag is set
8. Pass this flag through to evaluation
9. In `declaration.go` or wherever properties are output, add `!important` to each

## Success Criteria

- ✅ `mixins-named-args` shows "Perfect match!"
- ✅ `mixins-nested` shows "Perfect match!"
- ✅ `mixins-important` shows "Perfect match!"
- ✅ Other mixin tests still pass (no regressions)
- ✅ Unit tests still pass

## Validation Checklist

```bash
# 1. Named args work
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/main/mixins-named-args"
# Expected: ✅ mixins-named-args: Perfect match!

# 2. Nested mixins work
go test -v -run "TestIntegrationSuite/main/mixins-nested"
# Expected: ✅ mixins-nested: Perfect match!

# 3. Important flag works
go test -v -run "TestIntegrationSuite/main/mixins-important"
# Expected: ✅ mixins-important: Perfect match!

# 4. No regressions
go test -v -run "TestIntegrationSuite/main/mixins" && \
go test -v -run "TestIntegrationSuite/main/mixins-closure" && \
go test -v -run "TestIntegrationSuite/main/mixins-pattern"
# Expected: All still perfect matches

# 5. Unit tests
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass
```

## Files Likely Modified

- `mixin_definition.go` - Fix @arguments population and nested evaluation
- `mixin_call.go` - Fix important flag handling
- Possibly `declaration.go` - Apply important flag to properties

## Related Issues

- `mixins-args` (compilation failure) is separate - pattern matching issue
- These tests compile but have output issues
- Other mixin tests work fine, so functionality is mostly there

## Notes

- These are edge cases in otherwise working mixin system
- @arguments with named args is tricky - need to maintain definition order
- Important flag should be simple propagation
- Nested mixins likely a context/frame issue
- Compare carefully with JavaScript for exact behavior
- All these issues are independent, can be fixed separately
