package less_go

import (
	"fmt"
	"strings"
)

// EvalContext represents the interface needed for evaluation context
type EvalContext interface {
	IsMathOn() bool
	SetMathOn(bool)
	IsInCalc() bool
	EnterCalc()
	ExitCalc()
	GetFrames() []ParserFrame
	GetImportantScope() []map[string]bool
	GetDefaultFunc() *DefaultFunc
}

// ParserFunctionCaller represents the interface needed to call functions
type ParserFunctionCaller interface {
	IsValid() bool
	Call(args []any) (any, error)
}

// FunctionCallerFactory creates function callers
type FunctionCallerFactory interface {
	NewFunctionCaller(name string, context EvalContext, index int, fileInfo map[string]any) (ParserFunctionCaller, error)
}

// DefaultFunctionCallerFactory implements FunctionCallerFactory using a registry
type DefaultFunctionCallerFactory struct {
	adapter *RegistryFunctionAdapter
}

// NewDefaultFunctionCallerFactory creates a new DefaultFunctionCallerFactory
func NewDefaultFunctionCallerFactory(registry *Registry) *DefaultFunctionCallerFactory {
	return &DefaultFunctionCallerFactory{
		adapter: NewRegistryFunctionAdapter(registry),
	}
}

// NewFunctionCaller creates a ParserFunctionCaller
func (f *DefaultFunctionCallerFactory) NewFunctionCaller(name string, context EvalContext, index int, fileInfo map[string]any) (ParserFunctionCaller, error) {
	// Get function definition from registry via adapter
	lowerName := strings.ToLower(name)
	funcDef := f.adapter.Get(lowerName)

	if funcDef == nil {
		// Return an invalid caller - this matches JavaScript behavior where unknown functions are not called
		return &DefaultParserFunctionCaller{
			name:     lowerName,
			valid:    false,
			funcDef:  nil,
			context:  context,
			index:    index,
			fileInfo: fileInfo,
		}, nil
	}

	// funcDef is already a FunctionDefinition from the adapter
	definition := funcDef

	return &DefaultParserFunctionCaller{
		name:     lowerName,
		valid:    true,
		funcDef:  definition,
		context:  context,
		index:    index,
		fileInfo: fileInfo,
	}, nil
}

// DefaultParserFunctionCaller implements ParserFunctionCaller
type DefaultParserFunctionCaller struct {
	name     string
	valid    bool
	funcDef  FunctionDefinition
	context  EvalContext
	index    int
	fileInfo map[string]any
}

// IsValid returns whether this caller has a valid function
func (c *DefaultParserFunctionCaller) IsValid() bool {
	return c.valid
}

// Call executes the function with the given arguments
func (c *DefaultParserFunctionCaller) Call(args []any) (any, error) {
	if !c.valid || c.funcDef == nil {
		return nil, fmt.Errorf("function %s is not valid", c.name)
	}

	// Determine if we need to evaluate arguments
	needsEval := c.funcDef.NeedsEvalArgs()

	// Create a simplified context for function calling if needed
	if !needsEval {
		// For functions that don't need evaluated args, create a minimal context
		// We need a registry that contains this function
		tempRegistry := NewRegistryFunctionAdapter(DefaultRegistry.Inherit())
		tempRegistry.registry.Add(c.name, c.funcDef)

		funcContext := &Context{
			Frames: []*Frame{
				{
					FunctionRegistry: tempRegistry,
				},
			},
		}
		return c.funcDef.CallCtx(funcContext, args...)
	}

	// For functions that need evaluated args, evaluate them first
	evaluatedArgs := make([]any, len(args))
	for i, arg := range args {
		// First try the EvalContext interface
		if evalable, ok := arg.(interface {
			Eval(EvalContext) (any, error)
		}); ok {
			evalResult, err := evalable.Eval(c.context)
			if err != nil {
				return nil, fmt.Errorf("error evaluating argument %d: %w", i, err)
			}
			evaluatedArgs[i] = evalResult
		} else if evalable, ok := arg.(interface {
			Eval(any) (any, error)
		}); ok {
			// Fallback to the more generic Eval(any) signature
			evalResult, err := evalable.Eval(c.context)
			if err != nil {
				return nil, fmt.Errorf("error evaluating argument %d: %w", i, err)
			}
			evaluatedArgs[i] = evalResult
		} else {
			evaluatedArgs[i] = arg
		}
	}

	return c.funcDef.Call(evaluatedArgs...)
}

// MapEvalContext implements EvalContext for map[string]any contexts
type MapEvalContext struct {
	ctx map[string]any
}

// IsMathOn returns whether math operations are enabled
func (m *MapEvalContext) IsMathOn() bool {
	if mathOn, exists := m.ctx["mathOn"]; exists {
		if enabled, ok := mathOn.(bool); ok {
			return enabled
		}
	}
	return false
}

// SetMathOn sets whether math operations are enabled
func (m *MapEvalContext) SetMathOn(enabled bool) {
	m.ctx["mathOn"] = enabled
}

// IsInCalc returns whether we're inside a calc() function
func (m *MapEvalContext) IsInCalc() bool {
	if inCalc, exists := m.ctx["inCalc"]; exists {
		if enabled, ok := inCalc.(bool); ok {
			return enabled
		}
	}
	return false
}

// EnterCalc marks that we're entering a calc() function
func (m *MapEvalContext) EnterCalc() {
	m.ctx["inCalc"] = true
}

// ExitCalc marks that we're exiting a calc() function
func (m *MapEvalContext) ExitCalc() {
	m.ctx["inCalc"] = false
}

// GetFrames returns the current frames stack
func (m *MapEvalContext) GetFrames() []ParserFrame {
	if framesAny, exists := m.ctx["frames"]; exists {
		if frameSlice, ok := framesAny.([]any); ok {
			frames := make([]ParserFrame, 0, len(frameSlice))
			for _, f := range frameSlice {
				if frame, ok := f.(ParserFrame); ok {
					frames = append(frames, frame)
				}
			}
			return frames
		}
	}
	return []ParserFrame{}
}

// GetImportantScope returns the current important scope stack
func (m *MapEvalContext) GetImportantScope() []map[string]bool {
	if importantScope, exists := m.ctx["importantScope"]; exists {
		if scope, ok := importantScope.([]map[string]bool); ok {
			return scope
		}
	}
	return []map[string]bool{}
}

// GetDefaultFunc returns the default function instance
func (m *MapEvalContext) GetDefaultFunc() *DefaultFunc {
	if defaultFunc, exists := m.ctx["defaultFunc"]; exists {
		if df, ok := defaultFunc.(*DefaultFunc); ok {
			return df
		}
	}
	return nil
}

// RegistryAdapter adapts a single FunctionDefinition to the FunctionRegistry interface
type RegistryAdapter struct {
	registry FunctionDefinition
	name     string
}

// Get implements FunctionRegistry interface
func (r *RegistryAdapter) Get(name string) FunctionDefinition {
	if strings.EqualFold(name, r.name) {
		return r.registry
	}
	return nil
}

// Call represents a function call node in the Less AST.
type Call struct {
	*Node
	Name          string
	Args          []any
	Calc          bool
	_index        int
	_fileInfo     map[string]any
	CallerFactory FunctionCallerFactory // Factory for creating FunctionCaller instances
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
func (c *Call) Eval(context any) (any, error) {
	// Convert context to EvalContext if it's a map
	var evalContext EvalContext
	if ctx, ok := context.(EvalContext); ok {
		evalContext = ctx
	} else if ctxMap, ok := context.(map[string]any); ok {
		// Create a bridge EvalContext from the map
		evalContext = &MapEvalContext{ctx: ctxMap}
	} else {
		return nil, fmt.Errorf("invalid context type: %T", context)
	}

	// Set up CallerFactory from context if not already set
	if c.CallerFactory == nil {
		if ctxMap, ok := context.(map[string]any); ok {
			// Try to get function registry from context
			if funcRegistry, exists := ctxMap["functionRegistry"]; exists {
				if registry, ok := funcRegistry.(*Registry); ok {
					c.CallerFactory = NewDefaultFunctionCallerFactory(registry)
				}
			} else {
				// Try to get from frames
				if frames, exists := ctxMap["frames"]; exists {
					if frameList, ok := frames.([]any); ok {
						for _, frame := range frameList {
							if ruleset, ok := frame.(*Ruleset); ok && ruleset.FunctionRegistry != nil {
								if registry, ok := ruleset.FunctionRegistry.(*Registry); ok {
									c.CallerFactory = NewDefaultFunctionCallerFactory(registry)
									break
								}
							}
						}
					}
				}
			}
		}
		// If still nil, use default registry
		if c.CallerFactory == nil {
			c.CallerFactory = NewDefaultFunctionCallerFactory(DefaultRegistry)
		}
	}
	// Turn off math for calc(), and switch back on for evaluating nested functions
	currentMathContext := evalContext.IsMathOn()
	evalContext.SetMathOn(!c.Calc)

	if c.Calc || evalContext.IsInCalc() {
		evalContext.EnterCalc()
	}

	exitCalc := func() {
		if c.Calc || evalContext.IsInCalc() {
			evalContext.ExitCalc()
		}
		evalContext.SetMathOn(currentMathContext)
	}

	var result any
	var err error

	// Check if we have a function caller factory
	if c.CallerFactory == nil {
		// No function caller, evaluate args and return
		exitCalc()
		evaledArgs := make([]any, len(c.Args))
		for i, arg := range c.Args {
			if evalable, ok := arg.(interface{ Eval(any) (any, error) }); ok {
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

	funcCaller, err := c.CallerFactory.NewFunctionCaller(c.Name, evalContext, c.GetIndex(), c.FileInfo())
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
		// Check if result implements common node interfaces or is a known node type
		isNodeType := false
		switch result.(type) {
		case *Node, *Color, *Dimension, *Quoted, *Anonymous, *Keyword, *Value, *Expression, *Call, *Ruleset, *Declaration:
			isNodeType = true
		case interface{ GetType() string }:
			// Has GetType method, likely a node
			isNodeType = true
		}
		
		if !isNodeType {
			// Check for falsy values or true - these should return empty Anonymous nodes
			// JavaScript behavior: if (!result || result === true)
			if result == nil || result == false || result == true || result == "" {
				result = NewAnonymous(nil, 0, nil, false, false, nil)
			} else {
				// Non-falsy values are converted to string
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
		if evalable, ok := arg.(interface{ Eval(any) (any, error) }); ok {
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
	// Special case: _SELF should output its argument directly, not as a function call
	if c.Name == "_SELF" && len(c.Args) > 0 {
		if genCSSable, ok := c.Args[0].(interface{ GenCSS(any, *CSSOutput) }); ok {
			genCSSable.GenCSS(context, output)
			return
		}
	}
	
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
