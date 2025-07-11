package less_go

// Note: Ruleset is now implemented in ruleset.go

// NestableAtRulePrototype represents the prototype functionality for nestable at-rules
type NestableAtRulePrototype struct {
	*Node
	Type     string
	Features any
	Rules    []any
}

// NewNestableAtRulePrototype creates a new NestableAtRulePrototype instance
func NewNestableAtRulePrototype() *NestableAtRulePrototype {
	return &NestableAtRulePrototype{
		Node: NewNode(),
	}
}

// IsRulesetLike returns true indicating this behaves like a ruleset
func (n *NestableAtRulePrototype) IsRulesetLike() bool {
	return true
}

// Accept visits the node with a visitor
func (n *NestableAtRulePrototype) Accept(visitor any) {
	if n.Features != nil {
		if v, ok := visitor.(interface{ Visit(any) any }); ok {
			n.Features = v.Visit(n.Features)
		}
	}
	if n.Rules != nil {
		if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
			n.Rules = v.VisitArray(n.Rules)
		}
	}
}

// EvalTop evaluates the at-rule at the top level 
func (n *NestableAtRulePrototype) EvalTop(context any) any {
	var result any = n

	// Handle context
	ctx, ok := context.(map[string]any)
	if !ok {
		return result
	}

	// Render all dependent Media blocks
	mediaBlocks, hasMediaBlocks := ctx["mediaBlocks"].([]any)
	if hasMediaBlocks && len(mediaBlocks) > 1 {
		// Create empty selectors
		selector, err := NewSelector(nil, nil, nil, n.GetIndex(), n.FileInfo(), nil)
		if err != nil {
			return result
		}
		emptySelectors, err := selector.CreateEmptySelectors()
		if err != nil {
			return result
		}

		// Create new Ruleset - convert selectors to []any
		selectors := make([]any, len(emptySelectors))
		for i, sel := range emptySelectors {
			selectors[i] = sel
		}
		ruleset := NewRuleset(selectors, mediaBlocks, false, n.VisibilityInfo())
		ruleset.MultiMedia = true // Set MultiMedia to true for multiple media blocks
		n.SetParent(ruleset.Node, n.Node)
		result = ruleset
	}

	// Delete mediaBlocks and mediaPath from context
	delete(ctx, "mediaBlocks")
	delete(ctx, "mediaPath")

	return result
}

// EvalNested evaluates the at-rule in a nested context
func (n *NestableAtRulePrototype) EvalNested(context any) any {
	ctx, ok := context.(map[string]any)
	if !ok {
		return n
	}

	mediaPath, hasMediaPath := ctx["mediaPath"].([]any)
	if !hasMediaPath {
		mediaPath = []any{}
	}

	// Create path with current node
	path := append(mediaPath, n)

	// Extract the media-query conditions separated with `,` (OR)
	for i := 0; i < len(path); i++ {
		pathItem, ok := path[i].(*NestableAtRulePrototype)
		if !ok {
			continue
		}

		if pathItem.Type != n.Type {
			if mediaBlocks, hasMediaBlocks := ctx["mediaBlocks"].([]any); hasMediaBlocks && i < len(mediaBlocks) {
				// Remove element at index i
				ctx["mediaBlocks"] = append(mediaBlocks[:i], mediaBlocks[i+1:]...)
			}
			return n
		}

		var value any
		if valueNode, ok := pathItem.Features.(*Value); ok {
			value = valueNode.Value
		} else {
			value = pathItem.Features
		}

		// Convert to array if needed
		if arr, ok := value.([]any); ok {
			path[i] = arr
		} else {
			path[i] = []any{value}
		}
	}

	// Trace all permutations to generate the resulting media-query
	permuteResult := n.Permute(path)
	if permuteResult == nil {
		return n
	}

	permuteArray, ok := permuteResult.([]any)
	if !ok {
		return n
	}

	// Ensure every path is an array before mapping
	for _, p := range permuteArray {
		if _, ok := p.([]any); !ok {
			return n
		}
	}

	// Map paths to expressions
	expressions := make([]any, len(permuteArray))
	for idx, pathItem := range permuteArray {
		pathArray, ok := pathItem.([]any)
		if !ok {
			continue
		}

		// Convert fragments
		mappedPath := make([]any, len(pathArray))
		for i, fragment := range pathArray {
			if _, ok := fragment.(interface{ ToCSS(any) string }); ok {
				mappedPath[i] = fragment
			} else {
				mappedPath[i] = NewAnonymous(fragment, 0, nil, false, false, nil)
			}
		}

		// Insert 'and' between fragments
		for i := len(mappedPath) - 1; i > 0; i-- {
			andAnon := NewAnonymous("and", 0, nil, false, false, nil)
			mappedPath = append(mappedPath[:i], append([]any{andAnon}, mappedPath[i:]...)...)
		}

		expr, err := NewExpression(mappedPath, false)
		if err != nil {
			continue
		}
		expressions[idx] = expr
	}

	// Create new Value with expressions
	newValue, err := NewValue(expressions)
	if err == nil {
		n.Features = newValue
		n.SetParent(n.Features, n.Node)
	}

	// Return fake tree-node that doesn't output anything
	return NewRuleset([]any{}, []any{}, false, nil)
}

// Permute creates permutations of the given array
func (n *NestableAtRulePrototype) Permute(arr []any) any {
	if len(arr) == 0 {
		return []any{}
	} else if len(arr) == 1 {
		return arr[0]
	} else {
		result := []any{}
		rest := n.Permute(arr[1:])
		
		restArray, ok := rest.([]any)
		if !ok {
			return nil
		}

		firstArray, ok := arr[0].([]any)
		if !ok {
			return nil
		}

		for i := 0; i < len(restArray); i++ {
			restItem, ok := restArray[i].([]any)
			if !ok {
				restItem = []any{restArray[i]}
			}
			
			for j := 0; j < len(firstArray); j++ {
				combined := append([]any{firstArray[j]}, restItem...)
				result = append(result, combined)
			}
		}
		return result
	}
}

// BubbleSelectors bubbles selectors up the tree
func (n *NestableAtRulePrototype) BubbleSelectors(selectors []*Selector) {
	if selectors == nil {
		return
	}
	if len(n.Rules) == 0 {
		return
	}

	copiedSelectors := make([]*Selector, len(selectors))
	copy(copiedSelectors, selectors)

	// Convert selectors to []any
	anySelectors := make([]any, len(copiedSelectors))
	for i, sel := range copiedSelectors {
		anySelectors[i] = sel
	}
	newRuleset := NewRuleset(anySelectors, []any{n.Rules[0]}, false, nil)
	n.Rules = []any{newRuleset}
	n.SetParent(n.Rules, n.Node)
} 