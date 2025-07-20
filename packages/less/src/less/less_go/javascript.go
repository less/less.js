package less_go

import (
	"fmt"
	"strings"
)

// JavaScript represents a JavaScript evaluation node in the Less AST
type JavaScript struct {
	*JsEvalNode
	escaped    bool
	expression string
}

// NewJavaScript creates a new JavaScript instance
func NewJavaScript(string string, escaped bool, index int, currentFileInfo map[string]any) *JavaScript {
	jsEvalNode := NewJsEvalNode()
	jsEvalNode.Index = index
	jsEvalNode.SetFileInfo(currentFileInfo)

	return &JavaScript{
		JsEvalNode: jsEvalNode,
		escaped:    escaped,
		expression: string,
	}
}

// GetType returns the node type
func (j *JavaScript) GetType() string {
	return "JavaScript"
}

// Type returns the node type (for compatibility)
func (j *JavaScript) Type() string {
	return "JavaScript"
}

// GetIndex returns the node's index
func (j *JavaScript) GetIndex() int {
	return j.JsEvalNode.GetIndex()
}

// FileInfo returns the node's file information
func (j *JavaScript) FileInfo() map[string]any {
	return j.JsEvalNode.FileInfo()
}

// Eval evaluates the JavaScript expression
func (j *JavaScript) Eval(context any) (any, error) {
	result, err := j.EvaluateJavaScript(j.expression, context)
	if err != nil {
		return nil, err
	}

	switch v := result.(type) {
	case float64:
		if !parserIsNaN(v) {
			// Match JavaScript: new Dimension(result)
			dim, err := NewDimension(v, nil)
			if err != nil {
				return nil, err
			}
			return dim, nil
		}
	case string:
		// Match JavaScript: new Quoted(`"${result}"`, result, this.escaped, this._index)
		return NewQuoted(`"`+v+`"`, v, j.escaped, j.GetIndex(), j.FileInfo()), nil
	case []any:
		var values []string
		for _, item := range v {
			values = append(values, fmt.Sprintf("%v", item))
		}
		// Match JavaScript: new Anonymous(result.join(', '))
		return NewAnonymous(strings.Join(values, ", "), 0, nil, false, false, nil), nil
	}

	// Match JavaScript: new Anonymous(result)
	return NewAnonymous(result, 0, nil, false, false, nil), nil
}

// parserIsNaN checks if a float64 is NaN
func parserIsNaN(f float64) bool {
	return f != f
} 