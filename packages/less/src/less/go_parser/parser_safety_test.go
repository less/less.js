package go_parser

import (
	"testing"
)

func TestSafeStringIndex(t *testing.T) {
	// Test normal access
	str := "hello"
	if char, ok := SafeStringIndex(str, 0); !ok || char != 'h' {
		t.Errorf("Expected 'h', got %c", char)
	}
	
	// Test out of bounds access (should not panic)
	if char, ok := SafeStringIndex(str, 10); ok {
		t.Errorf("Expected false for out of bounds access, got true with char %c", char)
	}
	
	// Test negative index
	if char, ok := SafeStringIndex(str, -1); ok {
		t.Errorf("Expected false for negative index, got true with char %c", char)
	}
	
	// Test empty string
	if char, ok := SafeStringIndex("", 0); ok {
		t.Errorf("Expected false for empty string access, got true with char %c", char)
	}
}

func TestSafeStringSlice(t *testing.T) {
	str := "hello world"
	
	// Test normal slice
	if slice, ok := SafeStringSlice(str, 0, 5); !ok || slice != "hello" {
		t.Errorf("Expected 'hello', got '%s'", slice)
	}
	
	// Test out of bounds slice (should not panic)
	if slice, ok := SafeStringSlice(str, 0, 100); ok {
		t.Errorf("Expected false for out of bounds slice, got true with slice '%s'", slice)
	}
	
	// Test invalid slice (start > end)
	if slice, ok := SafeStringSlice(str, 5, 2); ok {
		t.Errorf("Expected false for invalid slice, got true with slice '%s'", slice)
	}
}

func TestSafeSliceIndex(t *testing.T) {
	slice := []any{"a", "b", "c"}
	
	// Test normal access
	if val, ok := SafeSliceIndex(slice, 1); !ok || val != "b" {
		t.Errorf("Expected 'b', got %v", val)
	}
	
	// Test out of bounds access (should not panic)
	if val, ok := SafeSliceIndex(slice, 10); ok {
		t.Errorf("Expected false for out of bounds access, got true with val %v", val)
	}
	
	// Test nil slice
	if val, ok := SafeSliceIndex(nil, 0); ok {
		t.Errorf("Expected false for nil slice access, got true with val %v", val)
	}
}

func TestSafeTypeAssertion(t *testing.T) {
	var val any = "hello"
	
	// Test successful assertion
	if str, ok := SafeTypeAssertion[string](val); !ok || str != "hello" {
		t.Errorf("Expected 'hello', got '%s'", str)
	}
	
	// Test failed assertion (should not panic)
	if num, ok := SafeTypeAssertion[int](val); ok {
		t.Errorf("Expected false for failed assertion, got true with num %d", num)
	}
	
	// Test nil assertion
	if str, ok := SafeTypeAssertion[string](nil); ok {
		t.Errorf("Expected false for nil assertion, got true with str '%s'", str)
	}
}

func TestSafeNilCheck(t *testing.T) {
	// Test nil value
	if !SafeNilCheck(nil) {
		t.Error("Expected true for nil value")
	}
	
	// Test non-nil value
	str := "hello"
	if SafeNilCheck(str) {
		t.Error("Expected false for non-nil value")
	}
	
	// Test nil pointer
	var ptr *string
	if !SafeNilCheck(ptr) {
		t.Error("Expected true for nil pointer")
	}
	
	// Test non-nil pointer
	str2 := "world"
	ptr2 := &str2
	if SafeNilCheck(ptr2) {
		t.Error("Expected false for non-nil pointer")
	}
}

func TestRecoverableOperation(t *testing.T) {
	// Test normal operation
	result, err := RecoverableOperation(func() int {
		return 42
	})
	if err != nil || result != 42 {
		t.Errorf("Expected 42 with no error, got %d with error %v", result, err)
	}
	
	// Test panicking operation (should not panic the test)
	result2, err2 := RecoverableOperation(func() string {
		panic("test panic")
	})
	if err2 == nil {
		t.Error("Expected error from panicking operation")
	}
	if result2 != "" {
		t.Errorf("Expected empty string result from panicking operation, got %s", result2)
	}
}

func TestSafeToCSS(t *testing.T) {
	// Test with nil value (should not panic)
	result := SafeToCSS(nil, nil)
	if result != "" {
		t.Errorf("Expected empty string for nil value, got '%s'", result)
	}
	
	// Test with non-CSS value
	result2 := SafeToCSS("hello", nil)
	if result2 != "hello" {
		t.Errorf("Expected 'hello', got '%s'", result2)
	}
}

// Test that our parser improvements prevent actual panics
func TestParserInputSafety(t *testing.T) {
	input := NewParserInput()
	input.Start("test", false, nil)
	
	// These operations should not panic even with invalid indices
	char := input.CurrentChar()
	_ = char // Use the variable to avoid unused warning
	
	prev := input.PrevChar()
	_ = prev
	
	isWhite := input.IsWhitespace(100) // Out of bounds offset
	_ = isWhite
	
	// Test PeekChar with invalid input position
	input.i = 1000 // Set to out of bounds
	result := input.PeekChar('x')
	if result != nil {
		t.Error("Expected nil for out of bounds PeekChar")
	}
}

func TestChunkerSafety(t *testing.T) {
	// Test chunker with various inputs that might cause panics
	testInputs := []string{
		"", // Empty input
		"a", // Single character
		"\\", // Single backslash (might cause issues)
		"/*", // Incomplete comment
		"'unclosed string", // Unclosed string
		"test /* comment */ more", // Normal case
	}
	
	for _, input := range testInputs {
		t.Run("Input: "+input, func(t *testing.T) {
			// This should not panic regardless of input
			chunks := Chunker(input, func(msg string, pos int) {
				// Silent fail function for testing
			})
			// We don't care about the result, just that it doesn't panic
			_ = chunks
		})
	}
} 