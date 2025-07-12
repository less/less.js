package less_go

import (
	"math"
	"testing"
)

func TestColorBlend(t *testing.T) {
	// Create test colors
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")
	transparentColor := NewColor([]float64{255, 0, 0}, 0.0, "")
	halfTransparentRed := NewColor([]float64{255, 0, 0}, 0.5, "")
	halfTransparentBlue := NewColor([]float64{0, 0, 255}, 0.5, "")

	t.Run("should blend two fully opaque colors", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, redColor, blueColor)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha != 1.0 {
			t.Errorf("Expected alpha 1.0, got %f", result.Alpha)
		}
		if len(result.RGB) != 3 {
			t.Errorf("Expected RGB length 3, got %d", len(result.RGB))
		}
	})

	t.Run("should handle alpha blending correctly", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, halfTransparentRed, halfTransparentBlue)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		expected := 0.5 + 0.5*0.5 // as + ab * (1 - as) = 0.5 + 0.5 * 0.5 = 0.75
		if math.Abs(result.Alpha-expected) > 0.01 {
			t.Errorf("Expected alpha %f, got %f", expected, result.Alpha)
		}
	})

	t.Run("should handle transparent backdrop", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, transparentColor, blueColor)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha != 1.0 {
			t.Errorf("Expected alpha 1.0, got %f", result.Alpha)
		}
	})

	t.Run("should handle transparent source", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, redColor, transparentColor)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha != 1.0 {
			t.Errorf("Expected alpha 1.0, got %f", result.Alpha)
		}
	})

	t.Run("should handle both colors transparent", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		transparent1 := NewColor([]float64{255, 0, 0}, 0.0, "")
		transparent2 := NewColor([]float64{0, 0, 255}, 0.0, "")
		result := ColorBlend(mode, transparent1, transparent2)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha != 0.0 {
			t.Errorf("Expected alpha 0.0, got %f", result.Alpha)
		}
	})

	t.Run("should handle nil colors", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, nil, blueColor)
		if result != nil {
			t.Error("Expected nil for nil color1")
		}

		result = ColorBlend(mode, redColor, nil)
		if result != nil {
			t.Error("Expected nil for nil color2")
		}
	})

	t.Run("should restore RGB values to 0-255 range in result", func(t *testing.T) {
		mode := func(cb, cs float64) float64 { return cb * cs } // multiply
		result := ColorBlend(mode, redColor, blueColor)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		for i, value := range result.RGB {
			if value < 0 || value > 255 {
				t.Errorf("RGB[%d] = %f, expected range [0, 255]", i, value)
			}
		}
	})
}

func TestBlendModes(t *testing.T) {
	// Test individual blend mode functions
	tests := []struct {
		name     string
		mode     BlendMode
		cb, cs   float64
		expected float64
		delta    float64
	}{
		{"multiply 1.0 * 0.5", Multiply, 1.0, 0.5, 0.5, 0.001},
		{"multiply 0.0 * 1.0", Multiply, 0.0, 1.0, 0.0, 0.001},
		{"screen 0.5 + 0.5", Screen, 0.5, 0.5, 0.75, 0.001}, // 0.5 + 0.5 - 0.5*0.5 = 0.75
		{"screen 1.0 + 0.0", Screen, 1.0, 0.0, 1.0, 0.001},   // 1.0 + 0.0 - 1.0*0.0 = 1.0
		{"difference |1.0 - 0.5|", Difference, 1.0, 0.5, 0.5, 0.001},
		{"difference |0.5 - 1.0|", Difference, 0.5, 1.0, 0.5, 0.001},
		{"exclusion 1.0 + 0.5 - 2*1.0*0.5", Exclusion, 1.0, 0.5, 0.5, 0.001}, // 1.0 + 0.5 - 2*1.0*0.5 = 0.5
		{"average (1.0 + 0.5) / 2", Average, 1.0, 0.5, 0.75, 0.001},
		{"negation 1 - |0.5 + 0.5 - 1|", Negation, 0.5, 0.5, 1.0, 0.001}, // 1 - |1 - 1| = 1
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.mode(tt.cb, tt.cs)
			if math.Abs(result-tt.expected) > tt.delta {
				t.Errorf("Expected %f, got %f", tt.expected, result)
			}
		})
	}
}

func TestMultiplyBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blackColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	whiteColor := NewColor([]float64{255, 255, 255}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")

	t.Run("multiply with black creates black", func(t *testing.T) {
		result := ColorBlendMultiply(redColor, blackColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 0 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected black [0,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("multiply with white preserves color", func(t *testing.T) {
		result := ColorBlendMultiply(redColor, whiteColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 255 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected red [255,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("multiply is commutative", func(t *testing.T) {
		result1 := ColorBlendMultiply(redColor, blueColor)
		result2 := ColorBlendMultiply(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Multiply not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})
}

func TestScreenBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blackColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	whiteColor := NewColor([]float64{255, 255, 255}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")

	t.Run("screen with white creates white", func(t *testing.T) {
		result := ColorBlendScreen(redColor, whiteColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 255 || math.Round(result.RGB[1]) != 255 || math.Round(result.RGB[2]) != 255 {
			t.Errorf("Expected white [255,255,255], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("screen with black preserves color", func(t *testing.T) {
		result := ColorBlendScreen(redColor, blackColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 255 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected red [255,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("screen is commutative", func(t *testing.T) {
		result1 := ColorBlendScreen(redColor, blueColor)
		result2 := ColorBlendScreen(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Screen not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})
}

func TestOverlayBlend(t *testing.T) {
	darkColor := NewColor([]float64{64, 64, 64}, 1.0, "")   // 64/255 ≈ 0.25 < 0.5
	lightColor := NewColor([]float64{192, 192, 192}, 1.0, "") // 192/255 ≈ 0.75 > 0.5
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")

	t.Run("overlay with dark backdrop", func(t *testing.T) {
		result := ColorBlendOverlay(darkColor, redColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		// Should use multiply formula for dark backdrop
	})

	t.Run("overlay with light backdrop", func(t *testing.T) {
		result := ColorBlendOverlay(lightColor, redColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		// Should use screen formula for light backdrop
	})

	t.Run("overlay is not commutative", func(t *testing.T) {
		result1 := ColorBlendOverlay(redColor, blueColor)
		result2 := ColorBlendOverlay(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		// Results should generally be different (overlay is not commutative)
		different := false
		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				different = true
				break
			}
		}
		if !different {
			t.Error("Overlay should not be commutative")
		}
	})
}

func TestSoftlightBlend(t *testing.T) {
	lightSource := NewColor([]float64{192, 192, 192}, 1.0, "") // 192/255 ≈ 0.75 > 0.5
	darkSource := NewColor([]float64{64, 64, 64}, 1.0, "")     // 64/255 ≈ 0.25 <= 0.5
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")

	t.Run("softlight with cs > 0.5", func(t *testing.T) {
		result := ColorBlendSoftlight(redColor, lightSource)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
	})

	t.Run("softlight with cs <= 0.5", func(t *testing.T) {
		result := ColorBlendSoftlight(redColor, darkSource)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
	})

	t.Run("softlight cb > 0.25 in bright source mode", func(t *testing.T) {
		brightBackdrop := NewColor([]float64{192, 192, 192}, 1.0, "") // > 0.25
		brightSource := NewColor([]float64{192, 192, 192}, 1.0, "")   // > 0.5
		result := ColorBlendSoftlight(brightBackdrop, brightSource)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
	})

	t.Run("softlight cb <= 0.25 in bright source mode", func(t *testing.T) {
		darkBackdrop := NewColor([]float64{32, 32, 32}, 1.0, "")     // <= 0.25
		brightSource := NewColor([]float64{192, 192, 192}, 1.0, "")  // > 0.5
		result := ColorBlendSoftlight(darkBackdrop, brightSource)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
	})
}

func TestHardlightBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")

	t.Run("hardlight should be overlay with swapped parameters", func(t *testing.T) {
		result1 := ColorBlendHardlight(redColor, blueColor)
		result2 := ColorBlendOverlay(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Hardlight != Overlay(swapped) at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})
}

func TestDifferenceBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")
	whiteColor := NewColor([]float64{255, 255, 255}, 1.0, "")

	t.Run("difference is commutative", func(t *testing.T) {
		result1 := ColorBlendDifference(redColor, blueColor)
		result2 := ColorBlendDifference(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Difference not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})

	t.Run("difference of identical colors returns black", func(t *testing.T) {
		result := ColorBlendDifference(redColor, redColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 0 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected black [0,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("difference with white inverts", func(t *testing.T) {
		result := ColorBlendDifference(redColor, whiteColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		// Red: |1 - 1| = 0 -> 0
		// Green: |0 - 1| = 1 -> 255
		// Blue: |0 - 1| = 1 -> 255
		if math.Round(result.RGB[0]) != 0 || math.Round(result.RGB[1]) != 255 || math.Round(result.RGB[2]) != 255 {
			t.Errorf("Expected [0,255,255], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})
}

func TestExclusionBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")

	t.Run("exclusion is commutative", func(t *testing.T) {
		result1 := ColorBlendExclusion(redColor, blueColor)
		result2 := ColorBlendExclusion(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Exclusion not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})

	t.Run("exclusion of identical colors returns black", func(t *testing.T) {
		result := ColorBlendExclusion(redColor, redColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		// For identical colors: c + c - 2*c*c = 2c - 2c² = 2c(1-c)
		// For red: 2*1*(1-1) = 0
		if math.Round(result.RGB[0]) != 0 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected black [0,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})
}

func TestAverageBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")
	blackColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	whiteColor := NewColor([]float64{255, 255, 255}, 1.0, "")

	t.Run("average is commutative", func(t *testing.T) {
		result1 := ColorBlendAverage(redColor, blueColor)
		result2 := ColorBlendAverage(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Average not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})

	t.Run("average of identical colors returns same color", func(t *testing.T) {
		result := ColorBlendAverage(redColor, redColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 255 || math.Round(result.RGB[1]) != 0 || math.Round(result.RGB[2]) != 0 {
			t.Errorf("Expected red [255,0,0], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})

	t.Run("average of black and white creates mid-tone gray", func(t *testing.T) {
		result := ColorBlendAverage(blackColor, whiteColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		if math.Round(result.RGB[0]) != 128 || math.Round(result.RGB[1]) != 128 || math.Round(result.RGB[2]) != 128 {
			t.Errorf("Expected gray [128,128,128], got [%f,%f,%f]", result.RGB[0], result.RGB[1], result.RGB[2])
		}
	})
}

func TestNegationBlend(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")
	blackColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	whiteColor := NewColor([]float64{255, 255, 255}, 1.0, "")

	t.Run("negation is commutative", func(t *testing.T) {
		result1 := ColorBlendNegation(redColor, blueColor)
		result2 := ColorBlendNegation(blueColor, redColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}

		for i := 0; i < 3; i++ {
			if math.Abs(result1.RGB[i]-result2.RGB[i]) > 1.0 {
				t.Errorf("Negation not commutative at index %d: %f != %f", i, result1.RGB[i], result2.RGB[i])
			}
		}
	})

	t.Run("negation handles edge cases", func(t *testing.T) {
		result1 := ColorBlendNegation(blackColor, blackColor)
		result2 := ColorBlendNegation(whiteColor, whiteColor)

		if result1 == nil || result2 == nil {
			t.Fatal("Expected Colors, got nil")
		}
	})
}

func TestAllBlendModes(t *testing.T) {
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")
	blueColor := NewColor([]float64{0, 0, 255}, 1.0, "")
	halfTransparentRed := NewColor([]float64{255, 0, 0}, 0.5, "")
	halfTransparentBlue := NewColor([]float64{0, 0, 255}, 0.5, "")

	blendFunctions := map[string]func(*Color, *Color) *Color{
		"multiply":   ColorBlendMultiply,
		"screen":     ColorBlendScreen,
		"overlay":    ColorBlendOverlay,
		"softlight":  ColorBlendSoftlight,
		"hardlight":  ColorBlendHardlight,
		"difference": ColorBlendDifference,
		"exclusion":  ColorBlendExclusion,
		"average":    ColorBlendAverage,
		"negation":   ColorBlendNegation,
	}

	for mode, fn := range blendFunctions {
		t.Run(mode+" returns Color instance", func(t *testing.T) {
			result := fn(redColor, blueColor)
			if result == nil {
				t.Errorf("%s should return Color instance", mode)
			}
		})

		t.Run(mode+" preserves alpha calculation", func(t *testing.T) {
			result := fn(halfTransparentRed, halfTransparentBlue)
			if result == nil {
				t.Fatalf("%s should return Color instance", mode)
			}
			if result.Alpha <= 0 || result.Alpha > 1 {
				t.Errorf("%s alpha %f should be in range (0, 1]", mode, result.Alpha)
			}
		})

		t.Run(mode+" produces valid RGB values", func(t *testing.T) {
			result := fn(redColor, blueColor)
			if result == nil {
				t.Fatalf("%s should return Color instance", mode)
			}

			for i, value := range result.RGB {
				if value < 0 || value > 255 || math.IsNaN(value) {
					t.Errorf("%s RGB[%d] = %f, expected range [0, 255] and not NaN", mode, i, value)
				}
			}
		})
	}
}

func TestEdgeCases(t *testing.T) {
	maxColor := NewColor([]float64{255, 255, 255}, 1.0, "")
	minColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	color1 := NewColor([]float64{127.7, 128.3, 128.9}, 1.0, "")
	color2 := NewColor([]float64{64.1, 63.9, 64.5}, 1.0, "")
	redColor := NewColor([]float64{255, 0, 0}, 1.0, "")

	t.Run("handle colors with extreme values", func(t *testing.T) {
		result := ColorBlendMultiply(maxColor, minColor)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
	})

	t.Run("handle floating point precision", func(t *testing.T) {
		result := ColorBlendMultiply(color1, color2)
		if result == nil {
			t.Fatal("Expected Color, got nil")
		}

		for i, value := range result.RGB {
			if !math.IsInf(value, 0) && math.IsNaN(value) {
				t.Errorf("RGB[%d] = %f should be finite and not NaN", i, value)
			}
		}
	})

	t.Run("handle very small alpha values", func(t *testing.T) {
		tinyAlpha := NewColor([]float64{255, 0, 0}, 0.001, "")
		result := ColorBlendMultiply(redColor, tinyAlpha)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha <= 0 {
			t.Errorf("Expected alpha > 0, got %f", result.Alpha)
		}
	})

	t.Run("handle alpha values very close to 1", func(t *testing.T) {
		almostOpaque := NewColor([]float64{255, 0, 0}, 0.999999, "")
		result := ColorBlendMultiply(redColor, almostOpaque)

		if result == nil {
			t.Fatal("Expected Color, got nil")
		}
		if result.Alpha > 1 {
			t.Errorf("Expected alpha <= 1, got %f", result.Alpha)
		}
	})
}

func TestGetColorBlendingFunctions(t *testing.T) {
	functions := GetColorBlendingFunctions()

	expectedFunctions := []string{
		"multiply", "screen", "overlay", "softlight", "hardlight",
		"difference", "exclusion", "average", "negation",
	}

	if len(functions) != len(expectedFunctions) {
		t.Errorf("GetColorBlendingFunctions() returned %d functions, want %d", len(functions), len(expectedFunctions))
	}

	for _, name := range expectedFunctions {
		if _, exists := functions[name]; !exists {
			t.Errorf("GetColorBlendingFunctions() missing function %s", name)
		}
	}
}