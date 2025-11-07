package less_go

import (
	"fmt"
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

// EachFunctionDef is a special function definition for the each() function
type EachFunctionDef struct {
	name string
}

// Call implements the FunctionDefinition interface for non-context calls
func (e *EachFunctionDef) Call(args ...any) (any, error) {
	// This shouldn't be called for each() since it needs context
	return nil, fmt.Errorf("each() function requires context")
}

// CallCtx implements the FunctionDefinition interface for context calls
func (e *EachFunctionDef) CallCtx(ctx *Context, args ...any) (any, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("each() requires exactly 2 arguments")
	}
	return EachWithContext(args[0], args[1], ctx), nil
}

// NeedsEvalArgs returns whether arguments should be evaluated before calling
func (e *EachFunctionDef) NeedsEvalArgs() bool {
	return false // each() needs unevaluated arguments
}

// Each function iterates over a list and creates rulesets with injected variables
// This is a direct port of the JavaScript each function from list.js
func Each(list any, rs any) any {
	// This is the old function signature, kept for compatibility
	// It delegates to EachWithContext with nil context
	return EachWithContext(list, rs, nil)
}

// EachWithContext is the actual implementation that accepts context
func EachWithContext(list any, rs any, ctx *Context) any {
	rules := make([]any, 0)
	var iterator []any
	var sourceRuleset *Ruleset // Track the source ruleset for property resolution

	// Extract the actual eval context from the Context struct
	// The Context struct contains Frames with EvalContext, but Variable.Eval expects the map-based context
	var evalContext any
	if ctx != nil {
		if len(ctx.Frames) > 0 {
			rawContext := ctx.Frames[0].EvalContext
			// Check if it's a MapEvalContext and extract the underlying map
			if mapCtx, ok := rawContext.(*MapEvalContext); ok {
				evalContext = mapCtx.ctx
			} else {
				evalContext = rawContext
			}
		} else {
			// No frames, evalContext stays nil
			evalContext = nil
		}
	} else {
		// No context available
		evalContext = nil
	}

	// tryEval function - evaluates nodes if they have an Eval method
	tryEval := func(val any) any {
		// Check if val has an Eval method (implements Node interface)
		if evalable, ok := val.(interface{ Eval(any) (any, error) }); ok {
			if evalContext != nil {
				// We have context, evaluate the node
				result, err := evalable.Eval(evalContext)
				if err == nil {
					return result
				}
			}
			// No context or error, return as-is
			return evalable
		}
		return val
	}

	// Evaluate the list parameter first if it's a Variable or other evaluable node
	// This ensures we get the actual value before type-checking
	list = tryEval(list)

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
		// Store the source ruleset for property resolution
		if rulesetNode, ok := detachedRuleset.ruleset.(*Ruleset); ok {
			sourceRuleset = rulesetNode
			iterator = rulesetNode.Rules
		} else if node, ok := detachedRuleset.ruleset.(*Node); ok && node.Value != nil {
			if rulesetNode, ok := node.Value.(*Ruleset); ok {
				sourceRuleset = rulesetNode
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

	// Handle MixinDefinition (anonymous mixins with parameters)
	// If rs is a MixinDefinition, extract parameter names and get the rules
	if mixinDef, ok := rs.(*MixinDefinition); ok {
		// Extract parameter names from mixin params
		if len(mixinDef.Params) > 0 {
			if param0, ok := mixinDef.Params[0].(map[string]any); ok {
				if name, ok := param0["name"].(string); ok {
					valueName = name
				}
			}
		}
		if len(mixinDef.Params) > 1 {
			if param1, ok := mixinDef.Params[1].(map[string]any); ok {
				if name, ok := param1["name"].(string); ok {
					keyName = name
				}
			}
		}
		if len(mixinDef.Params) > 2 {
			if param2, ok := mixinDef.Params[2].(map[string]any); ok {
				if name, ok := param2["name"].(string); ok {
					indexName = name
				}
			}
		}
		// Use the mixin definition's rules as rs
		rs = mixinDef.Rules
	}

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
					// Handle array of names (first element) - extract value like JavaScript does
					// JavaScript: key = typeof item.name === 'string' ? item.name : item.name[0].value;
					first := nameSlice[0]
					// Try to extract value from Keyword or similar node
					if keyword, ok := first.(*Keyword); ok {
						key = keyword.value
					} else if nodeMap, ok := first.(map[string]any); ok {
						if val, exists := nodeMap["value"]; exists {
							key = val
						} else {
							key = first
						}
					} else {
						key = first
					}
				}
			}

			value = decl.Value
		} else {
			// For non-declaration items, use 1-based index as key
			keyDim, _ := NewDimension(float64(i+1), nil)
			key = keyDim
			value = item
		}

		// Create new rules slice - copy template rules first, then add variables
		// This matches JavaScript: newRules = rs.rules.slice(0); newRules.push(...)
		newRules := make([]any, len(targetRuleset.Rules), len(targetRuleset.Rules)+3)
		copy(newRules, targetRuleset.Rules)

		// Inject @value variable
		if valueName != "" && value != nil {
			valueDecl, err := NewDeclaration(valueName, value, false, false, 0, nil, false, nil)
			if err == nil {
				newRules = append(newRules, valueDecl)
			}
		}

		// Inject @index variable (1-based)
		if indexName != "" {
			indexDim, err := NewDimension(float64(i+1), nil)
			if err == nil {
				indexDecl, err := NewDeclaration(indexName, indexDim, false, false, 0, nil, false, nil)
				if err == nil {
					newRules = append(newRules, indexDecl)
				}
			}
		}

		// Inject @key variable
		if keyName != "" && key != nil {
			keyDecl, err := NewDeclaration(keyName, key, false, false, 0, nil, false, nil)
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
	if evalContext != nil {
		// If we're iterating over a detached ruleset, we need to add it to the frames
		// so that property references in declaration values can be resolved
		finalEvalContext := evalContext
		if sourceRuleset != nil {
			// Add the source ruleset to the frames for property resolution
			// This ensures that property references like $background-color can find
			// the background-color property from the same detached ruleset
			if contextMap, ok := evalContext.(map[string]any); ok {
				// Create a new context with the source ruleset prepended to frames
				newContextMap := make(map[string]any, len(contextMap))
				for k, v := range contextMap {
					newContextMap[k] = v
				}

				// Get existing frames or create empty slice
				var existingFrames []any
				if frames, ok := contextMap["frames"].([]any); ok {
					existingFrames = frames
				} else {
					existingFrames = []any{}
				}

				// Prepend source ruleset to frames
				newFrames := append([]any{sourceRuleset}, existingFrames...)
				newContextMap["frames"] = newFrames
				finalEvalContext = newContextMap
			} else if evalCtx, ok := evalContext.(*Eval); ok {
				// Handle *Eval context type
				// Create a new Eval context with the source ruleset prepended to frames
				newEvalCtx := &Eval{
					Frames:            append([]any{sourceRuleset}, evalCtx.Frames...),
					Compress:          evalCtx.Compress,
					Math:              evalCtx.Math,
					StrictUnits:       evalCtx.StrictUnits,
					Paths:             evalCtx.Paths,
					SourceMap:         evalCtx.SourceMap,
					ImportMultiple:    evalCtx.ImportMultiple,
					UrlArgs:           evalCtx.UrlArgs,
					JavascriptEnabled: evalCtx.JavascriptEnabled,
					PluginManager:     evalCtx.PluginManager,
					ImportantScope:    evalCtx.ImportantScope,
					RewriteUrls:       evalCtx.RewriteUrls,
					CalcStack:         evalCtx.CalcStack,
					ParensStack:       evalCtx.ParensStack,
					InCalc:            evalCtx.InCalc,
					MathOn:            evalCtx.MathOn,
					DefaultFunc:       evalCtx.DefaultFunc,
				}
				finalEvalContext = newEvalCtx
			}
		}

		// Evaluate the final ruleset with context
		result, err := finalRuleset.Eval(finalEvalContext)
		if err != nil {
			// If evaluation fails, return the unevaluated ruleset
			return finalRuleset
		}
		return result
	}
	// No context available, return as-is
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

// init registers list functions with the default registry
func init() {
	listFunctions := GetListFunctions()
	for name, fn := range listFunctions {
		switch name {
		case "_SELF":
			if selfFn, ok := fn.(func(any) any); ok {
				DefaultRegistry.Add(name, &FlexibleFunctionDef{
					name:      name,
					minArgs:   1,
					maxArgs:   1,
					variadic:  false,
					fn:        selfFn,
					needsEval: true,
				})
			}
		case "~":
			if spaceFn, ok := fn.(func(...any) any); ok {
				DefaultRegistry.Add(name, &FlexibleFunctionDef{
					name:      name,
					minArgs:   0,
					maxArgs:   -1,
					variadic:  true,
					fn:        spaceFn,
					needsEval: true,
				})
			}
		case "range":
			if rangeFn, ok := fn.(func(any, any, any) any); ok {
				DefaultRegistry.Add(name, &FlexibleFunctionDef{
					name:      name,
					minArgs:   1,
					maxArgs:   3,
					variadic:  false,
					fn:        rangeFn,
					needsEval: true,
				})
			}
		case "each":
			// Register the EachFunctionDef which supports context
			DefaultRegistry.Add(name, &EachFunctionDef{
				name: name,
			})
		case "length":
			if lengthFn, ok := fn.(func(any) *Dimension); ok {
				DefaultRegistry.Add(name, &FlexibleFunctionDef{
					name:      name,
					minArgs:   1,
					maxArgs:   1,
					variadic:  false,
					fn:        func(args ...any) any {
						return lengthFn(args[0])
					},
					needsEval: true,
				})
			}
		case "extract":
			if extractFn, ok := fn.(func(any, any) any); ok {
				DefaultRegistry.Add(name, &FlexibleFunctionDef{
					name:      name,
					minArgs:   2,
					maxArgs:   2,
					variadic:  false,
					fn:        func(args ...any) any {
						return extractFn(args[0], args[1])
					},
					needsEval: true,
				})
			}
		default:
			// Try as 2-argument function 
			if functionImpl, ok := fn.(func(any, any) any); ok {
				DefaultRegistry.Add(name, &SimpleFunctionDef{
					name: name,
					fn:   functionImpl,
				})
			}
		}
	}
}