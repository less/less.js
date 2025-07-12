package less_go

import (
	"testing"
)

func TestE(t *testing.T) {
	t.Run("should escape a simple string", func(t *testing.T) {
		input := NewQuoted("\"", "hello world", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "hello world" {
			t.Errorf("Expected 'hello world', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle empty string", func(t *testing.T) {
		input := NewQuoted("\"", "", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "" {
			t.Errorf("Expected empty string, got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle single quote string", func(t *testing.T) {
		input := NewQuoted("'", "test string", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "test string" {
			t.Errorf("Expected 'test string', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle unquoted string", func(t *testing.T) {
		input := NewQuoted("", "unquoted", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "unquoted" {
			t.Errorf("Expected 'unquoted', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle string with special characters", func(t *testing.T) {
		input := NewQuoted("\"", "hello\\nworld\\ttab", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "hello\\nworld\\ttab" {
			t.Errorf("Expected 'hello\\nworld\\ttab', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle string with quotes inside", func(t *testing.T) {
		input := NewQuoted("\"", "say \"hello\" to world", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "say \"hello\" to world" {
			t.Errorf("Expected 'say \"hello\" to world', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle string with unicode characters", func(t *testing.T) {
		input := NewQuoted("\"", "héllo wørld 🌍", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "héllo wørld 🌍" {
			t.Errorf("Expected 'héllo wørld 🌍', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle very long string", func(t *testing.T) {
		longString := ""
		for i := 0; i < 1000; i++ {
			longString += "a"
		}
		input := NewQuoted("\"", longString, false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != longString {
			t.Errorf("Expected long string, got different value")
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle string with backslashes", func(t *testing.T) {
		input := NewQuoted("\"", "path\\to\\file", false, 0, nil)
		result, err := E(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.value != "path\\to\\file" {
			t.Errorf("Expected 'path\\to\\file', got %s", result.value)
		}
		if !result.escaped {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})
}

func TestEscape(t *testing.T) {
	t.Run("should escape basic URI characters", func(t *testing.T) {
		input := NewQuoted("\"", "hello world", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "hello%20world" {
			t.Errorf("Expected 'hello%%20world', got %s", result.Value)
		}
	})

	t.Run("should escape equals sign", func(t *testing.T) {
		input := NewQuoted("\"", "key=value", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "key%3Dvalue" {
			t.Errorf("Expected 'key%%3Dvalue', got %s", result.Value)
		}
	})

	t.Run("should escape colon", func(t *testing.T) {
		input := NewQuoted("\"", "http://example.com", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "http%3A//example.com" {
			t.Errorf("Expected 'http%%3A//example.com', got %s", result.Value)
		}
	})

	t.Run("should escape hash", func(t *testing.T) {
		input := NewQuoted("\"", "url#fragment", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "url%23fragment" {
			t.Errorf("Expected 'url%%23fragment', got %s", result.Value)
		}
	})

	t.Run("should escape semicolon", func(t *testing.T) {
		input := NewQuoted("\"", "param1=value1;param2=value2", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "param1%3Dvalue1%3Bparam2%3Dvalue2" {
			t.Errorf("Expected 'param1%%3Dvalue1%%3Bparam2%%3Dvalue2', got %s", result.Value)
		}
	})

	t.Run("should escape parentheses", func(t *testing.T) {
		input := NewQuoted("\"", "function(arg)", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "function%28arg%29" {
			t.Errorf("Expected 'function%%28arg%%29', got %s", result.Value)
		}
	})

	t.Run("should escape all special characters together", func(t *testing.T) {
		input := NewQuoted("\"", "url(http://example.com/path?key=value#section);", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		expected := "url%28http%3A//example.com/path%3Fkey%3Dvalue%23section%29%3B"
		if result.Value != expected {
			t.Errorf("Expected '%s', got %s", expected, result.Value)
		}
	})

	t.Run("should handle empty string", func(t *testing.T) {
		input := NewQuoted("\"", "", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "" {
			t.Errorf("Expected empty string, got %s", result.Value)
		}
	})

	t.Run("should handle string with no special characters", func(t *testing.T) {
		input := NewQuoted("\"", "plaintext", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "plaintext" {
			t.Errorf("Expected 'plaintext', got %s", result.Value)
		}
	})

	t.Run("should handle repeated special characters", func(t *testing.T) {
		input := NewQuoted("\"", "==::##;;(())", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "%3D%3D%3A%3A%23%23%3B%3B%28%28%29%29" {
			t.Errorf("Expected '%%3D%%3D%%3A%%3A%%23%%23%%3B%%3B%%28%%28%%29%%29', got %s", result.Value)
		}
	})

	t.Run("should handle mixed case", func(t *testing.T) {
		input := NewQuoted("\"", "MixedCase=Value", false, 0, nil)
		result, err := Escape(input)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != "MixedCase%3DValue" {
			t.Errorf("Expected 'MixedCase%%3DValue', got %s", result.Value)
		}
	})
}

func TestReplace(t *testing.T) {
	t.Run("should replace simple string", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello world", false, 0, nil)
		pattern := NewQuoted("\"", "world", false, 0, nil)
		replacement := NewQuoted("\"", "universe", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello universe" {
			t.Errorf("Expected 'hello universe', got %s", result.value)
		}
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.escaped != false {
			t.Errorf("Expected escaped=false, got %v", result.escaped)
		}
	})

	t.Run("should preserve original quote style", func(t *testing.T) {
		stringArg := NewQuoted("'", "hello world", false, 0, nil)
		pattern := NewQuoted("\"", "world", false, 0, nil)
		replacement := NewQuoted("\"", "universe", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello universe" {
			t.Errorf("Expected 'hello universe', got %s", result.value)
		}
		if result.quote != "'" {
			t.Errorf("Expected quote ', got %s", result.quote)
		}
		if result.escaped != false {
			t.Errorf("Expected escaped=false, got %v", result.escaped)
		}
	})

	t.Run("should preserve escaped status", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello world", true, 0, nil)
		pattern := NewQuoted("\"", "world", false, 0, nil)
		replacement := NewQuoted("\"", "universe", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello universe" {
			t.Errorf("Expected 'hello universe', got %s", result.value)
		}
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.escaped != true {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle no quotes in original string", func(t *testing.T) {
		stringArg := NewQuoted("", "hello world", false, 0, nil)
		pattern := NewQuoted("\"", "world", false, 0, nil)
		replacement := NewQuoted("\"", "universe", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello universe" {
			t.Errorf("Expected 'hello universe', got %s", result.value)
		}
		if result.quote != "" {
			t.Errorf("Expected empty quote, got %s", result.quote)
		}
		if result.escaped != false {
			t.Errorf("Expected escaped=false, got %v", result.escaped)
		}
	})

	t.Run("should replace with regex pattern", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello world 123", false, 0, nil)
		pattern := NewQuoted("\"", "\\d+", false, 0, nil)
		replacement := NewQuoted("\"", "ABC", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello world ABC" {
			t.Errorf("Expected 'hello world ABC', got %s", result.value)
		}
	})

	t.Run("should handle global flag", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello hello hello", false, 0, nil)
		pattern := NewQuoted("\"", "hello", false, 0, nil)
		replacement := NewQuoted("\"", "hi", false, 0, nil)
		flags := NewQuoted("\"", "g", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement, flags)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hi hi hi" {
			t.Errorf("Expected 'hi hi hi', got %s", result.value)
		}
	})

	t.Run("should handle case insensitive flag", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello HELLO hello", false, 0, nil)
		pattern := NewQuoted("\"", "hello", false, 0, nil)
		replacement := NewQuoted("\"", "hi", false, 0, nil)
		flags := NewQuoted("\"", "gi", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement, flags)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hi hi hi" {
			t.Errorf("Expected 'hi hi hi', got %s", result.value)
		}
	})

	t.Run("should handle no flags", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello hello hello", false, 0, nil)
		pattern := NewQuoted("\"", "hello", false, 0, nil)
		replacement := NewQuoted("\"", "hi", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hi hello hello" {
			t.Errorf("Expected 'hi hello hello', got %s", result.value)
		}
	})

	t.Run("should handle empty pattern", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello", false, 0, nil)
		pattern := NewQuoted("\"", "", false, 0, nil)
		replacement := NewQuoted("\"", "X", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Xhello" {
			t.Errorf("Expected 'Xhello', got %s", result.value)
		}
	})

	t.Run("should handle empty replacement", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello world", false, 0, nil)
		pattern := NewQuoted("\"", "world", false, 0, nil)
		replacement := NewQuoted("\"", "", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello " {
			t.Errorf("Expected 'hello ', got %s", result.value)
		}
	})

	t.Run("should handle pattern not found", func(t *testing.T) {
		stringArg := NewQuoted("\"", "hello world", false, 0, nil)
		pattern := NewQuoted("\"", "xyz", false, 0, nil)
		replacement := NewQuoted("\"", "abc", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "hello world" {
			t.Errorf("Expected 'hello world', got %s", result.value)
		}
	})

	t.Run("should handle special regex characters in pattern", func(t *testing.T) {
		stringArg := NewQuoted("\"", "price: $10.99", false, 0, nil)
		pattern := NewQuoted("\"", "\\$[0-9]+\\.[0-9]{2}", false, 0, nil)
		replacement := NewQuoted("\"", "**price**", false, 0, nil)
		
		result, err := Replace(stringArg, pattern, replacement)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "price: **price**" {
			t.Errorf("Expected 'price: **price**', got %s", result.value)
		}
	})
}

// MockStringCSSable for testing toCSS method in string tests
type MockStringCSSable struct {
	cssValue string
}

func (m *MockStringCSSable) ToCSS(context interface{}) string {
	return m.cssValue
}

func (m *MockStringCSSable) GetValue() interface{} {
	return m.cssValue
}

func TestFormat(t *testing.T) {
	t.Run("should replace %s with string value", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %s!", false, 0, nil)
		arg := NewQuoted("\"", "world", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world!" {
			t.Errorf("Expected 'Hello world!', got %s", result.value)
		}
		if result.quote != "\"" {
			t.Errorf("Expected quote \", got %s", result.quote)
		}
		if result.escaped != false {
			t.Errorf("Expected escaped=false, got %v", result.escaped)
		}
	})

	t.Run("should replace %d with CSS representation", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Count: %d", false, 0, nil)
		arg := &MockStringCSSable{cssValue: "42"}
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Count: 42" {
			t.Errorf("Expected 'Count: 42', got %s", result.value)
		}
	})

	t.Run("should replace %a with CSS representation", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Value: %a", false, 0, nil)
		arg := &MockStringCSSable{cssValue: "#ff0000"}
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Value: #ff0000" {
			t.Errorf("Expected 'Value: #ff0000', got %s", result.value)
		}
	})

	t.Run("should handle uppercase %S with URL encoding", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %S!", false, 0, nil)
		arg := NewQuoted("\"", "world test", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world%20test!" {
			t.Errorf("Expected 'Hello world%%20test!', got %s", result.value)
		}
	})

	t.Run("should handle uppercase %D with URL encoding", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Count: %D", false, 0, nil)
		arg := &MockStringCSSable{cssValue: "42 items"}
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Count: 42%20items" {
			t.Errorf("Expected 'Count: 42%%20items', got %s", result.value)
		}
	})

	t.Run("should handle uppercase %A with URL encoding", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Value: %A", false, 0, nil)
		arg := &MockStringCSSable{cssValue: "#ff0000 red"}
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Value: %23ff0000%20red" {
			t.Errorf("Expected 'Value: %%23ff0000%%20red', got %s", result.value)
		}
	})

	t.Run("should handle multiple replacements", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %s, you have %d messages", false, 0, nil)
		arg1 := NewQuoted("\"", "John", false, 0, nil)
		arg2 := &MockStringCSSable{cssValue: "5"}
		
		result, err := Format(stringArg, arg1, arg2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello John, you have 5 messages" {
			t.Errorf("Expected 'Hello John, you have 5 messages', got %s", result.value)
		}
	})

	t.Run("should replace %% with single %", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Progress: 50%%", false, 0, nil)
		
		result, err := Format(stringArg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Progress: 50%" {
			t.Errorf("Expected 'Progress: 50%%', got %s", result.value)
		}
	})

	t.Run("should handle %% and normal placeholders together", func(t *testing.T) {
		stringArg := NewQuoted("\"", "%s completed 100%% of %d tasks", false, 0, nil)
		arg1 := NewQuoted("\"", "User", false, 0, nil)
		arg2 := &MockStringCSSable{cssValue: "10"}
		
		result, err := Format(stringArg, arg1, arg2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "User completed 100% of 10 tasks" {
			t.Errorf("Expected 'User completed 100%% of 10 tasks', got %s", result.value)
		}
	})

	t.Run("should preserve original quote style", func(t *testing.T) {
		stringArg := NewQuoted("'", "Hello %s!", false, 0, nil)
		arg := NewQuoted("\"", "world", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world!" {
			t.Errorf("Expected 'Hello world!', got %s", result.value)
		}
		if result.quote != "'" {
			t.Errorf("Expected quote ', got %s", result.quote)
		}
	})

	t.Run("should preserve escaped status", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %s!", true, 0, nil)
		arg := NewQuoted("\"", "world", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world!" {
			t.Errorf("Expected 'Hello world!', got %s", result.value)
		}
		if result.escaped != true {
			t.Errorf("Expected escaped=true, got %v", result.escaped)
		}
	})

	t.Run("should handle no quotes in original string", func(t *testing.T) {
		stringArg := NewQuoted("", "Hello %s!", false, 0, nil)
		arg := NewQuoted("\"", "world", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world!" {
			t.Errorf("Expected 'Hello world!', got %s", result.value)
		}
		if result.quote != "" {
			t.Errorf("Expected empty quote, got %s", result.quote)
		}
	})

	t.Run("should handle more arguments than placeholders", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %s!", false, 0, nil)
		arg1 := NewQuoted("\"", "world", false, 0, nil)
		arg2 := NewQuoted("\"", "extra", false, 0, nil)
		
		result, err := Format(stringArg, arg1, arg2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world!" {
			t.Errorf("Expected 'Hello world!', got %s", result.value)
		}
	})

	t.Run("should handle fewer arguments than placeholders", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello %s and %s!", false, 0, nil)
		arg1 := NewQuoted("\"", "world", false, 0, nil)
		
		result, err := Format(stringArg, arg1)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world and %s!" {
			t.Errorf("Expected 'Hello world and %%s!', got %s", result.value)
		}
	})

	t.Run("should handle empty string template", func(t *testing.T) {
		stringArg := NewQuoted("\"", "", false, 0, nil)
		arg := NewQuoted("\"", "test", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "" {
			t.Errorf("Expected empty string, got %s", result.value)
		}
	})

	t.Run("should handle no arguments", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Hello world! 100%%", false, 0, nil)
		
		result, err := Format(stringArg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Hello world! 100%" {
			t.Errorf("Expected 'Hello world! 100%%', got %s", result.value)
		}
	})

	t.Run("should handle special characters in replacement values", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Path: %s", false, 0, nil)
		arg := NewQuoted("\"", "folder/subfolder file.txt", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Path: folder/subfolder file.txt" {
			t.Errorf("Expected 'Path: folder/subfolder file.txt', got %s", result.value)
		}
	})

	t.Run("should handle unicode characters in replacement values", func(t *testing.T) {
		stringArg := NewQuoted("\"", "Message: %s", false, 0, nil)
		arg := NewQuoted("\"", "héllo wørld 🌍", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.value != "Message: héllo wørld 🌍" {
			t.Errorf("Expected 'Message: héllo wørld 🌍', got %s", result.value)
		}
	})

	t.Run("should handle complex URL encoding with uppercase placeholders", func(t *testing.T) {
		stringArg := NewQuoted("\"", "URL: %S", false, 0, nil)
		arg := NewQuoted("\"", "hello world & stuff", false, 0, nil)
		
		result, err := Format(stringArg, arg)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		expected := "URL: hello%20world%20%26%20stuff"
		if result.value != expected {
			t.Errorf("Expected '%s', got %s", expected, result.value)
		}
	})
}