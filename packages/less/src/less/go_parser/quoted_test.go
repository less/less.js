package go_parser

import (
	"testing"
)

// Mock Declaration for testing
type MockDeclaration struct {
	name           string
	value          any
	important      bool
	merge          bool
	index          int
	currentFileInfo map[string]any
	inline         bool
	variable       bool
}

func (d *MockDeclaration) Value() any {
	return d.value
}

func (d *MockDeclaration) ToCSS(context any) string {
	if quoted, ok := d.value.(*Quoted); ok {
		return quoted.ToCSS(context)
	}
	return ""
}

// Mock Frame for testing
type MockFrame struct {
	variableFunc func(string) map[string]any
	propertyFunc func(string) []any
}

func (f *MockFrame) Variable(name string) map[string]any {
	if f.variableFunc != nil {
		return f.variableFunc(name)
	}
	return nil
}

func (f *MockFrame) Property(name string) []any {
	if f.propertyFunc != nil {
		return f.propertyFunc(name)
	}
	return nil
}

// Mock EvalContext for testing
type MockEvalContext struct {
	frames []Frame
}

func (c *MockEvalContext) GetFrames() []Frame {
	return c.frames
}

func (c *MockEvalContext) EnterCalc() {
	// No-op for testing
}

func (c *MockEvalContext) ExitCalc() {
	// No-op for testing
}

func (c *MockEvalContext) GetImportantScope() []map[string]bool {
	return []map[string]bool{{}}
}

func (c *MockEvalContext) IsInCalc() bool {
	return false
}

func (c *MockEvalContext) IsMathOn() bool {
	return false
}

func (c *MockEvalContext) SetMathOn(on bool) {
	// No-op for testing
}

func TestQuoted_Constructor(t *testing.T) {
	t.Run("should initialize with default escaped value when not provided", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		if !quoted.escaped {
			t.Errorf("Expected escaped to be true, got false")
		}
		if quoted.value != "test" {
			t.Errorf("Expected value to be 'test', got '%s'", quoted.value)
		}
		if quoted.quote != "\"" {
			t.Errorf("Expected quote to be '\"', got '%s'", quoted.quote)
		}
	})

	t.Run("should initialize with provided escaped value", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", false, 0, nil)
		if quoted.escaped {
			t.Errorf("Expected escaped to be false, got true")
		}
	})

	t.Run("should initialize with empty string when content is not provided", func(t *testing.T) {
		quoted := NewQuoted("\"", "", true, 0, nil)
		if quoted.value != "" {
			t.Errorf("Expected value to be empty string, got '%s'", quoted.value)
		}
	})

	t.Run("should set index and fileInfo when provided", func(t *testing.T) {
		index := 42
		fileInfo := map[string]any{"filename": "test.less"}
		quoted := NewQuoted("\"", "test", true, index, fileInfo)
		if quoted.GetIndex() != index {
			t.Errorf("Expected index to be %d, got %d", index, quoted.GetIndex())
		}
		if quoted.FileInfo()["filename"] != fileInfo["filename"] {
			t.Errorf("Expected fileInfo to match")
		}
	})
}

func TestQuoted_GenCSS(t *testing.T) {
	t.Run("should output value without quotes when escaped is true", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		var chunks []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				chunks = append(chunks, chunk.(string))
			},
		}
		quoted.GenCSS(nil, output)
		if len(chunks) != 1 || chunks[0] != "test" {
			t.Errorf("Expected chunks to be ['test'], got %v", chunks)
		}
	})

	t.Run("should output value with quotes when escaped is false", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", false, 0, nil)
		var chunks []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				chunks = append(chunks, chunk.(string))
			},
		}
		quoted.GenCSS(nil, output)
		expected := []string{"\"", "test", "\""}
		if len(chunks) != len(expected) {
			t.Errorf("Expected %d chunks, got %d", len(expected), len(chunks))
		}
		for i, chunk := range chunks {
			if chunk != expected[i] {
				t.Errorf("Expected chunk %d to be '%s', got '%s'", i, expected[i], chunk)
			}
		}
	})
}

func TestQuoted_ContainsVariables(t *testing.T) {
	t.Run("should return true when value contains variable interpolation", func(t *testing.T) {
		quoted := NewQuoted("\"", "test @{var} test", true, 0, nil)
		if !quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return true")
		}
	})

	t.Run("should return false when value does not contain variable interpolation", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		if quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return false")
		}
	})
}

func TestQuoted_Eval(t *testing.T) {
	t.Run("should replace variables in the value", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						if name != "@var" {
							t.Errorf("Expected variable name to be '@var', got '%s'", name)
						}
						return map[string]any{
							"value": NewQuoted("\"", "replaced", true, 0, nil),
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{var} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test replaced test" {
				t.Errorf("Expected value to be 'test replaced test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should replace properties in the value", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					propertyFunc: func(name string) []any {
						if name != "$prop" {
							t.Errorf("Expected property name to be '$prop', got '%s'", name)
						}
						return []any{
							&MockDeclaration{
								name:           "prop",
								value:          NewQuoted("\"", "replaced", true, 0, nil),
								important:      false,
								merge:          false,
								index:          0,
								currentFileInfo: map[string]any{},
								inline:         false,
								variable:       false,
							},
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test ${prop} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test replaced test" {
				t.Errorf("Expected value to be 'test replaced test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should handle multiple variable replacements", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						if name != "@var1" && name != "@var2" {
							t.Errorf("Unexpected variable name: %s", name)
						}
						return map[string]any{
							"value": NewQuoted("\"", "replaced", true, 0, nil),
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{var1} test @{var2} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test replaced test replaced test" {
				t.Errorf("Expected value to be 'test replaced test replaced test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should preserve quotes and escaped status", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						if name != "@var" {
							t.Errorf("Expected variable name to be '@var', got '%s'", name)
						}
						return map[string]any{
							"value": NewQuoted("\"", "replaced", true, 0, nil),
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{var} test", false, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.quote != "\"" {
				t.Errorf("Expected quote to be '\"', got '%s'", resultQuoted.quote)
			}
			if resultQuoted.escaped {
				t.Errorf("Expected escaped to be false")
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should handle nested variable interpolation", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						if name == "@outer" {
							return map[string]any{
								"value": NewQuoted("\"", "inner", true, 0, nil),
							}
						}
						if name == "@inner" {
							return map[string]any{
								"value": NewQuoted("\"", "value", true, 0, nil),
							}
						}
						return nil
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{@{outer}} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test value test" {
				t.Errorf("Expected value to be 'test value test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should handle empty variable interpolation", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						return map[string]any{
							"value": NewQuoted("\"", "", true, 0, nil),
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test @{} test" {
				t.Errorf("Expected value to be 'test @{} test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should handle mixed variable and property interpolation", func(t *testing.T) {
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						if name != "@var" {
							t.Errorf("Expected variable name to be '@var', got '%s'", name)
						}
						return map[string]any{
							"value": NewQuoted("\"", "var-value", true, 0, nil),
						}
					},
					propertyFunc: func(name string) []any {
						if name != "$prop" {
							t.Errorf("Expected property name to be '$prop', got '%s'", name)
						}
						return []any{
							&MockDeclaration{
								name:           "prop",
								value:          NewQuoted("\"", "prop-value", true, 0, nil),
								important:      false,
								merge:          false,
								index:          0,
								currentFileInfo: map[string]any{},
								inline:         false,
								variable:       false,
							},
						}
					},
				},
			},
		}
		quoted := NewQuoted("\"", "test @{var} and ${prop} test", true, 0, nil)
		result, err := quoted.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if resultQuoted, ok := result.(*Quoted); ok {
			if resultQuoted.value != "test var-value and prop-value test" {
				t.Errorf("Expected value to be 'test var-value and prop-value test', got '%s'", resultQuoted.value)
			}
		} else {
			t.Errorf("Expected result to be *Quoted")
		}
	})

	t.Run("should handle empty context", func(t *testing.T) {
		quoted := NewQuoted("\"", "test @{var} test", true, 0, nil)
		context := &MockEvalContext{
			frames: []Frame{
				&MockFrame{
					variableFunc: func(name string) map[string]any {
						return nil
					},
				},
			},
		}
		_, err := quoted.Eval(context)
		if err == nil {
			t.Errorf("Expected error for undefined variable")
		}
		if err.Error() != "variable @var is undefined" {
			t.Errorf("Expected error message 'variable @var is undefined', got '%s'", err.Error())
		}
	})
}

func TestQuoted_Compare(t *testing.T) {
	t.Run("should compare values when both are unescaped quoted strings", func(t *testing.T) {
		quoted1 := NewQuoted("\"", "test", false, 0, nil)
		quoted2 := NewQuoted("'", "test", false, 0, nil)
		result, err := quoted1.Compare(&Node{Value: quoted2})
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result != 0 {
			t.Errorf("Expected comparison result to be 0, got %d", result)
		}
	})

	t.Run("should return error when comparing with non-quoted type", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		other := &Node{Value: "Other"}
		_, err := quoted.Compare(other)
		if err == nil {
			t.Errorf("Expected error for non-quoted type")
		}
	})

	t.Run("should return error when comparing escaped and unescaped quotes with different values", func(t *testing.T) {
		quoted1 := NewQuoted("\"", "test1", true, 0, nil)
		quoted2 := NewQuoted("\"", "test2", false, 0, nil)
		_, err := quoted1.Compare(&Node{Value: quoted2})
		if err == nil {
			t.Errorf("Expected error for different values")
		}
	})

	t.Run("should return 0 when comparing escaped and unescaped quotes with same values", func(t *testing.T) {
		quoted1 := NewQuoted("\"", "test", true, 0, nil)
		quoted2 := NewQuoted("\"", "test", false, 0, nil)
		result, err := quoted1.Compare(&Node{Value: quoted2})
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result != 0 {
			t.Errorf("Expected comparison result to be 0, got %d", result)
		}
	})

	t.Run("should return error when comparing with nil", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		_, err := quoted.Compare(nil)
		if err == nil {
			t.Errorf("Expected error for nil comparison")
		}
	})
}

func TestQuoted_ConstructorEdgeCases(t *testing.T) {
	t.Run("should handle empty quotes", func(t *testing.T) {
		quoted := NewQuoted("\"", "", true, 0, nil)
		if quoted.value != "" {
			t.Errorf("Expected value to be empty string, got '%s'", quoted.value)
		}
		if quoted.quote != "\"" {
			t.Errorf("Expected quote to be '\"', got '%s'", quoted.quote)
		}
	})

	t.Run("should handle whitespace-only content", func(t *testing.T) {
		quoted := NewQuoted("\"", "   ", true, 0, nil)
		if quoted.value != "   " {
			t.Errorf("Expected value to be '   ', got '%s'", quoted.value)
		}
	})

	t.Run("should handle special characters in content", func(t *testing.T) {
		quoted := NewQuoted("\"", "!@#$%%^&*()", true, 0, nil)
		if quoted.value != "!@#$%%^&*()" {
			t.Errorf("Expected value to be '!@#$%%^&*()', got '%s'", quoted.value)
		}
	})

	t.Run("should handle undefined fileInfo and index", func(t *testing.T) {
		quoted := NewQuoted("\"", "test", true, 0, nil)
		if quoted.GetIndex() != 0 {
			t.Errorf("Expected index to be 0, got %d", quoted.GetIndex())
		}
		if quoted.FileInfo() == nil {
			t.Errorf("Expected fileInfo to be initialized")
		}
	})
}

func TestQuoted_GenCSSEdgeCases(t *testing.T) {
	t.Run("should handle value containing the quote character", func(t *testing.T) {
		quoted := NewQuoted("\"", "test \" quote", false, 0, nil)
		var chunks []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				chunks = append(chunks, chunk.(string))
			},
		}
		quoted.GenCSS(nil, output)
		expected := []string{"\"", "test \" quote", "\""}
		if len(chunks) != len(expected) {
			t.Errorf("Expected %d chunks, got %d", len(expected), len(chunks))
		}
		for i, chunk := range chunks {
			if chunk != expected[i] {
				t.Errorf("Expected chunk %d to be '%s', got '%s'", i, expected[i], chunk)
			}
		}
	})

	t.Run("should handle value containing newlines and special characters", func(t *testing.T) {
		quoted := NewQuoted("\"", "test\n\t\r\f", false, 0, nil)
		var chunks []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				chunks = append(chunks, chunk.(string))
			},
		}
		quoted.GenCSS(nil, output)
		expected := []string{"\"", "test\n\t\r\f", "\""}
		if len(chunks) != len(expected) {
			t.Errorf("Expected %d chunks, got %d", len(expected), len(chunks))
		}
		for i, chunk := range chunks {
			if chunk != expected[i] {
				t.Errorf("Expected chunk %d to be '%s', got '%s'", i, expected[i], chunk)
			}
		}
	})
}

func TestQuoted_ContainsVariablesEdgeCases(t *testing.T) {
	t.Run("should handle multiple variable interpolations", func(t *testing.T) {
		quoted := NewQuoted("\"", "test @{var1} @{var2} @{var3}", true, 0, nil)
		if !quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return true")
		}
	})

	t.Run("should handle property interpolations", func(t *testing.T) {
		quoted := NewQuoted("\"", "test ${prop1} ${prop2}", true, 0, nil)
		if quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return false")
		}
	})

	t.Run("should handle invalid variable syntax", func(t *testing.T) {
		quoted := NewQuoted("\"", "test @{invalid syntax}", true, 0, nil)
		if quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return false")
		}
	})

	t.Run("should handle escaped variable syntax", func(t *testing.T) {
		quoted := NewQuoted("\"", "test \\@{var}", true, 0, nil)
		if !quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return true")
		}
	})

	t.Run("should handle nested variable interpolations", func(t *testing.T) {
		quoted := NewQuoted("\"", "test @{@{outer}}", true, 0, nil)
		if !quoted.ContainsVariables() {
			t.Errorf("Expected ContainsVariables to return true")
		}
	})
} 