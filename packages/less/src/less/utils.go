package less

import (
	"strings"
)

// Location represents a position in the input stream
type Location struct {
	Line   *int
	Column int
}

// GetLocation returns the line and column for a given index in the input stream
func GetLocation(index interface{}, inputStream string) Location {
	var line *int
	column := -1

	if idx, ok := index.(int); ok {
		n := idx + 1
		for n > 0 && n <= len(inputStream) && inputStream[n-1] != '\n' {
			column++
			n--
		}

		lineCount := strings.Count(inputStream[:idx], "\n")
		line = &lineCount
	}

	return Location{
		Line:   line,
		Column: column,
	}
}

// CopyArray creates a shallow copy of a slice
func CopyArray(arr []interface{}) []interface{} {
	copy := make([]interface{}, len(arr))
	for i, v := range arr {
		copy[i] = v
	}
	return copy
}

// Clone creates a shallow copy of a map
func Clone(obj map[string]interface{}) map[string]interface{} {
	cloned := make(map[string]interface{})
	for k, v := range obj {
		cloned[k] = v
	}
	return cloned
}

// Defaults merges default properties from obj1 into obj2
func Defaults(obj1, obj2 map[string]interface{}) map[string]interface{} {
	if obj2 == nil {
		obj2 = make(map[string]interface{})
	}

	if _, hasDefaults := obj2["_defaults"]; !hasDefaults {
		newObj := make(map[string]interface{})
		defaults := Clone(obj1)
		newObj["_defaults"] = defaults

		if obj2 != nil {
			cloned := Clone(obj2)
			for k, v := range defaults {
				newObj[k] = v
			}
			for k, v := range cloned {
				newObj[k] = v
			}
		} else {
			for k, v := range defaults {
				newObj[k] = v
			}
		}
		return newObj
	}

	return obj2
}

// CopyOptions processes and copies options with special handling for math and rewriteUrls
func CopyOptions(obj1, obj2 map[string]interface{}) map[string]interface{} {
	if obj2 == nil {
		obj2 = make(map[string]interface{})
	}

	if _, hasDefaults := obj2["_defaults"]; hasDefaults {
		return obj2
	}

	opts := Defaults(obj1, obj2)

	if strictMath, ok := opts["strictMath"].(bool); ok && strictMath {
		opts["math"] = Math.Parens
	}

	if relativeUrls, ok := opts["relativeUrls"].(bool); ok && relativeUrls {
		opts["rewriteUrls"] = RewriteUrls.All
	}

	if math, ok := opts["math"].(string); ok {
		switch strings.ToLower(math) {
		case "always":
			opts["math"] = Math.Always
		case "parens-division":
			opts["math"] = Math.ParensDivision
		case "strict", "parens":
			opts["math"] = Math.Parens
		default:
			opts["math"] = Math.Parens
		}
	}

	if rewriteUrls, ok := opts["rewriteUrls"].(string); ok {
		switch strings.ToLower(rewriteUrls) {
		case "off":
			opts["rewriteUrls"] = RewriteUrls.Off
		case "local":
			opts["rewriteUrls"] = RewriteUrls.Local
		case "all":
			opts["rewriteUrls"] = RewriteUrls.All
		}
	}

	return opts
}

// Merge merges properties from obj2 into obj1
func Merge(obj1, obj2 map[string]interface{}) map[string]interface{} {
	for k, v := range obj2 {
		obj1[k] = v
	}
	return obj1
}

// FlattenArray flattens a nested slice structure
func FlattenArray(arr []interface{}, result ...[]interface{}) []interface{} {
	var res []interface{}
	if len(result) > 0 {
		res = result[0]
	} else {
		res = make([]interface{}, 0)
	}

	for _, v := range arr {
		if nested, ok := v.([]interface{}); ok {
			res = FlattenArray(nested, res)
		} else if v != nil {
			res = append(res, v)
		}
	}
	return res
}

// IsNullOrUndefined checks if a value is nil
func IsNullOrUndefined(val interface{}) bool {
	return val == nil
} 