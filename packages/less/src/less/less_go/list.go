package less_go

import "strconv"

// GetItemsFromNode helper function that normalizes values to arrays
func GetItemsFromNode(node any) []any {
	if node == nil {
		return []any{node}
	}

	// Check if the node has a 'value' property that's an array
	if nodeMap, ok := node.(map[string]any); ok {
		if value, exists := nodeMap["value"]; exists {
			if valueSlice, ok := value.([]any); ok {
				return valueSlice
			}
		}
	}

	// Check if it's a Value type with slice
	if valueNode, ok := node.(*Value); ok && valueNode != nil {
		return valueNode.Value
	}

	// Check if it's an Expression type with slice
	if exprNode, ok := node.(*Expression); ok && exprNode != nil {
		return exprNode.Value
	}

	// Check if it's directly a slice
	if valueSlice, ok := node.([]any); ok {
		return valueSlice
	}

	// Default: treat as single item array
	return []any{node}
}

// Self returns the input node unchanged
func Self(n any) any {
	return n
}

// SpaceSeparatedValues creates a space-separated list (~)
func SpaceSeparatedValues(expr ...any) any {
	if len(expr) == 1 {
		return expr[0]
	}
	value, _ := NewValue(expr)
	return value
}

// Extract extracts an item from a list using 1-based indexing
func Extract(values any, indexNode any) any {
	items := GetItemsFromNode(values)

	// Extract the index value
	var index int
	var indexFloat float64
	if dimNode, ok := indexNode.(*Dimension); ok {
		indexFloat = dimNode.Value - 1 // Convert to 0-based index
		index = int(indexFloat)
		// Check if it's exactly an integer (like JavaScript array access)
		if indexFloat != float64(index) {
			return nil // JavaScript returns undefined for fractional indices
		}
	} else if indexMap, ok := indexNode.(map[string]any); ok {
		if val, exists := indexMap["value"]; exists {
			if floatVal, ok := val.(float64); ok {
				index = int(floatVal) - 1
			} else if intVal, ok := val.(int); ok {
				index = intVal - 1
			} else if strVal, ok := val.(string); ok {
				if parsedVal, err := strconv.ParseFloat(strVal, 64); err == nil {
					index = int(parsedVal) - 1
				} else {
					return nil
				}
			} else {
				return nil
			}
		} else {
			return nil
		}
	} else {
		return nil
	}

	// Check bounds
	if index < 0 || index >= len(items) {
		return nil
	}

	return items[index]
}

// Length returns the length of a list
func Length(values any) *Dimension {
	items := GetItemsFromNode(values)
	dim, _ := NewDimension(float64(len(items)), nil)
	return dim
}

// Range creates a range of incremental values
func Range(start, end, step any) *Expression {
	var from float64 = 1
	var to float64
	var stepValue float64 = 1
	var unit *Unit

	// Parse the parameters following JavaScript logic
	if end != nil {
		// Three parameter mode: range(start, end, step)
		if startDim, ok := start.(*Dimension); ok {
			from = startDim.Value
		}
		if endDim, ok := end.(*Dimension); ok {
			to = endDim.Value
			unit = endDim.Unit
		}
		if step != nil {
			if stepDim, ok := step.(*Dimension); ok {
				stepValue = stepDim.Value
			}
		}
	} else {
		// Single parameter mode: range(end)
		if startDim, ok := start.(*Dimension); ok {
			to = startDim.Value
			unit = startDim.Unit
		}
	}

	// Generate the list
	var list []any
	for i := from; i <= to; i += stepValue {
		dim, _ := NewDimension(i, unit)
		list = append(list, dim)
	}

	expr, err := NewExpression(list, false)
	if err != nil {
		// This shouldn't happen with a valid slice, but handle it gracefully
		expr, _ = NewExpression([]any{}, false)
	}
	return expr
}

// Each function is complex and involves creating rulesets with variable injection
// For now, we'll implement a simplified version that documents the interface
func Each(list any, ruleset any) any {
	// This function is very complex in the JavaScript version as it:
	// 1. Evaluates nodes in the list
	// 2. Creates new rulesets for each item
	// 3. Injects @value, @key, @index variables
	// 4. Handles different list types (arrays, rulesets, etc.)
	// 5. Skips comments during iteration
	
	// For now, return a basic result to maintain interface compatibility
	// This will need full implementation when we have complete tree node support
	return nil
}

// GetListFunctions returns the list function registry
func GetListFunctions() map[string]any {
	return map[string]any{
		"_SELF":   Self,
		"~":       SpaceSeparatedValues, 
		"extract": Extract,
		"length":  Length,
		"range":   Range,
		"each":    Each,
	}
}