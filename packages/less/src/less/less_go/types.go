package less_go

import (
	"fmt"
)

// TypesFunctions implements type checking and unit manipulation functions for Less
type TypesFunctions struct{}

// NewTypesFunctions creates a new TypesFunctions instance
func NewTypesFunctions() *TypesFunctions {
	return &TypesFunctions{}
}

// GetFunctions returns a map of type checking function names to implementations
func (tf *TypesFunctions) GetFunctions() map[string]any {
	return map[string]any{
		"isruleset":    tf.IsRuleset,
		"iscolor":      tf.IsColor,
		"isnumber":     tf.IsNumber,
		"isstring":     tf.IsString,
		"iskeyword":    tf.IsKeyword,
		"isurl":        tf.IsURL,
		"ispixel":      tf.IsPx,
		"ispercentage": tf.IsPercentage,
		"isem":         tf.IsEm,
		"isunit":       tf.IsUnit,
		"unit":         tf.Unit,
		"get-unit":     tf.GetUnit,
	}
}

// isa is a helper function that checks if a value is of a specific type
func (tf *TypesFunctions) isa(n any, typeName string) (*Keyword, error) {
	switch typeName {
	case "DetachedRuleset":
		if _, ok := n.(*DetachedRuleset); ok {
			return KeywordTrue, nil
		}
	case "Color":
		if _, ok := n.(*Color); ok {
			return KeywordTrue, nil
		}
	case "Dimension":
		if _, ok := n.(*Dimension); ok {
			return KeywordTrue, nil
		}
	case "Quoted":
		if _, ok := n.(*Quoted); ok {
			return KeywordTrue, nil
		}
	case "Keyword":
		if _, ok := n.(*Keyword); ok {
			return KeywordTrue, nil
		}
	case "URL":
		if _, ok := n.(*URL); ok {
			return KeywordTrue, nil
		}
	}
	return KeywordFalse, nil
}

// isunit is a helper function that checks if a dimension has a specific unit
func (tf *TypesFunctions) isunit(n any, unit any) (*Keyword, error) {
	if unit == nil {
		return nil, fmt.Errorf("Argument: missing the required second argument to isunit.")
	}

	var unitStr string
	switch u := unit.(type) {
	case string:
		unitStr = u
	case map[string]any:
		if val, ok := u["value"].(string); ok {
			unitStr = val
		} else {
			return nil, fmt.Errorf("Argument: Second argument to isunit should be a unit or a string.")
		}
	case *Quoted:
		unitStr = u.value
	default:
		return nil, fmt.Errorf("Argument: Second argument to isunit should be a unit or a string.")
	}

	if dim, ok := n.(*Dimension); ok {
		if dim.Unit != nil && dim.Unit.Is(unitStr) {
			return KeywordTrue, nil
		}
	}
	return KeywordFalse, nil
}

// IsRuleset checks if the value is a DetachedRuleset
func (tf *TypesFunctions) IsRuleset(n any) (*Keyword, error) {
	return tf.isa(n, "DetachedRuleset")
}

// IsColor checks if the value is a Color
func (tf *TypesFunctions) IsColor(n any) (*Keyword, error) {
	return tf.isa(n, "Color")
}

// IsNumber checks if the value is a Dimension (number)
func (tf *TypesFunctions) IsNumber(n any) (*Keyword, error) {
	return tf.isa(n, "Dimension")
}

// IsString checks if the value is a Quoted string
func (tf *TypesFunctions) IsString(n any) (*Keyword, error) {
	return tf.isa(n, "Quoted")
}

// IsKeyword checks if the value is a Keyword
func (tf *TypesFunctions) IsKeyword(n any) (*Keyword, error) {
	return tf.isa(n, "Keyword")
}

// IsURL checks if the value is a URL
func (tf *TypesFunctions) IsURL(n any) (*Keyword, error) {
	return tf.isa(n, "URL")
}

// IsPx checks if the value is a pixel dimension
func (tf *TypesFunctions) IsPx(n any) (*Keyword, error) {
	return tf.isunit(n, "px")
}

// IsPercentage checks if the value is a percentage dimension
func (tf *TypesFunctions) IsPercentage(n any) (*Keyword, error) {
	return tf.isunit(n, "%")
}

// IsEm checks if the value is an em dimension
func (tf *TypesFunctions) IsEm(n any) (*Keyword, error) {
	return tf.isunit(n, "em")
}

// IsUnit checks if the value is a dimension with the specified unit
func (tf *TypesFunctions) IsUnit(n any, unit any) (*Keyword, error) {
	return tf.isunit(n, unit)
}

// Unit creates a new Dimension with the specified unit
func (tf *TypesFunctions) Unit(val any, unit any) (*Dimension, error) {
	dim, ok := val.(*Dimension)
	if !ok {
		// Check if it's an Operation to provide helpful error message
		if _, isOp := val.(*Operation); isOp {
			return nil, fmt.Errorf("Argument: the first argument to unit must be a number. Have you forgotten parenthesis?")
		}
		return nil, fmt.Errorf("Argument: the first argument to unit must be a number")
	}

	var unitStr string
	if unit == nil {
		unitStr = ""
	} else {
		switch u := unit.(type) {
		case *Keyword:
			unitStr = u.value
		case *Quoted:
			unitStr = u.value
		case string:
			unitStr = u
		default:
			// Try to call ToCSS method if available
			if cssable, ok := u.(interface{ ToCSS(map[string]any) string }); ok {
				unitStr = cssable.ToCSS(map[string]any{"compress": false})
			} else {
				unitStr = ""
			}
		}
	}

	return NewDimension(dim.Value, unitStr)
}

// GetUnit returns the unit of a dimension as an Anonymous value
func (tf *TypesFunctions) GetUnit(n any) (*Anonymous, error) {
	if dim, ok := n.(*Dimension); ok {
		return NewAnonymous(dim.Unit.ToString(), 0, nil, false, false, nil), nil
	}
	// Return empty unit for non-dimensions
	return NewAnonymous("", 0, nil, false, false, nil), nil
}