package less_go

import (
	"math"
	"testing"
)

func TestMathHelper(t *testing.T) {
	t.Run("argument validation", func(t *testing.T) {
		fn := func(x float64) float64 { return x * 2 }

		t.Run("should return error for non-Dimension argument", func(t *testing.T) {
			testCases := []any{"not-a-dimension", 42, nil, map[string]any{}}
			
			for _, testCase := range testCases {
				_, err := MathHelper(fn, nil, testCase)
				if err == nil {
					t.Errorf("Expected error for input %v, but got none", testCase)
				}
				
				if mathErr, ok := err.(*MathHelperError); ok {
					if mathErr.Type != "Argument" || mathErr.Message != "argument must be a number" {
						t.Errorf("Expected specific error message, got: %v", err)
					}
				} else {
					t.Errorf("Expected MathHelperError, got: %T", err)
				}
			}
		})

		t.Run("should accept valid Dimension argument", func(t *testing.T) {
			dim, _ := NewDimension(5.0, nil)
			_, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Errorf("Expected no error for valid Dimension, got: %v", err)
			}
		})
	})

	t.Run("unit handling", func(t *testing.T) {
		fn := func(x float64) float64 { return x * 2 }

		t.Run("should use dimension unit when unit parameter is nil", func(t *testing.T) {
			unit := NewUnit([]string{"px"}, nil, "px")
			dim, _ := NewDimension(5.0, unit)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Unit != unit {
				t.Errorf("Expected same unit, got different")
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %f", result.Value)
			}
		})

		t.Run("should use provided unit when unit parameter is specified", func(t *testing.T) {
			originalUnit := NewUnit([]string{"px"}, nil, "px")
			newUnit := NewUnit([]string{"em"}, nil, "em")
			dim, _ := NewDimension(5.0, originalUnit)
			
			result, err := MathHelper(fn, newUnit, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Unit != newUnit {
				t.Errorf("Expected new unit, got original unit")
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %f", result.Value)
			}
		})

		t.Run("should handle unitless dimensions", func(t *testing.T) {
			dim, _ := NewDimension(4.0, nil)
			
			result, err := MathHelper(func(x float64) float64 { return x * 3 }, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 12 {
				t.Errorf("Expected value 12, got %f", result.Value)
			}
		})
	})

	t.Run("mathematical operations", func(t *testing.T) {
		t.Run("should apply simple multiplication function", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			dim, _ := NewDimension(5.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %f", result.Value)
			}
		})

		t.Run("should apply simple addition function", func(t *testing.T) {
			fn := func(x float64) float64 { return x + 10 }
			dim, _ := NewDimension(5.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 15 {
				t.Errorf("Expected value 15, got %f", result.Value)
			}
		})

		t.Run("should apply division function", func(t *testing.T) {
			fn := func(x float64) float64 { return x / 2 }
			dim, _ := NewDimension(10.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 5 {
				t.Errorf("Expected value 5, got %f", result.Value)
			}
		})

		t.Run("should apply subtraction function", func(t *testing.T) {
			fn := func(x float64) float64 { return x - 3 }
			dim, _ := NewDimension(8.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 5 {
				t.Errorf("Expected value 5, got %f", result.Value)
			}
		})

		t.Run("should apply power function", func(t *testing.T) {
			fn := func(x float64) float64 { return math.Pow(x, 2) }
			dim, _ := NewDimension(4.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 16 {
				t.Errorf("Expected value 16, got %f", result.Value)
			}
		})

		t.Run("should apply square root function", func(t *testing.T) {
			fn := func(x float64) float64 { return math.Sqrt(x) }
			dim, _ := NewDimension(16.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 4 {
				t.Errorf("Expected value 4, got %f", result.Value)
			}
		})

		t.Run("should apply trigonometric functions", func(t *testing.T) {
			fn := func(x float64) float64 { return math.Sin(x) }
			dim, _ := NewDimension(math.Pi/2, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-1.0) > 1e-10 {
				t.Errorf("Expected value close to 1, got %f", result.Value)
			}
		})

		t.Run("should handle negative numbers", func(t *testing.T) {
			fn := func(x float64) float64 { return math.Abs(x) }
			dim, _ := NewDimension(-5.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 5 {
				t.Errorf("Expected value 5, got %f", result.Value)
			}
		})

		t.Run("should handle decimal numbers", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			dim, _ := NewDimension(3.14, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-6.28) > 1e-10 {
				t.Errorf("Expected value close to 6.28, got %f", result.Value)
			}
		})

		t.Run("should handle zero values", func(t *testing.T) {
			fn := func(x float64) float64 { return x + 1 }
			dim, _ := NewDimension(0.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 1 {
				t.Errorf("Expected value 1, got %f", result.Value)
			}
		})

		t.Run("should handle very large numbers", func(t *testing.T) {
			fn := func(x float64) float64 { return x / 1000000 }
			dim, _ := NewDimension(1000000000.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 1000 {
				t.Errorf("Expected value 1000, got %f", result.Value)
			}
		})

		t.Run("should handle very small numbers", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 1000 }
			dim, _ := NewDimension(0.001, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 1 {
				t.Errorf("Expected value 1, got %f", result.Value)
			}
		})
	})

	t.Run("return value properties", func(t *testing.T) {
		t.Run("should return a Dimension instance", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			dim, _ := NewDimension(5.0, nil)
			
			_, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			// MathHelper returns *Dimension by design, no need for additional checks
		})

		t.Run("should preserve unit when no unit conversion", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			unit := NewUnit([]string{"px"}, nil, "px")
			dim, _ := NewDimension(5.0, unit)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Unit != unit {
				t.Errorf("Expected same unit object, got different")
			}
		})

		t.Run("should use specified unit when provided", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			originalUnit := NewUnit([]string{"px"}, nil, "px")
			newUnit := NewUnit([]string{"em"}, nil, "em")
			dim, _ := NewDimension(5.0, originalUnit)
			
			result, err := MathHelper(fn, newUnit, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Unit != newUnit {
				t.Errorf("Expected new unit, got %v", result.Unit)
			}
		})
	})

	t.Run("complex scenarios", func(t *testing.T) {
		t.Run("should handle chained mathematical operations", func(t *testing.T) {
			fn1 := func(x float64) float64 { return x * 2 }
			fn2 := func(x float64) float64 { return x + 5 }
			dim, _ := NewDimension(3.0, nil)
			
			result1, err := MathHelper(fn1, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error in first operation: %v", err)
			}
			
			result2, err := MathHelper(fn2, nil, result1)
			if err != nil {
				t.Fatalf("Unexpected error in second operation: %v", err)
			}
			
			if result2.Value != 11 { // (3 * 2) + 5 = 11
				t.Errorf("Expected value 11, got %f", result2.Value)
			}
		})

		t.Run("should work with complex units", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			unit := NewUnit([]string{"px", "em"}, []string{"s"}, "px*em/s")
			dim, _ := NewDimension(5.0, unit)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %f", result.Value)
			}
			if result.Unit != unit {
				t.Errorf("Expected same complex unit, got different")
			}
		})

		t.Run("should handle function that returns NaN", func(t *testing.T) {
			fn := func(x float64) float64 { return math.Sqrt(-x) } // Will return NaN for positive x
			dim, _ := NewDimension(5.0, nil)
			
			_, err := MathHelper(fn, nil, dim)
			
			// This should error because NewDimension rejects NaN values
			if err == nil {
				t.Error("Expected error for NaN result, but got none")
			}
		})

		t.Run("should handle function that returns Infinity", func(t *testing.T) {
			fn := func(x float64) float64 { return 1.0 / x }
			dim, _ := NewDimension(0.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if !math.IsInf(result.Value, 1) {
				t.Errorf("Expected +Inf, got %f", result.Value)
			}
		})

		t.Run("should handle function that returns negative Infinity", func(t *testing.T) {
			fn := func(x float64) float64 { return -1.0 / x }
			dim, _ := NewDimension(0.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if !math.IsInf(result.Value, -1) {
				t.Errorf("Expected -Inf, got %f", result.Value)
			}
		})
	})

	t.Run("edge cases and error conditions", func(t *testing.T) {
		t.Run("should handle empty function (identity)", func(t *testing.T) {
			fn := func(x float64) float64 { return x }
			dim, _ := NewDimension(42.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 42 {
				t.Errorf("Expected value 42, got %f", result.Value)
			}
		})

		t.Run("should handle function that ignores input", func(t *testing.T) {
			fn := func(x float64) float64 { return 100 }
			dim, _ := NewDimension(42.0, nil)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 100 {
				t.Errorf("Expected value 100, got %f", result.Value)
			}
		})
	})

	t.Run("unify behavior", func(t *testing.T) {
		t.Run("should call Unify when unit is provided", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			originalUnit := NewUnit([]string{"px"}, nil, "px")
			newUnit := NewUnit([]string{"em"}, nil, "em")
			dim, _ := NewDimension(5.0, originalUnit)
			
			result, err := MathHelper(fn, newUnit, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			// After unify, the value should be the same (since we don't have real conversion)
			// but the final unit should be the provided unit
			if result.Value != 10 { // 5 * 2 (unify doesn't change value in this simple case)
				t.Errorf("Expected value 10, got %f", result.Value)
			}
			if result.Unit != newUnit {
				t.Errorf("Expected new unit, got %v", result.Unit)
			}
		})

		t.Run("should not call Unify when unit is nil", func(t *testing.T) {
			fn := func(x float64) float64 { return x * 2 }
			unit := NewUnit([]string{"px"}, nil, "px")
			dim, _ := NewDimension(5.0, unit)
			
			result, err := MathHelper(fn, nil, dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			// Should use original unit without calling Unify
			if result.Unit != unit {
				t.Errorf("Expected original unit, got different")
			}
		})
	})
}