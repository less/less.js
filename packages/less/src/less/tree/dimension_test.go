package tree

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

// testCSSOutput is a simple implementation of CSSOutput for testing
// It simply collects added chunks into a string.
type testCSSOutput struct {
	output string
}

func (t *testCSSOutput) Add(chunk interface{}, _ interface{}, _ interface{}) {
	t.output += fmt.Sprintf("%v", chunk)
}

func (t *testCSSOutput) IsEmpty() bool {
	return t.output == ""
}

// Helper to create a new Dimension and fail test if error
func mustNewDimension(t *testing.T, value interface{}, unit interface{}) *Dimension {
	d, err := NewDimension(value, unit)
	if err != nil {
		t.Fatalf("Failed to create Dimension: %v", err)
	}
	return d
}

// TestDimensionConstructor tests the constructor behavior
func TestDimensionConstructor(t *testing.T) {
	t.Run("numeric value with unit string", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		if d.Value != 5 {
			t.Errorf("expected value 5, got %v", d.Value)
		}
		if d.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got %s", d.Unit.ToString())
		}
	})

	t.Run("numeric value with no unit", func(t *testing.T) {
		d := mustNewDimension(t, 5, "")
		if !d.Unit.IsEmpty() {
			t.Errorf("expected empty unit")
		}
	})

	t.Run("numeric value with Unit instance", func(t *testing.T) {
		u := NewUnit([]string{"px"}, nil, "px")
		d, err := NewDimension(5, u)
		if err != nil {
			t.Fatalf("Error: %v", err)
		}
		if d.Unit != u {
			t.Errorf("expected unit instance to be used")
		}
	})

	t.Run("non-numeric value should error", func(t *testing.T) {
		_, err := NewDimension("not a number", nil)
		if err == nil {
			t.Errorf("expected error for non-numeric value")
		}
	})

	t.Run("handle empty string unit", func(t *testing.T) {
		d := mustNewDimension(t, 5, "")
		if !d.Unit.IsEmpty() {
			t.Errorf("expected empty unit")
		}
	})

	t.Run("handle unit with spaces", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px em")
		if d.Unit.ToString() != "px em" {
			t.Errorf("expected 'px em', got '%s'", d.Unit.ToString())
		}
	})

	t.Run("handle unit with numbers", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px2")
		if d.Unit.ToString() != "px2" {
			t.Errorf("expected 'px2', got '%s'", d.Unit.ToString())
		}
	})

	t.Run("handle unit with special characters", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px@#$%")
		if d.Unit.ToString() != "px@#$%" {
			t.Errorf("expected 'px@#$%%', got '%s'", d.Unit.ToString())
		}
	})

	t.Run("handle very long unit names", func(t *testing.T) {
		longUnit := strings.Repeat("a", 1000)
		d := mustNewDimension(t, 5, longUnit)
		if d.Unit.ToString() != longUnit {
			t.Errorf("expected long unit of length %d, got length %d", len(longUnit), len(d.Unit.ToString()))
		}
	})
}

// TestToColor tests the conversion of Dimension to Color
func TestToColor(t *testing.T) {
	d := mustNewDimension(t, 128, nil)
	color := d.ToColor()
	if len(color.RGB) != 3 {
		t.Errorf("expected 3 components in color, got %d", len(color.RGB))
	}
	for i, v := range color.RGB {
		if v != 128 {
			t.Errorf("expected color component 128 at index %d, got %v", i, v)
		}
	}
	if color.Alpha != 1 {
		t.Errorf("expected alpha 1, got %v", color.Alpha)
	}
}

// TestGenCSS tests the CSS output generation
func TestGenCSS(t *testing.T) {
	// Helper to get CSS string output
	genCSS := func(d *Dimension, context map[string]interface{}) string {
		testOut := &testCSSOutput{}
		cssOut := &CSSOutput{
			Add:     testOut.Add,
			IsEmpty: testOut.IsEmpty,
		}
		d.GenCSS(context, cssOut)
		return testOut.output
	}

	t.Run("generate CSS with value and unit", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		out := genCSS(d, map[string]interface{}{})
		expected := "5px"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("handle zero values without unit in compressed mode", func(t *testing.T) {
		d := mustNewDimension(t, 0, "px")
		out := genCSS(d, map[string]interface{}{ "compress": true })
		expected := "0"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("handle small values correctly", func(t *testing.T) {
		d := mustNewDimension(t, 0.0000001, nil)
		out := genCSS(d, map[string]interface{}{})
		expected := "0.0000001"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("remove leading zero in compressed mode", func(t *testing.T) {
		d := mustNewDimension(t, 0.5, "px")
		out := genCSS(d, map[string]interface{}{ "compress": true })
		expected := ".5px"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("throw error for multiple units in strict mode", func(t *testing.T) {
		// Create a Dimension with a Unit that has multiple numerators
		u := NewUnit([]string{"px", "em"}, nil, "px")
		d, err := NewDimension(5, u)
		if err != nil {
			t.Fatalf("Error creating dimension: %v", err)
		}
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("expected panic for multiple units in strict mode")
			}
		}()
		// Create the correct CSSOutput type for this test case
		testOut := &testCSSOutput{}
		cssOut := &CSSOutput{
			Add:     testOut.Add,
			IsEmpty: testOut.IsEmpty,
		}
		d.GenCSS(map[string]interface{}{ "strictUnits": true }, cssOut) // Pass cssOut
	})

	t.Run("output zero value with unit in non-compressed mode", func(t *testing.T) {
		d := mustNewDimension(t, 0, "px")
		out := genCSS(d, map[string]interface{}{})
		expected := "0px"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("output zero value with non-length unit in compressed mode", func(t *testing.T) {
		d := mustNewDimension(t, 0, "%")
		out := genCSS(d, map[string]interface{}{ "compress": true })
		expected := "0%"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("handle negative values between -1 and 0 in compressed mode", func(t *testing.T) {
		d := mustNewDimension(t, -0.5, "px")
		out := genCSS(d, map[string]interface{}{ "compress": true })
		expected := "-0.5px"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})

	t.Run("handle very small values near zero", func(t *testing.T) {
		d := mustNewDimension(t, 0.0000005, "px")
		out := genCSS(d, map[string]interface{}{})
		expected := "0.0000005px"
		if out != expected {
			t.Errorf("expected '%s', got '%s'", expected, out)
		}
	})
}

// TestOperate tests arithmetic operations between Dimensions
func TestOperate(t *testing.T) {
	// Addition with same unit
	t.Run("add dimensions with same unit", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 3, "px")
		result := d1.Operate(nil, "+", d2)
		if result.Value != 8 {
			t.Errorf("expected 8, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("add dimensions with different units", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 3, "em")
		result := d1.Operate(nil, "+", d2)
		if result.Value != 8 {
			t.Errorf("expected 8, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			// In non-strict mode, unit falls back to first's unit
			t.Errorf("expected unit 'px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("multiply dimensions", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 3, "em")
		result := d1.Operate(nil, "*", d2)
		if result.Value != 15 {
			t.Errorf("expected 15, got %v", result.Value)
		}
		// Expect unit to be multiplication of units (alphabetically sorted: "em*px")
		if result.Unit.ToString() != "em*px" {
			t.Errorf("expected unit 'em*px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("divide dimensions", func(t *testing.T) {
		d1 := mustNewDimension(t, 6, "px")
		d2 := mustNewDimension(t, 2, "em")
		result := d1.Operate(nil, "/", d2)
		if result.Value != 3 {
			t.Errorf("expected 3, got %v", result.Value)
		}
		if result.Unit.ToString() != "px/em" {
			t.Errorf("expected unit 'px/em', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("subtract dimensions with same unit", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 3, "px")
		result := d1.Operate(nil, "-", d2)
		if result.Value != 2 {
			t.Errorf("expected 2, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("add unitless to dimension with unit", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 2, "")
		result := d1.Operate(nil, "+", d2)
		if result.Value != 7 {
			t.Errorf("expected 7, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("add dimension with unit to unitless dimension", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "")
		d2 := mustNewDimension(t, 2, "px")
		result := d1.Operate(nil, "+", d2)
		if result.Value != 7 {
			t.Errorf("expected 7, got %v", result.Value)
		}
		if result.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", result.Unit.ToString())
		}
	})

	t.Run("multiplication with zero", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 0, "px")
		result := d1.Operate(nil, "*", d2)
		if result.Value != 0 {
			t.Errorf("expected 0, got %v", result.Value)
		}
	})

	t.Run("handle negative numbers", func(t *testing.T) {
		d1 := mustNewDimension(t, -5, "px")
		d2 := mustNewDimension(t, -3, "px")
		result := d1.Operate(nil, "+", d2)
		if result.Value != -8 {
			t.Errorf("expected -8, got %v", result.Value)
		}
	})

	t.Run("handle mixed positive and negative numbers", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, -3, "px")
		result := d1.Operate(nil, "+", d2)
		if result.Value != 2 {
			t.Errorf("expected 2, got %v", result.Value)
		}
	})
}

// TestCompare tests the comparison of Dimensions
func TestCompare(t *testing.T) {
	t.Run("compare dimensions with same unit", func(t *testing.T) {
		d1 := mustNewDimension(t, 5, "px")
		d2 := mustNewDimension(t, 3, "px")
		cmp := d1.Compare(d2)
		if cmp == nil || *cmp <= 0 {
			t.Errorf("expected positive comparison, got %v", cmp)
		}
		cmp2 := d2.Compare(d1)
		if cmp2 == nil || *cmp2 >= 0 {
			t.Errorf("expected negative comparison, got %v", cmp2)
		}
	})

	t.Run("return nil when comparing with non-dimension", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		cmp := d.Compare(struct{}{})
		if cmp != nil {
			t.Errorf("expected nil comparison, got %v", cmp)
		}
	})

	t.Run("compare dimensions with different convertible units correctly", func(t *testing.T) {
		d1 := mustNewDimension(t, 1, "in")
		d2 := mustNewDimension(t, 2.54, "cm")
		cmp := d1.Compare(d2)
		// Due to floating point imprecision, we expect cmp to be -1 if d1 < d2
		if cmp == nil || *cmp != -1 {
			t.Errorf("expected -1, got %v", cmp)
		}
	})

	t.Run("return nil when comparing incompatible units", func(t *testing.T) {
		d1 := mustNewDimension(t, 1, "px")
		d2 := mustNewDimension(t, 1, "s")
		cmp := d1.Compare(d2)
		if cmp != nil {
			t.Errorf("expected nil for incompatible units, got %v", cmp)
		}
	})

	t.Run("handle large and small numbers", func(t *testing.T) {
		d1 := mustNewDimension(t, 1e20, "px")
		d2 := mustNewDimension(t, 1e20, "px")
		cmp := d1.Compare(d2)
		if cmp == nil || *cmp != 0 {
			t.Errorf("expected 0 for equal large numbers, got %v", cmp)
		}
		d3 := mustNewDimension(t, 1e-20, "px")
		d4 := mustNewDimension(t, 1e-20, "px")
		cmp = d3.Compare(d4)
		if cmp == nil || *cmp != 0 {
			t.Errorf("expected 0 for equal small numbers, got %v", cmp)
		}
	})
}

// TestUnify tests that Dimension.Unify converts to standard units
func TestUnify(t *testing.T) {
	t.Run("convert to standard length unit", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		unified := d.Unify()
		if unified.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", unified.Unit.ToString())
		}
	})

	t.Run("unify duration units", func(t *testing.T) {
		d := mustNewDimension(t, 1000, "ms")
		unified := d.Unify()
		// Expect 1000ms to become 1s; allow a small epsilon
		if unified.Unit.ToString() != "s" {
			t.Errorf("expected unit 's', got '%s'", unified.Unit.ToString())
		}
		if math.Abs(unified.Value-1) > 1e-6 {
			t.Errorf("expected value ~1, got %v", unified.Value)
		}
	})

	t.Run("unify angle units", func(t *testing.T) {
		d := mustNewDimension(t, 180, "deg")
		unified := d.Unify()
		if unified.Unit.ToString() != "rad" {
			t.Errorf("expected unit 'rad', got '%s'", unified.Unit.ToString())
		}
	})
}

// TestConvertTo tests the conversion of dimensions to specified units
func TestConvertTo(t *testing.T) {
	t.Run("convert to specified unit string", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		converted := d.ConvertTo("cm")
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
	})

	t.Run("convert to specified units object", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		convMap := map[string]interface{}{ "length": "cm" }
		converted := d.ConvertTo(convMap)
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
	})

	t.Run("handle multiple unit conversions, target length takes precedence", func(t *testing.T) {
		d := mustNewDimension(t, 5, "px")
		convMap := map[string]interface{}{ "length": "cm", "duration": "s" }
		converted := d.ConvertTo(convMap)
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
	})

	t.Run("convert from inches to millimeters", func(t *testing.T) {
		d := mustNewDimension(t, 1, "in")
		converted := d.ConvertTo("mm")
		if converted.Unit.ToString() != "mm" {
			t.Errorf("expected unit 'mm', got '%s'", converted.Unit.ToString())
		}
	})

	t.Run("do not convert when target unit is from a different group", func(t *testing.T) {
		d := mustNewDimension(t, 1, "px")
		converted := d.ConvertTo(map[string]interface{}{ "angle": "deg" })
		if converted.Unit.ToString() != "px" {
			t.Errorf("expected unit 'px', got '%s'", converted.Unit.ToString())
		}
	})

	t.Run("handle very large numbers in conversion", func(t *testing.T) {
		d := mustNewDimension(t, 1e20, "px")
		converted := d.ConvertTo("cm")
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
		if converted.Value <= 0 {
			t.Errorf("expected positive converted value, got %v", converted.Value)
		}
	})

	t.Run("handle very small numbers in conversion", func(t *testing.T) {
		d := mustNewDimension(t, 1e-20, "px")
		converted := d.ConvertTo("cm")
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
		if converted.Value < 0 {
			t.Errorf("expected non-negative converted value, got %v", converted.Value)
		}
	})

	t.Run("handle negative values in conversion", func(t *testing.T) {
		d := mustNewDimension(t, -5, "px")
		converted := d.ConvertTo("cm")
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
		if converted.Value >= 0 {
			t.Errorf("expected negative converted value, got %v", converted.Value)
		}
	})

	t.Run("handle zero values in conversion", func(t *testing.T) {
		d := mustNewDimension(t, 0, "px")
		converted := d.ConvertTo("cm")
		if converted.Unit.ToString() != "cm" {
			t.Errorf("expected unit 'cm', got '%s'", converted.Unit.ToString())
		}
		if converted.Value != 0 {
			t.Errorf("expected converted value 0, got %v", converted.Value)
		}
	})

	// Additional tests converting between all length, duration, and angle units can be added similarly
} 