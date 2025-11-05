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

4. **Current Integration Test Status** (as of 2025-11-04):
   - **71/185 tests passing (38.4%)** - UP from 70!
   - 15 perfect CSS matches (8.1%) - UP from 14!
   - 56 correct error handling (30.3%)
   - 102 tests with output differences (55.1%) - **compiles but CSS doesn't match**
   - 12 tests failing (6.5%) - **runtime/evaluation errors, NOT parser errors** - DOWN from 13!
   - 7 tests quarantined (plugin system & JavaScript execution - punted for later)

   **🎉 Parser Status: ALL BUGS FIXED!**
   - Parser correctly handles full LESS syntax
   - **171/185 tests compile successfully (92.4% compilation rate)**
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
   - ✅ Compilation rate improved from 90.3% → 92.4%
   - ✅ Runtime failures reduced from 18 → 12 tests

5. **Organized Task System**:
   All project coordination and task management is now organized in the `.claude/` directory:

   - **`.claude/strategy/MASTER_PLAN.md`** - Overall strategy and current status
   - **`.claude/strategy/agent-workflow.md`** - Step-by-step workflow for working on tasks
   - **`.claude/templates/AGENT_PROMPT.md`** - Template for spinning up new agents
   - **`.claude/tasks/runtime-failures/`** - High-priority failing tests (12 tests)
   - **`.claude/tasks/output-differences/`** - Tests that compile but produce wrong CSS (102 tests)
   - **`.claude/tracking/assignments.json`** - Track which tasks are available/in-progress/completed

   **If you're working on a specific task**: Check `.claude/tasks/` for detailed task specifications.

   **If you're a new agent**: Start with `.claude/strategy/MASTER_PLAN.md` for context.

6. **Current Focus: Runtime & Evaluation Issues**:
   - **Runtime tracing available**: Use `LESS_GO_TRACE=1` to debug evaluation flow
   - Compare with JavaScript implementation when fixing issues
   - See `.claude/tasks/runtime-failures/` for specific tasks

   **Priority Order** (High to Low):
   1. ✅ Variable evaluation in functions/loops - FIXED (Issue #2b)
   2. ✅ Mixin closure and variable scope - FIXED (Issue #6)
   3. ✅ Mixin recursion detection - FIXED (Issue #7)
   4. Import reference functionality (2 tests) - `.claude/tasks/runtime-failures/import-reference.md`
   5. Namespace resolution (2 tests) - `.claude/tasks/runtime-failures/namespace-resolution.md`
   6. URL processing (2 tests) - `.claude/tasks/runtime-failures/url-processing.md`
   7. Other runtime failures (6 tests) - See `.claude/tracking/assignments.json`
   8. Output differences (102 tests) - See `.claude/tasks/output-differences/`

7. **Quarantined Features** (for future implementation):
   - Plugin system tests (`plugin`, `plugin-module`, `plugin-preeval`)
   - JavaScript execution tests (`javascript`, `js-type-errors/*`, `no-js-errors/*`)
   - Import test that depends on plugins (`import`)
   - These are marked in `integration_suite_test.go` and excluded from test counts

Please review the imported rules above for detailed guidelines specific to the task at hand.