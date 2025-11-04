package less_go

import (
	"fmt"
	"strings"

)

// Context represents the evaluation context.
// This is a simplified representation; more fields might be needed.
type Context struct {
	Frames []*Frame
	// Add other context fields as needed (e.g., isMathOn, inParenthesis)
}

// GetFrames implements the interface expected by Variable.Eval
// It delegates to the underlying EvalContext if available
func (c *Context) GetFrames() []ParserFrame {
	if c == nil || len(c.Frames) == 0 {
		return []ParserFrame{}
	}
	// Get frames from the first Frame's EvalContext
	if c.Frames[0].EvalContext != nil {
		if ec, ok := c.Frames[0].EvalContext.(interface{ GetFrames() []ParserFrame }); ok {
			return ec.GetFrames()
		}
	}
	return []ParserFrame{}
}

// Frame represents a scope frame.
type Frame struct {
	FunctionRegistry FunctionRegistry
	variables        map[string]any // Add variable storage
	EvalContext      EvalContext    // Reference to the evaluation context
}

// Variable gets a variable from the frame
func (f *Frame) Variable(name string) any {
	if f.variables == nil {
		return nil
	}
	return f.variables[name]
}

// SetVariable sets a variable in the frame
func (f *Frame) SetVariable(name string, value any) {
	if f.variables == nil {
		f.variables = make(map[string]any)
	}
	f.variables[name] = value
}

// FunctionRegistry provides access to registered functions.
type FunctionRegistry interface {
	Get(name string) FunctionDefinition
}

// FunctionDefinition defines a Less function.
type FunctionDefinition interface {
	// Call handles functions where args are evaluated (evalArgs=true, default)
	Call(args ...any) (any, error)
	// CallCtx handles functions where args are not evaluated (evalArgs=false)
	CallCtx(ctx *Context, args ...any) (any, error)
	// NeedsEvalArgs returns true if arguments should be evaluated before calling.
	NeedsEvalArgs() bool
}

// Evaluable defines types that have an Eval method.
type Evaluable interface {
	Eval(context *Context) (any, error)
}

// NodeWithType defines types that have a GetType method.
type NodeWithType interface {
	GetType() string
}

// NodeWithOp defines types that have an GetOp method.
type NodeWithOp interface {
	GetOp() string
}

// NodeWithParens defines types that have a GetParens method.
type NodeWithParens interface {
    GetParens() bool
}


// FunctionCaller handles calling Less functions.
type FunctionCaller struct {
	Name            string
	Index           int
	Context         *Context
	CurrentFileInfo any // Keep as any for file info representation
	Func            FunctionDefinition
}

// NewFunctionCaller creates a new FunctionCaller.
func NewFunctionCaller(name string, context *Context, index int, currentFileInfo any) (*FunctionCaller, error) {
	if name == "" {
		return nil, fmt.Errorf("function name is required")
	}
	if context == nil || len(context.Frames) == 0 || context.Frames[0] == nil || context.Frames[0].FunctionRegistry == nil {
		return nil, fmt.Errorf("invalid context structure provided: missing frames or function registry")
	}

	lowerName := strings.ToLower(name)
	registeredFunc := context.Frames[0].FunctionRegistry.Get(lowerName)

	return &FunctionCaller{
		Name:            lowerName,
		Index:           index,
		Context:         context,
		CurrentFileInfo: currentFileInfo,
		Func:            registeredFunc, // This can be nil if not found
	}, nil
}

// IsValid checks if the function caller corresponds to a registered function.
func (fc *FunctionCaller) IsValid() bool {
	return fc.Func != nil
}

// Call executes the Less function with the given arguments.
func (fc *FunctionCaller) Call(args any) (any, error) {
	if !fc.IsValid() {
		return nil, fmt.Errorf("function '%s' is not registered", fc.Name)
	}

	// Convert single arg to array if needed (matching JavaScript behavior)
	var argsArray []any
	if arr, ok := args.([]any); ok {
		argsArray = arr
	} else {
		argsArray = []any{args}
	}
	

	evalArgs := fc.Func.NeedsEvalArgs()

	var evaluatedArgs []any
	if evalArgs {
		evaluatedArgs = make([]any, 0, len(argsArray))
		for i, arg := range argsArray {
			if evaluatableArg, ok := arg.(Evaluable); ok {
				evaluatedValue, err := evaluatableArg.Eval(fc.Context)
				if err != nil {
					return nil, fmt.Errorf("error evaluating argument %d for function %s: %w", i, fc.Name, err)
				}
				evaluatedArgs = append(evaluatedArgs, evaluatedValue)
			} else {
				// If an argument cannot be evaluated but evaluation is needed, it's an error.
				return nil, fmt.Errorf("argument %d (type %T) cannot be evaluated but function '%s' requires evaluated arguments", i, arg, fc.Name)
			}
		}
	} else {
		evaluatedArgs = argsArray // Use raw args if evaluation is not needed
	}

	// Filter comments and process Expressions
	processedArgs := make([]any, 0, len(evaluatedArgs))
	for _, item := range evaluatedArgs {
		if node, ok := item.(NodeWithType); ok && node.GetType() == "Comment" {
			continue // Skip comments
		}

		// Handle Expression nodes specifically
		if expr, ok := item.(*Expression); ok {
			// Filter comments *within* the expression's value list
			subNodes := make([]any, 0, len(expr.Value))
			for _, subItem := range expr.Value {
				if node, ok := subItem.(NodeWithType); ok && node.GetType() == "Comment" {
					continue
				}
				subNodes = append(subNodes, subItem)
			}

			if len(subNodes) == 1 {
				// Logic from https://github.com/less/js/issues/3616
				// Check if the expression had parens and the single inner node is a division operation.
				nodeWithOp, opOk := subNodes[0].(NodeWithOp)
				hasParens := false
				// Direct field access on the Expression struct itself
				if exprItem, exprOk := item.(*Expression); exprOk {
					hasParens = exprItem.Parens // Check Expression.Parens, not Node.Parens
				}

				if hasParens && opOk && nodeWithOp.GetOp() == "/" {
					processedArgs = append(processedArgs, item) // Keep original expression
				} else {
					processedArgs = append(processedArgs, subNodes[0]) // Unwrap the single node
				}
			} else {
				// If multiple nodes remain after filtering, create a new Expression.
				// Pass NoSpacing from original expression
				newExpr, err := NewExpression(subNodes, expr.NoSpacing)
				if err != nil {
					// This should ideally not happen if subNodes is valid
					return nil, fmt.Errorf("error creating new expression from filtered nodes: %w", err)
				}
                // Preserve original parens status? JS doesn't seem to explicitly.
                // newExpr.Parens = expr.Parens
				processedArgs = append(processedArgs, newExpr)
			}
		} else {
			// Keep non-comment, non-expression items as they are
			processedArgs = append(processedArgs, item)
		}
	}

	// Call the actual function implementation
	var result any
	var err error
	if evalArgs {
		result, err = fc.Func.Call(processedArgs...)
	} else {
		result, err = fc.Func.CallCtx(fc.Context, processedArgs...)
	}

    if err != nil {
        return nil, fmt.Errorf("error calling function '%s': %w", fc.Name, err)
    }

	return result, nil
} 