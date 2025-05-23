package go_parser

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

func TestOperationConstructor(t *testing.T) {
	t.Run("should create an operation with trimmed operator", func(t *testing.T) {
		op := NewOperation(" + ", []any{1, 2}, true)
		if op.Op != "+" {
			t.Errorf("Expected op to be '+', got '%s'", op.Op)
		}
		if len(op.Operands) != 2 || op.Operands[0] != 1 || op.Operands[1] != 2 {
			t.Errorf("Expected operands to be [1, 2], got %v", op.Operands)
		}
		if !op.IsSpaced {
			t.Error("Expected isSpaced to be true")
		}
	})

	t.Run("should create an operation without spacing", func(t *testing.T) {
		op := NewOperation("+", []any{1, 2}, false)
		if op.IsSpaced {
			t.Error("Expected isSpaced to be false")
		}
	})
}

func TestOperationEval(t *testing.T) {
	t.Run("should evaluate simple arithmetic operations", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Test addition
		add := NewOperation("+", []any{dim1, dim2}, false)
		result := add.Eval(context).(*Dimension)
		if result.Value != 15 {
			t.Errorf("Expected value to be 15, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", result.Unit.ToString())
		}
		
		// Test subtraction
		sub := NewOperation("-", []any{dim1, dim2}, false)
		resultSub := sub.Eval(context).(*Dimension)
		if resultSub.Value != 5 {
			t.Errorf("Expected value to be 5, got %v", resultSub.Value)
		}
		
		// Test multiplication
		mul := NewOperation("*", []any{dim1, dim2}, false)
		resultMul := mul.Eval(context).(*Dimension)
		if resultMul.Value != 50 {
			t.Errorf("Expected value to be 50, got %v", resultMul.Value)
		}
		
		// Test division
		div := NewOperation("/", []any{dim1, dim2}, false)
		resultDiv := div.Eval(context).(*Dimension)
		if resultDiv.Value != 2 {
			t.Errorf("Expected value to be 2, got %v", resultDiv.Value)
		}
		if resultDiv.Unit.ToString() != "" {
			t.Errorf("Expected unit to be empty, got '%s'", resultDiv.Unit.ToString())
		}
	})
	
	t.Run("should handle color operations", func(t *testing.T) {
		color1 := NewColor([]float64{100, 100, 100}, 1, "")
		color2 := NewColor([]float64{50, 50, 50}, 1, "")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Test addition
		add := NewOperation("+", []any{color1, color2}, false)
		result := add.Eval(context).(*Color)
		
		// Check RGB values
		expectedRGB := []float64{150, 150, 150}
		for i := 0; i < 3; i++ {
			if result.RGB[i] != expectedRGB[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGB[i], result.RGB[i])
			}
		}
		
		// Test subtraction
		sub := NewOperation("-", []any{color1, color2}, false)
		resultSub := sub.Eval(context).(*Color)
		expectedRGBSub := []float64{50, 50, 50}
		for i := 0; i < 3; i++ {
			if resultSub.RGB[i] != expectedRGBSub[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGBSub[i], resultSub.RGB[i])
			}
		}
	})
	
	t.Run("should handle mixed color and dimension operations", func(t *testing.T) {
		color := NewColor([]float64{100, 100, 100}, 1, "")
		dim, _ := NewDimension(50, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Test dimension + color
		add := NewOperation("+", []any{color, dim}, false)
		result := add.Eval(context).(*Color)
		
		// Check RGB values
		expectedRGB := []float64{150, 150, 150}
		for i := 0; i < 3; i++ {
			if result.RGB[i] != expectedRGB[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGB[i], result.RGB[i])
			}
		}
		
		// Test color + dimension
		add2 := NewOperation("+", []any{dim, color}, false)
		result2 := add2.Eval(context).(*Color)
		for i := 0; i < 3; i++ {
			if result2.RGB[i] != expectedRGB[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGB[i], result2.RGB[i])
			}
		}
	})
	
	t.Run("should preserve operation when math is off", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return false },
		}
		
		op := NewOperation("+", []any{dim1, dim2}, false)
		result := op.Eval(context).(*Operation)
		
		if result.Op != "+" {
			t.Errorf("Expected op to be '+', got '%s'", result.Op)
		}
		
		// Check operands
		if result.Operands[0] != dim1 {
			t.Errorf("Expected first operand to be dim1")
		}
		if result.Operands[1] != dim2 {
			t.Errorf("Expected second operand to be dim2")
		}
	})
	
	t.Run("should handle division with parens division context", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
			"math":     less.Math.ParensDivision,
		}
		
		div := NewOperation("/", []any{dim1, dim2}, false)
		result := div.Eval(context).(*Dimension)
		
		if result.Value != 2 {
			t.Errorf("Expected value to be 2, got %v", result.Value)
		}
		if result.Unit.ToString() != "" {
			t.Errorf("Expected unit to be empty, got '%s'", result.Unit.ToString())
		}
	})
	
	t.Run("should throw error for invalid operation types", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic for invalid operation types")
			}
		}()
		
		invalid := &struct{ *Node }{NewNode()}
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		op := NewOperation("+", []any{invalid, invalid}, false)
		op.Eval(context)
	})
	
	t.Run("should handle special ./ operator", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		op := NewOperation("./", []any{dim1, dim2}, false)
		result := op.Eval(context).(*Dimension)
		
		if result.Value != 2 {
			t.Errorf("Expected value to be 2, got %v", result.Value)
		}
	})
}

func TestOperationGenCSS(t *testing.T) {
	t.Run("should generate CSS with spacing", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		op := NewOperation("+", []any{dim1, dim2}, true)
		
		// Create a mock output
		var calls []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk.(string))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		op.GenCSS(nil, output)
		
		// Check the output calls
		expectedCalls := []string{"10", "px", " ", "+", " ", "5", "px"}
		if len(calls) != len(expectedCalls) {
			t.Errorf("Expected %d calls, got %d", len(expectedCalls), len(calls))
		}
		
		for i, call := range calls {
			if i < len(expectedCalls) && call != expectedCalls[i] {
				t.Errorf("Expected call %d to be '%s', got '%s'", i, expectedCalls[i], call)
			}
		}
	})
	
	t.Run("should generate CSS without spacing", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		op := NewOperation("+", []any{dim1, dim2}, false)
		
		// Create a mock output
		var calls []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk.(string))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		op.GenCSS(nil, output)
		
		// Check the output calls
		expectedCalls := []string{"10", "px", "+", "5", "px"}
		if len(calls) != len(expectedCalls) {
			t.Errorf("Expected %d calls, got %d", len(expectedCalls), len(calls))
		}
		
		for i, call := range calls {
			if i < len(expectedCalls) && call != expectedCalls[i] {
				t.Errorf("Expected call %d to be '%s', got '%s'", i, expectedCalls[i], call)
			}
		}
	})
	
	t.Run("should handle complex nested operations", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		dim3, _ := NewDimension(2, "px")
		
		nestedOp := NewOperation("*", []any{dim2, dim3}, false)
		op := NewOperation("+", []any{dim1, nestedOp}, true)
		
		// Create a mock output
		var calls []string
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, chunk.(string))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		op.GenCSS(nil, output)
		
		// Check the output calls
		expectedCalls := []string{"10", "px", " ", "+", " ", "5", "px", "*", "2", "px"}
		if len(calls) != len(expectedCalls) {
			t.Errorf("Expected %d calls, got %d", len(expectedCalls), len(calls))
		}
		
		for i, call := range calls {
			if i < len(expectedCalls) && call != expectedCalls[i] {
				t.Errorf("Expected call %d to be '%s', got '%s'", i, expectedCalls[i], call)
			}
		}
	})
}

func TestOperationAccept(t *testing.T) {
	t.Run("should visit all operands", func(t *testing.T) {
		op := NewOperation("+", []any{1, 2}, false)
		
		visitCalled := false
		visitor := struct {
			VisitArray func([]any) []any
		}{
			VisitArray: func(operands []any) []any {
				visitCalled = true
				if len(operands) != 2 || operands[0] != 1 || operands[1] != 2 {
					t.Errorf("Expected operands to be [1, 2], got %v", operands)
				}
				return operands
			},
		}
		
		op.Accept(visitor)
		
		if !visitCalled {
			t.Error("Expected VisitArray to be called")
		}
	})
} 