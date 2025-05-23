package go_parser

import (
	"strings"
	"testing"
)

type mockContext struct {
	frames         []Frame
	importantScope []map[string]bool
	inCalc         bool
	mathOn         bool
}

func (m *mockContext) GetFrames() []Frame {
	return m.frames
}

func (m *mockContext) GetImportantScope() []map[string]bool {
	return m.importantScope
}

func (m *mockContext) IsInCalc() bool {
	return m.inCalc
}

func (m *mockContext) IsMathOn() bool {
	return m.mathOn
}

func (m *mockContext) SetMathOn(on bool) {
	m.mathOn = on
}

func (m *mockContext) EnterCalc() {
	m.inCalc = true
}

func (m *mockContext) ExitCalc() {
	m.inCalc = false
}

type mockFrame struct {
	vars map[string]map[string]any
}

func (m *mockFrame) Variable(name string) map[string]any {
	return m.vars[name]
}

type mockValue struct {
	value any
}

func (m *mockValue) Eval(context EvalContext) (any, error) {
	return map[string]any{"value": m.value}, nil
}

func TestVariable(t *testing.T) {
	mockFileInfo := map[string]any{
		"filename": "test.less",
	}

	t.Run("Variable creation", func(t *testing.T) {
		t.Run("should create a Variable instance with correct properties", func(t *testing.T) {
			variable := NewVariable("@color", 1, mockFileInfo)
			if variable.name != "@color" {
				t.Errorf("Expected name to be @color, got %s", variable.name)
			}
			if variable._index != 1 {
				t.Errorf("Expected index to be 1, got %d", variable._index)
			}
			if variable._fileInfo["filename"] != mockFileInfo["filename"] {
				t.Error("Expected fileInfo filename to match mockFileInfo filename")
			}
			if variable.GetType() != "Variable" {
				t.Errorf("Expected type to be Variable, got %s", variable.GetType())
			}
		})

		t.Run("should handle undefined parameters", func(t *testing.T) {
			variable := NewVariable("@color", 0, nil)
			if variable.name != "@color" {
				t.Errorf("Expected name to be @color, got %s", variable.name)
			}
			if variable._index != 0 {
				t.Errorf("Expected index to be 0, got %d", variable._index)
			}
			if variable._fileInfo != nil {
				t.Error("Expected fileInfo to be nil")
			}
		})
	})

	t.Run("Variable evaluation", func(t *testing.T) {
		t.Run("should evaluate a simple variable", func(t *testing.T) {
			variable := NewVariable("@color", 1, mockFileInfo)
			mockValue := &mockValue{value: "red"}
			context := &mockContext{
				frames: []Frame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@color": {"value": mockValue},
						},
					},
				},
				importantScope: []map[string]bool{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result.(map[string]any)["value"] != "red" {
				t.Errorf("Expected value to be red, got %v", result.(map[string]any)["value"])
			}
		})

		t.Run("should handle variables with @@ prefix", func(t *testing.T) {
			variable := NewVariable("@@var", 1, mockFileInfo)
			innerValue := &mockValue{value: "color"}
			outerValue := &mockValue{value: "red"}
			context := &mockContext{
				frames: []Frame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@var":   {"value": innerValue},
							"@color": {"value": outerValue},
						},
					},
				},
				importantScope: []map[string]bool{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result.(map[string]any)["value"] != "red" {
				t.Errorf("Expected value to be red, got %v", result.(map[string]any)["value"])
			}
		})

		t.Run("should throw error for recursive variable definition", func(t *testing.T) {
			variable := NewVariable("@recursive", 1, mockFileInfo)
			variable.evaluating = true

			context := &mockContext{
				frames: []Frame{&mockFrame{vars: map[string]map[string]any{}}},
				importantScope: []map[string]bool{{"important": false}},
			}

			_, err := variable.Eval(context)
			if err == nil {
				t.Error("Expected error for recursive variable definition")
			}
		})

		t.Run("should throw error for undefined variable", func(t *testing.T) {
			variable := NewVariable("@undefined", 1, mockFileInfo)
			context := &mockContext{
				frames: []Frame{&mockFrame{vars: map[string]map[string]any{}}},
				importantScope: []map[string]bool{{"important": false}},
			}

			_, err := variable.Eval(context)
			if err == nil {
				t.Error("Expected error for undefined variable")
			}
		})

		t.Run("should handle variables in calc context", func(t *testing.T) {
			variable := NewVariable("@number", 1, mockFileInfo)
			mockValue := &mockValue{value: 42}
			context := &mockContext{
				frames: []Frame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@number": {"value": mockValue},
						},
					},
				},
				importantScope: []map[string]bool{{"important": false}},
				inCalc:         true,
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			// In calc context, result should be a Call with _SELF
			call, ok := result.(*Call)
			if !ok {
				t.Fatalf("Expected result to be *Call, got %T", result)
			}
			if call.Name != "_SELF" {
				t.Errorf("Expected call name to be _SELF, got %s", call.Name)
			}
			if len(call.Args) != 1 {
				t.Errorf("Expected call to have 1 argument, got %d", len(call.Args))
			}
			// The argument should be our mockValue
			if call.Args[0] != mockValue {
				t.Errorf("Expected call argument to be mockValue")
			}
		})

		t.Run("should handle variables with important flag", func(t *testing.T) {
			variable := NewVariable("@important", 1, mockFileInfo)
			mockValue := &mockValue{value: "important!"}
			context := &mockContext{
				frames: []Frame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@important": {
								"value":     mockValue,
								"important": true,
							},
						},
					},
				},
				importantScope: []map[string]bool{{"important": false}},
			}

			_, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !context.importantScope[0]["important"] {
				t.Error("Expected important flag to be set to true")
			}
		})

		t.Run("should handle multiple @@ prefix levels", func(t *testing.T) {
			variable := NewVariable("@@@var", 1, mockFileInfo)
			firstValue := &mockValue{value: "color"}
			secondValue := &mockValue{value: "primary"}
			finalValue := &mockValue{value: "blue"}
			context := &mockContext{
				frames: []Frame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@var":     {"value": firstValue},
							"@color":   {"value": secondValue},
							"@primary": {"value": finalValue},
						},
					},
				},
				importantScope: []map[string]bool{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result.(map[string]any)["value"] != "blue" {
				t.Errorf("Expected value to be blue, got %v", result.(map[string]any)["value"])
			}
		})

		t.Run("Edge cases for variable names", func(t *testing.T) {
			t.Run("should handle empty variable name", func(t *testing.T) {
				variable := NewVariable("", 1, mockFileInfo)
				context := &mockContext{
					frames: []Frame{&mockFrame{vars: map[string]map[string]any{}}},
					importantScope: []map[string]bool{{"important": false}},
				}

				_, err := variable.Eval(context)
				if err == nil {
					t.Error("Expected error for empty variable name")
				}
			})

			t.Run("should handle special characters in variable names", func(t *testing.T) {
				variable := NewVariable("@special!#$%", 1, mockFileInfo)
				mockValue := &mockValue{value: "special"}
				context := &mockContext{
					frames: []Frame{
						&mockFrame{
							vars: map[string]map[string]any{
								"@special!#$%": {"value": mockValue},
							},
						},
					},
					importantScope: []map[string]bool{{"important": false}},
				}

				result, err := variable.Eval(context)
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.(map[string]any)["value"] != "special" {
					t.Errorf("Expected value to be special, got %v", result.(map[string]any)["value"])
				}
			})

			t.Run("should handle very long variable names", func(t *testing.T) {
				longName := "@" + strings.Repeat("a", 1000)
				variable := NewVariable(longName, 1, mockFileInfo)
				mockValue := &mockValue{value: "long"}
				context := &mockContext{
					frames: []Frame{
						&mockFrame{
							vars: map[string]map[string]any{
								longName: {"value": mockValue},
							},
						},
					},
					importantScope: []map[string]bool{{"important": false}},
				}

				result, err := variable.Eval(context)
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if result.(map[string]any)["value"] != "long" {
					t.Errorf("Expected value to be long, got %v", result.(map[string]any)["value"])
				}
			})
		})
	})
} 