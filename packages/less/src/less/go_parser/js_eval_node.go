package go_parser

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
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

	// Helper function to get filename safely
	getFilename := func() string {
		info := j.FileInfo()
		if info != nil {
			if filename, ok := info["filename"].(string); ok {
				return filename
			}
		}
		return "<unknown>"
	}

	if !javascriptEnabled {
		return nil, fmt.Errorf("inline JavaScript is not enabled. Is it set in your options? (filename: %s, index: %d)",
			getFilename(), j.GetIndex())
	}

	// Replace Less variables with their values for better error messages
	varRegex := regexp.MustCompile(`@\{([\w-]+)\}`)
	expressionForError := varRegex.ReplaceAllStringFunc(expression, func(match string) string {
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
		expressionForError, getFilename(), j.GetIndex())
}

// jsify converts Less values to a simple string representation suitable for error messages.
func (j *JsEvalNode) jsify(obj any) string {
	if obj == nil {
		return "null"
	}

	// Check for Node types and get their value
	if node, ok := obj.(*Node); ok {
		obj = node.Value // Use the actual value within the node
	}

	// If obj is a map containing a "value" key, extract it
	if mapVal, ok := obj.(map[string]any); ok {
		if val, exists := mapVal["value"]; exists {
			obj = val
		}
	}

	// Handle specific types
	switch v := obj.(type) {
	case string:
		return v // Return string directly
	case float64:
		if math.IsNaN(v) {
			return "NaN"
		}
		// Format float without unnecessary trailing zeros
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case bool:
		return fmt.Sprintf("%t", v)
	case nil:
		return "null"
	case *Quoted:
		return v.value // Return the raw string content
	case *Dimension:
		return v.ToCSS(nil) // Use the CSS representation
	case *Color:
		return v.ToCSS(nil) // Use the CSS representation
	case *Anonymous:
		// If Anonymous contains a simple type, stringify that
		switch anonVal := v.Value.(type) {
		case string:
			return anonVal
		case float64:
			return strconv.FormatFloat(anonVal, 'f', -1, 64)
		case int:
			return strconv.Itoa(anonVal)
		case bool:
			return fmt.Sprintf("%t", anonVal)
		case nil:
			return "null"
		default:
			// Fallback for complex Anonymous values: use ToCSS
			return v.ToCSS(nil)
		}
	case []any:
		// Handle arrays recursively
		var parts []string
		for _, item := range v {
			parts = append(parts, j.jsify(item)) // Recursively call jsify
		}
		// Return comma-separated string wrapped in square brackets
		return "[" + strings.Join(parts, ", ") + "]"
	default:
		// Fallback: Try ToCSS(any) first
		if cssableAny, ok := obj.(interface{ ToCSS(any) string }); ok {
			return cssableAny.ToCSS(nil)
		}
		// Then try ToCSS() for simpler mocks/types
		if cssableSimple, ok := obj.(interface{ ToCSS() string }); ok {
			return cssableSimple.ToCSS()
		}
		// Last resort: Use default Go formatting
		return fmt.Sprintf("%v", obj)
	}
} 