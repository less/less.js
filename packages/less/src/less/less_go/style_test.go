package less_go

import (
	"testing"
)

// MockEvalContext for testing
type MockStyleEvalContext struct {
	compressed bool
}

func (m *MockStyleEvalContext) IsCompressed() bool {
	return m.compressed
}

func (m *MockStyleEvalContext) GetFrames() []ParserFrame {
	return nil
}

func (m *MockStyleEvalContext) EnterCalc() {}
func (m *MockStyleEvalContext) ExitCalc() {}
func (m *MockStyleEvalContext) IsMathOn() bool { return false }
func (m *MockStyleEvalContext) SetMathOn(bool) {}
func (m *MockStyleEvalContext) IsInCalc() bool { return false }
func (m *MockStyleEvalContext) GetImportantScope() []map[string]bool { return nil }

func TestStyle(t *testing.T) {
	t.Run("should return error with no arguments", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		result, err := Style(ctx)
		if err == nil {
			t.Error("Expected error with no arguments, got nil")
		}
		if result != nil {
			t.Error("Expected nil result with error")
		}
	})

	t.Run("should handle quoted argument but expect variable error", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		// Test with a Quoted argument
		arg1 := NewQuoted("\"", "test-property", false, 0, nil)
		
		// We expect an error because the variable @test-property doesn't exist in our mock context
		_, err := Style(ctx, arg1)
		
		if err == nil {
			t.Error("Expected error when variable doesn't exist in context")
		}
	})

	t.Run("should handle empty string argument", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		// Test with empty string - variable @ should fail
		arg1 := NewQuoted("\"", "", false, 0, nil)
		
		_, err := Style(ctx, arg1)
		
		// Should get error for variable @
		if err == nil {
			t.Error("Expected error when variable doesn't exist")
		}
	})

	t.Run("should handle unquoted argument", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		// Test with unquoted Quoted (no quote marks)
		arg1 := NewQuoted("", "background", false, 0, nil)
		
		_, err := Style(ctx, arg1)
		
		// Should get error for variable @background
		if err == nil {
			t.Error("Expected error when variable doesn't exist")
		}
	})

	t.Run("should handle object with GetValue method", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		// Create a mock object with GetValue method
		mockObj := &MockValueGetter{value: "test-value"}
		
		_, err := Style(ctx, mockObj)
		
		// Should get error for variable @test-value
		if err == nil {
			t.Error("Expected error when variable doesn't exist")
		}
	})

	t.Run("should handle unknown argument type", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		// Test with a different type
		_, err := Style(ctx, "string")
		
		// Should get error for variable @ (empty string)
		if err == nil {
			t.Error("Expected error when variable doesn't exist")
		}
	})

	t.Run("should handle compressed context", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: true},
		}

		arg1 := NewQuoted("\"", "test", false, 0, nil)
		
		_, err := Style(ctx, arg1)
		
		// Should still get error for variable @test
		if err == nil {
			t.Error("Expected error when variable doesn't exist")
		}
	})
}

func TestStyleWithCatch(t *testing.T) {
	t.Run("should return nil when style function fails", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		arg1 := NewQuoted("\"", "undefined-var", false, 0, nil)
		result := StyleWithCatch(ctx, arg1)

		if result != nil {
			t.Error("Expected nil result when style function fails")
		}
	})

	t.Run("should return nil with no arguments", func(t *testing.T) {
		ctx := StyleContext{
			Index:           0,
			CurrentFileInfo: make(map[string]any),
			Context:         &MockStyleEvalContext{compressed: false},
		}

		result := StyleWithCatch(ctx)
		if result != nil {
			t.Error("Expected nil result with no arguments")
		}
	})
}

// MockValueGetter for testing GetValue interface
type MockValueGetter struct {
	value string
}

func (m *MockValueGetter) GetValue() interface{} {
	return m.value
}