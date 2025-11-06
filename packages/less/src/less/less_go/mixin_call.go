package less_go

import (
	"fmt"
	"strings"
)

// MixinCallError represents a Less error for mixin calls
type MixinCallError struct {
	Type     string
	Message  string
	Index    int
	Filename string
	Stack    string
}

func (e *MixinCallError) Error() string {
	return e.Message
}

// MixinCall represents a mixin call node in the Less AST
type MixinCall struct {
	*Node
	Selector   *Selector
	Arguments  []any
	Important  bool
	AllowRoot  bool
}


// NewMixinCall creates a new MixinCall instance
func NewMixinCall(elements any, args []any, index int, currentFileInfo map[string]any, important bool) (*MixinCall, error) {
	// Create selector from elements - match JavaScript behavior by only passing elements initially
	selector, err := NewSelector(elements, nil, nil, 0, nil, nil)
	if err != nil {
		return nil, err
	}

	// Handle nil args
	if args == nil {
		args = []any{}
	}

	mc := &MixinCall{
		Node:      NewNode(),
		Selector:  selector,
		Arguments: args,
		Important: important,
		AllowRoot: true,
	}

	mc.Index = index
	mc.SetFileInfo(currentFileInfo)

	// Set parent
	mc.SetParent(selector, mc.Node)

	return mc, nil
}

// GetType returns the node type
func (mc *MixinCall) GetType() string {
	return "MixinCall"
}

// Type returns the node type (for compatibility)
func (mc *MixinCall) Type() string {
	return "MixinCall"
}

// Accept visits the mixin call with a visitor
func (mc *MixinCall) Accept(visitor any) {
	if mc.Selector != nil {
		if nodeVisitor, ok := visitor.(interface{ Visit(any) any }); ok {
			if result := nodeVisitor.Visit(mc.Selector); result != nil {
				if selector, ok := result.(*Selector); ok {
					mc.Selector = selector
				}
			}
		}
	}
	if len(mc.Arguments) > 0 {
		if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
			mc.Arguments = v.VisitArray(mc.Arguments)
		}
	}
}

// Eval evaluates the mixin call
func (mc *MixinCall) Eval(context any) ([]any, error) {
	// Add recursion depth check as safety
	if ctx, ok := context.(map[string]any); ok {
		if depth, ok := ctx["mixinCallDepth"].(int); ok && depth > 500 {
			return nil, fmt.Errorf("mixin call recursion limit exceeded")
		}
	}
	
	var mixins []any
	var mixin any
	var mixinPath []any
	args := []any{}
	var arg any
	var argValue any
	rules := []any{}
	match := false
	var i, m, f int
	var isRecursive bool
	var isOneFound bool
	candidates := []any{}
	conditionResult := []bool{}
	var defaultResult int
	const defFalseEitherCase = -1
	const defNone = 0
	const defTrue = 1
	const defFalse = 2
	var count []int
	var originalRuleset any
	
	var noArgumentsFilter func(any) bool

	// Use the proper default function implementation
	var defaultFunc *DefaultFunc
	
	// Try to get defaultFunc from context
	if evalCtx, ok := context.(EvalContext); ok {
		defaultFunc = evalCtx.GetDefaultFunc()
	} else if ctxMap, ok := context.(map[string]any); ok {
		if df, exists := ctxMap["defaultFunc"]; exists {
			if dfTyped, ok := df.(*DefaultFunc); ok {
				defaultFunc = dfTyped
			}
		}
	}
	
	// Create a new one if none exists
	if defaultFunc == nil {
		defaultFunc = NewDefaultFunc()
	}

	// Evaluate selector
	if evaluated, err := mc.Selector.Eval(context); err != nil {
		return nil, err
	} else {
		evaluatedSelector, ok := evaluated.(*Selector)
		if !ok {
			return nil, fmt.Errorf("expected *Selector from Eval, got %T", evaluated)
		}
		mc.Selector = evaluatedSelector
	}

	// Helper function to calculate default group
	calcDefGroup := func(mixin any, mixinPath []any) int {
		var f, p int
		var namespace any

		for f = 0; f < 2; f++ {
			conditionResult = append(conditionResult, true)
			if len(conditionResult) <= f {
				conditionResult = append(conditionResult, true)
			} else {
				conditionResult[f] = true
			}
			defaultFunc.Value(f)

			for p = 0; p < len(mixinPath) && conditionResult[f]; p++ {
				namespace = mixinPath[p]
				if ns, ok := namespace.(interface{ MatchCondition(any, any) bool }); ok {
					// Create context with defaultFunc for condition evaluation
					condContext := context
					if ctxMap, ok := context.(map[string]any); ok {
						// Make a copy and add defaultFunc
						newCtx := make(map[string]any)
						for k, v := range ctxMap {
							newCtx[k] = v
						}
						newCtx["defaultFunc"] = defaultFunc
						condContext = newCtx
					}
					conditionResult[f] = conditionResult[f] && ns.MatchCondition(nil, condContext)
				}
			}
			if mix, ok := mixin.(interface{ MatchCondition([]any, any) bool }); ok {
				// Create context with defaultFunc for condition evaluation
				condContext := context
				if ctxMap, ok := context.(map[string]any); ok {
					// Make a copy and add defaultFunc
					newCtx := make(map[string]any)
					for k, v := range ctxMap {
						newCtx[k] = v
					}
					newCtx["defaultFunc"] = defaultFunc
					condContext = newCtx
				}
				conditionResult[f] = conditionResult[f] && mix.MatchCondition(args, condContext)
			}
		}

		if len(conditionResult) >= 2 && (conditionResult[0] || conditionResult[1]) {
			if conditionResult[0] != conditionResult[1] {
				if conditionResult[1] {
					return defTrue
				}
				return defFalse
			}
			return defNone
		}
		return defFalseEitherCase
	}

	// Process arguments
	for i = 0; i < len(mc.Arguments); i++ {
		arg = mc.Arguments[i]
		if argMap, ok := arg.(map[string]any); ok {
			// Try both Eval signatures: Eval(any) (any, error) and Eval(any) any
			// Match JavaScript: argValue = arg.value.eval(context);
			// JavaScript doesn't handle errors here, so we shouldn't fall back on error
			if argValueEval, ok := argMap["value"].(interface{ Eval(any) (any, error) }); ok {
				var err error
				argValue, err = argValueEval.Eval(context)
				if err != nil {
					// Don't fall back to unevaluated value - propagate the error
					return nil, fmt.Errorf("error evaluating mixin argument: %v", err)
				}
			} else if argValueEval, ok := argMap["value"].(interface{ Eval(any) any }); ok {
				argValue = argValueEval.Eval(context)
			} else {
				argValue = argMap["value"]
			}

			if expand, ok := argMap["expand"].(bool); ok && expand {
				// Match JavaScript: if (arg.expand && Array.isArray(argValue.value))
				// In Go, argValue could be an *Expression or *Value with a Value field
				var valueSlice []any
				if expr, ok := argValue.(*Expression); ok {
					valueSlice = expr.Value
				} else if val, ok := argValue.(*Value); ok {
					valueSlice = val.Value
				} else if argValueMap, ok := argValue.(map[string]any); ok {
					if slice, ok := argValueMap["value"].([]any); ok {
						valueSlice = slice
					}
				}

				if valueSlice != nil && len(valueSlice) > 0 {
					// Expand the array into individual arguments
					for m = 0; m < len(valueSlice); m++ {
						args = append(args, map[string]any{"value": valueSlice[m]})
					}
				} else {
					// Match JavaScript behavior: if not array-like, add as single argument
					// This handles cases like .m4(@a..., 4) where 4 has expand=true but isn't expandable
					args = append(args, map[string]any{
						"name":  argMap["name"],
						"value": argValue,
					})
				}
			} else {
				args = append(args, map[string]any{
					"name":  argMap["name"],
					"value": argValue,
				})
			}
		}
	}

	// No arguments filter - match JavaScript: rule.matchArgs(null, context) 
	noArgumentsFilter = func(rule any) bool {
		// In JavaScript, both Ruleset and MixinDefinition use matchArgs(args, context)
		// But Go Ruleset only takes (args), while MixinDefinition takes (args, context)
		if mixinDef, ok := rule.(*MixinDefinition); ok {
			// MixinDefinition case - takes context
			return mixinDef.MatchArgs(nil, context)
		} else if ruleset, ok := rule.(*Ruleset); ok {
			// Ruleset case - no context parameter
			return ruleset.MatchArgs(nil)
		}
		return false
	}

	// Find mixins in context frames
	if ctx, ok := context.(map[string]any); ok {
		if frames, ok := ctx["frames"].([]any); ok {
			for i = 0; i < len(frames); i++ {
				if frame, ok := frames[i].(interface{ Find(any, any, func(any) bool) []any }); ok {
					foundMixins := frame.Find(mc.Selector, nil, noArgumentsFilter)
					if len(foundMixins) > 0 {
						mixins = foundMixins
						isOneFound = true

						// Process each found mixin
						for m = 0; m < len(mixins); m++ {
							if mixinMap, ok := mixins[m].(map[string]any); ok {
								mixin = mixinMap["rule"]
								mixinPath = mixinMap["path"].([]any)
								isRecursive = false

								// Check for recursion
								for f = 0; f < len(frames); f++ {
									frame := frames[f]
									var originalRuleset any

									// Try to get originalRuleset from frame - match JavaScript:
									// mixin === (context.frames[f].originalRuleset || context.frames[f])
									if frameMap, ok := frame.(map[string]any); ok {
										originalRuleset = frameMap["originalRuleset"]
										if originalRuleset == nil {
											originalRuleset = frame
										}
									} else if frameRuleset, ok := frame.(*Ruleset); ok {
										// Frame is a *Ruleset - get its OriginalRuleset
										originalRuleset = frameRuleset.OriginalRuleset
										if originalRuleset == nil {
											originalRuleset = frame
										}
									} else if frameMixinDef, ok := frame.(*MixinDefinition); ok {
										// Frame is a *MixinDefinition - get its OriginalRuleset
										originalRuleset = frameMixinDef.OriginalRuleset
										if originalRuleset == nil {
											originalRuleset = frame
										}
									} else {
										// Unknown frame type - use frame itself
										originalRuleset = frame
									}

									if !isMixinDefinition(mixin) && mixin == originalRuleset {
										isRecursive = true
										break
									}
								}

								if isRecursive {
									continue
								}

								// Check if mixin matches arguments
								// Use same logic as noArgumentsFilter - match JavaScript behavior
								var matchesArgs bool
								if mixinDef, ok := mixin.(*MixinDefinition); ok {
									// MixinDefinition case - takes context
									matchesArgs = mixinDef.MatchArgs(args, context)
								} else if ruleset, ok := mixin.(*Ruleset); ok {
									// Ruleset case - no context parameter 
									matchesArgs = ruleset.MatchArgs(args)
								}
								
								if matchesArgs {
									candidateMap := map[string]any{
										"mixin": mixin,
										"group": calcDefGroup(mixin, mixinPath),
									}

									if candidateMap["group"] != defFalseEitherCase {
										candidates = append(candidates, candidateMap)
									}

									match = true
								}
							}
						}

						defaultFunc.Reset()

						// Count candidates by group
						count = []int{0, 0, 0}
						for m = 0; m < len(candidates); m++ {
							if candMap, ok := candidates[m].(map[string]any); ok {
								if group, ok := candMap["group"].(int); ok && group >= 0 && group < len(count) {
									count[group]++
								}
							}
						}

						if count[defNone] > 0 {
							defaultResult = defFalse
						} else {
							defaultResult = defTrue
							if (count[defTrue] + count[defFalse]) > 1 {
								return nil, &MixinCallError{
									Type:     "Runtime",
									Message:  fmt.Sprintf("Ambiguous use of `default()` found when matching for `%s`", mc.Format(args)),
									Index:    mc.GetIndex(),
									Filename: getFilename(mc.FileInfo()),
								}
							}
						}

						// Process selected candidates
						for m = 0; m < len(candidates); m++ {
							if candMap, ok := candidates[m].(map[string]any); ok {
								candidateGroup := candMap["group"].(int)
								if candidateGroup == defNone || candidateGroup == defaultResult {
									mixinCandidate := candMap["mixin"]
									
									if !isMixinDefinition(mixinCandidate) {
										// mixinCandidate should be a *Ruleset - match JavaScript behavior
										if ruleset, ok := mixinCandidate.(*Ruleset); ok {
											originalRuleset = ruleset
											// Create MixinDefinition wrapper - match JavaScript: 
											// new MixinDefinition('', [], mixin.rules, null, false, null, originalRuleset.visibilityInfo())
											if mixinDef, err := NewMixinDefinition("", []any{}, ruleset.Rules, nil, false, nil, getVisibilityInfo(originalRuleset)); err != nil {
												return nil, err
											} else {
												mixinCandidate = mixinDef
												if mixinDef, ok := mixinCandidate.(*MixinDefinition); ok {
													mixinDef.OriginalRuleset = ruleset
												}
											}
										}
									}

									// Evaluate call with incremented depth
									if mixinDef, ok := mixinCandidate.(interface{ EvalCall(any, []any, bool) (*Ruleset, error) }); ok {
										// Create new context with incremented depth
										callContext := context
										if ctx, ok := context.(map[string]any); ok {
											newCtx := make(map[string]any)
											for k, v := range ctx {
												newCtx[k] = v
											}
											depth := 0
											if d, ok := ctx["mixinCallDepth"].(int); ok {
												depth = d
											}
											newCtx["mixinCallDepth"] = depth + 1
											callContext = newCtx
										}
										
										if newRuleset, err := mixinDef.EvalCall(callContext, args, mc.Important); err != nil {
											return nil, &MixinCallError{
												Message:  err.Error(),
												Index:    mc.GetIndex(),
												Filename: getFilename(mc.FileInfo()),
												Stack:    fmt.Sprintf("%v", err),
											}
										} else {
											newRules := newRuleset.Rules
											mc.setVisibilityToReplacement(newRules)
											rules = append(rules, newRules...)
										}
									}
								}
							}
						}

						if match {
							return rules, nil
						}
					}
				}
			}
		}
	}

	// Handle error cases
	if isOneFound {
		return nil, &MixinCallError{
			Type:     "Runtime",
			Message:  fmt.Sprintf("No matching definition was found for `%s`", mc.Format(args)),
			Index:    mc.GetIndex(),
			Filename: getFilename(mc.FileInfo()),
		}
	} else {
		selectorCSS := strings.TrimSpace(mc.Selector.ToCSS(context))
		if selectorCSS == "" {
			selectorCSS = "<empty selector>"
		}
		return nil, &MixinCallError{
			Type:     "Name",
			Message:  fmt.Sprintf("%s is undefined", selectorCSS),
			Index:    mc.GetIndex(),
			Filename: getFilename(mc.FileInfo()),
		}
	}
}

// setVisibilityToReplacement sets visibility to replacement rules
func (mc *MixinCall) setVisibilityToReplacement(replacement []any) {
	if mc.BlocksVisibility() {
		for i := 0; i < len(replacement); i++ {
			if rule, ok := replacement[i].(interface{ AddVisibilityBlock() }); ok {
				rule.AddVisibilityBlock()
			}
		}
	}
}

// Format formats the mixin call for display
func (mc *MixinCall) Format(args []any) string {
	var argsStr string
	if len(args) > 0 {
		argStrings := make([]string, len(args))
		for i, a := range args {
			argValue := ""
			if argMap, ok := a.(map[string]any); ok {
				if name, ok := argMap["name"].(string); ok && name != "" {
					argValue += name + ":"
				}
				if value, ok := argMap["value"]; ok {
					// Try ToCSS(context) first, then ToCSS()
					if cssValue, ok := value.(interface{ ToCSS(any) string }); ok {
						argValue += cssValue.ToCSS(nil)
					} else if cssValue, ok := value.(interface{ ToCSS() string }); ok {
						argValue += cssValue.ToCSS()
					} else {
						argValue += "???"
					}
				}
			}
			argStrings[i] = argValue
		}
		argsStr = strings.Join(argStrings, ", ")
	}
	return fmt.Sprintf("%s(%s)", strings.TrimSpace(mc.Selector.ToCSS(nil)), argsStr)
}

// Helper functions

func isMixinDefinition(obj any) bool {
	_, ok := obj.(*MixinDefinition)
	return ok
}

func getFilename(fileInfo map[string]any) string {
	if filename, ok := fileInfo["filename"].(string); ok {
		return filename
	}
	return ""
}

func getVisibilityInfo(obj any) map[string]any {
	if visObj, ok := obj.(interface{ VisibilityInfo() map[string]any }); ok {
		info := visObj.VisibilityInfo()
		// Return nil if the info is empty, to match JavaScript behavior
		if len(info) == 0 {
			return nil
		}
		return info
	}
	return nil
} 