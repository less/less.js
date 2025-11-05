# Task: Fix Math Operations and Division Modes

**Status**: Available
**Priority**: HIGH (10+ tests affected)
**Estimated Time**: 3-5 hours
**Complexity**: Medium-High

## Overview

Fix math operations (especially division) to respect the different math modes: `strict`, `parens`, `parens-division`, and `always`. Division behavior changes based on mode and whether expressions are parenthesized.

## Failing Tests (Output Differences)

**Math test suites** (once `mixins-args` is fixed):
1. `math-parens/css`
2. `math-parens/media-math`
3. `math-parens/parens`
4. `math-parens-division/media-math`
5. `math-parens-division/new-division`
6. `math-parens-division/parens`
7. `math-always/mixins-guards`
8. `math-always/strict-units`

**Plus in main suite**:
9. `operations`
10. Other tests with math operations

**Note**: The `mixins-args` compilation failure must be fixed first before these tests can run, but the root cause is different (matching vs evaluation).

## Current Behavior

**Example from `media-math` output**:

**Expected**:
```css
@media (min-width: 16 + 1) {
  .foo { bar: 1; }
}
@media (min-width: 16 / 9) {
  .foo { bar: 1; }
}
```

**Actual**:
```css
@media (min-width: 17) {
  .foo { bar: 1; }
}
@media (min-width: 1.7777777777777777) {
  .foo { bar: 1; }
}
```

Math is being evaluated when it shouldn't be in certain contexts (media queries without parens in `parens` mode).

**Test Command**:
```bash
# Once mixins-args is fixed:
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens"
```

## Expected Behavior

### Math Modes

LESS has different math modes that control when operations are evaluated:

#### 1. `strict` mode (deprecated, default in LESS 3.x)
- Math only in parentheses: `(1 + 1)` → `2`
- Without parens: `1 + 1` → `1 + 1`
- All operations: `+`, `-`, `*`, `/`

#### 2. `parens` mode (not deprecated)
- Like strict but division doesn't need parens
- `1 + 1` → `1 + 1`
- `(1 + 1)` → `2`
- `1 / 2` → `0.5` (division always evaluates)

#### 3. `parens-division` mode (recommended, default in LESS 4+)
- Addition/subtraction/multiplication need parens
- Division is literal unless in parens
- `1 + 1` → `1 + 1`
- `1 / 2` → `1 / 2` (for CSS like `font: 16px / 1.5`)
- `(1 / 2)` → `0.5`

#### 4. `always` mode (legacy LESS 2.x)
- All math always evaluates
- `1 + 1` → `2`
- `1 / 2` → `0.5`
- No parens needed

### Special Contexts

Certain CSS contexts have different math behavior:
- **Media queries**: May have different rules
- **Calc()**: Math inside `calc()` shouldn't be pre-evaluated
- **CSS variables**: `var(--foo)` math may have special handling
- **Mixed units**: Some operations shouldn't be allowed

## Investigation Starting Points

### Test Data

```bash
# Look at different math mode tests
cat packages/test-data/less/math/strict/*.less
cat packages/test-data/less/math/parens/*.less
cat packages/test-data/less/math/parens-division/*.less

# Expected outputs
cat packages/test-data/css/math/strict/*.css
cat packages/test-data/css/math/parens/*.css
```

### How Tests Set Math Mode

```bash
# Check test configuration
grep -r "mathMode\|math mode" packages/less/src/less/less_go/integration_suite_test.go
```

Each test suite likely sets a different math mode option.

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/tree/operation.js` - How operations are evaluated
- `packages/less/src/less/tree/dimension.js` - Number operations
- `packages/less/src/less/contexts.js` - Math mode settings
- Look for `strictMath`, `math`, `parensRequired` in code

**Key logic**:
- How Operation.eval() checks if math should be evaluated
- How context.strictMath or context.math affects evaluation
- When parens are required vs optional

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/operation.go` - Operation evaluation
- `packages/less/src/less/less_go/dimension.go` - Number operations
- `packages/less/src/less/less_go/contexts.go` - Math mode settings
- `packages/less/src/less/less_go/paren.go` - Parenthesis handling
- `packages/less/src/less/less_go/math.go` - Math mode logic (if exists)

### Debugging Commands

```bash
# See differences (once mixins-args fixed)
LESS_GO_DIFF=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens/parens"

# Trace evaluation
LESS_GO_TRACE=1 cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens/parens"

# Compare with JavaScript
cd packages/less && npx lessc --math=parens test-data/less/math/parens/parens.less -
```

## Likely Root Causes

### Issue 1: Math mode not checked during evaluation
- Operations always evaluate regardless of math mode setting
- Need to check `context.Math` or similar before evaluating
- Should return unevaluated operation if conditions not met

### Issue 2: Parenthesis context not tracked
- Parens are parsed but don't set a flag in context
- Operation.eval() doesn't know if it's inside parens
- Need `context.InParens` or similar tracking

### Issue 3: Division special handling missing
- Division in different modes should behave differently
- In `parens` mode, division always evaluates
- In `parens-division` mode, only evaluates in parens
- Need special case for `/` operator

### Issue 4: Special contexts (media, calc) not handled
- Media queries may need different math rules
- `calc()` expressions shouldn't pre-evaluate
- Need context flags for these special cases

## Implementation Hints

### Basic Math Mode Check:

1. In `operation.go`, find `Eval()` method
2. Add math mode checking:
```go
func (o *Operation) Eval(context *Context) Node {
    left := o.Left.Eval(context)
    right := o.Right.Eval(context)

    // Check if we should evaluate based on math mode
    switch context.Math {
    case MathAlways:
        // Always evaluate
        return o.performOperation(left, right)

    case MathParens:
        // Only in parens, except division always evaluates
        if context.InParens || o.Op == "/" {
            return o.performOperation(left, right)
        }
        return o  // Return unevaluated

    case MathParensDivision:
        // Only in parens (even division)
        if context.InParens {
            return o.performOperation(left, right)
        }
        return o  // Return unevaluated

    case MathStrict:
        // Legacy, same as parens
        if context.InParens {
            return o.performOperation(left, right)
        }
        return o
    }

    return o
}
```

### Parenthesis Tracking:

3. In `paren.go`, find `Eval()` method
4. Set context flag:
```go
func (p *Paren) Eval(context *Context) Node {
    // Clone context and set flag
    parenContext := context.Clone()
    parenContext.InParens = true

    // Evaluate content with flag set
    result := p.Value.Eval(parenContext)

    return result  // or keep in Paren wrapper depending on needs
}
```

### Context Structure:

5. In `contexts.go`, ensure these fields exist:
```go
type Context struct {
    // ...
    Math     MathMode  // always, parens, parens-division, strict
    InParens bool      // Currently inside parentheses
    // ...
}

type MathMode int

const (
    MathAlways MathMode = iota
    MathParens
    MathParensDivision
    MathStrict
)
```

### Division Special Case:

6. If `parens` mode, division should always evaluate:
```go
if context.Math == MathParens && o.Op == "/" {
    return o.performOperation(left, right)
}
```

## Test Cases Pattern

```less
// parens-division mode (default):
1 + 1          // → "1 + 1"
(1 + 1)        // → "2"
1 / 2          // → "1 / 2"  (for font shorthand)
(1 / 2)        // → "0.5"
1 * 2          // → "1 * 2"
(1 * 2)        // → "2"

// parens mode:
1 + 1          // → "1 + 1"
(1 + 1)        // → "2"
1 / 2          // → "0.5"  (division always evaluates)
(1 / 2)        // → "0.5"

// always mode:
1 + 1          // → "2"
1 / 2          // → "0.5"
(1 + 1)        // → "2"
```

## Success Criteria

- ✅ All tests in `math-parens` suite pass or show perfect match
- ✅ All tests in `math-parens-division` suite pass or show perfect match
- ✅ `operations` test in main suite improves significantly
- ✅ Math respects parentheses correctly in each mode
- ✅ Division has correct behavior per mode
- ✅ Unit tests still pass

## Validation Checklist

```bash
# 1. Math parens suite (once mixins-args fixed)
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/math-parens"
# Expected: All tests compile and most/all perfect matches

# 2. Math parens-division suite
go test -v -run "TestIntegrationSuite/math-parens-division"
# Expected: All tests compile and most/all perfect matches

# 3. Operations test
go test -v -run "TestIntegrationSuite/main/operations"
# Expected: Perfect match or significant improvement

# 4. No regressions
go test -v -run "TestIntegrationSuite/main" 2>&1 | grep "Perfect match" | wc -l
# Expected: No decrease in perfect matches

# 5. Unit tests
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass
```

## Files Likely Modified

- `operation.go` - Add math mode checking
- `paren.go` - Track parenthesis context
- `contexts.go` - Add math mode and InParens fields
- Possibly `dimension.go` - Unit handling for operations
- Possibly `parse.go` - Ensure math mode option is parsed

## Dependencies

- **BLOCKED BY**: `fix-mixin-args` task must complete first
- The mixin matching issue prevents these tests from even running
- Once that's fixed, these tests will compile but have output differences

## Related Issues

- `operations` test in main suite has same root cause
- Mixed unit operations may need additional validation
- Calc() functions may need special handling (separate issue?)

## Notes

- This is a **core LESS feature** - math modes are widely used
- LESS 4.x changed default from `strict` to `parens-division`
- Division is the most complex operator due to CSS `font` shorthand
- Compare very carefully with JavaScript - behavior is subtle
- May need to handle `calc()`, `min()`, `max()` specially (don't pre-evaluate)
- Watch for edge cases: negative numbers, units, colors, etc.
- Some operations (color math) may have separate logic
