package tree

import (
	"fmt"
	"testing"
)

func TestAssignment(t *testing.T) {
	t.Run("should create an assignment with key and value", func(t *testing.T) {
		assignment := NewAssignment("color", "#000")
		if assignment.Key != "color" {
			t.Errorf("Expected key to be 'color', got %v", assignment.Key)
		}
		if assignment.Value != "#000" {
			t.Errorf("Expected value to be '#000', got %v", assignment.Value)
		}
	})

	t.Run("should handle nil key and value", func(t *testing.T) {
		assignment1 := NewAssignment(nil, "#000")
		if assignment1.Key != nil {
			t.Errorf("Expected key to be nil, got %v", assignment1.Key)
		}
		if assignment1.Value != "#000" {
			t.Errorf("Expected value to be '#000', got %v", assignment1.Value)
		}

		assignment2 := NewAssignment("color", nil)
		if assignment2.Key != "color" {
			t.Errorf("Expected key to be 'color', got %v", assignment2.Key)
		}
		if assignment2.Value != nil {
			t.Errorf("Expected value to be nil, got %v", assignment2.Value)
		}
	})

	t.Run("should inherit from Node", func(t *testing.T) {
		assignment := NewAssignment("color", "#000")
		if assignment.Node == nil {
			t.Error("Expected assignment to inherit from Node")
		}
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should visit the value with the visitor", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			mockVisitor := &MockVisitor{
				visitFunc: func(value interface{}) interface{} {
					return "#fff"
				},
			}

			assignment.Accept(mockVisitor)
			if assignment.Value != "#fff" {
				t.Errorf("Expected value to be '#fff', got %v", assignment.Value)
			}
		})

		t.Run("should handle nil visitor", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			assignment.Accept(nil) // Should not panic
		})

		t.Run("should handle visitor that throws error", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			mockVisitor := &MockVisitor{
				visitFunc: func(value interface{}) interface{} {
					panic("Visitor error")
				},
			}

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected panic from visitor error")
				} else if r != "Visitor error" {
					t.Errorf("Expected panic with 'Visitor error', got %v", r)
				}
			}()

			assignment.Accept(mockVisitor)
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should evaluate the value if it has an eval method", func(t *testing.T) {
			mockValue := &MockEvalNode{
				evalFunc: func(context interface{}) interface{} {
					return "#fff"
				},
			}
			assignment := NewAssignment("color", mockValue)
			context := make(map[string]interface{})

			result := assignment.Eval(context)
			if result == nil {
				t.Fatal("Expected result to not be nil")
			}
			resultAssignment, ok := result.(*Assignment)
			if !ok {
				t.Fatal("Expected result to be an Assignment")
			}
			if resultAssignment.Key != "color" {
				t.Errorf("Expected key to be 'color', got %v", resultAssignment.Key)
			}
			if resultAssignment.Value != "#fff" {
				t.Errorf("Expected value to be '#fff', got %v", resultAssignment.Value)
			}
		})

		t.Run("should return the assignment unchanged if value has no eval method", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			context := make(map[string]interface{})

			result := assignment.Eval(context)
			if result == nil {
				t.Fatal("Expected result to not be nil")
			}
			resultAssignment, ok := result.(*Assignment)
			if !ok {
				t.Fatal("Expected result to be an Assignment")
			}
			if resultAssignment.Key != "color" {
				t.Errorf("Expected key to be 'color', got %v", resultAssignment.Key)
			}
			if resultAssignment.Value != "#000" {
				t.Errorf("Expected value to be '#000', got %v", resultAssignment.Value)
			}
		})

		t.Run("should handle value.eval that throws error", func(t *testing.T) {
			mockValue := &MockEvalNode{
				evalFunc: func(context interface{}) interface{} {
					panic("Eval error")
				},
			}
			assignment := NewAssignment("color", mockValue)
			context := make(map[string]interface{})

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected panic from eval error")
				} else if r != "Eval error" {
					t.Errorf("Expected panic with 'Eval error', got %v", r)
				}
			}()

			assignment.Eval(context)
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should generate CSS with key and value", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			var output []string
			mockOutput := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, fmt.Sprintf("%v", chunk))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := make(map[string]interface{})

			assignment.GenCSS(context, mockOutput)
			if len(output) != 2 {
				t.Errorf("Expected 2 output chunks, got %d", len(output))
			}
			if output[0] != "color=" {
				t.Errorf("Expected first chunk to be 'color=', got %v", output[0])
			}
			if output[1] != "#000" {
				t.Errorf("Expected second chunk to be '#000', got %v", output[1])
			}
		})

		t.Run("should handle values with genCSS method", func(t *testing.T) {
			mockValue := &MockGenCSSNode{
				genCSSFunc: func(context interface{}, output *CSSOutput) {
					output.Add("#fff", nil, nil)
				},
			}
			assignment := NewAssignment("color", mockValue)
			var output []string
			mockOutput := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, fmt.Sprintf("%v", chunk))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := make(map[string]interface{})

			assignment.GenCSS(context, mockOutput)
			if len(output) != 2 {
				t.Errorf("Expected 2 output chunks, got %d", len(output))
			}
			if output[0] != "color=" {
				t.Errorf("Expected first chunk to be 'color=', got %v", output[0])
			}
			if output[1] != "#fff" {
				t.Errorf("Expected second chunk to be '#fff', got %v", output[1])
			}
		})

		t.Run("should handle empty or nil values", func(t *testing.T) {
			assignment := NewAssignment("color", "")
			var output []string
			mockOutput := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, fmt.Sprintf("%v", chunk))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := make(map[string]interface{})

			assignment.GenCSS(context, mockOutput)
			if len(output) != 2 {
				t.Errorf("Expected 2 output chunks, got %d", len(output))
			}
			if output[0] != "color=" {
				t.Errorf("Expected first chunk to be 'color=', got %v", output[0])
			}
			if output[1] != "" {
				t.Errorf("Expected second chunk to be empty, got %v", output[1])
			}
		})

		t.Run("should handle special characters in key and value", func(t *testing.T) {
			assignment := NewAssignment("color:special", "value:with:colons")
			var output []string
			mockOutput := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, fmt.Sprintf("%v", chunk))
				},
				IsEmpty: func() bool {
					return len(output) == 0
				},
			}
			context := make(map[string]interface{})

			assignment.GenCSS(context, mockOutput)
			if len(output) != 2 {
				t.Errorf("Expected 2 output chunks, got %d", len(output))
			}
			if output[0] != "color:special=" {
				t.Errorf("Expected first chunk to be 'color:special=', got %v", output[0])
			}
			if output[1] != "value:with:colons" {
				t.Errorf("Expected second chunk to be 'value:with:colons', got %v", output[1])
			}
		})

		t.Run("should handle value.genCSS that throws error", func(t *testing.T) {
			mockValue := &MockGenCSSNode{
				genCSSFunc: func(context interface{}, output *CSSOutput) {
					panic("genCSS error")
				},
			}
			assignment := NewAssignment("color", mockValue)
			output := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {},
				IsEmpty: func() bool { return false },
			}
			context := make(map[string]interface{})

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected panic from genCSS error")
				} else if r != "genCSS error" {
					t.Errorf("Expected panic with 'genCSS error', got %v", r)
				}
			}()

			assignment.GenCSS(context, output)
		})

		t.Run("should handle nil/undefined context in genCSS", func(t *testing.T) {
			assignment := NewAssignment("color", "#000")
			output := &CSSOutput{
				Add: func(chunk interface{}, fileInfo interface{}, index interface{}) {},
				IsEmpty: func() bool { return false },
			}

			// Should not panic with nil context
			assignment.GenCSS(nil, output)
		})
	})
}

// Mock types for testing
type MockVisitor struct {
	visitFunc func(interface{}) interface{}
}

func (v *MockVisitor) Visit(value interface{}) interface{} {
	return v.visitFunc(value)
}

type MockEvalNode struct {
	*Node
	evalFunc func(interface{}) interface{}
}

func (n *MockEvalNode) Eval(context interface{}) interface{} {
	return n.evalFunc(context)
}

type MockGenCSSNode struct {
	*Node
	genCSSFunc func(interface{}, *CSSOutput)
}

func (n *MockGenCSSNode) GenCSS(context interface{}, output *CSSOutput) {
	n.genCSSFunc(context, output)
} 