# Next Session: Runtime & Evaluation Fixes

## Quick Context

**Parser Status**: ✅ ALL PARSER BUGS FIXED!

The Go port's parser is now complete and working correctly. All remaining issues are in **runtime evaluation** and **functional implementation**, not parsing.

**Current State**:
- 185 active tests (7 quarantined for plugins/JS)
- 69 passing (37.3%)
- 98 compile but have CSS output differences (53%)
- 18 fail with runtime/evaluation errors (9.7%)

---

## 🎯 Prompt for Next LLM Session

Copy this prompt to start the next session:

---

**READ THESE FILES FIRST**:
1. `RUNTIME_ISSUES.md` - Comprehensive list of all remaining issues
2. `CLAUDE.md` - Project structure and testing commands
3. `IMPORT_INTERPOLATION_INVESTIGATION.md` - One deferred issue (skip for now)

**CURRENT STATUS**:
The LESS to Go port has ALL parser bugs fixed. The parser correctly handles the full LESS syntax. Now we need to fix runtime evaluation issues.

**YOUR TASK**:
Fix the 18 tests that fail with runtime/evaluation errors. Start with the highest priority issues from RUNTIME_ISSUES.md:

**Priority 1 - Variable Evaluation** (fixes 3 tests):
- `functions` test - Error: "Could not evaluate variable call @1"
- `functions-each` test - Error: "variable @msgs is undefined"
- `detached-rulesets` test - Error: "Could not evaluate variable call @ruleset"

These all have the same root cause: variables aren't accessible in certain evaluation contexts (functions, loops, detached rulesets).

**WORKFLOW**:
1. Read RUNTIME_ISSUES.md to understand Issue #1 (Variable Evaluation in Functions)
2. Run the failing test to see the error:
   ```bash
   pnpm -w test:go:filter -- "functions"
   ```
3. Create a minimal reproduction case in /tmp/test.less
4. Use trace mode to debug:
   ```bash
   LESS_GO_TRACE=1 go test -run "TestIntegrationSuite/main/functions" -v
   ```
5. Compare with JavaScript behavior - the JavaScript implementation is the source of truth
6. Fix the evaluation logic in the appropriate Go files
7. Test for regressions:
   ```bash
   pnpm -w test:go:unit     # All unit tests must pass
   pnpm -w test:go:summary  # Check overall progress
   ```

**KEY FILES TO INVESTIGATE**:
- `packages/less/src/less/less_go/variable.go` - Variable resolution
- `packages/less/src/less/less_go/call.go` - Function call evaluation
- `packages/less/src/less/less_go/variable_call.go` - Variable call evaluation
- `packages/less/src/less/less_go/eval.go` - Evaluation context

**DEBUGGING TOOLS**:
- `LESS_GO_TRACE=1` - Show execution trace
- `LESS_GO_DEBUG=1` - Enhanced error messages
- `pnpm -w test:go:debug -- "test-name"` - Combined debug mode

**IMPORTANT PRINCIPLES**:
- Never modify JavaScript files - they are the source of truth
- Match JavaScript behavior exactly (check the original JS implementation)
- Run unit tests after every change to catch regressions
- Focus on eval() methods and variable scope management
- The parser is working - don't change parser code unless absolutely necessary

**SUCCESS CRITERIA**:
Fix the 3 variable evaluation tests, then move to the next priority in RUNTIME_ISSUES.md. Delete each section from RUNTIME_ISSUES.md as you fix it.

**After fixing Priority 1**, continue with:
- Priority 2: Mixin argument binding and scope
- Priority 3: Import reference functionality
- Priority 4: Namespace resolution
- Priority 5: Output differences (98 tests)

Good luck! The parser foundation is solid, now we just need to implement proper evaluation semantics.

---

## For the Human

After the LLM session completes, review:
1. Test results: `pnpm -w test:go:summary`
2. Updated RUNTIME_ISSUES.md
3. Any new documentation created

Then either:
- Continue with next priority if fixes were successful
- Adjust strategy in RUNTIME_ISSUES.md if needed
- Ask for help if stuck on a particular issue
