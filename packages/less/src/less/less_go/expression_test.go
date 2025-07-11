package less_go

import (
	"fmt"
	"reflect"
	"testing"
)

// createTestContext creates a basic context for testing
func createTestContext(mathOn bool) map[string]any {
	inParenCount := 0
	outParenCount := 0
	return map[string]any{
		"isMathOn": mathOn,
		"inParenthesis": func() {
			inParenCount++
		},
		"outOfParenthesis": func() {
			outParenCount++
		},
		"inCalc": false,
	}
}

func TestNewExpression(t *testing.T) {
	t.Run("should throw error when constructed without value array", func(t *testing.T) {
		_, err := NewExpression(nil, false)
		if err == nil {
			t.Error("Expected error for nil value array")
		}
		if err.Error() != "Expression requires an array parameter" {
			t.Errorf("Expected error message 'Expression requires an array parameter', got '%s'", err.Error())
		}
	})

	t.Run("should accept empty array", func(t *testing.T) {
		expr, err := NewExpression([]any{}, false)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if len(expr.Value) != 0 {
			t.Error("Expected empty value array")
		}
	})

	t.Run("should store value and noSpacing properties", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		value := []any{anon}
		expr, err := NewExpression(value, true)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if !reflect.DeepEqual(expr.Value, value) {
			t.Error("Expected value to be stored")
		}
		if !expr.NoSpacing {
			t.Error("Expected noSpacing to be true")
		}
	})
}

func TestExpressionEval(t *testing.T) {
	t.Run("should return same expression when empty", func(t *testing.T) {
		expr, _ := NewExpression([]any{}, false)
		result := expr.Eval(createTestContext(false))
		if result != expr {
			t.Error("Expected same expression to be returned")
		}
	})

	t.Run("should eval single value without parens", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon}, false)
		result := expr.Eval(createTestContext(false))
		if anonResult, ok := result.(*Anonymous); !ok {
			t.Errorf("Expected result to be *Anonymous, got %T", result)
		} else if anonResult.Value != "test" {
			t.Error("Expected evaluated value to be 'test'")
		}
	})

	t.Run("should wrap result in Paren when has parens and parensInOp", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon}, false)
		expr.Node.Parens = true
		expr.Node.ParensInOp = true
		result := expr.Eval(createTestContext(false))
		if _, ok := result.(*Paren); !ok {
			t.Error("Expected result to be wrapped in Paren")
		}
	})

	t.Run("should not wrap result in Paren when math mode is on", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon}, false)
		expr.Node.Parens = true
		expr.Node.ParensInOp = true
		result := expr.Eval(createTestContext(true))
		if _, ok := result.(*Paren); ok {
			t.Error("Expected result not to be wrapped in Paren")
		}
	})

	t.Run("should not wrap Dimension in Paren even with parens and parensInOp", func(t *testing.T) {
		dim, _ := NewDimension(5, "px")
		expr, _ := NewExpression([]any{dim}, false)
		expr.Node.Parens = true
		expr.Node.ParensInOp = true
		result := expr.Eval(createTestContext(false))
		if _, ok := result.(*Paren); ok {
			t.Error("Expected Dimension not to be wrapped in Paren")
		}
	})
}

func TestExpressionGenCSS(t *testing.T) {
	t.Run("should generate CSS for empty expression", func(t *testing.T) {
		expr, _ := NewExpression([]any{}, false)
		calls := []any{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk)
			},
		}
		expr.GenCSS(nil, output)
		if len(calls) != 0 {
			t.Error("Expected no CSS output for empty expression")
		}
	})

	t.Run("should generate CSS for single value", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon}, false)
		calls := []any{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk)
			},
		}
		expr.GenCSS(nil, output)
		if len(calls) != 1 || calls[0] != "test" {
			t.Error("Expected single value CSS output")
		}
	})

	t.Run("should add spaces between values when noSpacing is false", func(t *testing.T) {
		anon1 := NewAnonymous("test1", 0, nil, false, false, nil)
		anon2 := NewAnonymous("test2", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon1, anon2}, false)
		calls := []any{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk)
			},
		}
		expr.GenCSS(nil, output)
		if len(calls) != 3 || calls[0] != "test1" || calls[1] != " " || calls[2] != "test2" {
			t.Error("Expected space between values")
		}
	})

	t.Run("should not add spaces when noSpacing is true", func(t *testing.T) {
		anon1 := NewAnonymous("test1", 0, nil, false, false, nil)
		anon2 := NewAnonymous("test2", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon1, anon2}, true)
		calls := []any{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk)
			},
		}
		expr.GenCSS(nil, output)
		if len(calls) != 2 || calls[0] != "test1" || calls[1] != "test2" {
			t.Error("Expected no space between values")
		}
	})
}

func TestExpressionThrowAwayComments(t *testing.T) {
	t.Run("should remove all Comment nodes", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		comment := NewComment("/* comment */", false, 0, nil)
		expr, _ := NewExpression([]any{anon, comment}, false)
		expr.ThrowAwayComments()
		if len(expr.Value) != 1 {
			t.Error("Expected comments to be removed")
		}
		if _, ok := expr.Value[0].(*Anonymous); !ok {
			t.Error("Expected non-comment node to be preserved")
		}
	})

	t.Run("should preserve non-Comment nodes", func(t *testing.T) {
		anon1 := NewAnonymous("test1", 0, nil, false, false, nil)
		anon2 := NewAnonymous("test2", 0, nil, false, false, nil)
		comment := NewComment("/* comment */", false, 0, nil)
		expr, _ := NewExpression([]any{anon1, comment, anon2}, false)
		expr.ThrowAwayComments()
		if len(expr.Value) != 2 {
			t.Error("Expected only comments to be removed")
		}
	})
}

func TestExpressionParenthesisContext(t *testing.T) {
	t.Run("should track parenthesis context correctly", func(t *testing.T) {
		inParenCount := 0
		outParenCount := 0
		context := map[string]any{
			"isMathOn": false,
			"inParenthesis": func() { inParenCount++ },
			"outOfParenthesis": func() { outParenCount++ },
			"inCalc": false,
		}
		
		dim, _ := NewDimension(5, "px")
		expr, _ := NewExpression([]any{dim}, false)
		expr.Node.Parens = true
		
		expr.Eval(context)
		
		if inParenCount != 1 {
			t.Error("Expected inParenthesis to be called once")
		}
		if outParenCount != 1 {
			t.Error("Expected outOfParenthesis to be called once")
		}
	})

	t.Run("should handle double paren case in calc context", func(t *testing.T) {
		context := map[string]any{
			"isMathOn": false,
			"inCalc": true,
		}

		// Create inner expression with parens
		innerAnon := NewAnonymous("test", 0, nil, false, false, nil)
		innerExpr, _ := NewExpression([]any{innerAnon}, false)
		innerExpr.Node.Parens = true
		innerExpr.Node.ParensInOp = false

		// Create outer expression containing inner expression
		expr, _ := NewExpression([]any{innerExpr}, false)
		result := expr.Eval(context)

		// In calc context, should evaluate to the inner anonymous value
		if anon, ok := result.(*Anonymous); !ok || anon.Value != "test" {
			t.Errorf("Expected result to be Anonymous with value 'test', got %T", result)
		}
	})

	t.Run("should handle nested expressions with mathOn=true", func(t *testing.T) {
		context := map[string]any{
			"isMathOn": true,
			"inCalc": false,
		}

		innerAnon := NewAnonymous("test", 0, nil, false, false, nil)
		innerExpr, _ := NewExpression([]any{innerAnon}, false)
		innerExpr.Node.Parens = true
		innerExpr.Node.ParensInOp = true

		expr, _ := NewExpression([]any{innerExpr}, false)
		result := expr.Eval(context)

		// With mathOn=true, should evaluate to the inner anonymous value without Paren wrapping
		if anon, ok := result.(*Anonymous); !ok || anon.Value != "test" {
			t.Errorf("Expected result to be Anonymous with value 'test', got %T", result)
		}
	})
}

type expressionTestVisitor struct {
	visitCount int
}

func (v *expressionTestVisitor) Visit(node any) any {
	v.visitCount++
	if anon, ok := node.(*Anonymous); ok {
		return NewAnonymous("visited_" + fmt.Sprintf("%v", anon.Value), 0, nil, false, false, nil)
	}
	return node
}

func (v *expressionTestVisitor) VisitArray(nodes []any) []any {
	result := make([]any, len(nodes))
	for i, node := range nodes {
		result[i] = v.Visit(node)
	}
	return result
}

func TestExpressionAccept(t *testing.T) {
	t.Run("should visit all values in array", func(t *testing.T) {
		visitor := &expressionTestVisitor{}
		anon1 := NewAnonymous("test1", 0, nil, false, false, nil)
		anon2 := NewAnonymous("test2", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon1, anon2}, false)
		
		expr.Accept(visitor)
		
		if visitor.visitCount != 2 {
			t.Errorf("Expected visitor to be called 2 times, got %d", visitor.visitCount)
		}
		
		if expr.Value[0].(*Anonymous).Value != "visited_test1" {
			t.Error("Expected first value to be transformed")
		}
		if expr.Value[1].(*Anonymous).Value != "visited_test2" {
			t.Error("Expected second value to be transformed")
		}
	})

	t.Run("should handle nil visitor", func(t *testing.T) {
		anon := NewAnonymous("test", 0, nil, false, false, nil)
		expr, _ := NewExpression([]any{anon}, false)
		
		// Should not panic
		expr.Accept(nil)
		
		// Values should remain unchanged
		if expr.Value[0].(*Anonymous).Value != "test" {
			t.Error("Expected value to remain unchanged with nil visitor")
		}
	})
} 