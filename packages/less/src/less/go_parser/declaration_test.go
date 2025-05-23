package go_parser

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

func TestDeclaration(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("creates a basic declaration", func(t *testing.T) {
			decl, err := NewDeclaration("color", "red", nil, false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if decl.name != "color" {
				t.Errorf("expected name to be 'color', got %v", decl.name)
			}
			if _, ok := decl.value.value[0].(*Anonymous); !ok {
				t.Error("expected value to be Anonymous")
			}
			if decl.value.value[0].(*Anonymous).Value != "red" {
				t.Errorf("expected value to be 'red', got %v", decl.value.value[0].(*Anonymous).Value)
			}
			if decl.important != "" {
				t.Errorf("expected important to be empty, got %v", decl.important)
			}
			if decl.merge {
				t.Error("expected merge to be false")
			}
			if decl.inline {
				t.Error("expected inline to be false")
			}
			if decl.variable {
				t.Error("expected variable to be false")
			}
		})

		t.Run("handles variable declarations", func(t *testing.T) {
			decl, err := NewDeclaration("@color", "red", nil, false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !decl.variable {
				t.Error("expected variable to be true")
			}
		})

		t.Run("handles important declarations", func(t *testing.T) {
			decl, err := NewDeclaration("color", "red", "!important", false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if decl.important != " !important" {
				t.Errorf("expected important to be ' !important', got %v", decl.important)
			}
		})

		t.Run("handles inline declarations", func(t *testing.T) {
			decl, err := NewDeclaration("color", "red", nil, false, 0, nil, true, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !decl.inline {
				t.Error("expected inline to be true")
			}
		})

		t.Run("accepts Value instances", func(t *testing.T) {
			anonymousValue := NewAnonymous("blue", 0, nil, false, false, nil)
			value, err := NewValue([]any{anonymousValue})
			if err != nil {
				t.Fatalf("unexpected error creating value: %v", err)
			}
			decl, err := NewDeclaration("color", value, nil, false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if decl.value != value {
				t.Error("expected value to be the provided Value instance")
			}
		})

		t.Run("handles null/undefined values", func(t *testing.T) {
			decl, err := NewDeclaration("color", nil, nil, false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if decl.value.value[0] != nil {
				t.Error("expected value to be nil")
			}
		})

		t.Run("handles array names for interpolation", func(t *testing.T) {
			keyword1 := NewKeyword("border")
			keyword2 := NewKeyword("color")
			decl, err := NewDeclaration([]any{keyword1, keyword2}, "red", nil, false, 0, nil, false, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			nameArr, ok := decl.name.([]any)
			if !ok {
				t.Fatal("expected name to be array")
			}
			if len(nameArr) != 2 {
				t.Fatalf("expected name array length 2, got %d", len(nameArr))
			}
			if nameArr[0] != keyword1 {
				t.Error("expected first name element to be keyword1")
			}
			if nameArr[1] != keyword2 {
				t.Error("expected second name element to be keyword2")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("generates basic CSS output", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", nil, false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": false}, cssOutput)

			expected := []string{"color", ": ", "red", ";"}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("generates compressed CSS output", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", nil, false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": true}, cssOutput)

			expected := []string{"color", ":", "red", ";"}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("generates CSS with important flag", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", "!important", false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": false}, cssOutput)

			expected := []string{"color", ": ", "red", " !important", ";"}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("handles multiple values with commas", func(t *testing.T) {
			value, _ := NewValue([]any{
				NewAnonymous("1px", 0, nil, false, false, nil),
				NewAnonymous("solid", 0, nil, false, false, nil),
				NewAnonymous("black", 0, nil, false, false, nil),
			})
			decl, _ := NewDeclaration("border", value, nil, false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": false}, cssOutput)

			expected := []string{"border", ": ", "1px", ", ", "solid", ", ", "black", ";"}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("handles compressed output with multiple values", func(t *testing.T) {
			value, _ := NewValue([]any{
				NewAnonymous("1px", 0, nil, false, false, nil),
				NewAnonymous("solid", 0, nil, false, false, nil),
				NewAnonymous("black", 0, nil, false, false, nil),
			})
			decl, _ := NewDeclaration("border", value, nil, false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": true}, cssOutput)

			expected := []string{"border", ":", "1px", ",", "solid", ",", "black", ";"}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("omits semicolon for inline declarations", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", nil, false, 0, nil, true, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": false}, cssOutput)

			expected := []string{"color", ": ", "red", ""}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("handles last rule in compressed mode", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", nil, false, 0, nil, false, nil)
			var output []string
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					if chunk != nil {
						output = append(output, chunk.(string))
					}
				},
			}
			decl.GenCSS(map[string]any{"compress": true, "lastRule": true}, cssOutput)

			expected := []string{"color", ":", "red", ""}
			if len(output) != len(expected) {
				t.Fatalf("expected output length %d, got %d", len(expected), len(output))
			}
			for i, v := range expected {
				if output[i] != v {
					t.Errorf("at index %d expected %q, got %q", i, v, output[i])
				}
			}
		})

		t.Run("handles errors in value generation", func(t *testing.T) {
			badValue := &Value{
				value: []any{
					&ErrorGeneratingValue{},
				},
			}
			decl, _ := NewDeclaration("color", badValue, nil, false, 0, map[string]any{"filename": "test.less"}, false, nil)
			cssOutput := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {},
			}

			defer func() {
				if r := recover(); r == nil {
					t.Error("expected panic from error generating value")
				}
			}()
			decl.GenCSS(map[string]any{"compress": false}, cssOutput)
		})
	})

	t.Run("eval", func(t *testing.T) {
		createContext := func() map[string]any {
			return map[string]any{
				"importantScope": []any{},
				"math":          less.Math.ParensDivision,
			}
		}

		t.Run("evaluates simple declarations", func(t *testing.T) {
			anonymous := NewAnonymous("red", 0, map[string]any{"filename": "test.less"}, false, false, nil)
			value, _ := NewValue([]any{anonymous})
			decl, _ := NewDeclaration("color", value, nil, false, 0, map[string]any{"filename": "test.less"}, false, nil)
			
			evaluated, err := decl.Eval(createContext())
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			
			evalDecl, ok := evaluated.(*Declaration)
			if !ok {
				t.Fatal("expected evaluated value to be Declaration")
			}
			if evalDecl.name != "color" {
				t.Errorf("expected name to be 'color', got %v", evalDecl.name)
			}
		})

		t.Run("evaluates interpolated names", func(t *testing.T) {
			keyword1 := NewKeyword("border")
			anonymous := NewAnonymous("-", 0, nil, false, false, nil)
			keyword2 := NewKeyword("color")
			decl, _ := NewDeclaration([]any{keyword1, anonymous, keyword2}, "red", nil, false, 0, nil, false, nil)
			
			evaluated, err := decl.Eval(createContext())
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			
			evalDecl, ok := evaluated.(*Declaration)
			if !ok {
				t.Fatal("expected evaluated value to be Declaration")
			}
			if evalDecl.name != "border-color" {
				t.Errorf("expected name to be 'border-color', got %v", evalDecl.name)
			}
		})

		t.Run("handles font declarations with math context", func(t *testing.T) {
			decl, _ := NewDeclaration("font", "bold", nil, false, 0, nil, false, nil)
			context := createContext()
			context["math"] = less.Math.Always
			
			evaluated, err := decl.Eval(context)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			
			evalDecl, ok := evaluated.(*Declaration)
			if !ok {
				t.Fatal("expected evaluated value to be Declaration")
			}
			if evalDecl.name != "font" {
				t.Errorf("expected name to be 'font', got %v", evalDecl.name)
			}
			if context["math"] != less.Math.Always {
				t.Error("expected math context to be restored")
			}
		})

		t.Run("handles detached ruleset errors", func(t *testing.T) {
			detachedValue := &Value{
				value: []any{
					map[string]any{"type": "DetachedRuleset"},
				},
			}
			decl, _ := NewDeclaration("prop", detachedValue, nil, false, 0, map[string]any{"filename": "test.less"}, false, false)
			
			_, err := decl.Eval(createContext())
			if err == nil {
				t.Error("expected error for detached ruleset")
			}
			if err.Error() != "Rulesets cannot be evaluated on a property" {
				t.Errorf("unexpected error message: %v", err)
			}
		})

		t.Run("handles errors during evaluation", func(t *testing.T) {
			badValue := &Value{
				value: []any{
					&ErrorEvaluatingValue{},
				},
			}
			decl, _ := NewDeclaration("color", badValue, nil, false, 0, map[string]any{"filename": "test.less"}, false, nil)
			
			_, err := decl.Eval(createContext())
			if err == nil {
				t.Error("expected error during evaluation")
			}
			if err.Error() != "eval error" {
				t.Errorf("unexpected error message: %v", err)
			}
		})
	})

	t.Run("makeImportant", func(t *testing.T) {
		t.Run("creates a new declaration with important flag", func(t *testing.T) {
			decl, _ := NewDeclaration("color", "red", nil, false, 0, nil, false, nil)
			important := decl.MakeImportant()

			if important.name != "color" {
				t.Errorf("expected name to be 'color', got %v", important.name)
			}
			if important.value != decl.value {
				t.Error("expected value to be preserved")
			}
			if important.important != " !important" {
				t.Errorf("expected important to be ' !important', got %v", important.important)
			}
		})

		t.Run("preserves other properties", func(t *testing.T) {
			fileInfo := map[string]any{"filename": "test.less"}
			decl, _ := NewDeclaration("color", "red", nil, true, 1, fileInfo, true, nil)
			important := decl.MakeImportant()

			if !important.merge {
				t.Error("expected merge to be preserved")
			}
			if important.GetIndex() != 1 {
				t.Errorf("expected index to be preserved, got %v", important.GetIndex())
			}
			if important.FileInfo()["filename"] != "test.less" {
				t.Error("expected fileInfo to be preserved")
			}
			if !important.inline {
				t.Error("expected inline to be preserved")
			}
		})
	})
}

// Helper types for error testing
type ErrorGeneratingValue struct{}

func (e *ErrorGeneratingValue) GenCSS(context any, output *CSSOutput) {
	panic("Test error")
}

type ErrorEvaluatingValue struct{}

func (e *ErrorEvaluatingValue) Eval(context any) (any, error) {
	return nil, &Error{Message: "eval error"}
} 