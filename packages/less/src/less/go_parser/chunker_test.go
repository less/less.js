package go_parser

import (
	"testing"
)

func TestChunker(t *testing.T) {
	t.Run("should handle empty strings", func(t *testing.T) {
		input := "a: \"\"; b: ''; c: ``;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle strings with escaped backslashes", func(t *testing.T) {
		input := "a: \"\\\\\"; b: '\\\\';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle strings with newlines", func(t *testing.T) {
		input := "a: \"line1\nline2\"; b: 'line1\nline2';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle empty comments", func(t *testing.T) {
		input := "/**/ a: red; //"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle comments with escaped characters", func(t *testing.T) {
		input := "/* \\\" */ a: red; // \\'"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle empty blocks", func(t *testing.T) {
		input := "a {} b: calc();"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle invalid escape sequences in strings", func(t *testing.T) {
		input := "a: \"\\x\"; b: '\\y';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with only a closing brace", func(t *testing.T) {
		input := "}"
		var errorMsg string
		Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "missing opening `{`" {
			t.Errorf("Expected 'missing opening `{`', got '%s'", errorMsg)
		}
	})

	t.Run("should handle input with only a closing parenthesis", func(t *testing.T) {
		input := ")"
		var errorMsg string
		Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "missing opening `(`" {
			t.Errorf("Expected 'missing opening `(`', got '%s'", errorMsg)
		}
	})

	t.Run("should handle input with only a comment marker", func(t *testing.T) {
		input := "/*"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with only a single-line comment marker", func(t *testing.T) {
		input := "//"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with mixed whitespace characters", func(t *testing.T) {
		input := "  \t\n\r\f\v  "
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with all special characters", func(t *testing.T) {
		input := "{}()[];:,.+-*/=<>!&|^~%#@?'\"`\\"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "unmatched `/*`" {
			t.Errorf("Expected 'unmatched `/*`', got '%s'", errorMsg)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})

	t.Run("should handle input with multiple consecutive special characters", func(t *testing.T) {
		input := "{{}}(()));;::,,..++--**//==<<>>!!&&||^^~~%%##@@??''\"\"``\\\\"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "missing opening `(`" {
			t.Errorf("Expected 'missing opening `(`', got '%s'", errorMsg)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})

	t.Run("should handle input with maximum nesting depth", func(t *testing.T) {
		input := "a { b { c { d { e { f { g { h { i { j: k; } } } } } } } } }"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with maximum parentheses depth", func(t *testing.T) {
		input := "a: calc((((((((((1))))))))));"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle input with maximum mixed nesting depth", func(t *testing.T) {
		input := "a { b: calc((((((((((1)))))))))); }"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle strings with nested different quote types", func(t *testing.T) {
		input := "a: \"string with ' inside\"; b: 'string with \" inside';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle template literals with nested quotes", func(t *testing.T) {
		input := "a: `string with \" and ' inside`;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle comments containing string-like syntax", func(t *testing.T) {
		input := "/* \"not a string\" */ a: red;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle comments with unmatched braces/parentheses", func(t *testing.T) {
		input := "/* { ( */ a: red; /* ) } */"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should report correct error positions", func(t *testing.T) {
		input := "a { b: red; } }"
		var errorPos int
		Chunker(input, func(msg string, pos int) {
			errorPos = pos
		})
		if errorPos != 14 { // Position of the extra closing brace
			t.Errorf("Expected error position 14, got %d", errorPos)
		}
	})

	t.Run("should handle chunk size boundary cases", func(t *testing.T) {
		longString := ""
		for i := 0; i < 511; i++ {
			longString += "a"
		}
		input := longString + "; b: red;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 {
			t.Errorf("Expected 1 chunk, got %d", len(result))
		}
	})

	t.Run("should not split mid-token", func(t *testing.T) {
		longString := "a"
		for i := 0; i < 510; i++ {
			longString += "a"
		}
		input := longString + "red;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 {
			t.Errorf("Expected 1 chunk, got %d", len(result))
		}
	})

	t.Run("should handle complex mixed syntax", func(t *testing.T) {
		input := "a { /* \"comment\" */ b: \"string with /* not a comment */\"; }"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle strings containing comment markers", func(t *testing.T) {
		input := "a: \"string with /* not a comment */\"; b: \"string with // not a comment\";"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle comments containing string delimiters", func(t *testing.T) {
		input := "/* \"not a string\" 'also not' `nope` */ a: red;"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle unicode characters", func(t *testing.T) {
		input := "a: \"😊\"; b: '你好';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle control characters", func(t *testing.T) {
		input := "a: \"\t\r\n\"; b: '\u0000';"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle surrogate pairs correctly", func(t *testing.T) {
		input := "a: \"😊\"; b: \"👨‍👩‍👧‍👦\";"
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})

	t.Run("should handle Unicode characters that look like ASCII", func(t *testing.T) {
		input := "a: \"｛\"; b: \"｝\";" // Fullwidth brackets
		var errorMsg string
		result := Chunker(input, func(msg string, _ int) {
			errorMsg = msg
		})
		if errorMsg != "" {
			t.Errorf("Unexpected error: %s", errorMsg)
		}
		if len(result) != 1 || result[0] != input {
			t.Errorf("Expected [%s], got %v", input, result)
		}
	})
} 