package less_go

import (
	"strconv"
)

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

// Each function iterates over a list and creates rulesets with injected variables
// This is a direct port of the JavaScript each function from list.js
func Each(list any, rs any) any {
	rules := make([]any, 0)
	var iterator []any

	// tryEval function - evaluates nodes if they have an Eval method
	tryEval := func(val any) any {
		// Check if val has an Eval method (implements Node interface)
		if evalable, ok := val.(interface{ Eval(any) (any, error) }); ok {
			// Note: In JavaScript, this.context is available, but in Go we don't have context here
			// For now, we'll return the node as-is since we don't have evaluation context
			// This matches the JavaScript behavior when context is not available
			return evalable
		}
		return val
	}

	// Handle different list types following JavaScript logic
	if valueNode, ok := list.(*Value); ok && valueNode.Value != nil {
		// Check if it's a Quoted type (has quote property in JavaScript)
		if _, isQuoted := list.(*Quoted); !isQuoted {
			// Array value - map tryEval over each item
			iterator = make([]any, len(valueNode.Value))
			for i, item := range valueNode.Value {
				iterator[i] = tryEval(item)
			}
		}
	} else if detachedRuleset, ok := list.(*DetachedRuleset); ok && detachedRuleset.ruleset != nil {
		// list.ruleset case
		if rulesetNode, ok := detachedRuleset.ruleset.(*Ruleset); ok {
			iterator = rulesetNode.Rules
		} else if node, ok := detachedRuleset.ruleset.(*Node); ok && node.Value != nil {
			if rulesetNode, ok := node.Value.(*Ruleset); ok {
				iterator = rulesetNode.Rules
			}
		}
	} else if rulesetNode, ok := list.(*Ruleset); ok {
		// list.rules case
		iterator = make([]any, len(rulesetNode.Rules))
		for i, rule := range rulesetNode.Rules {
			iterator[i] = tryEval(rule)
		}
	} else if listSlice, ok := list.([]any); ok {
		// Array case
		iterator = make([]any, len(listSlice))
		for i, item := range listSlice {
			iterator[i] = tryEval(item)
		}
	} else {
		// Single item case
		iterator = []any{tryEval(list)}
	}

	// Default variable names
	valueName := "@value"
	keyName := "@key" 
	indexName := "@index"

	// Handle ruleset parameter extraction (for mixin calls with parameters)
	var targetRuleset *Ruleset
	// For now, we'll assume rs is a DetachedRuleset or map with rules
	if detachedRuleset, ok := rs.(*DetachedRuleset); ok && detachedRuleset.ruleset != nil {
		if rulesetNode, ok := detachedRuleset.ruleset.(*Ruleset); ok {
			targetRuleset = rulesetNode
		} else if node, ok := detachedRuleset.ruleset.(*Node); ok && node.Value != nil {
			if rulesetNode, ok := node.Value.(*Ruleset); ok {
				targetRuleset = rulesetNode
			}
		}
	} else if rulesetNode, ok := rs.(*Ruleset); ok {
		targetRuleset = rulesetNode
	} else if rsMap, ok := rs.(map[string]any); ok {
		// Handle map case (like from test)
		if rulesAny, exists := rsMap["rules"]; exists {
			if rulesSlice, ok := rulesAny.([]any); ok {
				// Create a temporary ruleset
				ampersandElement := NewElement(nil, "&", false, 0, nil, nil)
				ampersandSelector, err := NewSelector([]*Element{ampersandElement}, nil, nil, 0, nil, nil)
				if err == nil {
					targetRuleset = NewRuleset([]any{ampersandSelector}, rulesSlice, false, nil)
				}
			}
		}
	}

	if targetRuleset == nil {
		return createEmptyRuleset()
	}

	// Iterate through items
	for i, item := range iterator {
		// Skip comments
		if _, isComment := item.(*Comment); isComment {
			continue
		}

		var key any
		var value any

		// Handle Declaration items
		if decl, ok := item.(*Declaration); ok {
			// Get name from declaration
			if decl.name != nil {
				if nameStr, ok := decl.name.(string); ok {
					key = nameStr
				} else if nameSlice, ok := decl.name.([]any); ok && len(nameSlice) > 0 {
					// Handle array of names (first element)
					key = nameSlice[0]
				}
			}
			value = decl.Value
		} else {
			// For non-declaration items, use 1-based index as key
			keyDim, _ := NewDimension(float64(i+1), nil)
			key = keyDim
			value = item
		}

		// Create new rules slice with copies of base rules
		newRules := make([]any, len(targetRuleset.Rules))
		copy(newRules, targetRuleset.Rules)

		// Inject @value variable
		if valueName != "" && value != nil {
			valueDecl, err := NewDeclaration(valueName, value, false, false, 0, nil, false, false)
			if err == nil {
				newRules = append(newRules, valueDecl)
			}
		}

		// Inject @index variable (1-based)
		if indexName != "" {
			indexDim, err := NewDimension(float64(i+1), nil)
			if err == nil {
				indexDecl, err := NewDeclaration(indexName, indexDim, false, false, 0, nil, false, false)
				if err == nil {
					newRules = append(newRules, indexDecl)
				}
			}
		}

		// Inject @key variable  
		if keyName != "" && key != nil {
			keyDecl, err := NewDeclaration(keyName, key, false, false, 0, nil, false, false)
			if err == nil {
				newRules = append(newRules, keyDecl)
			}
		}

		// Create new ruleset with ampersand selector
		ampersandElement := NewElement(nil, "&", false, 0, nil, nil)
		ampersandSelector, err := NewSelector([]*Element{ampersandElement}, nil, nil, 0, nil, nil)
		if err == nil {
			newRuleset := NewRuleset([]any{ampersandSelector}, newRules, targetRuleset.StrictImports, targetRuleset.VisibilityInfo())
			rules = append(rules, newRuleset)
		}
	}

	// Create final ruleset containing all generated rules
	ampersandElement := NewElement(nil, "&", false, 0, nil, nil)
	ampersandSelector, err := NewSelector([]*Element{ampersandElement}, nil, nil, 0, nil, nil)
	if err != nil {
		return createEmptyRuleset()
	}

	finalRuleset := NewRuleset([]any{ampersandSelector}, rules, targetRuleset.StrictImports, targetRuleset.VisibilityInfo())
	
	// The JavaScript version calls .eval(this.context) on the final result
	// Since we don't have context here, we return the ruleset as-is
	// The caller should handle evaluation with proper context
	return finalRuleset
}

// Helper function to create an empty ruleset
func createEmptyRuleset() *Ruleset {
	ampersandElement := NewElement(nil, "&", false, 0, nil, nil)
	ampersandSelector, _ := NewSelector([]*Element{ampersandElement}, nil, nil, 0, nil, nil)
	return NewRuleset([]any{ampersandSelector}, []any{}, false, nil)
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

// GetWrappedListFunctions returns list functions for registry
func GetWrappedListFunctions() map[string]interface{} {
	return GetListFunctions()
}