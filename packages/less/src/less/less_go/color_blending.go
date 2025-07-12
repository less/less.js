package less_go

import (
	"math"
)

// BlendMode represents a color blending function
type BlendMode func(cb, cs float64) float64

// ColorBlend performs color blending between two colors using the specified blend mode
func ColorBlend(mode BlendMode, color1, color2 *Color) *Color {
	if color1 == nil || color2 == nil {
		return nil
	}

	ab := color1.Alpha        // backdrop alpha
	as := color2.Alpha        // source alpha
	var ar float64            // result alpha
	var cr float64            // result channel
	r := make([]float64, 3)   // result RGB

	// Calculate result alpha: as + ab * (1 - as)
	ar = as + ab*(1-as)

	// Blend each color channel
	for i := 0; i < 3; i++ {
		// Normalize to 0-1 range
		cb := color1.RGB[i] / 255.0
		cs := color2.RGB[i] / 255.0
		
		// Apply blend mode
		cr = mode(cb, cs)
		
		// Apply alpha compositing if result alpha > 0
		if ar > 0 {
			cr = (as*cs + ab*(cb - as*(cb+cs-cr))) / ar
		}
		
		// Denormalize back to 0-255 range
		r[i] = cr * 255.0
	}

	return NewColor(r, ar, "")
}

// Blend mode functions

// Multiply blend mode: cb * cs
func Multiply(cb, cs float64) float64 {
	return cb * cs
}

// Screen blend mode: cb + cs - cb * cs
func Screen(cb, cs float64) float64 {
	return cb + cs - cb*cs
}

// Overlay blend mode: conditional multiply/screen
func Overlay(cb, cs float64) float64 {
	cb *= 2
	if cb <= 1 {
		return Multiply(cb, cs)
	}
	return Screen(cb-1, cs)
}

// Softlight blend mode: soft lighting effect
func Softlight(cb, cs float64) float64 {
	d := 1.0
	e := cb
	
	if cs > 0.5 {
		e = 1.0
		if cb > 0.25 {
			d = math.Sqrt(cb)
		} else {
			d = ((16*cb-12)*cb+4)*cb
		}
	}
	
	return cb - (1-2*cs)*e*(d-cb)
}

// Hardlight blend mode: overlay with swapped parameters
func Hardlight(cb, cs float64) float64 {
	return Overlay(cs, cb)
}

// Difference blend mode: |cb - cs|
func Difference(cb, cs float64) float64 {
	return math.Abs(cb - cs)
}

// Exclusion blend mode: cb + cs - 2 * cb * cs
func Exclusion(cb, cs float64) float64 {
	return cb + cs - 2*cb*cs
}

// Non-W3C blend modes

// Average blend mode: (cb + cs) / 2
func Average(cb, cs float64) float64 {
	return (cb + cs) / 2
}

// Negation blend mode: 1 - |cb + cs - 1|
func Negation(cb, cs float64) float64 {
	return 1 - math.Abs(cb+cs-1)
}

// Convenience functions that bind the blend modes to ColorBlend

// ColorBlendMultiply performs multiply blending
func ColorBlendMultiply(color1, color2 *Color) *Color {
	return ColorBlend(Multiply, color1, color2)
}

// ColorBlendScreen performs screen blending
func ColorBlendScreen(color1, color2 *Color) *Color {
	return ColorBlend(Screen, color1, color2)
}

// ColorBlendOverlay performs overlay blending
func ColorBlendOverlay(color1, color2 *Color) *Color {
	return ColorBlend(Overlay, color1, color2)
}

// ColorBlendSoftlight performs softlight blending
func ColorBlendSoftlight(color1, color2 *Color) *Color {
	return ColorBlend(Softlight, color1, color2)
}

// ColorBlendHardlight performs hardlight blending
func ColorBlendHardlight(color1, color2 *Color) *Color {
	return ColorBlend(Hardlight, color1, color2)
}

// ColorBlendDifference performs difference blending
func ColorBlendDifference(color1, color2 *Color) *Color {
	return ColorBlend(Difference, color1, color2)
}

// ColorBlendExclusion performs exclusion blending
func ColorBlendExclusion(color1, color2 *Color) *Color {
	return ColorBlend(Exclusion, color1, color2)
}

// ColorBlendAverage performs average blending
func ColorBlendAverage(color1, color2 *Color) *Color {
	return ColorBlend(Average, color1, color2)
}

// ColorBlendNegation performs negation blending
func ColorBlendNegation(color1, color2 *Color) *Color {
	return ColorBlend(Negation, color1, color2)
}

// GetColorBlendingFunctions returns the color blending function registry
func GetColorBlendingFunctions() map[string]any {
	return map[string]any{
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
}