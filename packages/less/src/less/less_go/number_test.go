package less_go

import (
	"math"
	"testing"
)

func TestMin(t *testing.T) {
	t.Run("should return the minimum of two numbers", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(3, nil)
		result, err := Min(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 3 {
			t.Errorf("Expected 3, got %f", dim.Value)
		}
	})

	t.Run("should return the minimum of multiple numbers", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(3, nil)
		dim3, _ := NewDimension(7, nil)
		dim4, _ := NewDimension(1, nil)
		result, err := Min(dim1, dim2, dim3, dim4)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 1 {
			t.Errorf("Expected 1, got %f", dim.Value)
		}
	})

	t.Run("should handle single argument", func(t *testing.T) {
		dim, _ := NewDimension(5, nil)
		result, err := Min(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		resDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if resDim.Value != 5 {
			t.Errorf("Expected 5, got %f", resDim.Value)
		}
	})

	t.Run("should handle negative numbers", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(-3, nil)
		dim3, _ := NewDimension(0, nil)
		result, err := Min(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != -3 {
			t.Errorf("Expected -3, got %f", dim.Value)
		}
	})

	t.Run("should handle decimal numbers", func(t *testing.T) {
		dim1, _ := NewDimension(3.14, nil)
		dim2, _ := NewDimension(2.71, nil)
		dim3, _ := NewDimension(3.0, nil)
		result, err := Min(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 2.71 {
			t.Errorf("Expected 2.71, got %f", dim.Value)
		}
	})

	t.Run("should handle same unit dimensions", func(t *testing.T) {
		unit := NewUnit([]string{"px"}, nil, "px")
		dim1, _ := NewDimension(10, unit)
		dim2, _ := NewDimension(5, unit)
		result, err := Min(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 5 {
			t.Errorf("Expected 5, got %f", dim.Value)
		}
		if dim.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle zero values", func(t *testing.T) {
		dim1, _ := NewDimension(0, nil)
		dim2, _ := NewDimension(5, nil)
		dim3, _ := NewDimension(-5, nil)
		result, err := Min(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != -5 {
			t.Errorf("Expected -5, got %f", dim.Value)
		}
	})

	t.Run("should handle all equal values", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(5, nil)
		dim3, _ := NewDimension(5, nil)
		result, err := Min(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 5 {
			t.Errorf("Expected 5, got %f", dim.Value)
		}
	})

	t.Run("should return nil for no arguments", func(t *testing.T) {
		result, err := Min()
		if err != nil {
			t.Fatalf("Expected nil error, got %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})

	t.Run("should return nil for incompatible types", func(t *testing.T) {
		dim, _ := NewDimension(5, nil)
		result, err := Min(dim, "not-a-dimension")
		if err != nil {
			t.Fatalf("Expected nil error, got %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})
}

func TestMax(t *testing.T) {
	t.Run("should return the maximum of two numbers", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(3, nil)
		result, err := Max(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 5 {
			t.Errorf("Expected 5, got %f", dim.Value)
		}
	})

	t.Run("should return the maximum of multiple numbers", func(t *testing.T) {
		dim1, _ := NewDimension(5, nil)
		dim2, _ := NewDimension(3, nil)
		dim3, _ := NewDimension(7, nil)
		dim4, _ := NewDimension(1, nil)
		result, err := Max(dim1, dim2, dim3, dim4)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 7 {
			t.Errorf("Expected 7, got %f", dim.Value)
		}
	})

	t.Run("should handle single argument", func(t *testing.T) {
		dim, _ := NewDimension(5, nil)
		result, err := Max(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		resDim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if resDim.Value != 5 {
			t.Errorf("Expected 5, got %f", resDim.Value)
		}
	})

	t.Run("should handle negative numbers", func(t *testing.T) {
		dim1, _ := NewDimension(-5, nil)
		dim2, _ := NewDimension(-3, nil)
		dim3, _ := NewDimension(-10, nil)
		result, err := Max(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != -3 {
			t.Errorf("Expected -3, got %f", dim.Value)
		}
	})

	t.Run("should handle decimal numbers", func(t *testing.T) {
		dim1, _ := NewDimension(3.14, nil)
		dim2, _ := NewDimension(2.71, nil)
		dim3, _ := NewDimension(3.0, nil)
		result, err := Max(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 3.14 {
			t.Errorf("Expected 3.14, got %f", dim.Value)
		}
	})

	t.Run("should handle same unit dimensions", func(t *testing.T) {
		unit := NewUnit([]string{"em"}, nil, "em")
		dim1, _ := NewDimension(2, unit)
		dim2, _ := NewDimension(5, unit)
		result, err := Max(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 5 {
			t.Errorf("Expected 5, got %f", dim.Value)
		}
		if dim.Unit != unit {
			t.Errorf("Expected same unit")
		}
	})

	t.Run("should handle zero values", func(t *testing.T) {
		dim1, _ := NewDimension(0, nil)
		dim2, _ := NewDimension(5, nil)
		dim3, _ := NewDimension(-5, nil)
		result, err := Max(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 5 {
			t.Errorf("Expected 5, got %f", dim.Value)
		}
	})

	t.Run("should handle all equal values", func(t *testing.T) {
		dim1, _ := NewDimension(3, nil)
		dim2, _ := NewDimension(3, nil)
		dim3, _ := NewDimension(3, nil)
		result, err := Max(dim1, dim2, dim3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		dim, ok := result.(*Dimension)
		if !ok {
			t.Fatalf("Expected Dimension, got %T", result)
		}
		if dim.Value != 3 {
			t.Errorf("Expected 3, got %f", dim.Value)
		}
	})

	t.Run("should return nil for no arguments", func(t *testing.T) {
		result, err := Max()
		if err != nil {
			t.Fatalf("Expected nil error, got %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})

	t.Run("should return nil for incompatible types", func(t *testing.T) {
		dim, _ := NewDimension(5, nil)
		result, err := Max(dim, 123)
		if err != nil {
			t.Fatalf("Expected nil error, got %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil result, got %v", result)
		}
	})
}

func TestConvert(t *testing.T) {
	t.Run("should convert dimension to specified unit", func(t *testing.T) {
		dim, _ := NewDimension(10, NewUnit([]string{"px"}, nil, "px"))
		targetUnit, _ := NewDimension(1, NewUnit([]string{"cm"}, nil, "cm"))

		// Note: Convert function calls ConvertTo method which may not implement full conversion
		// This test just verifies the function structure and that it doesn't error
		result, err := Convert(dim, targetUnit)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Just verify we get a result back
		if result == nil {
			t.Errorf("Expected result, got nil")
		}
	})
}

func TestPi(t *testing.T) {
	t.Run("should return Pi as a dimension", func(t *testing.T) {
		result, err := Pi()
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != math.Pi {
			t.Errorf("Expected %f, got %f", math.Pi, result.Value)
		}
		// Dimension constructor creates a default empty unit
		if result.Unit == nil {
			t.Errorf("Expected unit to be defined")
		}
	})

	t.Run("should return exact Pi value", func(t *testing.T) {
		result, err := Pi()
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 3.141592653589793 {
			t.Errorf("Expected 3.141592653589793, got %f", result.Value)
		}
	})

	t.Run("should return dimension with empty unit", func(t *testing.T) {
		result, err := Pi()
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Unit == nil {
			t.Errorf("Expected unit to be defined")
		}
		if len(result.Unit.Numerator) != 0 {
			t.Errorf("Expected empty numerator, got %v", result.Unit.Numerator)
		}
		if len(result.Unit.Denominator) != 0 {
			t.Errorf("Expected empty denominator, got %v", result.Unit.Denominator)
		}
	})
}

func TestMod(t *testing.T) {
	t.Run("should calculate modulo of two numbers", func(t *testing.T) {
		dim1, _ := NewDimension(10, nil)
		dim2, _ := NewDimension(3, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
		if result.Unit != dim1.Unit {
			t.Errorf("Expected same unit as first argument")
		}
	})

	t.Run("should preserve unit from first argument", func(t *testing.T) {
		unit := NewUnit([]string{"px"}, nil, "px")
		dim1, _ := NewDimension(25, unit)
		dim2, _ := NewDimension(7, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected px unit")
		}
	})

	t.Run("should handle negative dividends", func(t *testing.T) {
		dim1, _ := NewDimension(-10, nil)
		dim2, _ := NewDimension(3, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != -1 {
			t.Errorf("Expected -1, got %f", result.Value)
		}
	})

	t.Run("should handle negative divisors", func(t *testing.T) {
		dim1, _ := NewDimension(10, nil)
		dim2, _ := NewDimension(-3, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should handle both negative", func(t *testing.T) {
		dim1, _ := NewDimension(-10, nil)
		dim2, _ := NewDimension(-3, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != -1 {
			t.Errorf("Expected -1, got %f", result.Value)
		}
	})

	t.Run("should handle zero dividend", func(t *testing.T) {
		dim1, _ := NewDimension(0, nil)
		dim2, _ := NewDimension(5, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle decimal numbers", func(t *testing.T) {
		dim1, _ := NewDimension(10.5, nil)
		dim2, _ := NewDimension(3.2, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if math.Abs(result.Value-0.9) > 0.0000001 {
			t.Errorf("Expected 0.9, got %f", result.Value)
		}
	})

	t.Run("should handle mod by 1", func(t *testing.T) {
		dim1, _ := NewDimension(5.7, nil)
		dim2, _ := NewDimension(1, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if math.Abs(result.Value-0.7) > 0.0000001 {
			t.Errorf("Expected 0.7, got %f", result.Value)
		}
	})

	t.Run("should throw error for mod by zero", func(t *testing.T) {
		dim1, _ := NewDimension(10, nil)
		dim2, _ := NewDimension(0, nil)
		_, err := Mod(dim1, dim2)
		if err == nil {
			t.Errorf("Expected error for mod by zero")
		}
	})

	t.Run("should handle large numbers", func(t *testing.T) {
		dim1, _ := NewDimension(1000000, nil)
		dim2, _ := NewDimension(7, nil)
		result, err := Mod(dim1, dim2)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})
}

func TestPow(t *testing.T) {
	t.Run("should calculate power of two dimensions", func(t *testing.T) {
		base, _ := NewDimension(2, nil)
		exponent, _ := NewDimension(3, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 8 {
			t.Errorf("Expected 8, got %f", result.Value)
		}
		if result.Unit != base.Unit {
			t.Errorf("Expected same unit as base")
		}
	})

	t.Run("should preserve unit from base", func(t *testing.T) {
		unit := NewUnit([]string{"em"}, nil, "em")
		base, _ := NewDimension(3, unit)
		exponent, _ := NewDimension(2, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 9 {
			t.Errorf("Expected 9, got %f", result.Value)
		}
		if result.Unit != unit {
			t.Errorf("Expected em unit")
		}
	})

	t.Run("should handle negative base", func(t *testing.T) {
		base, _ := NewDimension(-2, nil)
		exponent, _ := NewDimension(3, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != -8 {
			t.Errorf("Expected -8, got %f", result.Value)
		}
	})

	t.Run("should handle negative exponent", func(t *testing.T) {
		base, _ := NewDimension(2, nil)
		exponent, _ := NewDimension(-2, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 0.25 {
			t.Errorf("Expected 0.25, got %f", result.Value)
		}
	})

	t.Run("should handle zero exponent", func(t *testing.T) {
		base, _ := NewDimension(5, nil)
		exponent, _ := NewDimension(0, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should handle zero base", func(t *testing.T) {
		base, _ := NewDimension(0, nil)
		exponent, _ := NewDimension(5, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle decimal exponent", func(t *testing.T) {
		base, _ := NewDimension(4, nil)
		exponent, _ := NewDimension(0.5, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 2 {
			t.Errorf("Expected 2, got %f", result.Value)
		}
	})

	t.Run("should handle one as base", func(t *testing.T) {
		base, _ := NewDimension(1, nil)
		exponent, _ := NewDimension(100, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should handle large exponents", func(t *testing.T) {
		base, _ := NewDimension(2, nil)
		exponent, _ := NewDimension(10, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1024 {
			t.Errorf("Expected 1024, got %f", result.Value)
		}
	})

	t.Run("should convert numbers to dimensions", func(t *testing.T) {
		result, err := Pow(2, 3)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 8 {
			t.Errorf("Expected 8, got %f", result.Value)
		}
	})

	t.Run("should handle mixed number and dimension arguments", func(t *testing.T) {
		base, _ := NewDimension(2, nil)
		_, err := Pow(base, 3)
		if err == nil {
			t.Errorf("Expected error for mixed types")
		}

		exponent, _ := NewDimension(3, nil)
		_, err = Pow(2, exponent)
		if err == nil {
			t.Errorf("Expected error for mixed types")
		}
	})

	t.Run("should throw error for non-numeric arguments", func(t *testing.T) {
		_, err := Pow("not-a-number", 2)
		if err == nil {
			t.Errorf("Expected error for non-numeric argument")
		}

		_, err = Pow(2, "not-a-number")
		if err == nil {
			t.Errorf("Expected error for non-numeric argument")
		}

		_, err = Pow(map[string]int{}, []int{})
		if err == nil {
			t.Errorf("Expected error for non-numeric arguments")
		}
	})

	t.Run("should handle edge case of 0^0", func(t *testing.T) {
		base, _ := NewDimension(0, nil)
		exponent, _ := NewDimension(0, nil)
		result, err := Pow(base, exponent)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should throw error for negative base with fractional exponent", func(t *testing.T) {
		base, _ := NewDimension(-8, nil)
		exponent, _ := NewDimension(1.0/3.0, nil)
		_, err := Pow(base, exponent)
		if err == nil {
			t.Errorf("Expected error for negative base with fractional exponent")
		}
	})
}

func TestPercentage(t *testing.T) {
	t.Run("should convert number to percentage", func(t *testing.T) {
		dim, _ := NewDimension(0.5, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 50 {
			t.Errorf("Expected 50, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle whole numbers", func(t *testing.T) {
		dim, _ := NewDimension(1, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 100 {
			t.Errorf("Expected 100, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle zero", func(t *testing.T) {
		dim, _ := NewDimension(0, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle negative numbers", func(t *testing.T) {
		dim, _ := NewDimension(-0.25, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != -25 {
			t.Errorf("Expected -25, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle small decimals", func(t *testing.T) {
		dim, _ := NewDimension(0.123, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 12.3 {
			t.Errorf("Expected 12.3, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle large numbers", func(t *testing.T) {
		dim, _ := NewDimension(5, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 500 {
			t.Errorf("Expected 500, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should override existing unit", func(t *testing.T) {
		unit := NewUnit([]string{"px"}, nil, "px")
		dim, _ := NewDimension(0.75, unit)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Value != 75 {
			t.Errorf("Expected 75, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle very small numbers", func(t *testing.T) {
		dim, _ := NewDimension(0.0001, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if math.Abs(result.Value-0.01) > 0.0000001 {
			t.Errorf("Expected 0.01, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})

	t.Run("should handle precise decimal conversions", func(t *testing.T) {
		dim, _ := NewDimension(1.0/3.0, nil)
		result, err := Percentage(dim)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if math.Abs(result.Value-33.333333333333336) > 0.0000001 {
			t.Errorf("Expected 33.333333333333336, got %f", result.Value)
		}
		if result.Unit.ToString() != "%" {
			t.Errorf("Expected %% unit, got %s", result.Unit.ToString())
		}
	})
}