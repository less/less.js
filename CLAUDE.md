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

Please review the imported rules above for detailed guidelines specific to the task at hand.