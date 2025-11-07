package less_go

import (
	"fmt"
	"os"
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

	// Create evaluation context as an *Eval struct
	evalEnv := NewEval(options, []any{})

	// Initialize defaultFunc for mixin guards
	evalEnv.DefaultFunc = NewDefaultFunc()
	
	// Add function registry support - check if functions are provided in options
	var functionRegistry *Registry
	if functionsObj, ok := options["functions"]; ok {
		if defaultFuncs, ok := functionsObj.(*DefaultFunctions); ok && defaultFuncs.registry != nil {
			functionRegistry = defaultFuncs.registry.Inherit()
		}
	}
	if functionRegistry == nil {
		// Fallback to global registry with list functions
		functionRegistry = DefaultRegistry.Inherit()
		// Add list functions to the registry
		listFunctions := GetListFunctions()
		for name, fn := range listFunctions {
			switch name {
			case "_SELF":
				if selfFn, ok := fn.(func(any) any); ok {
					functionRegistry.Add(name, &FlexibleFunctionDef{
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
					functionRegistry.Add(name, &FlexibleFunctionDef{
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
					functionRegistry.Add(name, &FlexibleFunctionDef{
						name:      name,
						minArgs:   1,
						maxArgs:   3,
						variadic:  false,
						fn:        rangeFn,
						needsEval: true,
					})
				}
			case "each":
				if eachFn, ok := fn.(func(any, any) any); ok {
					functionRegistry.Add(name, &FlexibleFunctionDef{
						name:      name,
						minArgs:   2,
						maxArgs:   2,
						variadic:  false,
						fn:        eachFn,
						needsEval: false, // 'each' needs unevaluated args
					})
				}
			}
		}
	}
	evalEnv.FunctionRegistry = functionRegistry
	// Set default math mode to ALWAYS for now (can be overridden by options)
	if evalEnv.Math == 0 {
		evalEnv.Math = Math.Always
	}
	if os.Getenv("LESS_GO_TRACE") == "1" {
		fmt.Printf("[TRANSFORM-TREE-DEBUG] Initial math mode: %v, evalEnv type: *Eval\n", evalEnv.Math)
	}
	// MathOn is already set to true in NewEval
	// ParensStack, InParenthesis, OutOfParenthesis, IsMathOnWithOp are all methods on *Eval

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
		evalEnv.Frames = []any{NewRuleset(nil, declarations, false, nil)}
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

