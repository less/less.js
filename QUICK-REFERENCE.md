# Quick Reference Card - Less.js Bug Fixes

## 🐛 Bug Fixed: Line Comments Not Stripped

### What was wrong?
```less
.test {
  color: red; // this comment appeared in CSS output ❌
}
```

### Now fixed!
```css
.test {
  color: red;
}
/* Line comments are properly stripped ✅ */
```

### Where?
- **File**: `packages/less/src/less/parser/parser-input.js`
- **Function**: `$parseUntil`
- **Change**: Added line comment detection and skipping

---

## 📖 Documented: Extend Variable Scope (Not a Bug!)

### What users expected?
```less
@color: red;
a { color: @color; }

.foo {
  &:extend(a all);
  @color: green; // Expected .foo a to be green ❌
}
```

### What actually happens?
```css
a,
.foo a {
  color: red; /* Both are red! */
}
```

### Why?
1. Variables evaluated **BEFORE** extend runs
2. Extend only copies selectors, not re-evaluates values
3. This is **by design** in Less.js architecture

---

## ✅ Solutions for Variable Override

### 🏆 Best: Parameterized Mixin
```less
.a-style(@c: red) { color: @c; }

a { .a-style(); }
.foo a { .a-style(green); }
```
**Output:**
```css
a { color: red; }
.foo a { color: green; }
```

### 🎨 Modern: CSS Custom Properties
```less
a { color: var(--color, red); }
.foo { --color: green; }
```
**Cascades at runtime!**

### 🔧 Simple: Explicit Override
```less
a { color: red; }
.foo a { color: green; }
```
**Works via CSS cascade**

---

## 📂 Files to Know

### Source Code
- `packages/less/src/less/parser/parser-input.js` - Line comment fix

### Tests
- `packages/test-data/less/line-comments/`
- `packages/test-data/less/extend-variable-scope/`

### Documentation
- `FIXES-SUMMARY.md` - All fixes
- `EXTEND-VARIABLE-SCOPE-GUIDE.md` - Detailed guide
- `IMPLEMENTATION-SUMMARY.md` - Complete summary
- `verify-line-comments-fix.js` - Quick test script

---

## 🧪 Quick Test

### Test line comment fix:
```bash
node verify-line-comments-fix.js
```

### Test extend behavior:
```bash
cd packages/less
node bin/lessc ../../packages/test-data/less/extend-variable-scope/extend-variable-scope.less output.css
```

---

## 🚀 Build & Test

```bash
cd packages/less
npm install
npm run build
npm test
```

---

## 💡 Remember

✅ Line comments (`//`) are now stripped in ALL contexts  
✅ Block comments (`/* */`) still work as before  
✅ Extend works on selectors, NOT values  
✅ Use mixins or CSS vars for variable overrides  
✅ This is Less.js 4.4.2+ behavior  

---

## 🔗 Links

- [GitHub Issue #3706](https://github.com/less/less.js/issues/3706)
- [Less.js Docs](http://lesscss.org/)
- [Extend Feature](http://lesscss.org/features/#extend-feature)
- [Mixins](http://lesscss.org/features/#mixins-feature)

---

**Quick Ref Version:** 1.0  
**Date:** October 19, 2025  
**Print this card and keep it handy!** 📋
