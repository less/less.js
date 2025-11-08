package less_go

import (
	"fmt"
	"reflect"
	"strings"
)

// SelectorsParseFunc is a function type for parsing selector strings into selectors
type SelectorsParseFunc func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]any, error)

// ValueParseFunc is a function type for parsing value strings into values
type ValueParseFunc func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]any, error)

// Ruleset represents a ruleset node in the Less AST
type Ruleset struct {
	*Node
	Selectors     []any
	Rules         []any
	StrictImports bool
	AllowRoot     bool
	// Private fields for caching
	lookups    map[string][]any
	variables  map[string]any
	properties map[string][]any
	rulesets   []any
	// Original ruleset reference for eval
	OriginalRuleset *Ruleset
	Root            bool
	// Extend support
	ExtendOnEveryPath bool
	Paths            [][]any
	FirstRoot       bool
	AllowImports    bool
	AllExtends      []*Extend // For storing extends found by ExtendFinderVisitor
	FunctionRegistry any // Changed from *functions.Registry to avoid import cycle
	// Parser functions for handling dynamic content
	SelectorsParseFunc SelectorsParseFunc
	ValueParseFunc     ValueParseFunc
	ParseContext       map[string]any
	ParseImports       map[string]any
	// Parse object matching JavaScript structure
	Parse map[string]any // Contains context and importManager
	// Debug info
	DebugInfo any
	// Multi-media flag for nested media queries
	MultiMedia bool
}

// NewRuleset creates a new Ruleset instance
func NewRuleset(selectors []any, rules []any, strictImports bool, visibilityInfo map[string]any, parseFuncs ...any) *Ruleset {
	node := NewNode()
	node.TypeIndex = GetTypeIndexForNodeType("Ruleset")

	r := &Ruleset{
		Node:          node,
		Selectors:     selectors,
		Rules:         rules,
		StrictImports: strictImports,
		AllowRoot:     true,
		lookups:       make(map[string][]any),
		variables:     nil,
		properties:    nil,
		rulesets:      nil,
	}

	r.CopyVisibilityInfo(visibilityInfo)
	r.SetParent(selectors, r.Node)
	r.SetParent(rules, r.Node)

	// Handle optional parse functions
	if len(parseFuncs) > 0 {
		if selectorsParseFunc, ok := parseFuncs[0].(SelectorsParseFunc); ok {
			r.SelectorsParseFunc = selectorsParseFunc
		}
	}
	if len(parseFuncs) > 1 {
		if valueParseFunc, ok := parseFuncs[1].(ValueParseFunc); ok {
			r.ValueParseFunc = valueParseFunc
		}
	}
	if len(parseFuncs) > 2 {
		if parseContext, ok := parseFuncs[2].(map[string]any); ok {
			r.ParseContext = parseContext
			// Also set in Parse object for JavaScript compatibility
			if r.Parse == nil {
				r.Parse = make(map[string]any)
			}
			r.Parse["context"] = parseContext
		}
	}
	if len(parseFuncs) > 3 {
		if parseImports, ok := parseFuncs[3].(map[string]any); ok {
			r.ParseImports = parseImports
			// Also set in Parse object for JavaScript compatibility
			if r.Parse == nil {
				r.Parse = make(map[string]any)
			}
			r.Parse["importManager"] = parseImports
		}
	}

	return r
}

// Type returns the type of the node
func (r *Ruleset) Type() string {
	return "Ruleset"
}

// GetType returns the type of the node
func (r *Ruleset) GetType() string {
	return "Ruleset"
}

// GetTypeIndex returns the type index for visitor pattern
func (r *Ruleset) GetTypeIndex() int {
	// Return from Node field if set, otherwise get from registry
	if r.Node != nil && r.Node.TypeIndex != 0 {
		return r.Node.TypeIndex
	}
	return GetTypeIndexForNodeType("Ruleset")
}

// IsRuleset returns true (this is a ruleset)
func (r *Ruleset) IsRuleset() bool {
	return true
}

// IsRulesetLike returns true (this is ruleset-like)
func (r *Ruleset) IsRulesetLike() bool {
	return true
}

// ToCSS converts the ruleset to CSS output (original signature)
func (r *Ruleset) ToCSS(options map[string]any) (string, error) {
	var output strings.Builder

	// Create context map from options
	contextMap := make(map[string]any)

	// Copy all options to the context map
	if options != nil {
		for k, v := range options {
			contextMap[k] = v
		}
	}

	// Ensure compress has a default value if not set
	if _, hasCompress := contextMap["compress"]; !hasCompress {
		contextMap["compress"] = false
	}
	
	// Create CSS output implementation
	cssOutput := &CSSOutput{
		Add: func(chunk, fileInfo, index any) {
			if chunk != nil {
				output.WriteString(fmt.Sprintf("%v", chunk))
			}
		},
		IsEmpty: func() bool {
			return output.Len() == 0
		},
	}
	
	// Generate CSS using the GenCSS method
	r.GenCSS(contextMap, cssOutput)
	
	// Fix trailing spaces before semicolons to match JavaScript Less.js behavior exactly
	result := output.String()
	
	// Remove trailing spaces before semicolons (e.g., "red ;" -> "red;")
	// This ensures our Go output matches JavaScript Less.js exactly
	for strings.Contains(result, " ;") {
		result = strings.ReplaceAll(result, " ;", ";")
	}
	
	return result, nil
}

// ToCSSString converts the ruleset to CSS output (Node interface version)
func (r *Ruleset) ToCSSString(context any) string {
	// Convert context to options map if possible
	var options map[string]any
	if ctx, ok := context.(map[string]any); ok {
		options = ctx
	}
	
	result, _ := r.ToCSS(options)
	return result
}

// Interface methods required by JoinSelectorVisitor and ToCSSVisitor

// GetRoot returns whether this is a root ruleset
func (r *Ruleset) GetRoot() bool {
	return r.Root
}

// GetSelectors returns the selectors array
func (r *Ruleset) GetSelectors() []any {
	return r.Selectors
}

// SetSelectors sets the selectors array (required by JoinSelectorVisitor)
func (r *Ruleset) SetSelectors(selectors []any) {
	r.Selectors = selectors
}

// GetPaths returns the paths array
func (r *Ruleset) GetPaths() []any {
	// Convert [][]any to []any for interface compatibility
	if r.Paths == nil {
		return nil
	}
	result := make([]any, len(r.Paths))
	for i, path := range r.Paths {
		result[i] = path
	}
	return result
}

// SetPaths sets the paths array
func (r *Ruleset) SetPaths(paths []any) {
	// Convert []any to [][]any
	if paths == nil {
		r.Paths = nil
		return
	}
	r.Paths = make([][]any, len(paths))
	for i, path := range paths {
		if pathSlice, ok := path.([]any); ok {
			r.Paths[i] = pathSlice
		}
	}
}

// GetRules returns the rules array (required by ToCSSVisitor)
func (r *Ruleset) GetRules() []any {
	return r.Rules
}

// SetRules sets the rules array (required by ToCSSVisitor)
func (r *Ruleset) SetRules(rules []any) {
	r.Rules = rules
}

// GetFirstRoot returns whether this is the first root
func (r *Ruleset) GetFirstRoot() bool {
	return r.FirstRoot
}

// Accept visits the ruleset with a visitor
func (r *Ruleset) Accept(visitor any) {
	// Try the variadic bool version first (for the mock visitor)
	if v, ok := visitor.(interface{ VisitArray([]any, ...bool) []any }); ok {
		if r.Paths != nil {
			newPaths := make([][]any, len(r.Paths))
			for i, path := range r.Paths {
				newPaths[i] = v.VisitArray(path, true)
			}
			r.Paths = newPaths
		} else if r.Selectors != nil {
			r.Selectors = v.VisitArray(r.Selectors, false)
		}
		if len(r.Rules) > 0 {
			r.Rules = v.VisitArray(r.Rules)
		}
	} else if v, ok := visitor.(interface{ VisitArray([]any, bool) []any }); ok {
		if r.Paths != nil {
			newPaths := make([][]any, len(r.Paths))
			for i, path := range r.Paths {
				newPaths[i] = v.VisitArray(path, true)
			}
			r.Paths = newPaths
		} else if r.Selectors != nil {
			r.Selectors = v.VisitArray(r.Selectors, false)
		}
		if len(r.Rules) > 0 {
			r.Rules = v.VisitArray(r.Rules, false)
		}
	} else if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
		if r.Paths != nil {
			newPaths := make([][]any, len(r.Paths))
			for i, path := range r.Paths {
				newPaths[i] = v.VisitArray(path)
			}
			r.Paths = newPaths
		} else if r.Selectors != nil {
			r.Selectors = v.VisitArray(r.Selectors)
		}
		if len(r.Rules) > 0 {
			r.Rules = v.VisitArray(r.Rules)
		}
	}
}

// Eval evaluates the ruleset in the given context
func (r *Ruleset) Eval(context any) (any, error) {
	if context == nil {
		return nil, fmt.Errorf("context is required for Ruleset.Eval")
	}

	// Accept both *Eval and map[string]any contexts
	// For circular dependency tracking, we need access to a map
	var ctx map[string]any
	var evalCtx *Eval

	if ec, ok := context.(*Eval); ok {
		evalCtx = ec
		// Create a minimal map for state tracking (circular dependency, etc.)
		// We'll pass the *Eval context to child evaluations
		ctx = make(map[string]any)
	} else if mapCtx, ok := context.(map[string]any); ok {
		ctx = mapCtx
	} else {
		return nil, fmt.Errorf("context must be *Eval or map[string]any, got %T", context)
	}

	// Check for circular dependency to prevent infinite recursion
	visitedKey := "_evaluatingRulesets"
	if visiting, exists := ctx[visitedKey]; exists {
		if visitedMap, ok := visiting.(map[*Ruleset]bool); ok {
			if visitedMap[r] {
				// Already evaluating this ruleset, return early to prevent infinite recursion
				return NewRuleset(nil, nil, false, nil), nil
			}
			visitedMap[r] = true
		} else {
			// Initialize the visited map
			visitedMap := make(map[*Ruleset]bool)
			visitedMap[r] = true
			ctx[visitedKey] = visitedMap
		}
	} else {
		// Initialize the visited map
		visitedMap := make(map[*Ruleset]bool)
		visitedMap[r] = true
		ctx[visitedKey] = visitedMap
	}

	// Ensure we clean up after evaluation
	defer func() {
		if visiting, exists := ctx[visitedKey]; exists {
			if visitedMap, ok := visiting.(map[*Ruleset]bool); ok {
				delete(visitedMap, r)
			}
		}
	}()

	var selectors []any
	var selCnt int
	var hasVariable bool
	var hasOnePassingSelector bool

	if len(r.Selectors) > 0 {
		selCnt = len(r.Selectors)
		selectors = make([]any, selCnt)

		// Match JavaScript: defaultFunc.error({type: 'Syntax', message: 'it is currently only allowed in parametric mixin guards,'});
		if evalCtx != nil && evalCtx.DefaultFunc != nil {
			evalCtx.DefaultFunc.Error(map[string]any{
				"type":    "Syntax",
				"message": "it is currently only allowed in parametric mixin guards,",
			})
		} else if df, ok := ctx["defaultFunc"].(interface{ Error(map[string]any) }); ok {
			df.Error(map[string]any{
				"type":    "Syntax",
				"message": "it is currently only allowed in parametric mixin guards,",
			})
		}

		// Evaluate selectors - pass the original context (either *Eval or map)
		for i := 0; i < selCnt; i++ {
			if sel, ok := r.Selectors[i].(interface{ Eval(any) (any, error) }); ok {
				evaluated, err := sel.Eval(context)
				if err != nil {
					return nil, err
				}
				selectors[i] = evaluated

				// Check for variables in elements
				if selector, ok := evaluated.(*Selector); ok {
					for _, elem := range selector.Elements {
						if elem.IsVariable {
							hasVariable = true
							break
						}
					}

					// Check for passing condition
					if selector.EvaldCondition {
						hasOnePassingSelector = true
					}
				}
			}
		}

		// Handle variables in selectors - parse using SelectorsParseFunc
		if hasVariable && r.SelectorsParseFunc != nil {
			// Convert selectors to CSS strings for parsing (like JavaScript toParseSelectors)
			var toParseSelectors []string
			var startingIndex int
			var selectorFileInfo map[string]any
			
			for i, sel := range selectors {
				if selector, ok := sel.(*Selector); ok {
					// Get CSS representation of selector
					cssStr := selector.ToCSS(ctx)
					toParseSelectors = append(toParseSelectors, cssStr)
					
					if i == 0 {
						startingIndex = selector.GetIndex()
						selectorFileInfo = selector.FileInfo()
					}
				}
			}
			
			if len(toParseSelectors) > 0 {
				// Parse the selectors string (equivalent to JS parseNode call)
				selectorString := strings.Join(toParseSelectors, ",")
				parsedSelectors, err := r.SelectorsParseFunc(selectorString, r.ParseContext, r.ParseImports, selectorFileInfo, startingIndex)
				if err == nil && len(parsedSelectors) > 0 {
					// Flatten the result (equivalent to utils.flattenArray in JS)
					selectors = flattenArray(parsedSelectors)
				}
			}
		}
		
		// Match JavaScript: defaultFunc.reset();
		if evalCtx != nil && evalCtx.DefaultFunc != nil {
			evalCtx.DefaultFunc.Reset()
		} else if df, ok := ctx["defaultFunc"].(interface{ Reset() }); ok {
			df.Reset()
		}
	} else {
		hasOnePassingSelector = true
	}

	// Copy rules
	var rules []any
	if r.Rules != nil {
		rules = CopyArray(r.Rules)
	}

	// Create new ruleset
	ruleset := NewRuleset(selectors, rules, r.StrictImports, r.VisibilityInfo(), r.SelectorsParseFunc, r.ValueParseFunc, r.ParseContext, r.ParseImports)
	ruleset.OriginalRuleset = r
	ruleset.Root = r.Root
	ruleset.FirstRoot = r.FirstRoot
	ruleset.AllowImports = r.AllowImports

	if r.DebugInfo != nil {
		ruleset.DebugInfo = r.DebugInfo
	}

	// Match JavaScript: if (!hasOnePassingSelector) { rules.length = 0; }
	if !hasOnePassingSelector {
		// Clear the rules in the newly created ruleset
		ruleset.Rules = []any{}
	}

	// inherit a function registry from the frames stack when possible;
	// otherwise from the global registry
	// Match JavaScript: ruleset.functionRegistry = (function (frames) {...}(context.frames)).inherit();
	var functionRegistry any
	var frames []any

	// Get frames from the appropriate context type
	if evalCtx != nil {
		frames = evalCtx.Frames
	} else if framesVal, ok := ctx["frames"].([]any); ok {
		frames = framesVal
	}

	// Check evalCtx for FunctionRegistry first
	if evalCtx != nil && evalCtx.FunctionRegistry != nil {
		functionRegistry = evalCtx.FunctionRegistry
	} else if len(frames) > 0 {
		// Fall back to checking frames
		for _, frame := range frames {
			if f, ok := frame.(*Ruleset); ok {
				if f.FunctionRegistry != nil {
					functionRegistry = f.FunctionRegistry
					break
				}
			}
		}
	}

	// Apply .inherit() pattern like JavaScript
	if functionRegistry != nil {
		if inheritRegistry, ok := functionRegistry.(interface{ Inherit() any }); ok {
			ruleset.FunctionRegistry = inheritRegistry.Inherit()
		} else {
			// Fallback if Inherit method not available
			ruleset.FunctionRegistry = functionRegistry
		}
	}
	// If no function registry found in frames, leave it nil for now

	// Push current ruleset to frames stack
	newFrames := make([]any, len(frames)+1)
	newFrames[0] = ruleset
	copy(newFrames[1:], frames)

	// Update frames in the appropriate context type
	if evalCtx != nil {
		evalCtx.Frames = newFrames
	} else {
		ctx["frames"] = newFrames
	}

	// Current selectors - store in map for both context types
	if selectors := ctx["selectors"]; selectors == nil {
		ctx["selectors"] = []any{r.Selectors}
	} else if sels, ok := selectors.([]any); ok {
		newSelectors := make([]any, len(sels)+1)
		newSelectors[0] = r.Selectors
		copy(newSelectors[1:], sels)
		ctx["selectors"] = newSelectors
	}

	// Ensure function registry is available in context
	if evalCtx != nil {
		// For *Eval context, set FunctionRegistry if not already set
		if evalCtx.FunctionRegistry == nil && ruleset.FunctionRegistry != nil {
			if registry, ok := ruleset.FunctionRegistry.(*Registry); ok {
				evalCtx.FunctionRegistry = registry
			}
		}
	} else {
		// For map context, set functionRegistry if not already set
		if _, exists := ctx["functionRegistry"]; !exists && ruleset.FunctionRegistry != nil {
			ctx["functionRegistry"] = ruleset.FunctionRegistry
		}
	}

	// Evaluate imports
	if ruleset.Root || ruleset.AllowImports || !ruleset.StrictImports {
		err := ruleset.EvalImports(context)
		if err != nil {
			return nil, err
		}
	}

	// Evaluate rules that need to be evaluated first
	rsRules := ruleset.Rules
	for i, rule := range rsRules {
		if r, ok := rule.(interface{ EvalFirst() bool }); ok && r.EvalFirst() {
			// Handle MixinDefinition specifically (returns *MixinDefinition, not any)
			if eval, ok := rule.(interface{ Eval(any) (*MixinDefinition, error) }); ok {
				evaluated, err := eval.Eval(context)
				if err != nil {
					return nil, err
				}
				rsRules[i] = evaluated
			} else if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok {
				evaluated, err := eval.Eval(context)
				if err != nil {
					return nil, err
				}
				rsRules[i] = evaluated
			}
		}
	}

	// Track media blocks
	mediaBlockCount := 0
	if mediaBlocks, ok := ctx["mediaBlocks"].([]any); ok {
		mediaBlockCount = len(mediaBlocks)
	}

	// Evaluate mixin calls and variable calls - match JavaScript logic closely
	if rsRules != nil {
		i := 0
		for i < len(rsRules) {
			rule := rsRules[i]
			if r, ok := rule.(interface{ GetType() string }); ok {
				switch r.GetType() {
				case "MixinCall":
					if eval, ok := rule.(interface{ Eval(any) ([]any, error) }); ok {
						rules, err := eval.Eval(context)
						if err != nil {
							return nil, err
						}
						// Match JavaScript filter logic: !(ruleset.variable(r.name))
						filtered := make([]any, 0)
						for _, r := range rules {
							if decl, ok := r.(*Declaration); ok && decl.variable {
								// Match JavaScript: return !(ruleset.variable(r.name))
								if nameStr, ok := decl.name.(string); ok {
									if ruleset.Variable(nameStr) == nil {
										filtered = append(filtered, r) // Include if variable doesn't exist
									}
									// Skip if variable already exists (don't pollute scope)
								} else {
									filtered = append(filtered, r)
								}
							} else {
								filtered = append(filtered, r)
							}
						}
						
						// rsRules.splice.apply(rsRules, [i, 1].concat(rules))
						newRules := make([]any, len(rsRules)+len(filtered)-1)
						copy(newRules, rsRules[:i])
						copy(newRules[i:], filtered)
						copy(newRules[i+len(filtered):], rsRules[i+1:])
						rsRules = newRules
						ruleset.Rules = rsRules
						i += len(filtered) - 1
						ruleset.ResetCache()
					}
				case "VariableCall":
					if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok {
						evaluated, err := eval.Eval(context)
						if err != nil {
							return nil, err
						}
						// Handle the result - it could be a map with "rules" key or a Ruleset
						var evalRules []any
						if evalMap, ok := evaluated.(map[string]any); ok {
							if rules, hasRules := evalMap["rules"].([]any); hasRules {
								evalRules = rules
							}
						} else if rs, ok := evaluated.(*Ruleset); ok {
							evalRules = rs.Rules
						}
						
						if evalRules != nil {
							// Match JavaScript: filter out all variable declarations
							rules := make([]any, 0)
							for _, r := range evalRules {
								if decl, ok := r.(*Declaration); ok && decl.variable {
									// do not pollute the scope at all
									continue
								}
								rules = append(rules, r)
							}
							
							// rsRules.splice.apply(rsRules, [i, 1].concat(rules))
							newRules := make([]any, len(rsRules)+len(rules)-1)
							copy(newRules, rsRules[:i])
							copy(newRules[i:], rules)
							copy(newRules[i+len(rules):], rsRules[i+1:])
							rsRules = newRules
							ruleset.Rules = rsRules
							i += len(rules) - 1
							ruleset.ResetCache()
						}
					}
				}
			}
			i++
		}
	}

	// Evaluate everything else
	for i, rule := range rsRules {
		if r, ok := rule.(interface{ EvalFirst() bool }); ok && r.EvalFirst() {
			continue // Already evaluated
		}
		
		// Try different Eval signatures
		switch evalRule := rule.(type) {
		case interface{ Eval(any) (*MixinDefinition, error) }:
			// Handle MixinDefinition
			evaluated, err := evalRule.Eval(context)
			if err != nil {
				return nil, err
			}
			rsRules[i] = evaluated
		case interface{ Eval(any) (any, error) }:
			// Handle generic Eval
			evaluated, err := evalRule.Eval(context)
			if err != nil {
				return nil, err
			}
			rsRules[i] = evaluated
		case interface{ Eval(any) any }:
			// Handle Eval without error return
			rsRules[i] = evalRule.Eval(context)
		}
	}
	
	// Reset cache after evaluating rules since variable values may have changed
	ruleset.ResetCache()

	// Handle parent selector folding like JavaScript version
	i := 0
	for i < len(rsRules) {
		rule := rsRules[i]
		// for rulesets, check if it is a css guard and can be removed
		if rs, ok := rule.(*Ruleset); ok && len(rs.Selectors) == 1 {
			// check if it can be folded in (e.g. & where)
			if rs.Selectors[0] != nil {
				if sel, ok := rs.Selectors[0].(*Selector); ok && sel.IsJustParentSelector() {
					// Remove the parent ruleset
					rsRules = r.removeRuleAtIndex(rsRules, i)
					ruleset.Rules = rsRules
					i--

					// Add the sub rules
					for _, subRule := range rs.Rules {
						if r.shouldIncludeSubRule(subRule, rs) {
							i++
							rsRules = r.insertRuleAtIndex(rsRules, i, subRule)
							ruleset.Rules = rsRules
						}
					}
				}
			}
		}
		i++
	}

	// Pop the stack
	if evalCtx != nil {
		// Pop from *Eval context
		if len(evalCtx.Frames) > 0 {
			evalCtx.Frames = evalCtx.Frames[1:]
		}
	} else {
		// Pop from map context
		if frames, ok := ctx["frames"].([]any); ok && len(frames) > 0 {
			ctx["frames"] = frames[1:]
		}
	}
	if selectors, ok := ctx["selectors"].([]any); ok && len(selectors) > 0 {
		ctx["selectors"] = selectors[1:]
	}

	// Handle media blocks
	if mediaBlocks, ok := ctx["mediaBlocks"].([]any); ok {
		for i := mediaBlockCount; i < len(mediaBlocks); i++ {
			if mb, ok := mediaBlocks[i].(interface{ BubbleSelectors([]any) }); ok {
				mb.BubbleSelectors(selectors)
			}
		}
	}

	return ruleset, nil
}

// EvalImports evaluates import rules like JavaScript version
func (r *Ruleset) EvalImports(context any) error {
	rules := r.Rules
	var i int
	var importRules any
	
	if rules == nil {
		return nil
	}

	for i = 0; i < len(rules); i++ {
		if ruleType, ok := rules[i].(interface{ GetType() string }); ok && ruleType.GetType() == "Import" {
			if eval, ok := rules[i].(interface{ Eval(any) (any, error) }); ok {
				evaluated, err := eval.Eval(context)
				if err != nil {
					return err
				}
				importRules = evaluated

				// Handle different return types like JavaScript version
				if importRulesSlice, ok := importRules.([]any); ok {
					// if (importRules && (importRules.length || importRules.length === 0))
					if len(importRulesSlice) > 0 || len(importRulesSlice) == 0 {
						// Replace import rule with its evaluated result
						newRules := make([]any, len(rules)+len(importRulesSlice)-1)
						copy(newRules, rules[:i])
						copy(newRules[i:], importRulesSlice)
						copy(newRules[i+len(importRulesSlice):], rules[i+1:])
						rules = newRules
						r.Rules = rules
						i += len(importRulesSlice) - 1
					} else {
						// rules.splice(i, 1, importRules);
						rules[i] = importRules
					}
				} else {
					// rules.splice(i, 1, importRules);
					rules[i] = importRules
				}
				r.ResetCache()
			}
		}
	}
	return nil
}

// MakeImportant creates a new Ruleset with all rules marked as important
func (r *Ruleset) MakeImportant() any {
	var newRules []any
	if r.Rules != nil {
		newRules = make([]any, len(r.Rules))
		for i, rule := range r.Rules {
			if imp, ok := rule.(interface{ MakeImportant() any }); ok {
				newRules[i] = imp.MakeImportant()
			} else {
				newRules[i] = rule
			}
		}
	}

	return NewRuleset(r.Selectors, newRules, r.StrictImports, r.VisibilityInfo())
}

// MatchArgs checks if the ruleset matches the given arguments
func (r *Ruleset) MatchArgs(args []any) bool {
	return len(args) == 0
}

// MatchCondition checks if the ruleset matches the given condition
func (r *Ruleset) MatchCondition(args []any, context any) bool {
	if len(r.Selectors) == 0 {
		return false
	}
	
	lastSelector := r.Selectors[len(r.Selectors)-1]
	
	// Check evaldCondition
	if sel, ok := lastSelector.(*Selector); ok {
		if !sel.EvaldCondition {
			return false
		}
		
		// Check condition
		if sel.Condition != nil {
			if eval, ok := sel.Condition.(interface{ Eval(any) (any, error) }); ok {
				// Create new context for evaluation like JavaScript version
				ctx := make(map[string]any)
				if c, ok := context.(map[string]any); ok {
					for k, v := range c {
						ctx[k] = v
					}
				}
				if frames, ok := ctx["frames"].([]any); ok {
					ctx["frames"] = frames
				}
				
				// IMPORTANT: Preserve the defaultFunc in the context
				// This is needed for the default() function in mixin guards
				if evalCtx, ok := context.(EvalContext); ok {
					if df := evalCtx.GetDefaultFunc(); df != nil {
						ctx["defaultFunc"] = df
					}
				} else if c, ok := context.(map[string]any); ok {
					if df, exists := c["defaultFunc"]; exists {
						ctx["defaultFunc"] = df
					}
				}
				
				result, err := eval.Eval(ctx)
				if err != nil {
					return false
				}
				
				// Check if result is falsy
				if isFalsy(result) {
					return false
				}
			}
		}
	}
	
	return true
}

// Helper function to check if a value is falsy (like JavaScript)
func isFalsy(v any) bool {
	if v == nil {
		return true
	}
	
	switch val := v.(type) {
	case bool:
		return !val
	case int:
		return val == 0
	case float64:
		return val == 0
	case string:
		return val == ""
	default:
		return false
	}
}

// ResetCache resets all cached values
func (r *Ruleset) ResetCache() {
	r.rulesets = nil
	r.variables = nil
	r.properties = nil
	r.lookups = make(map[string][]any)
}

// Variables returns a map of all variables in the ruleset
func (r *Ruleset) Variables() map[string]any {
	if r.variables != nil {
		return r.variables
	}

	if r.Rules == nil {
		r.variables = make(map[string]any)
		return r.variables
	}

	// Use reduce-like pattern from JavaScript version
	r.variables = make(map[string]any)
	for _, rule := range r.Rules {
		if decl, ok := rule.(*Declaration); ok && decl.variable {
			if name, ok := decl.name.(string); ok {
				r.variables[name] = decl
			}
		}
		// Handle import rules with variables like JavaScript version
		if ruleType, ok := rule.(interface{ GetType() string }); ok && ruleType.GetType() == "Import" {
			if importRule, ok := rule.(interface{
				GetRoot() interface{
					Variables() map[string]any
					Variable(string) any
				}
			}); ok {
				if root := importRule.GetRoot(); root != nil {
					vars := root.Variables()
					for name := range vars {
						if vars[name] != nil {
							r.variables[name] = root.Variable(name)
						}
					}
				}
			}
		}
	}

	return r.variables
}

// Properties returns a map of all properties in the ruleset
func (r *Ruleset) Properties() map[string][]any {
	if r.properties != nil {
		return r.properties
	}
	
	if r.Rules == nil {
		r.properties = make(map[string][]any)
		return r.properties
	}
	
	// Use reduce-like pattern from JavaScript version
	r.properties = make(map[string][]any)
	for _, rule := range r.Rules {
		if decl, ok := rule.(*Declaration); ok && !decl.variable {
			var name string
			// Handle name like JavaScript: name.length === 1 && name[0] instanceof Keyword
			if nameSlice, ok := decl.name.([]any); ok {
				if len(nameSlice) == 1 {
					// Single element - extract value from it
					if kw, ok := nameSlice[0].(*Keyword); ok {
						name = kw.value
					} else {
						name = fmt.Sprintf("%v", nameSlice[0])
					}
				} else if len(nameSlice) > 1 {
					// Multiple elements - concatenate their values
					// This handles cases like compound property names
					parts := make([]string, 0, len(nameSlice))
					for _, elem := range nameSlice {
						if kw, ok := elem.(*Keyword); ok {
							parts = append(parts, kw.value)
						} else if str, ok := elem.(string); ok {
							parts = append(parts, str)
						} else if anon, ok := elem.(*Anonymous); ok {
							if val, ok := anon.Value.(string); ok {
								parts = append(parts, val)
							} else {
								parts = append(parts, fmt.Sprintf("%v", anon.Value))
							}
						} else {
							parts = append(parts, fmt.Sprintf("%v", elem))
						}
					}
					name = strings.Join(parts, "")
				}
			} else if nameStr, ok := decl.name.(string); ok {
				name = nameStr
			} else {
				name = fmt.Sprintf("%v", decl.name)
			}
			
			key := "$" + name
			// Properties don't overwrite as they can merge (from JavaScript comment)
			if _, exists := r.properties[key]; !exists {
				r.properties[key] = []any{decl}
			} else {
				r.properties[key] = append(r.properties[key], decl)
			}
		}
	}
	
	return r.properties
}

// Variable returns a specific variable by name
func (r *Ruleset) Variable(name string) map[string]any {
	vars := r.Variables()
	if decl, exists := vars[name]; exists {
		if d, ok := decl.(*Declaration); ok {
			// Transform the declaration to parse Anonymous values into proper nodes
			transformed := r.transformDeclaration(d)
			
			// Return the expected format with value and important fields
			var value any
			if transformedDecl, ok := transformed.(*Declaration); ok {
				value = transformedDecl.Value
			} else {
				value = d.Value
			}
			
			result := map[string]any{
				"value": value,
			}
			
			// Check if the declaration has important flag
			if d.GetImportant() {
				// Store the actual important string value, not just a boolean
				result["important"] = d.important
			}
			
			return result
		} else {
			// Handle other types (like mock declarations in tests)
			result := map[string]any{
				"value": r.ParseValue(decl),
			}
			
			// Check if the declaration has important flag
			if declMap, ok := decl.(map[string]any); ok {
				if important, hasImportant := declMap["important"]; hasImportant {
					result["important"] = important
				}
			}
			
			return result
		}
	}
	return nil
}

// Property returns a specific property by name
func (r *Ruleset) Property(name string) []any {
	props := r.Properties()
	if decl, exists := props[name]; exists {
		// Transform declarations to parse Anonymous values into proper nodes (e.g., "10px" -> *Dimension)
		// This matches what Variable() does and is needed for namespace lookups in operations
		transformed := make([]any, len(decl))
		for i, d := range decl {
			transformed[i] = r.transformDeclaration(d)
		}
		return transformed
	}
	return nil
}

// HasVariable checks if a variable exists
func (r *Ruleset) HasVariable(name string) bool {
	vars := r.Variables()
	_, exists := vars[name]
	return exists
}

// HasVariables indicates whether this ruleset supports variables (matches JavaScript rules.variables)
func (r *Ruleset) HasVariables() bool {
	return true // Rulesets always support variables
}

// HasProperties indicates whether this ruleset supports properties (matches JavaScript rules.properties)
func (r *Ruleset) HasProperties() bool {
	return true // Rulesets always support properties
}

// Variable returns a variable by name, matching JavaScript behavior
func (r *Ruleset) variable(name string) any {
	decl := r.Variables()[name]
	if decl != nil {
		return r.ParseValue(decl)
	}
	return nil
}

// LastDeclaration returns the last declaration in the ruleset
func (r *Ruleset) LastDeclaration() any {
	if r.Rules == nil {
		return nil
	}
	
	// for (let i = this.rules.length; i > 0; i--) like JavaScript
	for i := len(r.Rules); i > 0; i-- {
		decl := r.Rules[i-1]
		if declaration, ok := decl.(*Declaration); ok {
			return r.ParseValue(declaration)
		}
	}
	return nil
}

// ParseValue parses a declaration value
func (r *Ruleset) ParseValue(toParse any) any {
	if toParse == nil {
		return nil
	}
	
	// Handle arrays
	if arr, ok := toParse.([]any); ok {
		nodes := make([]any, len(arr))
		for i, item := range arr {
			nodes[i] = r.transformDeclaration(item)
		}
		return nodes
	}
	
	return r.transformDeclaration(toParse)
}

// transformDeclaration transforms a declaration by parsing its value if needed
func (r *Ruleset) transformDeclaration(decl any) any {
	if d, ok := decl.(*Declaration); ok {
		// Match JavaScript logic: if (decl.value instanceof Anonymous && !decl.parsed)
		if d.Value != nil && len(d.Value.Value) > 0 {
			// Check if not parsed (similar to JS !decl.parsed)
			parsed := false
			if d.Parsed != nil {
				if p, ok := d.Parsed.(bool); ok {
					parsed = p
				}
			}
			if anon, ok := d.Value.Value[0].(*Anonymous); ok && anon != nil && !parsed {
				// Check if needs parsing and ValueParseFunc is available
				if str, ok := anon.Value.(string); ok && str != "" && r.ValueParseFunc != nil {
					// Parse using ValueParseFunc (equivalent to JS parseNode call)
					result, err := r.ValueParseFunc(str, r.ParseContext, r.ParseImports, d.FileInfo(), anon.GetIndex())
					if err != nil {
						// If parsing fails, create a copy and mark as parsed to avoid infinite loops
						nodeCopy := NewNode()
						nodeCopy.CopyVisibilityInfo(d.Node.VisibilityInfo())
						nodeCopy.Parsed = true
						dCopy := &Declaration{
							Node:      nodeCopy,
							name:      d.name,
							Value:     d.Value,
							important: d.important,
							merge:     d.merge,
							inline:    d.inline,
							variable:  d.variable,
						}
						return dCopy
					} else if len(result) > 0 {
						
						// The parser returns Value>Expression>Dimension for "10px"
						// We should use the parsed Value directly, not wrap it again
						var valueCopy *Value
						if parsedValue, ok := result[0].(*Value); ok {
							valueCopy = parsedValue
						} else {
							// Fallback: wrap in Value if not already a Value
							valueCopy, _ = NewValue([]any{result[0]})
						}
						
						nodeCopy := NewNode()
						nodeCopy.CopyVisibilityInfo(d.Node.VisibilityInfo())
						nodeCopy.Parsed = true
						dCopy := &Declaration{
							Node:      nodeCopy,
							name:      d.name,
							Value:     valueCopy,
							important: d.important,
							merge:     d.merge,
							inline:    d.inline,
							variable:  d.variable,
						}
						if len(result) > 1 {
							// Handle important flag if present
							if important, ok := result[1].(string); ok {
								dCopy.important = important
							}
						}
						return dCopy
					}
				} else if str != "" {
					// Create a copy and mark as parsed even if no parser function available
					nodeCopy := NewNode()
					nodeCopy.CopyVisibilityInfo(d.Node.VisibilityInfo())
					nodeCopy.Parsed = true
					dCopy := &Declaration{
						Node:      nodeCopy,
						name:      d.name,
						Value:     d.Value,
						important: d.important,
						merge:     d.merge,
						inline:    d.inline,
						variable:  d.variable,
					}
					return dCopy
				}
			}
		}
	}
	return decl
}

// Rulesets returns all nested rulesets
func (r *Ruleset) Rulesets() []any {
	if r.Rules == nil {
		return []any{}
	}
	
	var filtered []any
	for _, rule := range r.Rules {
		if rs, ok := rule.(interface{ IsRuleset() bool }); ok && rs.IsRuleset() {
			filtered = append(filtered, rule)
		}
	}
	
	return filtered
}

// PrependRule adds a rule to the beginning of the rules list
func (r *Ruleset) PrependRule(rule any) {
	if r.Rules == nil {
		r.Rules = []any{rule}
	} else {
		newRules := make([]any, len(r.Rules)+1)
		newRules[0] = rule
		copy(newRules[1:], r.Rules)
		r.Rules = newRules
	}
	r.SetParent(rule, r.Node)
}

// Find finds rules matching a selector like JavaScript version
func (r *Ruleset) Find(selector any, self any, filter func(any) bool) []any {
	if self == nil {
		self = r
	}

	var key string
	if sel, ok := selector.(interface{ ToCSS() string }); ok {
		key = sel.ToCSS()
	} else if sel, ok := selector.(interface{ ToCSS(any) string }); ok {
		key = sel.ToCSS(nil)
	} else {
		key = fmt.Sprintf("%v", selector)
	}

	if cached, exists := r.lookups[key]; exists {
		return cached
	}

	rules := []any{}
	var match int
	var foundMixins []any


	// this.rulesets().forEach(function (rule) { ... }) pattern
	rulesets := r.Rulesets()

	for _, rule := range rulesets {
		if rule == self {
			continue
		}
		
		// Handle both *Ruleset and *MixinDefinition (which embeds *Ruleset)
		var rulesetSelectors []any
		switch r := rule.(type) {
		case *Ruleset:
			rulesetSelectors = r.Selectors
		case *MixinDefinition:
			rulesetSelectors = r.Selectors
		default:
			// Check if it has a Selectors field via interface
			if rs, ok := rule.(interface{ GetSelectors() []any }); ok {
				rulesetSelectors = rs.GetSelectors()
			}
		}
		
		if rulesetSelectors != nil {
			for j := 0; j < len(rulesetSelectors); j++ {
				if sel, ok := selector.(*Selector); ok {
					if ruleSelector, ok := rulesetSelectors[j].(*Selector); ok {
						match = sel.Match(ruleSelector)
						if match > 0 {
							if len(sel.Elements) > match {
								if filter == nil || filter(rule) {
									// Create new selector with remaining elements like JavaScript
									remainingElements := make([]*Element, len(sel.Elements)-match)
									copy(remainingElements, sel.Elements[match:])
									newSelector, err := NewSelector(remainingElements, nil, nil, sel.GetIndex(), sel.FileInfo(), nil)
									if err == nil {
										// Use Find method on the rule (works for both Ruleset and MixinDefinition)
										if finder, ok := rule.(interface{ Find(any, any, func(any) bool) []any }); ok {
											foundMixins = finder.Find(newSelector, self, filter)
										}
										for i := 0; i < len(foundMixins); i++ {
											if mixin, ok := foundMixins[i].(map[string]any); ok {
												if path, ok := mixin["path"].([]any); ok {
													// foundMixins[i].path.push(rule);
													newPath := make([]any, len(path)+1)
													copy(newPath, path)
													newPath[len(path)] = rule
													mixin["path"] = newPath
												}
											}
										}
										// Array.prototype.push.apply(rules, foundMixins);
										rules = append(rules, foundMixins...)
									}
								}
							} else {
								rules = append(rules, map[string]any{
									"rule": rule,
									"path": []any{},
								})
							}
							break
						}
					}
				} else {
					// Handle any selector with Match method using interface
					if selectorWithMatch, ok := selector.(interface{ Match(any) int }); ok {
						match = selectorWithMatch.Match(rulesetSelectors[j])
						if match > 0 {
							rules = append(rules, map[string]any{
								"rule": rule,
								"path": []any{},
							})
							break
						}
					}
				}
			}
		}
	}
	
	r.lookups[key] = rules
	return rules
}

// GenCSS generates CSS for the ruleset
func (r *Ruleset) GenCSS(context any, output *CSSOutput) {
	// Check visibility - skip if node blocks visibility and is not explicitly visible
	// This implements the reference import functionality where nodes from referenced
	// imports are hidden unless explicitly used (via extend or mixin call)
	if r.Node != nil && r.Node.BlocksVisibility() {
		nodeVisible := r.Node.IsVisible()
		if nodeVisible == nil || !*nodeVisible {
			// Node blocks visibility and is not explicitly visible, skip output
			return
		}
	}

	ctx, ok := context.(map[string]any)
	if !ok {
		ctx = make(map[string]any)
	}

	// Set tab level
	tabLevel := 0
	if tl, ok := ctx["tabLevel"].(int); ok {
		tabLevel = tl
	}

	if !r.Root {
		tabLevel++
		ctx["tabLevel"] = tabLevel
	}
	
	compress := false
	if c, ok := ctx["compress"].(bool); ok {
		compress = c
	}
	
	var tabRuleStr, tabSetStr string
	if compress {
		tabRuleStr = ""
		tabSetStr = ""
	} else {
		// JavaScript: Array(tabLevel + 1).join('  ') produces (tabLevel) * 2 spaces
		// JavaScript: Array(tabLevel).join('  ') produces (tabLevel - 1) * 2 spaces (minimum 0)
		tabRuleStr = strings.Repeat("  ", tabLevel)
		if tabLevel > 0 {
			tabSetStr = strings.Repeat("  ", tabLevel-1)
		} else {
			tabSetStr = ""
		}
	}
	
	// Organize rules by type like JavaScript version
	var charsetRuleNodes []any
	var ruleNodes []any

	var charsetNodeIndex int = 0
	var importNodeIndex int = 0

	if r.Rules != nil {
		for i, rule := range r.Rules {
			// Skip silent comments entirely - they don't generate output
			// This prevents extra blank lines from being added after the last visible rule
			if comment, ok := rule.(*Comment); ok {
				if comment.IsSilent(ctx) {
					continue // Skip silent comments
				}
				// Non-silent comments are included
				if importNodeIndex == i {
					importNodeIndex++
				}
				ruleNodes = append(ruleNodes, rule)
			} else if _, ok := rule.(*Extend); ok {
				// Skip Extend rules entirely - they don't generate CSS output
				// Extend rules are processed during the extend visitor phase and should not appear in CSS
				// This prevents extra blank lines from being added
				continue
			} else if charset, ok := rule.(interface{ IsCharset() bool }); ok && charset.IsCharset() {
				// ruleNodes.splice(charsetNodeIndex, 0, rule);
				newRules := make([]any, len(ruleNodes)+1)
				copy(newRules, ruleNodes[:charsetNodeIndex])
				newRules[charsetNodeIndex] = rule
				copy(newRules[charsetNodeIndex+1:], ruleNodes[charsetNodeIndex:])
				ruleNodes = newRules
				charsetNodeIndex++
				importNodeIndex++
			} else if ruleType, ok := rule.(interface{ GetType() string }); ok && ruleType.GetType() == "Import" {
				// ruleNodes.splice(importNodeIndex, 0, rule);
				newRules := make([]any, len(ruleNodes)+1)
				copy(newRules, ruleNodes[:importNodeIndex])
				newRules[importNodeIndex] = rule
				copy(newRules[importNodeIndex+1:], ruleNodes[importNodeIndex:])
				ruleNodes = newRules
				importNodeIndex++
			} else {
				ruleNodes = append(ruleNodes, rule)
			}
		}
	}

	// ruleNodes = charsetRuleNodes.concat(ruleNodes);
	ruleNodes = append(charsetRuleNodes, ruleNodes...)

	// Check if this ruleset contains only extends (no actual CSS output)
	// If so, we'll skip generating selectors/braces but still complete normally for proper spacing
	hasOnlyExtends := !r.Root && len(r.Rules) > 0 && len(ruleNodes) == 0

	// Generate CSS for selectors if not root
	// Check if this is a media-empty ruleset that should not generate selectors/braces
	// This happens when media queries create wrapper rulesets with empty selectors
	isMediaEmpty := false
	if !r.Root && r.Paths == nil && len(r.Selectors) == 1 {
		if sel, ok := r.Selectors[0].(*Selector); ok && sel.MediaEmpty {
			isMediaEmpty = true
		}
	}

	if !r.Root && !isMediaEmpty && !hasOnlyExtends {
		// Generate debug info
		if debugInfo := GetDebugInfo(ctx, r, tabSetStr); debugInfo != "" {
			output.Add(debugInfo, nil, nil)
			output.Add(tabSetStr, nil, nil)
		}

		// Generate selectors
		if r.Paths != nil {
			sep := ","
			if !compress {
				sep = ",\n" + tabSetStr
			}

			for i, path := range r.Paths {
				if len(path) == 0 {
					continue
				}
				if i > 0 {
					output.Add(sep, nil, nil)
				}

				// Always set firstSelector to true for the first selector in a path
				// This ensures no extra space is added at the beginning of selectors
				ctx["firstSelector"] = true
				if gen, ok := path[0].(interface{ GenCSS(any, *CSSOutput) }); ok {
					gen.GenCSS(ctx, output)
				}

				ctx["firstSelector"] = false
				for j := 1; j < len(path); j++ {
					if gen, ok := path[j].(interface{ GenCSS(any, *CSSOutput) }); ok {
						gen.GenCSS(ctx, output)
					}
				}
			}
		} else if r.Selectors != nil && len(r.Selectors) > 0 {
			// Fallback: if Paths is nil, use Selectors directly
			// This handles cases where JoinSelectorVisitor hasn't run yet (e.g., in media queries)

			// Check if this is a media-empty selector (should not be output)
			// Use the outer isMediaEmpty variable (don't shadow it)
			if len(r.Selectors) == 1 {
				if sel, ok := r.Selectors[0].(*Selector); ok {
					if sel.MediaEmpty {
						isMediaEmpty = true
					}
				}
			}

			if !isMediaEmpty {
				sep := ","
				if !compress {
					sep = ",\n" + tabSetStr
				}

				for i, selector := range r.Selectors {
					if i > 0 {
						output.Add(sep, nil, nil)
					}

					ctx["firstSelector"] = true
					if gen, ok := selector.(interface{ GenCSS(any, *CSSOutput) }); ok {
						gen.GenCSS(ctx, output)
					}
					ctx["firstSelector"] = false
				}
			}
		}
		
		// Add opening brace
		if compress {
			output.Add("{", nil, nil)
		} else {
			output.Add(" {\n", nil, nil)
		}
		output.Add(tabRuleStr, nil, nil)
	}

	// Generate CSS for rules (skip if this ruleset contains only extends)
	// Note: Silent comments have been filtered out above, so we only process rules that generate output
	if !hasOnlyExtends {
	for i, rule := range ruleNodes {
		if i+1 == len(ruleNodes) {
			ctx["lastRule"] = true
		} else {
			// Explicitly set to false for non-last rules to override any parent context setting
			ctx["lastRule"] = false
		}

		currentLastRule := false
		if lr, ok := ctx["lastRule"].(bool); ok {
			currentLastRule = lr
		}

		if rulesetLike, ok := rule.(interface{ IsRulesetLike() bool }); ok && rulesetLike.IsRulesetLike() {
			ctx["lastRule"] = false
		}

		// Generate CSS for the rule
		if gen, ok := rule.(interface{ GenCSS(any, *CSSOutput) }); ok {
			gen.GenCSS(ctx, output)
		} else if val, ok := rule.(interface{ GetValue() any }); ok {
			output.Add(fmt.Sprintf("%v", val.GetValue()), nil, nil)
		}

		ctx["lastRule"] = currentLastRule

		// Add newline after rule if it's not the last rule
		if !currentLastRule {
			if vis, ok := rule.(interface{ IsVisible() bool }); ok && vis.IsVisible() {
				if compress {
					// Don't add anything for compressed mode
				} else {
					output.Add("\n"+tabRuleStr, nil, nil)
				}
			}
		} else {
			ctx["lastRule"] = false
		}
	}
	}

	// Save the lastRule flag set by parent before processing rules
	// This determines if we should add a newline after this ruleset's closing brace
	parentLastRule := false
	if lr, ok := ctx["lastRule"].(bool); ok {
		parentLastRule = lr
	}

	// Decrement tab level FIRST for correct newline logic
	// Do this for all non-root rulesets, even if we skip output (for extend-only rulesets)
	if !r.Root {
		tabLevel--
		ctx["tabLevel"] = tabLevel
	}

	// Add closing brace (skip if this ruleset contains only extends)
	if !r.Root && !isMediaEmpty && !hasOnlyExtends {
		if compress {
			output.Add("}", nil, nil)
		} else {
			output.Add("\n"+tabSetStr+"}", nil, nil)
		}

		// Add newline after ruleset to separate from next ruleset
		// Only add if we're not the last rule and not inside an at-rule container
		// At-rule containers (Media, etc.) handle their own spacing via OutputRuleset
		if !compress && !parentLastRule && tabLevel == 0 {
			// We're a top-level ruleset (tabLevel was 1, now 0 after decrement)
			// Add newline to separate from next top-level ruleset
			output.Add("\n", nil, nil)
		}
	}
	
	// Add final newline for first root
	if !output.IsEmpty() && !compress && r.FirstRoot {
		output.Add("\n", nil, nil)
	}
}

// JoinSelectors joins multiple selectors with the current context
func (r *Ruleset) JoinSelectors(paths *[][]any, context [][]any, selectors []any) {
	for _, selector := range selectors {
		r.JoinSelector(paths, context, selector)
	}
}

// JoinSelector joins a single selector with the current context
// This is a complex method that implements the JavaScript selector joining logic
func (r *Ruleset) JoinSelector(paths *[][]any, context [][]any, selector any) {
	sel, ok := selector.(*Selector)
	if !ok {
		return
	}

	// createParenthesis helper function
	createParenthesis := func(elementsToPak []*Element, originalElement *Element) (*Paren, error) {
		if len(elementsToPak) == 0 {
			return NewParen(originalElement), nil
		} else {
			insideParent := make([]*Element, len(elementsToPak))
			for j := 0; j < len(elementsToPak); j++ {
				insideParent[j] = NewElement(
					nil,
					elementsToPak[j],
					originalElement.IsVariable,
					originalElement.GetIndex(),
					originalElement.FileInfo(),
					nil,
				)
			}
			newSel, err := NewSelector(insideParent, nil, nil, 0, make(map[string]any), nil)
			if err != nil {
				return nil, err
			}
			return NewParen(newSel), nil
		}
	}

	// createSelector helper function
	createSelector := func(containedElement any, originalElement *Element) (*Selector, error) {
		element := NewElement(nil, containedElement, originalElement.IsVariable, originalElement.GetIndex(), originalElement.FileInfo(), nil)
		return NewSelector([]*Element{element}, nil, nil, 0, make(map[string]any), nil)
	}

	// addReplacementIntoPath helper function
	addReplacementIntoPath := func(beginningPath []any, addPath []any, replacedElement *Element, originalSelector *Selector) []any {
		var newSelectorPath []any
		var newJoinedSelector *Selector

		// Construct the joined selector - if & is the first thing this will be empty,
		// if not newJoinedSelector will be the last set of elements in the selector
		if len(beginningPath) > 0 {
			newSelectorPath = make([]any, len(beginningPath))
			copy(newSelectorPath, beginningPath)
			if lastSel, ok := newSelectorPath[len(newSelectorPath)-1].(*Selector); ok {
				newSelectorPath = newSelectorPath[:len(newSelectorPath)-1]
				newJoinedSelector, _ = originalSelector.CreateDerived(lastSel.Elements[:], nil, nil)
			}
		} else {
			newJoinedSelector, _ = originalSelector.CreateDerived([]*Element{}, nil, nil)
		}

		if len(addPath) > 0 {
			// /deep/ is a CSS4 selector - (removed, so should deprecate)
			// that is valid without anything in front of it
			// so if the & does not have a combinator that is "" or " " then
			// and there is a combinator on the parent, then grab that.
			combinator := replacedElement.Combinator

			if firstPathSel, ok := addPath[0].(*Selector); ok && len(firstPathSel.Elements) > 0 {
				parentEl := firstPathSel.Elements[0]
				if combinator.EmptyOrWhitespace && !parentEl.Combinator.EmptyOrWhitespace {
					combinator = parentEl.Combinator
				}
				// Join the elements so far with the first part of the parent
				newJoinedSelector.Elements = append(newJoinedSelector.Elements, NewElement(
					combinator,
					parentEl.Value,
					replacedElement.IsVariable,
					replacedElement.GetIndex(),
					replacedElement.FileInfo(),
					nil,
				))
				newJoinedSelector.Elements = append(newJoinedSelector.Elements, firstPathSel.Elements[1:]...)
			}
		}

		// Now add the joined selector - but only if it is not empty
		if len(newJoinedSelector.Elements) != 0 {
			newSelectorPath = append(newSelectorPath, newJoinedSelector)
		}

		// Put together the parent selectors after the join (e.g. the rest of the parent)
		if len(addPath) > 1 {
			restOfPath := addPath[1:]
			for _, pathItem := range restOfPath {
				if pathSel, ok := pathItem.(*Selector); ok {
					newDerived, _ := pathSel.CreateDerived(pathSel.Elements, []any{}, nil)
					newSelectorPath = append(newSelectorPath, newDerived)
				} else {
					newSelectorPath = append(newSelectorPath, pathItem)
				}
			}
		}
		return newSelectorPath
	}

	// addAllReplacementsIntoPath helper function  
	addAllReplacementsIntoPath := func(beginningPaths [][]any, addPaths []any, replacedElement *Element, originalSelector *Selector, result *[][]any) {
		for j := 0; j < len(beginningPaths); j++ {
			newSelectorPath := addReplacementIntoPath(beginningPaths[j], addPaths, replacedElement, originalSelector)
			*result = append(*result, newSelectorPath)
		}
	}

	// mergeElementsOnToSelectors helper function
	mergeElementsOnToSelectors := func(elements []*Element, selectors *[][]any) {
		if len(elements) == 0 {
			return
		}
		if len(*selectors) == 0 {
			newSel, _ := NewSelector(elements, nil, nil, 0, make(map[string]any), nil)
			*selectors = append(*selectors, []any{newSel})
			return
		}

		for idx, sel := range *selectors {
			// If the previous thing in sel is a parent this needs to join on to it
			if len(sel) > 0 {
				if lastSel, ok := sel[len(sel)-1].(*Selector); ok {
					newElements := append(lastSel.Elements, elements...)
					newDerived, _ := lastSel.CreateDerived(newElements, nil, nil)
					(*selectors)[idx][len(sel)-1] = newDerived
				}
			} else {
				newSel, _ := NewSelector(elements, nil, nil, 0, make(map[string]any), nil)
				(*selectors)[idx] = append((*selectors)[idx], newSel)
			}
		}
	}

	// Helper function to find nested selector
	findNestedSelector := func(element *Element) *Selector {
		if paren, ok := element.Value.(*Paren); ok {
			if nestedSel, ok := paren.Value.(*Selector); ok {
				return nestedSel
			}
		}
		return nil
	}

	// replaceParentSelector helper function
	var replaceParentSelector func(*[][]any, [][]any, *Selector) bool
	replaceParentSelector = func(paths *[][]any, context [][]any, inSelector *Selector) bool {
		hadParentSelector := false
		currentElements := []*Element{}
		newSelectors := [][]any{{}}

		for _, el := range inSelector.Elements {
			// Non parent reference elements just get added
			if valueStr, ok := el.Value.(string); !ok || valueStr != "&" {
				nestedSelector := findNestedSelector(el)
				if nestedSelector != nil {
					// Merge the current list of non parent selector elements
					// on to the current list of selectors to add
					mergeElementsOnToSelectors(currentElements, &newSelectors)

					nestedPaths := [][]any{}
					replacedNewSelectors := [][]any{}
					replaced := replaceParentSelector(&nestedPaths, context, nestedSelector)
					hadParentSelector = hadParentSelector || replaced
					
					// The nestedPaths array should have only one member - replaceParentSelector does not multiply selectors
					for k := 0; k < len(nestedPaths); k++ {
						if paren, err := createParenthesis([]*Element{}, el); err == nil {
							if replacementSelector, err := createSelector(paren, el); err == nil {
								addAllReplacementsIntoPath(newSelectors, []any{replacementSelector}, el, inSelector, &replacedNewSelectors)
							}
						}
					}
					newSelectors = replacedNewSelectors
					currentElements = []*Element{}
				} else {
					currentElements = append(currentElements, el)
				}
			} else {
				hadParentSelector = true
				// The new list of selectors to add
				selectorsMultiplied := [][]any{}

				// Merge the current list of non parent selector elements
				// on to the current list of selectors to add
				mergeElementsOnToSelectors(currentElements, &newSelectors)

				// Loop through our current selectors
				for j := 0; j < len(newSelectors); j++ {
					sel := newSelectors[j]
					// If we don't have any parent paths, the & might be in a mixin so that it can be used
					// whether there are parents or not
					if len(context) == 0 {
						// The combinator used on el should now be applied to the next element instead so that
						// it is not lost
						if len(sel) > 0 {
							if firstSel, ok := sel[0].(*Selector); ok {
								newElement := NewElement(el.Combinator, "", el.IsVariable, el.GetIndex(), el.FileInfo(), nil)
								firstSel.Elements = append(firstSel.Elements, newElement)
							}
						}
						selectorsMultiplied = append(selectorsMultiplied, sel)
					} else {
						// And the parent selectors
						for k := 0; k < len(context); k++ {
							// We need to put the current selectors
							// then join the last selector's elements on to the parents selectors
							newSelectorPath := addReplacementIntoPath(sel, context[k], el, inSelector)
							// Add that to our new set of selectors
							selectorsMultiplied = append(selectorsMultiplied, newSelectorPath)
						}
					}
				}

				// Our new selectors has been multiplied, so reset the state
				newSelectors = selectorsMultiplied
				currentElements = []*Element{}
			}
		}

		// If we have any elements left over (e.g. .a& .b == .b)
		// add them on to all the current selectors
		mergeElementsOnToSelectors(currentElements, &newSelectors)

		for idx := 0; idx < len(newSelectors); idx++ {
			length := len(newSelectors[idx])
			if length > 0 {
				*paths = append(*paths, newSelectors[idx])
				if lastSelector, ok := newSelectors[idx][length-1].(*Selector); ok {
					newDerived, _ := lastSelector.CreateDerived(lastSelector.Elements, inSelector.ExtendList, nil)
					newSelectors[idx][length-1] = newDerived
				}
			}
		}

		return hadParentSelector
	}

	// deriveSelector helper function
	deriveSelector := func(visibilityInfo map[string]any, deriveFrom *Selector) *Selector {
		newSelector, _ := deriveFrom.CreateDerived(deriveFrom.Elements, deriveFrom.ExtendList, &deriveFrom.EvaldCondition)
		newSelector.CopyVisibilityInfo(visibilityInfo)
		return newSelector
	}

	// Main joinSelector logic
	newPaths := [][]any{}
	hadParentSelector := replaceParentSelector(&newPaths, context, sel)

	if !hadParentSelector {
		if len(context) > 0 {
			newPaths = [][]any{}
			for idx := 0; idx < len(context); idx++ {
				concatenated := make([]any, len(context[idx])+1)
				
				// Map over context[idx] using deriveSelector  
				for j, ctxSel := range context[idx] {
					if ctxSelector, ok := ctxSel.(*Selector); ok {
						concatenated[j] = deriveSelector(sel.VisibilityInfo(), ctxSelector)
					} else {
						concatenated[j] = ctxSel
					}
				}
				concatenated[len(context[idx])] = sel
				newPaths = append(newPaths, concatenated)
			}
		} else {
			newPaths = [][]any{{sel}}
		}
	}

	for idx := 0; idx < len(newPaths); idx++ {
		*paths = append(*paths, newPaths[idx])
	}
}

// GetDebugInfo returns debug information for the ruleset
func GetDebugInfo(context map[string]any, ruleset *Ruleset, separator string) string {
	if context == nil || ruleset == nil {
		return ""
	}
	
	// Check if dumpLineNumbers is enabled and not compressing
	dumpLineNumbers, hasDump := context["dumpLineNumbers"]
	compress, hasCompress := context["compress"]
	
	if !hasDump || (hasCompress && compress.(bool)) {
		return ""
	}
	
	// Create debug context from ruleset
	debugCtx := createDebugContextFromRuleset(context, ruleset)
	if debugCtx == nil {
		return ""
	}
	
	// Get line number and filename from debug context
	lineNumber := 0
	fileName := ""
	
	if ln, ok := debugCtx["lineNumber"].(int); ok {
		lineNumber = ln
	}
	if fn, ok := debugCtx["fileName"].(string); ok {
		fileName = fn
	}
	
	if lineNumber == 0 || fileName == "" {
		return ""
	}
	
	var result string
	switch dumpLineNumbers {
	case "comments":
		result = asComment(lineNumber, fileName)
	case "mediaquery":
		result = asMediaQuery(lineNumber, fileName)
	case "all":
		result = asComment(lineNumber, fileName)
		if separator != "" {
			result += separator
		}
		result += asMediaQuery(lineNumber, fileName)
	}
	
	return result
}

// asComment formats debug info as a CSS comment
func asComment(lineNumber int, fileName string) string {
	return fmt.Sprintf("/* line %d, %s */", lineNumber, fileName)
}

// asMediaQuery formats debug info as a media query
func asMediaQuery(lineNumber int, fileName string) string {
	return fmt.Sprintf("@media -sass-debug-info{filename{font-family:file\\:\\/\\/%s}line{font-family:\\00003%d}}", 
		strings.ReplaceAll(fileName, "/", "\\/"), lineNumber)
}

// Helper function to create debug context from ruleset
func createDebugContextFromRuleset(context map[string]any, ruleset *Ruleset) map[string]any {
	fileInfo := ruleset.FileInfo()
	if fileInfo == nil {
		return nil
	}
	
	var filename string
	var lineNumber int
	
	if fn, ok := fileInfo["filename"]; ok {
		if fnStr, ok := fn.(string); ok {
			filename = fnStr
		}
	}
	
	if ln, ok := fileInfo["lineNumber"]; ok {
		if lnInt, ok := ln.(int); ok {
			lineNumber = lnInt
		}
	}
	if lineNumber == 0 {
		lineNumber = 1 // Default line number
	}
	
	return map[string]any{
		"fileName":   filename,
		"lineNumber": lineNumber,
	}
}

// Helper methods for array manipulation and rule checking

// removeRuleAtIndex removes a rule at the specified index
func (r *Ruleset) removeRuleAtIndex(rules []any, index int) []any {
	newRules := make([]any, len(rules)-1)
	copy(newRules, rules[:index])
	copy(newRules[index:], rules[index+1:])
	return newRules
}

// insertRuleAtIndex inserts a rule at the specified index
func (r *Ruleset) insertRuleAtIndex(rules []any, index int, rule any) []any {
	newRules := make([]any, len(rules)+1)
	copy(newRules, rules[:index])
	newRules[index] = rule
	copy(newRules[index+1:], rules[index:])
	return newRules
}

// shouldIncludeSubRule determines if a subrule should be included (matches JavaScript logic)
func (r *Ruleset) shouldIncludeSubRule(subRule any, parentRuleset *Ruleset) bool {
	// Copy visibility info like JavaScript version
	if subNode, ok := subRule.(interface{ CopyVisibilityInfo(map[string]any) }); ok {
		subNode.CopyVisibilityInfo(parentRuleset.VisibilityInfo())
	}
	
	// Check if it's a variable declaration (like JavaScript: !(subRule instanceof Declaration) || !subRule.variable)
	if r.isVariableDeclaration(subRule) {
		return false // Don't include variable declarations
	}
	
	return true // Include everything else
}

// isVariableDeclaration checks if a rule is a variable declaration
func (r *Ruleset) isVariableDeclaration(rule any) bool {
	// Handle real Declaration types
	if decl, ok := rule.(*Declaration); ok {
		return decl.variable
	}
	
	// Handle mock declarations using reflection (for tests)
	if node, ok := rule.(interface{ GetType() string }); ok && node.GetType() == "Declaration" {
		if v := reflect.ValueOf(rule); v.Kind() == reflect.Ptr && !v.IsNil() {
			if elem := v.Elem(); elem.Kind() == reflect.Struct {
				if field := elem.FieldByName("variable"); field.IsValid() && field.Kind() == reflect.Bool {
					return field.Bool()
				}
			}
		}
	}
	
	return false
}

// flattenArray flattens a nested array structure (equivalent to utils.flattenArray in JavaScript)
func flattenArray(arr []any) []any {
	var result []any
	for _, item := range arr {
		if slice, ok := item.([]any); ok {
			result = append(result, flattenArray(slice)...)
		} else {
			result = append(result, item)
		}
	}
	return result
}

// SetAllExtends sets the AllExtends field (used by ExtendFinderVisitor)
func (r *Ruleset) SetAllExtends(extends []*Extend) {
	r.AllExtends = extends
}

// GetAllExtends returns the AllExtends field (used by ProcessExtendsVisitor)
func (r *Ruleset) GetAllExtends() []*Extend {
	return r.AllExtends
} 