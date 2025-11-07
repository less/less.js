package less_go

import (
	"fmt"
	"os"
)

func init() {
	// Register boolean functions in DefaultRegistry so they're available even when
	// the context doesn't have a proper function registry
	// Boolean function with one argument
	DefaultRegistry.Add("boolean", &FlexibleFunctionDef{
		name:      "boolean",
		minArgs:   1,
		maxArgs:   1,
		variadic:  false,
		fn:        func(args ...any) any { return Boolean(args[0]) },
		needsEval: true,
	})

	// If function with 2-3 arguments (condition, trueValue, optional falseValue)
	DefaultRegistry.Add("if", &IfFunctionDef{})

	// IsDefined function with one argument
	DefaultRegistry.Add("isdefined", &IsDefinedFunctionDef{})
}

// Boolean function implementation
// The boolean() function uses isTruthy to check truthiness
func Boolean(condition any) *Keyword {
	if isTruthy(condition) {
		return KeywordTrue
	}
	return KeywordFalse
}

// If function implementation - takes unevaluated nodes
func If(context *Context, condition any, trueValue any, falseValue any) any {
	// Get the EvalContext from the first frame if available
	var evalContext any = context
	if context != nil && len(context.Frames) > 0 && context.Frames[0].EvalContext != nil {
		evalContext = context.Frames[0].EvalContext
	}

	// Evaluate condition first
	var conditionResult any
	if evaluable, ok := condition.(interface{ Eval(any) (any, error) }); ok {
		result, _ := evaluable.Eval(evalContext)
		conditionResult = result
	} else if evaluable, ok := condition.(interface{ Eval(any) any }); ok {
		conditionResult = evaluable.Eval(evalContext)
	} else {
		conditionResult = condition
	}

	// Debug output
	debug := os.Getenv("LESS_DEBUG_IF") == "1"
	if debug {
		fmt.Printf("[If] condition=%v (type: %T)\n", condition, condition)
		fmt.Printf("[If] conditionResult=%v (type: %T)\n", conditionResult, conditionResult)
		fmt.Printf("[If] isTruthy(conditionResult)=%v\n", isTruthy(conditionResult))
	}

	if isTruthy(conditionResult) {
		// Evaluate and return true value
		if evaluable, ok := trueValue.(interface{ Eval(any) (any, error) }); ok {
			result, _ := evaluable.Eval(evalContext)
			return result
		} else if evaluable, ok := trueValue.(interface{ Eval(any) any }); ok {
			return evaluable.Eval(evalContext)
		}
		return trueValue
	}

	if falseValue != nil {
		// Evaluate and return false value
		if evaluable, ok := falseValue.(interface{ Eval(any) (any, error) }); ok {
			result, _ := evaluable.Eval(evalContext)
			return result
		} else if evaluable, ok := falseValue.(interface{ Eval(any) any }); ok {
			return evaluable.Eval(evalContext)
		}
		return falseValue
	}

	return NewAnonymous("", 0, nil, false, false, nil)
}

// IsDefined function implementation - checks if a variable can be evaluated
func IsDefined(context *Context, variable any) *Keyword {
	defer func() {
		if recover() != nil {
			// If eval panics, variable is not defined
		}
	}()

	// Get the EvalContext from the first frame if available
	var evalContext any = context
	if context != nil && len(context.Frames) > 0 && context.Frames[0].EvalContext != nil {
		evalContext = context.Frames[0].EvalContext
	}

	if evaluable, ok := variable.(interface{ Eval(any) (any, error) }); ok {
		_, err := evaluable.Eval(evalContext)
		if err != nil {
			return KeywordFalse
		}
		return KeywordTrue
	}

	// If it's not evaluable, it's defined by default
	return KeywordTrue
}


// GetBooleanFunctions returns the boolean function registry
func GetBooleanFunctions() map[string]any {
	return map[string]any{
		"boolean":   Boolean,
		"if":        If,
		"isdefined": IsDefined,
	}
}

// GetWrappedBooleanFunctions returns boolean functions wrapped as FunctionDefinitions for registry
func GetWrappedBooleanFunctions() map[string]interface{} {
	return map[string]interface{}{
		"boolean": &FlexibleFunctionDef{
			name:      "boolean",
			minArgs:   1,
			maxArgs:   1,
			variadic:  false,
			fn:        func(args ...any) any { return Boolean(args[0]) },
			needsEval: true,
		},
		"if":        &IfFunctionDef{},
		"isdefined": &IsDefinedFunctionDef{},
	}
}

// IfFunctionDef implements the if() function
type IfFunctionDef struct{}

func (f *IfFunctionDef) Call(args ...any) (any, error) {
	if len(args) < 2 || len(args) > 3 {
		return nil, fmt.Errorf("if function expects 2-3 arguments, got %d", len(args))
	}

	// Create a minimal context for backward compatibility
	ctx := &Context{}

	condition := args[0]
	trueValue := args[1]
	var falseValue any
	if len(args) > 2 {
		falseValue = args[2]
	}

	return If(ctx, condition, trueValue, falseValue), nil
}

func (f *IfFunctionDef) CallCtx(ctx *Context, args ...any) (any, error) {
	if len(args) < 2 || len(args) > 3 {
		return nil, fmt.Errorf("if function expects 2-3 arguments, got %d", len(args))
	}

	condition := args[0]
	trueValue := args[1]
	var falseValue any
	if len(args) > 2 {
		falseValue = args[2]
	}

	return If(ctx, condition, trueValue, falseValue), nil
}

func (f *IfFunctionDef) NeedsEvalArgs() bool { return false } // Don't eval args, if() needs unevaluated args

// IsDefinedFunctionDef implements the isdefined() function
type IsDefinedFunctionDef struct{}

func (f *IsDefinedFunctionDef) Call(args ...any) (any, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("isdefined function expects 1 argument, got %d", len(args))
	}

	// Create a minimal context for backward compatibility
	ctx := &Context{}

	return IsDefined(ctx, args[0]), nil
}

func (f *IsDefinedFunctionDef) CallCtx(ctx *Context, args ...any) (any, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("isdefined function expects 1 argument, got %d", len(args))
	}

	return IsDefined(ctx, args[0]), nil
}

func (f *IsDefinedFunctionDef) NeedsEvalArgs() bool { return false } // Don't eval args