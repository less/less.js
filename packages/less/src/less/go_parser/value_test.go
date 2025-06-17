package go_parser

import (
	"reflect"
	"testing"
)

// valueTestVisitor implements the visitor interface for testing
type valueTestVisitor struct {
	visitArrayFn func([]any) []any
}

func (v *valueTestVisitor) VisitArray(arr []any) []any {
	if v.visitArrayFn != nil {
		return v.visitArrayFn(arr)
	}
	return arr
}

func TestValue(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should throw error when constructed without an argument", func(t *testing.T) {
			_, err := NewValue(nil)
			if err == nil || err.Error() != "Value requires an array argument" {
				t.Error("Expected error when constructed without an argument")
			}
		})

		t.Run("should handle array with null/undefined values", func(t *testing.T) {
			arrayValue := []any{nil, nil, map[string]string{"type": "test"}}
			value, err := NewValue(arrayValue)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !reflect.DeepEqual(value.Value, arrayValue) {
				t.Error("Expected array with nil values to be preserved")
			}
		})

		t.Run("should handle array with primitive values", func(t *testing.T) {
			arrayValue := []any{123, "string", true}
			value, err := NewValue(arrayValue)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !reflect.DeepEqual(value.Value, arrayValue) {
				t.Error("Expected array with primitive values to be preserved")
			}
		})

		t.Run("should wrap single non-array value in array", func(t *testing.T) {
			singleValue := map[string]string{"type": "test"}
			value, err := NewValue(singleValue)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if len(value.Value) != 1 || !reflect.DeepEqual(value.Value[0], singleValue) {
				t.Error("Expected single value to be wrapped in array")
			}
		})

		t.Run("should store array value as is", func(t *testing.T) {
			arrayValue := []any{
				map[string]string{"type": "test1"},
				map[string]string{"type": "test2"},
			}
			value, err := NewValue(arrayValue)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if len(value.Value) != 2 {
				t.Error("Expected array length to be preserved")
			}
			if !reflect.DeepEqual(value.Value[0], map[string]string{"type": "test1"}) {
				t.Error("Expected first value to be preserved")
			}
			if !reflect.DeepEqual(value.Value[1], map[string]string{"type": "test2"}) {
				t.Error("Expected second value to be preserved")
			}
		})

		t.Run("should handle empty array", func(t *testing.T) {
			value, err := NewValue([]any{})
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if len(value.Value) != 0 {
				t.Error("Expected empty array to be preserved")
			}
		})

		t.Run("should inherit from Node", func(t *testing.T) {
			value, err := NewValue([]any{})
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if value.Node == nil {
				t.Error("Expected value to inherit from Node")
			}
			if value.GetType() != "Value" {
				t.Error("Expected type to be 'Value'")
			}
		})
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should call visitArray on visitor with value array", func(t *testing.T) {
			valueArr := []any{map[string]string{"type": "test"}}
			value, _ := NewValue(valueArr)
			called := false
			visitor := &valueTestVisitor{
				visitArrayFn: func(arr []any) []any {
					called = true
					if len(arr) != 1 || !reflect.DeepEqual(arr[0], map[string]string{"type": "test"}) {
						t.Error("Unexpected array passed to visitArray")
					}
					return arr
				},
			}
			value.Accept(visitor)
			if !called {
				t.Error("Expected visitArray to be called")
			}
		})

		t.Run("should not call visitArray if value is undefined", func(t *testing.T) {
			value, _ := NewValue([]any{})
			value.Value = nil
			called := false
			visitor := &valueTestVisitor{
				visitArrayFn: func(arr []any) []any {
					called = true
					return arr
				},
			}
			value.Accept(visitor)
			if called {
				t.Error("Expected visitArray not to be called")
			}
		})

		t.Run("should assign visitArray result back to value", func(t *testing.T) {
			transformedValue := []any{map[string]string{"type": "transformed"}}
			value, _ := NewValue([]any{map[string]string{"type": "original"}})
			visitor := &valueTestVisitor{
				visitArrayFn: func(arr []any) []any {
					return transformedValue
				},
			}
			value.Accept(visitor)
			if len(value.Value) != 1 || !reflect.DeepEqual(value.Value[0], map[string]string{"type": "transformed"}) {
				t.Error("Expected value to be transformed")
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should return evaluated single value", func(t *testing.T) {
			mockContext := map[string]any{"someContext": true}
			mockEvalResult := map[string]string{"type": "evaluated"}
			mockValue := &mockEvaluator{
				evalFn: func(ctx any) (any, error) {
					if !reflect.DeepEqual(ctx, mockContext) {
						t.Error("Expected context to be passed to eval")
					}
					return mockEvalResult, nil
				},
			}
			value, _ := NewValue([]any{mockValue})
			result, err := value.Eval(mockContext)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !reflect.DeepEqual(result, mockEvalResult) {
				t.Error("Expected result to be evaluated value")
			}
		})

		t.Run("should handle empty array", func(t *testing.T) {
			value, _ := NewValue([]any{})
			result, err := value.Eval(map[string]any{})
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			resultValue, ok := result.(*Value)
			if !ok {
				t.Error("Expected result to be Value")
			}
			if len(resultValue.Value) != 0 {
				t.Error("Expected result to be empty array")
			}
		})

		t.Run("should return new Value with evaluated multiple values", func(t *testing.T) {
			mockContext := map[string]any{"someContext": true}
			mockValues := []any{
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						return map[string]string{"type": "eval1"}, nil
					},
				},
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						return map[string]string{"type": "eval2"}, nil
					},
				},
			}
			value, _ := NewValue(mockValues)
			result, err := value.Eval(mockContext)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			resultValue, ok := result.(*Value)
			if !ok {
				t.Error("Expected result to be Value")
			}
			if len(resultValue.Value) != 2 {
				t.Error("Expected result to have two values")
			}
			if !reflect.DeepEqual(resultValue.Value[0], map[string]string{"type": "eval1"}) {
				t.Error("Expected first value to be eval1")
			}
			if !reflect.DeepEqual(resultValue.Value[1], map[string]string{"type": "eval2"}) {
				t.Error("Expected second value to be eval2")
			}
		})

		t.Run("should evaluate values in order", func(t *testing.T) {
			evaluationOrder := []int{}
			mockValues := []any{
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						evaluationOrder = append(evaluationOrder, 1)
						return map[string]string{"type": "eval1"}, nil
					},
				},
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						evaluationOrder = append(evaluationOrder, 2)
						return map[string]string{"type": "eval2"}, nil
					},
				},
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						evaluationOrder = append(evaluationOrder, 3)
						return map[string]string{"type": "eval3"}, nil
					},
				},
			}

			value, _ := NewValue(mockValues)
			_, err := value.Eval(map[string]any{})
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			if !reflect.DeepEqual(evaluationOrder, []int{1, 2, 3}) {
				t.Error("Expected values to be evaluated in order")
			}
		})

		t.Run("should handle values returning primitive types during evaluation", func(t *testing.T) {
			mockValues := []any{
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						return 123, nil
					},
				},
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						return "string", nil
					},
				},
				&mockEvaluator{
					evalFn: func(ctx any) (any, error) {
						return true, nil
					},
				},
			}
			value, _ := NewValue(mockValues)
			result, err := value.Eval(map[string]any{})
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			resultValue, ok := result.(*Value)
			if !ok {
				t.Error("Expected result to be Value")
			}
			expectedValues := []any{123, "string", true}
			if !reflect.DeepEqual(resultValue.Value, expectedValues) {
				t.Error("Expected primitive values to be preserved")
			}
		})
	})

	t.Run("genCSS", func(t *testing.T) {
		t.Run("should handle empty array", func(t *testing.T) {
			value, _ := NewValue([]any{})
			var output []string
			outputFn := func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			}
			value.GenCSS(map[string]any{}, &CSSOutput{Add: outputFn})
			if len(output) != 0 {
				t.Error("Expected no output for empty array")
			}
		})

		t.Run("should generate CSS for single value", func(t *testing.T) {
			mockValue := &mockCSSGenerator{
				genCSSFn: func(ctx any, out *CSSOutput) {
					out.Add("test", nil, nil)
				},
			}
			value, _ := NewValue([]any{mockValue})
			var output []string
			outputFn := func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			}
			value.GenCSS(map[string]any{}, &CSSOutput{Add: outputFn})
			if len(output) != 1 || output[0] != "test" {
				t.Error("Expected single value output")
			}
		})

		t.Run("should generate CSS for multiple values with default separator", func(t *testing.T) {
			mockValues := []any{
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("test1", nil, nil)
					},
				},
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("test2", nil, nil)
					},
				},
			}
			value, _ := NewValue(mockValues)
			var output []string
			outputFn := func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			}
			value.GenCSS(map[string]any{}, &CSSOutput{Add: outputFn})
			if len(output) != 3 || output[0] != "test1" || output[1] != ", " || output[2] != "test2" {
				t.Error("Expected output with default separator")
			}
		})

		t.Run("should generate CSS for multiple values with compressed separator", func(t *testing.T) {
			mockValues := []any{
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("test1", nil, nil)
					},
				},
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("test2", nil, nil)
					},
				},
			}
			value, _ := NewValue(mockValues)
			var output []string
			outputFn := func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			}
			value.GenCSS(map[string]any{"compress": true}, &CSSOutput{Add: outputFn})
			if len(output) != 3 || output[0] != "test1" || output[1] != "," || output[2] != "test2" {
				t.Error("Expected output with compressed separator")
			}
		})

		t.Run("should handle empty/whitespace-only output", func(t *testing.T) {
			var output []string
			outputFn := func(chunk any, fileInfo any, index any) {
				output = append(output, chunk.(string))
			}
			mockValues := []any{
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("", nil, nil)
					},
				},
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("   ", nil, nil)
					},
				},
				&mockCSSGenerator{
					genCSSFn: func(ctx any, out *CSSOutput) {
						out.Add("test", nil, nil)
					},
				},
			}

			value, _ := NewValue(mockValues)
			value.GenCSS(map[string]any{}, &CSSOutput{Add: outputFn})

			expectedOutput := []string{"", ", ", "   ", ", ", "test"}
			if !reflect.DeepEqual(output, expectedOutput) {
				t.Error("Expected proper handling of empty/whitespace output")
			}
		})

		t.Run("should handle various context compression settings", func(t *testing.T) {
			testCases := []struct {
				context  map[string]any
				expected string
			}{
				{map[string]any{"compress": true}, ","},
				{map[string]any{"compress": false}, ", "},
				{map[string]any{}, ", "},
				{nil, ", "},
			}

			for _, tc := range testCases {
				var separator string
				outputFn := func(chunk any, fileInfo any, index any) {
					if s, ok := chunk.(string); ok && (s == "," || s == ", ") {
						separator = s
					}
				}

				mockValues := []any{
					&mockCSSGenerator{
						genCSSFn: func(ctx any, out *CSSOutput) {
							out.Add("test1", nil, nil)
						},
					},
					&mockCSSGenerator{
						genCSSFn: func(ctx any, out *CSSOutput) {
							out.Add("test2", nil, nil)
						},
					},
				}

				value, _ := NewValue(mockValues)
				value.GenCSS(tc.context, &CSSOutput{Add: outputFn})

				if separator != tc.expected {
					t.Errorf("Expected separator %q for context %v, got %q", tc.expected, tc.context, separator)
				}
			}
		})
	})
}

// Mock types for testing
type mockEvaluator struct {
	evalFn func(context any) (any, error)
}

func (m *mockEvaluator) Eval(context any) (any, error) {
	return m.evalFn(context)
}

type mockCSSGenerator struct {
	genCSSFn func(context any, output *CSSOutput)
}

func (m *mockCSSGenerator) GenCSS(context any, output *CSSOutput) {
	m.genCSSFn(context, output)
} 