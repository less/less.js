package parser

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less/go_parser"
)

func TestDeclarationCall(t *testing.T) {
	t.Run("should parse basic declaration calls", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(display: grid)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
			if len(call.Args) != 1 {
				t.Errorf("Expected 1 argument, got %d", len(call.Args))
			}
			
			// Check that the argument is a Declaration
			if decl, ok := call.Args[0].(*go_parser.Declaration); ok {
				// Check that it's an inline declaration
				// Note: We can't access private fields, but we can verify the declaration was created
				_ = decl
			} else {
				t.Errorf("Expected argument to be *Declaration, got %T", call.Args[0])
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should parse declaration calls with complex values", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(transform: rotate(45deg))", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
			if len(call.Args) != 1 {
				t.Errorf("Expected 1 argument, got %d", len(call.Args))
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should parse declaration calls with variable values", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(display: @my-display)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
			if len(call.Args) != 1 {
				t.Errorf("Expected 1 argument, got %d", len(call.Args))
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should parse declaration calls with hyphenated properties", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(background-color: red)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should parse declaration calls with custom properties", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(--custom-property: value)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should handle function names with numbers", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("test123(color: blue)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "test123" {
				t.Errorf("Expected function name to be 'test123', got %s", call.Name)
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should return nil for non-function input", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("not-a-function", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result != nil {
			t.Error("Expected nil for non-function input")
		}
	})

	t.Run("should return nil for function without parentheses", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result != nil {
			t.Error("Expected nil for function name without parentheses")
		}
	})

	t.Run("should return nil when rule property is not found", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(invalid syntax here)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result != nil {
			t.Error("Expected nil when rule property cannot be parsed")
		}
	})

	t.Run("should return nil for missing closing parenthesis", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(display: grid", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result != nil {
			t.Error("Expected nil for missing closing parenthesis")
		}
	})

	t.Run("should handle empty function call", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports()", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed even for empty function call")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "supports" {
				t.Errorf("Expected function name to be 'supports', got %s", call.Name)
			}
			if len(call.Args) != 0 {
				t.Errorf("Expected 0 arguments for empty function call, got %d", len(call.Args))
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should preserve function name case", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("SUPPORTS(display: grid)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "SUPPORTS" {
				t.Errorf("Expected function name to be 'SUPPORTS', got %s", call.Name)
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should handle function names with underscores", func(t *testing.T) {
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("test_function(color: red)", false, nil)
		
		result := parser.parsers.entities.DeclarationCall()
		if result == nil {
			t.Error("Expected declaration call to be parsed")
		}
		
		if call, ok := result.(*go_parser.Call); ok {
			if call.Name != "test_function" {
				t.Errorf("Expected function name to be 'test_function', got %s", call.Name)
			}
		} else {
			t.Errorf("Expected result to be *Call, got %T", result)
		}
	})

	t.Run("should work in media feature context", func(t *testing.T) {
		// Test that DeclarationCall works when called from MediaFeature
		context := map[string]any{}
		imports := map[string]any{}
		fileInfo := map[string]any{"filename": "test.less"}
		parser := NewParser(context, imports, fileInfo, 0)

		parser.parserInput.Start("supports(display: grid)", false, nil)
		
		result := parser.parsers.MediaFeature(nil)
		if result == nil {
			t.Error("Expected media feature to be parsed")
		}
		
		if expr, ok := result.(*go_parser.Expression); ok {
			if len(expr.Value) == 0 {
				t.Error("Expected expression to have values")
			}
			
			// The first value should be our DeclarationCall result
			if call, ok := expr.Value[0].(*go_parser.Call); ok {
				if call.Name != "supports" {
					t.Errorf("Expected function name to be 'supports', got %s", call.Name)
				}
			} else {
				t.Errorf("Expected first value to be *Call, got %T", expr.Value[0])
			}
		} else {
			t.Errorf("Expected result to be *Expression, got %T", result)
		}
	})
} 