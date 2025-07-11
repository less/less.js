package less_go

import (
	"strings"
	"testing"
)

func TestGetLocation(t *testing.T) {
	t.Run("should return correct line and column for a given index", func(t *testing.T) {
		input := "first line\nsecond line\nthird line"
		index := strings.Index(input, "second")
		result := GetLocation(index, input)
		if result.Line == nil || *result.Line != 1 {
			t.Errorf("Expected line to be 1, got %v", result.Line)
		}
		if result.Column != 0 {
			t.Errorf("Expected column to be 0, got %d", result.Column)
		}
	})

	t.Run("should handle index at start of file", func(t *testing.T) {
		input := "first line\nsecond line"
		result := GetLocation(0, input)
		if result.Line == nil || *result.Line != 0 {
			t.Errorf("Expected line to be 0, got %v", result.Line)
		}
		if result.Column != 0 {
			t.Errorf("Expected column to be 0, got %d", result.Column)
		}
	})

	t.Run("should handle index at end of line", func(t *testing.T) {
		input := "first\nsecond\n"
		index := strings.Index(input, "\n")
		result := GetLocation(index, input)
		if result.Line == nil || *result.Line != 0 {
			t.Errorf("Expected line to be 0, got %v", result.Line)
		}
		if result.Column != 5 {
			t.Errorf("Expected column to be 5, got %d", result.Column)
		}
	})

	t.Run("should handle index after newline", func(t *testing.T) {
		input := "first\nsecond"
		index := strings.Index(input, "second")
		result := GetLocation(index, input)
		if result.Line == nil || *result.Line != 1 {
			t.Errorf("Expected line to be 1, got %v", result.Line)
		}
		if result.Column != 0 {
			t.Errorf("Expected column to be 0, got %d", result.Column)
		}
	})

	t.Run("should return line as nil if index is not a number", func(t *testing.T) {
		input := "line1\nline2"
		result := GetLocation("invalid", input)
		if result.Line != nil {
			t.Errorf("Expected line to be nil, got %v", result.Line)
		}
		if result.Column != -1 {
			t.Errorf("Expected column to be -1, got %d", result.Column)
		}
	})

	t.Run("should handle index at end of file", func(t *testing.T) {
		input := "first\nsecond"
		result := GetLocation(len(input), input)
		if result.Line == nil || *result.Line != 1 {
			t.Errorf("Expected line to be 1, got %v", result.Line)
		}
		if result.Column != 6 {
			t.Errorf("Expected column to be 6, got %d", result.Column)
		}
	})

	t.Run("should handle out of bounds index", func(t *testing.T) {
		input := "first\nsecond"
		result := GetLocation(len(input)+1, input)
		if result.Line != nil {
			t.Errorf("Expected line to be nil, got %v", result.Line)
		}
		if result.Column != -1 {
			t.Errorf("Expected column to be -1, got %d", result.Column)
		}
	})

	t.Run("should handle negative index", func(t *testing.T) {
		input := "first\nsecond"
		result := GetLocation(-1, input)
		if result.Line != nil {
			t.Errorf("Expected line to be nil, got %v", result.Line)
		}
		if result.Column != -1 {
			t.Errorf("Expected column to be -1, got %d", result.Column)
		}
	})
}

func TestCopyArray(t *testing.T) {
	t.Run("should return a shallow copy of the array", func(t *testing.T) {
		arr := []any{1, 2, 3}
		newArr := CopyArray(arr)
		if len(newArr) != len(arr) {
			t.Errorf("Expected length %d, got %d", len(arr), len(newArr))
		}
		for i, v := range arr {
			if newArr[i] != v {
				t.Errorf("Expected value %v at index %d, got %v", v, i, newArr[i])
			}
		}
	})

	t.Run("should work for an empty array", func(t *testing.T) {
		arr := []any{}
		newArr := CopyArray(arr)
		if len(newArr) != 0 {
			t.Errorf("Expected empty array, got length %d", len(newArr))
		}
	})
}

func TestClone(t *testing.T) {
	t.Run("should clone only own properties", func(t *testing.T) {
		obj := map[string]any{
			"a": 1,
			"b": 2,
		}
		cloned := Clone(obj)
		if len(cloned) != 2 {
			t.Errorf("Expected 2 properties, got %d", len(cloned))
		}
		if cloned["a"] != 1 || cloned["b"] != 2 {
			t.Errorf("Expected values {a: 1, b: 2}, got %v", cloned)
		}
	})

	t.Run("should return an empty map when cloning an empty map", func(t *testing.T) {
		obj := map[string]any{}
		cloned := Clone(obj)
		if len(cloned) != 0 {
			t.Errorf("Expected empty map, got length %d", len(cloned))
		}
	})
}

func TestDefaults(t *testing.T) {
	t.Run("should merge default properties when obj2 is nil", func(t *testing.T) {
		obj1 := map[string]any{
			"a": 1,
			"b": 2,
		}
		result := Defaults(obj1, nil)
		if defaults, ok := result["_defaults"].(map[string]any); !ok {
			t.Error("Expected _defaults property")
		} else if defaults["a"] != 1 || defaults["b"] != 2 {
			t.Errorf("Expected _defaults to be %v, got %v", obj1, defaults)
		}
		if result["a"] != 1 || result["b"] != 2 {
			t.Errorf("Expected properties {a: 1, b: 2}, got %v", result)
		}
	})

	t.Run("should merge defaults when obj2 does not contain _defaults", func(t *testing.T) {
		obj1 := map[string]any{
			"a": 1,
			"b": 2,
		}
		obj2 := map[string]any{
			"b": 3,
			"c": 4,
		}
		result := Defaults(obj1, obj2)
		if defaults, ok := result["_defaults"].(map[string]any); !ok {
			t.Error("Expected _defaults property")
		} else if defaults["a"] != 1 || defaults["b"] != 2 {
			t.Errorf("Expected _defaults to be %v, got %v", obj1, defaults)
		}
		if result["a"] != 1 || result["b"] != 3 || result["c"] != 4 {
			t.Errorf("Expected properties {a: 1, b: 3, c: 4}, got %v", result)
		}
	})

	t.Run("should return obj2 unchanged if it already has _defaults", func(t *testing.T) {
		obj1 := map[string]any{
			"a": 1,
		}
		obj2 := map[string]any{
			"b": 2,
			"_defaults": map[string]any{
				"already": true,
			},
		}
		result := Defaults(obj1, obj2)
		if result["b"] != 2 {
			t.Errorf("Expected b to be 2, got %v", result["b"])
		}
		if defaults, ok := result["_defaults"].(map[string]any); !ok || defaults["already"] != true {
			t.Error("Expected _defaults to be unchanged")
		}
	})
}

func TestCopyOptions(t *testing.T) {
	t.Run("should return opts as is if _defaults property exists", func(t *testing.T) {
		opts := map[string]any{
			"_defaults": map[string]any{"a": 1},
			"math":     "always",
		}
		result := CopyOptions(map[string]any{}, opts)
		if result["math"] != "always" {
			t.Errorf("Expected math to be 'always', got %v", result["math"])
		}
	})

	t.Run("should add strictMath change to opts", func(t *testing.T) {
		opts := map[string]any{
			"strictMath": true,
		}
		result := CopyOptions(map[string]any{}, opts)
		if result["math"] != Math.Parens {
			t.Errorf("Expected math to be Math.Parens, got %v", result["math"])
		}
	})

	t.Run("should handle relativeUrls option", func(t *testing.T) {
		opts := map[string]any{
			"relativeUrls": true,
		}
		result := CopyOptions(map[string]any{}, opts)
		if result["rewriteUrls"] != RewriteUrls.All {
			t.Errorf("Expected rewriteUrls to be RewriteUrls.All, got %v", result["rewriteUrls"])
		}
	})

	t.Run("should map math string values correctly", func(t *testing.T) {
		cases := []struct {
			input    string
			expected MathType
		}{
			{"always", Math.Always},
			{"parens-division", Math.ParensDivision},
			{"strict", Math.Parens},
			{"parens", Math.Parens},
			{"unknown", Math.Parens},
		}

		for _, c := range cases {
			opts := map[string]any{
				"math": c.input,
			}
			result := CopyOptions(map[string]any{}, opts)
			if result["math"] != c.expected {
				t.Errorf("For input %s, expected %v, got %v", c.input, c.expected, result["math"])
			}
		}
	})

	t.Run("should map rewriteUrls string values correctly", func(t *testing.T) {
		cases := []struct {
			input    string
			expected RewriteUrlsType
		}{
			{"off", RewriteUrls.Off},
			{"local", RewriteUrls.Local},
			{"all", RewriteUrls.All},
		}

		for _, c := range cases {
			opts := map[string]any{
				"rewriteUrls": c.input,
			}
			result := CopyOptions(map[string]any{}, opts)
			if result["rewriteUrls"] != c.expected {
				t.Errorf("For input %s, expected %v, got %v", c.input, c.expected, result["rewriteUrls"])
			}
		}
	})

	t.Run("should keep numeric math and rewriteUrls values unchanged", func(t *testing.T) {
		opts := map[string]any{
			"math":         Math.ParensDivision,
			"rewriteUrls":  RewriteUrls.Local,
		}
		result := CopyOptions(map[string]any{}, opts)
		if result["math"] != Math.ParensDivision {
			t.Errorf("Expected math to be Math.ParensDivision, got %v", result["math"])
		}
		if result["rewriteUrls"] != RewriteUrls.Local {
			t.Errorf("Expected rewriteUrls to be RewriteUrls.Local, got %v", result["rewriteUrls"])
		}
	})
}

func TestMerge(t *testing.T) {
	t.Run("should merge properties from obj2 into obj1", func(t *testing.T) {
		obj1 := map[string]any{
			"a": 1,
			"b": 2,
		}
		obj2 := map[string]any{
			"b": 3,
			"c": 4,
		}
		result := Merge(obj1, obj2)
		if result["a"] != 1 || result["b"] != 3 || result["c"] != 4 {
			t.Errorf("Expected {a: 1, b: 3, c: 4}, got %v", result)
		}
	})

	t.Run("should overwrite properties in obj1 with those in obj2", func(t *testing.T) {
		obj1 := map[string]any{
			"key": "value1",
		}
		obj2 := map[string]any{
			"key": "value2",
		}
		result := Merge(obj1, obj2)
		if result["key"] != "value2" {
			t.Errorf("Expected key to be 'value2', got %v", result["key"])
		}
	})
}

func TestFlattenArray(t *testing.T) {
	t.Run("should flatten nested arrays", func(t *testing.T) {
		arr := []any{
			1,
			[]any{
				2,
				[]any{3, 4},
				5,
			},
			6,
		}
		result := FlattenArray(arr)
		expected := []any{1, 2, 3, 4, 5, 6}
		if len(result) != len(expected) {
			t.Errorf("Expected length %d, got %d", len(expected), len(result))
		}
		for i, v := range expected {
			if result[i] != v {
				t.Errorf("Expected %v at index %d, got %v", v, i, result[i])
			}
		}
	})

	t.Run("should ignore nil values", func(t *testing.T) {
		arr := []any{
			1,
			nil,
			[]any{
				2,
				nil,
				3,
			},
		}
		result := FlattenArray(arr)
		expected := []any{1, 2, 3}
		if len(result) != len(expected) {
			t.Errorf("Expected length %d, got %d", len(expected), len(result))
		}
		for i, v := range expected {
			if result[i] != v {
				t.Errorf("Expected %v at index %d, got %v", v, i, result[i])
			}
		}
	})

	t.Run("should handle an already flat array", func(t *testing.T) {
		arr := []any{1, 2, 3}
		result := FlattenArray(arr)
		if len(result) != len(arr) {
			t.Errorf("Expected length %d, got %d", len(arr), len(result))
		}
		for i, v := range arr {
			if result[i] != v {
				t.Errorf("Expected %v at index %d, got %v", v, i, result[i])
			}
		}
	})
}

func TestIsNullOrUndefined(t *testing.T) {
	t.Run("should return true for nil", func(t *testing.T) {
		if !IsNullOrUndefined(nil) {
			t.Error("Expected true for nil")
		}
	})

	t.Run("should return false for non-nil values", func(t *testing.T) {
		values := []any{
			0,
			"",
			false,
			map[string]any{},
		}
		for _, v := range values {
			if IsNullOrUndefined(v) {
				t.Errorf("Expected false for %v", v)
			}
		}
	})
} 