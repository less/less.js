package go_parser

import (
	"testing"
)

func TestKeyword(t *testing.T) {
	t.Run("should store the provided value", func(t *testing.T) {
		keyword := NewKeyword("test")
		if keyword.value != "test" {
			t.Errorf("expected value to be 'test', got '%s'", keyword.value)
		}
	})

	t.Run("should inherit from Node", func(t *testing.T) {
		keyword := NewKeyword("test")
		if keyword.Node == nil {
			t.Error("expected keyword to embed Node, but Node is nil")
		}
	})

	t.Run("should have correct type", func(t *testing.T) {
		keyword := NewKeyword("test")
		if keyword.Type() != "Keyword" {
			t.Errorf("expected type to be 'Keyword', got '%s'", keyword.Type())
		}
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should add value to output", func(t *testing.T) {
			keyword := NewKeyword("test")
			var addedValue string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					addedValue = chunk.(string)
				},
				IsEmpty: func() bool { return false },
			}

			keyword.GenCSS(nil, output)
			if addedValue != "test" {
				t.Errorf("expected output to receive 'test', got '%s'", addedValue)
			}
		})

		t.Run("should panic for % value", func(t *testing.T) {
			keyword := NewKeyword("%")
			output := &CSSOutput{
				Add:     func(chunk any, fileInfo any, index any) {},
				IsEmpty: func() bool { return false },
			}

			defer func() {
				if r := recover(); r == nil {
					t.Error("expected GenCSS to panic with % value")
				} else {
					err, ok := r.(map[string]string)
					if !ok {
						t.Error("expected panic value to be map[string]string")
					}
					if err["type"] != "Syntax" || err["message"] != "Invalid % without number" {
						t.Error("unexpected panic message")
					}
				}
			}()

			keyword.GenCSS(nil, output)
		})

		t.Run("should handle empty string value", func(t *testing.T) {
			keyword := NewKeyword("")
			var addedValue string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					addedValue = chunk.(string)
				},
				IsEmpty: func() bool { return false },
			}

			keyword.GenCSS(nil, output)
			if addedValue != "" {
				t.Errorf("expected output to receive empty string, got '%s'", addedValue)
			}
		})

		t.Run("should handle special characters except %", func(t *testing.T) {
			keyword := NewKeyword("$#@!")
			var addedValue string
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					addedValue = chunk.(string)
				},
				IsEmpty: func() bool { return false },
			}

			keyword.GenCSS(nil, output)
			if addedValue != "$#@!" {
				t.Errorf("expected output to receive '$#@!', got '%s'", addedValue)
			}
		})
	})

	t.Run("predefined keywords", func(t *testing.T) {
		t.Run("should have True keyword with value 'true'", func(t *testing.T) {
			if KeywordTrue.value != "true" {
				t.Errorf("expected True keyword value to be 'true', got '%s'", KeywordTrue.value)
			}
		})

		t.Run("should have False keyword with value 'false'", func(t *testing.T) {
			if KeywordFalse.value != "false" {
				t.Errorf("expected False keyword value to be 'false', got '%s'", KeywordFalse.value)
			}
		})

		t.Run("should ensure True and False are unique instances", func(t *testing.T) {
			if KeywordTrue == KeywordFalse {
				t.Error("expected True and False keywords to be different instances")
			}
		})
	})

	t.Run("Node inheritance behavior", func(t *testing.T) {
		keyword := NewKeyword("test")

		t.Run("should maintain Node properties", func(t *testing.T) {
			if keyword.Parent != nil {
				t.Error("expected parent to be nil")
			}
			if keyword.VisibilityBlocks != nil {
				t.Error("expected visibilityBlocks to be nil")
			}
			if keyword.NodeVisible != nil {
				t.Error("expected nodeVisible to be nil")
			}
			if keyword.RootNode != nil {
				t.Error("expected rootNode to be nil")
			}
			if keyword.Parsed != nil {
				t.Error("expected parsed to be nil")
			}
		})
	})
} 