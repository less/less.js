package less_go

import (
	"testing"
)

// Helper functions for tests
func createDim(value float64, unit any) *Dimension {
	dim, _ := NewDimension(value, unit)
	return dim
}

func createValue(values []any) *Value {
	value, _ := NewValue(values)
	return value
}

func createExpr(values []any) *Expression {
	expr, _ := NewExpression(values, false)
	return expr
}

func createUnit(unit string) *Unit {
	return NewUnit([]string{unit}, nil, "")
}

func TestGetItemsFromNode(t *testing.T) {
	t.Run("should handle nil node", func(t *testing.T) {
		result := GetItemsFromNode(nil)
		if len(result) != 1 || result[0] != nil {
			t.Errorf("Expected [nil], got %v", result)
		}
	})

	t.Run("should handle Value node with slice", func(t *testing.T) {
		values := []any{
			createDim(10, nil),
			createDim(20, nil),
		}
		valueNode := createValue(values)
		
		result := GetItemsFromNode(valueNode)
		if len(result) != 2 {
			t.Errorf("Expected length 2, got %d", len(result))
		}
	})

	t.Run("should handle Expression node with slice", func(t *testing.T) {
		values := []any{
			createDim(5, nil),
			createDim(15, nil),
		}
		exprNode := createExpr(values)
		
		result := GetItemsFromNode(exprNode)
		if len(result) != 2 {
			t.Errorf("Expected length 2, got %d", len(result))
		}
	})

	t.Run("should handle direct slice", func(t *testing.T) {
		values := []any{
			createDim(1, nil),
			createDim(2, nil),
			createDim(3, nil),
		}
		
		result := GetItemsFromNode(values)
		if len(result) != 3 {
			t.Errorf("Expected length 3, got %d", len(result))
		}
	})

	t.Run("should handle single node as length 1 array", func(t *testing.T) {
		singleNode := createDim(42, nil)
		
		result := GetItemsFromNode(singleNode)
		if len(result) != 1 {
			t.Errorf("Expected length 1, got %d", len(result))
		}
		if result[0] != singleNode {
			t.Errorf("Expected single node, got %v", result[0])
		}
	})

	t.Run("should handle map with value property", func(t *testing.T) {
		nodeMap := map[string]any{
			"value": []any{
				createDim(100, nil),
				createDim(200, nil),
			},
		}
		
		result := GetItemsFromNode(nodeMap)
		if len(result) != 2 {
			t.Errorf("Expected length 2, got %d", len(result))
		}
	})

	t.Run("should handle empty slice", func(t *testing.T) {
		values := []any{}
		
		result := GetItemsFromNode(values)
		if len(result) != 0 {
			t.Errorf("Expected length 0, got %d", len(result))
		}
	})
}

func TestSelf(t *testing.T) {
	t.Run("should return input unchanged", func(t *testing.T) {
		input := createDim(5, nil)
		result := Self(input)
		// Compare by pointer for structs
		if result.(*Dimension) != input {
			t.Errorf("Expected same object, got different")
		}
	})

	t.Run("should handle nil input", func(t *testing.T) {
		result := Self(nil)
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should handle string input", func(t *testing.T) {
		input := "test"
		result := Self(input)
		if result != input {
			t.Errorf("Expected 'test', got %v", result)
		}
	})

	t.Run("should handle complex objects", func(t *testing.T) {
		input := map[string]any{"type": "test", "value": 42}
		result := Self(input)
		resultMap := result.(map[string]any)
		if resultMap["type"] != input["type"] || resultMap["value"] != input["value"] {
			t.Errorf("Expected same object content, got different")
		}
	})
}

func TestSpaceSeparatedValues(t *testing.T) {
	t.Run("should return single value when one argument", func(t *testing.T) {
		value := createDim(10, nil)
		result := SpaceSeparatedValues(value)
		if result != value {
			t.Errorf("Expected same value, got different")
		}
	})

	t.Run("should create Value node with multiple arguments", func(t *testing.T) {
		value1 := createDim(10, nil)
		value2 := createDim(20, nil)
		value3 := createDim(30, nil)
		
		result := SpaceSeparatedValues(value1, value2, value3)
		
		if valueNode, ok := result.(*Value); ok {
			{
				valueSlice := valueNode.Value
				if len(valueSlice) != 3 {
					t.Errorf("Expected length 3, got %d", len(valueSlice))
				}
				if valueSlice[0] != value1 || valueSlice[1] != value2 || valueSlice[2] != value3 {
					t.Errorf("Expected specific values, got %v", valueSlice)
				}
			}
		} else {
			t.Errorf("Expected Value node, got %T", result)
		}
	})

	t.Run("should handle mixed types", func(t *testing.T) {
		dim := createDim(10, createUnit("px"))
		quoted := NewQuoted("\"", "test", true, 0, nil)
		
		result := SpaceSeparatedValues(dim, quoted)
		
		if valueNode, ok := result.(*Value); ok {
			{
				valueSlice := valueNode.Value
				if len(valueSlice) != 2 {
					t.Errorf("Expected length 2, got %d", len(valueSlice))
				}
			}
		} else {
			t.Errorf("Expected Value node, got %T", result)
		}
	})

	t.Run("should handle empty arguments", func(t *testing.T) {
		result := SpaceSeparatedValues()
		
		if valueNode, ok := result.(*Value); ok {
			{
				valueSlice := valueNode.Value
				if len(valueSlice) != 0 {
					t.Errorf("Expected length 0, got %d", len(valueSlice))
				}
			}
		} else {
			t.Errorf("Expected Value node, got %T", result)
		}
	})

	t.Run("should handle null arguments", func(t *testing.T) {
		result := SpaceSeparatedValues(nil, nil)
		
		if valueNode, ok := result.(*Value); ok {
			{
				valueSlice := valueNode.Value
				if len(valueSlice) != 2 {
					t.Errorf("Expected length 2, got %d", len(valueSlice))
				}
				if valueSlice[0] != nil || valueSlice[1] != nil {
					t.Errorf("Expected [nil, nil], got %v", valueSlice)
				}
			}
		} else {
			t.Errorf("Expected Value node, got %T", result)
		}
	})

	t.Run("should handle many arguments", func(t *testing.T) {
		args := make([]any, 20)
		for i := 0; i < 20; i++ {
			args[i] = createDim(float64(i), nil)
		}
		
		result := SpaceSeparatedValues(args...)
		
		if valueNode, ok := result.(*Value); ok {
			{
				valueSlice := valueNode.Value
				if len(valueSlice) != 20 {
					t.Errorf("Expected length 20, got %d", len(valueSlice))
				}
			}
		} else {
			t.Errorf("Expected Value node, got %T", result)
		}
	})
}

func TestExtract(t *testing.T) {
	t.Run("should extract item from array value using 1-based index", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
			createDim(30, nil),
		})
		index := createDim(2, nil)

		result := Extract(values, index)

		if dim, ok := result.(*Dimension); ok {
			if dim.Value != 20 {
				t.Errorf("Expected 20, got %f", dim.Value)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", result)
		}
	})

	t.Run("should handle single value node as array of length 1", func(t *testing.T) {
		singleValue := createDim(42, nil)
		index := createDim(1, nil)

		result := Extract(singleValue, index)

		if result != singleValue {
			t.Errorf("Expected same value, got different")
		}
	})

	t.Run("should return nil for invalid index (too high)", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		index := createDim(5, nil)

		result := Extract(values, index)

		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should return nil for invalid index (zero)", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		index := createDim(0, nil)

		result := Extract(values, index)

		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should return nil for negative index", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		index := createDim(-1, nil)

		result := Extract(values, index)

		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should handle Expression with array value", func(t *testing.T) {
		expr := createExpr([]any{
			createDim(5, nil),
			createDim(15, nil),
			createDim(25, nil),
		})
		index := createDim(3, nil)

		result := Extract(expr, index)

		if dim, ok := result.(*Dimension); ok {
			if dim.Value != 25 {
				t.Errorf("Expected 25, got %f", dim.Value)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", result)
		}
	})

	t.Run("should handle empty array", func(t *testing.T) {
		values := createValue([]any{})
		index := createDim(1, nil)

		result := Extract(values, index)

		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should handle fractional index (returns nil like JS undefined)", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		index := createDim(1.7, nil)

		result := Extract(values, index)

		// JavaScript behavior: 1.7 - 1 = 0.7, array[0.7] returns undefined (nil in Go)
		if result != nil {
			t.Errorf("Expected nil for fractional index, got %v", result)
		}
	})

	t.Run("should handle map-based index", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		indexMap := map[string]any{"value": 2}

		result := Extract(values, indexMap)

		if dim, ok := result.(*Dimension); ok {
			if dim.Value != 20 {
				t.Errorf("Expected 20, got %f", dim.Value)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", result)
		}
	})

	t.Run("should handle string index in map", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		indexMap := map[string]any{"value": "2"}

		result := Extract(values, indexMap)

		if dim, ok := result.(*Dimension); ok {
			if dim.Value != 20 {
				t.Errorf("Expected 20, got %f", dim.Value)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", result)
		}
	})

	t.Run("should handle invalid index types", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
		})
		invalidIndex := "not-a-number"

		result := Extract(values, invalidIndex)

		if result != nil {
			t.Errorf("Expected nil for invalid index, got %v", result)
		}
	})
}

func TestLength(t *testing.T) {
	t.Run("should return length of array value", func(t *testing.T) {
		values := createValue([]any{
			createDim(10, nil),
			createDim(20, nil),
			createDim(30, nil),
			createDim(40, nil),
		})

		result := Length(values)

		if result.Value != 4 {
			t.Errorf("Expected 4, got %f", result.Value)
		}
	})

	t.Run("should return length 1 for single value node", func(t *testing.T) {
		singleValue := createDim(42, nil)

		result := Length(singleValue)

		if result.Value != 1 {
			t.Errorf("Expected 1, got %f", result.Value)
		}
	})

	t.Run("should return length 0 for empty array", func(t *testing.T) {
		values := createValue([]any{})

		result := Length(values)

		if result.Value != 0 {
			t.Errorf("Expected 0, got %f", result.Value)
		}
	})

	t.Run("should handle Expression with array value", func(t *testing.T) {
		expr := createExpr([]any{
			createDim(1, nil),
			createDim(2, nil),
			createDim(3, nil),
			createDim(4, nil),
			createDim(5, nil),
		})

		result := Length(expr)

		if result.Value != 5 {
			t.Errorf("Expected 5, got %f", result.Value)
		}
	})

	t.Run("should handle null/undefined values appropriately", func(t *testing.T) {
		result := Length(nil)

		if result.Value != 1 {
			t.Errorf("Expected 1 for nil value, got %f", result.Value)
		}
	})

	t.Run("should handle various value types", func(t *testing.T) {
		stringValue := "test"
		result := Length(stringValue)

		if result.Value != 1 {
			t.Errorf("Expected 1 for string value, got %f", result.Value)
		}
	})
}

func TestRange(t *testing.T) {
	t.Run("should create range with start, end, and step", func(t *testing.T) {
		start := createDim(2, nil)
		end := createDim(8, nil)
		step := createDim(2, nil)

		result := Range(start, end, step)

		{
			valueSlice := result.Value
			if len(valueSlice) != 4 {
				t.Errorf("Expected length 4, got %d", len(valueSlice))
			}
			
			expectedValues := []float64{2, 4, 6, 8}
			for i, expected := range expectedValues {
				if dim, ok := valueSlice[i].(*Dimension); ok {
					if dim.Value != expected {
						t.Errorf("At index %d, expected %f, got %f", i, expected, dim.Value)
					}
				} else {
					t.Errorf("Expected Dimension at index %d, got %T", i, valueSlice[i])
				}
			}
		}
	})

	t.Run("should create range with just end parameter (start defaults to 1)", func(t *testing.T) {
		end := createDim(5, nil)

		result := Range(end, nil, nil)

		{
			valueSlice := result.Value
			if len(valueSlice) != 5 {
				t.Errorf("Expected length 5, got %d", len(valueSlice))
			}
			
			expectedValues := []float64{1, 2, 3, 4, 5}
			for i, expected := range expectedValues {
				if dim, ok := valueSlice[i].(*Dimension); ok {
					if dim.Value != expected {
						t.Errorf("At index %d, expected %f, got %f", i, expected, dim.Value)
					}
				} else {
					t.Errorf("Expected Dimension at index %d, got %T", i, valueSlice[i])
				}
			}
		}
	})

	t.Run("should create range with start and end (step defaults to 1)", func(t *testing.T) {
		start := createDim(3, nil)
		end := createDim(7, nil)

		result := Range(start, end, nil)

		{
			valueSlice := result.Value
			if len(valueSlice) != 5 {
				t.Errorf("Expected length 5, got %d", len(valueSlice))
			}
			
			expectedValues := []float64{3, 4, 5, 6, 7}
			for i, expected := range expectedValues {
				if dim, ok := valueSlice[i].(*Dimension); ok {
					if dim.Value != expected {
						t.Errorf("At index %d, expected %f, got %f", i, expected, dim.Value)
					}
				} else {
					t.Errorf("Expected Dimension at index %d, got %T", i, valueSlice[i])
				}
			}
		}
	})

	t.Run("should preserve units from end dimension", func(t *testing.T) {
		start := createDim(1, nil)
		end := createDim(3, createUnit("px"))

		result := Range(start, end, nil)

		{
			valueSlice := result.Value
			if len(valueSlice) != 3 {
				t.Errorf("Expected length 3, got %d", len(valueSlice))
			}
			
			for i, item := range valueSlice {
				if dim, ok := item.(*Dimension); ok {
					if dim.Unit == nil || dim.Unit.ToString() != "px" {
						t.Errorf("At index %d, expected unit 'px', got %v", i, dim.Unit)
					}
				} else {
					t.Errorf("Expected Dimension at index %d, got %T", i, item)
				}
			}
		}
	})

	t.Run("should handle step greater than range", func(t *testing.T) {
		start := createDim(1, nil)
		end := createDim(3, nil)
		step := createDim(10, nil)

		result := Range(start, end, step)

		{
			valueSlice := result.Value
			if len(valueSlice) != 1 {
				t.Errorf("Expected length 1, got %d", len(valueSlice))
			}
			
			if dim, ok := valueSlice[0].(*Dimension); ok {
				if dim.Value != 1 {
					t.Errorf("Expected value 1, got %f", dim.Value)
				}
			} else {
				t.Errorf("Expected Dimension, got %T", valueSlice[0])
			}
		}
	})

	t.Run("should handle fractional step", func(t *testing.T) {
		start := createDim(1, nil)
		end := createDim(3, nil)
		step := createDim(0.5, nil)

		result := Range(start, end, step)

		{
			valueSlice := result.Value
			if len(valueSlice) != 5 {
				t.Errorf("Expected length 5, got %d", len(valueSlice))
			}
			
			expectedValues := []float64{1, 1.5, 2, 2.5, 3}
			for i, expected := range expectedValues {
				if dim, ok := valueSlice[i].(*Dimension); ok {
					if dim.Value != expected {
						t.Errorf("At index %d, expected %f, got %f", i, expected, dim.Value)
					}
				} else {
					t.Errorf("Expected Dimension at index %d, got %T", i, valueSlice[i])
				}
			}
		}
	})

	t.Run("should handle same start and end values", func(t *testing.T) {
		start := createDim(5, nil)
		end := createDim(5, nil)

		result := Range(start, end, nil)

		{
			valueSlice := result.Value
			if len(valueSlice) != 1 {
				t.Errorf("Expected length 1, got %d", len(valueSlice))
			}
			
			if dim, ok := valueSlice[0].(*Dimension); ok {
				if dim.Value != 5 {
					t.Errorf("Expected value 5, got %f", dim.Value)
				}
			} else {
				t.Errorf("Expected Dimension, got %T", valueSlice[0])
			}
		}
	})

	t.Run("should handle large ranges efficiently", func(t *testing.T) {
		start := createDim(1, nil)
		end := createDim(100, nil)

		result := Range(start, end, nil)

		{
			valueSlice := result.Value
			if len(valueSlice) != 100 {
				t.Errorf("Expected length 100, got %d", len(valueSlice))
			}
			
			// Check first and last values
			if dim, ok := valueSlice[0].(*Dimension); ok {
				if dim.Value != 1 {
					t.Errorf("Expected first value 1, got %f", dim.Value)
				}
			} else {
				t.Errorf("Expected Dimension at index 0, got %T", valueSlice[0])
			}
			
			if dim, ok := valueSlice[99].(*Dimension); ok {
				if dim.Value != 100 {
					t.Errorf("Expected last value 100, got %f", dim.Value)
				}
			} else {
				t.Errorf("Expected Dimension at index 99, got %T", valueSlice[99])
			}
		}
	})

	t.Run("should handle zero end value", func(t *testing.T) {
		end := createDim(0, nil)

		result := Range(end, nil, nil)

		if result == nil {
			t.Fatal("Expected Expression result, got nil")
		}
		
		{
			valueSlice := result.Value
			if len(valueSlice) != 0 {
				t.Errorf("Expected length 0, got %d", len(valueSlice))
			}
		}
	})

	t.Run("should handle negative end value", func(t *testing.T) {
		end := createDim(-5, nil)

		result := Range(end, nil, nil)

		if result == nil {
			t.Fatal("Expected Expression result, got nil")
		}

		{
			valueSlice := result.Value
			if len(valueSlice) != 0 {
				t.Errorf("Expected length 0, got %d", len(valueSlice))
			}
		}
	})
}

func TestEach(t *testing.T) {
	t.Run("should return a ruleset with injected variables", func(t *testing.T) {
		list := createValue([]any{createDim(10, nil), createDim(20, nil)})
		ruleset := map[string]any{"rules": []any{}}

		result := Each(list, ruleset)

		if result == nil {
			t.Errorf("Expected a Ruleset result, got nil")
		}

		if resultRuleset, ok := result.(*Ruleset); ok {
			// Should have 2 rules (one for each item in the list)
			if len(resultRuleset.Rules) != 2 {
				t.Errorf("Expected 2 rules, got %d", len(resultRuleset.Rules))
			}
		} else {
			t.Errorf("Expected *Ruleset, got %T", result)
		}
	})

	t.Run("should handle empty list", func(t *testing.T) {
		list := createValue([]any{})
		ruleset := map[string]any{"rules": []any{}}

		result := Each(list, ruleset)

		if result == nil {
			t.Errorf("Expected a Ruleset result, got nil")
		}

		if resultRuleset, ok := result.(*Ruleset); ok {
			// Should have 0 rules for empty list
			if len(resultRuleset.Rules) != 0 {
				t.Errorf("Expected 0 rules for empty list, got %d", len(resultRuleset.Rules))
			}
		} else {
			t.Errorf("Expected *Ruleset, got %T", result)
		}
	})

	t.Run("should handle single item", func(t *testing.T) {
		singleItem := createDim(42, nil)
		ruleset := map[string]any{"rules": []any{}}

		result := Each(singleItem, ruleset)

		if result == nil {
			t.Errorf("Expected a Ruleset result, got nil")
		}

		if resultRuleset, ok := result.(*Ruleset); ok {
			// Should have 1 rule for single item
			if len(resultRuleset.Rules) != 1 {
				t.Errorf("Expected 1 rule for single item, got %d", len(resultRuleset.Rules))
			}
		} else {
			t.Errorf("Expected *Ruleset, got %T", result)
		}
	})
}

func TestGetListFunctions(t *testing.T) {
	functions := GetListFunctions()

	expectedFunctions := []string{"_SELF", "~", "extract", "length", "range", "each"}
	
	for _, name := range expectedFunctions {
		if _, exists := functions[name]; !exists {
			t.Errorf("Expected function '%s' to exist", name)
		}
	}

	if len(functions) != len(expectedFunctions) {
		t.Errorf("Expected %d functions, got %d", len(expectedFunctions), len(functions))
	}
}

func TestComplexIntegrationScenarios(t *testing.T) {
	t.Run("should handle nested Value and Expression structures", func(t *testing.T) {
		nestedStructure := createValue([]any{
			createExpr([]any{createDim(1, nil), createDim(2, nil)}),
			createValue([]any{createDim(3, nil), createDim(4, nil)}),
			createDim(5, nil),
		})

		lengthResult := Length(nestedStructure)
		if lengthResult.Value != 3 {
			t.Errorf("Expected length 3, got %f", lengthResult.Value)
		}

		extractResult := Extract(nestedStructure, createDim(2, nil))
		if _, ok := extractResult.(*Value); !ok {
			t.Errorf("Expected Value type, got %T", extractResult)
		}
	})

	t.Run("should handle chained operations", func(t *testing.T) {
		// Create a range, then extract from it
		rangeResult := Range(createDim(1, nil), createDim(5, nil), nil)
		extractResult := Extract(rangeResult, createDim(3, nil))

		if dim, ok := extractResult.(*Dimension); ok {
			if dim.Value != 3 {
				t.Errorf("Expected value 3, got %f", dim.Value)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", extractResult)
		}
	})

	t.Run("should handle space-separated list creation and extraction", func(t *testing.T) {
		spaceList := SpaceSeparatedValues(
			createDim(10, createUnit("px")),
			createDim(20, createUnit("px")),
			createDim(30, createUnit("px")),
		)

		lengthResult := Length(spaceList)
		if lengthResult.Value != 3 {
			t.Errorf("Expected length 3, got %f", lengthResult.Value)
		}

		extractResult := Extract(spaceList, createDim(2, nil))
		if dim, ok := extractResult.(*Dimension); ok {
			if dim.Value != 20 {
				t.Errorf("Expected value 20, got %f", dim.Value)
			}
			if dim.Unit == nil || dim.Unit.ToString() != "px" {
				t.Errorf("Expected unit 'px', got %v", dim.Unit)
			}
		} else {
			t.Errorf("Expected Dimension, got %T", extractResult)
		}
	})

	t.Run("should handle complex combinations", func(t *testing.T) {
		// Create a range of dimensions with units
		rangeResult := Range(createDim(1, nil), createDim(5, createUnit("em")), nil)

		// Create a space-separated list from some range items
		item1 := Extract(rangeResult, createDim(1, nil))
		item2 := Extract(rangeResult, createDim(3, nil))
		spaceList := SpaceSeparatedValues(item1, item2)

		// Verify the final result
		finalLength := Length(spaceList)
		if finalLength.Value != 2 {
			t.Errorf("Expected final length 2, got %f", finalLength.Value)
		}

		finalExtract := Extract(spaceList, createDim(1, nil))
		if dim, ok := finalExtract.(*Dimension); ok {
			if dim.Value != 1 {
				t.Errorf("Expected final value 1, got %f", dim.Value)
			}
			if dim.Unit == nil || dim.Unit.ToString() != "em" {
				t.Errorf("Expected final unit 'em', got %v", dim.Unit)
			}
		} else {
			t.Errorf("Expected final Dimension, got %T", finalExtract)
		}
	})
}