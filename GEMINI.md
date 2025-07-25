# Project Overview: less.go

This document provides a comprehensive overview of the `less.go` project, its goals, structure, and development practices.

## 1. Project Goal

The primary objective of this project is to create a high-fidelity port of the popular Less.js CSS pre-processor from JavaScript to Go. The Go implementation must be a 1:1 functional equivalent of the JavaScript version, which serves as the ultimate source of truth.

## 2. Codebase Structure

The project is organized as a monorepo. The key directories are:

- **`packages/less/src/less`**: This is the main directory containing the original Less.js source code in JavaScript.
- **`packages/less/src/less/less_go`**: This directory contains the Go source code. To avoid circular dependencies and simplify the module structure, all Go code is located here.
- **`packages/less/test`**: This directory contains the test suite for the JavaScript implementation.
- **`scripts`**: This directory contains helper scripts for testing and other development tasks.
- **`reports`**: This directory can be used for temporary files for debugging and progress tracking. Any files created in this directory must be cleaned up after use.

## 3. Development Process

The porting process is designed to ensure high quality and functional parity with the original JavaScript implementation. The process is as follows:

1.  **Analyze JavaScript File**: Before porting a file, analyze its dependencies and functionality.
2.  **Create JavaScript Tests**: If a `.test.js` file does not exist for the JavaScript file, create one to document its behavior. The original JavaScript code should never be modified.
3.  **Port to Go**: Write the Go implementation of the JavaScript file, ensuring that the functionality is identical. The new Go file should be placed in the corresponding location in the `packages/less/src/less/go` directory.
4.  **Write Go Tests**: Create Go tests that mirror the JavaScript tests to verify the correctness of the ported code.

## 4. Testing

The project has a robust testing framework for both JavaScript and Go.

### JavaScript Tests

- **Run all JS tests**: `pnpm test`
- **Run all JS tests without watch mode**: `pnpm test --run`

### Go Tests

- **Run all Go tests**: `go test ./...`
- **Run unit tests**: `pnpm -w test:go:unit`
- **Run integration tests**: `pnpm -w test:go`
- **Run integration tests with summary**: `pnpm -w test:go:summary`
- **Filter tests**: `pnpm -w test:go:filter -- "pattern"`

### Debugging

The project provides a set of environment variables to aid in debugging the Go implementation:

- **`LESS_GO_DEBUG=1`**: Enables debug mode with enhanced error reporting.
- **`LESS_GO_DIFF=1`**: Shows a visual diff of the CSS output for failing tests.
- **`LESS_GO_TRACE=1`**: Enables execution tracing.
- **`LESS_GO_AST=1`**: Shows the AST output (placeholder for future use).
- **`LESS_GO_STRICT=1`**: Fails tests immediately on output differences.

## 5. Code Style and Conventions

### Go

- Follow standard Go naming conventions (`camelCase` for private, `PascalCase` for public).
- Use `any` instead of `interface{}`.
- Convert JavaScript dash-case filenames to Go underscore_case (e.g., `my-file.js` → `my_file.go`).
- Maintain similar function/method signatures to the JavaScript code where possible.
- Use Go's error handling patterns instead of JavaScript's try/catch.
- Avoid external dependencies unless absolutely necessary.

### JavaScript

- Use spaces, not tabs.
- End lines with semi-colons.
- Adhere to the project's ESLint rules.

## 6. Important Notes

- The original JavaScript code is the source of truth and should never be modified.
- If a test fails, it is assumed that the test is incorrect, not the original JavaScript code.
- The Go unit tests are all passing, but the integration tests still have some issues. The integration test runner will classify tests based on whether they produce output and whether that output is an exact match.
- When making changes, always run both the Go unit tests and the integration tests to ensure that there are no regressions.
- If you see a new failure in the integration tests, please verify that the test is not testing something that is incongruent with the original JavaScript code.
- You can use the `reports` directory to read and write temporary files for tracking progress or debugging. Remember to clean up these files when you are finished.