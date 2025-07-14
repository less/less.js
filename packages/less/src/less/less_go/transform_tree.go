package less_go

import (
	"reflect"
)


// TransformTree transforms the root AST node using various visitors
// This is a direct port of the JavaScript transform-tree.js default export function
func TransformTree(root any, options map[string]any) any {
	if options == nil {
		options = make(map[string]any)
	}

	var evaldRoot any
	variables := options["variables"]
	
	// Create evaluation context as a map, matching JavaScript's plain object approach
	evalEnv := make(map[string]any)
	// Copy options to evalEnv
	for k, v := range options {
		evalEnv[k] = v
	}
	// Initialize required fields
	evalEnv["frames"] = []any{}
	evalEnv["importantScope"] = []map[string]bool{}
	evalEnv["mathOn"] = true
	// Set default math mode to ALWAYS for now (can be overridden by options)
	if _, exists := evalEnv["math"]; !exists {
		evalEnv["math"] = Math.Always
	}
	// Add isMathOn function that matches JavaScript contexts.js implementation
	evalEnv["isMathOn"] = func(op string) bool {
		mathOn, exists := evalEnv["mathOn"]
		if !exists || !mathOn.(bool) {
			return false
		}
		
		// Check for division operator with math mode restrictions
		if op == "/" {
			math, mathExists := evalEnv["math"]
			if mathExists && math != Math.Always {
				// Check if we're in parentheses
				parensStack, parensExists := evalEnv["parensStack"]
				if !parensExists {
					return false
				}
				if stack, ok := parensStack.([]bool); ok && len(stack) == 0 {
					return false
				}
			}
		}
		
		// Check if math is disabled for everything except in parentheses
		if math, mathExists := evalEnv["math"]; mathExists {
			if mathType, ok := math.(MathType); ok && mathType > Math.ParensDivision {
				parensStack, parensExists := evalEnv["parensStack"]
				if !parensExists {
					return false
				}
				if stack, ok := parensStack.([]bool); ok {
					return len(stack) > 0
				}
				return false
			}
		}
		
		return true
	}

	//
	// Allows setting variables with a hash, so:
	//
	//   `{ color: new tree.Color('#f01') }` will become:
	//
	//   new tree.Declaration('@color',
	//     new tree.Value([
	//       new tree.Expression([
	//         new tree.Color('#f01')
	//       ])
	//     ])
	//   )
	//
	// Handle variables exactly like JavaScript (including the null bug)
	// In JavaScript: typeof null === 'object' && !Array.isArray(null) === true
	if (variables != nil && reflect.TypeOf(variables).Kind() == reflect.Map && !isArray(variables)) || 
	   (variables != nil && reflect.TypeOf(variables).Kind() == reflect.Ptr && reflect.ValueOf(variables).IsNil()) {
		// Check for the JavaScript null bug case
		if reflect.TypeOf(variables).Kind() == reflect.Ptr && reflect.ValueOf(variables).IsNil() {
			// Reproduce JavaScript's Object.keys(null) error
			panic("Cannot convert undefined or null to object")
		}
		
		varsMap := variables.(map[string]any)
		declarations := make([]any, 0, len(varsMap))

		for k, value := range varsMap {
			if !isValueInstance(value) {
				if !isExpressionInstance(value) {
					expr, err := NewExpression([]any{value}, false)
					if err != nil {
						// In JavaScript, errors are thrown, so we panic here to match behavior
						panic(err)
					}
					value = expr
				}
				val, err := NewValue([]any{value})
				if err != nil {
					// In JavaScript, errors are thrown, so we panic here to match behavior
					panic(err)
				}
				value = val
			}
			decl, err := NewDeclaration("@"+k, value, false, false, 0, nil, false, nil)
			if err != nil {
				// In JavaScript, errors are thrown, so we panic here to match behavior
				panic(err)
			}
			declarations = append(declarations, decl)
		}
		evalEnv["frames"] = []any{NewRuleset(nil, declarations, false, nil)}
	}

	// Create visitors exactly like JavaScript
	visitorList := []any{
		NewJoinSelectorVisitor(),
		NewSetTreeVisibilityVisitor(true), // This is MarkVisibleSelectorsVisitor in JS
		NewExtendVisitor(),
		NewToCSSVisitor(map[string]any{"compress": getBoolOption(options, "compress")}),
	}

	preEvalVisitors := make([]any, 0)
	var v any
	var visitorIterator any

	/**
	 * first() / get() allows visitors to be added while visiting
	 * 
	 * @todo Add scoping for visitors just like functions for @plugin; right now they're global
	 */
	if pluginManager := options["pluginManager"]; pluginManager != nil {
		if pm, ok := pluginManager.(interface{ Visitor() any }); ok {
			visitorIterator = pm.Visitor()
			for i := 0; i < 2; i++ {
				if vi, ok := visitorIterator.(interface{ First() }); ok {
					vi.First()
				}
				for {
					if vi, ok := visitorIterator.(interface{ Get() any }); ok {
						v = vi.Get()
						if v == nil {
							break
						}
						
						if preEvalVisitor, ok := v.(interface{ IsPreEvalVisitor() bool }); ok && preEvalVisitor.IsPreEvalVisitor() {
							if i == 0 || !containsVisitor(preEvalVisitors, v) {
								preEvalVisitors = append(preEvalVisitors, v)
								if runner, ok := v.(interface{ Run(any) any }); ok {
									runner.Run(root)
								} else if runner, ok := v.(interface{ Run(any) }); ok {
									runner.Run(root)
								}
							}
						} else {
							if i == 0 || !containsVisitor(visitorList, v) {
								if preVisitor, ok := v.(interface{ IsPreVisitor() bool }); ok && preVisitor.IsPreVisitor() {
									// Add to beginning of slice
									visitorList = append([]any{v}, visitorList...)
								} else {
									visitorList = append(visitorList, v)
								}
							}
						}
					} else {
						break
					}
				}
			}
		}
	}

	// Check if imports should be processed
	processImports := false
	if val, ok := options["processImports"]; ok {
		if flag, ok := val.(bool); ok {
			processImports = flag
		}
	}
	
	// Process imports if enabled (before evaluation)
	var processedRoot any = root
	if processImports {
		if importer, ok := options["importManager"]; ok {
			importVisitor := NewImportVisitor(importer, func(err error) {
				if err != nil {
					panic(err)
				}
			})
			importVisitor.Run(root)
			// ImportVisitor typically modifies the tree in place,
			// so we continue with the original root
		}
	}
	processedRoot = root

	// Evaluate the root exactly like JavaScript: evaldRoot = root.eval(evalEnv)
	if evaluator, ok := processedRoot.(interface{ Eval(any) any }); ok {
		evaldRoot = evaluator.Eval(evalEnv)
	} else if ruleset, ok := processedRoot.(*Ruleset); ok {
		// Ruleset.Eval returns (*Ruleset, error)
		result, err := ruleset.Eval(evalEnv)
		if err != nil {
			panic(err)
		}
		evaldRoot = result
	} else if evaluatorWithError, ok := processedRoot.(interface{ Eval(any) (any, error) }); ok {
		// Handle evaluators that return errors - convert to panic like JavaScript throws
		result, err := evaluatorWithError.Eval(evalEnv)
		if err != nil {
			panic(err)
		}
		evaldRoot = result
	} else {
		evaldRoot = processedRoot
	}

	// Run all visitors exactly like JavaScript
	for _, visitor := range visitorList {
		if runner, ok := visitor.(interface{ Run(any) any }); ok {
			evaldRoot = runner.Run(evaldRoot)
		} else if runner, ok := visitor.(interface{ Run(any) }); ok {
			runner.Run(evaldRoot)
		}
	}

	// Run any remaining visitors added after eval pass
	if pluginManager := options["pluginManager"]; pluginManager != nil && visitorIterator != nil {
		if vi, ok := visitorIterator.(interface{ First() }); ok {
			vi.First()
		}
		for {
			if vi, ok := visitorIterator.(interface{ Get() any }); ok {
				v = vi.Get()
				if v == nil {
					break
				}
				if !containsVisitor(visitorList, v) && !containsVisitor(preEvalVisitors, v) {
					if runner, ok := v.(interface{ Run(any) any }); ok {
						runner.Run(evaldRoot)
					} else if runner, ok := v.(interface{ Run(any) }); ok {
						runner.Run(evaldRoot)
					}
				}
			} else {
				break
			}
		}
	}

	return evaldRoot
}

// Helper function to check if a value is an array
func isArray(value any) bool {
	if value == nil {
		return false
	}
	v := reflect.ValueOf(value)
	return v.Kind() == reflect.Slice || v.Kind() == reflect.Array
}

// Helper function to check if a value is a Value instance
func isValueInstance(value any) bool {
	_, ok := value.(*Value)
	return ok
}

// Helper function to check if a value is an Expression instance
func isExpressionInstance(value any) bool {
	_, ok := value.(*Expression)
	return ok
}

// Helper function to get boolean option value
func getBoolOption(options map[string]any, key string) bool {
	if val, ok := options[key]; ok {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
		// JavaScript Boolean() coercion - any truthy value becomes true
		return val != nil && val != false && val != 0 && val != ""
	}
	return false
}

// Helper function to check if visitor exists in slice
func containsVisitor(visitors []any, target any) bool {
	for _, v := range visitors {
		if v == target {
			return true
		}
	}
	return false
}

