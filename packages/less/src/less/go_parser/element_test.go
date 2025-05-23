package go_parser

import (
	"reflect"
	"strings"
	"testing"
)

func TestElement(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create Element with string combinator", func(t *testing.T) {
			element := NewElement(">", "div", false, 0, nil, nil)
			if element.Combinator == nil {
				t.Error("Expected combinator to not be nil")
			}
			if element.Combinator.Value != ">" {
				t.Errorf("Expected combinator value to be '>', got '%s'", element.Combinator.Value)
			}
			if element.Value != "div" {
				t.Errorf("Expected value to be 'div', got '%v'", element.Value)
			}
			if element.IsVariable {
				t.Error("Expected isVariable to be false")
			}
		})

		t.Run("should create Element with Combinator instance", func(t *testing.T) {
			combinator := NewCombinator("+")
			element := NewElement(combinator, "span", false, 0, nil, nil)
			if element.Combinator != combinator {
				t.Error("Expected combinator to be the same instance")
			}
			if element.Value != "span" {
				t.Errorf("Expected value to be 'span', got '%v'", element.Value)
			}
		})

		t.Run("should trim string values", func(t *testing.T) {
			element := NewElement(">", "  p  ", false, 0, nil, nil)
			if element.Value != "p" {
				t.Errorf("Expected value to be 'p', got '%v'", element.Value)
			}
		})

		t.Run("should handle empty value", func(t *testing.T) {
			element := NewElement(">", nil, false, 0, nil, nil)
			if element.Value != "" {
				t.Errorf("Expected value to be empty string, got '%v'", element.Value)
			}
		})

		t.Run("should handle non-string values", func(t *testing.T) {
			obj := map[string]string{"type": "test"}
			element := NewElement(">", obj, false, 0, nil, nil)
			if !reflect.DeepEqual(element.Value, obj) {
				t.Error("Expected value to be the same object")
			}
		})
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should visit combinator", func(t *testing.T) {
			element := NewElement(">", "div", false, 0, nil, nil)
			visitor := &visitorImpl{returnValue: NewCombinator("+")}
			element.Accept(visitor)
			if element.Combinator.Value != "+" {
				t.Errorf("Expected combinator value to be '+', got '%s'", element.Combinator.Value)
			}
		})

		t.Run("should visit object values", func(t *testing.T) {
			value := map[string]string{"type": "test"}
			element := NewElement(">", value, false, 0, nil, nil)
			visitor := &visitorImpl{returnValue: map[string]string{"type": "visited"}}
			element.Accept(visitor)
			if val, ok := element.Value.(map[string]string); !ok || val["type"] != "visited" {
				t.Error("Expected value to be updated by visitor")
			}
		})

		t.Run("should not visit string values", func(t *testing.T) {
			element := NewElement(">", "div", false, 0, nil, nil)
			visitor := &visitorImpl{returnValue: "visited"}
			element.Accept(visitor)
			if element.Value != "div" {
				t.Error("Expected string value to remain unchanged")
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should create new Element with same properties", func(t *testing.T) {
			fileInfo := map[string]any{"filename": "test.less"}
			element := NewElement(">", "div", false, 1, fileInfo, nil)
			result := element.Eval(map[string]any{})

			if result == element {
				t.Error("Expected result to be a new instance")
			}
			if result.Value != "div" {
				t.Error("Expected value to be preserved")
			}
			if result.IsVariable {
				t.Error("Expected isVariable to be preserved")
			}
			if result.GetIndex() != 1 {
				t.Error("Expected index to be preserved")
			}
		})

		t.Run("should eval value if it has eval method", func(t *testing.T) {
			value := &testEvaluator{returnValue: "evaluated"}
			element := NewElement(">", value, false, 0, nil, nil)
			result := element.Eval(map[string]any{})
			if result.Value != "evaluated" {
				t.Error("Expected value to be evaluated")
			}
		})
	})

	t.Run("toCSS", func(t *testing.T) {
		t.Run("should combine combinator and value CSS", func(t *testing.T) {
			element := NewElement(">", "div", false, 0, nil, nil)
			css := element.ToCSS(nil)
			if css != " > div" {
				t.Errorf("Expected CSS to be ' > div', got '%s'", css)
			}
		})

		t.Run("should handle Paren values", func(t *testing.T) {
			parenValue := &testCSSGenerator{cssValue: "test"}
			paren := NewParen(parenValue)
			element := NewElement(">", paren, false, 0, nil, nil)
			result := element.ToCSS(nil)
			if result != " > test" {
				t.Errorf("Expected CSS to be ' > test', got '%s'", result)
			}
		})

		t.Run("should return empty string for empty value with & combinator", func(t *testing.T) {
			element := NewElement("&", "", false, 0, nil, nil)
			if css := element.ToCSS(nil); css != "" {
				t.Errorf("Expected empty string, got '%s'", css)
			}
		})
	})

	t.Run("edge cases", func(t *testing.T) {
		t.Run("should handle malformed fileInfo", func(t *testing.T) {
			element := NewElement(">", "div", false, 1, nil, nil)
			if element.FileInfo() == nil {
				t.Error("Expected empty map for nil fileInfo, got nil")
			}

			element2 := NewElement(">", "div", false, 1, map[string]any{}, nil)
			if len(element2.FileInfo()) != 0 {
				t.Error("Expected empty map for empty fileInfo")
			}

			element3 := NewElement(">", "div", false, 1, map[string]any{"invalid": nil}, nil)
			if element3.FileInfo()["invalid"] != nil {
				t.Error("Expected nil value to be preserved in fileInfo")
			}
		})

		t.Run("should handle malformed visibilityInfo", func(t *testing.T) {
			element := NewElement(">", "div", false, 1, nil, nil)
			if element.VisibilityInfo() == nil {
				t.Error("Expected non-nil visibilityInfo")
			}

			element2 := NewElement(">", "div", false, 1, nil, map[string]any{
				"visibilityBlocks": "invalid",
				"nodeVisible":      123,
			})
			visInfo := element2.VisibilityInfo()
			if visInfo == nil {
				t.Error("Expected non-nil visibilityInfo even with invalid data")
			}
		})

		t.Run("should handle invalid indices", func(t *testing.T) {
			element := NewElement(">", "div", false, -1, nil, nil)
			if element.GetIndex() != -1 {
				t.Error("Expected negative index to be preserved")
			}

			element2 := NewElement(">", "div", false, 0, nil, nil)
			if element2.GetIndex() != 0 {
				t.Error("Expected zero index to be preserved")
			}

			maxInt := int(^uint(0) >> 1)
			element3 := NewElement(">", "div", false, maxInt, nil, nil)
			if element3.GetIndex() != maxInt {
				t.Error("Expected max int index to be preserved")
			}
		})

		t.Run("should handle circular references", func(t *testing.T) {
			// Create a circular reference in the value
			type circular struct {
				self *circular
			}
			c := &circular{}
			c.self = c

			element := NewElement(">", c, false, 0, nil, nil)
			css := element.ToCSS(nil)
			if css == "" {
				t.Error("Expected non-empty CSS output even with circular reference")
			}
		})

		t.Run("should handle very long values", func(t *testing.T) {
			longString := strings.Repeat("a", 10000)
			element := NewElement(">", longString, false, 0, nil, nil)
			css := element.ToCSS(nil)
			expected := " > " + longString
			if css != expected {
				t.Errorf("Expected CSS to be '%s', got '%s'", expected, css)
			}
		})

		t.Run("should handle special characters", func(t *testing.T) {
			tests := []struct {
				name     string
				value    string
				expected string
			}{
				{
					name:     "special chars",
					value:    "!@#$%^&*()_+{}[]|\\:;\"'<>,.?/~`",
					expected: " > !@#$%^&*()_+{}[]|\\:;\"'<>,.?/~`",
				},
				{
					name:     "emoji",
					value:    "🌟 ⭐️ 🌙",
					expected: " > 🌟 ⭐️ 🌙",
				},
				{
					name:     "unicode",
					value:    "你好 привет مرحبا",
					expected: " > 你好 привет مرحبا",
				},
				{
					name:     "zero width chars",
					value:    "a\u200Bb\u200Cc",
					expected: " > a\u200Bb\u200Cc",
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					element := NewElement(">", tt.value, false, 0, nil, nil)
					css := element.ToCSS(nil)
					if css != tt.expected {
						t.Errorf("Expected CSS to be '%s', got '%s'", tt.expected, css)
					}
				})
			}
		})
	})
}

// Test helpers
type visitorImpl struct {
	returnValue any
}

func (v *visitorImpl) Visit(node any) any {
	return v.returnValue
}

type testEvaluator struct {
	returnValue any
}

func (e *testEvaluator) Eval(context any) any {
	return e.returnValue
}

type testCSSGenerator struct {
	cssValue string
}

func (g *testCSSGenerator) ToCSS(context any) string {
	return g.cssValue
} 