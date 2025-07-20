package less_go

import (
	"fmt"
)

// DefaultFunctionDefinition implements the default() function for mixin guards
type DefaultFunctionDefinition struct {
	// We'll store a reference to get the context's default function
}

// NeedsEvalArgs returns false since default() takes no arguments
func (d *DefaultFunctionDefinition) NeedsEvalArgs() bool {
	return false
}

// Call implements the default() function
func (d *DefaultFunctionDefinition) Call(args ...any) (any, error) {
	if len(args) > 0 {
		return nil, fmt.Errorf("default() takes no arguments")
	}
	// This should be called via CallCtx with context
	return nil, fmt.Errorf("default() requires context")
}

// CallCtx implements the default() function with context
func (d *DefaultFunctionDefinition) CallCtx(ctx *Context, args ...any) (any, error) {
	if len(args) > 0 {
		return nil, fmt.Errorf("default() takes no arguments")
	}

	// Try to get the default function from the context
	var defaultFunc *DefaultFunc
	
	// Look through frames for eval context
	for i := len(ctx.Frames) - 1; i >= 0; i-- {
		frame := ctx.Frames[i]
		if evalCtx, ok := frame.EvalContext.(EvalContext); ok {
			defaultFunc = evalCtx.GetDefaultFunc()
			if defaultFunc != nil {
				break
			}
		}
	}

	if defaultFunc == nil {
		// Return nil if no default function is available
		return nil, nil
	}

	// Call Eval which may panic
	defer func() {
		if r := recover(); r != nil {
			// Convert panic to error if needed
			if err, ok := r.(error); ok {
				// Re-panic with the error - this matches JavaScript behavior
				panic(err)
			}
			panic(r)
		}
	}()
	
	result := defaultFunc.Eval()
	return result, nil
}