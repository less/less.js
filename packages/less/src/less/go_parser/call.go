package go_parser

import (
	"fmt"
)

// EvalContext represents the interface needed for evaluation context
type EvalContext interface {
	IsMathOn() bool
	SetMathOn(bool)
	IsInCalc() bool
	EnterCalc()
	ExitCalc()
	GetFrames() []Frame
	GetImportantScope() []map[string]bool
}

// FunctionCaller represents the interface needed to call functions
type FunctionCaller interface {
	IsValid() bool
	Call(args []any) (any, error)
}

// FunctionCallerFactory creates function callers
type FunctionCallerFactory interface {
	NewFunctionCaller(name string, context EvalContext, index int, fileInfo map[string]any) (FunctionCaller, error)
}

// Call represents a function call node in the Less AST.
type Call struct {
	*Node
	Name            string
	Args            []any
	Calc            bool
	_index          int
	_fileInfo       map[string]any
	CallerFactory   FunctionCallerFactory // Factory for creating FunctionCaller instances
}

// NewCall creates a new Call instance.
func NewCall(name string, args []any, index int, currentFileInfo map[string]any) *Call {
	return &Call{
		Node:      NewNode(),
		Name:      name,
		Args:      args,
		Calc:      name == "calc",
		_index:    index,
		_fileInfo: currentFileInfo,
	}
}

// GetType returns the node type.
func (c *Call) GetType() string {
	return "Call"
}

// Accept processes the node's children with a visitor.
func (c *Call) Accept(visitor any) {
	if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok && c.Args != nil {
		c.Args = v.VisitArray(c.Args)
	}
}

// GetIndex returns the node's index.
func (c *Call) GetIndex() int {
	return c._index
}

// FileInfo returns the node's file information.
func (c *Call) FileInfo() map[string]any {
	return c._fileInfo
}

// Eval evaluates the function call.
func (c *Call) Eval(context EvalContext) (any, error) {
	// Turn off math for calc(), and switch back on for evaluating nested functions
	currentMathContext := context.IsMathOn()
	context.SetMathOn(!c.Calc)

	if c.Calc || context.IsInCalc() {
		context.EnterCalc()
	}

	exitCalc := func() {
		if c.Calc || context.IsInCalc() {
			context.ExitCalc()
		}
		context.SetMathOn(currentMathContext)
	}

	var result any
	var err error

	// Check if we have a function caller factory
	if c.CallerFactory == nil {
		// No function caller, evaluate args and return
		exitCalc()
		evaledArgs := make([]any, len(c.Args))
		for i, arg := range c.Args {
			if evalable, ok := arg.(interface{ Eval(EvalContext) (any, error) }); ok {
				evaledVal, err := evalable.Eval(context)
				if err != nil {
					return nil, err
				}
				evaledArgs[i] = evaledVal
			} else {
				evaledArgs[i] = arg
			}
		}
		return NewCall(c.Name, evaledArgs, c.GetIndex(), c.FileInfo()), nil
	}

	funcCaller, err := c.CallerFactory.NewFunctionCaller(c.Name, context, c.GetIndex(), c.FileInfo())
	if err != nil {
		exitCalc()
		return nil, err
	}

	if funcCaller.IsValid() {
		result, err = funcCaller.Call(c.Args)
		if err != nil {
			exitCalc()
			// Check if error has line and column properties
			if e, ok := err.(interface{ HasLineColumn() bool }); ok && e.HasLineColumn() {
				return nil, err
			}

			var lineNumber, columnNumber int
			e, ok := err.(interface {
				LineNumber() int
				ColumnNumber() int
			})
			if ok {
				lineNumber = e.LineNumber()
				columnNumber = e.ColumnNumber()
			}

			errorType := "Runtime"
			if typedErr, ok := err.(interface{ Type() string }); ok {
				errorType = typedErr.Type()
			}

			errorMsg := fmt.Sprintf("Error evaluating function `%s`", c.Name)
			if err.Error() != "" {
				errorMsg += fmt.Sprintf(": %s", err.Error())
			}

			return nil, fmt.Errorf("%s: %s (index: %d, filename: %s, line: %d, column: %d)",
				errorType, errorMsg, c.GetIndex(), c.FileInfo()["filename"], lineNumber, columnNumber)
		}
		exitCalc()
	}

	if result != nil {
		// Results that are not nodes are cast as Anonymous nodes
		// Falsy values or booleans are returned as empty nodes
		if _, isNode := result.(*Node); !isNode {
			if _, isBool := result.(bool); isBool {
				// For any boolean value, return an empty Anonymous node
				result = NewAnonymous(nil, 0, nil, false, false, nil)
			} else {
				// Non-boolean values
				result = NewAnonymous(fmt.Sprintf("%v", result), 0, nil, false, false, nil)
			}
		}

		// Set index and file info
		resultNode, ok := result.(interface {
			SetIndex(int)
			SetFileInfo(map[string]any)
		})
		if ok {
			resultNode.SetIndex(c._index)
			resultNode.SetFileInfo(c._fileInfo)
		}
		return result, nil
	}

	// Evaluate args
	evaledArgs := make([]any, len(c.Args))
	for i, arg := range c.Args {
		if evalable, ok := arg.(interface{ Eval(EvalContext) (any, error) }); ok {
			evaledVal, err := evalable.Eval(context)
			if err != nil {
				return nil, err
			}
			evaledArgs[i] = evaledVal
		} else {
			evaledArgs[i] = arg
		}
	}
	exitCalc()

	return NewCall(c.Name, evaledArgs, c.GetIndex(), c.FileInfo()), nil
}

// GenCSS generates CSS representation of the function call.
func (c *Call) GenCSS(context any, output *CSSOutput) {
	output.Add(c.Name+"(", c.FileInfo(), c.GetIndex())

	for i, arg := range c.Args {
		if genCSSable, ok := arg.(interface{ GenCSS(any, *CSSOutput) }); ok {
			genCSSable.GenCSS(context, output)
			if i+1 < len(c.Args) {
				output.Add(", ", nil, nil)
			}
		}
	}

	output.Add(")", nil, nil)
} 