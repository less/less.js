# Master Strategy: Parallelized Test Fixing for less.go

## Current Status (Updated: 2025-11-05)

### Test Results Summary
- **Total Active Tests**: 185 (7 quarantined for plugins/JS execution)
- **Perfect CSS Matches**: 14 tests (7.6%)
- **Correct Error Handling**: 56 tests (30.3%)
- **Output Differs**: 102 tests (55.1%) - Compiles but CSS output differs
- **Runtime Failures**: 12 tests (6.5%) - Crashes during evaluation
- **Overall Success Rate**: 38.4% (71/185)
- **Compilation Rate**: 92.4% (171/185)

### Parser Status
✅ **ALL PARSER BUGS FIXED!** The parser correctly handles full LESS syntax. All remaining work is in **runtime evaluation and functional implementation**.

## Strategy Overview

This document outlines a strategy for **parallelizing the work** of fixing remaining test failures by enabling multiple independent AI agents to work on different issues simultaneously.

### Core Principles

1. **Independent Work Units**: Each task is self-contained with clear success criteria
2. **Minimal Human Intervention**: Agents pull repo, fix issues, test, and create PRs autonomously
3. **No Conflicts**: Tasks are designed to minimize merge conflicts
4. **Incremental Progress**: Small, focused changes that can be validated independently
5. **Clear Documentation**: All context needed for each task is provided

## Work Breakdown Structure

### Phase 1: Runtime Failures (12 tests) - HIGHEST PRIORITY
**Impact**: Blocking bugs that prevent tests from completing
**Estimated**: 6-8 independent tasks
**Location**: `.claude/tasks/runtime-failures/`

Priority order:
1. **Import reference functionality** (2 tests: `import-reference`, `import-reference-issues`)
2. **Namespace resolution** (2 tests: `namespacing-6`, `namespacing-functions`)
3. **URL processing** (2 tests: `urls` in different suites)
4. **Mixin arguments** (2 tests: `mixins-args` variants)
5. **Include path resolution** (1 test: `include-path`)
6. **Import interpolation** (1 test: `import-interpolation` - architectural, may defer)
7. **Bootstrap integration** (1 test: `bootstrap4` - large test, do last)

### Phase 2: Output Differences by Category (102 tests) - MEDIUM PRIORITY
**Impact**: Features work but produce incorrect output
**Estimated**: 12-15 category-based tasks
**Location**: `.claude/tasks/output-differences/`

Categories:
1. **Extend functionality** (8 tests: `extend-*`)
2. **Guards and conditionals** (4 tests: `*-guards*`)
3. **Math operations** (6 tests: `math-*`, `operations`)
4. **Namespacing** (10 tests: `namespacing-*`)
5. **Import handling** (3 tests: `import-*`)
6. **Media queries** (2 tests: `media*`)
7. **Compression/minification** (1 test: `compression`)
8. **URL rewriting** (8 tests: `*urls*`)
9. **Variables** (3 tests: `variables*`)
10. **Comments** (2 tests: `comments*`)
11. **Functions** (2 tests: `functions*`)
12. **Other** (~53 tests: various smaller issues)

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
- [ ] Reduce runtime failures from 12 → 0
- [ ] Increase success rate from 38.4% → 60%
- [ ] Fix all import/reference issues
- [ ] Fix all namespace resolution issues

**Medium-term goals** (next month):
- [ ] Reduce output differences from 102 → <50
- [ ] Increase success rate from 60% → 85%
- [ ] Complete all extend functionality fixes
- [ ] Complete all guard/conditional fixes

**Long-term goals** (next 2 months):
- [ ] All 185 active tests passing (100%)
- [ ] Implement quarantined features (plugins, JS execution)
- [ ] All 192 tests passing

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

### Recent Progress (Past Week)

- ✅ Fixed `if()` function context passing (Issue #1)
- ✅ Fixed type function wrapping (Issue #1b)
- ✅ Fixed detached ruleset variable calls and scoping (Issue #2)
- ✅ Fixed `each()` function context propagation (Issue #2b)
- ✅ Fixed parenthesized expression evaluation (Issue #4)
- ✅ Fixed `@arguments` variable population (Issue #5)
- ✅ Fixed mixin closure frame capture (Issue #6)
- ✅ Fixed mixin recursion detection (Issue #7)
- 📈 **Compilation rate improved from 90.3% → 92.4%**
- 📈 **Runtime failures reduced from 18 → 12 tests**
- 📈 **Perfect matches increased from 8 → 14 tests**

See `RUNTIME_ISSUES.md` for detailed analysis of each fix (this file should be deleted once all runtime issues are resolved).

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
