package less_go

// No imports needed for this simple helper

// MathHelperError represents an argument error
type MathHelperError struct {
	Type    string
	Message string
}

func (e *MathHelperError) Error() string {
	return e.Message
}

// MathHelper applies a mathematical function to a dimension value
// fn: the mathematical function to apply
// unit: the unit to use for the result (nil means use dimension's unit)
// n: the dimension to operate on
func MathHelper(fn func(float64) float64, unit *Unit, n any) (*Dimension, error) {
	// Validate that n is a Dimension
	dim, ok := n.(*Dimension)
	if !ok {
		return nil, &MathHelperError{
			Type:    "Argument",
			Message: "argument must be a number",
		}
	}

	var resultUnit *Unit
	var workingDim *Dimension = dim

	// Handle unit parameter - matches JavaScript logic: if (unit === null)
	if unit == nil {
		// Use the dimension's unit
		resultUnit = dim.Unit
	} else {
		// Call unify on the dimension and use the provided unit
		workingDim = dim.Unify()
		resultUnit = unit
	}

	// The dimension value is already float64 in Go
	value := workingDim.Value

	// Apply the mathematical function
	result := fn(value)

	// Create and return new Dimension
	return NewDimension(result, resultUnit)
}