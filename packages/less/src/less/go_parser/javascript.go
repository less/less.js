package go_parser

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
		if !isNaN(v) {
			return NewDimensionFrom(v, NewUnit(nil, nil, "")), nil
		}
	case string:
		return NewQuoted(`"`+v+`"`, v, j.escaped, j.GetIndex(), j.FileInfo()), nil
	case []any:
		var values []string
		for _, item := range v {
			values = append(values, fmt.Sprintf("%v", item))
		}
		return NewAnonymous(strings.Join(values, ", "), j.GetIndex(), j.FileInfo(), false, false, nil), nil
	}

	return NewAnonymous(result, j.GetIndex(), j.FileInfo(), false, false, nil), nil
}

// isNaN checks if a float64 is NaN
func isNaN(f float64) bool {
	return f != f
} 