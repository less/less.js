# Task: Fix Include Path Option

**Status**: ✅ COMPLETED (2025-11-05)
**Priority**: HIGH (Runtime Failure)
**Estimated Time**: DONE
**Complexity**: Low-Medium
**Completed By**: Agent 011CUqtTQQiKADUC9oF1c5z1
**Commit**: a6a581b

## Overview

Fix the `--include-path` option (or `paths` option) so that imports can be resolved from additional search directories beyond the file's own directory.

## ✅ COMPLETION SUMMARY

**Date**: 2025-11-05T20:02:25Z
**Commit**: a6a581b
**PR**: #14

**Results**:
- ✅ `include-path` test: Compiles successfully (output differs due to data-uri/image-size functions)
- ✅ `include-path-string` test: Compiles successfully (output differs due to data-uri function)
- ✅ Import resolution via include paths working correctly
- ✅ All import-related unit tests pass (no regressions)

**Note**: The output differences are due to `data-uri()` and `image-size()` functions not being fully implemented (separate issue). The core include-path functionality is complete and working correctly.

## Original Failing Tests

- `include-path` (include-path suite)
- `include-path-string` (include-path-string suite)

## Current Behavior

**Error Message**:
```
Syntax: : open import-test-e: no such file or directory in test-data/less/include-path/include-path.less
```

The import `@import "import-test-e";` fails because the file is not in the same directory as the importing file, but should be found via the include path option.

**Test Command**:
```bash
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/include-path"
```

## Expected Behavior

From less.js documentation:
1. When `--include-path=dir1:dir2:dir3` is specified (or `paths` array in options)
2. Imports without explicit paths should be searched in:
   - Current file's directory (default)
   - Each include path directory in order
   - First match wins
3. Relative paths like `"./file"` should NOT use include paths (only explicit filename)

## Investigation Starting Points

### Test Data

```bash
# Look at test structure
ls -la packages/test-data/less/include-path/
# Expected: Main file + import files in subdirectories

# Look at what's being imported
cat packages/test-data/less/include-path/include-path.less
# Look for @import statements

# See expected output
cat packages/test-data/css/include-path/include-path.css
```

### Test Configuration

Check how the test is configured:
```bash
# Find test options in integration suite
grep -A 10 "include-path" packages/less/src/less/less_go/integration_suite_test.go
```

Look for special options being passed for this suite (likely paths configuration).

### JavaScript Implementation

**Key files**:
- `packages/less/src/less/import-manager.js` - How paths option is used
- `packages/less/src/less/fs.js` - File resolution logic
- Search for `paths` or `includePaths` to see how it's implemented

### Go Implementation

**Files to check**:
- `packages/less/src/less/less_go/import_manager.go` - Import resolution
- `packages/less/src/less/less_go/file_system_file_manager.go` - File lookup
- `packages/less/src/less/less_go/contexts.go` - Where paths option is stored
- `packages/less/src/less/less_go/parse.go` - How options are passed in

### Debugging Commands

```bash
# See exact error
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/include-path"

# Check JavaScript behavior
cd packages/less
npx lessc --include-path=test-data/less/include-path/import test-data/less/include-path/include-path.less -
```

## Likely Root Causes

### Hypothesis 1: Paths option not passed through
- The `paths` option is parsed but not stored in context
- Or stored but not passed to file manager
- Or passed but not used during file resolution

### Hypothesis 2: File resolution doesn't check paths
- File manager receives paths but doesn't iterate through them
- Only checks current directory then gives up
- Need to add loop through paths

### Hypothesis 3: Path joining issue
- Paths are checked but incorrectly joined with filename
- e.g., using wrong separator or not handling relative paths correctly

## Implementation Hints

### If Hypothesis 1 is correct:

1. Find where test options are parsed (likely in `integration_suite_test.go`)
2. Ensure `paths` or `includePaths` option is set for include-path suite
3. Trace through to `ImportManager` and `FileManager` to ensure it's passed through
4. Add field to appropriate struct if missing

### If Hypothesis 2 is correct:

1. In `file_system_file_manager.go`, find the `LoadFile` or similar method
2. Add logic to check additional paths:
```go
// Try current directory first
if exists(filepath.Join(currentDir, filename)) {
    return load(filepath.Join(currentDir, filename))
}

// Try each include path
for _, includePath := range fm.includePaths {
    fullPath := filepath.Join(includePath, filename)
    if exists(fullPath) {
        return load(fullPath)
    }
}

// File not found
return error
```

### If Hypothesis 3 is correct:

1. Check path separators (use `filepath.Join`, not string concatenation)
2. Check if relative paths like `./file` are skipping include paths (correct behavior)
3. Match JavaScript path resolution exactly

## Test Cases to Understand

From the test, likely structure:
```less
// include-path.less (main file)
@import "import-test-e";  // No ./ prefix, should use include paths

// import-test-e.less (in subdirectory specified by include path)
.test {
  color: red;
}
```

The key is that `import-test-e` has no directory prefix, so it should be searched in include paths.

## Success Criteria

- ✅ `include-path` test compiles successfully
- ✅ Ideally shows "Perfect match!"
- ✅ Other import tests still pass (no regressions)
- ✅ Unit tests still pass

## Validation Checklist

```bash
# 1. Specific test passes
cd packages/less/src/less/less_go && go test -v -run "TestIntegrationSuite/include-path"
# Expected: ✅ include-path: Perfect match! (or at least compiles)

# 2. No import regressions
go test -v -run "TestIntegrationSuite/main/import"
# Expected: Tests that worked before still work

# 3. Unit tests pass
cd /home/user/less.go && pnpm -w test:go:unit
# Expected: All pass
```

## Files Likely Modified

- `file_system_file_manager.go` - Add include path search logic
- Possibly `import_manager.go` - Ensure paths are passed to file manager
- Possibly `contexts.go` - Ensure paths option is stored

## Related Issues

- `import-interpolation` - Different issue (variable interpolation)
- `import-module` - Different issue (node_modules resolution)
- This is specifically about the `--include-path` CLI option

## Notes

- This is a **quick win** - likely a simple missing feature
- Common use case in build systems that organize imports in directories
- JavaScript has this working, so can copy implementation
- Should be minimal code changes
- Watch out for Windows path separators (use `filepath` package)
