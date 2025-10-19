# 📚 Documentation Index - Less.js Bug Fixes

## Quick Navigation

### 🚀 Start Here
- **[FINAL-SUMMARY.md](./FINAL-SUMMARY.md)** - Complete overview of all work done
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - One-page cheat sheet

### 🐛 Bug Fixes
1. **Line Comments Stripped** - `//` comments no longer appear in CSS
   - [FIXES-SUMMARY.md](./FIXES-SUMMARY.md#fix-3-line-comments--are-now-properly-stripped)
   
2. **Extend Variable Scope Documented** - Why variables don't override
   - [FIXES-SUMMARY.md](./FIXES-SUMMARY.md#fix-4-document-extend-variable-scope-behavior-issue-3706)

### 📖 Detailed Guides
- **[EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md)** - In-depth guide with examples and solutions
- **[COMPILATION-FLOW-DIAGRAM.md](./COMPILATION-FLOW-DIAGRAM.md)** - Visual guide to Less.js compilation phases

### 🔧 Technical Documentation
- **[IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)** - Complete technical implementation details
- **[FIXES-SUMMARY.md](./FIXES-SUMMARY.md)** - All fixes with code examples

### 🧪 Testing
- **[verify-line-comments-fix.js](./verify-line-comments-fix.js)** - Standalone verification script
- Test files in `packages/test-data/less/` and `packages/test-data/css/`

---

## Document Purpose Guide

| Document | Purpose | Audience | Length |
|----------|---------|----------|--------|
| **QUICK-REFERENCE.md** | Quick lookup | All users | 1 page |
| **FINAL-SUMMARY.md** | Project completion | Maintainers | 3 pages |
| **FIXES-SUMMARY.md** | Fix details | Developers | 5 pages |
| **EXTEND-VARIABLE-SCOPE-GUIDE.md** | Deep dive | Developers | 10 pages |
| **COMPILATION-FLOW-DIAGRAM.md** | Visual learning | Developers | 5 pages |
| **IMPLEMENTATION-SUMMARY.md** | Technical specs | Contributors | 7 pages |
| **README-DOCS.md** | This index | All | 1 page |

---

## By Role

### 👤 I'm a User
**Start here:**
1. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Get the essentials
2. [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md) - If you use `:extend()`

### 💻 I'm a Developer
**Start here:**
1. [FIXES-SUMMARY.md](./FIXES-SUMMARY.md) - See what changed
2. [COMPILATION-FLOW-DIAGRAM.md](./COMPILATION-FLOW-DIAGRAM.md) - Understand the internals
3. [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md) - Learn the patterns

### 🔧 I'm a Contributor
**Start here:**
1. [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Technical details
2. [FINAL-SUMMARY.md](./FINAL-SUMMARY.md) - Full project status
3. Source code: `packages/less/src/less/parser/parser-input.js`

### 🎯 I'm a Maintainer
**Start here:**
1. [FINAL-SUMMARY.md](./FINAL-SUMMARY.md) - Project completion status
2. [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Deployment checklist
3. All test files for validation

---

## By Topic

### 📝 Line Comments
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#-bug-fixed-line-comments-not-stripped)
- [FIXES-SUMMARY.md](./FIXES-SUMMARY.md#fix-3-line-comments--are-now-properly-stripped)
- [verify-line-comments-fix.js](./verify-line-comments-fix.js)

### 🔄 Extend & Variables
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#-documented-extend-variable-scope-not-a-bug)
- [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md)
- [COMPILATION-FLOW-DIAGRAM.md](./COMPILATION-FLOW-DIAGRAM.md)

### 🧪 Testing
- [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md#-testing)
- [verify-line-comments-fix.js](./verify-line-comments-fix.js)
- `packages/test-data/less/line-comments/`
- `packages/test-data/less/extend-variable-scope/`

### 🎓 Learning Resources
- [COMPILATION-FLOW-DIAGRAM.md](./COMPILATION-FLOW-DIAGRAM.md) - Visual guide
- [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md#real-world-example) - Practical examples

---

## Common Questions

### "Where do I start?"
👉 [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

### "How do I test the fixes?"
👉 Run: `node verify-line-comments-fix.js`  
👉 See: [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md#-testing)

### "Why doesn't my variable override work in extend?"
👉 [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md#why-this-happens)

### "What are the recommended patterns?"
👉 [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md#recommended-solutions)

### "What changed in the code?"
👉 [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md#-all-files-changedcreated)

### "Is this a breaking change?"
👉 No! See: [FINAL-SUMMARY.md](./FINAL-SUMMARY.md#-impact)

---

## File Structure

```
less.js/
├── README-DOCS.md                        ← YOU ARE HERE
├── QUICK-REFERENCE.md                    ← Start here!
├── FINAL-SUMMARY.md                      ← Project completion
├── FIXES-SUMMARY.md                      ← Fix details
├── EXTEND-VARIABLE-SCOPE-GUIDE.md        ← Deep dive
├── COMPILATION-FLOW-DIAGRAM.md           ← Visual guide
├── IMPLEMENTATION-SUMMARY.md             ← Technical specs
├── verify-line-comments-fix.js           ← Test script
│
└── packages/
    ├── less/
    │   └── src/less/parser/
    │       └── parser-input.js           ← Code changed here
    │
    └── test-data/
        ├── less/
        │   ├── line-comments/            ← Test inputs
        │   └── extend-variable-scope/
        └── css/
            ├── line-comments/            ← Expected outputs
            └── extend-variable-scope/
```

---

## Print-Friendly Documents

Best for printing:
1. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Single page, perfect for desk reference
2. **[COMPILATION-FLOW-DIAGRAM.md](./COMPILATION-FLOW-DIAGRAM.md)** - Visual diagrams for learning

---

## External Links

- [Less.js Official Site](http://lesscss.org/)
- [Less.js GitHub](https://github.com/less/less.js)
- [GitHub Issue #3706](https://github.com/less/less.js/issues/3706)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

## Contributing

Found an issue or have a suggestion?
1. Check [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md#-notes-for-maintainers)
2. Review [EXTEND-VARIABLE-SCOPE-GUIDE.md](./EXTEND-VARIABLE-SCOPE-GUIDE.md#common-questions)
3. Open an issue on GitHub

---

## Version Info

- **Documentation Version:** 1.0
- **Less.js Version:** 4.4.2+
- **Last Updated:** October 19, 2025
- **Status:** ✅ Complete

---

## Quick Actions

```bash
# Test line comment fix
node verify-line-comments-fix.js

# Build project
cd packages/less && npm install && npm run build

# Run tests
cd packages/less && npm test

# Compile example
cd packages/less && node bin/lessc input.less output.css
```

---

**Happy Less Coding! 💙**
