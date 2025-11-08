# Selector Interpolation Issue Investigation

## Problem Summary
The `parse-interpolation` integration test is failing due to incorrect CSS output when selectors contain variable interpolation.

## Symptoms

### 1. Pseudo-classes only on last selector
**Input:**
```less
@inputs: input[type=text], input[type=email], input[type=password], textarea;
@{inputs} { &:focus { foo: bar; } }
```

**Expected Output:**
```css
input[type=text]:focus,
input[type=email]:focus,
input[type=password]:focus,
textarea:focus {
  foo: bar;
}
```

**Actual Output:**
```css
input[type=text], input[type=email], input[type=password], textarea:focus {
  foo: bar;
}
```

### 2. Literal `&` in output
**Input:**
```less
@textClasses: ~'&[class="text"], &.text';
input { @{textClasses} { background: red; } }
```

**Expected Output:**
```css
input[class="text"],
input.text {
  background: red;
}
```

**Actual Output:**
```css
input &[class="text"], &.text {
  background: red;
}
```

### 3. Lost interpolation suffix
**Input:**
```less
@list: apple, satsuma, banana, pear;
@{list} { .fruit-& { content: "test"; } }
```

**Expected Output:**
```css
.fruit-apple,
.fruit-satsuma,
.fruit-banana,
.fruit-pear {
  content: "test";
}
```

**Actual Output:**
```css
.fruit- {
  content: "test";
}
```

## Root Cause Analysis

When selectors contain variable interpolations like `@{inputs}`:

1. **Ruleset.Eval()** evaluates the selector and detects it contains variables
2. **Selector re-parsing** (ruleset.go:420-428): The selector's CSS representation is parsed using `SelectorsParseFunc`
3. **Multiple selectors created**: Comma-separated values create multiple Selector objects
4. **JoinSelectorVisitor runs**: Should join each selector with nested rulesets
5. **Problem**: The nested selectors containing `&` are not being properly joined with ALL parent selectors

The issue appears to be in how:
- The re-parsed selectors' element structure differs from normally parsed selectors
- The `&` parent selector reference is not being recognized/replaced correctly
- Multiple parent selectors are not all participating in the join operation

## Key Code Locations

- `ruleset.go:420-428` - Selector re-parsing after variable evaluation
- `ruleset.go:1620-1893` - JoinSelector logic for combining parent and child selectors
- `join_selector_visitor.go:55-133` - Context building for selector joining
- `selector.go:430-472` - Selector evaluation
- `element.go:137-196` - Element evaluation

## Next Steps

The fix likely requires ensuring that:
1. Re-parsed selectors have the same element structure as originally parsed selectors
2. The `&` is properly recognized as a parent selector reference in re-parsed selectors
3. The JoinSelector logic correctly distributes nested selectors across ALL parent selectors from interpolation

This is a complex issue requiring deep understanding of the selector parsing and joining mechanisms.
