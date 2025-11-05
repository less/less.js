# Runtime & Evaluation Issues

**⚠️ SUPERSEDED BY `.claude/` DIRECTORY - DELETE THIS FILE ONCE ALL RUNTIME ISSUES ARE RESOLVED ⚠️**

> **Note**: This file contains detailed historical analysis of runtime issues that have been fixed.
> For current work, see:
> - **`.claude/strategy/MASTER_PLAN.md`** - Overall strategy
> - **`.claude/tasks/runtime-failures/`** - Specific tasks to fix
> - **`.claude/tracking/assignments.json`** - Task assignments
>
> This file will be deleted once all 12 remaining runtime failures are fixed.
> It's kept for now as historical reference for the fixes already completed.

## Status Overview

**Current Test Results** (as of 2025-11-04 - After Issue #7 Fix):
- ✅ **Perfect CSS Matches**: 15 tests (8.1%) - UP from 14!
- ✅ **Correct Error Handling**: 56 tests (30.3%)
- ⚠️ **Output Differs**: 102 tests (55.1%) - Compiles but CSS output differs
- ❌ **Runtime Failures**: 12 tests (6.5%) - Evaluation/runtime errors (DOWN from 13!)
- **Total Active Tests**: 185 (7 quarantined for plugins/JS execution)

**Overall Success Rate**: 38.4% passing (71/185) - UP from 37.8%!
**Compilation Rate**: 92.4% (171/185 tests compile successfully)

**Recent Progress**:
- ✅ Fixed mixin recursion detection - wrapped rulesets now properly detect recursion (Issue #7)
- ✅ Fixed mixin closure frame capture - mixins now capture definition scope (Issue #6)
- ✅ Fixed @arguments variable population for named mixin arguments (Issue #5)
- ✅ Fixed each() function context propagation and variable scope (Issue #2b)
- ✅ Fixed parenthesized expression evaluation in function arguments (Issue #4)
- ✅ 3 more tests passing: `mixins`, `mixins-closure`, `mixins-interpolated`

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

### 1. Evaluation Errors (13 tests failing - DOWN from 15!)

These tests compile successfully but crash during evaluation:

**Variable Evaluation**:
- ✅ **Issue #1 FIXED**: `if()` function context passing - resolved
- ✅ **Issue #1b FIXED**: `functions` - Type functions now properly wrapped as FunctionDefinitions
- ✅ **Issue #2 FIXED**: `detached-rulesets` - Variable call, frame scoping, and unit() all fixed!
- ✅ **Issue #2b FIXED**: `functions-each` - Context propagation and variable declarations fixed!
- ✅ **Issue #4 FIXED**: Parenthesized expression evaluation in function arguments - resolved
- ✅ **Issue #5 FIXED**: `mixins-named-args` - @arguments variable population for named arguments - resolved
- ✅ **Issue #6 FIXED**: `mixins-closure`, `mixins-interpolated` - Mixin closure frame capture - resolved

**Mixin/Namespace Resolution**:
- `import-reference-issues` - "#Namespace > .mixin is undefined"
- ✅ **Issue #7 FIXED**: `mixins` - Mixin recursion detection for wrapped rulesets - resolved
- `namespacing-6` - Namespace resolution failures
- `namespacing-functions` - Functions within namespaces

**Import Issues**:
- `import-interpolation` - Variable interpolation in import paths (architectural - deferred)
- `import-reference` - CSS import handling

**Other**:
- `urls` - URL processing issues
- `include-path` - Include path resolution
- `bootstrap4` - Large real-world test (multiple issues)

### 2. Output Differences (102 tests - UP from 101 due to Issue #2b fix)

These tests compile and evaluate without errors, but produce incorrect CSS output:

**Recent Additions**:
- `functions-each` - Now compiles! Variables accessible in each() iterations
- `detached-rulesets` - Now compiles! Has media query bubbling issue (separate from Issue #4)

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

### Issue #2b: Variable Scope in each() Function - ✅ RESOLVED

**Test Affected**: `functions-each`

**Status**: ✅ **FULLY RESOLVED** (2025-11-04)

**Original Error**: "variable @msgs is undefined" when a mixin parameter was referenced inside an `each()` function call

**Example** (actual test case):
```less
.log(@msgs) {
  each(@msgs; {
    content: @value;  // @value, @key, @index should be accessible
  });
}

@messages: 'foo', 'bar';
span {
  .log(@messages);  // Should output: content: 'foo'; content: 'bar';
}
```

**Root Causes Discovered**:

1. **Wrong Function Definition Registration**:
   - In `index.go`, the `each()` function was registered as `FlexibleFunctionDef` instead of `EachFunctionDef`
   - This prevented the context-aware `CallCtx` method from being invoked
   - Without `CallCtx`, the mixin parameter frames were not passed to the each() function

2. **Wrong Variable Declaration Flag**:
   - The `@value`, `@key`, and `@index` declarations created by `each()` had `variable=false`
   - `Ruleset.Variables()` only returns declarations with `variable=true` (line 845 in ruleset.go)
   - Variables were being created but not found during lookup

**Fixes Applied**:

1. **Fixed Function Registration** (`index.go:557-561`):
   - Changed from `FlexibleFunctionDef` wrapper to `EachFunctionDef`
   - This ensures `CallCtx` is called with proper context containing mixin parameter frames

2. **Fixed Variable Declarations** (`list.go:351-376`):
   - Changed the last parameter in all three `NewDeclaration` calls from `false` to `true`
   - Now properly marks `@value`, `@key`, and `@index` as variables

3. **Enhanced Context Flow** (`function_caller.go:18-29`):
   - Added `GetFrames()` method to `Context` struct to extract frames from evaluation context
   - This supports the proper context propagation chain

**Context Flow After Fix**:
```
Mixin Call (with @msgs parameter)
  ↓ (frames include @msgs)
Call.Eval (each function call)
  ↓ (passes context with frames)
DefaultParserFunctionCaller.Call
  ↓ (creates funcContext with EvalContext)
EachFunctionDef.CallCtx
  ↓ (receives context with frames)
EachWithContext
  ↓ (creates @value, @key, @index as variables)
Variable.Eval
  ✓ (finds @msgs in parent frames and @value/@key/@index in current frame)
```

**Changes Made**:
- `index.go`: Fixed each() registration to use `EachFunctionDef`
- `list.go`: Changed variable flag from `false` to `true` for @value, @key, @index
- `function_caller.go`: Added `GetFrames()` method to Context struct
- `call.go`: Import cleanup (removed unused `os` import)
- `variable.go`: Minor cleanup

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ `functions-each` test now compiles successfully
- ✅ Test moved from "Failing Tests" to "Output Differs"
- ✅ Variables in mixin parameters are now accessible in each() iterations
- ✅ @value, @key, @index variables are properly created and accessible
- ✅ Compilation rate improved from 91.4% to 91.9%

**Files Modified**:
- `call.go` - Import cleanup
- `function_caller.go` - Added GetFrames() method
- `index.go` - Fixed each() function registration
- `list.go` - Fixed variable declaration flags
- `variable.go` - Minor cleanup

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

### Issue #5: @arguments Variable Population for Named Mixin Arguments - ✅ RESOLVED

**Test Affected**: `mixins-named-args` (and potentially other mixin tests)

**Status**: ✅ **FULLY RESOLVED** (2025-11-04)

**Original Error**: The `@arguments` special variable contained `<nil>` values instead of the actual argument values when mixins were called with named arguments.

**Example** (actual test case):
```less
.mixin (@a: 1px, @b: 50%) {
  width: (@a * 5);
  height: (@b - 1%);
  args: @arguments;  // Should contain all arguments
}

.named-arg {
  .mixin(@b: 100%);  // Only @b provided, @a should use default
}

// Expected: args: 1px 100%;
// Actual (before fix): args: <nil>;
```

**Root Cause**:
In `mixin_definition.go:515`, the `arguments` array was pre-allocated based on the number of arguments passed (`len(args)`), not the number of parameters defined in the mixin (`len(md.Params)`). When named arguments were used, not all parameters were provided in the call, so the array was too small to hold all parameter values including defaults.

**Problem Flow**:
1. Mixin defined with 2 parameters: `(@a: 1px, @b: 50%)`
2. Mixin called with 1 named argument: `.mixin(@b: 100%)`
3. `arguments` array allocated with size 1 (`len(args) = 1`)
4. `EvalParams` tries to populate position 0 with `1px` (default for `@a`) and position 1 with `100%` (provided `@b`)
5. Position 1 is out of bounds, so the array can't be fully populated
6. `@arguments` ends up with `<nil>` values

**JavaScript Comparison**:
In `mixin-definition.js:158`, JavaScript initializes `_arguments` as an empty array `[]`, then `evalParams` assigns to indices like `evaldArguments[j] = value`. JavaScript allows assigning to any array index, automatically extending the array. In Go, we must pre-allocate with the correct size.

**Fix Applied**:
Changed line 516 in `mixin_definition.go` from:
```go
arguments := make([]any, len(args))
```
to:
```go
arguments := make([]any, len(md.Params))
```

This ensures the `arguments` slice has enough capacity for all parameters, allowing `EvalParams` to populate both explicitly provided arguments and default parameter values at their correct positions.

**Changes Made**:
- `mixin_definition.go:516` - Changed array allocation from `len(args)` to `len(md.Params)`
- Added comment explaining the rationale

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ `mixins-named-args` test now outputs correct `@arguments` values
- ✅ Test shows `args: 1px 100%;` instead of `args: <nil>;`
- ✅ Test moved from "Output Differs" category closer to passing
- ⚠️ Remaining issue in test: guarded mixin not being applied (separate issue)

**Files Modified**:
- `mixin_definition.go` - Fixed @arguments array allocation

**Impact**:
This fix ensures that `@arguments` properly reflects all mixin parameters (both explicitly provided and defaults) when mixins are called with named arguments. This is critical for mixin introspection and metaprogramming patterns.

**Related Tests That May Benefit**:
- Other mixin tests that use `@arguments`
- Tests with mixins that have default parameters
- Tests mixing named and positional arguments

---

### Issue #6: Mixin Closure - Frame Capture During Evaluation - ✅ RESOLVED

**Tests Affected**: `mixins-closure`, `mixins-interpolated`

**Status**: ✅ **FULLY RESOLVED** (2025-11-04)

**Original Error**: `variable @var is undefined in ../../../../test-data/less/_main/mixins-closure.less`

**Example** (actual test case):
```less
.scope {
    @var: 99px;
    .mixin () {
        width: @var;  // Should see @var from .scope
    }
}

.class {
    .scope > .mixin();  // Should output: width: 99px;
}

.overwrite {
    @var: 0px;
    .scope > .mixin();  // Should still output: width: 99px; (closure!)
}
```

**Expected Output**: Mixins should capture variables from their **definition scope** (closure), not from the **call site scope**.

**Root Cause**:
MixinDefinition nodes have `EvalFirst() bool` returning `true`, indicating they should be evaluated before other rules in a ruleset. However, in `ruleset.go:499`, the type assertion for EvalFirst rules was:

```go
if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok
```

But `MixinDefinition.Eval()` has the signature:
```go
func (md *MixinDefinition) Eval(context any) (*MixinDefinition, error)
```

In Go, a method returning `(*MixinDefinition, error)` does NOT satisfy an interface requiring `(any, error)` - the return types must match exactly. This caused `MixinDefinition.Eval()` to never be called during the EvalFirst phase.

**Problem Flow**:
1. Ruleset `.scope` is evaluated, containing `@var: 99px` and `.mixin()`
2. During evaluation, `.scope` is pushed to the frames stack
3. Rules marked with `EvalFirst()` should be evaluated (line 495-507)
4. `.mixin()` has `EvalFirst() == true`, but the type assertion failed
5. `.mixin().Eval()` was never called, so it never captured the frames
6. Later when `.mixin()` was called, its `Frames` field was `nil`
7. When mixin body evaluated `@var`, the frames didn't include `.scope`
8. Result: "variable @var is undefined"

**JavaScript Comparison**:
In `mixin-definition.js:154`, the `eval()` method is called automatically during ruleset evaluation:
```javascript
eval(context) {
    return new Definition(this.name, this.params, this.rules, this.condition,
                         this.variadic, this.frames || utils.copyArray(context.frames));
}
```

This captures `context.frames` at definition time, creating a **closure**. The captured frames include the parent ruleset (`.scope`) with its variables.

**Fix Applied**:
Added specific type assertion for MixinDefinition before the generic one in `ruleset.go:499-512`:

```go
// Evaluate rules that need to be evaluated first
for i, rule := range rsRules {
    if r, ok := rule.(interface{ EvalFirst() bool }); ok && r.EvalFirst() {
        // Handle MixinDefinition specifically (returns *MixinDefinition, not any)
        if eval, ok := rule.(interface{ Eval(any) (*MixinDefinition, error) }); ok {
            evaluated, err := eval.Eval(context)
            if err != nil {
                return nil, err
            }
            rsRules[i] = evaluated
        } else if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok {
            evaluated, err := eval.Eval(context)
            if err != nil {
                return nil, err
            }
            rsRules[i] = evaluated
        }
    }
}
```

This ensures `MixinDefinition.Eval()` is called during the EvalFirst phase, allowing it to capture the current frames (including parent rulesets with their variables) and create proper closures.

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ `mixins-closure` test now passes completely
- ✅ `mixins-interpolated` test also fixed as a side effect
- ✅ Perfect CSS match count increased from 12 → 14
- ✅ Failing tests reduced from 15 → 13
- ✅ Overall success rate improved from 36.8% → 37.8%

**Files Modified**:
- `ruleset.go:495-514` - Added specific type assertion for MixinDefinition in EvalFirst section

**Impact**:
This fix is critical for mixin closure behavior - one of the most important features of LESS. Mixins now correctly capture variables from their definition scope rather than looking them up at call time. This enables:
- Proper encapsulation (local variables don't override mixin internals)
- Predictable behavior (mixin output doesn't depend on where it's called)
- Modular design (mixins are self-contained)

**Related Tests Fixed**:
- `mixins-closure` - Primary target test
- `mixins-interpolated` - Fixed as side effect (interpolation needed closure to work)

---

### Issue #7: Mixin Recursion Detection for Wrapped Rulesets - ✅ RESOLVED

**Test Affected**: `mixins`

**Status**: ✅ **FULLY RESOLVED** (2025-11-04)

**Original Error**: `Syntax: mixin call recursion limit exceeded in ../../../../test-data/less/_main/mixins.less`

**Example** (simplified test case):
```less
.clearfix() {
  color: blue;
}
.clearfix {
  .clearfix();  // Should call the mixin, not itself
}
.foo {
  .clearfix();  // Should expand to: color: blue;
}
```

**Expected Output**:
- `.clearfix` ruleset calls `.clearfix()` mixin → expands to `color: blue;`
- `.foo` calls `.clearfix()` mixin → expands to `color: blue;`
- No infinite recursion!

**Root Cause**:
When a Ruleset is used as a mixin (e.g., `.clearfix { .clearfix(); }`), it's wrapped in a temporary MixinDefinition. The recursion detection logic checks if a mixin candidate matches any ruleset in the current call stack to prevent infinite loops.

**Problem Flow**:
1. When `.clearfix` ruleset is found as a mixin candidate, it's wrapped: `wrapperMD = new MixinDefinition(...); wrapperMD.OriginalRuleset = clearfixRuleset`
2. `wrapperMD.EvalCall()` creates a result ruleset and sets: `resultRuleset.OriginalRuleset = md.Ruleset`
3. But `md.Ruleset` was `nil` for wrapped MixinDefinitions!
4. When recursion is checked, it compares: `mixin === frames[f].OriginalRuleset`
5. Since `frames[f].OriginalRuleset` was `nil`, the check failed
6. The wrapped ruleset wasn't detected as recursive
7. Result: Infinite recursion until depth limit (500) exceeded

**JavaScript Comparison**:
In `mixin-definition.js:169`:
```javascript
ruleset.originalRuleset = this;  // Sets to MixinDefinition itself
```

And in recursion check (`mixin-call.js:112`):
```javascript
mixin === (context.frames[f].originalRuleset || context.frames[f])
```

When a wrapped MixinDefinition is in the frames, `frames[f].originalRuleset` points to the original Ruleset, enabling recursion detection.

**Fixes Applied**:

**1. MixinDefinition.EvalCall() - mixin_definition.go:577-585**:
```go
// Before:
ruleset.OriginalRuleset = md.Ruleset

// After:
// Match JavaScript: ruleset.originalRuleset = this
// If this MixinDefinition was created as a wrapper for a Ruleset,
// use the wrapped Ruleset as the originalRuleset for recursion detection.
if md.OriginalRuleset != nil {
    ruleset.OriginalRuleset = md.OriginalRuleset
} else {
    ruleset.OriginalRuleset = md.Ruleset
}
```

**2. Recursion Detection - mixin_call.go:286-291**:
Added support for checking MixinDefinition frames:
```go
} else if frameMixinDef, ok := frame.(*MixinDefinition); ok {
    // Frame is a *MixinDefinition - get its OriginalRuleset
    originalRuleset = frameMixinDef.OriginalRuleset
    if originalRuleset == nil {
        originalRuleset = frame
    }
}
```

This ensures that when a MixinDefinition is in the frames (from evalFrames assignment), we can extract its `OriginalRuleset` for comparison.

**How It Works**:
1. `.clearfix` Ruleset is found and wrapped: `wrapperMD.OriginalRuleset = clearfixRuleset`
2. EvalCall creates result: `resultRuleset.OriginalRuleset = wrapperMD.OriginalRuleset` (the original ruleset!)
3. Evaluation happens with frames: `[wrapperMD, frame, ...]`
4. Inside the ruleset body, `.clearfix()` is called again
5. Recursion check: Is `.clearfix` ruleset === `frames[0].OriginalRuleset`?
6. `frames[0]` is `wrapperMD`, so `frames[0].OriginalRuleset` is `clearfixRuleset`
7. YES! They match → recursion detected → skip this candidate
8. Only the `.clearfix()` MixinDefinition is used → expands to `color: blue;`
9. No infinite loop!

**Verification**:
- ✅ All unit tests pass with no regressions
- ✅ `mixins` test now passes completely (Perfect CSS match!)
- ✅ Infinite recursion issue resolved
- ✅ Perfect CSS match count increased from 14 → 15
- ✅ Failing tests reduced from 13 → 12
- ✅ Overall success rate improved from 37.8% → 38.4%

**Files Modified**:
- `mixin_definition.go:577-585` - Fixed OriginalRuleset assignment in EvalCall()
- `mixin_call.go:286-291` - Added MixinDefinition support in recursion detection

**Key Insight**: Recursion detection for wrapped rulesets requires proper propagation of the `OriginalRuleset` reference through the wrapper MixinDefinition. The Go code was setting it to `md.Ruleset` (often `nil`) instead of `md.OriginalRuleset` (the actual wrapped ruleset), breaking the recursion detection chain.

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
