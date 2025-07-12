package less_go

import (
	"strings"
	"testing"
)

// MockSvgEvalContext for testing
type MockSvgEvalContext struct {
	compressed bool
}

func (m *MockSvgEvalContext) IsCompressed() bool {
	return m.compressed
}

func (m *MockSvgEvalContext) GetFrames() []ParserFrame {
	return nil
}

func (m *MockSvgEvalContext) EnterCalc() {}
func (m *MockSvgEvalContext) ExitCalc()  {}
func (m *MockSvgEvalContext) IsMathOn() bool                        { return false }
func (m *MockSvgEvalContext) SetMathOn(bool)                        {}
func (m *MockSvgEvalContext) IsInCalc() bool                        { return false }
func (m *MockSvgEvalContext) GetImportantScope() []map[string]bool { return nil }

func TestSvgGradient(t *testing.T) {
	ctx := SvgContext{
		Index:           0,
		CurrentFileInfo: make(map[string]any),
		Context:         &MockSvgEvalContext{compressed: false},
	}

	t.Run("should return error with no arguments", func(t *testing.T) {
		result, err := SvgGradient(ctx)
		if err == nil {
			t.Error("Expected error with no arguments, got nil")
		}
		if result != nil {
			t.Error("Expected nil result with error")
		}
	})

	t.Run("should return error with only direction", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)

		result, err := SvgGradient(ctx, direction)
		if err == nil {
			t.Error("Expected error with only direction, got nil")
		}
		if result != nil {
			t.Error("Expected nil result with error")
		}
	})

	t.Run("should handle to bottom direction with color list", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""),   // red
			NewColor([]float64{0, 0, 255}, 1, ""),   // blue
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Error("Expected non-nil result")
		}

		if result.value == nil {
			t.Error("Expected non-nil result.value")
		} else {
			resultStr := result.value.(*Quoted).value
			if !strings.Contains(resultStr, "data:image/svg+xml,") {
				t.Error("Expected data URI prefix")
			}
			if !strings.Contains(resultStr, "x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%220%25%22%20y2%3D%22100%25%22") {
				t.Error("Expected to bottom gradient direction")
			}
			if !strings.Contains(resultStr, "stop-color%3D%22%23ff0000%22") {
				t.Error("Expected red color")
			}
			if !strings.Contains(resultStr, "stop-color%3D%22%230000ff%22") {
				t.Error("Expected blue color")
			}
		}
	})

	t.Run("should handle to right direction with color list", func(t *testing.T) {
		direction := NewQuoted("", "to right", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""),   // red
			NewColor([]float64{0, 255, 0}, 1, ""),   // green
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22") {
			t.Error("Expected to right gradient direction")
		}
	})

	t.Run("should handle ellipse direction for radial gradient", func(t *testing.T) {
		direction := NewQuoted("", "ellipse", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""),
			NewColor([]float64{0, 0, 255}, 1, ""),
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "radialGradient") {
			t.Error("Expected radial gradient")
		}
		if !strings.Contains(resultStr, "cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2275%25%22") {
			t.Error("Expected ellipse gradient attributes")
		}
	})

	t.Run("should handle individual color arguments", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		color1 := NewColor([]float64{255, 0, 0}, 1, "")
		color2 := NewColor([]float64{0, 0, 255}, 1, "")

		result, err := SvgGradient(ctx, direction, color1, color2)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "stop-color%3D%22%23ff0000%22") {
			t.Error("Expected red color")
		}
		if !strings.Contains(resultStr, "stop-color%3D%22%230000ff%22") {
			t.Error("Expected blue color")
		}
	})

	t.Run("should handle colors with positions using Expression", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		dim1, _ := NewDimension(0, "%")
		dim2, _ := NewDimension(100, "%")
		colorWithPos1, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""),
			dim1,
		}, false)
		colorWithPos2, _ := NewExpression([]interface{}{
			NewColor([]float64{0, 0, 255}, 1, ""),
			dim2,
		}, false)

		result, err := SvgGradient(ctx, direction, colorWithPos1, colorWithPos2)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "offset%3D%220%25%22") {
			t.Error("Expected 0% offset")
		}
		if !strings.Contains(resultStr, "offset%3D%22100%25%22") {
			t.Error("Expected 100% offset")
		}
	})

	t.Run("should handle colors with partial alpha", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 0.5, ""), // red with 50% alpha
			NewColor([]float64{0, 0, 255}, 1, ""),   // blue with full alpha
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "stop-opacity%3D%220.5%22") {
			t.Error("Expected stop-opacity for partial alpha")
		}
	})

	t.Run("should not include stop-opacity for full alpha", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""), // red with full alpha
			NewColor([]float64{0, 0, 255}, 1, ""), // blue with full alpha
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if strings.Contains(resultStr, "stop-opacity") {
			t.Error("Should not include stop-opacity for full alpha")
		}
	})

	t.Run("should handle three colors with middle position", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		color1 := NewColor([]float64{255, 0, 0}, 1, "") // red (first, no position)
		dim50, _ := NewDimension(50, "%")
		colorWithPos, _ := NewExpression([]interface{}{      // green (middle, must have position)
			NewColor([]float64{0, 255, 0}, 1, ""),
			dim50,
		}, false)
		color3 := NewColor([]float64{0, 0, 255}, 1, "") // blue (last, no position)

		result, err := SvgGradient(ctx, direction, color1, colorWithPos, color3)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "stop-color%3D%22%23ff0000%22") {
			t.Error("Expected red color")
		}
		if !strings.Contains(resultStr, "stop-color%3D%22%2300ff00%22") {
			t.Error("Expected green color")
		}
		if !strings.Contains(resultStr, "stop-color%3D%22%230000ff%22") {
			t.Error("Expected blue color")
		}
	})

	t.Run("should throw error for invalid direction", func(t *testing.T) {
		direction := NewQuoted("", "invalid direction", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""),
			NewColor([]float64{0, 0, 255}, 1, ""),
		}, false)

		_, err := SvgGradient(ctx, direction, colorList)
		if err == nil {
			t.Error("Expected error for invalid direction")
		}
	})

	t.Run("should throw error for non-Color arguments", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		invalidArg := NewQuoted("\"", "not a color", false, 0, nil)

		_, err := SvgGradient(ctx, direction, invalidArg)
		if err == nil {
			t.Error("Expected error for non-Color argument")
		}
	})

	t.Run("should throw error when color list has less than 2 colors", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 1, ""), // only one color
		}, false)

		_, err := SvgGradient(ctx, direction, colorList)
		if err == nil {
			t.Error("Expected error when color list has less than 2 colors")
		}
	})

	t.Run("should handle zero alpha correctly", func(t *testing.T) {
		direction := NewQuoted("", "to bottom", false, 0, nil)
		colorList, _ := NewExpression([]interface{}{
			NewColor([]float64{255, 0, 0}, 0, ""), // red with 0% alpha
			NewColor([]float64{0, 0, 255}, 1, ""), // blue with full alpha
		}, false)

		result, err := SvgGradient(ctx, direction, colorList)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultStr := result.value.(*Quoted).value
		if !strings.Contains(resultStr, "stop-opacity%3D%220%22") {
			t.Error("Expected stop-opacity for zero alpha")
		}
	})
}

func TestSvgGradientWithCatch(t *testing.T) {
	ctx := SvgContext{
		Index:           0,
		CurrentFileInfo: make(map[string]any),
		Context:         &MockSvgEvalContext{compressed: false},
	}

	t.Run("should return nil when svg-gradient function fails", func(t *testing.T) {
		direction := NewQuoted("", "invalid", false, 0, nil)
		result := SvgGradientWithCatch(ctx, direction)

		if result != nil {
			t.Error("Expected nil result when svg-gradient function fails")
		}
	})

	t.Run("should return nil with no arguments", func(t *testing.T) {
		result := SvgGradientWithCatch(ctx)
		if result != nil {
			t.Error("Expected nil result with no arguments")
		}
	})
}