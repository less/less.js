# Namespace Test Fixes - Recommended Order

This directory contains targeted prompts for fixing the remaining 5 failing namespace tests. Use these prompts in fresh LLM sessions to systematically fix each issue.

## Current Status
- ✅ **7 tests passing:** namespacing-1, namespacing-2, namespacing-4, namespacing-5, namespacing-6, namespacing-functions
- ❌ **5 tests failing:** namespacing-3, namespacing-7, namespacing-8, namespacing-media, namespacing-operations

## Recommended Fix Order

Work through these in order from simplest to most complex:

### 1. **EASIEST** - Namespace Operations (Estimated: 30-60 min)
**File:** `fix-namespace-operations.md`
**Issue:** Math operations with namespace values not evaluating
**Why first:** Isolated issue, clear root cause, good warm-up task

**Success criteria:**
```less
.foo { val: #ns.options[val1] + @ns[@options][val2] + 5px; }
// Should output: val: 35px;
```

---

### 2. **MEDIUM** - Guard Conditions (Estimated: 1-2 hours)
**File:** `fix-namespace-guard-conditions.md`
**Issue:** Guard conditions not evaluating namespace lookups
**Why second:** Single focused issue, but touches guard evaluation logic

**Success criteria:**
```less
& when (#ns.options[option]) { .output { a: b; } }
// Should output: .output { a: b; }
```

---

### 3. **MEDIUM** - Each() Function (Estimated: 1-2 hours)
**File:** `fix-each-with-detached-rulesets.md`
**Issue:** each() function not iterating over detached rulesets correctly
**Why third:** Important functionality, relatively isolated

**Success criteria:**
```less
each(@vars, { --@{key}: @value; })
// Should output: --background-color: black; --color: #fff;
```

---

### 4. **HARDER** - Namespace Media Queries (Estimated: 2-3 hours)
**File:** `fix-namespace-media-queries.md`
**Issue:** @@variable lookups in namespace context within media queries
**Why fourth:** Combines multiple systems (namespaces, @@variables, media queries)

**Success criteria:**
```less
@media #ns.breakpoint(small)[@max] { ... }
// Should generate proper media query
```

---

### 5. **HARDEST** - Namespacing-3 Complex (Estimated: 3-4 hours)
**File:** `fix-namespacing-3-complex.md`
**Issue:** Multiple issues - missing media queries, math ops, !important flags
**Why last:** Actually 2-3 separate bugs, most complex test

**Success criteria:**
- Media query with namespace lookup in condition
- Math operations: `0 (@offset / 2)` evaluates correctly
- !important flags preserved through mixins

**Note:** Consider splitting this into separate tasks for each sub-issue.

---

## Usage Instructions

For each fix:

1. **Copy the full prompt content** from the respective `.md` file
2. **Start a fresh LLM session** with the less.go codebase
3. **Paste the prompt** to get focused help on that specific issue
4. **Test thoroughly:**
   ```bash
   # Run the specific test
   go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-X.less

   # Run all unit tests
   pnpm -w test:go:unit

   # Run full integration suite
   pnpm -w test:go
   ```
5. **Commit when passing:**
   ```bash
   git add .
   git commit -m "Fix namespacing-X: [brief description]"
   git push -u origin [branch-name]
   ```

## Total Estimated Time
- **Minimum:** 7.5 hours (if everything goes smoothly)
- **Realistic:** 10-15 hours (accounting for debugging and iterations)
- **Maximum:** 20 hours (if issues are more complex than anticipated)

## Tips

- **Start fresh:** Each prompt is designed to be self-contained for a new LLM session
- **One at a time:** Don't try to fix multiple issues in one session
- **Test frequently:** Run tests after each change to catch regressions early
- **Read the investigation notes:** Each prompt includes specific files to check and debugging approaches
- **Reference JavaScript:** The prompts point to the equivalent JavaScript code for comparison
- **Use trace mode:** Set `LESS_GO_TRACE=1` for detailed debugging output when needed

## After All Fixes

When all 5 tests pass:
- Run full test suite to verify no regressions
- Update CLAUDE.md with new test counts
- Consider creating a summary PR if these were done in separate branches

---

## Quick Reference

| Test | File | Difficulty | Est. Time | Issue Type |
|------|------|------------|-----------|------------|
| namespacing-operations | `fix-namespace-operations.md` | ⭐ Easy | 30-60m | Value evaluation |
| namespacing-7 | `fix-namespace-guard-conditions.md` | ⭐⭐ Medium | 1-2h | Guard evaluation |
| namespacing-8 | `fix-each-with-detached-rulesets.md` | ⭐⭐ Medium | 1-2h | Loop function |
| namespacing-media | `fix-namespace-media-queries.md` | ⭐⭐⭐ Hard | 2-3h | Media queries |
| namespacing-3 | `fix-namespacing-3-complex.md` | ⭐⭐⭐⭐ Very Hard | 3-4h | Multiple bugs |

Good luck! 🚀
