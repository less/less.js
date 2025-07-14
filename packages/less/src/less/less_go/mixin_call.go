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

// ParserDefaultFunc represents the default function implementation matching JavaScript behavior
type ParserDefaultFunc struct {
	value_ any
	error_ any
}

// NewParserDefaultFunc creates a new ParserDefaultFunc instance
func NewParserDefaultFunc() *ParserDefaultFunc {
	return &ParserDefaultFunc{
		value_: nil,
		error_: nil,
	}
}

// Value sets the value
func (d *ParserDefaultFunc) Value(v any) {
	d.value_ = v
}

// Error sets the error
func (d *ParserDefaultFunc) Error(e any) {
	d.error_ = e
}

// Reset resets both value and error to nil
func (d *ParserDefaultFunc) Reset() {
	d.value_ = nil
	d.error_ = nil
}

// Eval evaluates the default function, matching JavaScript behavior
func (d *ParserDefaultFunc) Eval() any {
	v := d.value_
	e := d.error_
	
	if e != nil {
		// JavaScript throws the error, Go panics or returns error
		if err, ok := e.(error); ok {
			panic(err)
		}
		panic(e)
	}
	
	// Check if value is null/undefined (nil in Go)
	if v == nil {
		return nil
	}
	
	// Return based on truthiness like JavaScript
	if parserIsTruthy(v) {
		return KeywordTrue
	}
	return KeywordFalse
}

// parserIsTruthy checks if a value is truthy according to JavaScript rules
func parserIsTruthy(v any) bool {
	if v == nil {
		return false
	}
	
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case int8:
		return val != 0
	case int16:
		return val != 0
	case int32:
		return val != 0
	case int64:
		return val != 0
	case uint:
		return val != 0
	case uint8:
		return val != 0
	case uint16:
		return val != 0
	case uint32:
		return val != 0
	case uint64:
		return val != 0
	case float32:
		return val != 0 && !isNaN(float64(val))
	case float64:
		return val != 0 && !isNaN(val)
	case string:
		return val != ""
	default:
		// For all other types (objects, arrays, functions, etc.), they are truthy
		return true
	}
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
	defaultFunc := NewDefaultFunc()

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
					conditionResult[f] = conditionResult[f] && ns.MatchCondition(nil, context)
				}
			}
			if mix, ok := mixin.(interface{ MatchCondition([]any, any) bool }); ok {
				conditionResult[f] = conditionResult[f] && mix.MatchCondition(args, context)
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
			if argValueEval, ok := argMap["value"].(interface{ Eval(any) any }); ok {
				argValue = argValueEval.Eval(context)
			} else {
				argValue = argMap["value"]
			}

			if expand, ok := argMap["expand"].(bool); ok && expand {
				if argValueMap, ok := argValue.(map[string]any); ok {
					if valueSlice, ok := argValueMap["value"].([]any); ok {
						for m = 0; m < len(valueSlice); m++ {
							args = append(args, map[string]any{"value": valueSlice[m]})
						}
					}
				}
			} else {
				args = append(args, map[string]any{
					"name":  argMap["name"],
					"value": argValue,
				})
			}
		}
	}

	// No arguments filter
	noArgumentsFilter = func(rule any) bool {
		if matcher, ok := rule.(interface{ MatchArgs(any, any) bool }); ok {
			return matcher.MatchArgs(nil, context)
		}
		return false
	}

	// Find mixins in context frames
	if ctx, ok := context.(map[string]any); ok {
		if frames, ok := ctx["frames"].([]any); ok {
			for i = 0; i < len(frames); i++ {
				if frame, ok := frames[i].(interface{ Find(*Selector, any, func(any) bool) []any }); ok {
					if foundMixins := frame.Find(mc.Selector, nil, noArgumentsFilter); len(foundMixins) > 0 {
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
									if frame, ok := frames[f].(map[string]any); ok {
										originalRuleset := frame["originalRuleset"]
										if originalRuleset == nil {
											originalRuleset = frame
										}
										if !isMixinDefinition(mixin) && mixin == originalRuleset {
											isRecursive = true
											break
										}
									}
								}

								if isRecursive {
									continue
								}

								// Check if mixin matches arguments
								if matcher, ok := mixin.(interface{ MatchArgs([]any, any) bool }); ok {
									if matcher.MatchArgs(args, context) {
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
										if ruleMap, ok := mixinCandidate.(map[string]any); ok {
											originalRuleset = ruleMap["originalRuleset"]
											if originalRuleset == nil {
												originalRuleset = mixinCandidate
											}
											// Create MixinDefinition wrapper
											if mixinDef, err := NewMixinDefinition("", []any{}, ruleMap["rules"].([]any), nil, false, nil, getVisibilityInfo(originalRuleset)); err != nil {
												return nil, err
											} else {
												mixinCandidate = mixinDef
												if mixinDef, ok := mixinCandidate.(*MixinDefinition); ok {
													if rulesetType, ok := originalRuleset.(*Ruleset); ok {
														mixinDef.OriginalRuleset = rulesetType
													}
												}
											}
										}
									}

									// Evaluate call
									if mixinDef, ok := mixinCandidate.(interface{ EvalCall(any, []any, bool) (*Ruleset, error) }); ok {
										if newRuleset, err := mixinDef.EvalCall(context, args, mc.Important); err != nil {
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
					if cssValue, ok := value.(interface{ ToCSS() string }); ok {
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