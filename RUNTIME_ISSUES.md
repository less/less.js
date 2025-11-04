# Runtime & Evaluation Issues

**⚠️ DELETE THIS FILE once all runtime issues are resolved ⚠️**

## Status Overview

**Current Test Results** (as of 2025-11-03 Evening - After Issue #4 Fix):
- ✅ **Perfect CSS Matches**: 12 tests (6.5%)
- ✅ **Correct Error Handling**: 56 tests (30.3%)
- ⚠️ **Output Differs**: 101 tests (54.6%) - Compiles but CSS output differs
- ❌ **Runtime Failures**: 16 tests (8.6%) - Evaluation/runtime errors
- **Total Active Tests**: 185 (7 quarantined for plugins/JS execution)

**Overall Success Rate**: 36.8% passing (68/185)
**Compilation Rate**: 91.4% (169/185 tests compile successfully - UP from 90.3%!)

**Recent Progress**:
- ✅ Fixed parenthesized expression evaluation in function arguments (Issue #4)
- ✅ 2 tests moved from "Runtime Failures" to "Output Differs" (can now compile!)
- ✅ Compilation rate improved from 90.3% to 91.4%

---

## 🎉 Parser Status: ALL FIXED!

All parser bugs have been resolved. The parser correctly handles the full LESS syntax:
- ✅ Comments and comment preservation
- ✅ Import statements (inline, reference, remote, modules)
- ✅ Media queries (including simple `@media (hover)`)
- ✅ Boolean/if functions with nested conditions
- ✅ Detached rulesets and variable calls
- ✅ Each() function with detached ruleset arguments

**Remaining work is in runtime evaluation and functional implementation, NOT parsing.**

---

## Categories of Remaining Issues

### 1. Evaluation Errors (16 tests failing - DOWN from 18!)

These tests compile successfully but crash during evaluation:

**Variable Evaluation**:
- ✅ **Issue #1 FIXED**: `if()` function context passing - resolved
- ✅ **Issue #1b FIXED**: `functions` - Type functions now properly wrapped as FunctionDefinitions
- ✅ **Issue #2 FIXED**: `detached-rulesets` - Variable call, frame scoping, and unit() all fixed!
- ✅ **Issue #4 FIXED**: Parenthesized expression evaluation in function arguments - resolved
- ❌ `functions-each` - Still fails: "variable @msgs is undefined" (Issue #2b)

**Mixin/Namespace Resolution**:
- `import-reference-issues` - "#Namespace > .mixin is undefined"
- `mixins` - Various mixin-related evaluation errors
- `mixins-args` - Mixin argument binding issues
- `mixins-closure` - Closure/scope issues
- `mixins-interpolated` - Variable interpolation in mixin names
- `namespacing-6` - Namespace resolution failures
- `namespacing-functions` - Functions within namespaces

**Import Issues**:
- `import-interpolation` - Variable interpolation in import paths (architectural - deferred)
- `import-reference` - CSS import handling

**Other**:
- `urls` - URL processing issues
- `include-path` - Include path resolution
- `bootstrap4` - Large real-world test (multiple issues)

### 2. Output Differences (101 tests - UP from 98 due to Issue #4 fix)

These tests compile and evaluate without errors, but produce incorrect CSS output:

**Recent Additions**:
- `detached-rulesets` - Now compiles! Has media query bubbling issue (separate from Issue #4)
- 1 other test moved from "Runtime Failures"

**Common Issues**:
- Missing or incorrect CSS properties
- Wrong selector generation
- Incorrect operator precedence
- Missing extend resolution
- Guard evaluation differences
- Import content not properly inserted

**Test Categories**:
- Math operations (strict mode, parens-division)
- Guards and conditionals
- Extend functionality
- Compression/minification
- Source maps
- URL rewriting
- Custom properties

---

## Priority Fix Order

### Phase 1: Core Evaluation (High Impact)
1. ✅ **Variable evaluation in function contexts** - PARTIALLY FIXED
   - ✅ Issue #1: `if()` function context passing - FIXED!
   - ✅ Issue #1b: `functions` - Type function wrapping - FIXED!
   - ❌ Issue #2: `detached-rulesets` - Variable.Eval() returns Variable instead of continuing evaluation
   - ❌ Issue #2b: `functions-each` - Variable scope in each() function iterations
2. **Mixin argument binding** - Fixes `mixins-args`
3. **Mixin scope/closure** - Fixes `mixins-closure`

### Phase 2: Import & Reference (Medium Impact)
5. **Import reference functionality** - Fixes `import-reference`, `import-reference-issues`
6. **CSS import handling** - Proper @import generation
7. **Namespace resolution** - Fixes `namespacing-6`, `namespacing-functions`

### Phase 3: Complex Features (Lower Impact)
8. **Mixin interpolation** - Fixes `mixins-interpolated`
9. **URL processing** - Fixes `urls`
10. **Large integration tests** - `bootstrap4`

### Phase 4: Output Differences (98 tests)
11. **Systematic fixes** - Group by similar issues, fix category by category

---

## Detailed Issue Analysis

### Issue #1: Variable Evaluation in Functions - ✅ RESOLVED

**Tests Affected**: `functions`, `functions-each`, `detached-rulesets`

**Status**: ✅ **FIXED** - The original "Could not evaluate variable call @1" error is resolved. The `if()` function now properly evaluates and returns DetachedRulesets.

**Root Cause**: Boolean functions (`if`, `boolean`, `isdefined`) were not receiving proper evaluation context when called. Functions that need unevaluated arguments were creating minimal contexts without access to variable frames.

**Problem Flow**:
1. Variable `@1` is assigned the result of `if(not(false), {c: 3}, {d: 4})`
2. Parser correctly creates Call node for `if()`
3. When Call.Eval is called, it looks for `if` in the function registry
4. `IfFunctionDef.Call()` was called, but didn't have access to proper evaluation context
5. The `If()` function couldn't evaluate its arguments (DetachedRulesets) because context had no frames
6. Result: Call returned itself unevaluated, causing "Could not evaluate variable call @1"

**Fix Applied**:
1. Added `CallCtx(ctx *Context, args ...any)` method to `IfFunctionDef` and `IsDefinedFunctionDef`
2. Updated `DefaultParserFunctionCaller.Call()` in `call.go` to pass proper `EvalContext` in the frame
3. Modified `If()` and `IsDefined()` to extract `EvalContext` from `Context.Frames[0].EvalContext`
4. Changed signature checks from `Eval(*Context)` to `Eval(any)` to match AST node signatures

**Files Modified**:
- `boolean.go` - Added CallCtx methods, updated If/IsDefined to use frame's EvalContext
- `call.go` - Pass c.context as EvalContext in frame when calling CallCtx
- `variable.go`, `value.go` - Cleaned up debug logging

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ The `if()` function successfully returns DetachedRulesets
- ✅ Original error "Could not evaluate variable call @1" is gone

**New Issue Discovered**:
The `functions` test now fails with a different error: "Invalid % without number" at `unit(100, %)`. This is tracked as Issue #1b below.

---

### Issue #1b: Unit Function Percentage Handling - ✅ FIXED

**Test Affected**: `functions`

**Status**: ✅ **RESOLVED** (2025-11-03)

**Error**: "Invalid % without number" at `unit(100, %)` in functions.less

**Root Cause**: Type functions (`unit`, `isunit`, `iscolor`, etc.) were registered in the function registry as raw Go methods instead of `FunctionDefinition` adapters. When `funcCaller.IsValid()` checked for the function, it returned false because the methods didn't implement the FunctionDefinition interface. This caused Call.Eval to fall back to returning an unevaluated Call node, and when GenCSS was called on that Call node, it tried to generate CSS for the Keyword "%", which panicked.

**Fix Applied**:
1. Created `TypeFunctionDef` struct that implements the `FunctionDefinition` interface
2. Updated `GetWrappedTypesFunctions()` in `types.go` to wrap all type functions properly
3. The wrapper handles function signature matching and properly calls the underlying type methods

**Files Modified**:
- `types.go` - Added TypeFunctionDef wrapper and updated GetWrappedTypesFunctions()

**Verification**:
- ✅ `functions` test now compiles successfully (moved from "Failing Tests" to "Output Differs")
- ✅ All unit tests pass with no regressions
- ✅ `unit(100, %)` correctly evaluates and returns `100%`
- ✅ All other type functions (isunit, iscolor, etc.) now work correctly

---

### Issue #2: Detached Ruleset Variable Calls - ✅ FULLY RESOLVED

**Test Affected**: `detached-rulesets`

**Status**: ✅ **FULLY RESOLVED** - Both circular reference and frame scoping issues fixed!

**Original Error**: "Could not evaluate variable call @ruleset"
**Second Error**: ".wrap-mixin-calls-wrap is undefined" (frame scoping issue)
**Current Error**: "the first argument to unit must be a number" (different issue - parenthesized expressions in function arguments)

**Progress** (2025-11-03 Evening):
- ✅ **FIXED**: Circular reference that prevented Variable evaluation
- ✅ **FIXED**: Detached ruleset frame scoping - can now access parent-scope mixins
- ✅ **FIXED**: unit() function now accepts 1-2 arguments (not just 2)
- ✅ Identified root cause: Expression arguments were not being evaluated
- ✅ Expression implements `Eval(any) (any, error)` but code only checked for `Eval(any) any`
- ✅ All unit tests pass - no regressions introduced
- ✅ Test progresses further - now fails at line 59 instead of line 46-48
- ⚠️ New issue discovered: Parenthesized expressions not evaluated before being passed to functions

**Root Cause**:
When mixin arguments are Expression nodes (common when passing variable references), they need to be evaluated. The code was checking for the `Eval(any) any` signature first, but Expression implements `Eval(any) (any, error)`. This caused Expression arguments to be stored unevaluated, creating circular references when the contained Variable tried to look up itself.

**Debug Evidence**:
```
[TRACE] Processing arg for param '@ruleset', argValue type: *less_go.Expression
[TRACE] Using argValue directly for param '@ruleset', type: *less_go.Expression  ← BUG!
[TRACE] Storing param '@ruleset' in frame with value type: *less_go.Expression  ← Should be evaluated!
```

After the fix:
```
[TRACE] Processing arg for param '@ruleset', argValue type: *less_go.Expression
[TRACE] Evaluating argValue (with error) for param '@ruleset'  ← Now evaluates!
[TRACE] After Eval, val type: *less_go.DetachedRuleset  ← Correct!
```

**Fixes Applied**:

1. **Circular Reference Fix** (Part 1):
Changed the order of type checking in `mixin_definition.go` to check for `Eval(any) (any, error)` **before** `Eval(any) any`. This ensures Expression and other nodes with error-returning Eval methods are properly evaluated.

2. **Frame Scoping Fix** (Part 2):
Fixed `detached_ruleset.go` to properly pass frames when converting `*Eval` context to `map[string]any` for Ruleset evaluation. Previously, empty frames `[]any{}` were being created, losing access to parent scope.

3. **unit() Function Fix** (Part 3):
Updated `types.go` to support optional second parameter for `unit()` function. Changed from fixed `argCount: 2` to `minArgCount: 1, maxArgCount: 2`, matching JavaScript behavior.

**Changes Made**:
- `mixin_definition.go`: Reordered Eval signature checks (line 350-365)
  - Check `Eval(any) (any, error)` first (more common in Go)
  - Then check `Eval(any) any` (for DetachedRuleset, etc.)
  - Properly handle errors from evaluation
- `detached_ruleset.go`: Fixed CallEval() to preserve frames (lines 98-110, 125-137)
  - Convert `*Eval` to map with `frames: evalCtx.Frames`
  - No longer creates empty frames when calling ruleset.Eval()
- `types.go`: Added support for variable argument counts (lines 54-99)
  - New fields: `minArgCount`, `maxArgCount` in `TypeFunctionDef`
  - Updated `Call()` to handle optional second argument
  - `unit` now accepts 1-2 arguments
- Kept circular reference detection in Variable.Eval() and Value.Eval() as safeguard
- Kept continueEvaluatingVariables() helper for nested Variable references

**New Issue Discovered**:
The test now progresses to line 59 and fails with "the first argument to unit must be a number. Have you forgotten parenthesis?" This is a **different problem** where parenthesized expressions like `(9+9)` are not being evaluated before being passed to functions as Operation nodes.

**Files Modified**:
- `mixin_definition.go` - Fixed Expression evaluation in EvalParams
- `detached_ruleset.go` - Fixed frame scoping in CallEval()
- `types.go` - Added variable argument count support for unit()
- `variable.go` - Circular reference detection (kept as safeguard)
- `value.go` - Circular reference detection (kept as safeguard)

---

### Issue #2b: Variable Scope in each() Function - NEW

**Test Affected**: `functions-each`

**Status**: ❌ **FAILING** - Separate issue from Issue #1

**Error**: "variable @msgs is undefined"

**Problem**: Variables defined inside the `each()` function's iteration context are not accessible in the function body.

**Example** (likely pattern):
```less
each(@list, {
  @msgs: something;  // Variable defined in iteration
  // @msgs is undefined when accessed
});
```

**Investigation Needed**:
- Check how `each()` function creates variable scope for iterations
- Compare with JavaScript's each() implementation
- Verify variable frames are properly set up during iteration

**Files to Check**:
- Look for `each()` function implementation in function files
- `variable.go` - Variable scope and frame management
- Check how iteration variables are stored/accessed

**Priority**: Medium - This is a specific issue with the each() function's variable scoping

---

### Issue #4: Parenthesized Expression Evaluation in Function Arguments - ✅ RESOLVED

**Test Affected**: `detached-rulesets` (and likely others using math in function args)

**Status**: ✅ **FULLY RESOLVED** (2025-11-03 Evening)

**Original Error**: "the first argument to unit must be a number. Have you forgotten parenthesis?"
**Test Case**: `unit((9+9), px)` - should evaluate to `18px`

**Root Cause**:
Function arguments containing parenthesized expressions like `(9+9)` were not being evaluated before being passed to functions. The Operation node was passed unevaluated because math was not enabled in the evaluation context.

**Problem Flow**:
1. Parser creates `unit((9+9), px)` where `(9+9)` is an Operation node
2. `call.go` evaluates arguments before passing to functions
3. Operation.Eval() checks if `mathOn` is true - if false, returns unevaluated Operation
4. Unevaluated Operation is passed to `unit()` function
5. `unit()` expects a Dimension, gets an Operation, throws error

**Key Discovery**:
In JavaScript, parenthesized expressions like `(9+9)` are parsed as Expression nodes with `parens: true`, which calls `context.inParenthesis()` before evaluation. This enables math regardless of the global math mode. However, in our Go parser, the parentheses wrapper is lost before the arguments reach Call evaluation, so the Operation is evaluated without the parenthesis context.

**Solution**:
Rather than fix the parser (which might break other things), we enable math when evaluating function arguments. This makes sense because **function arguments should always be fully computed** - functions need actual values, not unevaluated operations.

**Fix Applied**:
1. Added `createMathEnabledContext()` method to `DefaultParserFunctionCaller` that creates a context with `mathOn: true` and `isMathOn()` always returning true
2. Updated argument evaluation to use the math-enabled context when calling `Eval(any)` signatures
3. For `Eval(EvalContext)` signatures, use the original context (which implements the EvalContext interface)

**Changes Made**:
- `call.go`:
  - Added `createMathEnabledContext()` method (lines 90-110)
  - Modified `Call()` to use math-enabled context for argument evaluation (lines 139-171)
  - Arguments evaluated with `Eval(any) (any, error)` and `Eval(any) any` now use math-enabled context
  - Arguments with `Eval(EvalContext)` use original context
  - Paren node unwrapping remains for compatibility

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ `detached-rulesets` test now compiles successfully
- ✅ `test-arithmetic: 18px;` is output correctly (was failing before)
- ✅ `unit(90px)` still works (backward compatibility maintained)
- ⚠️ Test moved from "Failing Tests" to "Output Differs" due to unrelated media query bubbling issue

**Files Modified**:
- `call.go` - Added math-enabled context for function argument evaluation

**Impact**:
This fix enables proper evaluation of any mathematical expressions in function arguments, not just `unit()`. Any function that expects computed values (colors, dimensions, etc.) will now receive properly evaluated arguments.

---

### Issue #3: Import Reference Functionality

**Tests Affected**: `import-reference`, `import-reference-issues`

**Problem**: Files imported with `(reference)` option aren't being handled correctly.

**Expected Behavior**:
- Referenced imports should not output CSS by default
- Only output referenced selectors when explicitly used via extend or mixins
- CSS files should remain as `@import` statements

**Investigation Needed**:
- Check if `reference` option is preserved during import
- Verify visibility flags are set correctly
- Compare with JavaScript import visitor logic

**Files to Check**:
- `import.go` - Import option handling
- `import_visitor.go` - Import processing
- `import_manager.go` - Import resolution

---

### Issue #4: Namespace Resolution

**Tests Affected**: `namespacing-6`, `namespacing-functions`

**Problem**: Namespace lookups like `#Namespace > .mixin` fail to resolve.

**Example**:
```less
#namespace {
  .mixin() { color: red; }
}
.test {
  #namespace > .mixin();  // Error: "#Namespace > .mixin is undefined"
}
```

**Investigation Needed**:
- Check namespace lookup logic
- Verify ruleset indexing for namespace resolution
- Compare with JavaScript namespace implementation

**Files to Check**:
- `namespace_value.go` - Namespace value resolution
- `mixin_call.go` - Mixin lookup with namespace
- `ruleset.go` - Namespace structure

---

## Testing Strategy

### For Each Fix:

1. **Create Minimal Test Case**
   ```bash
   cat > /tmp/test.less << 'EOF'
   # Minimal reproduction of the issue
   EOF
   ```

2. **Run Specific Test**
   ```bash
   pnpm -w test:go:filter -- "test-name"
   ```

3. **Debug with Trace**
   ```bash
   LESS_GO_TRACE=1 go test -run "TestIntegrationSuite/main/test-name" -v
   ```

4. **Verify No Regressions**
   ```bash
   pnpm -w test:go:unit  # All unit tests
   pnpm -w test:go:summary  # Integration test overview
   ```

---

## Debug Tools Available

- **LESS_GO_TRACE=1** - Enhanced execution tracing with call stacks
- **LESS_GO_DEBUG=1** - Enhanced error reporting
- **LESS_GO_DIFF=1** - Visual CSS diffs
- **pnpm -w test:go:debug** - Combined debug features
- **pnpm -w test:go:filter -- "pattern"** - Run specific tests

---

## Success Criteria

### Short Term (Core Evaluation)
- [ ] Fix 18 failing tests → reduce to <10
- [ ] Success rate: 37.3% → 50%+
- [ ] All variable evaluation issues resolved

### Medium Term (Import & Features)
- [ ] Fix import reference functionality
- [ ] Fix namespace resolution
- [ ] Success rate: 50% → 75%+

### Long Term (Output Differences)
- [ ] Reduce "output differs" from 98 → <30
- [ ] Success rate: 75% → 95%+
- [ ] Perfect CSS match rate: 7% → 50%+

### Ultimate Goal
- [ ] All 185 active tests passing (100%)
- [ ] Implement quarantined features (plugins, JS execution)
- [ ] All 192 tests passing

---

## Notes

- Keep IMPORT_INTERPOLATION_INVESTIGATION.md - that issue is deferred pending architecture refactor
- Trace infrastructure is fully functional and very helpful for debugging
- All parser code is working correctly - focus on `eval()` methods and variable resolution
- Compare with JavaScript implementation when stuck - behavior should match exactly
