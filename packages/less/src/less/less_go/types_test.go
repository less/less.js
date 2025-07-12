package less_go

import (
	"testing"
)

func TestTypesFunctions(t *testing.T) {
	tf := NewTypesFunctions()

	t.Run("IsRuleset", func(t *testing.T) {
		t.Run("should return True for DetachedRuleset", func(t *testing.T) {
			ruleset := NewDetachedRuleset(nil, nil)
			result, err := tf.IsRuleset(ruleset)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-DetachedRuleset", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsRuleset(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsColor", func(t *testing.T) {
		t.Run("should return True for Color", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsColor(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-Color", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsColor(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsNumber", func(t *testing.T) {
		t.Run("should return True for Dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsNumber(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsNumber(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsString", func(t *testing.T) {
		t.Run("should return True for Quoted", func(t *testing.T) {
			quoted := NewQuoted("\"hello\"", "hello", false, 0, nil)
			result, err := tf.IsString(quoted)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-Quoted", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsString(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsKeyword", func(t *testing.T) {
		t.Run("should return True for Keyword", func(t *testing.T) {
			keyword := NewKeyword("auto")
			result, err := tf.IsKeyword(keyword)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-Keyword", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsKeyword(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsURL", func(t *testing.T) {
		t.Run("should return True for URL", func(t *testing.T) {
			quoted := NewQuoted("\"http://example.com\"", "http://example.com", false, 0, nil)
			url := NewURL(quoted, 0, nil, false)
			result, err := tf.IsURL(url)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-URL", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsURL(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsPx", func(t *testing.T) {
		t.Run("should return True for pixel dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsPx(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-pixel dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "em")
			result, err := tf.IsPx(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})

		t.Run("should return False for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsPx(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsPercentage", func(t *testing.T) {
		t.Run("should return True for percentage dimension", func(t *testing.T) {
			dimension, _ := NewDimension(50, "%")
			result, err := tf.IsPercentage(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-percentage dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsPercentage(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})

		t.Run("should return False for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsPercentage(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsEm", func(t *testing.T) {
		t.Run("should return True for em dimension", func(t *testing.T) {
			dimension, _ := NewDimension(2, "em")
			result, err := tf.IsEm(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-em dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsEm(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})

		t.Run("should return False for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsEm(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})
	})

	t.Run("IsUnit", func(t *testing.T) {
		t.Run("should return True for matching unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "rem")
			result, err := tf.IsUnit(dimension, "rem")
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return False for non-matching unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.IsUnit(dimension, "em")
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})

		t.Run("should return False for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.IsUnit(color, "px")
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordFalse {
				t.Errorf("Expected False, got %v", result)
			}
		})

		t.Run("should accept unit as object with value property", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			unitObj := map[string]any{"value": "px"}
			result, err := tf.IsUnit(dimension, unitObj)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result != KeywordTrue {
				t.Errorf("Expected True, got %v", result)
			}
		})

		t.Run("should return error when unit is nil", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			_, err := tf.IsUnit(dimension, nil)
			if err == nil {
				t.Errorf("Expected error for nil unit")
			}
			expectedMsg := "missing the required second argument to isunit."
			if err.Error() != "Argument: "+expectedMsg {
				t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
			}
		})

		t.Run("should return error when unit is not string or object with value", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			_, err := tf.IsUnit(dimension, 123)
			if err == nil {
				t.Errorf("Expected error for invalid unit type")
			}
			expectedMsg := "Second argument to isunit should be a unit or a string."
			if err.Error() != "Argument: "+expectedMsg {
				t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
			}
		})
	})

	t.Run("Unit", func(t *testing.T) {
		t.Run("should create new Dimension with specified unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			unitQuoted := NewQuoted("\"em\"", "em", false, 0, nil)
			result, err := tf.Unit(dimension, unitQuoted)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %v", result.Value)
			}
			if result.Unit.ToString() != "em" {
				t.Errorf("Expected unit 'em', got '%s'", result.Unit.ToString())
			}
		})

		t.Run("should create unitless Dimension when unit is not provided", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.Unit(dimension, nil)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %v", result.Value)
			}
			if result.Unit.ToString() != "" {
				t.Errorf("Expected empty unit, got '%s'", result.Unit.ToString())
			}
		})

		t.Run("should handle Keyword unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			unit := NewKeyword("em")
			result, err := tf.Unit(dimension, unit)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %v", result.Value)
			}
			if result.Unit.ToString() != "em" {
				t.Errorf("Expected unit 'em', got '%s'", result.Unit.ToString())
			}
		})

		t.Run("should handle string unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.Unit(dimension, "rem")
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != 10 {
				t.Errorf("Expected value 10, got %v", result.Value)
			}
			if result.Unit.ToString() != "rem" {
				t.Errorf("Expected unit 'rem', got '%s'", result.Unit.ToString())
			}
		})

		t.Run("should return error for non-Dimension input", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			_, err := tf.Unit(color, "px")
			if err == nil {
				t.Errorf("Expected error for non-Dimension input")
			}
			expectedMsg := "the first argument to unit must be a number"
			if err.Error() != "Argument: "+expectedMsg {
				t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
			}
		})

		t.Run("should return error for Operation input with helpful message", func(t *testing.T) {
			dim1, _ := NewDimension(1, "")
			dim2, _ := NewDimension(2, "")
			operation := NewOperation("+", []any{dim1, dim2}, false)
			_, err := tf.Unit(operation, "px")
			if err == nil {
				t.Errorf("Expected error for Operation input")
			}
			expectedMsg := "the first argument to unit must be a number. Have you forgotten parenthesis?"
			if err.Error() != "Argument: "+expectedMsg {
				t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
			}
		})
	})

	t.Run("GetUnit", func(t *testing.T) {
		t.Run("should return Anonymous with unit", func(t *testing.T) {
			dimension, _ := NewDimension(10, "px")
			result, err := tf.GetUnit(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != dimension.Unit.ToString() {
				t.Errorf("Expected unit '%s', got '%s'", dimension.Unit.ToString(), result.Value)
			}
		})

		t.Run("should work with unitless dimension", func(t *testing.T) {
			dimension, _ := NewDimension(10, "")
			result, err := tf.GetUnit(dimension)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != "" {
				t.Errorf("Expected empty unit, got '%s'", result.Value)
			}
		})

		t.Run("should return empty unit for non-Dimension", func(t *testing.T) {
			color := NewColor([]float64{255, 0, 0}, 1.0, "")
			result, err := tf.GetUnit(color)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}
			if result.Value != "" {
				t.Errorf("Expected empty unit, got '%s'", result.Value)
			}
		})
	})

	t.Run("GetFunctions", func(t *testing.T) {
		functions := tf.GetFunctions()
		expectedFunctions := []string{
			"isruleset", "iscolor", "isnumber", "isstring", "iskeyword",
			"isurl", "ispixel", "ispercentage", "isem", "isunit", "unit", "get-unit",
		}
		
		for _, funcName := range expectedFunctions {
			if _, exists := functions[funcName]; !exists {
				t.Errorf("Expected function '%s' to exist", funcName)
			}
		}
		
		if len(functions) != len(expectedFunctions) {
			t.Errorf("Expected %d functions, got %d", len(expectedFunctions), len(functions))
		}
	})
}