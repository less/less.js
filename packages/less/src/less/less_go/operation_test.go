package less_go

import (
	"testing"

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
		resultAny, err := add.Eval(context)
		if err != nil {
			t.Fatalf("Addition eval failed: %v", err)
		}
		result := resultAny.(*Dimension)
		if result.Value != 15 {
			t.Errorf("Expected value to be 15, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", result.Unit.ToString())
		}
		
		// Test subtraction
		sub := NewOperation("-", []any{dim1, dim2}, false)
		resultSubAny, err := sub.Eval(context)
		if err != nil {
			t.Fatalf("Subtraction eval failed: %v", err)
		}
		resultSub := resultSubAny.(*Dimension)
		if resultSub.Value != 5 {
			t.Errorf("Expected value to be 5, got %v", resultSub.Value)
		}
		
		// Test multiplication
		mul := NewOperation("*", []any{dim1, dim2}, false)
		resultMulAny, err := mul.Eval(context)
		if err != nil {
			t.Fatalf("Multiplication eval failed: %v", err)
		}
		resultMul := resultMulAny.(*Dimension)
		if resultMul.Value != 50 {
			t.Errorf("Expected value to be 50, got %v", resultMul.Value)
		}
		
		// Test division
		div := NewOperation("/", []any{dim1, dim2}, false)
		resultDivAny, err := div.Eval(context)
		if err != nil {
			t.Fatalf("Division eval failed: %v", err)
		}
		resultDiv := resultDivAny.(*Dimension)
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
		resultAny, err := add.Eval(context)
		if err != nil {
			t.Fatalf("Color addition eval failed: %v", err)
		}
		result := resultAny.(*Color)
		
		// Check RGB values
		expectedRGB := []float64{150, 150, 150}
		for i := 0; i < 3; i++ {
			if result.RGB[i] != expectedRGB[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGB[i], result.RGB[i])
			}
		}
		
		// Test subtraction
		sub := NewOperation("-", []any{color1, color2}, false)
		resultSubAny, err := sub.Eval(context)
		if err != nil {
			t.Fatalf("Color subtraction eval failed: %v", err)
		}
		resultSub := resultSubAny.(*Color)
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
		resultAny, err := add.Eval(context)
		if err != nil {
			t.Fatalf("Color addition eval failed: %v", err)
		}
		result := resultAny.(*Color)
		
		// Check RGB values
		expectedRGB := []float64{150, 150, 150}
		for i := 0; i < 3; i++ {
			if result.RGB[i] != expectedRGB[i] {
				t.Errorf("Expected RGB[%d] to be %v, got %v", i, expectedRGB[i], result.RGB[i])
			}
		}
		
		// Test color + dimension
		add2 := NewOperation("+", []any{dim, color}, false)
		result2Any, err := add2.Eval(context)
		if err != nil {
			t.Fatalf("Color addition 2 eval failed: %v", err)
		}
		result2 := result2Any.(*Color)
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
		resultAny, err := op.Eval(context)
		if err != nil {
			t.Fatalf("Operation eval failed: %v", err)
		}
		result := resultAny.(*Operation)
		
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
			"math":     Math.ParensDivision,
		}
		
		div := NewOperation("/", []any{dim1, dim2}, false)
		resultAny, err := div.Eval(context)
		if err != nil {
			t.Fatalf("Division eval failed: %v", err)
		}
		result := resultAny.(*Dimension)
		
		if result.Value != 2 {
			t.Errorf("Expected value to be 2, got %v", result.Value)
		}
		if result.Unit.ToString() != "" {
			t.Errorf("Expected unit to be empty, got '%s'", result.Unit.ToString())
		}
	})
	
	t.Run("should return error for invalid operation types", func(t *testing.T) {
		invalid := &struct{ *Node }{NewNode()}
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		op := NewOperation("+", []any{invalid, invalid}, false)
		_, err := op.Eval(context)
		if err == nil {
			t.Error("Expected error but got none")
		}
		
		lessErr, ok := err.(*LessError)
		if !ok {
			t.Error("Expected LessError type")
		}
		if lessErr.Type != "Operation" {
			t.Errorf("Expected error type 'Operation', got '%s'", lessErr.Type)
		}
		if lessErr.Message != "Operation on an invalid type" {
			t.Errorf("Expected error message 'Operation on an invalid type', got '%s'", lessErr.Message)
		}
	})
	
	t.Run("should handle special ./ operator", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(5, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		op := NewOperation("./", []any{dim1, dim2}, false)
		resultAny, err := op.Eval(context)
		if err != nil {
			t.Fatalf("Special operator eval failed: %v", err)
		}
		result := resultAny.(*Dimension)
		
		if result.Value != 2 {
			t.Errorf("Expected value to be 2, got %v", result.Value)
		}
	})
	
	t.Run("should return error for division by zero", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(0, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Test regular division
		op := NewOperation("/", []any{dim1, dim2}, false)
		_, err := op.Eval(context)
		if err == nil {
			t.Error("Expected error for division by zero")
		}
		
		lessErr, ok := err.(*LessError)
		if !ok {
			t.Error("Expected LessError type")
		}
		if lessErr.Type != "Operation" {
			t.Errorf("Expected error type 'Operation', got '%s'", lessErr.Type)
		}
		if lessErr.Message != "Division by zero" {
			t.Errorf("Expected error message 'Division by zero', got '%s'", lessErr.Message)
		}
		
		// Test special ./ operator
		op2 := NewOperation("./", []any{dim1, dim2}, false)
		_, err2 := op2.Eval(context)
		if err2 == nil {
			t.Error("Expected error for division by zero with ./ operator")
		}
	})
	
	t.Run("should return error for null operands", func(t *testing.T) {
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Test nil first operand
		op1 := NewOperation("+", []any{nil, 5}, false)
		_, err1 := op1.Eval(context)
		if err1 == nil {
			t.Error("Expected error for nil first operand")
		}
		
		// Test nil second operand
		op2 := NewOperation("+", []any{5, nil}, false)
		_, err2 := op2.Eval(context)
		if err2 == nil {
			t.Error("Expected error for nil second operand")
		}
		
		// Test both nil
		op3 := NewOperation("+", []any{nil, nil}, false)
		_, err3 := op3.Eval(context)
		if err3 == nil {
			t.Error("Expected error for both nil operands")
		}
		
		// Test empty operands array
		op4 := NewOperation("+", []any{}, false)
		_, err4 := op4.Eval(context)
		if err4 == nil {
			t.Error("Expected error for empty operands array")
		}
		
		// Test single operand
		op5 := NewOperation("+", []any{5}, false)
		_, err5 := op5.Eval(context)
		if err5 == nil {
			t.Error("Expected error for single operand")
		}
	})
	
	t.Run("should handle mixed operations with division", func(t *testing.T) {
		dim1, _ := NewDimension(10, "px")
		dim2, _ := NewDimension(2, "px")
		dim3, _ := NewDimension(0, "px")
		
		context := map[string]any{
			"isMathOn": func(string) bool { return true },
		}
		
		// Create nested operation: 10px + (2px / 0px)
		divOp := NewOperation("/", []any{dim2, dim3}, false)
		addOp := NewOperation("+", []any{dim1, divOp}, false)
		
		// The inner division operation should fail when evaluated,
		// so the outer operation should also fail
		_, err := addOp.Eval(context)
		if err == nil {
			t.Error("Expected error for nested division by zero")
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