package go_parser

import "testing"

func TestUnicodeDescriptor(t *testing.T) {
	t.Run("should create a unicode descriptor with value", func(t *testing.T) {
		value := "U+0??"
		ud := NewUnicodeDescriptor(value)
		if ud.value != value {
			t.Errorf("Expected value to be %q, got %q", value, ud.value)
		}
	})

	t.Run("should return correct type", func(t *testing.T) {
		ud := NewUnicodeDescriptor("U+0??")
		if ud.Type() != "UnicodeDescriptor" {
			t.Errorf("Expected type to be UnicodeDescriptor, got %s", ud.Type())
		}
	})

	t.Run("should handle various unicode range formats", func(t *testing.T) {
		testCases := []string{
			"U+0??",
			"U+00A1-00A9",
			"U+0100-01FF",
			"U+2000-2FFF",
			"U+20??",
		}

		for _, tc := range testCases {
			t.Run(tc, func(t *testing.T) {
				ud := NewUnicodeDescriptor(tc)
				if ud.value != tc {
					t.Errorf("Expected value to be %q, got %q", tc, ud.value)
				}
			})
		}
	})

	t.Run("should generate correct CSS output", func(t *testing.T) {
		ud := NewUnicodeDescriptor("U+0??")
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				if chunk != "U+0??" {
					t.Errorf("Expected CSS output to be %q, got %q", "U+0??", chunk)
				}
			},
		}
		ud.GenCSS(nil, output)
	})

	t.Run("should handle visitor pattern", func(t *testing.T) {
		ud := NewUnicodeDescriptor("U+0??")
		visited := false
		visitor := visitorFunc(func(value any) any {
			visited = true
			return value
		})
		ud.Accept(visitor)
		if !visited {
			t.Error("Expected visitor to be called")
		}
	})
}

// Helper type for testing visitor pattern
type visitorFunc func(value any) any

func (f visitorFunc) Visit(value any) any {
	return f(value)
} 