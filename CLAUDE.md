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

4. **Current Integration Test Status** (as of 2025-11-03 Evening):
   - **69/185 tests passing (37.3%)**
   - 13 perfect CSS matches (7.0%)
   - 56 correct error handling (30.3%)
   - 98 tests with output differences (53.0%) - **compiles but CSS doesn't match**
   - 18 tests failing (9.7%) - **runtime/evaluation errors, NOT parser errors**
   - 7 tests quarantined (plugin system & JavaScript execution - punted for later)

   **🎉 Parser Status: ALL BUGS FIXED!**
   - Parser correctly handles full LESS syntax
   - All 167/185 tests compile successfully (90.3% compilation rate)
   - Remaining work is in runtime evaluation and functional implementation

   **Recent Progress** (Parser Fixes):
   - ✅ MediaFeature parsing (simple media queries like `@media (hover)`)
   - ✅ BUG-008 (functions) - boolean/if function condition parsing
   - ✅ BUG-009 (detached-rulesets) - variable call parsing
   - ✅ BUG-001 (comments2) - Save/Restore commentStore
   - ✅ BUG-003/004 (import options) - Path extraction
   - ✅ BUG-005 (import-remote) - Remote imports
   - ✅ BUG-006 (import-module) - NPM module resolution
   - ✅ BUG-007 (line comments) - Empty media query comments
   - ✅ BUG-010 (functions-each) - Detached ruleset arguments
   - ⏸️ BUG-002 (import-interpolation) - Deferred (architectural refactor needed)

5. **Current Focus: Runtime & Evaluation Issues**:
   - **See RUNTIME_ISSUES.md** for comprehensive tracking of remaining issues
   - **See NEXT_SESSION.md** for prompt to start fixing runtime issues
   - Focus on variable evaluation, mixin execution, and import functionality
   - **Runtime tracing available**: Use `LESS_GO_TRACE=1` to debug evaluation flow
   - Compare with JavaScript implementation when fixing issues

   **Priority Order**:
   1. Variable evaluation in functions/loops (3 tests)
   2. Mixin argument binding and scope (4 tests)
   3. Import reference functionality (2 tests)
   4. Namespace resolution (2 tests)
   5. Output differences (98 tests)

6. **Quarantined Features** (for future implementation):
   - Plugin system tests (`plugin`, `plugin-module`, `plugin-preeval`)
   - JavaScript execution tests (`javascript`, `js-type-errors/*`, `no-js-errors/*`)
   - Import test that depends on plugins (`import`)
   - These are marked in `integration_suite_test.go` and excluded from test counts

Please review the imported rules above for detailed guidelines specific to the task at hand.