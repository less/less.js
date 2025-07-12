package less_go

import (
	"math"
)

// MathFunctions provides all the mathematical functions that were in math.js
var MathFunctions = map[string]func(*Dimension) (*Dimension, error){
	"ceil":  Ceil,
	"floor": Floor,
	"sqrt":  Sqrt,
	"abs":   Abs,
	"tan":   Tan,
	"sin":   Sin,
	"cos":   Cos,
	"atan":  Atan,
	"asin":  Asin,
	"acos":  Acos,
}

// Ceil rounds up to the nearest integer
func Ceil(n *Dimension) (*Dimension, error) {
	return MathHelper(math.Ceil, nil, n)
}

// Floor rounds down to the nearest integer
func Floor(n *Dimension) (*Dimension, error) {
	return MathHelper(math.Floor, nil, n)
}

// Sqrt calculates the square root
func Sqrt(n *Dimension) (*Dimension, error) {
	return MathHelper(math.Sqrt, nil, n)
}

// Abs returns the absolute value
func Abs(n *Dimension) (*Dimension, error) {
	return MathHelper(math.Abs, nil, n)
}

// Tan calculates the tangent and returns with empty unit
func Tan(n *Dimension) (*Dimension, error) {
	emptyUnit := NewUnit(nil, nil, "")
	return MathHelper(math.Tan, emptyUnit, n)
}

// Sin calculates the sine and returns with empty unit
func Sin(n *Dimension) (*Dimension, error) {
	emptyUnit := NewUnit(nil, nil, "")
	return MathHelper(math.Sin, emptyUnit, n)
}

// Cos calculates the cosine and returns with empty unit
func Cos(n *Dimension) (*Dimension, error) {
	emptyUnit := NewUnit(nil, nil, "")
	return MathHelper(math.Cos, emptyUnit, n)
}

// Atan calculates the arctangent and returns with rad unit
func Atan(n *Dimension) (*Dimension, error) {
	radUnit := NewUnit([]string{"rad"}, nil, "rad")
	return MathHelper(math.Atan, radUnit, n)
}

// Asin calculates the arcsine and returns with rad unit
func Asin(n *Dimension) (*Dimension, error) {
	radUnit := NewUnit([]string{"rad"}, nil, "rad")
	return MathHelper(math.Asin, radUnit, n)
}

// Acos calculates the arccosine and returns with rad unit
func Acos(n *Dimension) (*Dimension, error) {
	radUnit := NewUnit([]string{"rad"}, nil, "rad")
	return MathHelper(math.Acos, radUnit, n)
}

// Round rounds to a specified number of decimal places
// If f is nil or undefined, rounds to nearest integer (0 decimal places)
func Round(n *Dimension, f *Dimension) (*Dimension, error) {
	var fraction float64
	if f == nil {
		fraction = 0
	} else {
		fraction = f.Value
	}

	// Use a closure to create the rounding function
	roundFunc := func(num float64) float64 {
		// JavaScript's toFixed rounds half values away from zero
		// We need to implement this behavior manually
		multiplier := math.Pow(10, fraction)
		
		// Handle the rounding with proper half-away-from-zero behavior
		var rounded float64
		if num >= 0 {
			rounded = math.Floor(num*multiplier + 0.5) / multiplier
		} else {
			rounded = math.Ceil(num*multiplier - 0.5) / multiplier
		}
		
		return rounded
	}

	return MathHelper(roundFunc, nil, n)
}