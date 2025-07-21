package less_go

import (
	"strings"
	"testing"
)

// Force imports to trigger init functions
var _ = GetListFunctions

// Manually register _SELF for testing
func init() {
	listFunctions := GetListFunctions()
	if selfFn, ok := listFunctions["_SELF"].(func(any) any); ok {
		DefaultRegistry.Add("_SELF", &FlexibleFunctionDef{
			name:      "_SELF",
			minArgs:   1,
			maxArgs:   1,
			variadic:  false,
			fn:        selfFn,
			needsEval: true,
		})
	}
}

type mockContext struct {
	frames         []ParserFrame
	importantScope []map[string]any
	inCalc         bool
	mathOn         bool
}

func (m *mockContext) GetFrames() []ParserFrame {
	return m.frames
}

func (m *mockContext) GetImportantScope() []map[string]any {
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

func (m *mockContext) GetDefaultFunc() *DefaultFunc {
	return nil
}

type mockFrame struct {
	vars map[string]map[string]any
}

func (m *mockFrame) Variable(name string) map[string]any {
	return m.vars[name]
}

func (m *mockFrame) Property(name string) []any {
	// Return empty array for now - tests don't use properties
	return nil
}

type mockValue struct {
	value any
}

// Implement the Eval(any) interface that the variable code expects
func (m *mockValue) Eval(context any) (any, error) {
	// Return self, simulating a simple evaluated value
	return m, nil
}

// Add a method to get the actual value for test assertions
func (m *mockValue) GetValue() any {
	return m.value
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
			testValue := &mockValue{value: "red"}
			context := &mockContext{
				frames: []ParserFrame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@color": {"value": testValue},
						},
					},
				},
				importantScope: []map[string]any{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			mockVal, ok := result.(*mockValue)
			if !ok || mockVal.value != "red" {
				t.Errorf("Expected mockValue with value 'red', got %v", result)
			}
		})

		t.Run("should handle variables with @@ prefix", func(t *testing.T) {
			variable := NewVariable("@@var", 1, mockFileInfo)
			innerValue := &mockValue{value: "color"}
			outerValue := &mockValue{value: "red"}
			context := &mockContext{
				frames: []ParserFrame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@var":   {"value": innerValue},
							"@color": {"value": outerValue},
						},
					},
				},
				importantScope: []map[string]any{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			mockVal, ok := result.(*mockValue)
			if !ok || mockVal.value != "red" {
				t.Errorf("Expected mockValue with value 'red', got %v", result)
			}
		})

		t.Run("should throw error for recursive variable definition", func(t *testing.T) {
			variable := NewVariable("@recursive", 1, mockFileInfo)
			variable.evaluating = true

			context := &mockContext{
				frames: []ParserFrame{&mockFrame{vars: map[string]map[string]any{}}},
				importantScope: []map[string]any{{"important": false}},
			}

			_, err := variable.Eval(context)
			if err == nil {
				t.Error("Expected error for recursive variable definition")
			}
		})

		t.Run("should throw error for undefined variable", func(t *testing.T) {
			variable := NewVariable("@undefined", 1, mockFileInfo)
			context := &mockContext{
				frames: []ParserFrame{&mockFrame{vars: map[string]map[string]any{}}},
				importantScope: []map[string]any{{"important": false}},
			}

			_, err := variable.Eval(context)
			if err == nil {
				t.Error("Expected error for undefined variable")
			}
		})

		t.Run("should handle variables in calc context", func(t *testing.T) {
			variable := NewVariable("@number", 1, mockFileInfo)
			testValue := &mockValue{value: 42}
			context := &mockContext{
				frames: []ParserFrame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@number": {"value": testValue},
						},
					},
				},
				importantScope: []map[string]any{{"important": false}},
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
			// The argument should be our testValue
			if call.Args[0] != testValue {
				t.Errorf("Expected call argument to be testValue")
			}
		})

		t.Run("should handle variables with important flag", func(t *testing.T) {
			variable := NewVariable("@important", 1, mockFileInfo)
			testValue := &mockValue{value: "important!"}
			
			// Use map-based context to test important flag handling
			importantScope := []any{map[string]any{}}
			context := map[string]any{
				"frames": []any{
					&mockFrame{
						vars: map[string]map[string]any{
							"@important": {
								"value":     testValue,
								"important": true,
							},
						},
					},
				},
				"importantScope": importantScope,
			}

			_, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			
			// Check the importantScope was updated
			if scope, ok := importantScope[0].(map[string]any); ok {
				if scope["important"] != "!important" {
					t.Errorf("Expected important flag to be set to '!important', got %v", scope["important"])
				}
			} else {
				t.Error("ImportantScope[0] is not a map[string]any")
			}
		})

		t.Run("should handle multiple @@ prefix levels", func(t *testing.T) {
			variable := NewVariable("@@@var", 1, mockFileInfo)
			firstValue := &mockValue{value: "color"}
			secondValue := &mockValue{value: "primary"}
			finalValue := &mockValue{value: "blue"}
			context := &mockContext{
				frames: []ParserFrame{
					&mockFrame{
						vars: map[string]map[string]any{
							"@var":     {"value": firstValue},
							"@color":   {"value": secondValue},
							"@primary": {"value": finalValue},
						},
					},
				},
				importantScope: []map[string]any{{"important": false}},
			}

			result, err := variable.Eval(context)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			mockVal, ok := result.(*mockValue)
			if !ok || mockVal.value != "blue" {
				t.Errorf("Expected mockValue with value 'blue', got %v", result)
			}
		})

		t.Run("Edge cases for variable names", func(t *testing.T) {
			t.Run("should handle empty variable name", func(t *testing.T) {
				variable := NewVariable("", 1, mockFileInfo)
				context := &mockContext{
					frames: []ParserFrame{&mockFrame{vars: map[string]map[string]any{}}},
					importantScope: []map[string]any{{"important": false}},
				}

				_, err := variable.Eval(context)
				if err == nil {
					t.Error("Expected error for empty variable name")
				}
			})

			t.Run("should handle special characters in variable names", func(t *testing.T) {
				variable := NewVariable("@special!#$%", 1, mockFileInfo)
				testValue := &mockValue{value: "special"}
				context := &mockContext{
					frames: []ParserFrame{
						&mockFrame{
							vars: map[string]map[string]any{
								"@special!#$%": {"value": testValue},
							},
						},
					},
					importantScope: []map[string]any{{"important": false}},
				}

				result, err := variable.Eval(context)
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				mockVal, ok := result.(*mockValue)
				if !ok || mockVal.value != "special" {
					t.Errorf("Expected mockValue with value 'special', got %v", result)
				}
			})

			t.Run("should handle very long variable names", func(t *testing.T) {
				longName := "@" + strings.Repeat("a", 1000)
				variable := NewVariable(longName, 1, mockFileInfo)
				testValue := &mockValue{value: "long"}
				context := &mockContext{
					frames: []ParserFrame{
						&mockFrame{
							vars: map[string]map[string]any{
								longName: {"value": testValue},
							},
						},
					},
					importantScope: []map[string]any{{"important": false}},
				}

				result, err := variable.Eval(context)
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				mockVal, ok := result.(*mockValue)
				if !ok || mockVal.value != "long" {
					t.Errorf("Expected mockValue with value 'long', got %v", result)
				}
			})
		})
	})
} 