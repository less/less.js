package less_go

import (
	"testing"
)

// Mock implementations for testing

// MockJoinSelector implements the Selector interface
type MockJoinSelector struct {
	isOutput bool
}

func (ms *MockJoinSelector) GetIsOutput() bool {
	return ms.isOutput
}

// MockJoinRuleset implements the Ruleset interface
type MockJoinRuleset struct {
	root         bool
	selectors    []any
	rules        []any
	paths        []any
	joinCalled   bool
	joinArgs     []any
}

func (mr *MockJoinRuleset) GetRoot() bool {
	return mr.root
}

func (mr *MockJoinRuleset) GetSelectors() []any {
	return mr.selectors
}

func (mr *MockJoinRuleset) SetSelectors(selectors []any) {
	mr.selectors = selectors
}

func (mr *MockJoinRuleset) GetRules() []any {
	return mr.rules
}

func (mr *MockJoinRuleset) SetRules(rules []any) {
	mr.rules = rules
}

func (mr *MockJoinRuleset) SetPaths(paths []any) {
	mr.paths = paths
}

func (mr *MockJoinRuleset) JoinSelectors(paths *[][]any, context [][]any, selectors []any) {
	mr.joinCalled = true
	mr.joinArgs = []any{paths, context, selectors}
}

// MockMedia implements the Media interface
type MockMedia struct {
	rules []any
}

func (mm *MockMedia) GetRules() []any {
	return mm.rules
}

// MockMediaRule implements the MediaRule interface
type MockMediaRule struct {
	root bool
}

func (mmr *MockMediaRule) SetRoot(root bool) {
	mmr.root = root
}

// MockAtRule implements the AtRule interface
type MockAtRule struct {
	isRooted bool
	rules    []any
}

func (mar *MockAtRule) GetIsRooted() bool {
	return mar.isRooted
}

func (mar *MockAtRule) GetRules() []any {
	return mar.rules
}

// MockAtRuleRule implements the AtRuleRule interface
type MockAtRuleRule struct {
	root any
}

func (marr *MockAtRuleRule) SetRoot(value any) {
	marr.root = value
}

// We'll test Run method indirectly since we can't easily mock the internal visitor

func TestJoinSelectorVisitor_Constructor(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	// Should initialize with empty contexts array containing one empty array
	if len(visitor.contexts) != 1 {
		t.Errorf("Expected contexts length to be 1, got %d", len(visitor.contexts))
	}
	if len(visitor.contexts[0]) != 0 {
		t.Errorf("Expected first context to be empty, got length %d", len(visitor.contexts[0]))
	}
	
	// Should create a Visitor instance
	if visitor.visitor == nil {
		t.Error("Expected visitor to be created")
	}
}

func TestJoinSelectorVisitor_Run(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	mockRoot := "root_node"
	
	// Test that run calls visitor.Visit and returns a result  
	result := visitor.Run(mockRoot)
	
	// The result should be the same as the input since no processing occurs for this type
	if result != mockRoot {
		t.Error("Expected result to be the same as input for non-processing node")
	}
}

func TestJoinSelectorVisitor_IsReplacing(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	if visitor.IsReplacing() {
		t.Error("Expected IsReplacing to return false")
	}
}

func TestJoinSelectorVisitor_VisitDeclaration(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	mockDeclNode := "declaration_node" // Use string instead of map to avoid comparison issues
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	result := visitor.VisitDeclaration(mockDeclNode, visitArgs)
	
	// Should set visitDeeper to false
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be false")
	}
	
	// Should not modify declaration node
	if result != mockDeclNode {
		t.Error("Expected declaration node to be unchanged")
	}
}

func TestJoinSelectorVisitor_VisitMixinDefinition(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	mockMixinNode := "mixin_definition_node" // Use string instead of map to avoid comparison issues
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	result := visitor.VisitMixinDefinition(mockMixinNode, visitArgs)
	
	// Should set visitDeeper to false
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be false")
	}
	
	// Should not modify mixin definition node
	if result != mockMixinNode {
		t.Error("Expected mixin definition node to be unchanged")
	}
}

func TestJoinSelectorVisitor_VisitRuleset(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	t.Run("should push new empty paths array to contexts", func(t *testing.T) {
		mockRuleset := &MockJoinRuleset{root: false}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if len(visitor.contexts) != 2 {
			t.Errorf("Expected contexts length to be 2, got %d", len(visitor.contexts))
		}
		if len(visitor.contexts[1]) != 0 {
			t.Errorf("Expected second context to be empty, got length %d", len(visitor.contexts[1]))
		}
	})
	
	t.Run("should handle root ruleset without processing selectors", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockRuleset := &MockJoinRuleset{root: true}
		visitArgs := &VisitArgs{}
		initialContextsLength := len(visitor.contexts)
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if len(visitor.contexts) != initialContextsLength+1 {
			t.Errorf("Expected contexts length to increase by 1")
		}
		// Root rulesets don't get processed, so selectors should remain unchanged
	})
	
	t.Run("should filter selectors by getIsOutput", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector1 := &MockJoinSelector{isOutput: true}
		mockSelector2 := &MockJoinSelector{isOutput: false}
		mockSelector3 := &MockJoinSelector{isOutput: true}
		
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector1, mockSelector2, mockSelector3},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if len(mockRuleset.selectors) != 2 {
			t.Errorf("Expected 2 selectors after filtering, got %d", len(mockRuleset.selectors))
		}
		if mockRuleset.selectors[0] != mockSelector1 || mockRuleset.selectors[1] != mockSelector3 {
			t.Error("Expected filtered selectors to be mockSelector1 and mockSelector3")
		}
	})
	
	t.Run("should set selectors to nil when all selectors are filtered out", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector1 := &MockJoinSelector{isOutput: false}
		mockSelector2 := &MockJoinSelector{isOutput: false}
		
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector1, mockSelector2},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if mockRuleset.selectors != nil {
			t.Error("Expected selectors to be nil")
		}
		if mockRuleset.rules != nil {
			t.Error("Expected rules to be nil")
		}
	})
	
	t.Run("should call joinSelectors when selectors exist", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector := &MockJoinSelector{isOutput: true}
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if !mockRuleset.joinCalled {
			t.Error("Expected joinSelectors to be called")
		}
	})
	
	t.Run("should set paths property on ruleset", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector := &MockJoinSelector{isOutput: true}
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if mockRuleset.paths == nil {
			t.Error("Expected paths to be set")
		}
		// paths should be the same as contexts[1]
		if len(mockRuleset.paths) != len(visitor.contexts[1]) {
			t.Error("Expected paths to match contexts[1]")
		}
	})
	
	t.Run("should handle ruleset without selectors", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: nil,
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if mockRuleset.rules != nil {
			t.Error("Expected rules to be nil")
		}
		if mockRuleset.paths == nil {
			t.Error("Expected paths to be set")
		}
	})
	
	t.Run("should handle empty selectors array", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if mockRuleset.selectors != nil {
			t.Error("Expected selectors to be nil")
		}
		if mockRuleset.rules != nil {
			t.Error("Expected rules to be nil") 
		}
		if mockRuleset.paths == nil {
			t.Error("Expected paths to be set")
		}
	})
	
	t.Run("should preserve existing rules when selectors exist", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector := &MockJoinSelector{isOutput: true}
		mockRules := []any{map[string]any{"type": "Declaration"}}
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector},
			rules:     mockRules,
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitRuleset(mockRuleset, visitArgs)
		
		if len(mockRuleset.rules) != len(mockRules) {
			t.Error("Expected rules to be preserved")
		}
	})
}

func TestJoinSelectorVisitor_VisitRulesetOut(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	t.Run("should reduce contexts length by 1", func(t *testing.T) {
		visitor.contexts = [][]any{{}, {}, {}} // 3 contexts
		mockRuleset := "ruleset_node"
		
		visitor.VisitRulesetOut(mockRuleset)
		
		if len(visitor.contexts) != 2 {
			t.Errorf("Expected contexts length to be 2, got %d", len(visitor.contexts))
		}
	})
	
	t.Run("should handle single context", func(t *testing.T) {
		visitor.contexts = [][]any{{}} // 1 context
		mockRuleset := "ruleset_node"
		
		visitor.VisitRulesetOut(mockRuleset)
		
		if len(visitor.contexts) != 0 {
			t.Errorf("Expected contexts length to be 0, got %d", len(visitor.contexts))
		}
	})
}

func TestJoinSelectorVisitor_VisitMedia(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	t.Run("should set root to true when context is empty", func(t *testing.T) {
		visitor.contexts = [][]any{{}} // empty context
		mockMediaRule := &MockMediaRule{root: false}
		mockMediaNode := &MockMedia{
			rules: []any{mockMediaRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitMedia(mockMediaNode, visitArgs)
		
		if !mockMediaRule.root {
			t.Error("Expected root to be true")
		}
	})
	
	t.Run("should set root to true when first context item has multiMedia", func(t *testing.T) {
		visitor.contexts = [][]any{{map[string]any{"multiMedia": true}}}
		mockMediaRule := &MockMediaRule{root: false}
		mockMediaNode := &MockMedia{
			rules: []any{mockMediaRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitMedia(mockMediaNode, visitArgs)
		
		if !mockMediaRule.root {
			t.Error("Expected root to be true")
		}
	})
	
	t.Run("should set root to false when context has items without multiMedia", func(t *testing.T) {
		visitor.contexts = [][]any{{map[string]any{"multiMedia": false}}}
		mockMediaRule := &MockMediaRule{root: false}
		mockMediaNode := &MockMedia{
			rules: []any{mockMediaRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitMedia(mockMediaNode, visitArgs)
		
		if mockMediaRule.root {
			t.Error("Expected root to be false")
		}
	})
	
	t.Run("should set root to false when context has items with undefined multiMedia", func(t *testing.T) {
		visitor.contexts = [][]any{{map[string]any{"someProperty": "value"}}}
		mockMediaRule := &MockMediaRule{root: true} // Start with true to test it gets set to false
		mockMediaNode := &MockMedia{
			rules: []any{mockMediaRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitMedia(mockMediaNode, visitArgs)
		
		if mockMediaRule.root {
			t.Error("Expected root to be false (no multiMedia property)")
		}
	})
}

func TestJoinSelectorVisitor_VisitAtRule(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	t.Run("should set root to true when context is empty", func(t *testing.T) {
		visitor.contexts = [][]any{{}} // empty context
		mockAtRuleRule := &MockAtRuleRule{}
		mockAtRuleNode := &MockAtRule{
			rules: []any{mockAtRuleRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
		
		if mockAtRuleRule.root != true {
			t.Error("Expected root to be true")
		}
	})
	
	t.Run("should set root to true when isRooted is true", func(t *testing.T) {
		visitor.contexts = [][]any{{map[string]any{"someContext": true}}}
		mockAtRuleRule := &MockAtRuleRule{}
		mockAtRuleNode := &MockAtRule{
			isRooted: true,
			rules:    []any{mockAtRuleRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
		
		if mockAtRuleRule.root != true {
			t.Error("Expected root to be true")
		}
	})
	
	t.Run("should set root to nil when context has items and isRooted is false", func(t *testing.T) {
		visitor.contexts = [][]any{{map[string]any{"someContext": true}}}
		mockAtRuleRule := &MockAtRuleRule{}
		mockAtRuleNode := &MockAtRule{
			isRooted: false,
			rules:    []any{mockAtRuleRule},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
		
		if mockAtRuleRule.root != nil {
			t.Error("Expected root to be nil")
		}
	})
	
	t.Run("should handle at-rule without rules property", func(t *testing.T) {
		mockAtRuleNode := &MockAtRule{
			isRooted: false,
			rules:    nil,
		}
		visitArgs := &VisitArgs{}
		
		// Should not panic
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
	})
	
	t.Run("should handle at-rule with empty rules array", func(t *testing.T) {
		mockAtRuleNode := &MockAtRule{
			isRooted: false,
			rules:    []any{},
		}
		visitArgs := &VisitArgs{}
		
		// Should not panic
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
	})
	
	t.Run("should only modify first rule when multiple rules exist", func(t *testing.T) {
		visitor.contexts = [][]any{{}} // empty context
		mockAtRuleRule1 := &MockAtRuleRule{}
		mockAtRuleRule2 := &MockAtRuleRule{}
		mockAtRuleRule3 := &MockAtRuleRule{}
		mockAtRuleNode := &MockAtRule{
			rules: []any{mockAtRuleRule1, mockAtRuleRule2, mockAtRuleRule3},
		}
		visitArgs := &VisitArgs{}
		
		visitor.VisitAtRule(mockAtRuleNode, visitArgs)
		
		if mockAtRuleRule1.root != true {
			t.Error("Expected first rule root to be true")
		}
		if mockAtRuleRule2.root != nil {
			t.Error("Expected second rule root to remain nil")
		}
		if mockAtRuleRule3.root != nil {
			t.Error("Expected third rule root to remain nil")
		}
	})
}

func TestJoinSelectorVisitor_ComplexScenarios(t *testing.T) {
	t.Run("should handle nested rulesets correctly", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		mockSelector := &MockJoinSelector{isOutput: true}
		mockRuleset1 := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector},
		}
		mockRuleset2 := &MockJoinRuleset{
			root:      false,
			selectors: []any{mockSelector},
		}
		
		if len(visitor.contexts) != 1 {
			t.Errorf("Expected initial contexts length to be 1, got %d", len(visitor.contexts))
		}
		
		visitor.VisitRuleset(mockRuleset1, &VisitArgs{})
		if len(visitor.contexts) != 2 {
			t.Errorf("Expected contexts length to be 2, got %d", len(visitor.contexts))
		}
		
		visitor.VisitRuleset(mockRuleset2, &VisitArgs{})
		if len(visitor.contexts) != 3 {
			t.Errorf("Expected contexts length to be 3, got %d", len(visitor.contexts))
		}
		
		visitor.VisitRulesetOut(mockRuleset2)
		if len(visitor.contexts) != 2 {
			t.Errorf("Expected contexts length to be 2, got %d", len(visitor.contexts))
		}
		
		visitor.VisitRulesetOut(mockRuleset1)
		if len(visitor.contexts) != 1 {
			t.Errorf("Expected contexts length to be 1, got %d", len(visitor.contexts))
		}
	})
	
	t.Run("should maintain context stack integrity across multiple operations", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		initialContexts := len(visitor.contexts)
		
		// Add contexts
		visitor.VisitRuleset(&MockJoinRuleset{root: false}, &VisitArgs{})
		visitor.VisitRuleset(&MockJoinRuleset{root: false}, &VisitArgs{})
		
		if len(visitor.contexts) != initialContexts+2 {
			t.Errorf("Expected contexts length to increase by 2")
		}
		
		// Remove contexts
		visitor.VisitRulesetOut("ruleset_node")
		visitor.VisitRulesetOut("ruleset_node")
		
		if len(visitor.contexts) != initialContexts {
			t.Errorf("Expected contexts length to return to initial")
		}
	})
	
	t.Run("should handle mixed selector filtering scenarios", func(t *testing.T) {
		visitor := NewJoinSelectorVisitor()
		outputSelector := &MockJoinSelector{isOutput: true}
		hiddenSelector := &MockJoinSelector{isOutput: false}
		
		mockRuleset := &MockJoinRuleset{
			root:      false,
			selectors: []any{outputSelector, hiddenSelector, outputSelector, hiddenSelector},
		}
		
		visitor.VisitRuleset(mockRuleset, &VisitArgs{})
		
		if len(mockRuleset.selectors) != 2 {
			t.Errorf("Expected 2 selectors after filtering, got %d", len(mockRuleset.selectors))
		}
		if mockRuleset.selectors[0] != outputSelector || mockRuleset.selectors[1] != outputSelector {
			t.Error("Expected filtered selectors to both be outputSelector")
		}
		if !mockRuleset.joinCalled {
			t.Error("Expected joinSelectors to be called")
		}
	})
}

func TestJoinSelectorVisitor_EdgeCases(t *testing.T) {
	visitor := NewJoinSelectorVisitor()
	
	t.Run("should handle nil node in visitDeclaration", func(t *testing.T) {
		visitArgs := &VisitArgs{VisitDeeper: true}
		
		result := visitor.VisitDeclaration(nil, visitArgs)
		
		if visitArgs.VisitDeeper {
			t.Error("Expected visitDeeper to be false")
		}
		if result != nil {
			t.Error("Expected result to be nil")
		}
	})
	
	t.Run("should handle nil node in visitMixinDefinition", func(t *testing.T) {
		visitArgs := &VisitArgs{VisitDeeper: true}
		
		result := visitor.VisitMixinDefinition(nil, visitArgs)
		
		if visitArgs.VisitDeeper {
			t.Error("Expected visitDeeper to be false")
		}
		if result != nil {
			t.Error("Expected result to be nil")
		}
	})
	
	t.Run("should handle context stack underflow", func(t *testing.T) {
		visitor.contexts = [][]any{} // empty contexts
		
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic when contexts is empty")
			}
		}()
		
		visitor.VisitRulesetOut("ruleset_node")
	})
}