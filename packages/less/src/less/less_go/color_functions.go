package less_go

import (
	"fmt"
	"math"
	"strings"
)

// Helper functions

// clampUnit ensures a value is between 0 and 1
func clampUnit(val float64) float64 {
	return math.Max(0, math.Min(1, val))
}

// makeDimension creates a dimension ignoring errors (for color functions)
func makeDimension(value float64, unit any) any {
	dim, _ := NewDimension(value, unit)
	return dim
}

// number extracts a float value from various types
func number(n any) (float64, error) {
	switch v := n.(type) {
	case *Dimension:
		if v.Unit != nil && v.Unit.ToString() == "%" {
			return v.Value / 100, nil
		}
		return v.Value, nil
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	default:
		return 0, fmt.Errorf("color functions take numbers as parameters")
	}
}

// scaled extracts a scaled value (handles percentages for RGB)
func scaled(n any, size float64) (float64, error) {
	if dim, ok := n.(*Dimension); ok && dim.Unit != nil && dim.Unit.ToString() == "%" {
		return dim.Value * size / 100, nil
	}
	return number(n)
}

// toHSL converts a color to HSL
func toHSL(color any) (*HSL, error) {
	if c, ok := color.(*Color); ok {
		hsl := c.ToHSL()
		return &hsl, nil
	}
	return nil, fmt.Errorf("argument cannot be evaluated to a color")
}

// toHSV converts a color to HSV
func toHSV(color any) (*HSV, error) {
	if c, ok := color.(*Color); ok {
		hsv := c.ToHSV()
		return &hsv, nil
	}
	return nil, fmt.Errorf("argument cannot be evaluated to a color")
}

// hslaHelper creates a color from HSL values, preserving the original color's format
func hslaHelper(origColor *Color, h, s, l, a float64) *Color {
	color := colorHSLA(h, s, l, a)
	if color != nil && origColor != nil && origColor.Value != "" {
		if strings.HasPrefix(origColor.Value, "rgb") || strings.HasPrefix(origColor.Value, "hsl") {
			color.Value = origColor.Value
		} else {
			color.Value = "rgb"
		}
	}
	return color
}

// Color creation functions

// ColorRGB creates a color from RGB values
func ColorRGB(r, g, b any) any {
	a := 1.0
	
	// Handle comma-less syntax (e.g., rgb(0 128 255 / 50%))
	if expr, ok := r.(*Expression); ok && len(expr.Value) >= 3 {
		r = expr.Value[0]
		g = expr.Value[1]
		b = expr.Value[2]
		
		// Check if the third value is an operation (for alpha)
		if op, ok := b.(*Operation); ok {
			b = op.Operands[0]
			if len(op.Operands) > 1 {
				if aVal, err := number(op.Operands[1]); err == nil {
					a = aVal
				}
			}
		}
	}
	
	color := ColorRGBA(r, g, b, a)
	if c, ok := color.(*Color); ok {
		c.Value = "rgb"
		return c
	}
	return color
}

// ColorRGBA creates a color from RGBA values
func ColorRGBA(r, g, b, a any) any {
	// If first argument is already a Color, extract RGBA with optional new alpha
	if color, ok := r.(*Color); ok {
		alpha := color.Alpha
		if g != nil {
			if aVal, err := number(g); err == nil {
				alpha = aVal
			}
		}
		return NewColor(color.RGB, alpha, "rgba")
	}
	
	// Convert RGB values
	rVal, err := scaled(r, 255)
	if err != nil {
		return nil
	}
	gVal, err := scaled(g, 255)
	if err != nil {
		return nil
	}
	bVal, err := scaled(b, 255)
	if err != nil {
		return nil
	}
	aVal, err := number(a)
	if err != nil {
		return nil
	}
	
	return NewColor([]float64{rVal, gVal, bVal}, aVal, "rgba")
}

// ColorHSL creates a color from HSL values
func ColorHSL(h, s, l any) any {
	a := 1.0
	
	// Handle comma-less syntax
	if expr, ok := h.(*Expression); ok && len(expr.Value) >= 3 {
		h = expr.Value[0]
		s = expr.Value[1]
		l = expr.Value[2]
		
		if op, ok := l.(*Operation); ok {
			l = op.Operands[0]
			if len(op.Operands) > 1 {
				if aVal, err := number(op.Operands[1]); err == nil {
					a = aVal
				}
			}
		}
	}
	
	color := ColorHSLA(h, s, l, a)
	if c, ok := color.(*Color); ok {
		c.Value = "hsl"
		return c
	}
	return color
}

// ColorHSLA creates a color from HSLA values
func ColorHSLA(h, s, l, a any) any {
	// If first argument is already a Color, return it with optional new alpha
	if color, ok := h.(*Color); ok {
		alpha := color.Alpha
		if s != nil {
			if aVal, err := number(s); err == nil {
				alpha = aVal
			}
		}
		return NewColor(color.RGB, alpha, "hsla")
	}
	
	hVal, err := number(h)
	if err != nil {
		return nil
	}
	sVal, err := number(s)
	if err != nil {
		return nil
	}
	lVal, err := number(l)
	if err != nil {
		return nil
	}
	aVal, err := number(a)
	if err != nil {
		return nil
	}
	
	return colorHSLA(hVal, sVal, lVal, aVal)
}

// colorHSLA is the internal implementation of HSLA color creation
func colorHSLA(h, s, l, a float64) *Color {
	h = math.Mod(h, 360) / 360
	s = clampUnit(s)
	l = clampUnit(l)
	a = clampUnit(a)
	
	var m1, m2 float64
	
	if l <= 0.5 {
		m2 = l * (s + 1)
	} else {
		m2 = l + s - l*s
	}
	m1 = l*2 - m2
	
	hue := func(h float64) float64 {
		if h < 0 {
			h += 1
		} else if h > 1 {
			h -= 1
		}
		
		if h*6 < 1 {
			return m1 + (m2-m1)*h*6
		} else if h*2 < 1 {
			return m2
		} else if h*3 < 2 {
			return m1 + (m2-m1)*(2.0/3.0-h)*6
		}
		return m1
	}
	
	rgb := []float64{
		hue(h+1.0/3.0) * 255,
		hue(h) * 255,
		hue(h-1.0/3.0) * 255,
	}
	
	return NewColor(rgb, a, "hsla")
}

// ColorHSV creates a color from HSV values
func ColorHSV(h, s, v any) any {
	return ColorHSVA(h, s, v, 1.0)
}

// ColorHSVA creates a color from HSVA values
func ColorHSVA(h, s, v, a any) any {
	hVal, err := number(h)
	if err != nil {
		return nil
	}
	sVal, err := number(s)
	if err != nil {
		return nil
	}
	vVal, err := number(v)
	if err != nil {
		return nil
	}
	aVal, err := number(a)
	if err != nil {
		return nil
	}
	
	h = math.Mod(hVal, 360)
	s = sVal
	v = vVal
	
	i := math.Floor(hVal / 60)
	f := hVal/60 - i
	i = math.Mod(i, 6)
	
	vs := []float64{
		vVal,
		vVal * (1 - sVal),
		vVal * (1 - f*sVal),
		vVal * (1 - (1-f)*sVal),
	}
	
	perm := [][]int{
		{0, 3, 1},
		{2, 0, 1},
		{1, 0, 3},
		{1, 2, 0},
		{3, 1, 0},
		{0, 1, 2},
	}
	
	idx := int(i)
	if idx >= 0 && idx < len(perm) {
		return ColorRGBA(
			vs[perm[idx][0]]*255,
			vs[perm[idx][1]]*255,
			vs[perm[idx][2]]*255,
			aVal,
		)
	}
	
	return nil
}

// ColorARGB returns the color in ARGB hex format
func ColorARGB(color any) any {
	if c, ok := color.(*Color); ok {
		return NewAnonymous(c.ToARGB(), 0, nil, false, false, nil)
	}
	return nil
}

// ColorFunction parses a color from a hex string
func ColorFunction(colorStr any) any {
	if quoted, ok := colorStr.(*Quoted); ok {
		colorStr = quoted.Value
	}
	
	if str, ok := colorStr.(string); ok {
		// Remove quotes if present
		str = strings.Trim(str, "\"'")
		
		// Try to parse as hex color
		if strings.HasPrefix(str, "#") {
			// This would need Color.FromKeyword or similar
			// For now, return nil
			// TODO: Implement color parsing from hex
		}
	}
	
	return nil
}

// Color channel extraction functions

// ColorRed extracts the red channel
func ColorRed(color any) any {
	if c, ok := color.(*Color); ok {
		return makeDimension(c.RGB[0], nil)
	}
	return nil
}

// ColorGreen extracts the green channel
func ColorGreen(color any) any {
	if c, ok := color.(*Color); ok {
		return makeDimension(c.RGB[1], nil)
	}
	return nil
}

// ColorBlue extracts the blue channel
func ColorBlue(color any) any {
	if c, ok := color.(*Color); ok {
		return makeDimension(c.RGB[2], nil)
	}
	return nil
}

// ColorAlpha extracts the alpha channel
func ColorAlpha(color any) any {
	if c, ok := color.(*Color); ok {
		return makeDimension(c.Alpha, nil)
	}
	return nil
}

// ColorHue extracts the hue (HSL)
func ColorHue(color any) any {
	if c, ok := color.(*Color); ok {
		hsl := c.ToHSL()
		return makeDimension(hsl.H, nil)
	}
	return nil
}

// ColorSaturation extracts the saturation (HSL)
func ColorSaturation(color any) any {
	if c, ok := color.(*Color); ok {
		hsl := c.ToHSL()
		// Convert to percentage
		return makeDimension(hsl.S*100, NewUnit([]string{"%"}, nil, ""))
	}
	return nil
}

// ColorLightness extracts the lightness (HSL)
func ColorLightness(color any) any {
	if c, ok := color.(*Color); ok {
		hsl := c.ToHSL()
		// Convert to percentage
		return makeDimension(hsl.L*100, NewUnit([]string{"%"}, nil, ""))
	}
	return nil
}

// ColorHSVHue extracts the hue (HSV)
func ColorHSVHue(color any) any {
	if c, ok := color.(*Color); ok {
		hsv := c.ToHSV()
		return makeDimension(hsv.H, nil)
	}
	return nil
}

// ColorHSVSaturation extracts the saturation (HSV)
func ColorHSVSaturation(color any) any {
	if c, ok := color.(*Color); ok {
		hsv := c.ToHSV()
		// Convert to percentage
		return makeDimension(hsv.S*100, NewUnit([]string{"%"}, nil, ""))
	}
	return nil
}

// ColorHSVValue extracts the value (HSV)
func ColorHSVValue(color any) any {
	if c, ok := color.(*Color); ok {
		hsv := c.ToHSV()
		// Convert to percentage
		return makeDimension(hsv.V*100, NewUnit([]string{"%"}, nil, ""))
	}
	return nil
}

// ColorLuma calculates the luma value
func ColorLuma(color any) any {
	if c, ok := color.(*Color); ok {
		luma := c.Luma()
		// Convert to percentage
		return makeDimension(luma*100, NewUnit([]string{"%"}, nil, ""))
	}
	return nil
}

// ColorLuminance is an alias for luma
func ColorLuminance(color any) any {
	return ColorLuma(color)
}

// Color manipulation functions

// ColorSaturate increases saturation
func ColorSaturate(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		hsl := c.ToHSL()
		if methodStr == "absolute" {
			hsl.S = hsl.S + amountVal
		} else {
			hsl.S = hsl.S + hsl.S*amountVal
		}
		hsl.S = clampUnit(hsl.S)
		
		return hslaHelper(c, hsl.H, hsl.S, hsl.L, hsl.A)
	}
	return nil
}

// ColorDesaturate decreases saturation
func ColorDesaturate(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		hsl := c.ToHSL()
		if methodStr == "absolute" {
			hsl.S = hsl.S - amountVal
		} else {
			hsl.S = hsl.S - hsl.S*amountVal
		}
		hsl.S = clampUnit(hsl.S)
		
		return hslaHelper(c, hsl.H, hsl.S, hsl.L, hsl.A)
	}
	return nil
}

// ColorLighten increases lightness
func ColorLighten(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		hsl := c.ToHSL()
		if methodStr == "absolute" {
			hsl.L = hsl.L + amountVal
		} else {
			hsl.L = hsl.L + hsl.L*amountVal
		}
		hsl.L = clampUnit(hsl.L)
		
		return hslaHelper(c, hsl.H, hsl.S, hsl.L, hsl.A)
	}
	return nil
}

// ColorDarken decreases lightness
func ColorDarken(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		hsl := c.ToHSL()
		if methodStr == "absolute" {
			hsl.L = hsl.L - amountVal
		} else {
			hsl.L = hsl.L - hsl.L*amountVal
		}
		hsl.L = clampUnit(hsl.L)
		
		return hslaHelper(c, hsl.H, hsl.S, hsl.L, hsl.A)
	}
	return nil
}

// ColorFadeIn increases opacity
func ColorFadeIn(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		alpha := c.Alpha
		if methodStr == "absolute" {
			alpha = alpha + amountVal
		} else {
			alpha = alpha + alpha*amountVal
		}
		alpha = clampUnit(alpha)
		
		return NewColor(c.RGB, alpha, c.Value)
	}
	return nil
}

// ColorFadeOut decreases opacity
func ColorFadeOut(color, amount any, method ...any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		// Default to relative method
		var methodStr string
		if len(method) > 0 {
			if s, ok := method[0].(string); ok {
				methodStr = s
			}
		}
		
		alpha := c.Alpha
		if methodStr == "absolute" {
			alpha = alpha - amountVal
		} else {
			alpha = alpha - alpha*amountVal
		}
		alpha = clampUnit(alpha)
		
		return NewColor(c.RGB, alpha, c.Value)
	}
	return nil
}

// ColorFade sets opacity to a specific value
func ColorFade(color, amount any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		return NewColor(c.RGB, clampUnit(amountVal), c.Value)
	}
	return nil
}

// ColorSpin rotates the hue
func ColorSpin(color, amount any) any {
	if c, ok := color.(*Color); ok {
		amountVal, err := number(amount)
		if err != nil {
			return nil
		}
		
		hsl := c.ToHSL()
		hue := math.Mod(hsl.H+amountVal, 360)
		if hue < 0 {
			hue += 360
		}
		hsl.H = hue
		
		return hslaHelper(c, hsl.H, hsl.S, hsl.L, hsl.A)
	}
	return nil
}

// ColorMix mixes two colors
func ColorMix(color1, color2, weight any) any {
	c1, ok1 := color1.(*Color)
	c2, ok2 := color2.(*Color)
	if !ok1 || !ok2 {
		return nil
	}
	
	// Default weight is 50%
	w := 0.5
	if weight != nil {
		if wVal, err := number(weight); err == nil {
			w = wVal
		}
	}
	
	// Calculate weight considering alpha
	p := w
	w1 := w * 2 - 1
	a := c1.Alpha - c2.Alpha
	
	var w2 float64
	if w1*a == -1 {
		w2 = w1
	} else {
		w2 = (w1 + a) / (1 + w1*a)
	}
	w2 = (w2 + 1) / 2
	w1 = 1 - w2
	
	// Mix RGB values
	rgb := make([]float64, 3)
	for i := 0; i < 3; i++ {
		rgb[i] = c1.RGB[i]*w2 + c2.RGB[i]*w1
	}
	
	// Mix alpha
	alpha := c1.Alpha*p + c2.Alpha*(1-p)
	
	return NewColor(rgb, alpha, "")
}

// ColorGreyscale converts to grayscale
func ColorGreyscale(color any) any {
	if c, ok := color.(*Color); ok {
		return ColorDesaturate(c, 1.0)
	}
	return nil
}

// ColorGrayscale is an alias for greyscale
func ColorGrayscale(color any) any {
	return ColorGreyscale(color)
}

// ColorContrast chooses a contrasting color
func ColorContrast(color, dark, light, threshold any) any {
	c, ok := color.(*Color)
	if !ok {
		return nil
	}
	
	// Default colors
	lightColor := NewColor([]float64{255, 255, 255}, 1.0, "")
	darkColor := NewColor([]float64{0, 0, 0}, 1.0, "")
	
	if light != nil {
		if lc, ok := light.(*Color); ok {
			lightColor = lc
		}
	}
	if dark != nil {
		if dc, ok := dark.(*Color); ok {
			darkColor = dc
		}
	}
	
	// Default threshold
	t := 0.43
	if threshold != nil {
		if tVal, err := number(threshold); err == nil {
			t = tVal
		}
	}
	
	// Compare luma
	if c.Luma() < t {
		return lightColor
	}
	return darkColor
}

// ColorTint mixes with white
func ColorTint(color, amount any) any {
	white := NewColor([]float64{255, 255, 255}, 1.0, "")
	return ColorMix(white, color, amount)
}

// ColorShade mixes with black
func ColorShade(color, amount any) any {
	black := NewColor([]float64{0, 0, 0}, 1.0, "")
	return ColorMix(black, color, amount)
}

// GetColorFunctions returns the color function registry
func GetColorFunctions() map[string]any {
	return map[string]any{
		// Color creation
		"rgb":    ColorRGB,
		"rgba":   ColorRGBA,
		"hsl":    ColorHSL,
		"hsla":   ColorHSLA,
		"hsv":    ColorHSV,
		"hsva":   ColorHSVA,
		"argb":   ColorARGB,
		"color":  ColorFunction,
		
		// Channel extraction
		"red":           ColorRed,
		"green":         ColorGreen,
		"blue":          ColorBlue,
		"alpha":         ColorAlpha,
		"hue":           ColorHue,
		"saturation":    ColorSaturation,
		"lightness":     ColorLightness,
		"hsvhue":        ColorHSVHue,
		"hsvsaturation": ColorHSVSaturation,
		"hsvvalue":      ColorHSVValue,
		"luma":          ColorLuma,
		"luminance":     ColorLuminance,
		
		// Color manipulation
		"saturate":   ColorSaturate,
		"desaturate": ColorDesaturate,
		"lighten":    ColorLighten,
		"darken":     ColorDarken,
		"fadein":     ColorFadeIn,
		"fadeout":    ColorFadeOut,
		"fade":       ColorFade,
		"spin":       ColorSpin,
		"mix":        ColorMix,
		"greyscale":  ColorGreyscale,
		"grayscale":  ColorGrayscale,
		"contrast":   ColorContrast,
		"tint":       ColorTint,
		"shade":      ColorShade,
	}
}

// GetWrappedColorFunctions returns color functions for registry
func GetWrappedColorFunctions() map[string]interface{} {
	return GetColorFunctions()
}