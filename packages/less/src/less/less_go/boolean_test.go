package less_go

import (
	"fmt"
	"math"
	"testing"
)

func TestBoolean(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected *Keyword
	}{
		{"true boolean", true, KeywordTrue},
		{"false boolean", false, KeywordFalse},
		{"truthy number", 1, KeywordTrue},
		{"zero", 0, KeywordFalse},
		{"negative number", -1, KeywordTrue},
		{"non-empty string", "hello", KeywordTrue},
		{"empty string", "", KeywordFalse},
		{"nil", nil, KeywordFalse},
		{"NaN", math.NaN(), KeywordFalse},
		{"positive infinity", math.Inf(1), KeywordTrue},
		{"negative infinity", math.Inf(-1), KeywordTrue},
		{"int64 non-zero", int64(5), KeywordTrue},
		{"int64 zero", int64(0), KeywordFalse},
		{"float64 non-zero", float64(5.5), KeywordTrue},
		{"float64 zero", float64(0.0), KeywordFalse},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Boolean(tt.input)
			if result != tt.expected {
				t.Errorf("Boolean(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestBooleanWithLessNodes(t *testing.T) {
	// Test with Less.js node objects - they should all be truthy as objects
	tests := []struct {
		name  string
		input any
	}{
		{"Keyword true", NewKeyword("true")},
		{"Keyword false", NewKeyword("false")},
		{"Anonymous", NewAnonymous("content", 0, nil, false, false, nil)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Boolean(tt.input)
			if result != KeywordTrue {
				t.Errorf("Boolean(%s) = %v, want %v (objects should be truthy)", tt.name, result, KeywordTrue)
			}
		})
	}
}

func TestIf(t *testing.T) {
	context := &Context{}

	t.Run("truthy condition returns true value", func(t *testing.T) {
		condition := NewMockNode(NewKeyword("true"))
		trueValue := NewMockNode(NewQuoted("\"", "success", true, 0, nil))
		falseValue := NewMockNode(NewQuoted("\"", "failure", true, 0, nil))

		result := If(context, condition, trueValue, falseValue)
		quoted, ok := result.(*Quoted)
		if !ok {
			t.Fatalf("Expected Quoted, got %T", result)
		}
		if quoted.value != "success" {
			t.Errorf("If() = %v, want 'success'", quoted.value)
		}
	})

	t.Run("falsy condition returns false value", func(t *testing.T) {
		condition := NewMockNode(nil) // nil is falsy
		trueValue := NewMockNode(NewQuoted("\"", "success", true, 0, nil))
		falseValue := NewMockNode(NewQuoted("\"", "failure", true, 0, nil))

		result := If(context, condition, trueValue, falseValue)
		quoted, ok := result.(*Quoted)
		if !ok {
			t.Fatalf("Expected Quoted, got %T", result)
		}
		if quoted.value != "failure" {
			t.Errorf("If() = %v, want 'failure'", quoted.value)
		}
	})

	t.Run("falsy condition with no false value returns Anonymous", func(t *testing.T) {
		condition := NewMockNode(nil)
		trueValue := NewMockNode(NewQuoted("\"", "success", true, 0, nil))

		result := If(context, condition, trueValue, nil)
		if _, ok := result.(*Anonymous); !ok {
			t.Errorf("If() = %T, want *Anonymous", result)
		}
	})
}

func TestIsDefined(t *testing.T) {
	context := &Context{}

	t.Run("defined variable returns True", func(t *testing.T) {
		variable := NewMockNode(NewQuoted("\"", "value", true, 0, nil))
		result := IsDefined(context, variable)
		if result != KeywordTrue {
			t.Errorf("IsDefined() = %v, want %v", result, KeywordTrue)
		}
	})

	t.Run("undefined variable that panics returns False", func(t *testing.T) {
		variable := NewMockErrorNode(fmt.Errorf("Variable not found"))
		result := IsDefined(context, variable)
		if result != KeywordFalse {
			t.Errorf("IsDefined() = %v, want %v", result, KeywordFalse)
		}
	})

	t.Run("variable that returns nil", func(t *testing.T) {
		variable := NewMockNode(nil)
		result := IsDefined(context, variable)
		if result != KeywordTrue {
			t.Errorf("IsDefined() = %v, want %v", result, KeywordTrue)
		}
	})
}

func TestIsTruthy(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected bool
	}{
		{"nil", nil, false},
		{"true", true, true},
		{"false", false, false},
		{"positive int", 1, true},
		{"zero int", 0, false},
		{"negative int", -1, true},
		{"positive int64", int64(1), true},
		{"zero int64", int64(0), false},
		{"negative int64", int64(-1), true},
		{"positive float64", 5.5, true},
		{"zero float64", 0.0, false},
		{"negative float64", -5.5, true},
		{"NaN", math.NaN(), false},
		{"positive infinity", math.Inf(1), true},
		{"negative infinity", math.Inf(-1), true},
		{"non-empty string", "hello", true},
		{"empty string", "", false},
		{"object (slice)", []int{}, true},
		{"object (map)", map[string]int{}, true},
		{"object (struct)", struct{}{}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isTruthy(tt.input)
			if result != tt.expected {
				t.Errorf("isTruthy(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestIsNaN(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected bool
	}{
		{"regular number", 5.5, false},
		{"zero", 0.0, false},
		{"NaN", math.NaN(), true},
		{"positive infinity", math.Inf(1), false},
		{"negative infinity", math.Inf(-1), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isNaN(tt.input)
			if result != tt.expected {
				t.Errorf("isNaN(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGetBooleanFunctions(t *testing.T) {
	functions := GetBooleanFunctions()

	expectedFunctions := []string{"boolean", "if", "isdefined"}
	if len(functions) != len(expectedFunctions) {
		t.Errorf("GetBooleanFunctions() returned %d functions, want %d", len(functions), len(expectedFunctions))
	}

	for _, name := range expectedFunctions {
		if _, exists := functions[name]; !exists {
			t.Errorf("GetBooleanFunctions() missing function %s", name)
		}
	}
}

// Mock node for testing
type MockNode struct {
	value any
	err   error
}

func NewMockNode(value any) *MockNode {
	return &MockNode{value: value}
}

func NewMockErrorNode(err error) *MockNode {
	return &MockNode{err: err}
}

func (m *MockNode) Eval(context *Context) (any, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.value, nil
}