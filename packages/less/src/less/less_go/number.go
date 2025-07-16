package less_go

import (
	"fmt"
	"math"
)

// NumberFunctions provides all the number-related functions
var NumberFunctions = map[string]interface{}{
	"min":        Min,
	"max":        Max,
	"convert":    Convert,
	"pi":         Pi,
	"mod":        Mod,
	"pow":        Pow,
	"percentage": Percentage,
}

// NumberFunctionWrapper wraps number functions to implement FunctionDefinition interface
type NumberFunctionWrapper struct {
	name string
	fn   func(args ...interface{}) (interface{}, error)
}

func (w *NumberFunctionWrapper) Call(args ...any) (any, error) {
	return w.fn(args...)
}

func (w *NumberFunctionWrapper) CallCtx(ctx *Context, args ...any) (any, error) {
	// Number functions don't need context evaluation
	return w.Call(args...)
}

func (w *NumberFunctionWrapper) NeedsEvalArgs() bool {
	// Number functions need evaluated arguments
	return true
}

// NumberFunctionAdapters create specific adapters for each function type
func wrapMinMax(fn func(args ...interface{}) (interface{}, error)) func(args ...interface{}) (interface{}, error) {
	return fn
}

func wrapConvert(fn func(val *Dimension, unit *Dimension) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) != 2 {
			return nil, fmt.Errorf("convert expects 2 arguments, got %d", len(args))
		}
		val, ok1 := args[0].(*Dimension)
		unit, ok2 := args[1].(*Dimension)
		if !ok1 || !ok2 {
			return nil, fmt.Errorf("convert expects dimension arguments")
		}
		return fn(val, unit)
	}
}

func wrapPi(fn func() (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		return fn()
	}
}

func wrapMod(fn func(a *Dimension, b *Dimension) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) != 2 {
			return nil, fmt.Errorf("mod expects 2 arguments, got %d", len(args))
		}
		a, ok1 := args[0].(*Dimension)
		b, ok2 := args[1].(*Dimension)
		if !ok1 || !ok2 {
			return nil, fmt.Errorf("mod expects dimension arguments")
		}
		return fn(a, b)
	}
}

func wrapPow(fn func(x interface{}, y interface{}) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) != 2 {
			return nil, fmt.Errorf("pow expects 2 arguments, got %d", len(args))
		}
		return fn(args[0], args[1])
	}
}

func wrapPercentage(fn func(n *Dimension) (*Dimension, error)) func(args ...interface{}) (interface{}, error) {
	return func(args ...interface{}) (interface{}, error) {
		if len(args) != 1 {
			return nil, fmt.Errorf("percentage expects 1 argument, got %d", len(args))
		}
		dim, ok := args[0].(*Dimension)
		if !ok {
			return nil, fmt.Errorf("percentage expects dimension argument")
		}
		return fn(dim)
	}
}

// GetWrappedNumberFunctions returns number functions wrapped with FunctionDefinition interface
func GetWrappedNumberFunctions() map[string]interface{} {
	wrappedFunctions := make(map[string]interface{})
	
	// Wrap each function with proper interface
	wrappedFunctions["min"] = &NumberFunctionWrapper{name: "min", fn: wrapMinMax(Min)}
	wrappedFunctions["max"] = &NumberFunctionWrapper{name: "max", fn: wrapMinMax(Max)}
	wrappedFunctions["convert"] = &NumberFunctionWrapper{name: "convert", fn: wrapConvert(Convert)}
	wrappedFunctions["pi"] = &NumberFunctionWrapper{name: "pi", fn: wrapPi(Pi)}
	wrappedFunctions["mod"] = &NumberFunctionWrapper{name: "mod", fn: wrapMod(Mod)}
	wrappedFunctions["pow"] = &NumberFunctionWrapper{name: "pow", fn: wrapPow(Pow)}
	wrappedFunctions["percentage"] = &NumberFunctionWrapper{name: "percentage", fn: wrapPercentage(Percentage)}
	
	return wrappedFunctions
}

// minMax is the helper function for min and max operations
func minMax(isMin bool, args []interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, &LessError{Type: "Argument", Message: "one or more arguments required"}
	}

	var order []interface{}
	values := make(map[string]int)
	var unitStatic string
	var unitClone string

	for i := 0; i < len(args); i++ {
		current := args[i]
		
		// Check if it's a Dimension
		dim, ok := current.(*Dimension)
		if !ok {
			// Check if it's an array-like value
			if valuer, ok := current.(interface{ GetValue() interface{} }); ok {
				if arr, ok := valuer.GetValue().([]interface{}); ok {
					// Append array values to args
					args = append(args, arr...)
					continue
				}
			}
			return nil, &LessError{Type: "Argument", Message: "incompatible types"}
		}

		// Get unified dimension
		var currentUnified *Dimension
		if dim.Unit.ToString() == "" && unitClone != "" {
			// Create new dimension with unitClone
			clonedUnit := &Unit{Numerator: []string{unitClone}, BackupUnit: unitClone}
			tempDim, _ := NewDimension(dim.Value, clonedUnit)
			currentUnified = tempDim.Unify()
		} else {
			currentUnified = dim.Unify()
		}

		// Determine unit
		unit := currentUnified.Unit.ToString()
		if unit == "" && unitStatic != "" {
			unit = unitStatic
		}

		// Update unitStatic if needed
		if unit != "" && unitStatic == "" {
			unitStatic = unit
		} else if unit != "" && len(order) > 0 {
			firstUnified := order[0].(*Dimension).Unify()
			if firstUnified.Unit.ToString() == "" {
				unitStatic = unit
			}
		}

		// Update unitClone if needed
		if unit != "" && unitClone == "" {
			unitClone = dim.Unit.ToString()
		}

		// Find existing value with same unit
		var j int
		var found bool
		if unitVal, exists := values[""]; exists && unit != "" && unit == unitStatic {
			j = unitVal
			found = true
		} else if unitVal, exists := values[unit]; exists {
			j = unitVal
			found = true
		}

		if !found {
			// Check for incompatible types
			if unitStatic != "" && unit != unitStatic {
				return nil, &LessError{Type: "Argument", Message: "incompatible types"}
			}
			values[unit] = len(order)
			order = append(order, dim)
			continue
		}

		// Get reference unified dimension
		var referenceUnified *Dimension
		refDim := order[j].(*Dimension)
		if refDim.Unit.ToString() == "" && unitClone != "" {
			clonedUnit := &Unit{Numerator: []string{unitClone}, BackupUnit: unitClone}
			tempDim, _ := NewDimension(refDim.Value, clonedUnit)
			referenceUnified = tempDim.Unify()
		} else {
			referenceUnified = refDim.Unify()
		}

		// Compare values
		if (isMin && currentUnified.Value < referenceUnified.Value) ||
			(!isMin && currentUnified.Value > referenceUnified.Value) {
			order[j] = dim
		}
	}

	if len(order) == 1 {
		return order[0], nil
	}

	// Return Anonymous with CSS representation
	var cssArgs []string
	for _, arg := range order {
		if dim, ok := arg.(*Dimension); ok {
			cssArgs = append(cssArgs, dim.ToCSS(nil))
		}
	}
	
	separator := ", "
	if ctx, ok := args[0].(interface{ GetContext() interface{} }); ok {
		if context, ok := ctx.GetContext().(map[string]bool); ok && context["compress"] {
			separator = ","
		}
	}
	
	var fnName string
	if isMin {
		fnName = "min"
	} else {
		fnName = "max"
	}
	
	result := fmt.Sprintf("%s(%s)", fnName, joinStrings(cssArgs, separator))
	return &Anonymous{Value: result}, nil
}

// Min returns the minimum value from the given arguments
func Min(args ...interface{}) (interface{}, error) {
	defer func() {
		if r := recover(); r != nil {
			// Return nil on any panic/error
		}
	}()
	
	result, err := minMax(true, args)
	if err != nil {
		return nil, nil
	}
	return result, nil
}

// Max returns the maximum value from the given arguments
func Max(args ...interface{}) (interface{}, error) {
	defer func() {
		if r := recover(); r != nil {
			// Return nil on any panic/error
		}
	}()
	
	result, err := minMax(false, args)
	if err != nil {
		return nil, nil
	}
	return result, nil
}

// Convert converts a dimension to the specified unit
func Convert(val *Dimension, unit *Dimension) (*Dimension, error) {
	result := val.ConvertTo(unit.Value)
	return result, nil
}

// Pi returns the value of pi as a dimension
func Pi() (*Dimension, error) {
	return NewDimension(math.Pi, nil)
}

// Mod calculates the modulo of two dimensions
func Mod(a *Dimension, b *Dimension) (*Dimension, error) {
	result := math.Mod(a.Value, b.Value)
	return NewDimension(result, a.Unit)
}

// Pow calculates x raised to the power of y
func Pow(x interface{}, y interface{}) (*Dimension, error) {
	var xDim, yDim *Dimension
	var err error

	// Check if both are numbers first (auto-convert like JavaScript)
	xIsNum := false
	yIsNum := false
	
	if _, ok := x.(float64); ok {
		xIsNum = true
	} else if _, ok := x.(int); ok {
		xIsNum = true
	}
	
	if _, ok := y.(float64); ok {
		yIsNum = true
	} else if _, ok := y.(int); ok {
		yIsNum = true
	}
	
	// Both must be numbers or both must be dimensions
	if xIsNum && yIsNum {
		// Auto-convert numbers to dimensions
		if xNum, ok := x.(float64); ok {
			xDim, err = NewDimension(xNum, nil)
			if err != nil {
				return nil, err
			}
		} else if xNum, ok := x.(int); ok {
			xDim, err = NewDimension(float64(xNum), nil)
			if err != nil {
				return nil, err
			}
		}
		
		if yNum, ok := y.(float64); ok {
			yDim, err = NewDimension(yNum, nil)
			if err != nil {
				return nil, err
			}
		} else if yNum, ok := y.(int); ok {
			yDim, err = NewDimension(float64(yNum), nil)
			if err != nil {
				return nil, err
			}
		}
	} else if !xIsNum && !yIsNum {
		// Both must be dimensions
		var ok bool
		xDim, ok = x.(*Dimension)
		if !ok {
			return nil, &LessError{Type: "Argument", Message: "arguments must be numbers"}
		}
		yDim, ok = y.(*Dimension)
		if !ok {
			return nil, &LessError{Type: "Argument", Message: "arguments must be numbers"}
		}
	} else {
		// Mixed types not allowed
		return nil, &LessError{Type: "Argument", Message: "arguments must be numbers"}
	}

	result := math.Pow(xDim.Value, yDim.Value)
	return NewDimension(result, xDim.Unit)
}

// Percentage converts a dimension to a percentage
func Percentage(n *Dimension) (*Dimension, error) {
	percentUnit := &Unit{
		Numerator:  []string{"%"},
		BackupUnit: "%",
	}
	
	return MathHelper(func(num float64) float64 {
		return num * 100
	}, percentUnit, n)
}

// Helper function to join strings
func joinStrings(strs []string, separator string) string {
	result := ""
	for i, str := range strs {
		if i > 0 {
			result += separator
		}
		result += str
	}
	return result
}