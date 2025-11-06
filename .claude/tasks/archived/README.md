# Archived Completed Tasks

This directory contains task files for issues that have been successfully resolved and completed.

## Completed Tasks

### include-path.md
- **Completed**: 2025-11-05
- **Issue #11**: Include path option for import resolution
- **Impact**: Fixed 2 tests (`include-path`, `include-path-string`)
- **Commit**: a6a581b
- **PR**: #14
- **Summary**: Implemented the `--include-path` CLI option so that imports can be resolved from additional search directories beyond the file's own directory.

### mixin-args.md
- **Completed**: 2025-11-06
- **Issue #10**: Mixin variadic parameter expansion and argument matching
- **Impact**: Fixed 3 test suites that were blocked (`math-parens/mixins-args`, `math-parens-division/mixins-args`, `math-always/mixins-args`)
- **Commit**: ca022ec
- **Summary**: Fixed variadic parameter evaluation context and argument expansion handling in mixin pattern matching. This unblocked the entire math test suite.

## Archive Policy

Task files are moved here when:
1. The issue has been completely resolved
2. All affected tests are passing
3. The fix has been committed and merged
4. The task is documented with completion details in the file

## Reference

These files are kept for historical reference and can help inform similar future fixes. They document:
- The investigation process
- Root cause analysis
- Implementation approach
- Validation steps
- Related issues and context
