package less_go

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// formatNumber formats a number to remove unnecessary decimal places
func formatNumber(n float64) string {
	// Round to 8 decimal places to avoid floating point precision issues
	rounded := math.Round(n*100000000) / 100000000
	
	// If the number is effectively an integer, return it without decimals
	if rounded == math.Floor(rounded) {
		return fmt.Sprintf("%.0f", rounded)
	}
	
	// Otherwise, format with up to 8 decimal places, trimming trailing zeros
	s := fmt.Sprintf("%.8f", rounded)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	return s
}

// Color represents a color node in the Less AST
type Color struct {
	*Node
	RGB   []float64
	Alpha float64
	Value string
}

// NewColor creates a new Color instance
func NewColor(rgb any, alpha float64, originalForm string) *Color {
	c := &Color{
		Node:  NewNode(),
		RGB:   []float64{},
		Alpha: 1.0, // Default to 1.0 like JavaScript
	}

	// Assign the provided alpha value, defaulting handled by initialization
	c.Alpha = alpha

	if originalForm != "" {
		c.Value = originalForm
	}

	switch v := rgb.(type) {
	case []float64:
		if len(v) > 0 {
			// Create a copy to avoid shared slice references
			c.RGB = make([]float64, len(v))
			copy(c.RGB, v)
		}
	case string:
		if v == "" {
			// Handle empty string like JavaScript
			c.RGB = []float64{}
		} else if len(v) >= 6 {
			// Handle 6-digit hex
			c.RGB = make([]float64, 3)
			for i := 0; i < 3; i++ {
				val, err := strconv.ParseInt(v[i*2:i*2+2], 16, 64)
				if err != nil {
					// Handle invalid hex like JavaScript
					c.RGB = []float64{math.NaN(), math.NaN(), math.NaN()}
					return c
				}
				c.RGB[i] = float64(val)
			}
			// Handle alpha if present (8-digit hex)
			if len(v) >= 8 {
				val, _ := strconv.ParseInt(v[6:8], 16, 64)
				c.Alpha = float64(val) / 255
			}
		} else if len(v) >= 3 {
			// Handle 3-digit hex
			c.RGB = make([]float64, 3)
			for i := 0; i < 3; i++ {
				val, err := strconv.ParseInt(string(v[i])+string(v[i]), 16, 64)
				if err != nil {
					// Handle invalid hex like JavaScript
					c.RGB = []float64{math.NaN(), math.NaN(), math.NaN()}
					return c
				}
				c.RGB[i] = float64(val)
			}
			// Handle alpha if present (4-digit hex)
			if len(v) >= 4 {
				val, _ := strconv.ParseInt(string(v[3])+string(v[3]), 16, 64)
				c.Alpha = float64(val) / 255
			}
		} else if len(v) == 2 {
			// Handle 2-digit hex (malformed)
			val, err := strconv.ParseInt(v+v, 16, 64)
			if err != nil {
				// Handle invalid hex like JavaScript
				c.RGB = []float64{math.NaN(), math.NaN(), math.NaN()}
				return c
			}
			c.RGB = []float64{float64(val), float64(val), float64(val)}
		} else if len(v) == 1 {
			// Handle 1-digit hex (malformed)
			val, err := strconv.ParseInt(v+v, 16, 64)
			if err != nil {
				// Handle invalid hex like JavaScript
				c.RGB = []float64{math.NaN(), math.NaN(), math.NaN()}
				return c
			}
			c.RGB = []float64{float64(val), float64(val), float64(val)}
		} else {
			// Handle malformed hex strings < 3 digits (like JavaScript)
			c.RGB = []float64{} // Initialize RGB slice
			for i, char := range v {
				if i >= 3 { // JavaScript logic only considers first 3 chars for RGB
					break
				}
				hexChar := string(char) + string(char)
				val, err := strconv.ParseInt(hexChar, 16, 64)
				if err != nil {
					// Handle invalid hex char like JavaScript might implicitly (by producing NaN later)
					// Explicitly set NaN here for clarity.
					c.RGB = []float64{math.NaN(), math.NaN(), math.NaN()}
					return c // Early exit on error
				}
				c.RGB = append(c.RGB, float64(val))
				// Note: JS alpha logic in this specific block (`i >= 3`)
				// doesn't apply here because lengths 4+ are handled above.
				// Default alpha of 1.0 remains correct for lengths 1, 2.
			}
			// Pad RGB with 0 if it has less than 3 components after parsing
			// This step might be needed depending on how downstream functions expect RGB.
			// Less.js seems tolerant of shorter arrays in some operations, but CSS output might default.
			// Let's omit explicit padding for now to strictly match the JS array construction.
			// if len(c.RGB) < 3 {
			//     for i := len(c.RGB); i < 3; i++ {
			//         c.RGB = append(c.RGB, 0) // Pad with 0? Or NaN? JS might leave it short.
			//     }
			// }
		}
	}

	return c
}

// Luma calculates the relative luminance of the color
func (c *Color) Luma() float64 {
	if len(c.RGB) == 0 {
		return 0
	}
	r := c.RGB[0] / 255
	g := c.RGB[1] / 255
	b := c.RGB[2] / 255

	r = adjustGamma(r)
	g = adjustGamma(g)
	b = adjustGamma(b)

	return 0.2126*r + 0.7152*g + 0.0722*b
}

// GenCSS generates CSS representation
func (c *Color) GenCSS(context any, output *CSSOutput) {
	output.Add(c.ToCSS(context), nil, nil)
}

// ToCSS generates CSS string representation
func (c *Color) ToCSS(context any) string {
	if len(c.RGB) == 0 {
		return "#000000"
	}

	// Handle NaN values
	if len(c.RGB) == 3 {
		hasNaN := false
		for i := 0; i < 3; i++ {
			if math.IsNaN(c.RGB[i]) {
				hasNaN = true
				break
			}
		}
		if hasNaN {
			return "#NaNNaNNaN"
		}
	}

	compress := false
	if ctx, ok := context.(map[string]any); ok {
		if comp, ok := ctx["compress"].(bool); ok {
			compress = comp
		}
	}

	alpha := c.Fround(context, c.Alpha)
	var colorFunction string
	var args []any

	// Handle malformed hex strings
	if strings.HasPrefix(c.Value, "#") {
		hex := c.Value[1:]
		if len(hex) == 3 || len(hex) == 6 {
			return c.Value
		}
	}

	if c.Value != "" {
		if strings.HasPrefix(c.Value, "rgb") {
			if alpha < 1 {
				colorFunction = "rgba"
			}
			// Note: JavaScript doesn't set colorFunction to "rgb" here, it leaves it empty
		} else if strings.HasPrefix(c.Value, "hsl") {
			if alpha < 1 {
				colorFunction = "hsla"
			} else {
				colorFunction = "hsl"
			}
		} else {
			return c.Value
		}
	} else if alpha < 1 {
		colorFunction = "rgba"
	}

	switch colorFunction {
	case "rgba":
		for _, v := range c.RGB {
			args = append(args, clamp(math.Round(v), 255))
		}
		args = append(args, clamp(alpha, 1))
	case "rgb":
		for _, v := range c.RGB {
			args = append(args, clamp(math.Round(v), 255))
		}
	case "hsla":
		args = append(args, clamp(alpha, 1))
		fallthrough
	case "hsl":
		hsl := c.ToHSL()
		// Format HSL values with proper precision
		h := c.Fround(context, hsl.H)
		s := c.Fround(context, hsl.S*100)
		l := c.Fround(context, hsl.L*100)
		
		// Format numbers to remove unnecessary decimals
		hStr := formatNumber(h)
		sStr := formatNumber(s) + "%"
		lStr := formatNumber(l) + "%"
		
		args = append([]any{hStr, sStr, lStr}, args...)
	}

	if colorFunction != "" {
		separator := ", "
		if compress {
			separator = ","
		}
		var strArgs []string
		for _, arg := range args {
			strArgs = append(strArgs, fmt.Sprintf("%v", arg))
		}
		return fmt.Sprintf("%s(%s)", colorFunction, strings.Join(strArgs, separator))
	}

	color := c.ToRGB()
	if compress {
		splitColor := strings.Split(color, "")
		if len(splitColor) >= 7 && splitColor[1] == splitColor[2] && splitColor[3] == splitColor[4] && splitColor[5] == splitColor[6] {
			color = fmt.Sprintf("#%s%s%s", splitColor[1], splitColor[3], splitColor[5])
		}
	}

	return color
}

// OperateColor performs color operations
func (c *Color) OperateColor(context any, op string, other *Color) *Color {
	// Handle empty or nil colors
	if other == nil {
		other = NewColor([]float64{}, 1, "")
	}

	// Handle empty RGB slices
	if len(c.RGB) == 0 {
		c.RGB = []float64{0, 0, 0}
	}
	if len(other.RGB) == 0 {
		other.RGB = []float64{0, 0, 0}
	}

	// Handle NaN values
	if len(c.RGB) == 3 && len(other.RGB) == 3 {
		hasNaN := false
		for i := 0; i < 3; i++ {
			if math.IsNaN(c.RGB[i]) || math.IsNaN(other.RGB[i]) {
				hasNaN = true
				break
			}
		}
		if hasNaN {
			return NewColor([]float64{math.NaN(), math.NaN(), math.NaN()}, 1, "")
		}
	}

	rgb := make([]float64, 3)
	// Calculate alpha exactly like JavaScript: alpha = this.alpha * (1 - other.alpha) + other.alpha
	alpha := c.Alpha*(1-other.Alpha) + other.Alpha

	for i := 0; i < 3; i++ {
		rgb[i] = c.Operate(context, op, c.RGB[i], other.RGB[i])
	}

	// Create result with the calculated alpha value
	result := &Color{
		Node:  NewNode(),
		RGB:   rgb,
		Alpha: alpha,
	}
	return result
}

// ToRGB converts color to RGB hex string
func (c *Color) ToRGB() string {
	if len(c.RGB) == 0 {
		return "#000000"
	}
	return toHex(c.RGB)
}

// ToHSL converts color to HSL
func (c *Color) ToHSL() HSL {
	if len(c.RGB) == 0 {
		return HSL{H: 0, S: 0, L: 0, A: c.Alpha}
	}
	r := c.RGB[0] / 255
	g := c.RGB[1] / 255
	b := c.RGB[2] / 255
	a := c.Alpha

	max := math.Max(math.Max(r, g), b)
	min := math.Min(math.Min(r, g), b)
	var h, s float64
	l := (max + min) / 2
	d := max - min

	if max == min {
		h = 0
		s = 0
	} else {
		if l > 0.5 {
			s = d / (2 - max - min)
		} else {
			s = d / (max + min)
		}

		switch max {
		case r:
			if g < b {
				h = (g-b)/d + 6
			} else {
				h = (g - b) / d
			}
		case g:
			h = (b-r)/d + 2
		case b:
			h = (r-g)/d + 4
		}
		h /= 6
	}

	// Round values to match JavaScript precision (6 decimal places)
	return HSL{
		H: math.Round(h*360*1000000) / 1000000,
		S: math.Round(s*1000000) / 1000000,
		L: math.Round(l*1000000) / 1000000,
		A: a,
	}
}

// ToHSV converts color to HSV
func (c *Color) ToHSV() HSV {
	if len(c.RGB) == 0 {
		return HSV{H: 0, S: 0, V: 0, A: c.Alpha}
	}
	r := c.RGB[0] / 255
	g := c.RGB[1] / 255
	b := c.RGB[2] / 255
	a := c.Alpha

	max := math.Max(math.Max(r, g), b)
	min := math.Min(math.Min(r, g), b)
	var h, s float64
	v := max

	d := max - min
	if max == 0 {
		s = 0
	} else {
		s = d / max
	}

	if max == min {
		h = 0
	} else {
		switch max {
		case r:
			if g < b {
				h = (g-b)/d + 6
			} else {
				h = (g - b) / d
			}
		case g:
			h = (b-r)/d + 2
		case b:
			h = (r-g)/d + 4
		}
		h /= 6
	}

	return HSV{
		H: h * 360,
		S: s,
		V: v,
		A: a,
	}
}

// ToARGB converts color to ARGB hex string
func (c *Color) ToARGB() string {
	if len(c.RGB) == 0 {
		return "#00000000"
	}
	argb := make([]float64, 4)
	argb[0] = c.Alpha * 255
	copy(argb[1:], c.RGB)
	return toHex(argb)
}

// Compare compares two colors
func (c *Color) Compare(other *Color) int {
	if other == nil {
		// If the other color is nil, consider them unequal unless this color is also effectively nil (empty)
		if len(c.RGB) == 0 {
			return 0 // Both effectively nil/empty
		}
		return 1 // Not equal
	}

	if len(c.RGB) == 0 && len(other.RGB) == 0 {
		// Both are empty, consider them equal
		return 0
	} else if len(c.RGB) == 0 || len(other.RGB) == 0 {
		// One is empty, the other is not, consider them unequal
		return 1
	}

	// Ensure both have 3 components for comparison after handling empty cases
	if len(c.RGB) != 3 || len(other.RGB) != 3 {
		// This case should ideally not happen if constructors and operations maintain invariants,
		// but handle it defensively as unequal.
		return 1
	}

	if other.RGB[0] == c.RGB[0] &&
		other.RGB[1] == c.RGB[1] &&
		other.RGB[2] == c.RGB[2] &&
		other.Alpha == c.Alpha {
		return 0 // Colors are equal
	}

	return 1 // Colors are not equal
}

// HSL represents HSL color values
type HSL struct {
	H float64
	S float64
	L float64
	A float64
}

// HSV represents HSV color values
type HSV struct {
	H float64
	S float64
	V float64
	A float64
}

// FromKeyword creates a color from a keyword
func FromKeyword(keyword string) *Color {
	key := strings.ToLower(keyword)
	if hex, ok := Colors[key]; ok {
		c := NewColor(hex[1:], 1, "")
		c.Value = keyword
		return c
	}
	if key == "transparent" {
		c := NewColor([]float64{0, 0, 0}, 0, "")
		c.Value = "transparent"
		c.Alpha = 0 // Explicitly set alpha to 0 for transparent
		return c
	}
	return nil
}

// GetType returns the node type
func (c *Color) GetType() string {
	return "Color"
}

// GetAllowRoot returns whether color nodes are allowed at root level
func (c *Color) GetAllowRoot() bool {
	return false
}

// Eval evaluates the color - returns itself
func (c *Color) Eval(context any) any {
	return c
}

// Helper functions
func adjustGamma(n float64) float64 {
	if n <= 0.03928 {
		return n / 12.92
	}
	return math.Pow((n+0.055)/1.055, 2.4)
}

func clamp(v, max float64) float64 {
	return math.Min(math.Max(v, 0), max)
}

func toHex(v []float64) string {
	var hex []string
	// Handle ARGB format (4 values) or RGB format (3 values)
	for i := 0; i < len(v); i++ {
		c := clamp(math.Round(v[i]), 255)
		hex = append(hex, fmt.Sprintf("%02x", int(c)))
	}
	return "#" + strings.Join(hex, "")
} 