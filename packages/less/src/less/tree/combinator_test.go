package tree

import (
	"strings"
	"testing"
)

func TestCombinator(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create a combinator with empty value", func(t *testing.T) {
			combinator := NewCombinator("")
			if combinator.Value != "" {
				t.Errorf("Expected empty value, got %s", combinator.Value)
			}
			if !combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be true")
			}
		})

		t.Run("should create a combinator with space value", func(t *testing.T) {
			combinator := NewCombinator(" ")
			if combinator.Value != " " {
				t.Errorf("Expected space value, got %s", combinator.Value)
			}
			if !combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be true")
			}
		})

		t.Run("should create a combinator with trimmed value", func(t *testing.T) {
			combinator := NewCombinator("  >  ")
			if combinator.Value != ">" {
				t.Errorf("Expected '>', got %s", combinator.Value)
			}
			if combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be false")
			}
		})

		t.Run("should handle empty string value", func(t *testing.T) {
			combinator := NewCombinator("")
			if combinator.Value != "" {
				t.Errorf("Expected empty value, got %s", combinator.Value)
			}
			if !combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be true")
			}
		})

		t.Run("should handle various whitespace combinations", func(t *testing.T) {
			combinator := NewCombinator("\t\n\r  >  \t\n\r")
			if combinator.Value != ">" {
				t.Errorf("Expected '>', got %s", combinator.Value)
			}
			if combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be false")
			}
		})

		t.Run("should handle special characters in input", func(t *testing.T) {
			combinator := NewCombinator("  *  ")
			if combinator.Value != "*" {
				t.Errorf("Expected '*', got %s", combinator.Value)
			}
			if combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be false")
			}
		})

		t.Run("should handle strings containing only whitespace", func(t *testing.T) {
			combinator := NewCombinator("\t\n\r ")
			if combinator.Value != "" {
				t.Errorf("Expected empty value, got %s", combinator.Value)
			}
			if !combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be true")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should generate CSS with no spaces for empty combinator", func(t *testing.T) {
			combinator := NewCombinator("")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != "" {
				t.Errorf("Expected empty string, got %v", output)
			}
		})

		t.Run("should generate CSS with no spaces for space combinator", func(t *testing.T) {
			combinator := NewCombinator(" ")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != " " {
				t.Errorf("Expected space, got %v", output)
			}
		})

		t.Run("should generate CSS with spaces for non-empty combinator when not compressed", func(t *testing.T) {
			combinator := NewCombinator(">")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != " > " {
				t.Errorf("Expected ' > ', got %v", output)
			}
		})

		t.Run("should generate CSS without spaces for non-empty combinator when compressed", func(t *testing.T) {
			combinator := NewCombinator(">")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": true}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != ">" {
				t.Errorf("Expected '>', got %v", output)
			}
		})

		t.Run("should generate CSS without spaces for pipe combinator even when not compressed", func(t *testing.T) {
			combinator := NewCombinator("|")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != "|" {
				t.Errorf("Expected '|', got %v", output)
			}
		})

		t.Run("should handle other common combinators", func(t *testing.T) {
			combinators := []string{"+", "~", ">>"}
			for _, value := range combinators {
				combinator := NewCombinator(value)
				var output []string
				outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, chunk.(string))
				}
				combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
				expected := " " + value + " "
				if len(output) != 1 || output[0] != expected {
					t.Errorf("Expected '%s', got %v", expected, output)
				}
			}
		})

		t.Run("should handle special characters in combinator value", func(t *testing.T) {
			combinator := NewCombinator("*")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != " * " {
				t.Errorf("Expected ' * ', got %v", output)
			}
		})

		t.Run("should handle all special no-space combinators", func(t *testing.T) {
			specialCombinators := []string{"", " ", "|"}
			for _, value := range specialCombinators {
				combinator := NewCombinator(value)
				var output []string
				outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, chunk.(string))
				}
				combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
				if len(output) != 1 || output[0] != value {
					t.Errorf("Expected '%s', got %v", value, output)
				}
			}
		})

		t.Run("should handle unicode whitespace characters", func(t *testing.T) {
			combinator := NewCombinator("\u00A0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff>")
			if combinator.Value != ">" {
				t.Errorf("Expected '>', got %s", combinator.Value)
			}
			if combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be false")
			}
		})

		t.Run("should handle very long strings with multiple spaces", func(t *testing.T) {
			longString := "   " + strings.Repeat(">", 100) + "   "
			combinator := NewCombinator(longString)
			if combinator.Value != strings.Repeat(">", 100) {
				t.Error("Expected long string of '>' characters")
			}
			if combinator.EmptyOrWhitespace {
				t.Error("Expected EmptyOrWhitespace to be false")
			}
		})

		t.Run("should handle more special combinator characters", func(t *testing.T) {
			specialChars := []string{"/", "\\", ":", ";", "!", "@", "#", "$", "%", "^", "&", "=", "?"}
			for _, value := range specialChars {
				combinator := NewCombinator(value)
				var output []string
				outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
					output = append(output, chunk.(string))
				}
				combinator.GenCSS(map[string]interface{}{"compress": false}, &CSSOutput{Add: outputFunc})
				expected := " " + value + " "
				if len(output) != 1 || output[0] != expected {
					t.Errorf("Expected '%s', got %v", expected, output)
				}
			}
		})

		t.Run("should handle undefined context", func(t *testing.T) {
			combinator := NewCombinator(">")
			var output []string
			outputFunc := func(chunk interface{}, fileInfo interface{}, index interface{}) {
				output = append(output, chunk.(string))
			}
			combinator.GenCSS(nil, &CSSOutput{Add: outputFunc})
			if len(output) != 1 || output[0] != " > " {
				t.Errorf("Expected ' > ', got %v", output)
			}
		})
	})

	t.Run("inheritance from Node", func(t *testing.T) {
		t.Run("should have Node properties", func(t *testing.T) {
			combinator := NewCombinator(">")
			if combinator.Parent != nil {
				t.Error("Expected Parent to be nil")
			}
			if combinator.VisibilityBlocks != nil {
				t.Error("Expected VisibilityBlocks to be nil")
			}
			if combinator.NodeVisible != nil {
				t.Error("Expected NodeVisible to be nil")
			}
			if combinator.RootNode != nil {
				t.Error("Expected RootNode to be nil")
			}
			if combinator.Parsed != nil {
				t.Error("Expected Parsed to be nil")
			}
		})

		t.Run("should be able to set parent", func(t *testing.T) {
			combinator := NewCombinator(">")
			parent := NewNode()
			combinator.SetParent(combinator.Node, parent)
			if combinator.Parent != parent {
				t.Error("Parent was not set correctly")
			}
		})

		t.Run("should be able to set parent for array of nodes", func(t *testing.T) {
			combinator1 := NewCombinator(">")
			combinator2 := NewCombinator("+")
			parent := NewNode()
			combinator1.SetParent([]*Node{combinator1.Node, combinator2.Node}, parent)
			if combinator1.Parent != parent {
				t.Error("Parent was not set correctly for first combinator")
			}
			if combinator2.Parent != parent {
				t.Error("Parent was not set correctly for second combinator")
			}
		})
	})
} 