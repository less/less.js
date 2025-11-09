# LESS Function Evaluation Investigation Report

## Executive Summary

The Go port has all LESS functions registered and available, but many are not being evaluated during compilation. Functions like `round(@r/3)`, `percentage(10px / 50)`, `color("plum")`, and `lighten(#ff0000, 40%, relative)` are output as-is instead of being evaluated to their computed values.

## Key Findings

### 1. Function Registration System Works Correctly

**Status**: ✅ WORKING

All functions ARE registered in the DefaultRegistry through initialization functions:
- **math.go** - registers: ceil, floor, sqrt, abs, tan, sin, cos, atan, asin, acos, round
- **number.go** - registers: min, max, convert, pi, mod, pow, percentage
- **color_functions.go** - registers: rgb, rgba, hsl, hsla, lighten, darken, saturate, color, etc.
- **types.go** - registers: isunit, iscolor, isnumber, isstring, iskeyword, etc.
- **boolean.go** - registers: if, isdefined, boolean
- **list.go** - registers: list, length, extract, nth, range, each, etc.

### 2. Function Call Evaluation Chain

**File**: `/home/user/less.go/packages/less/src/less/less_go/call.go`

The evaluation chain:
1. **Call.Eval()** (line 386) - Entry point for evaluating function calls
2. Creates FunctionCallerFactory if needed (lines 398-441)
3. Creates FunctionCaller via factory (line 479)
4. Checks if function is valid (line 485)
5. If valid: calls function with preprocessed arguments (line 488)
6. If not valid: returns new Call with evaluated args (line 578)

**Critical Code** (call.go:485-520):
```go
if funcCaller.IsValid() {
    processedArgs := c.preprocessArgs(c.Args)
    result, err := funcCaller.Call(processedArgs)
    
    if err != nil {
        exitCalc()
        // Error handling...
        return nil, fmt.Errorf(...)
    }
    exitCalc()
    
    if result != nil {
        // Convert result to node and return
        return result, nil
    }
}

// If function not found or no result, evaluate args and return new Call
evaledArgs := make([]any, len(c.Args))
for i, arg := range c.Args {
    // ... evaluate each arg ...
}
return NewCall(c.Name, evaledArgs, c.GetIndex(), c.FileInfo()), nil
```

### 3. Function Caller Implementation

**File**: `/home/user/less.go/packages/less/src/less/less_go/function_caller.go`

Two implementation classes:

#### A. NewFunctionCaller (Old/Deprecated?)
- Lines 100-119: Basic function caller
- Uses FunctionRegistry.Get() to find functions
- Can return nil if function not found

#### B. DefaultParserFunctionCaller (Current)
- Lines 77-248: Main function caller
- Created by DefaultFunctionCallerFactory (lines 32-74)
- Implements ParserFunctionCaller interface
- Methods:
  - **IsValid()** (line 87) - checks if function exists
  - **Call(args)** (line 173) - executes function with proper arg evaluation

**Key Logic** (function_caller.go:173-248):
```go
func (c *DefaultParserFunctionCaller) Call(args []any) (any, error) {
    if !c.valid || c.funcDef == nil {
        return nil, fmt.Errorf("function %s is not valid", c.name)
    }

    needsEval := c.funcDef.NeedsEvalArgs()

    if !needsEval {
        // Functions like if(), isdefined() don't evaluate args
        // Context is passed as first argument
        funcContext := &Context{
            Frames: []*Frame{
                {
                    FunctionRegistry: tempRegistry,
                    EvalContext:      c.context,
                    CurrentFileInfo:  c.fileInfo,
                },
            },
        }
        return c.funcDef.CallCtx(funcContext, args...)
    }

    // Math-enabled context for function arguments
    mathCtx := c.createMathEnabledContext()
    
    // Evaluate arguments
    evaluatedArgs := make([]any, len(args))
    for i, arg := range args {
        var evalResult any
        // Try different evaluation methods...
        if evalable, ok := arg.(interface { Eval(EvalContext) (any, error) }); ok {
            evalResult, err = evalable.Eval(c.context)
        } else if evalable, ok := arg.(interface { Eval(any) (any, error) }); ok {
            evalResult, err = evalable.Eval(mathCtx)
        } else {
            evalResult = arg
        }
        evaluatedArgs[i] = evalResult
    }

    return c.funcDef.Call(evaluatedArgs...)
}
```

### 4. Critical Issue: How Functions are Found

**File**: `/home/user/less.go/packages/less/src/less/less_go/call.go` (lines 398-441)

The CallerFactory lookup:
```go
if c.CallerFactory == nil {
    // Try to get from *Eval context
    if evalCtx, ok := context.(*Eval); ok {
        if evalCtx.FunctionRegistry != nil {
            c.CallerFactory = NewDefaultFunctionCallerFactory(evalCtx.FunctionRegistry)
        }
    } else if ctxMap, ok := context.(map[string]any); ok {
        // Try to get from map context
        if funcRegistry, exists := ctxMap["functionRegistry"]; exists {
            if registry, ok := funcRegistry.(*Registry); ok {
                c.CallerFactory = NewDefaultFunctionCallerFactory(registry)
            }
        }
    }
    
    // If still nil, use default registry
    if c.CallerFactory == nil {
        c.CallerFactory = NewDefaultFunctionCallerFactory(DefaultRegistry)
    }
}
```

**POTENTIAL ISSUE**: The DefaultRegistry is inherited and populated at init time, but the actual evaluation context might not have the function registry properly set up!

### 5. Function Registry Population

**File**: `/home/user/less.go/packages/less/src/less/less_go/index.go` (lines 651-748)

Function registration in `createFunctions()`:
```go
func createFunctions(env any) any {
    registry := DefaultRegistry.Inherit()
    
    // ... register all functions ...
    registry.AddMultiple(GetWrappedMathFunctions())        // math.go
    registry.AddMultiple(GetWrappedNumberFunctions())      // number.go
    registry.AddMultiple(GetWrappedColorFunctions())       // color_functions.go
    registry.AddMultiple(GetWrappedTypesFunctions())       // types.go
    registry.Add("default", &DefaultFunctionDefinition{})
    
    return &DefaultFunctions{registry: registry}
}
```

### 6. NeedsEvalArgs Implementation

Different function wrappers implement this differently:

**color_functions.go** (lines 1179-1189):
```go
func (w *ColorFunctionWrapper) NeedsEvalArgs() bool {
    switch w.name {
    case "rgb", "rgba", "hsl", "hsla":
        return false  // ⚠️ These DON'T evaluate arguments!
    default:
        return true   // Other color functions DO evaluate
    }
}
```

**math.go** (lines 38-41):
```go
func (w *MathFunctionWrapper) NeedsEvalArgs() bool {
    return true  // ✅ Math functions always evaluate args
}
```

**number.go** (lines 35-38):
```go
func (w *NumberFunctionWrapper) NeedsEvalArgs() bool {
    return true  // ✅ Number functions always evaluate args
}
```

**types.go** (lines 105-107):
```go
func (t *TypeFunctionDef) NeedsEvalArgs() bool {
    return true  // ✅ Type functions always evaluate args
}
```

**boolean.go** (lines 177, 201):
```go
func (f *IfFunctionDef) NeedsEvalArgs() bool { 
    return false  // ✅ Intentional - if() needs unevaluated args
}
func (f *IsDefinedFunctionDef) NeedsEvalArgs() bool { 
    return false  // ✅ Intentional - isdefined() needs unevaluated args
}
```

## Five Root Causes Identified

### ROOT CAUSE 1: FunctionRegistry Not in Evaluation Context

**Severity**: 🔴 HIGH

**Location**: `call.go:398-441`

**Problem**: When Call.Eval() is called, it needs to find the FunctionRegistry. If the context doesn't have it properly set up, it will fall back to DefaultRegistry. However, DefaultRegistry is initialized at package init time and might not have been populated yet if function registration hasn't occurred.

**Evidence**: 
- The code checks for FunctionRegistry in multiple places (Eval context, frames, map context)
- Falls back to DefaultRegistry only if all else fails
- No error if registry is nil

**Fix Needed**:
- Ensure FunctionRegistry is always properly passed in context
- OR ensure DefaultRegistry is properly populated before any eval happens
- OR verify function registry inheritance chain is correct

### ROOT CAUSE 2: Argument Evaluation Failures (Silent)

**Severity**: 🔴 HIGH

**Location**: `function_caller.go:173-248`

**Problem**: Arguments are evaluated, but if evaluation fails, the error might be caught or suppressed. Looking at line 216-226:
```go
var evalResult any
if evalable, ok := arg.(interface { Eval(EvalContext) (any, error) }); ok {
    var err error
    evalResult, err = evalable.Eval(c.context)
    if err != nil {
        return nil, fmt.Errorf("error evaluating argument %d: %w", i, err)
    }
} else if evalable, ok := arg.(interface { Eval(any) (any, error) }); ok {
    // Use the math-enabled context for map-based Eval
    var err error
    evalResult, err = evalable.Eval(mathCtx)
    if err != nil {
        return nil, fmt.Errorf("error evaluating argument %d: %w", i, err)
    }
} else {
    evalResult = arg  // Non-evaluable argument - used as-is
}
```

The third case silently uses non-evaluable arguments! This could be passing unevaluated nodes.

**Evidence**: 
- Arguments that don't implement Eval() are passed as-is
- Some node types might not implement Eval properly
- No logging/trace to see what's happening

**Fix Needed**:
- Add tracing/logging to see what arguments are being received and returned
- Verify all argument types implement Eval properly
- Check if Operation nodes evaluate correctly

### ROOT CAUSE 3: DefaultRegistry vs Context Registry Mismatch

**Severity**: 🔴 HIGH

**Location**: `call.go:399, 439`

**Problem**: Two registry sources:
1. DefaultRegistry (line 70 of function_registry.go) - global, initialized at package init
2. FunctionRegistry in context/frames - should be populated during compilation setup

If the context uses DefaultRegistry but DefaultRegistry isn't fully initialized, functions won't be found.

**Evidence**:
- `createFunctions()` creates a NEW inherited registry instead of populating DefaultRegistry
- The `DefaultFunctions` object returned from `createFunctions()` contains the registry
- But this registry might not be passed to eval contexts properly

**Fix Needed**:
- Verify that `createFunctions()` registry is passed to all Eval contexts
- OR populate DefaultRegistry directly instead of creating new registry
- OR ensure inheritance chain works correctly (Inherit() should chain to base)

### ROOT CAUSE 4: Function Wrapper Type Mismatch

**Severity**: 🟡 MEDIUM

**Location**: Various `Call()` methods in function wrappers

**Problem**: Each function wrapper has a different signature for its Call() method:

**MathFunctionWrapper** (math.go:29-31):
```go
func (w *MathFunctionWrapper) Call(args ...any) (any, error) {
    return w.fn(args...)
}
```

**NumberFunctionWrapper** (number.go:26-28):
```go
func (w *NumberFunctionWrapper) Call(args ...any) (any, error) {
    return w.fn(args...)
}
```

**ColorFunctionWrapper** (color_functions.go:975-1172):
```go
func (w *ColorFunctionWrapper) Call(args ...any) (any, error) {
    switch w.name {
    case "rgb":
        if len(args) == 1 || len(args) == 3 {
            if fn, ok := w.fn.(func(any, any, any) any); ok {
                // ... custom handling ...
            }
        }
        // ... many cases ...
    }
}
```

**TypeFunctionDef** (types.go:63-99):
```go
func (t *TypeFunctionDef) Call(args ...any) (any, error) {
    // Handles variable argument counts
    switch fn := t.fn.(type) {
    case func(any) (*Keyword, error):
        return fn(args[0])
    case func(any, any) (*Keyword, error):
        return fn(args[0], args[1])
    // ... etc ...
    }
}
```

Some wrappers might be:
- Type-asserting incorrectly
- Returning nil on type mismatch
- Not handling optional arguments properly

**Evidence**:
- ColorFunctionWrapper has extensive type matching logic
- TypeFunctionDef tries multiple function signatures
- Some functions might not match their wrappers' expected signatures

**Fix Needed**:
- Verify function implementations match their wrapper signatures
- Add better error messages for signature mismatches
- Add tracing to see what types are being received

### ROOT CAUSE 5: CSS-Native vs LESS Function Distinction Missing

**Severity**: 🟡 MEDIUM

**Location**: `call.go:485-520` (specifically missing after line 520)

**Problem**: There's no logic to distinguish between:
1. CSS-native functions (calc, var, url, attr, rgb as CSS function, etc.) - should NOT be evaluated
2. LESS functions (lighten, percentage, round, etc.) - SHOULD be evaluated

In JavaScript call.js, if `funcCaller.isValid()` is false, it returns a new Call node with unevaluated arguments. This works for unknown functions.

But for CSS-native functions that ARE registered as LESS functions (like rgb, hsl), there's a conflict:
- If rgb() is in registry and NeedsEvalArgs=true, it WILL be evaluated
- If rgb() is NOT in registry, it will be passed through as CSS function

**Evidence**:
- `ColorFunctionWrapper.NeedsEvalArgs()` returns false for rgb/hsl specifically for comma-less syntax
- But this means they DON'T evaluate arguments, which might be wrong

**Fix Needed**:
- Clarify which functions should ALWAYS be evaluated vs which should pass through
- Handle CSS custom property syntax rgb() calls differently from LESS rgb() calls
- OR verify that rgb/hsl with NeedsEvalArgs=false is correct behavior

## Code Location Summary

| Issue | File | Lines | Severity |
|-------|------|-------|----------|
| Function registry creation | function_registry.go | 1-70 | 🟡 |
| Function caller factory | call.go | 32-74 | 🔴 |
| Function call evaluation | call.go | 386-579 | 🔴 |
| Function caller arg evaluation | function_caller.go | 173-248 | 🔴 |
| Context FunctionRegistry lookup | call.go | 398-441 | 🔴 |
| Function registration | index.go | 651-748 | 🔴 |
| Color function args eval | color_functions.go | 1179-1189 | 🟡 |

## Recommended Investigation Steps

1. **Add Debug Tracing**:
   ```bash
   LESS_GO_TRACE=1 pnpm -w test:go 2>&1 | grep -A 5 "round\|percentage"
   ```
   Add tracing to function_caller.go Call() method to see:
   - Is function found?
   - Are arguments being evaluated?
   - What is being returned?

2. **Test with Simple Case**:
   ```less
   .test {
     value: round(3.5);  // Should be 4
     color: lighten(#ff0000, 20%);  // Should be lighter red
   }
   ```

3. **Check Function Registry**:
   - Add code to print all registered functions at init time
   - Verify math, number, color functions are in registry

4. **Trace Argument Evaluation**:
   - Add logging in function_caller.go to see what arguments are received
   - Verify Operation, Dimension, etc. evaluate properly

5. **Check Default Registry Setup**:
   - Verify DefaultRegistry is populated by init() functions
   - Check if createFunctions() registry is being used or DefaultRegistry

## Conclusion

The function evaluation system is architecturally sound, but there are likely 2-3 specific issues preventing functions from being evaluated:

1. **Missing FunctionRegistry in evaluation context** (most likely)
2. **Argument evaluation failures or silent fallbacks** (likely)
3. **Default registry not being populated or used** (possible)

The fixes are likely surgical and not requiring major architectural changes.

