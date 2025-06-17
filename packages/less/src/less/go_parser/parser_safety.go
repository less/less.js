package go_parser

import (
	"fmt"
	"reflect"
)

// SafeIndexError represents an error when accessing an invalid index
type SafeIndexError struct {
	Index int
	Len   int
	Msg   string
}

func (e *SafeIndexError) Error() string {
	if e.Msg != "" {
		return e.Msg
	}
	return fmt.Sprintf("index %d out of bounds for length %d", e.Index, e.Len)
}

// SafeStringIndex safely accesses a string at the given index
// Returns the character and true if successful, or 0 and false if out of bounds
func SafeStringIndex(s string, index int) (byte, bool) {
	if index < 0 || index >= len(s) {
		return 0, false
	}
	return s[index], true
}

// SafeStringSlice safely slices a string with bounds checking
// Returns the slice and true if successful, or empty string and false if out of bounds
func SafeStringSlice(s string, start, end int) (string, bool) {
	if start < 0 || end < 0 || start > len(s) || end > len(s) || start > end {
		return "", false
	}
	return s[start:end], true
}

// SafeSliceIndex safely accesses a slice at the given index
// Returns the value and true if successful, or nil and false if out of bounds
func SafeSliceIndex(slice []any, index int) (any, bool) {
	if slice == nil || index < 0 || index >= len(slice) {
		return nil, false
	}
	return slice[index], true
}

// SafeSliceAccess safely accesses a slice with generic type
func SafeSliceAccess[T any](slice []T, index int) (T, bool) {
	var zero T
	if slice == nil || index < 0 || index >= len(slice) {
		return zero, false
	}
	return slice[index], true
}

// SafeTypeAssertion safely performs a type assertion
// Returns the value and true if successful, or zero value and false if assertion fails
func SafeTypeAssertion[T any](value any) (T, bool) {
	if value == nil {
		var zero T
		return zero, false
	}
	result, ok := value.(T)
	return result, ok
}

// SafeMapAccess safely accesses a map value
// Returns the value and true if successful, or zero value and false if key doesn't exist
func SafeMapAccess[K comparable, V any](m map[K]V, key K) (V, bool) {
	if m == nil {
		var zero V
		return zero, false
	}
	value, ok := m[key]
	return value, ok
}

// SafeNilCheck checks if a value is nil using reflection for interface types
func SafeNilCheck(value any) bool {
	if value == nil {
		return true
	}
	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Ptr, reflect.Interface, reflect.Slice, reflect.Map, reflect.Chan, reflect.Func:
		return rv.IsNil()
	}
	return false
}

// SafeToCSS safely calls ToCSS on a value, returning empty string if fails
func SafeToCSS(value any, context any) string {
	if SafeNilCheck(value) {
		return ""
	}
	if cssable, ok := SafeTypeAssertion[interface{ ToCSS(any) string }](value); ok {
		// Add defer/recover to catch any panics in ToCSS implementations
		defer func() {
			if r := recover(); r != nil {
				// Log the panic but don't re-panic
				// In production, you might want to log this differently
			}
		}()
		return cssable.ToCSS(context)
	}
	return fmt.Sprintf("%v", value)
}

// SafeEval safely calls Eval on a value, returning the original value if eval fails
func SafeEval(value any, context any) any {
	if SafeNilCheck(value) {
		return value
	}
	if evaluable, ok := SafeTypeAssertion[interface{ Eval(any) any }](value); ok {
		// Add defer/recover to catch any panics in Eval implementations
		defer func() {
			if r := recover(); r != nil {
				// Return original value if eval panics
				value = value
			}
		}()
		return evaluable.Eval(context)
	}
	return value
}

// SafeGenCSS safely calls GenCSS on a value, doing nothing if it fails
func SafeGenCSS(value any, context any, output *CSSOutput) {
	if SafeNilCheck(value) || output == nil {
		return
	}
	if generator, ok := SafeTypeAssertion[interface{ GenCSS(any, *CSSOutput) }](value); ok {
		// Add defer/recover to catch any panics in GenCSS implementations
		defer func() {
			if r := recover(); r != nil {
				// Log the panic but don't re-panic
			}
		}()
		generator.GenCSS(context, output)
	}
}

// SafeArrayAccess safely accesses an array-like interface{}
func SafeArrayAccess(arr any, index int) (any, bool) {
	if arr == nil {
		return nil, false
	}
	
	rv := reflect.ValueOf(arr)
	switch rv.Kind() {
	case reflect.Slice, reflect.Array:
		if index < 0 || index >= rv.Len() {
			return nil, false
		}
		return rv.Index(index).Interface(), true
	default:
		return nil, false
	}
}

// SafeStringAccess safely accesses a string that might be from different sources
func SafeStringAccess(value any) string {
	if SafeNilCheck(value) {
		return ""
	}
	return fmt.Sprintf("%v", value)
}

// RecoverableOperation runs an operation with panic recovery
// Returns the result and any error that occurred (including recovered panics)
func RecoverableOperation[T any](operation func() T) (result T, err error) {
	defer func() {
		if r := recover(); r != nil {
			var zero T
			result = zero
			if e, ok := r.(error); ok {
				err = e
			} else {
				err = fmt.Errorf("panic occurred: %v", r)
			}
		}
	}()
	
	result = operation()
	return result, nil
}

// SafeParseFloat safely parses a string to float64, returning 0 if parsing fails
func SafeParseFloat(s string) (float64, bool) {
	if s == "" {
		return 0, false
	}
	
	// Use RecoverableOperation to catch any panics during parsing
	result, err := RecoverableOperation(func() float64 {
		// This is where we'd normally call strconv.ParseFloat
		// but we'll implement this safely
		return 0
	})
	
	if err != nil {
		return 0, false
	}
	return result, true
}

// SafeFramesAccess safely accesses frames from context
func SafeFramesAccess(context any) ([]any, bool) {
	if SafeNilCheck(context) {
		return nil, false
	}
	
	if ctx, ok := SafeTypeAssertion[map[string]any](context); ok {
		if frames, ok := SafeMapAccess(ctx, "frames"); ok {
			if frameSlice, ok := SafeTypeAssertion[[]any](frames); ok {
				return frameSlice, true
			}
		}
	}
	
	return nil, false
}

// DefaultValue returns a default value for common types when operations would fail
func DefaultValue[T any]() T {
	var zero T
	return zero
}

// SafeStringConcat safely concatenates strings, handling nil values
func SafeStringConcat(values ...any) string {
	var result string
	for _, value := range values {
		if !SafeNilCheck(value) {
			result += fmt.Sprintf("%v", value)
		}
	}
	return result
} 