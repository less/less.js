package tree

import (
	"fmt"
	"regexp"
	"strings"
)

// JsEvalNode represents a JavaScript evaluation node in the Less AST
type JsEvalNode struct {
	*Node
}

// NewJsEvalNode creates a new JsEvalNode instance
func NewJsEvalNode() *JsEvalNode {
	return &JsEvalNode{
		Node: NewNode(),
	}
}

// GetType returns the node type
func (j *JsEvalNode) GetType() string {
	return "JsEvalNode"
}

// contextWrapper wraps an arbitrary context to implement the EvalContext interface
type contextWrapper struct {
	ctx any
}

func (w *contextWrapper) IsMathOn() bool {
	if mathCtx, ok := w.ctx.(interface{ IsMathOn() bool }); ok {
		return mathCtx.IsMathOn()
	}
	return true // Default to true
}

func (w *contextWrapper) SetMathOn(on bool) {
	if mathCtx, ok := w.ctx.(interface{ SetMathOn(bool) }); ok {
		mathCtx.SetMathOn(on)
	}
}

func (w *contextWrapper) IsInCalc() bool {
	if calcCtx, ok := w.ctx.(interface{ IsInCalc() bool }); ok {
		return calcCtx.IsInCalc()
	}
	return false // Default to false
}

func (w *contextWrapper) EnterCalc() {
	if calcCtx, ok := w.ctx.(interface{ EnterCalc() }); ok {
		calcCtx.EnterCalc()
	}
}

func (w *contextWrapper) ExitCalc() {
	if calcCtx, ok := w.ctx.(interface{ ExitCalc() }); ok {
		calcCtx.ExitCalc()
	}
}

func (w *contextWrapper) GetFrames() []Frame {
	if framesCtx, ok := w.ctx.(interface{ GetFrames() []Frame }); ok {
		return framesCtx.GetFrames()
	}
	
	// Try to get frames from map context
	if mapCtx, ok := w.ctx.(map[string]any); ok {
		if frames, ok := mapCtx["frames"].([]Frame); ok {
			return frames
		}
	}
	
	return nil // Return nil if no frames are found
}

func (w *contextWrapper) GetImportantScope() []map[string]bool {
	if scopeCtx, ok := w.ctx.(interface{ GetImportantScope() []map[string]bool }); ok {
		return scopeCtx.GetImportantScope()
	}
	return nil
}

// EvaluateJavaScript evaluates JavaScript expressions.
// Since JavaScript evaluation is not supported in the Go port,
// this will always return an error if JavaScript is enabled,
// or a "not enabled" error if JavaScript is disabled.
func (j *JsEvalNode) EvaluateJavaScript(expression string, context any) (any, error) {
	// Wrap the context to implement EvalContext
	wrappedContext := &contextWrapper{ctx: context}

	// Check if JavaScript is enabled
	javascriptEnabled := false
	if evalCtx, ok := context.(map[string]any); ok {
		if jsEnabled, ok := evalCtx["javascriptEnabled"].(bool); ok {
			javascriptEnabled = jsEnabled
		}
	} else if jsCtx, ok := context.(interface{ IsJavaScriptEnabled() bool }); ok {
		javascriptEnabled = jsCtx.IsJavaScriptEnabled()
	}

	if !javascriptEnabled {
		return nil, fmt.Errorf("inline JavaScript is not enabled. Is it set in your options? (filename: %s, index: %d)",
			j.FileInfo()["filename"], j.GetIndex())
	}

	// Replace Less variables with their values for better error messages
	varRegex := regexp.MustCompile(`@\{([\w-]+)\}`)
	expression = varRegex.ReplaceAllStringFunc(expression, func(match string) string {
		// Extract variable name without @ and {}
		varName := match[2 : len(match)-1]
		// Create a Variable node
		variable := NewVariable("@"+varName, j.GetIndex(), j.FileInfo())
		// Evaluate variable
		result, err := variable.Eval(wrappedContext)
		if err != nil {
			return match // Keep original on error
		}
		return j.jsify(result)
	})

	// JavaScript evaluation is not supported in the Go port
	return nil, fmt.Errorf("JavaScript evaluation is not supported in the Go port. Expression: %s (filename: %s, index: %d)",
		expression, j.FileInfo()["filename"], j.GetIndex())
}

// jsify converts Less values to JavaScript representation
func (j *JsEvalNode) jsify(obj any) string {
	if obj == nil {
		return "null"
	}

	// Try to extract the value from the result
	if value, ok := obj.(map[string]any); ok {
		if val, ok := value["value"]; ok {
			obj = val
		}
	}

	// Handle array values
	if arr, ok := obj.([]any); ok && len(arr) > 1 {
		var result strings.Builder
		result.WriteString("[")
		for i, v := range arr {
			if i > 0 {
				result.WriteString(", ")
			}
			if cssable, ok := v.(interface{ ToCSS() string }); ok {
				result.WriteString(cssable.ToCSS())
			} else {
				result.WriteString(fmt.Sprintf("%v", v))
			}
		}
		result.WriteString("]")
		return result.String()
	}

	// Handle individual values
	if cssable, ok := obj.(interface{ ToCSS() string }); ok {
		return cssable.ToCSS()
	}

	return fmt.Sprintf("%v", obj)
} 