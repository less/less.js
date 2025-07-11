package less_go

import (
	"strings"
)

// Location represents a position in the input stream
type Location struct {
	Line   *int
	Column int
}

// GetLocation returns the line and column for a given index in the input stream
func GetLocation(index any, inputStream string) Location {
	var line *int
	column := -1

	if idx, ok := index.(int); ok {
		if idx >= 0 && idx <= len(inputStream) {
			// Count backwards to find column, matching JS behavior
			n := idx
			for n >= 0 && (n == idx || (n < len(inputStream) && inputStream[n] != '\n')) {
				column++
				n--
			}

			// Count newlines before index for line number
			if idx > 0 {
				lineCount := strings.Count(inputStream[:idx], "\n")
				line = &lineCount
			} else {
				zero := 0
				line = &zero
			}
		}
	}

	return Location{
		Line:   line,
		Column: column,
	}
}

// Should just use go's build in copy function instead of this when possible
func CopyArray(arr []any) []any {
	copy := make([]any, len(arr))
	for i, v := range arr {
		copy[i] = v
	}
	return copy
}

// Clone creates a shallow copy of a map
func Clone(obj map[string]any) map[string]any {
	cloned := make(map[string]any)
	for k, v := range obj {
		cloned[k] = v
	}
	return cloned
}

// Defaults merges default properties from obj1 into obj2
func Defaults(obj1, obj2 map[string]any) map[string]any {
	if obj2 == nil {
		obj2 = make(map[string]any)
	}

	if _, hasDefaults := obj2["_defaults"]; !hasDefaults {
		newObj := make(map[string]any)
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
func CopyOptions(obj1, obj2 map[string]any) map[string]any {
	if obj2 == nil {
		obj2 = make(map[string]any)
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
func Merge(obj1, obj2 map[string]any) map[string]any {
	for k, v := range obj2 {
		obj1[k] = v
	}
	return obj1
}

// FlattenArray flattens a nested slice structure
func FlattenArray(arr []any, result ...[]any) []any {
	var res []any
	if len(result) > 0 {
		res = result[0]
	} else {
		res = make([]any, 0)
	}

	for _, v := range arr {
		if nested, ok := v.([]any); ok {
			res = FlattenArray(nested, res)
		} else if v != nil {
			res = append(res, v)
		}
	}
	return res
}

// IsNullOrUndefined checks if a value is nil
func IsNullOrUndefined(val any) bool {
	return val == nil
} 