package functions

import (
	"errors"
	"math"
	"reflect"
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less/go_parser"
)

// CustomError is a custom error type for testing
type CustomError struct {
	msg string
}

func (e *CustomError) Error() string {
	return e.msg
}

func TestDefaultFunc(t *testing.T) {
	t.Run("Eval method", func(t *testing.T) {
		t.Run("should panic when error_ is set", func(t *testing.T) {
			instance := NewDefaultFunc()
			testError := errors.New("Test error")
			instance.Error(testError)
			instance.Value("some value")

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(error); ok {
						if err.Error() != "Test error" {
							t.Errorf("Expected error message 'Test error', got %v", err.Error())
						}
					} else {
						t.Errorf("Expected error type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})

		t.Run("should return nil when value_ is nil", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(nil)
			instance.Error(nil)

			result := instance.Eval()
			if result != nil {
				t.Errorf("Expected nil, got %v", result)
			}
		})

		t.Run("should return KeywordTrue when value_ is truthy", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("truthy string")
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should return KeywordTrue when value_ is number 1", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(1)
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should return KeywordTrue when value_ is true boolean", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(true)
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should return KeywordFalse when value_ is empty string", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("")
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordFalse {
				t.Errorf("Expected KeywordFalse, got %v", result)
			}
		})

		t.Run("should return KeywordFalse when value_ is number 0", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(0)
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordFalse {
				t.Errorf("Expected KeywordFalse, got %v", result)
			}
		})

		t.Run("should return KeywordFalse when value_ is false boolean", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(false)
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordFalse {
				t.Errorf("Expected KeywordFalse, got %v", result)
			}
		})

		t.Run("should return KeywordFalse when value_ is NaN", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(math.NaN())
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordFalse {
				t.Errorf("Expected KeywordFalse, got %v", result)
			}
		})

		t.Run("should prioritize error over value when both are set", func(t *testing.T) {
			instance := NewDefaultFunc()
			testError := errors.New("Priority test")
			instance.Error(testError)
			instance.Value("some value")

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(error); ok {
						if err.Error() != "Priority test" {
							t.Errorf("Expected error message 'Priority test', got %v", err.Error())
						}
					} else {
						t.Errorf("Expected error type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})

		t.Run("should handle complex truthy objects", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(map[string]string{"key": "value"})
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should handle arrays as truthy values", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value([]int{1, 2, 3})
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should handle empty arrays as truthy values", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value([]int{})
			instance.Error(nil)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})
	})

	t.Run("Value method", func(t *testing.T) {
		t.Run("should set value_ property to provided value", func(t *testing.T) {
			instance := NewDefaultFunc()
			testValue := "test value"
			instance.Value(testValue)

			if instance.value_ != testValue {
				t.Errorf("Expected value_ to be %v, got %v", testValue, instance.value_)
			}
		})

		t.Run("should set value_ to nil when nil is provided", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(nil)

			if instance.value_ != nil {
				t.Errorf("Expected value_ to be nil, got %v", instance.value_)
			}
		})

		t.Run("should set value_ to number", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(42)

			if instance.value_ != 42 {
				t.Errorf("Expected value_ to be 42, got %v", instance.value_)
			}
		})

		t.Run("should set value_ to boolean", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value(false)

			if instance.value_ != false {
				t.Errorf("Expected value_ to be false, got %v", instance.value_)
			}
		})

		t.Run("should set value_ to object", func(t *testing.T) {
			instance := NewDefaultFunc()
			testObj := map[string]string{"key": "value"}
			instance.Value(testObj)

			// Use reflect.DeepEqual for map comparison
			if !reflect.DeepEqual(instance.value_, testObj) {
				t.Errorf("Expected value_ to be %v, got %v", testObj, instance.value_)
			}
		})

		t.Run("should set value_ to array", func(t *testing.T) {
			instance := NewDefaultFunc()
			testArray := []int{1, 2, 3}
			instance.Value(testArray)

			// Use reflect.DeepEqual for slice comparison
			if !reflect.DeepEqual(instance.value_, testArray) {
				t.Errorf("Expected value_ to be %v, got %v", testArray, instance.value_)
			}
		})

		t.Run("should overwrite existing value_", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.value_ = "old value"
			instance.Value("new value")

			if instance.value_ != "new value" {
				t.Errorf("Expected value_ to be 'new value', got %v", instance.value_)
			}
		})
	})

	t.Run("Error method", func(t *testing.T) {
		t.Run("should set error_ property to provided error", func(t *testing.T) {
			instance := NewDefaultFunc()
			testError := errors.New("Test error")
			instance.Error(testError)

			if instance.error_ != testError {
				t.Errorf("Expected error_ to be %v, got %v", testError, instance.error_)
			}
		})

		t.Run("should set error_ to nil when nil is provided", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Error(nil)

			if instance.error_ != nil {
				t.Errorf("Expected error_ to be nil, got %v", instance.error_)
			}
		})

		t.Run("should set error_ to string", func(t *testing.T) {
			instance := NewDefaultFunc()
			errorString := "Error message"
			instance.Error(errorString)

			if instance.error_ != errorString {
				t.Errorf("Expected error_ to be %v, got %v", errorString, instance.error_)
			}
		})

		t.Run("should set error_ to custom error object", func(t *testing.T) {
			instance := NewDefaultFunc()
			customError := map[string]any{"message": "Custom error", "code": 500}
			instance.Error(customError)

			// Use reflect.DeepEqual for map comparison
			if !reflect.DeepEqual(instance.error_, customError) {
				t.Errorf("Expected error_ to be %v, got %v", customError, instance.error_)
			}
		})

		t.Run("should overwrite existing error_", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.error_ = errors.New("Old error")
			newError := errors.New("New error")
			instance.Error(newError)

			if instance.error_ != newError {
				t.Errorf("Expected error_ to be %v, got %v", newError, instance.error_)
			}
		})
	})

	t.Run("Reset method", func(t *testing.T) {
		t.Run("should set both value_ and error_ to nil", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.value_ = "some value"
			instance.error_ = errors.New("some error")

			instance.Reset()

			if instance.value_ != nil {
				t.Errorf("Expected value_ to be nil, got %v", instance.value_)
			}
			if instance.error_ != nil {
				t.Errorf("Expected error_ to be nil, got %v", instance.error_)
			}
		})

		t.Run("should set value_ and error_ to nil when they are already nil", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.value_ = nil
			instance.error_ = nil

			instance.Reset()

			if instance.value_ != nil {
				t.Errorf("Expected value_ to be nil, got %v", instance.value_)
			}
			if instance.error_ != nil {
				t.Errorf("Expected error_ to be nil, got %v", instance.error_)
			}
		})

		t.Run("should reset complex values to nil", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.value_ = map[string]any{"complex": "object", "with": []string{"nested", "values"}}
			instance.error_ = errors.New("Complex error with details")

			instance.Reset()

			if instance.value_ != nil {
				t.Errorf("Expected value_ to be nil, got %v", instance.value_)
			}
			if instance.error_ != nil {
				t.Errorf("Expected error_ to be nil, got %v", instance.error_)
			}
		})
	})

	t.Run("Integration tests", func(t *testing.T) {
		t.Run("should work correctly when chaining value and eval", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("test")
			result := instance.Eval()

			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should work correctly when chaining error and eval", func(t *testing.T) {
			instance := NewDefaultFunc()
			testError := errors.New("Chain test")
			instance.Error(testError)

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(error); ok {
						if err.Error() != "Chain test" {
							t.Errorf("Expected error message 'Chain test', got %v", err.Error())
						}
					} else {
						t.Errorf("Expected error type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})

		t.Run("should work correctly when chaining value, error, and eval (error takes priority)", func(t *testing.T) {
			instance := NewDefaultFunc()
			testError := errors.New("Priority chain test")
			instance.Value("test value")
			instance.Error(testError)

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(error); ok {
						if err.Error() != "Priority chain test" {
							t.Errorf("Expected error message 'Priority chain test', got %v", err.Error())
						}
					} else {
						t.Errorf("Expected error type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})

		t.Run("should work correctly after reset", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("test")
			instance.Error(errors.New("test"))
			instance.Reset()

			result := instance.Eval()
			if result != nil {
				t.Errorf("Expected nil, got %v", result)
			}
		})

		t.Run("should handle multiple reset calls", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("test")
			instance.Reset()
			instance.Reset()

			if instance.value_ != nil {
				t.Errorf("Expected value_ to be nil, got %v", instance.value_)
			}
			if instance.error_ != nil {
				t.Errorf("Expected error_ to be nil, got %v", instance.error_)
			}
		})

		t.Run("should work with falsy values after reset", func(t *testing.T) {
			instance := NewDefaultFunc()
			instance.Value("truthy")
			instance.Reset()
			instance.Value(0)

			result := instance.Eval()
			if result != go_parser.KeywordFalse {
				t.Errorf("Expected KeywordFalse, got %v", result)
			}
		})
	})

	t.Run("Edge cases and error conditions", func(t *testing.T) {
		t.Run("should handle function as value", func(t *testing.T) {
			instance := NewDefaultFunc()
			testFunc := func() string { return "test" }
			instance.Value(testFunc)

			result := instance.Eval()
			if result != go_parser.KeywordTrue {
				t.Errorf("Expected KeywordTrue, got %v", result)
			}
		})

		t.Run("should preserve error type when panicking", func(t *testing.T) {
			instance := NewDefaultFunc()
			typeError := &CustomError{msg: "Type error test"}
			instance.Error(typeError)

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(*CustomError); ok {
						if err.Error() != "Type error test" {
							t.Errorf("Expected error message 'Type error test', got %v", err.Error())
						}
					} else {
						t.Errorf("Expected *CustomError type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})

		t.Run("should handle non-Error objects as errors", func(t *testing.T) {
			instance := NewDefaultFunc()
			customError := "String error"
			instance.Error(customError)

			defer func() {
				if r := recover(); r != nil {
					if str, ok := r.(string); ok {
						if str != "String error" {
							t.Errorf("Expected error message 'String error', got %v", str)
						}
					} else {
						t.Errorf("Expected string type, got %T", r)
					}
				} else {
					t.Error("Expected panic, but none occurred")
				}
			}()
			instance.Eval()
		})
	})
} 