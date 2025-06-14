package go_parser

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

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
	FirstRoot       bool
	AllowImports    bool
	Paths           [][]any
	FunctionRegistry any // Changed from *functions.Registry to avoid import cycle
	// Debug info
	DebugInfo any
	// Multi-media flag for nested media queries
	MultiMedia bool
}

// NewRuleset creates a new Ruleset instance
func NewRuleset(selectors []any, rules []any, strictImports bool, visibilityInfo map[string]any) *Ruleset {
	r := &Ruleset{
		Node:          NewNode(),
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

	return r
}

// GetType returns the type of the node
func (r *Ruleset) GetType() string {
	return "Ruleset"
}

// IsRuleset returns true (this is a ruleset)
func (r *Ruleset) IsRuleset() bool {
	return true
}

// IsRulesetLike returns true (this is ruleset-like)
func (r *Ruleset) IsRulesetLike() bool {
	return true
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
			r.Rules = v.VisitArray(r.Rules, false)
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
func (r *Ruleset) Eval(context any) (*Ruleset, error) {
	if context == nil {
		return nil, fmt.Errorf("context is required for Ruleset.Eval")
	}

	ctx, ok := context.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("context must be a map")
	}

	var selectors []any
	var selCnt int
	var hasVariable bool
	var hasOnePassingSelector bool

	if len(r.Selectors) > 0 {
		selCnt = len(r.Selectors)
		selectors = make([]any, selCnt)
		
		// Evaluate selectors
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

		// Handle variables in selectors - this would normally use Parser
		if hasVariable {
			// In JavaScript version, this parses selectors containing variables
			// For now, we'll just use the selectors as-is since Parser is stubbed
			// TODO: Implement proper selector parsing when Parser is available
		}
	} else {
		hasOnePassingSelector = true
	}

	// Copy rules
	var rules []any
	if r.Rules != nil {
		rules = less.CopyArray(r.Rules)
	}

	// Create new ruleset
	ruleset := NewRuleset(selectors, rules, r.StrictImports, r.VisibilityInfo())
	ruleset.OriginalRuleset = r
	ruleset.Root = r.Root
	ruleset.FirstRoot = r.FirstRoot
	ruleset.AllowImports = r.AllowImports

	if r.DebugInfo != nil {
		ruleset.DebugInfo = r.DebugInfo
	}

	if !hasOnePassingSelector {
		if rules != nil {
			ruleset.Rules = rules[:0] // Clear the rules slice in the ruleset
		}
	}

	// Inherit function registry from frames or use global
	if frames, ok := ctx["frames"].([]any); ok {
		for _, frame := range frames {
			if f, ok := frame.(*Ruleset); ok {
				if f.FunctionRegistry != nil {
					ruleset.FunctionRegistry = f.FunctionRegistry
					break
				}
			}
		}
	}
	if ruleset.FunctionRegistry == nil {
		// Would normally inherit from globalFunctionRegistry
		ruleset.FunctionRegistry = nil
	}

	// Push current ruleset to frames stack
	if frames, ok := ctx["frames"].([]any); ok {
		newFrames := make([]any, len(frames)+1)
		newFrames[0] = ruleset
		copy(newFrames[1:], frames)
		ctx["frames"] = newFrames
	} else {
		ctx["frames"] = []any{ruleset}
	}

	// Current selectors
	if selectors := ctx["selectors"]; selectors == nil {
		ctx["selectors"] = []any{r.Selectors}
	} else if sels, ok := selectors.([]any); ok {
		newSelectors := make([]any, len(sels)+1)
		newSelectors[0] = r.Selectors
		copy(newSelectors[1:], sels)
		ctx["selectors"] = newSelectors
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
			if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok {
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

	// Evaluate mixin calls and variable calls
	if rsRules != nil {
		i := 0
		for i < len(rsRules) {
			rule := rsRules[i]
			if r, ok := rule.(interface{ GetType() string }); ok {
				switch r.GetType() {
				case "MixinCall":
					// Capture existing variables before processing mixin to prevent pollution
					existingVars := ruleset.Variables()
					
					if eval, ok := rule.(interface{ Eval(any) ([]any, error) }); ok {
						rules, err := eval.Eval(context)
						if err != nil {
							return nil, err
						}
						// Filter results to avoid polluting scope like JavaScript version
						filtered := make([]any, 0)
						for _, r := range rules {
							shouldInclude := true
							
							// Check if this is a variable declaration that already exists
							if decl, ok := r.(*Declaration); ok && decl.variable {
								if nameStr, ok := decl.name.(string); ok {
									// Check if variable already exists in the existing variables
									if _, exists := existingVars[nameStr]; exists {
										shouldInclude = false // Filter out existing variables
									}
								}
							} else {
								// Check for other variable-like types using duck typing
								// Look for types that have both 'variable' and 'name' fields
								if v := reflect.ValueOf(r); v.Kind() == reflect.Ptr && !v.IsNil() {
									if elem := v.Elem(); elem.Kind() == reflect.Struct {
										varField := elem.FieldByName("variable")
										nameField := elem.FieldByName("name")
										
										if varField.IsValid() && varField.Kind() == reflect.Bool && 
										   nameField.IsValid() && varField.Bool() {
											// This looks like a variable declaration
											var variableName string
											if nameField.CanInterface() {
												if nameStr, ok := nameField.Interface().(string); ok {
													variableName = nameStr
												}
											} else {
												// Try to get the value even if unexported
												if nameField.Kind() == reflect.String {
													variableName = nameField.String()
												}
											}
											
											if variableName != "" {
												// Check if variable already exists
												if _, exists := existingVars[variableName]; exists {
													shouldInclude = false // Filter out existing variables
												}
											}
										}
									}
								}
							}
							
							if shouldInclude {
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
					if eval, ok := rule.(interface{ Eval(any) (map[string]any, error) }); ok {
						evaluated, err := eval.Eval(context)
						if err != nil {
							return nil, err
						}
						if evalRules, ok := evaluated["rules"].([]any); ok {
							// Filter to exclude variable declarations to avoid scope pollution like JavaScript
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
		if eval, ok := rule.(interface{ Eval(any) (any, error) }); ok {
			evaluated, err := eval.Eval(context)
			if err != nil {
				return nil, err
			}
			rsRules[i] = evaluated
		}
	}

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
	if frames, ok := ctx["frames"].([]any); ok && len(frames) > 0 {
		ctx["frames"] = frames[1:]
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
func (r *Ruleset) MakeImportant() *Ruleset {
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
			if nameSlice, ok := decl.name.([]any); ok && len(nameSlice) == 1 {
				if kw, ok := nameSlice[0].(*Keyword); ok {
					name = kw.value
				} else {
					name = fmt.Sprintf("%v", nameSlice[0])
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
func (r *Ruleset) Variable(name string) any {
	vars := r.Variables()
	if decl, exists := vars[name]; exists {
		return r.ParseValue(decl)
	}
	return nil
}

// Property returns a specific property by name
func (r *Ruleset) Property(name string) any {
	props := r.Properties()
	if decl, exists := props[name]; exists {
		return r.ParseValue(decl)
	}
	return nil
}

// HasVariable checks if a variable exists
func (r *Ruleset) HasVariable(name string) bool {
	vars := r.Variables()
	_, exists := vars[name]
	return exists
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
		if d.value != nil && len(d.value.value) > 0 {
			if anon, ok := d.value.value[0].(*Anonymous); ok && anon != nil {
				// Check if needs parsing - this would normally use Parser
				if str, ok := anon.Value.(string); ok && str != "" {
					// JavaScript version would parse using:
					// new Parser(this.parse.context, this.parse.importManager, decl.fileInfo(), decl.value.getIndex())
					// TODO: Parse the value using Parser when available
					// For now, just mark as processed to match JavaScript behavior
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
		
		if rs, ok := rule.(*Ruleset); ok && rs.Selectors != nil {
			for j := 0; j < len(rs.Selectors); j++ {
				if sel, ok := selector.(*Selector); ok {
					if ruleSelector, ok := rs.Selectors[j].(*Selector); ok {
						match = sel.Match(ruleSelector)
						if match > 0 {
							if len(sel.Elements) > match {
								if filter == nil || filter(rule) {
									// Create new selector with remaining elements like JavaScript
									remainingElements := make([]*Element, len(sel.Elements)-match)
									copy(remainingElements, sel.Elements[match:])
									newSelector, err := NewSelector(remainingElements, nil, nil, sel.GetIndex(), sel.FileInfo(), nil)
									if err == nil {
										foundMixins = rs.Find(newSelector, self, filter)
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
						match = selectorWithMatch.Match(rs.Selectors[j])
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
		tabRuleStr = strings.Repeat("  ", tabLevel+1)
		tabSetStr = strings.Repeat("  ", tabLevel)
	}
	
	// Organize rules by type like JavaScript version
	var charsetRuleNodes []any
	var ruleNodes []any
	
	var charsetNodeIndex int = 0
	var importNodeIndex int = 0
	
	if r.Rules != nil {
		for i, rule := range r.Rules {
			if _, ok := rule.(*Comment); ok {
				if importNodeIndex == i {
					importNodeIndex++
				}
				ruleNodes = append(ruleNodes, rule)
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
	
	// Generate CSS for selectors if not root
	if !r.Root {
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
		}
		
		// Add opening brace
		if compress {
			output.Add("{", nil, nil)
		} else {
			output.Add(" {\n", nil, nil)
		}
		output.Add(tabRuleStr, nil, nil)
	}
	
	// Generate CSS for rules
	for i, rule := range ruleNodes {
		if i+1 == len(ruleNodes) {
			ctx["lastRule"] = true
		}
		
		currentLastRule := false
		if lr, ok := ctx["lastRule"].(bool); ok {
			currentLastRule = lr
		}
		
		if rulesetLike, ok := rule.(interface{ IsRulesetLike() bool }); ok && rulesetLike.IsRulesetLike() {
			ctx["lastRule"] = false
		}
		
		if gen, ok := rule.(interface{ GenCSS(any, *CSSOutput) }); ok {
			gen.GenCSS(ctx, output)
		} else if val, ok := rule.(interface{ GetValue() any }); ok {
			output.Add(fmt.Sprintf("%v", val.GetValue()), nil, nil)
		}
		
		ctx["lastRule"] = currentLastRule
		
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
	
	// Add closing brace
	if !r.Root {
		if compress {
			output.Add("}", nil, nil)
		} else {
			output.Add("\n"+tabSetStr+"}", nil, nil)
		}
		tabLevel--
		ctx["tabLevel"] = tabLevel
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
	// Stub implementation - would normally generate debug info
	return ""
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