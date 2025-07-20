package less_go

import (
	"math"
	"testing"
)

func TestCeil(t *testing.T) {
	t.Run("should round up to nearest integer", func(t *testing.T) {
		dim, _ := NewDimension(3.2, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should work with negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-3.8, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != -3 {
			t.Errorf("Expected -3, got %f", result.Value)
		}
	})

	t.Run("should preserve units", func(t *testing.T) {
		unit := NewUnit([]string{"px"}, nil, "px")
		dim, _ := NewDimension(3.2, unit)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle integers (no change)", func(t *testing.T) {
		dim, _ := NewDimension(5.0, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 5 {
			t.Errorf("Expected 5, got %f", result.Value)
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0.0, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle very small positive numbers", func(t *testing.T) {
		dim, _ := NewDimension(0.001, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should handle very small negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-0.001, nil)
		result, err := Ceil(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})
}

func TestFloor(t *testing.T) {
	t.Run("should round down to nearest integer", func(t *testing.T) {
		dim, _ := NewDimension(3.8, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3 {
			t.Errorf("Expected 3, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should work with negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-3.2, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != -4 {
			t.Errorf("Expected -4, got %f", result.Value)
		}
	})

	t.Run("should preserve units", func(t *testing.T) {
		unit := NewUnit([]string{"em"}, nil, "em")
		dim, _ := NewDimension(3.8, unit)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3 {
			t.Errorf("Expected 3, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle integers (no change)", func(t *testing.T) {
		dim, _ := NewDimension(5.0, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 5 {
			t.Errorf("Expected 5, got %f", result.Value)
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0.0, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle very small positive numbers", func(t *testing.T) {
		dim, _ := NewDimension(0.999, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle very small negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-0.001, nil)
		result, err := Floor(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != -1 {
			t.Errorf("Expected -1, got %f", result.Value)
		}
	})
}

func TestSqrt(t *testing.T) {
	t.Run("should calculate square root", func(t *testing.T) {
		dim, _ := NewDimension(16.0, nil)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle perfect squares", func(t *testing.T) {
		testCases := []struct {
			input    float64
			expected float64
		}{
			{1, 1},
			{4, 2},
			{9, 3},
			{25, 5},
			{100, 10},
		}

		for _, tc := range testCases {
			dim, _ := NewDimension(tc.input, nil)
			result, err := Sqrt(dim)
			if err != nil {
				t.Fatalf("Unexpected error for input %f: %v", tc.input, err)
			}
			if result.Value != tc.expected {
				t.Errorf("For input %f, expected %f, got %f", tc.input, tc.expected, result.Value)
			}
		}
	})

	t.Run("should handle non-perfect squares", func(t *testing.T) {
		dim, _ := NewDimension(2.0, nil)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		expected := math.Sqrt(2)
		if math.Abs(result.Value-expected) > 1e-10 {
			t.Errorf("Expected %f, got %f", expected, result.Value)
		}
	})

	t.Run("should preserve units", func(t *testing.T) {
		unit := NewUnit([]string{"px"}, nil, "px")
		dim, _ := NewDimension(16.0, unit)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0.0, nil)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle very large numbers", func(t *testing.T) {
		dim, _ := NewDimension(1000000.0, nil)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 1000 {
			t.Errorf("Expected 1000, got %f", result.Value)
		}
	})

	t.Run("should handle decimals", func(t *testing.T) {
		dim, _ := NewDimension(6.25, nil)
		result, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 2.5 {
			t.Errorf("Expected 2.5, got %f", result.Value)
		}
	})

	t.Run("should return error for negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-4.0, nil)
		
		_, err := Sqrt(dim)
		if err == nil {
			t.Error("Expected error for negative input, got none")
		}
	})
}

func TestAbs(t *testing.T) {
	t.Run("should return absolute value of positive numbers", func(t *testing.T) {
		dim, _ := NewDimension(5.0, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 5 {
			t.Errorf("Expected 5, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should return absolute value of negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-5.0, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 5 {
			t.Errorf("Expected 5, got %f", result.Value)
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0.0, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should preserve units", func(t *testing.T) {
		unit := NewUnit([]string{"rem"}, nil, "rem")
		dim, _ := NewDimension(-3.5, unit)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.5 {
			t.Errorf("Expected 3.5, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle decimal numbers", func(t *testing.T) {
		dim, _ := NewDimension(-3.14159, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.14159 {
			t.Errorf("Expected 3.14159, got %f", result.Value)
		}
	})

	t.Run("should handle very large negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-1000000.0, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 1000000 {
			t.Errorf("Expected 1000000, got %f", result.Value)
		}
	})

	t.Run("should handle very small negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-0.000001, nil)
		result, err := Abs(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0.000001 {
			t.Errorf("Expected 0.000001, got %f", result.Value)
		}
	})
}

func TestTrigonometricFunctions(t *testing.T) {
	t.Run("tan function", func(t *testing.T) {
		t.Run("should calculate tangent and use empty unit", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi/4, nil) // 45 degrees in radians
			result, err := Tan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-1) > 1e-10 {
				t.Errorf("Expected close to 1, got %f", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle zero", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Tan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle PI", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi, nil)
			result, err := Tan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
		})

		t.Run("should handle negative values", func(t *testing.T) {
			dim, _ := NewDimension(-math.Pi/4, nil)
			result, err := Tan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+1) > 1e-10 {
				t.Errorf("Expected close to -1, got %f", result.Value)
			}
		})
	})

	t.Run("sin function", func(t *testing.T) {
		t.Run("should calculate sine and use empty unit", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi/2, nil) // 90 degrees in radians
			result, err := Sin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-1) > 1e-10 {
				t.Errorf("Expected close to 1, got %f", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle zero", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Sin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle PI", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi, nil)
			result, err := Sin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
		})

		t.Run("should handle negative values", func(t *testing.T) {
			dim, _ := NewDimension(-math.Pi/2, nil)
			result, err := Sin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+1) > 1e-10 {
				t.Errorf("Expected close to -1, got %f", result.Value)
			}
		})

		t.Run("should handle 30 degrees (PI/6)", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi/6, nil)
			result, err := Sin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0.5) > 1e-10 {
				t.Errorf("Expected close to 0.5, got %f", result.Value)
			}
		})
	})

	t.Run("cos function", func(t *testing.T) {
		t.Run("should calculate cosine and use empty unit", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Cos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-1) > 1e-10 {
				t.Errorf("Expected close to 1, got %f", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle PI/2", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi/2, nil)
			result, err := Cos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
		})

		t.Run("should handle PI", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi, nil)
			result, err := Cos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+1) > 1e-10 {
				t.Errorf("Expected close to -1, got %f", result.Value)
			}
		})

		t.Run("should handle negative values", func(t *testing.T) {
			dim, _ := NewDimension(-math.Pi, nil)
			result, err := Cos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+1) > 1e-10 {
				t.Errorf("Expected close to -1, got %f", result.Value)
			}
		})

		t.Run("should handle 60 degrees (PI/3)", func(t *testing.T) {
			dim, _ := NewDimension(math.Pi/3, nil)
			result, err := Cos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0.5) > 1e-10 {
				t.Errorf("Expected close to 0.5, got %f", result.Value)
			}
		})
	})
}

func TestInverseTrigonometricFunctions(t *testing.T) {
	t.Run("atan function", func(t *testing.T) {
		t.Run("should calculate arctangent and return radians unit", func(t *testing.T) {
			dim, _ := NewDimension(1.0, nil)
			result, err := Atan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/4) > 1e-10 {
				t.Errorf("Expected close to PI/4, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle zero", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Atan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle negative values", func(t *testing.T) {
			dim, _ := NewDimension(-1.0, nil)
			result, err := Atan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+math.Pi/4) > 1e-10 {
				t.Errorf("Expected close to -PI/4, got %f", result.Value)
			}
		})

		t.Run("should handle very large values", func(t *testing.T) {
			dim, _ := NewDimension(1000.0, nil)
			result, err := Atan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/2) > 0.01 {
				t.Errorf("Expected close to PI/2, got %f", result.Value)
			}
		})

		t.Run("should handle very small values", func(t *testing.T) {
			dim, _ := NewDimension(0.001, nil)
			result, err := Atan(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0.001) > 0.001 {
				t.Errorf("Expected close to 0.001, got %f", result.Value)
			}
		})
	})

	t.Run("asin function", func(t *testing.T) {
		t.Run("should calculate arcsine and return radians unit", func(t *testing.T) {
			dim, _ := NewDimension(1.0, nil)
			result, err := Asin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/2) > 1e-10 {
				t.Errorf("Expected close to PI/2, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle zero", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Asin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle 0.5", func(t *testing.T) {
			dim, _ := NewDimension(0.5, nil)
			result, err := Asin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/6) > 1e-10 {
				t.Errorf("Expected close to PI/6, got %f", result.Value)
			}
		})

		t.Run("should handle negative values", func(t *testing.T) {
			dim, _ := NewDimension(-1.0, nil)
			result, err := Asin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+math.Pi/2) > 1e-10 {
				t.Errorf("Expected close to -PI/2, got %f", result.Value)
			}
		})

		t.Run("should handle edge case -0.5", func(t *testing.T) {
			dim, _ := NewDimension(-0.5, nil)
			result, err := Asin(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value+math.Pi/6) > 1e-10 {
				t.Errorf("Expected close to -PI/6, got %f", result.Value)
			}
		})

		t.Run("should return error for values outside [-1, 1]", func(t *testing.T) {
			dim1, _ := NewDimension(1.1, nil)
			dim2, _ := NewDimension(-1.1, nil)
			
			_, err1 := Asin(dim1)
			_, err2 := Asin(dim2)
			
			if err1 == nil {
				t.Error("Expected error for input 1.1, got none")
			}
			if err2 == nil {
				t.Error("Expected error for input -1.1, got none")
			}
		})
	})

	t.Run("acos function", func(t *testing.T) {
		t.Run("should calculate arccosine and return radians unit", func(t *testing.T) {
			dim, _ := NewDimension(1.0, nil)
			result, err := Acos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-0) > 1e-10 {
				t.Errorf("Expected close to 0, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle zero", func(t *testing.T) {
			dim, _ := NewDimension(0.0, nil)
			result, err := Acos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/2) > 1e-10 {
				t.Errorf("Expected close to PI/2, got %f", result.Value)
			}
			if result.Unit.ToString() != "rad" {
				t.Errorf("Expected rad unit, got %s", result.Unit.ToString())
			}
		})

		t.Run("should handle -1", func(t *testing.T) {
			dim, _ := NewDimension(-1.0, nil)
			result, err := Acos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi) > 1e-10 {
				t.Errorf("Expected close to PI, got %f", result.Value)
			}
		})

		t.Run("should handle 0.5", func(t *testing.T) {
			dim, _ := NewDimension(0.5, nil)
			result, err := Acos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-math.Pi/3) > 1e-10 {
				t.Errorf("Expected close to PI/3, got %f", result.Value)
			}
		})

		t.Run("should handle -0.5", func(t *testing.T) {
			dim, _ := NewDimension(-0.5, nil)
			result, err := Acos(dim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if math.Abs(result.Value-2*math.Pi/3) > 1e-10 {
				t.Errorf("Expected close to 2*PI/3, got %f", result.Value)
			}
		})

		t.Run("should return error for values outside [-1, 1]", func(t *testing.T) {
			dim1, _ := NewDimension(1.1, nil)
			dim2, _ := NewDimension(-1.1, nil)
			
			_, err1 := Acos(dim1)
			_, err2 := Acos(dim2)
			
			if err1 == nil {
				t.Error("Expected error for input 1.1, got none")
			}
			if err2 == nil {
				t.Error("Expected error for input -1.1, got none")
			}
		})
	})
}

func TestRound(t *testing.T) {
	t.Run("should round to nearest integer when no fraction specified", func(t *testing.T) {
		dim, _ := NewDimension(3.7, nil)
		result, err := Round(dim, nil)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should round to nearest integer when fraction is nil", func(t *testing.T) {
		dim, _ := NewDimension(3.2, nil)
		result, err := Round(dim, nil)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3 {
			t.Errorf("Expected 3, got %f", result.Value)
		}
	})

	t.Run("should round to specified decimal places", func(t *testing.T) {
		dim, _ := NewDimension(3.14159, nil)
		fraction, _ := NewDimension(2.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.14 {
			t.Errorf("Expected 3.14, got %f", result.Value)
		}
	})

	t.Run("should handle zero decimal places", func(t *testing.T) {
		dim, _ := NewDimension(3.7, nil)
		fraction, _ := NewDimension(0.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
	})

	t.Run("should handle multiple decimal places", func(t *testing.T) {
		dim, _ := NewDimension(3.14159265, nil)
		fraction, _ := NewDimension(5.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.14159 {
			t.Errorf("Expected 3.14159, got %f", result.Value)
		}
	})

	t.Run("should preserve units", func(t *testing.T) {
		unit := NewUnit([]string{"%"}, nil, "%")
		dim, _ := NewDimension(3.14159, unit)
		fraction, _ := NewDimension(2.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.14 {
			t.Errorf("Expected 3.14, got %f", result.Value)
		}
		if result.Unit != dim.Unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-3.14159, nil)
		fraction, _ := NewDimension(2.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != -3.14 {
			t.Errorf("Expected -3.14, got %f", result.Value)
		}
	})

	t.Run("should handle rounding up from 5", func(t *testing.T) {
		dim, _ := NewDimension(3.145, nil)
		fraction, _ := NewDimension(2.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.15 {
			t.Errorf("Expected 3.15, got %f", result.Value)
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0.0, nil)
		fraction, _ := NewDimension(2.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle very large decimal places", func(t *testing.T) {
		dim, _ := NewDimension(3.14159, nil)
		fraction, _ := NewDimension(10.0, nil)
		result, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		
		if result.Value != 3.14159 {
			t.Errorf("Expected 3.14159, got %f", result.Value)
		}
	})

	t.Run("should handle edge case with exact half values", func(t *testing.T) {
		testCases := []struct {
			input    float64
			decimals float64
			expected float64
		}{
			{2.5, 0, 3},   // Round away from zero
			{3.5, 0, 4},   // Round away from zero
			{-2.5, 0, -3}, // Round away from zero
			{-3.5, 0, -4}, // Round away from zero
		}

		for _, tc := range testCases {
			dim, _ := NewDimension(tc.input, nil)
			fraction, _ := NewDimension(tc.decimals, nil)
			result, err := Round(dim, fraction)
			if err != nil {
				t.Fatalf("Unexpected error for input %f: %v", tc.input, err)
			}
			if result.Value != tc.expected {
				t.Errorf("For input %f with %f decimals, expected %f, got %f", tc.input, tc.decimals, tc.expected, result.Value)
			}
		}
	})
}

func TestMathFunctionsMap(t *testing.T) {
	t.Run("should have all expected functions", func(t *testing.T) {
		expectedFunctions := []string{
			"ceil", "floor", "sqrt", "abs", "tan", "sin", "cos", "atan", "asin", "acos", "round",
		}

		for _, funcName := range expectedFunctions {
			if _, exists := MathFunctions[funcName]; !exists {
				t.Errorf("Expected function %s to exist in MathFunctions map", funcName)
			}
		}

		if len(MathFunctions) != len(expectedFunctions) {
			t.Errorf("Expected %d functions, got %d", len(expectedFunctions), len(MathFunctions))
		}
	})

	t.Run("should properly execute functions from map", func(t *testing.T) {
		testDim, _ := NewDimension(16.0, nil)
		
		sqrtFunc := MathFunctions["sqrt"]
		if fn, ok := sqrtFunc.(func(*Dimension) (*Dimension, error)); ok {
			result, err := fn(testDim)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			
			if result.Value != 4 {
				t.Errorf("Expected 4, got %f", result.Value)
			}
		} else {
			t.Fatalf("sqrt function has unexpected type")
		}
	})
}

func TestComplexMathematicalScenarios(t *testing.T) {
	t.Run("should handle chained operations", func(t *testing.T) {
		dim, _ := NewDimension(16.0, nil)
		
		// sqrt(16) = 4, then ceil(4) = 4
		sqrtResult, err := Sqrt(dim)
		if err != nil {
			t.Fatalf("Unexpected error in sqrt: %v", err)
		}
		ceilResult, err := Ceil(sqrtResult)
		if err != nil {
			t.Fatalf("Unexpected error in ceil: %v", err)
		}
		
		if sqrtResult.Value != 4 {
			t.Errorf("Expected sqrt result 4, got %f", sqrtResult.Value)
		}
		if ceilResult.Value != 4 {
			t.Errorf("Expected ceil result 4, got %f", ceilResult.Value)
		}
	})

	t.Run("should handle operations on results of round", func(t *testing.T) {
		dim, _ := NewDimension(3.14159, nil)
		fraction, _ := NewDimension(2.0, nil)
		
		// Round to 2 decimal places: 3.14, then take absolute value: 3.14
		roundResult, err := Round(dim, fraction)
		if err != nil {
			t.Fatalf("Unexpected error in round: %v", err)
		}
		absResult, err := Abs(roundResult)
		if err != nil {
			t.Fatalf("Unexpected error in abs: %v", err)
		}
		
		if roundResult.Value != 3.14 {
			t.Errorf("Expected round result 3.14, got %f", roundResult.Value)
		}
		if absResult.Value != 3.14 {
			t.Errorf("Expected abs result 3.14, got %f", absResult.Value)
		}
	})

	t.Run("should handle edge cases with very small numbers", func(t *testing.T) {
		verySmall, _ := NewDimension(0.0000001, nil)
		
		ceilResult, err := Ceil(verySmall)
		if err != nil {
			t.Fatalf("Unexpected error in ceil: %v", err)
		}
		floorResult, err := Floor(verySmall)
		if err != nil {
			t.Fatalf("Unexpected error in floor: %v", err)
		}
		absResult, err := Abs(verySmall)
		if err != nil {
			t.Fatalf("Unexpected error in abs: %v", err)
		}
		
		if ceilResult.Value != 1 {
			t.Errorf("Expected ceil result 1, got %f", ceilResult.Value)
		}
		if floorResult.Value != 0 {
			t.Errorf("Expected floor result 0, got %f", floorResult.Value)
		}
		if absResult.Value != 0.0000001 {
			t.Errorf("Expected abs result 0.0000001, got %f", absResult.Value)
		}
	})

	t.Run("should handle edge cases with very large numbers", func(t *testing.T) {
		veryLarge, _ := NewDimension(999999999.0, nil)
		
		ceilResult, err := Ceil(veryLarge)
		if err != nil {
			t.Fatalf("Unexpected error in ceil: %v", err)
		}
		floorResult, err := Floor(veryLarge)
		if err != nil {
			t.Fatalf("Unexpected error in floor: %v", err)
		}
		absResult, err := Abs(veryLarge)
		if err != nil {
			t.Fatalf("Unexpected error in abs: %v", err)
		}
		
		if ceilResult.Value != 999999999 {
			t.Errorf("Expected ceil result 999999999, got %f", ceilResult.Value)
		}
		if floorResult.Value != 999999999 {
			t.Errorf("Expected floor result 999999999, got %f", floorResult.Value)
		}
		if absResult.Value != 999999999 {
			t.Errorf("Expected abs result 999999999, got %f", absResult.Value)
		}
	})
}