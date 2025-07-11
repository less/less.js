package less_go


// DefaultFunc represents the default function with value and error state
type DefaultFunc struct {
	value_ any
	error_ any
}

// NewDefaultFunc creates a new DefaultFunc instance
func NewDefaultFunc() *DefaultFunc {
	return &DefaultFunc{
		value_: nil,
		error_: nil,
	}
}

// Eval evaluates the default function, returning Keyword.True/False or throwing an error
func (d *DefaultFunc) Eval() any {
	v := d.value_
	e := d.error_
	
	if e != nil {
		if err, ok := e.(error); ok {
			panic(err)
		}
		panic(e)
	}
	
	if !IsNullOrUndefined(v) {
		// In Go, we need to check truthiness similar to JavaScript
		if isTruthy(v) {
			return KeywordTrue
		}
		return KeywordFalse
	}
	
	return nil
}

// Value sets the value_ field
func (d *DefaultFunc) Value(v any) {
	d.value_ = v
}

// Error sets the error_ field  
func (d *DefaultFunc) Error(e any) {
	d.error_ = e
}

// Reset sets both value_ and error_ to nil
func (d *DefaultFunc) Reset() {
	d.value_ = nil
	d.error_ = nil
}

// isTruthy checks if a value is truthy according to JavaScript rules
func isTruthy(v any) bool {
	if v == nil {
		return false
	}
	
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case int8:
		return val != 0
	case int16:
		return val != 0
	case int32:
		return val != 0
	case int64:
		return val != 0
	case uint:
		return val != 0
	case uint8:
		return val != 0
	case uint16:
		return val != 0
	case uint32:
		return val != 0
	case uint64:
		return val != 0
	case float32:
		return val != 0 && !isNaN(float64(val))
	case float64:
		return val != 0 && !isNaN(val)
	case string:
		return val != ""
	default:
		// For all other types (objects, arrays, functions, etc.), they are truthy
		return true
	}
}

// isNaN checks if a float64 is NaN
func isNaN(f float64) bool {
	return f != f
} 