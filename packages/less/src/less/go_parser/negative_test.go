package go_parser

import (
	"fmt"
	"testing"
)

func TestNegativeGenCSS(t *testing.T) {
	t.Run("should generate CSS with a minus sign before the value", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		negative := NewNegative(dimension)
		
		// Create mock output
		calls := []string{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, fmt.Sprintf("%v", chunk))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		// Call the function under test
		negative.GenCSS(map[string]any{}, output)
		
		// Verify expectations
		if len(calls) != 3 {
			t.Errorf("Expected 3 calls to output.Add, got %d", len(calls))
		}
		if calls[0] != "-" {
			t.Errorf("Expected first call to add '-', got '%s'", calls[0])
		}
		if calls[1] != "5" {
			t.Errorf("Expected second call to add '5', got '%s'", calls[1])
		}
		if calls[2] != "px" {
			t.Errorf("Expected third call to add 'px', got '%s'", calls[2])
		}
	})
	
	t.Run("should handle non-Dimension nodes", func(t *testing.T) {
		keyword := NewKeyword("red")
		negative := NewNegative(keyword)
		
		// Create mock output
		calls := []string{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, fmt.Sprintf("%v", chunk))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		// Call the function under test
		negative.GenCSS(map[string]any{}, output)
		
		// Verify expectations
		if len(calls) != 2 {
			t.Errorf("Expected 2 calls to output.Add, got %d", len(calls))
		}
		if calls[0] != "-" {
			t.Errorf("Expected first call to add '-', got '%s'", calls[0])
		}
		if calls[1] != "red" {
			t.Errorf("Expected second call to add 'red', got '%s'", calls[1])
		}
	})
	
	t.Run("should handle nested Negative nodes", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		innerNegative := NewNegative(dimension)
		negative := NewNegative(innerNegative)
		
		// Create mock output
		calls := []string{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, fmt.Sprintf("%v", chunk))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		// Call the function under test
		negative.GenCSS(map[string]any{}, output)
		
		// Verify expectations
		if len(calls) != 4 {
			t.Errorf("Expected 4 calls to output.Add, got %d", len(calls))
		}
		if calls[0] != "-" {
			t.Errorf("Expected first call to add '-', got '%s'", calls[0])
		}
		if calls[1] != "-" {
			t.Errorf("Expected second call to add '-', got '%s'", calls[1])
		}
		if calls[2] != "5" {
			t.Errorf("Expected third call to add '5', got '%s'", calls[2])
		}
		if calls[3] != "px" {
			t.Errorf("Expected fourth call to add 'px', got '%s'", calls[3])
		}
	})
	
	t.Run("should handle Operation nodes", func(t *testing.T) {
		dim1, _ := NewDimension(5, "px")
		dim2, _ := NewDimension(10, "px")
		operation := NewOperation("+", []any{dim1, dim2}, false)
		negative := NewNegative(operation)
		
		// Create mock output
		calls := []string{}
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				calls = append(calls, fmt.Sprintf("%v", chunk))
			},
			IsEmpty: func() bool {
				return len(calls) == 0
			},
		}
		
		// Call the function under test
		negative.GenCSS(map[string]any{}, output)
		
		// Verify the minus sign was added
		if len(calls) < 1 || calls[0] != "-" {
			t.Errorf("Expected minus sign to be added, got %v", calls)
		}
	})
	
	t.Run("should handle different unit types", func(t *testing.T) {
		units := []string{"em", "rem", "%", "vh", "vw"}
		
		for _, unit := range units {
			dimension, _ := NewDimension(5, unit)
			negative := NewNegative(dimension)
			
			// Create mock output
			calls := []string{}
			output := &CSSOutput{
				Add: func(chunk any, fileInfo any, index any) {
					calls = append(calls, fmt.Sprintf("%v", chunk))
				},
				IsEmpty: func() bool {
					return len(calls) == 0
				},
			}
			
			// Call the function under test
			negative.GenCSS(map[string]any{}, output)
			
			// Verify expectations
			if len(calls) != 3 {
				t.Errorf("Expected 3 calls for unit %s, got %d", unit, len(calls))
				continue
			}
			if calls[0] != "-" {
				t.Errorf("Expected first call to add '-' for unit %s, got '%s'", unit, calls[0])
			}
			if calls[1] != "5" {
				t.Errorf("Expected second call to add '5' for unit %s, got '%s'", unit, calls[1])
			}
			if calls[2] != unit {
				t.Errorf("Expected third call to add '%s', got '%s'", unit, calls[2])
			}
		}
	})
}

func TestNegativeEval(t *testing.T) {
	t.Run("should return a new Dimension with negative value when math is on", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		negative := NewNegative(dimension)
		
		// Context with math on
		context := map[string]any{
			"isMathOn": func(_ string) bool { return true },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected result to be *Dimension, got %T", result)
		}
		if resultDim.Value != -5 {
			t.Errorf("Expected value to be -5, got %f", resultDim.Value)
		}
		if resultDim.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", resultDim.Unit.ToString())
		}
	})
	
	t.Run("should return a new Negative with evaluated value when math is off", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		negative := NewNegative(dimension)
		
		// Context with math off
		context := map[string]any{
			"isMathOn": func(_ string) bool { return false },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultNeg, ok := result.(*Negative)
		if !ok {
			t.Fatalf("Expected result to be *Negative, got %T", result)
		}
		// In Go we can't expect pointer equality like the JS test,
		// so we check the value is equal to the evaluated dimension
		resultDim, ok := resultNeg.Value.(*Dimension)
		if !ok {
			t.Fatalf("Expected value to be *Dimension, got %T", resultNeg.Value)
		}
		if resultDim.Value != 5 {
			t.Errorf("Expected value to be 5, got %f", resultDim.Value)
		}
	})
	
	t.Run("should handle nested Negative nodes correctly when math is off", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		innerNegative := NewNegative(dimension)
		negative := NewNegative(innerNegative)
		
		// Context with math off
		context := map[string]any{
			"isMathOn": func(_ string) bool { return false },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultNeg, ok := result.(*Negative)
		if !ok {
			t.Fatalf("Expected result to be *Negative, got %T", result)
		}
		
		innerNeg, ok := resultNeg.Value.(*Negative)
		if !ok {
			t.Fatalf("Expected value to be *Negative, got %T", resultNeg.Value)
		}
		
		resultDim, ok := innerNeg.Value.(*Dimension)
		if !ok {
			t.Fatalf("Expected inner value to be *Dimension, got %T", innerNeg.Value)
		}
		
		if resultDim.Value != 5 {
			t.Errorf("Expected value to be 5, got %f", resultDim.Value)
		}
	})
	
	t.Run("should handle nested Negative nodes when math is on", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		innerNegative := NewNegative(dimension)
		negative := NewNegative(innerNegative)
		
		// Context with math on
		context := map[string]any{
			"isMathOn": func(_ string) bool { return true },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected result to be *Dimension, got %T", result)
		}
		
		if resultDim.Value != 5 { // Double negative
			t.Errorf("Expected value to be 5 (double negative), got %f", resultDim.Value)
		}
		
		if resultDim.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", resultDim.Unit.ToString())
		}
	})
	
	t.Run("should handle multiple levels of nesting when math is on", func(t *testing.T) {
		dimension, _ := NewDimension(5, "px")
		level1 := NewNegative(dimension)
		level2 := NewNegative(level1)
		level3 := NewNegative(level2)
		
		// Context with math on
		context := map[string]any{
			"isMathOn": func(_ string) bool { return true },
		}
		
		// Call the function under test
		result := level3.Eval(context)
		
		// Verify expectations
		resultDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected result to be *Dimension, got %T", result)
		}
		
		if resultDim.Value != -5 { // Triple negative
			t.Errorf("Expected value to be -5 (triple negative), got %f", resultDim.Value)
		}
		
		if resultDim.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", resultDim.Unit.ToString())
		}
	})
	
	t.Run("should handle non-Dimension nodes when math is off", func(t *testing.T) {
		keyword := NewKeyword("red")
		negative := NewNegative(keyword)
		
		// Context with math off
		context := map[string]any{
			"isMathOn": func(_ string) bool { return false },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultNeg, ok := result.(*Negative)
		if !ok {
			t.Fatalf("Expected result to be *Negative, got %T", result)
		}
		
		resultKeyword, ok := resultNeg.Value.(*Keyword)
		if !ok {
			t.Fatalf("Expected value to be *Keyword, got %T", resultNeg.Value)
		}
		
		// Check through string representation
		if fmt.Sprintf("%v", resultKeyword.Value) != "red" {
			t.Errorf("Expected keyword value to be 'red', got '%v'", resultKeyword.Value)
		}
	})
	
	t.Run("should handle edge case values", func(t *testing.T) {
		values := []float64{-5, 1e10}
		
		for _, value := range values {
			dimension, _ := NewDimension(value, "px")
			negative := NewNegative(dimension)
			
			// Context with math on
			context := map[string]any{
				"isMathOn": func(_ string) bool { return true },
			}
			
			// Call the function under test
			result := negative.Eval(context)
			
			// Verify expectations
			resultDim, ok := result.(*Dimension)
			if !ok {
				t.Fatalf("Expected result to be *Dimension for value %f, got %T", value, result)
			}
			
			if resultDim.Value != -value {
				t.Errorf("Expected value to be %f, got %f", -value, resultDim.Value)
			}
			
			if resultDim.Unit.ToString() != "px" {
				t.Errorf("Expected unit to be 'px', got '%s'", resultDim.Unit.ToString())
			}
		}
		
		// Special case for zero
		zeroDimension, _ := NewDimension(0, "px")
		zeroNegative := NewNegative(zeroDimension)
		
		// Context with math on
		context := map[string]any{
			"isMathOn": func(_ string) bool { return true },
		}
		
		// Call the function under test
		zeroResult := zeroNegative.Eval(context)
		
		// Verify expectations
		zeroResultDim, ok := zeroResult.(*Dimension)
		if !ok {
			t.Fatalf("Expected result to be *Dimension, got %T", zeroResult)
		}
		
		if zeroResultDim.Value != 0 {
			t.Errorf("Expected value to be 0, got %f", zeroResultDim.Value)
		}
		
		if zeroResultDim.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", zeroResultDim.Unit.ToString())
		}
	})
	
	t.Run("should handle complex nested operations", func(t *testing.T) {
		dim1, _ := NewDimension(5, "px")
		dim2, _ := NewDimension(10, "px")
		operation := NewOperation("+", []any{dim1, dim2}, false)
		negative := NewNegative(operation)
		
		// Context with math on
		context := map[string]any{
			"isMathOn": func(_ string) bool { return true },
		}
		
		// Call the function under test
		result := negative.Eval(context)
		
		// Verify expectations
		resultDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected result to be *Dimension, got %T", result)
		}
		
		if resultDim.Value != -15 { // -(5 + 10)
			t.Errorf("Expected value to be -15, got %f", resultDim.Value)
		}
		
		if resultDim.Unit.ToString() != "px" {
			t.Errorf("Expected unit to be 'px', got '%s'", resultDim.Unit.ToString())
		}
	})
	
	t.Run("should handle nil input safely", func(t *testing.T) {
		negative := NewNegative(nil)
		
		// Context with math off to avoid Operation creation
		context := map[string]any{
			"isMathOn": func(_ string) bool { return false },
		}
		
		// Call the function under test - should return safe default instead of panicking
		result := negative.Eval(context)
		
		// Should return a negative with a zero dimension
		if resultNeg, ok := result.(*Negative); ok {
			if resultDim, ok := resultNeg.Value.(*Dimension); ok {
				if resultDim.Value != 0 {
					t.Errorf("Expected zero dimension value, got %f", resultDim.Value)
				}
			} else {
				t.Errorf("Expected value to be *Dimension, got %T", resultNeg.Value)
			}
		} else {
			t.Errorf("Expected result to be *Negative, got %T", result)
		}
	})
} 