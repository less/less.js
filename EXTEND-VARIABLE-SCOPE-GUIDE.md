# Understanding :extend() and Variable Scope in Less.js

## The Issue (GitHub #3706)

Many users expect variables defined within an `:extend()` block to override the variable values in the extended selector. However, this does not work as expected:

```less
@color: red;

a {
  color: @color;
}

.foo {
  &:extend(a all);
  @color: green; // ❌ This does NOT make .foo a green
}
```

**Expected Output:**
```css
.foo a { color: green; }
```

**Actual Output:**
```css
a,
.foo a {
  color: red;
}
```

## Why This Happens

Less.js compiles in two distinct phases:

### Phase 1: Evaluation (Variable Resolution)
- All variables are resolved to their final values
- Expressions are evaluated
- Mixins are expanded
- `a { color: @color; }` becomes `a { color: red; }`
- The `@color: green;` in `.foo` is scoped to `.foo` only and doesn't affect `a`

### Phase 2: Selector Extension
- The `:extend()` visitor runs AFTER evaluation
- It only duplicates/rewrites selectors
- No re-evaluation of values occurs
- `.foo a` is created by copying the already-evaluated declarations from `a`

**Key Point:** Extend works on selectors, not on values. Variable scope is resolved during evaluation, before extend runs.

## This is By Design

Changing this behavior would require:
1. Re-evaluating declarations under new variable scopes after extend
2. Potentially breaking existing codebases that rely on current behavior
3. Significant performance impact
4. Complex interactions with other features (mixins, imports, etc.)

The current behavior is consistent with Less's compilation model.

## Recommended Solutions

### Solution 1: Parameterized Mixin ⭐ (Best Practice)

Use a mixin with parameters to create reusable styles that can be customized per context.

```less
@color: red;

// Define a reusable mixin with a parameter
.a-style(@c: @color) {
  color: @c;
}

// Apply with default color
a {
  .a-style();
}

// Apply with custom color
.foo a {
  .a-style(green);
}
```

**Output:**
```css
a {
  color: red;
}
.foo a {
  color: green;
}
```

**Advantages:**
- Clean and maintainable
- Explicit customization points
- Works with all Less features
- No duplication of logic

**When to use:** When you need to share styles with different variable values across multiple contexts.

---

### Solution 2: CSS Custom Properties (CSS Variables)

Leverage native CSS variable cascading instead of Less variables.

```less
a {
  color: var(--a-color, red);
}

.foo {
  --a-color: green;
}
```

**Output:**
```css
a {
  color: var(--a-color, red);
}
.foo {
  --a-color: green;
}
```

The browser will apply `--a-color: green` to `.foo a` through CSS cascade.

**Advantages:**
- Uses native CSS features
- Works at runtime (can be changed with JavaScript)
- No compilation complexity
- Modern and future-proof

**When to use:** When you need runtime variable changes or are building a theme system.

---

### Solution 3: Explicit Override

Explicitly re-declare properties where you need different values.

```less
@color: red;

a {
  color: @color;
}

.foo {
  &:extend(a all);
}

.foo a {
  @color: green;
  color: @color;
}
```

**Output:**
```css
a,
.foo a {
  color: red;
}
.foo a {
  color: green;
}
```

CSS cascade will apply the second rule to `.foo a`.

**Advantages:**
- Simple and straightforward
- Works with existing code
- Clear intent

**Disadvantages:**
- Some duplication
- Specificity considerations

**When to use:** When you have only a few overrides and want simplicity.

---

### Solution 4: Mixin with Extend (Hybrid)

Combine mixins and extend for shared base styles with customizable parts.

```less
// Define base styles
.base-styles() {
  border: 1px solid black;
  padding: 10px;
}

// Apply base to element a
a {
  .base-styles();
  color: red;
}

// Extend for shared styles, override color
.foo a {
  &:extend(a all);
  color: green;
}
```

**Output:**
```css
a,
.foo a {
  border: 1px solid black;
  padding: 10px;
  color: red;
}
.foo a {
  color: green;
}
```

**When to use:** When you have many shared styles but only a few properties need customization.

---

## Comparison Table

| Solution | Complexity | Flexibility | Performance | Best For |
|----------|-----------|-------------|-------------|----------|
| **Parameterized Mixin** | Low | High | Good | Shared component styles |
| **CSS Custom Properties** | Low | Very High | Excellent | Theming, runtime changes |
| **Explicit Override** | Very Low | Low | Good | Simple one-off cases |
| **Mixin + Extend Hybrid** | Medium | Medium | Good | Partial customization |

---

## Anti-Patterns to Avoid

### ❌ DON'T: Expect extend to change variable values
```less
.foo {
  &:extend(a all);
  @color: green; // This won't work
}
```

### ❌ DON'T: Nest extends expecting variable inheritance
```less
.parent {
  @color: blue;
  .child {
    &:extend(a all); // @color: blue won't apply to extended styles
  }
}
```

### ✅ DO: Use mixins for variable customization
```less
.parent {
  @color: blue;
  .child {
    .a-style(@color); // Explicit parameter passing
  }
}
```

---

## Common Questions

### Q: Can I make extend re-evaluate variables?
**A:** No, this would require fundamental changes to Less's architecture and would be a breaking change.

### Q: Is this a bug?
**A:** No, this is expected behavior based on Less's two-phase compilation (eval, then extend).

### Q: What if I have many properties to override?
**A:** Use a parameterized mixin or CSS custom properties. Both scale well.

### Q: Does Sass handle this differently?
**A:** Sass's `@extend` works similarly - it operates on already-evaluated selectors. However, Sass has different scoping rules for variables.

### Q: Should I stop using extend?
**A:** No! Extend is powerful for sharing selector groups. Just use mixins for value customization.

---

## Real-World Example

Let's build a button system:

```less
// Base button styles (shared)
.btn-base {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

// Color mixin (customizable)
.btn-color(@bg, @text) {
  background-color: @bg;
  color: @text;
  
  &:hover {
    background-color: darken(@bg, 10%);
  }
}

// Primary button
.btn-primary {
  &:extend(.btn-base all);
  .btn-color(#007bff, white);
}

// Success button
.btn-success {
  &:extend(.btn-base all);
  .btn-color(#28a745, white);
}

// Custom button in .foo context
.foo .btn-primary {
  .btn-color(#ff6b6b, white); // Different color scheme
}
```

This pattern:
- Shares base styles via extend (no duplication)
- Customizes colors via mixin (flexible)
- Works correctly in all contexts

---

## Summary

- `:extend()` works on selectors, not values
- Variables are resolved before extend runs
- Use **parameterized mixins** for value customization
- Use **CSS custom properties** for runtime theming
- This is by design, not a bug

---

## Additional Resources

- [Less.js Documentation - Extend](http://lesscss.org/features/#extend-feature)
- [Less.js Documentation - Mixins](http://lesscss.org/features/#mixins-feature)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [GitHub Issue #3706](https://github.com/less/less.js/issues/3706)

---

**Last Updated:** October 19, 2025  
**Less.js Version:** 4.4.2+
