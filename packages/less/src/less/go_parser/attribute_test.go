package go_parser

import (
	"fmt"
	"strings"
	"testing"
)

// MockEvaluable implements Evaluable interface for testing
type MockEvaluable struct {
	value any
}

func (m *MockEvaluable) Eval(context any) any {
	if ctx, ok := context.(map[string]any); ok {
		if val, ok := ctx["variables"].(map[string]any); ok {
			return val[m.value.(string)]
		}
	}
	return m.value
}

// MockCSSable implements CSSable interface for testing
type MockCSSable struct {
	value any
}

func (m *MockCSSable) ToCSS(context any) string {
	if ctx, ok := context.(map[string]any); ok {
		if val, ok := ctx["variables"].(map[string]any); ok {
			return val[m.value.(string)].(string)
		}
	}
	return fmt.Sprintf("%v", m.value)
}

func TestAttribute(t *testing.T) {
	tests := []struct {
		name     string
		attr     *Attribute
		context  any
		expected string
	}{
		{
			name:     "basic attribute with key only",
			attr:     NewAttribute("data-test", "", nil, ""),
			expected: "[data-test]",
		},
		{
			name:     "attribute with key and value",
			attr:     NewAttribute("data-test", "=", "value", ""),
			expected: "[data-test=value]",
		},
		{
			name:     "attribute with key, value, and cif",
			attr:     NewAttribute("data-test", "=", "value", "if (condition)"),
			expected: "[data-test=value if (condition)]",
		},
		{
			name: "attribute with evaluable key and value",
			attr: NewAttribute(
				&MockEvaluable{value: "key"},
				"=",
				&MockEvaluable{value: "value"},
				"",
			),
			context: map[string]any{
				"variables": map[string]any{
					"key":   "data-test",
					"value": "test-value",
				},
			},
			expected: "[data-test=test-value]",
		},
		{
			name: "attribute with cssable key and value",
			attr: NewAttribute(
				&MockCSSable{value: "key"},
				"=",
				&MockCSSable{value: "value"},
				"",
			),
			context: map[string]any{
				"variables": map[string]any{
					"key":   "data-test",
					"value": "test-value",
				},
			},
			expected: "[data-test=test-value]",
		},
		{
			name:     "attribute with empty string value",
			attr:     NewAttribute("data-test", "=", "", ""),
			expected: "[data-test=]",
		},
		{
			name:     "attribute with special characters",
			attr:     NewAttribute("data-test[0]", "=", "value with spaces", ""),
			expected: "[data-test[0]=value with spaces]",
		},
		{
			name:     "attribute with different operators",
			attr:     NewAttribute("data-test", "~=", "value", ""),
			expected: "[data-test~=value]",
		},
		{
			name:     "attribute with nil operator",
			attr:     NewAttribute("data-test", "", "value", ""),
			expected: "[data-test]",
		},
		{
			name:     "attribute with empty cif",
			attr:     NewAttribute("data-test", "=", "value", ""),
			expected: "[data-test=value]",
		},
		{
			name:     "attribute with special characters in cif",
			attr:     NewAttribute("data-test", "=", "value", "if (condition && value > 0)"),
			expected: "[data-test=value if (condition && value > 0)]",
		},
		{
			name:     "attribute with whitespace",
			attr:     NewAttribute(" data-test ", "=", " value ", ""),
			expected: "[ data-test = value ]",
		},
		{
			name:     "attribute with very long key/value",
			attr:     NewAttribute("data-"+strings.Repeat("x", 1000), "=", "value-"+strings.Repeat("y", 1000), ""),
			expected: fmt.Sprintf("[data-%s=value-%s]", strings.Repeat("x", 1000), strings.Repeat("y", 1000)),
		},
		{
			name:     "attribute with all operators",
			attr:     NewAttribute("data-test", "*=", "value", ""),
			expected: "[data-test*=value]",
		},
		{
			name:     "attribute with nil key",
			attr:     NewAttribute(nil, "=", "value", ""),
			expected: "[]",
		},
		{
			name:     "attribute with nil value",
			attr:     NewAttribute("data-test", "=", nil, ""),
			expected: "[data-test=]",
		},
		{
			name:     "attribute with evaluable object with only eval method",
			attr:     NewAttribute(&MockEvaluable{value: "key"}, "=", "value", ""),
			context: map[string]any{
				"variables": map[string]any{
					"key": "data-test",
				},
			},
			expected: "[data-test=value]",
		},
		{
			name:     "attribute with evaluable object with only toCSS method",
			attr:     NewAttribute(&MockCSSable{value: "key"}, "=", "value", ""),
			context: map[string]any{
				"variables": map[string]any{
					"key": "data-test",
				},
			},
			expected: "[data-test=value]",
		},
		{
			name:     "attribute with malformed evaluable object",
			attr:     NewAttribute(&struct{}{}, "=", "value", ""),
			expected: "[&{}=value]",
		},
		{
			name:     "attribute with invalid operator",
			attr:     NewAttribute("data-test", "invalid", "value", ""),
			expected: "[data-testinvalidvalue]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.context != nil {
				evaluated := tt.attr.Eval(tt.context)
				if evaluated.ToCSS(tt.context) != tt.expected {
					t.Errorf("Eval().ToCSS() = %v, want %v", evaluated.ToCSS(tt.context), tt.expected)
				}
			} else {
				if tt.attr.ToCSS(nil) != tt.expected {
					t.Errorf("ToCSS() = %v, want %v", tt.attr.ToCSS(nil), tt.expected)
				}
			}
		})
	}
}

func TestAttributeGenCSS(t *testing.T) {
	attr := NewAttribute("data-test", "=", "value", "")
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			if chunk != "[data-test=value]" {
				t.Errorf("GenCSS() output = %v, want %v", chunk, "[data-test=value]")
			}
		},
		IsEmpty: func() bool { return false },
	}
	attr.GenCSS(nil, output)
} 