package less_go

import (
)

// CSSVisitorUtils provides utility functions for CSS visitor
type CSSVisitorUtils struct {
	visitor *Visitor
	context any
}

// NewCSSVisitorUtils creates a new CSSVisitorUtils instance
func NewCSSVisitorUtils(context any) *CSSVisitorUtils {
	utils := &CSSVisitorUtils{
		context: context,
	}
	utils.visitor = NewVisitor(utils)
	return utils
}

// ContainsSilentNonBlockedChild checks if body rules contain silent non-blocked children
func (u *CSSVisitorUtils) ContainsSilentNonBlockedChild(bodyRules []any) bool {
	if bodyRules == nil {
		return false
	}
	
	for _, rule := range bodyRules {
		if silentRule, hasSilent := rule.(interface{ IsSilent(any) bool }); hasSilent {
			if blockedRule, hasBlocked := rule.(interface{ BlocksVisibility() bool }); hasBlocked {
				if silentRule.IsSilent(u.context) && !blockedRule.BlocksVisibility() {
					// the atrule contains something that was referenced (likely by extend)
					// therefore it needs to be shown in output too
					return true
				}
			}
		}
	}
	return false
}

// KeepOnlyVisibleChilds filters out invisible children from owner
func (u *CSSVisitorUtils) KeepOnlyVisibleChilds(owner any) {
	if owner == nil {
		return
	}
	
	// Try to access rules field
	if ownerWithRules, ok := owner.(interface{ GetRules() []any; SetRules([]any) }); ok {
		rules := ownerWithRules.GetRules()
		if rules != nil {
			var visibleRules []any
			for _, rule := range rules {
				if visibleRule, hasVisible := rule.(interface{ IsVisible() bool }); hasVisible {
					if visibleRule.IsVisible() {
						visibleRules = append(visibleRules, rule)
					}
				} else {
					// If rule doesn't have IsVisible method, keep it
					visibleRules = append(visibleRules, rule)
				}
			}
			ownerWithRules.SetRules(visibleRules)
		}
	}
}

// IsEmpty checks if owner is empty
func (u *CSSVisitorUtils) IsEmpty(owner any) bool {
	if owner == nil {
		return true
	}
	
	if ownerWithRules, ok := owner.(interface{ GetRules() []any }); ok {
		rules := ownerWithRules.GetRules()
		return rules == nil || len(rules) == 0
	}
	
	return true
}

// HasVisibleSelector checks if ruleset node has visible selectors
func (u *CSSVisitorUtils) HasVisibleSelector(rulesetNode any) bool {
	if rulesetNode == nil {
		return false
	}
	
	if nodeWithPaths, ok := rulesetNode.(interface{ GetPaths() []any }); ok {
		paths := nodeWithPaths.GetPaths()
		return paths != nil && len(paths) > 0
	}
	
	return false
}

// ResolveVisibility resolves visibility for a node
func (u *CSSVisitorUtils) ResolveVisibility(node any) any {
	if node == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := node.(interface{ BlocksVisibility() bool }); hasBlocked {
		if !blockedNode.BlocksVisibility() {
			if u.IsEmpty(node) {
				return nil
			}
			return node
		}
	} else {
		// If node doesn't have BlocksVisibility method, treat as not blocked
		if u.IsEmpty(node) {
			return nil
		}
		return node
	}
	
	// Node blocks visibility, process it
	if nodeWithRules, ok := node.(interface{ GetRules() []any }); ok {
		rules := nodeWithRules.GetRules()
		if len(rules) > 0 {
			compiledRulesBody := rules[0]
			u.KeepOnlyVisibleChilds(compiledRulesBody)
			
			if u.IsEmpty(compiledRulesBody) {
				return nil
			}
			
			if ensureVisNode, hasEnsure := node.(interface{ EnsureVisibility() }); hasEnsure {
				ensureVisNode.EnsureVisibility()
			}
			
			if removeVisNode, hasRemove := node.(interface{ RemoveVisibilityBlock() }); hasRemove {
				removeVisNode.RemoveVisibilityBlock()
			}
			
			return node
		}
	}
	
	return nil
}

// IsVisibleRuleset checks if a ruleset is visible
func (u *CSSVisitorUtils) IsVisibleRuleset(rulesetNode any) bool {
	if rulesetNode == nil {
		return false
	}
	
	if firstRootNode, ok := rulesetNode.(interface{ GetFirstRoot() bool }); ok {
		if firstRootNode.GetFirstRoot() {
			return true
		}
	}
	
	if u.IsEmpty(rulesetNode) {
		return false
	}
	
	if rootNode, ok := rulesetNode.(interface{ GetRoot() bool }); ok {
		if !rootNode.GetRoot() && !u.HasVisibleSelector(rulesetNode) {
			return false
		}
	}
	
	return true
}

// ToCSSVisitor implements CSS output visitor
type ToCSSVisitor struct {
	visitor    *Visitor
	context    any
	utils      *CSSVisitorUtils
	charset    bool
	IsReplacing bool
}

// NewToCSSVisitor creates a new ToCSSVisitor
func NewToCSSVisitor(context any) *ToCSSVisitor {
	v := &ToCSSVisitor{
		context:     context,
		utils:       NewCSSVisitorUtils(context),
		charset:     false,
		IsReplacing: true,
	}
	v.visitor = NewVisitor(v)
	return v
}

// Run runs the visitor on the root node
func (v *ToCSSVisitor) Run(root any) any {
	return v.visitor.Visit(root)
}

// isRulesetAtRoot checks if a ruleset is at the root level (has no parent selectors)
func (v *ToCSSVisitor) isRulesetAtRoot(rulesetNode any) bool {
	// For now, we'll check if it's the first level ruleset
	// This is a simplified check - in a full implementation we'd track the context
	return true
}

// containsOnlyProperties checks if rules contain only properties (no nested rulesets)
func (v *ToCSSVisitor) containsOnlyProperties(rules []any) bool {
	if len(rules) == 0 {
		return false
	}
	
	for _, rule := range rules {
		if ruleNode, ok := rule.(interface{ GetType() string }); ok {
			nodeType := ruleNode.GetType()
			// If we find anything that's not a Declaration, it's not "only properties"
			if nodeType != "Declaration" && nodeType != "Comment" {
				return false
			}
		}
	}
	
	// Check that we have at least one non-variable declaration
	for _, rule := range rules {
		if declNode, ok := rule.(interface{ GetType() string; GetVariable() bool }); ok {
			if declNode.GetType() == "Declaration" && !declNode.GetVariable() {
				return true
			}
		}
	}
	
	return false
}

// VisitDeclaration visits a declaration node
func (v *ToCSSVisitor) VisitDeclaration(declNode any, visitArgs *VisitArgs) any {
	if declNode == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := declNode.(interface{ BlocksVisibility() bool }); hasBlocked {
		if blockedNode.BlocksVisibility() {
			return nil
		}
	}
	
	if varNode, hasVar := declNode.(interface{ GetVariable() bool }); hasVar {
		if varNode.GetVariable() {
			return nil
		}
	}
	
	return declNode
}

// VisitMixinDefinition visits a mixin definition node
func (v *ToCSSVisitor) VisitMixinDefinition(mixinNode any, visitArgs *VisitArgs) any {
	// mixin definitions do not get eval'd - this means they keep state
	// so we have to clear that state here so it isn't used if toCSS is called twice
	if framesNode, hasFrames := mixinNode.(interface{ SetFrames([]any) }); hasFrames {
		framesNode.SetFrames([]any{})
	}
	return nil
}

// VisitExtend visits an extend node
func (v *ToCSSVisitor) VisitExtend(extendNode any, visitArgs *VisitArgs) any {
	return nil
}

// VisitComment visits a comment node
func (v *ToCSSVisitor) VisitComment(commentNode any, visitArgs *VisitArgs) any {
	if commentNode == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := commentNode.(interface{ BlocksVisibility() bool }); hasBlocked {
		if blockedNode.BlocksVisibility() {
			return nil
		}
	}
	
	if silentNode, hasSilent := commentNode.(interface{ IsSilent(any) bool }); hasSilent {
		if silentNode.IsSilent(v.context) {
			return nil
		}
	}
	
	return commentNode
}

// VisitMedia visits a media node
func (v *ToCSSVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) any {
	if mediaNode == nil {
		return nil
	}
	
	if acceptor, ok := mediaNode.(interface{ Accept(any) }); ok {
		acceptor.Accept(v.visitor)
	}
	visitArgs.VisitDeeper = false
	
	return v.utils.ResolveVisibility(mediaNode)
}

// VisitImport visits an import node
func (v *ToCSSVisitor) VisitImport(importNode any, visitArgs *VisitArgs) any {
	if importNode == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := importNode.(interface{ BlocksVisibility() bool }); hasBlocked {
		if blockedNode.BlocksVisibility() {
			return nil
		}
	}
	
	return importNode
}

// VisitAtRule visits an at-rule node
func (v *ToCSSVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) any {
	if atRuleNode == nil {
		return nil
	}
	
	if nodeWithRules, ok := atRuleNode.(interface{ GetRules() []any }); ok {
		rules := nodeWithRules.GetRules()
		if rules != nil && len(rules) > 0 {
			return v.VisitAtRuleWithBody(atRuleNode, visitArgs)
		}
	}
	
	return v.VisitAtRuleWithoutBody(atRuleNode, visitArgs)
}

// VisitAnonymous visits an anonymous node
func (v *ToCSSVisitor) VisitAnonymous(anonymousNode any, visitArgs *VisitArgs) any {
	if anonymousNode == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := anonymousNode.(interface{ BlocksVisibility() bool }); hasBlocked {
		if !blockedNode.BlocksVisibility() {
			if acceptor, ok := anonymousNode.(interface{ Accept(any) }); ok {
				acceptor.Accept(v.visitor)
			}
			return anonymousNode
		}
	} else {
		// If node doesn't have BlocksVisibility method, treat as not blocked
		if acceptor, ok := anonymousNode.(interface{ Accept(any) }); ok {
			acceptor.Accept(v.visitor)
		}
		return anonymousNode
	}
	
	return nil
}

// VisitAtRuleWithBody visits an at-rule with body
func (v *ToCSSVisitor) VisitAtRuleWithBody(atRuleNode any, visitArgs *VisitArgs) any {
	if atRuleNode == nil {
		return nil
	}
	
	
	
	// Process children
	if acceptor, ok := atRuleNode.(interface{ Accept(any) }); ok {
		acceptor.Accept(v.visitor)
	}
	visitArgs.VisitDeeper = false
	
	if !v.utils.IsEmpty(atRuleNode) {
		if nodeWithRules, ok := atRuleNode.(interface{ GetRules() []any }); ok {
			rules := nodeWithRules.GetRules()
			if len(rules) > 0 {
				if firstRule, ok := rules[0].(interface{ GetRules() []any }); ok {
					v.mergeRules(firstRule.GetRules())
				}
			}
		}
	}
	
	return v.utils.ResolveVisibility(atRuleNode)
}

// VisitAtRuleWithoutBody visits an at-rule without body
func (v *ToCSSVisitor) VisitAtRuleWithoutBody(atRuleNode any, visitArgs *VisitArgs) any {
	if atRuleNode == nil {
		return nil
	}
	
	if blockedNode, hasBlocked := atRuleNode.(interface{ BlocksVisibility() bool }); hasBlocked {
		if blockedNode.BlocksVisibility() {
			return nil
		}
	}
	
	if nameNode, hasName := atRuleNode.(interface{ GetName() string }); hasName {
		if nameNode.GetName() == "@charset" {
			// Only output the debug info together with subsequent @charset definitions
			// a comment (or @media statement) before the actual @charset atrule would
			// be considered illegal css as it has to be on the first line
			if v.charset {
				if debugNode, hasDebug := atRuleNode.(interface{ GetDebugInfo() any }); hasDebug {
					if debugNode.GetDebugInfo() != nil {
						if cssNode, hasCSS := atRuleNode.(interface{ ToCSS(any) string }); hasCSS {
							cssStr := cssNode.ToCSS(v.context)
							// Remove newlines for comment
							commentValue := "/* " + cssStr
							for i := 0; i < len(commentValue); i++ {
								if commentValue[i] == '\n' {
									commentValue = commentValue[:i] + commentValue[i+1:]
									i--
								}
							}
							commentValue += " */\n"
							
							comment := NewComment(commentValue, false, 0, nil)
							// Try to get debug info from the node
							// Skip type assertion and just pass the node to DebugInfo function
							return v.visitor.Visit(comment)
						}
					}
				}
				return nil
			}
			v.charset = true
		}
	}
	
	return atRuleNode
}

// CheckValidNodes checks if nodes are valid for their context
func (v *ToCSSVisitor) CheckValidNodes(rules []any, isRoot bool) error {
	if rules == nil {
		return nil
	}
	
	for _, ruleNode := range rules {
		if isRoot {
			// Check for direct declarations
			if declNode, ok := ruleNode.(interface{ GetType() string; GetVariable() bool; GetIndex() int; FileInfo() map[string]any }); ok {
				if declNode.GetType() == "Declaration" && !declNode.GetVariable() {
					var filename string
					if fileInfo := declNode.FileInfo(); fileInfo != nil {
						if fileNameValue, ok := fileInfo["filename"]; ok {
							if fileNameStr, ok := fileNameValue.(string); ok {
								filename = fileNameStr
							}
						}
					}
					return &LessError{
						Message:  "Properties must be inside selector blocks. They cannot be in the root",
						Index:    declNode.GetIndex(),
						Filename: filename,
					}
				}
			}
			
			// Check for rulesets with no selectors at root level - their contents should also be checked
			if rulesetNode, ok := ruleNode.(interface{ GetType() string; GetSelectors() []any; GetRules() []any }); ok {
				if rulesetNode.GetType() == "Ruleset" && (rulesetNode.GetSelectors() == nil || len(rulesetNode.GetSelectors()) == 0) {
					// A ruleset with no selectors at root level - check its rules as if they were at root
					if err := v.CheckValidNodes(rulesetNode.GetRules(), true); err != nil {
						return err
					}
				}
			}
		}
		
		if callNode, ok := ruleNode.(interface{ GetType() string; GetName() string; GetIndex() int; FileInfo() map[string]any }); ok {
			if callNode.GetType() == "Call" {
				var filename string
				if fileInfo := callNode.FileInfo(); fileInfo != nil {
					if fileNameValue, ok := fileInfo["filename"]; ok {
						if fileNameStr, ok := fileNameValue.(string); ok {
							filename = fileNameStr
						}
					}
				}
				return &LessError{
					Message:  "Function '" + callNode.GetName() + "' did not return a root node",
					Index:    callNode.GetIndex(),
					Filename: filename,
				}
			}
		}
		
		if typeNode, ok := ruleNode.(interface{ GetType() string; GetAllowRoot() bool; GetIndex() int; FileInfo() map[string]any }); ok {
			if typeNode.GetType() != "" && !typeNode.GetAllowRoot() {
				var filename string
				if fileInfo := typeNode.FileInfo(); fileInfo != nil {
					if fileNameValue, ok := fileInfo["filename"]; ok {
						if fileNameStr, ok := fileNameValue.(string); ok {
							filename = fileNameStr
						}
					}
				}
				return &LessError{
					Message:  typeNode.GetType() + " node returned by a function is not valid here",
					Index:    typeNode.GetIndex(),
					Filename: filename,
				}
			}
		}
	}
	
	return nil
}

// VisitRuleset visits a ruleset node
func (v *ToCSSVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) any {
	if rulesetNode == nil {
		return nil
	}
	
	var rulesets []any
	
	// Check valid nodes
	if nodeWithRules, ok := rulesetNode.(interface{ GetRules() []any }); ok {
		rules := nodeWithRules.GetRules()
		var isFirstRoot bool
		if firstRootNode, ok := rulesetNode.(interface{ GetFirstRoot() bool }); ok {
			isFirstRoot = firstRootNode.GetFirstRoot()
		}
		
		// Special check: if this is a ruleset with no selectors at the root level,
		// we need to check if it contains only properties (which would be invalid)
		if isFirstRoot || v.isRulesetAtRoot(rulesetNode) {
			if selNode, ok := rulesetNode.(interface{ GetSelectors() []any }); ok {
				selectors := selNode.GetSelectors()
				if len(selectors) == 0 && v.containsOnlyProperties(rules) {
					// This is a selector-less ruleset at root with only properties
					// Find the first property to report its location
					for _, rule := range rules {
						if declNode, ok := rule.(interface{ GetType() string; GetVariable() bool; GetIndex() int; FileInfo() map[string]any }); ok {
							if declNode.GetType() == "Declaration" && !declNode.GetVariable() {
								var filename string
								if fileInfo := declNode.FileInfo(); fileInfo != nil {
									if fileNameValue, ok := fileInfo["filename"]; ok {
										if fileNameStr, ok := fileNameValue.(string); ok {
											filename = fileNameStr
										}
									}
								}
								panic(&LessError{
									Message:  "Properties must be inside selector blocks. They cannot be in the root",
									Index:    declNode.GetIndex(),
									Filename: filename,
								})
							}
						}
					}
				}
			}
		}
		
		if err := v.CheckValidNodes(rules, isFirstRoot); err != nil {
			panic(err) // Matches JS behavior of throwing errors
		}
	}
	
	if rootNode, ok := rulesetNode.(interface{ GetRoot() bool }); ok {
		if !rootNode.GetRoot() {
			// remove invisible paths
			v.compileRulesetPaths(rulesetNode)
			
			// remove rulesets from this ruleset body and compile them separately
			if nodeWithRules, ok := rulesetNode.(interface{ GetRules() []any; SetRules([]any) }); ok {
				nodeRules := nodeWithRules.GetRules()
				
				if nodeRules != nil {
					nodeRuleCnt := len(nodeRules)
					for i := 0; i < nodeRuleCnt; {
						rule := nodeRules[i]
						if ruleWithRules, ok := rule.(interface{ GetRules() []any }); ok {
							if ruleWithRules.GetRules() != nil {
								// visit because we are moving them out from being a child
								rulesets = append(rulesets, v.visitor.Visit(rule))
								// Remove from nodeRules
								nodeRules = append(nodeRules[:i], nodeRules[i+1:]...)
								nodeRuleCnt--
								continue
							}
						}
						i++
					}
					
					// accept the visitor to remove rules and refactor itself
					// then we can decide now whether we want it or not
					// compile body
					if nodeRuleCnt > 0 {
						nodeWithRules.SetRules(nodeRules)
						if acceptor, ok := rulesetNode.(interface{ Accept(any) }); ok {
							acceptor.Accept(v.visitor)
						}
					} else {
						nodeWithRules.SetRules(nil)
					}
				}
			}
			visitArgs.VisitDeeper = false
		} else {
			// if (! rulesetNode.root) {
			if acceptor, ok := rulesetNode.(interface{ Accept(any) }); ok {
				acceptor.Accept(v.visitor)
			}
			visitArgs.VisitDeeper = false
		}
	}
	
	if nodeWithRules, ok := rulesetNode.(interface{ GetRules() []any }); ok {
		rules := nodeWithRules.GetRules()
		if rules != nil {
			v.mergeRules(rules)
			v.removeDuplicateRules(rules)
		}
	}
	
	// now decide whether we keep the ruleset
	if v.utils.IsVisibleRuleset(rulesetNode) {
		if ensureVisNode, hasEnsure := rulesetNode.(interface{ EnsureVisibility() }); hasEnsure {
			ensureVisNode.EnsureVisibility()
		}
		// Insert at beginning
		rulesets = append([]any{rulesetNode}, rulesets...)
	}
	
	if len(rulesets) == 1 {
		return rulesets[0]
	}
	return rulesets
}

// compileRulesetPaths compiles paths for a ruleset
func (v *ToCSSVisitor) compileRulesetPaths(rulesetNode any) {
	if pathNode, ok := rulesetNode.(interface{ GetPaths() []any; SetPaths([]any) }); ok {
		paths := pathNode.GetPaths()
		if paths != nil {
			var filteredPaths []any
			
			for _, p := range paths {
				if pathSlice, ok := p.([]any); ok && len(pathSlice) > 0 {
					// Convert space combinator to empty at start of path
					if pathElement, ok := pathSlice[0].(interface{ GetElements() []any }); ok {
						elements := pathElement.GetElements()
						if len(elements) > 0 {
							if combNode, ok := elements[0].(interface{ GetCombinator() any }); ok {
								if combWithValue, ok := combNode.GetCombinator().(interface{ GetValue() string }); ok {
									if combWithValue.GetValue() == " " {
										// Set combinator to empty
										newComb := NewCombinator("")
										if combSetter, ok := elements[0].(interface{ SetCombinator(any) }); ok {
											combSetter.SetCombinator(newComb)
										}
									}
								}
							}
						}
					}
					
					// Check if path has any visible and output elements
					hasVisibleOutput := false
					for _, pathElem := range pathSlice {
						if visibleNode, ok := pathElem.(interface{ IsVisible() bool; GetIsOutput() bool }); ok {
							if visibleNode.IsVisible() && visibleNode.GetIsOutput() {
								hasVisibleOutput = true
								break
							}
						}
					}
					
					if hasVisibleOutput {
						filteredPaths = append(filteredPaths, p)
					}
				}
			}
			
			pathNode.SetPaths(filteredPaths)
		}
	}
}

// removeDuplicateRules removes duplicate rules
func (v *ToCSSVisitor) removeDuplicateRules(rules []any) {
	if rules == nil {
		return
	}
	
	// remove duplicates
	ruleCache := make(map[string]any)
	
	for i := len(rules) - 1; i >= 0; i-- {
		rule := rules[i]
		if declNode, ok := rule.(interface{ GetType() string; GetName() string; ToCSS(any) string }); ok {
			if declNode.GetType() == "Declaration" {
				name := declNode.GetName()
				if existing, exists := ruleCache[name]; !exists {
					ruleCache[name] = rule
				} else {
					var ruleList []string
					if existingDecl, ok := existing.(interface{ ToCSS(any) string }); ok {
						ruleList = []string{existingDecl.ToCSS(v.context)}
					} else if existingList, ok := existing.([]string); ok {
						ruleList = existingList
					}
					
					ruleCSS := declNode.ToCSS(v.context)
					isDuplicate := false
					for _, css := range ruleList {
						if css == ruleCSS {
							isDuplicate = true
							break
						}
					}
					
					if isDuplicate {
						// Remove rule at index i
						rules = append(rules[:i], rules[i+1:]...)
					} else {
						ruleList = append(ruleList, ruleCSS)
						ruleCache[name] = ruleList
					}
				}
			}
		}
	}
}

// mergeRules merges rules with merge property
func (v *ToCSSVisitor) mergeRules(rules []any) {
	if rules == nil {
		return
	}
	
	groups := make(map[string][]any)
	var groupsArr [][]any
	
	for i := 0; i < len(rules); i++ {
		rule := rules[i]
		if mergeNode, ok := rule.(interface{ GetMerge() any; GetName() string }); ok {
			if mergeNode.GetMerge() != nil {
				key := mergeNode.GetName()
				if _, exists := groups[key]; !exists {
					groups[key] = []any{}
					groupsArr = append(groupsArr, groups[key])
				} else {
					// Remove from rules array
					rules = append(rules[:i], rules[i+1:]...)
					i--
				}
				groups[key] = append(groups[key], rule)
			}
		}
	}
	
	for _, group := range groupsArr {
		if len(group) > 0 {
			result := group[0]
			var space []any
			spaceExpr, _ := NewExpression(space, false)
			comma := []any{spaceExpr}
			
			for _, rule := range group {
				if mergeRule, ok := rule.(interface{ GetMerge() any; GetValue() any; GetImportant() bool }); ok {
					if mergeValue, ok := mergeRule.GetMerge().(string); ok && mergeValue == "+" {
						if len(space) > 0 {
							emptyExpr, _ := NewExpression([]any{}, false)
							comma = append(comma, emptyExpr)
							space = []any{}
						}
					}
					space = append(space, mergeRule.GetValue())
					
					if resultSetter, ok := result.(interface{ SetImportant(bool) }); ok {
						if resultGetter, ok := result.(interface{ GetImportant() bool }); ok {
							resultSetter.SetImportant(resultGetter.GetImportant() || mergeRule.GetImportant())
						}
					}
				}
			}
			
			if resultSetter, ok := result.(interface{ SetValue(any) }); ok {
				value, _ := NewValue(comma)
				resultSetter.SetValue(value)
			}
		}
	}
}