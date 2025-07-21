package less_go

import (
	"fmt"
	"math"
)

// MathFunctions provides all the mathematical functions that were in math.js
var MathFunctions = map[string]any{
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
	"round": Round,
}

// MathFunctionWrapper wraps math functions to implement FunctionDefinition interface
type MathFunctionWrapper struct {
	name string
	fn   func(args ...interface{}) (interface{}, error)
}

func (w *MathFunctionWrapper) Call(args ...any) (any, error) {
	return w.fn(args...)
}

func (w *MathFunctionWrapper) CallCtx(ctx *Context, args ...any) (any, error) {
	// Math functions don't need context evaluation
	return w.Call(args...)
}

func (w *MathFunctionWrapper) NeedsEvalArgs() bool {
	// Math functions need evaluated arguments
	return true
}

// Function adapters for different signatures
func wrapUnaryMath(fn func(*Dimension) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) != 1 {
			return nil, fmt.Errorf("function expects 1 argument, got %d", len(args))
		}
		dim, ok := args[0].(*Dimension)
		if !ok {
			return nil, fmt.Errorf("function expects dimension argument")
		}
		return fn(dim)
	}
}

func wrapRound(fn func(*Dimension, *Dimension) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) < 1 || len(args) > 2 {
			return nil, fmt.Errorf("round expects 1 or 2 arguments, got %d", len(args))
		}
		n, ok := args[0].(*Dimension)
		if !ok {
			return nil, fmt.Errorf("round expects dimension as first argument")
		}
		var f *Dimension
		if len(args) == 2 {
			f, ok = args[1].(*Dimension)
			if !ok {
				return nil, fmt.Errorf("round expects dimension as second argument")
			}
		}
		return fn(n, f)
	}
}

// GetWrappedMathFunctions returns math functions wrapped for registry
func GetWrappedMathFunctions() map[string]interface{} {
	wrappedFunctions := make(map[string]interface{})
	
	// Wrap each function with proper interface
	wrappedFunctions["ceil"] = &MathFunctionWrapper{name: "ceil", fn: wrapUnaryMath(Ceil)}
	wrappedFunctions["floor"] = &MathFunctionWrapper{name: "floor", fn: wrapUnaryMath(Floor)}
	wrappedFunctions["sqrt"] = &MathFunctionWrapper{name: "sqrt", fn: wrapUnaryMath(Sqrt)}
	wrappedFunctions["abs"] = &MathFunctionWrapper{name: "abs", fn: wrapUnaryMath(Abs)}
	wrappedFunctions["tan"] = &MathFunctionWrapper{name: "tan", fn: wrapUnaryMath(Tan)}
	wrappedFunctions["sin"] = &MathFunctionWrapper{name: "sin", fn: wrapUnaryMath(Sin)}
	wrappedFunctions["cos"] = &MathFunctionWrapper{name: "cos", fn: wrapUnaryMath(Cos)}
	wrappedFunctions["atan"] = &MathFunctionWrapper{name: "atan", fn: wrapUnaryMath(Atan)}
	wrappedFunctions["asin"] = &MathFunctionWrapper{name: "asin", fn: wrapUnaryMath(Asin)}
	wrappedFunctions["acos"] = &MathFunctionWrapper{name: "acos", fn: wrapUnaryMath(Acos)}
	wrappedFunctions["round"] = &MathFunctionWrapper{name: "round", fn: wrapRound(Round)}
	
	return wrappedFunctions
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

// init registers math functions with the default registry
func init() {
	// Register all math functions
	for name, fn := range GetWrappedMathFunctions() {
		DefaultRegistry.Add(name, fn)
	}
}