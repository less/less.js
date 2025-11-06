# Claude Code Context for less.go

This file provides context to Claude Code about the less.go project and imports relevant Cursor rules based on the files being worked on.

## Project Overview
This is a fork of less.js being ported to Go. The goal is to maintain 1:1 functionality while following language-specific idioms.

## Always Applied Rules
@.cursor/rules/project-goals-and-conventions.mdc

## Language-Specific Rules

### When working with Go files (*.go)
@.cursor/rules/go-lang-rules.mdc

### When working with JavaScript files (*.js)
@.cursor/rules/javascript-rules.mdc

### When porting JavaScript to Go
@.cursor/rules/porting-process.mdc

## Context Instructions for Claude

When working on this project, please be aware of the following:

**⚠️ CRITICAL VALIDATION REQUIREMENT**: Before creating ANY pull request, you MUST run ALL tests:
- ✅ ALL unit tests: `pnpm -w test:go:unit` (must pass 100%)
- ✅ ALL integration tests: `pnpm -w test:go`
- ✅ Zero regressions tolerance - see `.claude/VALIDATION_REQUIREMENTS.md` for details

1. **File Type Detection**: The rules above should be considered based on the file types you're working with:
   - For `.go` files: Apply Go language rules and conventions
   - For `.js` files: Apply JavaScript rules (remember: never modify original JS files)
   - When porting: Follow the detailed porting process

2. **Core Principles**:
   - Maintain 1:1 functionality between JavaScript and Go versions
   - Avoid external dependencies where possible
   - Follow language-specific idioms and conventions
   - All ported code must pass tests that verify behavior matches the original

3. **Testing**:
   - JavaScript tests use Vitest framework
   - Go tests should verify ported functionality matches JavaScript behavior

4. **Current Integration Test Status** (as of 2025-11-06 - Latest):
   - **20 perfect CSS matches (10.8%)** - stable baseline ✅ ⬆️ +2 from last update!
   - **2 real compilation failures (1.1%)** - import-interpolation, import-module
   - **3 expected compilation failures (1.6%)** - network/path issues (bootstrap4, google, import-remote)
   - **~140 tests with output differences (75.7%)** - compiles but CSS doesn't match
   - **58 correct error handling** - tests that should fail, do fail correctly
   - **5 tests quarantined** (plugin system & JavaScript execution - punted for later)
   - **Overall Success Rate: 42.2%** ⬆️ (78/185 tests passing)

   **🎉 Parser Status: ALL BUGS FIXED!**
   - Parser correctly handles full LESS syntax
   - **180/185 tests compile successfully (97.3% compilation rate)** ⬆️
   - Remaining work is in runtime evaluation and functional implementation

   **Recent Progress** (Runtime Fixes):
   - ✅ Issue #1: `if()` function context passing - FIXED
   - ✅ Issue #1b: Type function wrapping (unit, iscolor, etc.) - FIXED
   - ✅ Issue #2: Detached ruleset variable calls and frame scoping - FIXED
   - ✅ Issue #2b: `functions-each` context propagation and variable scope - FIXED
   - ✅ Issue #4: Parenthesized expression evaluation in function arguments - FIXED
   - ✅ Issue #5: `mixins-named-args` @arguments population for named arguments - FIXED
   - ✅ Issue #6: `mixins-closure`, `mixins-interpolated` - Mixin closure frame capture - FIXED
   - ✅ Issue #7: `mixins` - Mixin recursion detection for wrapped rulesets - FIXED
   - ✅ Issue #8: `namespacing-6` - VariableCall handling for MixinCall nodes - FIXED
   - ✅ Issue #9: DetachedRuleset missing methods - FIXED (regression fix)
   - ✅ Issue #10: Mixin variadic parameter expansion and argument matching - FIXED
   - ✅ Issue #11: `include-path` - Include path option for import resolution - FIXED
   - ✅ Issue #12: `css-guards` - CSS guard evaluation on rulesets - FIXED
   - ✅ Compilation failures reduced from 12 → 2 tests (83% reduction!)

5. **Organized Task System**:
   All project coordination and task management is now organized in the `.claude/` directory:

   - **`.claude/strategy/MASTER_PLAN.md`** - Overall strategy and current status
   - **`.claude/strategy/agent-workflow.md`** - Step-by-step workflow for working on tasks
   - **`.claude/templates/AGENT_PROMPT.md`** - Template for spinning up new agents
   - **`.claude/tasks/runtime-failures/`** - High-priority failing tests (6 tests remaining)
   - **`.claude/tasks/output-differences/`** - Tests that compile but produce wrong CSS (~106 tests)
   - **`.claude/tracking/assignments.json`** - Track which tasks are available/in-progress/completed
   - **`.claude/AGENT_WORK_QUEUE.md`** - Ready-to-assign work for parallel agents

   **If you're working on a specific task**: Check `.claude/tasks/` for detailed task specifications.

   **If you're a new agent**: Start with `.claude/AGENT_WORK_QUEUE.md` for ready-to-assign tasks.

6. **Current Focus: Runtime & Evaluation Issues**:
   - **Runtime tracing available**: Use `LESS_GO_TRACE=1` to debug evaluation flow
   - Compare with JavaScript implementation when fixing issues
   - See `.claude/tasks/` for specific task specifications

   **Priority Order** (High to Low):
   1. **HIGH**: Extend functionality (7 tests) - `.claude/tasks/output-differences/extend-functionality.md`
   2. **HIGH**: Math operations and expressions (10+ tests) - `.claude/tasks/output-differences/math-operations.md`
   3. **HIGH**: Complete import-reference (2 tests) - `.claude/tasks/runtime-failures/import-reference.md`
   4. **MEDIUM**: Namespacing output issues (7 tests) - `.claude/tasks/output-differences/namespacing-output.md`
   5. **MEDIUM**: Remaining guard conditionals (2 tests) - `.claude/tasks/output-differences/guards-conditionals.md`

   **Recently Completed**:
   - ✅ Variable evaluation in functions/loops - FIXED (Issue #2b)
   - ✅ Mixin closure and variable scope - FIXED (Issue #6)
   - ✅ Mixin recursion detection - FIXED (Issue #7)
   - ✅ Basic namespace resolution - FIXED (Issue #8: namespacing-6)
   - ✅ DetachedRuleset missing methods causing regressions - FIXED (Issue #9)
   - ✅ Mixin variadic parameter expansion and argument matching - FIXED (Issue #10)
   - ✅ Include path option for import resolution - FIXED (Issue #11)
   - ✅ CSS guard evaluation on rulesets - FIXED (Issue #12: css-guards)

7. **Quarantined Features** (for future implementation):
   - Plugin system tests (`plugin`, `plugin-module`, `plugin-preeval`)
   - JavaScript execution tests (`javascript`, `js-type-errors/*`, `no-js-errors/*`)
   - Import test that depends on plugins (`import`)
   - These are marked in `integration_suite_test.go` and excluded from test counts

Please review the imported rules above for detailed guidelines specific to the task at hand.