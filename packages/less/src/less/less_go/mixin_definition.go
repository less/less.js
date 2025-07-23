package less_go

import (
	"fmt"
)

// MixinDefinition represents a mixin definition node in the Less AST
type MixinDefinition struct {
	*Ruleset
	Name               string
	Params             []any
	Condition          any
	Variadic           bool
	Arity              int
	Lookups            map[string][]any
	Required           int
	OptionalParameters []string
	Frames             []any
}

// NewMixinDefinition creates a new MixinDefinition instance
func NewMixinDefinition(name string, params []any, rules []any, condition any, variadic bool, frames []any, visibilityInfo map[string]any) (*MixinDefinition, error) {
	// Handle default name
	if name == "" {
		name = "anonymous mixin"
	}

	// Create selectors array with single selector containing element
	element := NewElement(nil, name, false, 0, make(map[string]any), nil)
	selector, err := NewSelector([]*Element{element}, nil, nil, 0, make(map[string]any), visibilityInfo)
	if err != nil {
		return nil, err
	}

	// Create base ruleset
	ruleset := NewRuleset([]any{selector}, rules, false, visibilityInfo)
	ruleset.AllowRoot = true

	// Calculate arity
	arity := 0
	if params != nil {
		arity = len(params)
	}

	// Calculate required parameters and collect optional ones
	required := 0
	optionalParameters := []string{}
	
	for _, p := range params {
		if param, ok := p.(map[string]any); ok {
			paramName := param["name"]
			paramValue := param["value"]
			
			// Extract name string from either string or Variable
			var nameStr string
			if s, ok := paramName.(string); ok {
				nameStr = s
			} else if v, ok := paramName.(*Variable); ok {
				nameStr = v.GetName()
			}
			
			// JavaScript logic: !p.name || (p.name && !p.value)
			// Required if: no name OR empty string name OR (has name but no value)
			if paramName == nil || nameStr == "" || (paramName != nil && paramValue == nil) {
				required++
			} else {
				// Has both name and value - it's optional
				if nameStr != "" {
					optionalParameters = append(optionalParameters, nameStr)
				}
			}
		}
	}

	md := &MixinDefinition{
		Ruleset:            ruleset,
		Name:               name,
		Params:             params,
		Condition:          condition,
		Variadic:           variadic,
		Arity:              arity,
		Lookups:            make(map[string][]any),
		Required:           required,
		OptionalParameters: optionalParameters,
		Frames:             frames,
	}

	return md, nil
}

// GetType returns the type of the node
func (md *MixinDefinition) GetType() string {
	return "MixinDefinition"
}

// Type returns the type of the node (for compatibility)
func (md *MixinDefinition) Type() string {
	return "MixinDefinition"
}

// EvalFirst indicates this node should be evaluated first
func (md *MixinDefinition) EvalFirst() bool {
	return true
}

// IsRuleset returns true (MixinDefinition inherits from Ruleset in JavaScript)
func (md *MixinDefinition) IsRuleset() bool {
	return true
}

// Accept visits the mixin definition with a visitor
func (md *MixinDefinition) Accept(visitor any) {
	if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		if len(md.Params) > 0 {
			md.Params = v.VisitArray(md.Params)
		}
		if md.Rules != nil {
			md.Rules = v.VisitArray(md.Rules)
		}
	}
	
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		if md.Condition != nil {
			md.Condition = v.Visit(md.Condition)
		}
	}
}

// EvalParams evaluates mixin parameters and creates parameter frame
func (md *MixinDefinition) EvalParams(context any, mixinEnv any, args []any, evaldArguments []any) (*Ruleset, error) {
	frame := NewRuleset(nil, nil, false, nil)
	
	
	var varargs []any
	var arg any
	params := CopyArray(md.Params)
	var val any
	var name string
	var isNamedFound bool
	argIndex := 0
	argsLength := 0
	
	// Set up function registry inheritance
	if env, ok := mixinEnv.(map[string]any); ok {
		if frames, ok := env["frames"].([]any); ok && len(frames) > 0 {
			if frameMap, ok := frames[0].(map[string]any); ok {
				if funcRegistry, ok := frameMap["functionRegistry"]; ok {
					frame.FunctionRegistry = funcRegistry
				}
			}
		}
	}

	// Create new evaluation context
	newFrames := []any{frame}
	if env, ok := mixinEnv.(map[string]any); ok {
		if frames, ok := env["frames"].([]any); ok {
			newFrames = append(newFrames, frames...)
		}
	}
	
	evalContext := map[string]any{
		"frames": newFrames,
	}
	if env, ok := mixinEnv.(map[string]any); ok {
		for k, v := range env {
			if k != "frames" {
				evalContext[k] = v
			}
		}
	}

	if args != nil {
		args = CopyArray(args)
		argsLength = len(args)

		// Process named arguments first
		for i := 0; i < argsLength; i++ {
			if argMap, ok := args[i].(map[string]any); ok {
				if argName, ok := argMap["name"].(string); ok && argName != "" {
					name = argName
					isNamedFound = false
					
					// Ensure evaldArguments has enough slots
					for len(evaldArguments) < len(params) {
						evaldArguments = append(evaldArguments, nil)
					}
					
					for j := 0; j < len(params); j++ {
						if evaldArguments[j] != nil {
							continue
						}
						
						if paramMap, ok := params[j].(map[string]any); ok {
							// Handle both string names and Variable objects
							var paramNameStr string
							if paramName, ok := paramMap["name"].(string); ok {
								paramNameStr = paramName
							} else if paramVar, ok := paramMap["name"].(*Variable); ok {
								paramNameStr = paramVar.GetName()
							}
							
							
							if paramNameStr != "" && name == paramNameStr {
								// Handle values that implement Eval with error return
								if argValue, ok := argMap["value"].(interface{ Eval(any) (any, error) }); ok {
									evalResult, err := argValue.Eval(context)
									if err != nil {
										return nil, err
									}
									evaldArguments[j] = evalResult
									// Create declaration and prepend to frame
									decl, err := NewDeclaration(name, evaldArguments[j], nil, false, 0, make(map[string]any), false, true)
									if err != nil {
										return nil, err
									}
									frame.PrependRule(decl)
									isNamedFound = true
									break
								} else if argValue, ok := argMap["value"].(interface{ Eval(any) any }); ok {
									// Handle values that implement Eval without error return
									evaldArguments[j] = argValue.Eval(context)
									// Create declaration and prepend to frame
									decl, err := NewDeclaration(name, evaldArguments[j], nil, false, 0, make(map[string]any), false, true)
									if err != nil {
										return nil, err
									}
									frame.PrependRule(decl)
									isNamedFound = true
									break
								} else {
									// If value doesn't implement Eval, use it directly
									evaldArguments[j] = argMap["value"]
									// Create declaration and prepend to frame
									decl, err := NewDeclaration(name, evaldArguments[j], nil, false, 0, make(map[string]any), false, true)
									if err != nil {
										return nil, err
									}
									frame.PrependRule(decl)
									isNamedFound = true
									break
								}
							}
						}
					}
					
					if isNamedFound {
						// Remove processed argument
						newArgs := make([]any, len(args)-1)
						copy(newArgs, args[:i])
						copy(newArgs[i:], args[i+1:])
						args = newArgs
						i--
						argsLength--
						continue
					} else {
						return nil, fmt.Errorf("named argument for %s %s not found", md.Name, name)
					}
				}
			}
		}
	}

	// Process positional arguments  
	argIndex = 0
	for i := 0; i < len(params); i++ {
		if i < len(evaldArguments) && evaldArguments[i] != nil {
			continue
		}

		arg = nil
		if args != nil && argIndex < len(args) {
			arg = args[argIndex]
		}

		if paramMap, ok := params[i].(map[string]any); ok {
			// Extract name string from either string or Variable
			var paramNameStr string
			if s, ok := paramMap["name"].(string); ok {
				paramNameStr = s
			} else if v, ok := paramMap["name"].(*Variable); ok {
				paramNameStr = v.GetName()
			}
			
			if paramNameStr != "" {
				name = paramNameStr
				// Debug: check if name has @ prefix
				// fmt.Printf("DEBUG: Parameter name: %s\n", name)
				
				if variadic, ok := paramMap["variadic"].(bool); ok && variadic {
					varargs = []any{}
					for j := argIndex; j < argsLength; j++ {
						if argMap, ok := args[j].(map[string]any); ok {
							if argValue, ok := argMap["value"].(interface{ Eval(any) any }); ok {
								varargs = append(varargs, argValue.Eval(context))
							}
						}
					}
					expr, err := NewExpression(varargs, false)
					if err != nil {
						return nil, err
					}
					evalExpr, err := expr.Eval(evalContext)
					if err != nil {
						return nil, err
					}
					decl, err := NewDeclaration(name, evalExpr, nil, false, 0, make(map[string]any), false, true)
					if err != nil {
						return nil, err
					}
					frame.PrependRule(decl)
				} else {
					// Non-variadic parameter
					if arg != nil {
						if argMap, ok := arg.(map[string]any); ok {
							if argValue, ok := argMap["value"]; ok {
								// Handle detached ruleset
								if argSlice, ok := argValue.([]any); ok {
									ruleset := NewRuleset(nil, argSlice, false, nil)
									val = NewDetachedRuleset(ruleset, nil)
								} else if evalValue, ok := argValue.(interface{ Eval(any) any }); ok {
									val = evalValue.Eval(context) 
								} else {
									val = argValue
								}
							} else {
								// No 'value' key in argMap
							}
						} else {
							// Try to handle direct values
							if evalValue, ok := arg.(interface{ Eval(any) any }); ok {
								val = evalValue.Eval(context)
							} else {
								val = arg
							}
						}
					} else if paramValue, ok := paramMap["value"]; ok && paramValue != nil {
						// Try both Eval signatures
						if evalValue, ok := paramValue.(interface{ Eval(any) (any, error) }); ok {
							// Default parameters should use an environment that includes the frame being built
							// This allows them to reference earlier parameters
							defaultParamEnv := mixinEnv
							if mixinEnvMap, ok := mixinEnv.(map[string]any); ok {
								// Create new environment with frame prepended to frames
								defaultParamEnv = make(map[string]any)
								for k, v := range mixinEnvMap {
									defaultParamEnv.(map[string]any)[k] = v
								}
								if frames, ok := mixinEnvMap["frames"].([]any); ok {
									updatedFrames := []any{frame}
									updatedFrames = append(updatedFrames, frames...)
									defaultParamEnv.(map[string]any)["frames"] = updatedFrames
								}
							}
							evalResult, err := evalValue.Eval(defaultParamEnv)
							if err != nil {
								return nil, err
							}
							val = evalResult
							frame.ResetCache()
						} else if evalValue, ok := paramValue.(interface{ Eval(any) any }); ok {
							// Create updated environment for default parameter evaluation
							defaultParamEnv := mixinEnv
							if mixinEnvMap, ok := mixinEnv.(map[string]any); ok {
								// Create new environment with frame prepended to frames
								defaultParamEnv = make(map[string]any)
								for k, v := range mixinEnvMap {
									defaultParamEnv.(map[string]any)[k] = v
								}
								if frames, ok := mixinEnvMap["frames"].([]any); ok {
									updatedFrames := []any{frame}
									updatedFrames = append(updatedFrames, frames...)
									defaultParamEnv.(map[string]any)["frames"] = updatedFrames
								}
							}
							val = evalValue.Eval(defaultParamEnv)
							frame.ResetCache()
						} else {
						}
					} else {
						return nil, fmt.Errorf("wrong number of arguments for %s (%d for %d)", md.Name, argsLength, md.Arity)
					}

					decl, err := NewDeclaration(name, val, nil, false, 0, make(map[string]any), false, true)
					if err != nil {
						return nil, err
					}
					frame.PrependRule(decl)
					// Populate evaldArguments if within bounds
					if i < len(evaldArguments) {
						evaldArguments[i] = val
					}
				}
			}
			
			// Always increment argIndex to match JavaScript behavior (line 135)
			if arg != nil {
				argIndex++
			}

			if variadic, ok := paramMap["variadic"].(bool); ok && variadic && args != nil {
				// For variadic parameters, populate evaldArguments with evaluated args
				for j := argIndex; j < argsLength; j++ {
					if j < len(evaldArguments) {
						if argMap, ok := args[j].(map[string]any); ok {
							if argValue, ok := argMap["value"]; ok {
								if evalValue, ok := argValue.(interface{ Eval(any) any }); ok {
									evaldArguments[j] = evalValue.Eval(context)
								} else {
									evaldArguments[j] = argValue
								}
							}
						}
					}
				}
				argIndex = argsLength // Set to end since variadic consumes all remaining
			}
		}
	}

	return frame, nil
}

// MakeImportant creates a new MixinDefinition with important rules
func (md *MixinDefinition) MakeImportant() *MixinDefinition {
	var rules []any
	if md.Rules != nil {
		rules = make([]any, len(md.Rules))
		for i, rule := range md.Rules {
			if imp, ok := rule.(interface{ MakeImportant() any }); ok {
				rules[i] = imp.MakeImportant()
			} else {
				rules[i] = rule
			}
		}
	}

	result, _ := NewMixinDefinition(md.Name, md.Params, rules, md.Condition, md.Variadic, md.Frames, md.VisibilityInfo())
	return result
}

// Eval evaluates the mixin definition
func (md *MixinDefinition) Eval(context any) (*MixinDefinition, error) {
	frames := md.Frames
	if frames == nil {
		if ctx, ok := context.(map[string]any); ok {
			if ctxFrames, ok := ctx["frames"].([]any); ok {
				frames = CopyArray(ctxFrames)
			}
		}
	}
	
	// Important: Do NOT evaluate the rules here. The rules should only be evaluated 
	// when the mixin is called via EvalCall
	// Copy the rules without evaluating them
	copiedRules := CopyArray(md.Rules)
	
	result, err := NewMixinDefinition(md.Name, md.Params, copiedRules, md.Condition, md.Variadic, frames, md.VisibilityInfo())
	if err != nil {
		return nil, err
	}
	return result, nil
}

// EvalCall evaluates a mixin call
func (md *MixinDefinition) EvalCall(context any, args []any, important bool) (*Ruleset, error) {
	// Arguments array will be populated by EvalParams
	// Pre-allocate to ensure EvalParams can populate it
	arguments := make([]any, len(args))
	// fmt.Printf("DEBUG EvalCall: mixin=%s, args=%d, arguments pre-allocated=%d\n", md.Name, len(args), len(arguments))
	
	// Determine mixin frames
	var mixinFrames []any
	if md.Frames != nil {
		if ctx, ok := context.(map[string]any); ok {
			if ctxFrames, ok := ctx["frames"].([]any); ok {
				mixinFrames = append(md.Frames, ctxFrames...)
			} else {
				mixinFrames = md.Frames
			}
		} else {
			mixinFrames = md.Frames
		}
	} else {
		if ctx, ok := context.(map[string]any); ok {
			if ctxFrames, ok := ctx["frames"].([]any); ok {
				mixinFrames = ctxFrames
			}
		}
	}

	// Create mixin environment
	mixinEnv := map[string]any{
		"frames": mixinFrames,
	}
	if ctx, ok := context.(map[string]any); ok {
		for k, v := range ctx {
			if k != "frames" {
				mixinEnv[k] = v
			}
		}
	}

	// Evaluate parameters
	frame, err := md.EvalParams(context, mixinEnv, args, arguments)
	if err != nil {
		return nil, err
	}

	// Add @arguments declaration
	expr, err := NewExpression(arguments, false)
	if err != nil {
		return nil, err
	}
	evalExpr, err := expr.Eval(context)
	if err != nil {
		return nil, err
	}
	argDecl, err := NewDeclaration("@arguments", evalExpr, nil, false, 0, make(map[string]any), false, true)
	if err != nil {
		return nil, err
	}
	frame.PrependRule(argDecl)

	// Copy rules
	rules := CopyArray(md.Rules)
	
	// Create result ruleset
	ruleset := NewRuleset(nil, rules, false, nil)
	ruleset.OriginalRuleset = md.Ruleset

	// Evaluate ruleset with proper context
	evalFrames := []any{md, frame}
	evalFrames = append(evalFrames, mixinFrames...)
	
	evalContext := map[string]any{
		"frames": evalFrames,
	}
	if ctx, ok := context.(map[string]any); ok {
		for k, v := range ctx {
			if k != "frames" {
				evalContext[k] = v
			}
		}
	}

	evaluated, err := ruleset.Eval(evalContext)
	if err != nil {
		return nil, err
	}
	
	evaluatedRuleset, ok := evaluated.(*Ruleset)
	if !ok {
		return nil, fmt.Errorf("expected *Ruleset from Eval, got %T", evaluated)
	}

	if important {
		evaluatedRuleset = evaluatedRuleset.MakeImportant()
	}

	return evaluatedRuleset, nil
}

// MatchCondition checks if the mixin condition matches
func (md *MixinDefinition) MatchCondition(args []any, context any) bool {
	if md.Condition == nil {
		return true
	}

	// Create evaluation context similar to JavaScript version
	paramFrame, err := md.EvalParams(context, map[string]any{"frames": md.Frames}, args, []any{})
	if err != nil {
		return false
	}

	evalFrames := []any{paramFrame}
	if md.Frames != nil {
		evalFrames = append(evalFrames, md.Frames...)
	}
	if ctx, ok := context.(map[string]any); ok {
		if ctxFrames, ok := ctx["frames"].([]any); ok {
			evalFrames = append(evalFrames, ctxFrames...)
		}
	}

	evalContext := map[string]any{
		"frames": evalFrames,
	}
	if ctx, ok := context.(map[string]any); ok {
		for k, v := range ctx {
			if k != "frames" {
				evalContext[k] = v
			}
		}
	}

	if condEval, ok := md.Condition.(interface{ Eval(any) any }); ok {
		result := condEval.Eval(evalContext)
		// Check if result is falsy
		if result == nil {
			return false
		}
		if b, ok := result.(bool); ok {
			return b
		}
		// Non-nil, non-boolean values are truthy
		return true
	}

	return false
}


// MatchArgs checks if the mixin arguments match
func (md *MixinDefinition) MatchArgs(args []any, context any) bool {
	allArgsCnt := 0
	if args != nil {
		allArgsCnt = len(args)
	}

	// Count required arguments that are provided (match JavaScript logic)
	// JavaScript: args.reduce(function (count, p) {
	//   if (optionalParameters.indexOf(p.name) < 0) {
	//     return count + 1;
	//   } else {
	//     return count;
	//   }
	// }, 0);
	requiredArgsCnt := 0
	for _, arg := range args {
		if argMap, ok := arg.(map[string]any); ok {
			if argName, ok := argMap["name"].(string); ok && argName != "" {
				// Check if this named argument is in optional parameters list
				isOptional := false
				for _, optParam := range md.OptionalParameters {
					if optParam == argName {
						isOptional = true
						break
					}
				}
				// Only count if NOT in optional parameters (like JavaScript)
				if !isOptional {
					requiredArgsCnt++
				}
				// Note: JavaScript only counts named args, so we don't increment for positional args here
			} else {
				// Positional argument (no name) - always counts as required
				requiredArgsCnt++
			}
		} else {
			// Non-map argument - always counts as required
			requiredArgsCnt++
		}
	}

	if !md.Variadic {
		if requiredArgsCnt < md.Required {
			return false
		}
		if allArgsCnt > md.Arity {
			return false
		}
	} else {
		if requiredArgsCnt < (md.Required - 1) {
			return false
		}
	}

	// Check patterns - match JavaScript implementation
	lenCheck := requiredArgsCnt
	if lenCheck > md.Arity {
		lenCheck = md.Arity
	}
	
	for i := 0; i < lenCheck; i++ {
		if i >= len(md.Params) {
			continue
		}
		
		param, ok := md.Params[i].(map[string]any)
		if !ok {
			continue
		}
		
		// Check if this parameter has a name or is variadic
		paramName, hasName := param["name"].(string)
		paramVariadic, isVariadic := param["variadic"].(bool)
		
		// If the parameter has no name and is not variadic, it's a pattern that needs matching
		if (!hasName || paramName == "") && (!isVariadic || !paramVariadic) {
			// Get the parameter value
			paramValue := param["value"]
			if paramValue == nil {
				continue
			}
			
			// Get the argument at this position
			if i >= len(args) {
				return false
			}
			
			argValue := args[i]
			if argMap, ok := argValue.(map[string]any); ok {
				if val, hasVal := argMap["value"]; hasVal {
					argValue = val
				}
			}
			
			// Evaluate both values and compare their CSS output
			// First evaluate the parameter value
			var paramCSS string
			if evaluator, ok := paramValue.(interface{ Eval(any) (any, error) }); ok {
				evalResult, err := evaluator.Eval(context)
				if err != nil {
					return false
				}
				if cssGenerator, ok := evalResult.(interface{ ToCSS(any) string }); ok {
					paramCSS = cssGenerator.ToCSS(context)
				} else {
					paramCSS = fmt.Sprintf("%v", evalResult)
				}
			} else {
				paramCSS = fmt.Sprintf("%v", paramValue)
			}
			
			// Then evaluate the argument value
			var argCSS string
			if evaluator, ok := argValue.(interface{ Eval(any) (any, error) }); ok {
				evalResult, err := evaluator.Eval(context)
				if err != nil {
					return false
				}
				if cssGenerator, ok := evalResult.(interface{ ToCSS(any) string }); ok {
					argCSS = cssGenerator.ToCSS(context)
				} else {
					argCSS = fmt.Sprintf("%v", evalResult)
				}
			} else {
				argCSS = fmt.Sprintf("%v", argValue)
			}
			
			// Compare the CSS output
			if paramCSS != argCSS {
				return false
			}
		}
	}
	
	return true
}

// GenCSS for MixinDefinition - mixin definitions should not output any CSS
func (md *MixinDefinition) GenCSS(context any, output *CSSOutput) {
	// Mixin definitions do not generate CSS output
} 