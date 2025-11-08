# Master Strategy: Parallelized Test Fixing for less.go

## Current Status (Updated: 2025-11-08)

### Test Results Summary
- **Total Active Tests**: 184 (5 quarantined for plugins/JS execution)
- **Perfect CSS Matches**: 47 tests (25.5%) ⬆️ +13 from documented status!
- **Correct Error Handling**: 39 tests (21.2%)
- **Output Differs**: 45 tests (24.5%) - Compiles but CSS output differs
- **Real Compilation Failures**: 0 tests (0%) - ALL FIXED! 🎉
- **Expected Compilation Failures**: 3 tests (1.6%) - Network/path issues (bootstrap4, google, import-module)
- **Overall Success Rate**: 46.7% (86/184) ⬆️
- **Compilation Rate**: 98.4% (181/184) ⬆️

### Parser Status
✅ **ALL PARSER BUGS FIXED!** The parser correctly handles full LESS syntax. All remaining work is in **runtime evaluation and CSS output generation**.

## Strategy Overview

This document outlines a strategy for **parallelizing the work** of fixing remaining test failures by enabling multiple independent AI agents to work on different issues simultaneously.

### Core Principles

1. **Independent Work Units**: Each task is self-contained with clear success criteria
2. **Minimal Human Intervention**: Agents pull repo, fix issues, test, and create PRs autonomously
3. **No Conflicts**: Tasks are designed to minimize merge conflicts
4. **Incremental Progress**: Small, focused changes that can be validated independently
5. **Clear Documentation**: All context needed for each task is provided

## Work Breakdown Structure

### Phase 1: Compilation Failures - ✅ COMPLETE!
**Status**: ALL real compilation failures fixed! 🎉

**Remaining expected failures** (infrastructure/external, not bugs):
- `bootstrap4` - requires external bootstrap dependency
- `google` - requires network access to Google Fonts
- `import-module` - requires node_modules resolution (low priority)

### Phase 2: Output Differences by Category (~45 tests remaining) - IN PROGRESS
**Impact**: Features work but produce incorrect output
**Location**: `.claude/tasks/output-differences/`

**Completed Categories** ✅:
1. ~~**Namespacing**~~ - 10/10 tests passing! (namespacing-1 through 8, functions, operations)
2. ~~**Guards and conditionals**~~ - 3/3 tests passing! (css-guards, mixins-guards, mixins-guards-default-func)
3. ~~**Extend functionality**~~ - 6/7 tests passing! (only extend-chaining remains)
4. ~~**Colors**~~ - 2/2 tests passing! (colors, colors2)
5. ~~**Compression**~~ - 1/1 test passing! (compression)

**Remaining Categories**:
1. **Math operations** (~6 tests: math suite tests with output diffs)
2. **URL rewriting** (~7 tests: all `*urls*` tests)
3. **Import handling** (~3 tests: `import-reference`, `import-reference-issues`, `import-inline`)
4. **Formatting/Comments** (~6 tests: `comments`, `whitespace`, `parse-interpolation`, `variables-in-at-rules`)
5. **Mixin issues** (~1 test: `mixins-nested`)
6. **Detached rulesets** (~1 test: `detached-rulesets`)
7. **Functions** (~2 tests: `functions`, `functions-each`)
8. **Other** (~19 tests: various smaller issues)

### Phase 3: Polish & Edge Cases - LOWER PRIORITY
**Impact**: Minor issues, edge cases
**Location**: `.claude/tasks/polish/`

Tasks TBD based on progress from Phases 1-2.

## Task Assignment System

### How to Claim a Task

1. Check `.claude/tracking/assignments.json` for available tasks
2. Agent claims task by updating the JSON file
3. Agent creates a feature branch: `claude/fix-{task-name}-{session-id}`
4. Agent works on the task independently
5. Agent runs tests to validate fix
6. Agent commits, pushes, and creates PR
7. Agent updates `assignments.json` to mark task complete

### Task States

- `available`: No one working on this task yet
- `in-progress`: Agent actively working (includes agent session ID and timestamp)
- `completed`: PR created and merged
- `blocked`: Depends on another task or has technical blockers

## Success Criteria

### For Individual Tasks

Each task must:
- ✅ Fix the specific test(s) identified in the task
- ✅ Pass all existing unit tests (no regressions)
- ✅ Not break any currently passing integration tests
- ✅ Include clear commit message explaining the fix
- ✅ Follow the porting process (never modify original JS code)

### For Overall Project

**Short-term goals** (next 2 weeks):
- [x] ~~Reduce compilation failures from 5 → 2~~ ✅ ACHIEVED!
- [x] ~~Increase success rate to 42%~~ ✅ ACHIEVED!
- [x] ~~Fix all guards and conditionals issues~~ ✅ ACHIEVED!
- [x] ~~Complete all namespacing fixes~~ ✅ ACHIEVED! (10/10 tests)
- [x] ~~Fix compilation failures from 2 → 0~~ ✅ ACHIEVED!
- [x] ~~Complete extend functionality fixes~~ ✅ MOSTLY DONE! (6/7 tests, only extend-chaining remains)
- [x] ~~Increase success rate from 42% → 46.7%~~ ✅ ACHIEVED!
- [ ] Reach 50% success rate (need +6 perfect matches)
- [ ] Fix all math operations issues
- [ ] Fix all URL rewriting issues

**Medium-term goals** (next month):
- [ ] Reduce output differences from 45 → <25
- [ ] Increase success rate from 46.7% → 65%
- [ ] Complete all import/reference handling fixes
- [ ] Complete all formatting/comment fixes
- [ ] Complete all function implementation gaps

**Long-term goals** (next 2 months):
- [ ] All 185 active tests passing (100%)
- [ ] Implement quarantined features (plugins, JS execution)
- [ ] All 190 tests passing

## Testing & Validation

### Required Test Commands

Before creating PR, agents must run:

```bash
# 1. All unit tests (must pass - no regressions allowed)
pnpm -w test:go:unit

# 2. Specific test being fixed (must show improvement)
pnpm -w test:go:filter -- "test-name"

# 3. Full integration suite summary (check overall impact)
pnpm -w test:go:summary
```

### Debug Tools Available

```bash
LESS_GO_TRACE=1   # Enhanced execution tracing with call stacks
LESS_GO_DEBUG=1   # Enhanced error reporting
LESS_GO_DIFF=1    # Visual CSS diffs
pnpm -w test:go:debug  # All debug features combined
```

## Merge Conflict Prevention

### Strategies

1. **File-level isolation**: Each task focuses on specific Go files
2. **Test-level isolation**: Different tests → different code paths
3. **Category-based grouping**: Related fixes grouped to share context
4. **Clear ownership**: One agent per task at a time
5. **Frequent syncs**: Agents pull latest changes before starting
6. **Small PRs**: Fast review and merge cycle

### High-Risk Files (coordinate carefully)

These files are touched by many fixes - coordinate in `assignments.json`:
- `ruleset.go` - Core ruleset evaluation
- `mixin_call.go` - Mixin resolution and calling
- `import.go` / `import_visitor.go` - Import handling
- `call.go` - Function calls

## Agent Onboarding

See `.claude/templates/AGENT_PROMPT.md` for the standard prompt to use when spinning up new agents.

## Project Structure Reference

```
less.go/
├── .claude/                    # Project coordination (THIS IS WHERE YOU ARE)
│   ├── strategy/              # High-level strategy docs
│   ├── tasks/                 # Individual task specifications
│   ├── templates/             # Agent prompts and templates
│   └── tracking/              # Assignment tracking
├── packages/less/src/less/less_go/  # Go implementation (EDIT THESE)
├── packages/test-data/        # Test input/output (DON'T EDIT)
├── packages/less/src/less/    # Original JS (NEVER EDIT)
├── RUNTIME_ISSUES.md          # Detailed issue tracking (DELETE when done)
└── CLAUDE.md                  # Project overview for Claude
```

## Communication & Updates

### Status Updates

Agents should update `.claude/tracking/assignments.json` at these milestones:
- Task claimed
- Significant progress (e.g., identified root cause)
- Blockers encountered
- PR created
- PR merged

### Human Escalation

Contact human maintainer if:
- Task blocked on architectural decision
- Multiple approaches possible (need direction)
- Merge conflict can't be resolved automatically
- Test failure seems like test bug (not implementation bug)
- Original JavaScript behavior unclear

## Historical Context

### Recent Progress (Past 2 Weeks)

**Week 1 (2025-10-23 to 2025-10-30)**:
- ✅ Fixed `if()` function context passing (Issue #1)
- ✅ Fixed type function wrapping (Issue #1b)
- ✅ Fixed detached ruleset variable calls and scoping (Issue #2)
- ✅ Fixed `each()` function context propagation (Issue #2b)
- ✅ Fixed parenthesized expression evaluation (Issue #4)
- ✅ Fixed `@arguments` variable population (Issue #5)
- ✅ Fixed mixin closure frame capture (Issue #6)
- ✅ Fixed mixin recursion detection (Issue #7)
- 📈 Compilation rate improved from 90.3% → 92.4%
- 📈 Runtime failures reduced from 18 → 12 tests
- 📈 Perfect matches increased from 8 → 14 tests

**Week 2 (2025-10-31 to 2025-11-06)**:
- ✅ Fixed namespace variable resolution (Issue #8: namespacing-6)
- ✅ Fixed DetachedRuleset missing methods regression (Issue #9)
- ✅ Fixed mixin variadic parameter expansion (Issue #10)
- ✅ Fixed guard evaluation for Keyword comparisons
- ✅ Fixed import reference visibility filtering
- ✅ Fixed mixin division matching
- 📈 **Compilation rate improved from 92.4% → 97.3%** 🎉
- 📈 **Compilation failures reduced from 12 → 5 tests (2 real bugs)**
- 📈 **Perfect matches increased from 14 → 20 tests** 🎉
- 📈 **Overall success rate improved from 38.4% → 42.2%**

**Week 3 (2025-11-07 to 2025-11-08)**:
- ✅ **ALL NAMESPACING COMPLETE**: Fixed remaining 9 namespacing tests (10/10 now passing)
- ✅ **ALL GUARDS COMPLETE**: Fixed css-guards and mixins-guards tests (3/3 now passing)
- ✅ **EXTEND NEAR COMPLETE**: Fixed 5 additional extend tests (6/7 now passing)
- ✅ Fixed selector interpolation and visibility issues
- ✅ Fixed !important flag propagation in mixins
- ✅ Fixed comment placement in @keyframes
- ✅ Fixed variable interpolation in at-rules
- ✅ Fixed each() function iteration
- ✅ Fixed parser regression with @{} pattern
- ✅ Fixed import-inline media query handling
- 📈 **Compilation rate improved from 97.3% → 98.4%** 🎉
- 📈 **ALL real compilation failures eliminated (5 → 0)!** 🎉🎉🎉
- 📈 **Perfect matches increased from 20 → 47 tests (+135% improvement!)** 🎉
- 📈 **Overall success rate improved from 42.2% → 46.7%**

## Next Steps

1. **Review task files** in `.claude/tasks/` to understand available work
2. **Check assignments** in `.claude/tracking/assignments.json`
3. **Claim a task** by updating the JSON file
4. **Follow agent workflow** in `.claude/strategy/agent-workflow.md`
5. **Use agent prompt** from `.claude/templates/AGENT_PROMPT.md`
6. **Create PR** when task complete
7. **Update tracking** when done

---

**Remember**: The goal is a faithful 1:1 port of less.js to Go. When in doubt, compare with the JavaScript implementation and match its behavior exactly.
