package less_go

import (
	"fmt"
	"os"
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

	debug := os.Getenv("LESS_DEBUG_GUARDS") == "1"
	if debug {
		fmt.Printf("DEBUG:   default() CallCtx: looking through %d frames\n", len(ctx.Frames))
	}

	// Look through frames for eval context
	for i := len(ctx.Frames) - 1; i >= 0; i-- {
		frame := ctx.Frames[i]
		if debug {
			fmt.Printf("DEBUG:     Frame[%d]: EvalContext type=%T\n", i, frame.EvalContext)
		}
		if evalCtx, ok := frame.EvalContext.(EvalContext); ok {
			defaultFunc = evalCtx.GetDefaultFunc()
			if debug {
				fmt.Printf("DEBUG:     Frame[%d]: GetDefaultFunc() returned %v\n", i, defaultFunc)
			}
			if defaultFunc != nil {
				break
			}
		}
	}

	if defaultFunc == nil {
		if debug {
			fmt.Printf("DEBUG:   default() CallCtx: no defaultFunc found, returning nil\n")
		}
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