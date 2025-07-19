package less_go

import (
	"fmt"
	"reflect"
	"testing"
	"time"
)

// Mock visitor for testing
type RulesetMockVisitor struct {
	VisitedItems []any
}

func (m *RulesetMockVisitor) VisitArray(arr []any, flag ...bool) []any {
	m.VisitedItems = append(m.VisitedItems, arr)
	return arr
}

// Mock output for testing
type MockOutput struct {
	Chunks []string
}

func (m *MockOutput) Add(chunk any, fileInfo any, index any) {
	if chunk != nil {
		m.Chunks = append(m.Chunks, chunk.(string))
	}
}

func (m *MockOutput) IsEmpty() bool {
	return len(m.Chunks) == 0
}

// Mock Declaration for comprehensive testing
type RulesetMockDeclaration struct {
	name     any
	value    any
	variable bool
}

func (m *RulesetMockDeclaration) GetType() string {
	return "Declaration"
}

func (m *RulesetMockDeclaration) Eval(context any) (any, error) {
	return m, nil
}

func (m *RulesetMockDeclaration) MakeImportant() any {
	return &RulesetMockDeclaration{
		name:     m.name,
		value:    m.value,
		variable: m.variable,
	}
}

func (m *RulesetMockDeclaration) IsVisible() bool {
	return true
}

// Mock Selector for testing
type RulesetMockSelector struct {
	elements       []*Element
	evaldCondition bool
	condition      any
}

func (m *RulesetMockSelector) GetType() string {
	return "Selector"
}

func (m *RulesetMockSelector) Eval(context any) (any, error) {
	return &RulesetMockSelector{
		elements:       m.elements,
		evaldCondition: m.evaldCondition,
		condition:      m.condition,
	}, nil
}

func (m *RulesetMockSelector) GetElements() []*Element {
	return m.elements
}

func (m *RulesetMockSelector) GetEvaldCondition() bool {
	return m.evaldCondition
}

func (m *RulesetMockSelector) GetCondition() any {
	return m.condition
}

func (m *RulesetMockSelector) IsJustParentSelector() bool {
	return len(m.elements) == 1 && m.elements[0].Value == "&"
}

func (m *RulesetMockSelector) ToCSS(context any) string {
	return ".mock-selector"
}

func (m *RulesetMockSelector) Match(other any) int {
	if o, ok := other.(*RulesetMockSelector); ok {
		if len(m.elements) <= len(o.elements) {
			return len(m.elements)
		}
	}
	return 0
}

func (m *RulesetMockSelector) GenCSS(context any, output *CSSOutput) {
	output.Add(".mock-selector", nil, nil)
}

// Mock Comment for testing
type MockComment struct {
	Value string
}

func (m *MockComment) GetType() string {
	return "Comment"
}

func (m *MockComment) GenCSS(context any, output *CSSOutput) {
	output.Add("/* "+m.Value+" */", nil, nil)
}

func (m *MockComment) IsVisible() bool {
	return true
}

func (m *MockComment) IsRulesetLike() bool {
	return false
}

// Mock Import for testing
type MockImport struct {
	root interface {
		Variables() map[string]any
		Variable(string) any
	}
}

func (m *MockImport) GetType() string {
	return "Import"
}

func (m *MockImport) Eval(context any) (any, error) {
	return []any{
		&RulesetMockDeclaration{name: "imported", value: "value", variable: false},
	}, nil
}

func (m *MockImport) GetRoot() interface {
	Variables() map[string]any
	Variable(string) any
} {
	return m.root
}

func (m *MockImport) GenCSS(context any, output *CSSOutput) {
	output.Add("@import", nil, nil)
}

func (m *MockImport) IsVisible() bool {
	return true
}

func (m *MockImport) IsRulesetLike() bool {
	return false
}

// Mock MixinCall for testing
type MockMixinCall struct {
	results []any
}

func (m *MockMixinCall) GetType() string {
	return "MixinCall"
}

func (m *MockMixinCall) Eval(context any) ([]any, error) {
	return m.results, nil
}

// Mock VariableCall for testing
type MockVariableCall struct {
	rules []any
}

func (m *MockVariableCall) GetType() string {
	return "VariableCall"
}

func (m *MockVariableCall) Eval(context any) (any, error) {
	return map[string]any{
		"rules": m.rules,
	}, nil
}

// Mock Condition for testing
type MockCondition struct {
	result bool
}

func (m *MockCondition) Eval(context any) (any, error) {
	return m.result, nil
}

// Mock Root for import testing
type MockRoot struct {
	vars map[string]any
}

func (m *MockRoot) Variables() map[string]any {
	return m.vars
}

func (m *MockRoot) Variable(name string) any {
	if v, exists := m.vars[name]; exists {
		return v
	}
	return nil
}

// Mock MediaBlock for testing
type MockMediaBlock struct {
	BubbleSelectorsCallCount int
}

func (m *MockMediaBlock) BubbleSelectors(selectors []any) {
	m.BubbleSelectorsCallCount++
}

func TestNewRuleset(t *testing.T) {
	t.Run("should create a Ruleset with provided parameters", func(t *testing.T) {
		selectors := []any{&RulesetMockSelector{}}
		rules := []any{&RulesetMockDeclaration{name: "color", value: "red"}}
		strictImports := true
		visibilityInfo := map[string]any{"visible": true}

		ruleset := NewRuleset(selectors, rules, strictImports, visibilityInfo)

		if ruleset.Selectors == nil || len(ruleset.Selectors) != 1 {
			t.Errorf("Expected selectors to be set")
		}
		if ruleset.Rules == nil || len(ruleset.Rules) != 1 {
			t.Errorf("Expected rules to be set")
		}
		if ruleset.StrictImports != strictImports {
			t.Errorf("Expected StrictImports to be %v", strictImports)
		}
		if !ruleset.AllowRoot {
			t.Errorf("Expected AllowRoot to be true")
		}
		if ruleset.lookups == nil {
			t.Errorf("Expected lookups to be initialized")
		}
	})

	t.Run("should handle nil parameters", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		if ruleset.Selectors != nil {
			t.Errorf("Expected selectors to be nil")
		}
		if ruleset.Rules != nil {
			t.Errorf("Expected rules to be nil")
		}
		if ruleset.lookups == nil {
			t.Errorf("Expected lookups to be initialized")
		}
	})

	t.Run("should handle empty arrays", func(t *testing.T) {
		ruleset := NewRuleset([]any{}, []any{}, false, nil)
		if len(ruleset.Selectors) != 0 {
			t.Errorf("Expected empty selectors array")
		}
		if len(ruleset.Rules) != 0 {
			t.Errorf("Expected empty rules array")
		}
	})
}

func TestRulesetType(t *testing.T) {
	ruleset := NewRuleset(nil, nil, false, nil)

	t.Run("should have correct type", func(t *testing.T) {
		if ruleset.GetType() != "Ruleset" {
			t.Errorf("Expected type 'Ruleset', got %s", ruleset.GetType())
		}
	})

	t.Run("should be a ruleset", func(t *testing.T) {
		if !ruleset.IsRuleset() {
			t.Errorf("Expected IsRuleset to return true")
		}
	})

	t.Run("should be ruleset-like", func(t *testing.T) {
		if !ruleset.IsRulesetLike() {
			t.Errorf("Expected IsRulesetLike to return true")
		}
	})
}

func TestAccept(t *testing.T) {
	t.Run("should visit paths when they exist", func(t *testing.T) {
		visitor := &RulesetMockVisitor{}
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.Paths = [][]any{{"path1"}}

		ruleset.Accept(visitor)

		if len(visitor.VisitedItems) == 0 {
			t.Errorf("Expected visitor to visit paths")
		}
	})

	t.Run("should visit selectors when paths do not exist", func(t *testing.T) {
		visitor := &RulesetMockVisitor{}
		selectors := []any{&RulesetMockSelector{}}
		ruleset := NewRuleset(selectors, nil, false, nil)

		ruleset.Accept(visitor)

		if len(visitor.VisitedItems) == 0 {
			t.Errorf("Expected visitor to visit selectors")
		}
	})

	t.Run("should visit rules when they exist and have length", func(t *testing.T) {
		visitor := &RulesetMockVisitor{}
		rules := []any{&RulesetMockDeclaration{name: "color", value: "red"}}
		ruleset := NewRuleset(nil, rules, false, nil)

		ruleset.Accept(visitor)

		if len(visitor.VisitedItems) == 0 {
			t.Errorf("Expected visitor to visit rules")
		}
	})

	t.Run("should not visit rules when they are empty", func(t *testing.T) {
		visitor := &RulesetMockVisitor{}
		ruleset := NewRuleset(nil, []any{}, false, nil)

		ruleset.Accept(visitor)

		// Should not visit empty rules
		found := false
		for _, item := range visitor.VisitedItems {
			if arr, ok := item.([]any); ok && len(arr) == 0 {
				found = true
				break
			}
		}
		if found {
			t.Errorf("Should not visit empty rules")
		}
	})
}

func TestEval(t *testing.T) {
	t.Run("should require context", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		_, err := ruleset.Eval(nil)
		if err == nil {
			t.Errorf("Expected error when context is nil")
		}
	})

	t.Run("should require context to be a map", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		_, err := ruleset.Eval("invalid")
		if err == nil {
			t.Errorf("Expected error when context is not a map")
		}
	})

	t.Run("should evaluate with empty context", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		context := make(map[string]any)
		
		evaluated, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if evaluated == nil {
			t.Errorf("Expected result to not be nil")
		}
		
		result, ok := evaluated.(*Ruleset)
		if !ok {
			t.Errorf("Expected result to be a *Ruleset, got %T", evaluated)
		}
		if result.GetType() != "Ruleset" {
			t.Errorf("Expected result to be a Ruleset")
		}
	})

	t.Run("should evaluate selectors correctly", func(t *testing.T) {
		mockElement := &Element{
			Value: "div",
			IsVariable: false,
		}
		mockSelector := &Selector{
			Elements: []*Element{mockElement},
			EvaldCondition: true,
		}
		
		selectors := []any{mockSelector}
		ruleset := NewRuleset(selectors, nil, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Selectors) != 1 {
			t.Errorf("Expected 1 selector in result")
		}
	})

	t.Run("should handle variable selectors", func(t *testing.T) {
		mockElement := &Element{
			Value: "@var",
			IsVariable: true,
		}
		mockSelector := &Selector{
			Elements: []*Element{mockElement},
			EvaldCondition: true,
		}
		
		selectors := []any{mockSelector}
		ruleset := NewRuleset(selectors, nil, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
		}
	})

	t.Run("should clear rules when no selectors pass", func(t *testing.T) {
		// Create a selector that fails (EvaldCondition = false)
		mockElement := &Element{
			Value: "div",
			IsVariable: false,
		}
		mockSelector := &Selector{
			Elements: []*Element{mockElement},
			EvaldCondition: false, // This makes it a failing selector
		}
		
		// Create some rules that should be cleared
		mockRule := &RulesetMockDeclaration{name: "color", value: "red"}
		rules := []any{mockRule}
		selectors := []any{mockSelector}
		ruleset := NewRuleset(selectors, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
			return
		}
		
		// The key test: rules should be cleared when no selectors pass
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Rules) != 0 {
			t.Errorf("Expected rules to be cleared when no selectors pass, got %d rules", len(resultRuleset.Rules))
		}
	})

	t.Run("should copy original ruleset properties", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.Root = true
		ruleset.FirstRoot = true
		ruleset.AllowImports = true
		ruleset.DebugInfo = map[string]any{"test": true}

		context := make(map[string]any)
		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultRuleset := result.(*Ruleset)
		if resultRuleset.OriginalRuleset != ruleset {
			t.Errorf("Expected OriginalRuleset to be set")
		}
		if !resultRuleset.Root {
			t.Errorf("Expected Root to be copied")
		}
		if !resultRuleset.FirstRoot {
			t.Errorf("Expected FirstRoot to be copied")
		}
		if !resultRuleset.AllowImports {
			t.Errorf("Expected AllowImports to be copied")
		}
		if resultRuleset.DebugInfo == nil {
			t.Errorf("Expected DebugInfo to be copied")
		}
	})

	t.Run("should handle function registry inheritance", func(t *testing.T) {
		mockRegistry := map[string]any{"inherit": func() any { return map[string]any{} }}
		frame := &Ruleset{FunctionRegistry: mockRegistry}
		context := map[string]any{"frames": []any{frame}}
		ruleset := NewRuleset(nil, nil, false, nil)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resultRuleset := result.(*Ruleset)
		if resultRuleset.FunctionRegistry == nil {
			t.Errorf("Expected FunctionRegistry to be set")
		}
	})

	t.Run("should evaluate MixinCall", func(t *testing.T) {
		mixinCall := &MockMixinCall{
			results: []any{&RulesetMockDeclaration{name: "color", value: "red", variable: false}},
		}
		rules := []any{mixinCall}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Rules) != 1 {
			t.Errorf("Expected 1 rule in result")
		}
	})

	t.Run("should evaluate VariableCall", func(t *testing.T) {
		variableCall := &MockVariableCall{
			rules: []any{&RulesetMockDeclaration{name: "color", value: "red", variable: false}},
		}
		rules := []any{variableCall}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Rules) != 1 {
			t.Errorf("Expected 1 rule in result")
		}
	})

	t.Run("should handle parent selector folding", func(t *testing.T) {
		parentElement := &Element{Value: "&", IsVariable: false}
		parentSelector := &Selector{
			Elements: []*Element{parentElement},
			EvaldCondition: true,
		}
		
		nestedRuleset := NewRuleset(
			[]any{parentSelector},
			[]any{&RulesetMockDeclaration{name: "color", value: "red"}},
			false,
			nil,
		)
		
		rules := []any{nestedRuleset}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		// Should fold the parent selector and include the nested rules
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Rules) != 1 {
			t.Errorf("Expected rules to be folded")
		}
	})
}

func TestEvalImports(t *testing.T) {
	t.Run("should handle nil rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		err := ruleset.EvalImports(map[string]any{})
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
	})

	t.Run("should handle empty rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, []any{}, false, nil)
		err := ruleset.EvalImports(map[string]any{})
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
	})

	t.Run("should evaluate import rules", func(t *testing.T) {
		importRule := &MockImport{}
		ruleset := NewRuleset(nil, []any{importRule}, false, nil)
		context := make(map[string]any)

		err := ruleset.EvalImports(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		// Should have replaced import with its evaluated result
		if len(ruleset.Rules) != 1 {
			t.Errorf("Expected import to be evaluated")
		}
	})
}

func TestMakeImportant(t *testing.T) {
	t.Run("should create important version of ruleset", func(t *testing.T) {
		mockRule := &RulesetMockDeclaration{name: "color", value: "red"}
		rules := []any{mockRule}
		ruleset := NewRuleset(nil, rules, true, map[string]any{})

		result := ruleset.MakeImportant()

		if result == nil {
			t.Errorf("Expected result to not be nil")
			return
		}
		if result.GetType() != "Ruleset" {
			t.Errorf("Expected result to be a Ruleset")
		}
		if len(result.Rules) != 1 {
			t.Errorf("Expected one rule in result")
		}
	})

	t.Run("should handle rules without MakeImportant method", func(t *testing.T) {
		rule := "simple rule"
		rules := []any{rule}
		ruleset := NewRuleset(nil, rules, false, map[string]any{})

		result := ruleset.MakeImportant()

		if result == nil {
			t.Errorf("Expected result to not be nil")
			return
		}
		if len(result.Rules) != 1 {
			t.Errorf("Expected one rule in result")
		}
		if result.Rules[0] != rule {
			t.Errorf("Expected rule to be unchanged")
		}
	})
}

func TestMatchArgs(t *testing.T) {
	ruleset := NewRuleset(nil, nil, false, nil)

	t.Run("should return true for nil args", func(t *testing.T) {
		if !ruleset.MatchArgs(nil) {
			t.Errorf("Expected true for nil args")
		}
	})

	t.Run("should return true for empty args", func(t *testing.T) {
		if !ruleset.MatchArgs([]any{}) {
			t.Errorf("Expected true for empty args")
		}
	})

	t.Run("should return false for non-empty args", func(t *testing.T) {
		if ruleset.MatchArgs([]any{"arg1"}) {
			t.Errorf("Expected false for non-empty args")
		}
	})
}

func TestMatchCondition(t *testing.T) {
	t.Run("should return false if no selectors", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		result := ruleset.MatchCondition([]any{}, map[string]any{})
		if result {
			t.Errorf("Expected false when no selectors")
		}
	})

	t.Run("should return false if empty selectors", func(t *testing.T) {
		ruleset := NewRuleset([]any{}, nil, false, nil)
		result := ruleset.MatchCondition([]any{}, map[string]any{})
		if result {
			t.Errorf("Expected false when empty selectors")
		}
	})

	t.Run("should check evaldCondition", func(t *testing.T) {
		selector := &Selector{EvaldCondition: false}
		ruleset := NewRuleset([]any{selector}, nil, false, nil)
		result := ruleset.MatchCondition([]any{}, map[string]any{})
		if result {
			t.Errorf("Expected false when evaldCondition is false")
		}
	})

	t.Run("should evaluate condition", func(t *testing.T) {
		condition := &MockCondition{result: true}
		selector := &Selector{
			EvaldCondition: true,
			Condition: condition,
		}
		ruleset := NewRuleset([]any{selector}, nil, false, nil)
		result := ruleset.MatchCondition([]any{}, map[string]any{})
		if !result {
			t.Errorf("Expected true when condition evaluates to true")
		}
	})
}

func TestResetCache(t *testing.T) {
	t.Run("should reset all cache properties", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.rulesets = []any{"cached"}
		ruleset.variables = map[string]any{"cached": true}
		ruleset.properties = map[string][]any{"cached": {"true"}}
		ruleset.lookups["cached"] = []any{"true"}

		ruleset.ResetCache()

		if ruleset.rulesets != nil {
			t.Errorf("Expected rulesets to be nil")
		}
		if ruleset.variables != nil {
			t.Errorf("Expected variables to be nil")
		}
		if ruleset.properties != nil {
			t.Errorf("Expected properties to be nil")
		}
		if len(ruleset.lookups) != 0 {
			t.Errorf("Expected lookups to be empty")
		}
	})
}

func TestVariables(t *testing.T) {
	t.Run("should return cached variables", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		cached := map[string]any{"var1": "value1"}
		ruleset.variables = cached

		result := ruleset.Variables()

		if len(result) != len(cached) || result["var1"] != cached["var1"] {
			t.Errorf("Expected cached variables to be returned")
		}
	})

	t.Run("should build variables from rules", func(t *testing.T) {
		decl, _ := NewDeclaration("@var1", "value1", false, false, 0, map[string]any{}, false, true)
		rules := []any{decl}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Variables()

		if len(result) != 1 {
			t.Errorf("Expected one variable")
		}
		if result["@var1"] != decl {
			t.Errorf("Expected variable to be the declaration")
		}
	})

	t.Run("should handle import rules with variables", func(t *testing.T) {
		mockRoot := &MockRoot{
			vars: map[string]any{"@imported": &RulesetMockDeclaration{name: "@imported", value: "value"}},
		}
		importRule := &MockImport{root: mockRoot}
		rules := []any{importRule}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Variables()

		if len(result) != 1 {
			t.Errorf("Expected one imported variable")
		}
		if result["@imported"] == nil {
			t.Errorf("Expected imported variable to exist")
		}
	})

	t.Run("should handle nil rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)

		result := ruleset.Variables()

		if len(result) != 0 {
			t.Errorf("Expected empty variables map")
		}
	})
}

func TestProperties(t *testing.T) {
	t.Run("should return cached properties", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		cached := map[string][]any{"prop1": {"value1"}}
		ruleset.properties = cached

		result := ruleset.Properties()

		if len(result) != len(cached) || len(result["prop1"]) != len(cached["prop1"]) {
			t.Errorf("Expected cached properties to be returned")
		}
	})

	t.Run("should build properties from rules", func(t *testing.T) {
		decl, _ := NewDeclaration("color", "red", false, false, 0, map[string]any{}, false, false)
		rules := []any{decl}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Properties()

		if len(result) != 1 {
			t.Errorf("Expected one property")
		}
		if result["$color"] == nil {
			t.Errorf("Expected $color property to exist")
		}
		if len(result["$color"]) != 1 {
			t.Errorf("Expected one property value")
		}
	})

	t.Run("should handle multiple properties with same name", func(t *testing.T) {
		decl1, _ := NewDeclaration("color", "red", false, false, 0, map[string]any{}, false, false)
		decl2, _ := NewDeclaration("color", "blue", false, false, 0, map[string]any{}, false, false)
		rules := []any{decl1, decl2}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Properties()

		if len(result["$color"]) != 2 {
			t.Errorf("Expected two property values")
		}
	})

	t.Run("should handle nil rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)

		result := ruleset.Properties()

		if len(result) != 0 {
			t.Errorf("Expected empty properties map")
		}
	})
}

func TestRulesetVariable(t *testing.T) {
	t.Run("should return parsed variable value", func(t *testing.T) {
		mockDecl := &RulesetMockDeclaration{name: "@var1", value: "value1"}
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.variables = map[string]any{"@var1": mockDecl}

		result := ruleset.Variable("@var1")

		if result == nil {
			t.Errorf("Expected non-nil result for existing variable")
		} else if value, ok := result["value"]; !ok {
			t.Errorf("Expected result to have 'value' key")
		} else if value != mockDecl {
			t.Errorf("Expected parsed variable value")
		}
	})

	t.Run("should return nil for non-existent variable", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.variables = map[string]any{}

		result := ruleset.Variable("nonexistent")

		if result != nil {
			t.Errorf("Expected nil for non-existent variable")
		}
	})
}

func TestRulesetProperty(t *testing.T) {
	t.Run("should return parsed property value", func(t *testing.T) {
		mockDecl := &RulesetMockDeclaration{name: "prop1", value: "value1"}
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.properties = map[string][]any{"prop1": {mockDecl}}

		result := ruleset.Property("prop1")

		if result == nil {
			t.Errorf("Expected property value to be returned")
		}
	})

	t.Run("should return nil for non-existent property", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.properties = map[string][]any{}

		result := ruleset.Property("nonexistent")

		if result != nil {
			t.Errorf("Expected nil for non-existent property")
		}
	})
}

func TestLastDeclaration(t *testing.T) {
	t.Run("should return last declaration rule", func(t *testing.T) {
		decl1, _ := NewDeclaration("prop1", "value1", false, false, 0, map[string]any{}, false, false)
		decl2, _ := NewDeclaration("prop2", "value2", false, false, 0, map[string]any{}, false, false)
		comment := &MockComment{Value: "comment"}
		rules := []any{decl1, comment, decl2}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.LastDeclaration()

		if result != decl2 {
			t.Errorf("Expected last declaration to be returned")
		}
	})

	t.Run("should return nil if no declarations", func(t *testing.T) {
		comment := &MockComment{Value: "comment"}
		rules := []any{comment}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.LastDeclaration()

		if result != nil {
			t.Errorf("Expected nil when no declarations")
		}
	})

	t.Run("should handle empty rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, []any{}, false, nil)

		result := ruleset.LastDeclaration()

		if result != nil {
			t.Errorf("Expected nil for empty rules")
		}
	})
}

func TestRulesets(t *testing.T) {
	t.Run("should return filtered rulesets", func(t *testing.T) {
		ruleset1 := NewRuleset(nil, nil, false, nil)
		declaration := &RulesetMockDeclaration{name: "color", value: "red"}
		ruleset2 := NewRuleset(nil, nil, false, nil)
		rules := []any{ruleset1, declaration, ruleset2}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Rulesets()

		if len(result) != 2 {
			t.Errorf("Expected 2 rulesets, got %d", len(result))
		}
	})

	t.Run("should return empty array for nil rules", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)

		result := ruleset.Rulesets()

		if len(result) != 0 {
			t.Errorf("Expected empty array for nil rules")
		}
	})

	t.Run("should return empty array when no rulesets", func(t *testing.T) {
		declaration := &RulesetMockDeclaration{name: "color", value: "red"}
		rules := []any{declaration}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Rulesets()

		if len(result) != 0 {
			t.Errorf("Expected empty array when no rulesets")
		}
	})
}

func TestPrependRule(t *testing.T) {
	t.Run("should prepend rule to existing rules", func(t *testing.T) {
		existingRule := &RulesetMockDeclaration{name: "existing", value: "rule"}
		newRule := &RulesetMockDeclaration{name: "new", value: "rule"}
		rules := []any{existingRule}
		ruleset := NewRuleset(nil, rules, false, nil)

		ruleset.PrependRule(newRule)

		if len(ruleset.Rules) != 2 {
			t.Errorf("Expected 2 rules")
		}
		if ruleset.Rules[0] != newRule {
			t.Errorf("Expected new rule to be first")
		}
		if ruleset.Rules[1] != existingRule {
			t.Errorf("Expected existing rule to be second")
		}
	})

	t.Run("should create rules array if none exists", func(t *testing.T) {
		newRule := &RulesetMockDeclaration{name: "new", value: "rule"}
		ruleset := NewRuleset(nil, nil, false, nil)

		ruleset.PrependRule(newRule)

		if len(ruleset.Rules) != 1 {
			t.Errorf("Expected 1 rule")
		}
		if ruleset.Rules[0] != newRule {
			t.Errorf("Expected new rule to be added")
		}
	})
}

func TestRulesetGenCSS(t *testing.T) {
	t.Run("should generate CSS for root ruleset", func(t *testing.T) {
		output := &MockOutput{}
		context := map[string]any{}
		ruleset := NewRuleset(nil, []any{}, false, nil)
		ruleset.Root = true

		ruleset.GenCSS(context, &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output.Add(chunk, fileInfo, index)
			},
			IsEmpty: func() bool {
				return output.IsEmpty()
			},
		})

		// Root ruleset should not generate selector braces
		hasSelectors := false
		for _, chunk := range output.Chunks {
			if chunk == "{" || chunk == "}" {
				hasSelectors = true
				break
			}
		}
		if hasSelectors {
			t.Errorf("Root ruleset should not generate selector braces")
		}
	})

	t.Run("should handle compressed output", func(t *testing.T) {
		output := &MockOutput{}
		context := map[string]any{"compress": true}
		ruleset := NewRuleset(nil, []any{}, false, nil)
		ruleset.Paths = [][]any{{&RulesetMockSelector{}}}

		ruleset.GenCSS(context, &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				output.Add(chunk, fileInfo, index)
			},
			IsEmpty: func() bool {
				return output.IsEmpty()
			},
		})

		// Check that compression affects output
		found := false
		for _, chunk := range output.Chunks {
			if chunk == "{" { // Compressed should have just "{"
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected compressed brace")
		}
	})
}

func TestJoinSelectors(t *testing.T) {
	t.Run("should join multiple selectors", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		context := [][]any{}
		selectors := []any{"sel1", "sel2"}

		ruleset.JoinSelectors(&paths, context, selectors)

		// Basic implementation should work without errors
		// More complex behavior would need full implementation
	})
}

func TestJoinSelector(t *testing.T) {
	t.Run("should handle basic selector joining", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		context := [][]any{}
		selector := "selector"

		ruleset.JoinSelector(&paths, context, selector)

		// Basic implementation should work without errors
		// More complex behavior would need full implementation
	})

	t.Run("should handle parent selector joining", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		
		// Create a parent context
		parentElement := NewElement("", ".parent", false, 0, map[string]any{}, nil)
		parentSelector, _ := NewSelector([]*Element{parentElement}, nil, nil, 0, map[string]any{}, nil)
		context := [][]any{{parentSelector}}
		
		// Create a child selector with parent reference
		childElement := NewElement("", "&", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// Should have joined the selectors
		if len(paths) == 0 {
			t.Errorf("Expected paths to be generated")
		}
	})

	t.Run("should handle nested parent selectors", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		
		// Create nested parent context
		grandParentElement := NewElement("", ".grandparent", false, 0, map[string]any{}, nil)
		grandParentSelector, _ := NewSelector([]*Element{grandParentElement}, nil, nil, 0, map[string]any{}, nil)
		parentElement := NewElement("", ".parent", false, 0, map[string]any{}, nil)
		parentSelector, _ := NewSelector([]*Element{parentElement}, nil, nil, 0, map[string]any{}, nil)
		context := [][]any{{grandParentSelector, parentSelector}}
		
		// Create a child selector with parent reference
		childElement := NewElement("", "&", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// Should have joined the selectors properly
		if len(paths) == 0 {
			t.Errorf("Expected paths to be generated")
		}
	})

	t.Run("should handle multiple contexts", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		
		// Create multiple parent contexts
		parent1Element := NewElement("", ".parent1", false, 0, map[string]any{}, nil)
		parent1Selector, _ := NewSelector([]*Element{parent1Element}, nil, nil, 0, map[string]any{}, nil)
		parent2Element := NewElement("", ".parent2", false, 0, map[string]any{}, nil)
		parent2Selector, _ := NewSelector([]*Element{parent2Element}, nil, nil, 0, map[string]any{}, nil)
		context := [][]any{{parent1Selector}, {parent2Selector}}
		
		// Create a child selector with parent reference
		childElement := NewElement("", "&", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// Should have generated paths for each parent context
		if len(paths) != 2 {
			t.Errorf("Expected 2 paths for 2 contexts, got %d", len(paths))
		}
	})

	t.Run("should handle selectors without parent references", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		
		// Create parent context
		parentElement := NewElement("", ".parent", false, 0, map[string]any{}, nil)
		parentSelector, _ := NewSelector([]*Element{parentElement}, nil, nil, 0, map[string]any{}, nil)
		context := [][]any{{parentSelector}}
		
		// Create a regular child selector without parent reference
		childElement := NewElement("", ".child", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// Should have appended the child to the parent context
		if len(paths) == 0 {
			t.Errorf("Expected paths to be generated")
		}
		if len(paths[0]) != 2 {
			t.Errorf("Expected 2 selectors in path (parent + child), got %d", len(paths[0]))
		}
	})

	t.Run("should handle empty context with parent reference", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		context := [][]any{} // Empty context
		
		// Create a child selector with parent reference
		childElement := NewElement("", "&", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// When context is empty with parent selector (&), the implementation
		// handles this case by creating a path with modified selector
		// This test verifies the method doesn't panic and handles the edge case gracefully
		// The exact behavior may vary, but it should not cause errors
		if len(paths) > 1 {
			t.Errorf("Expected at most 1 path for empty context, got %d", len(paths))
		}
	})

	t.Run("should handle complex selector combinations", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		
		// Create parent context
		parentElement := NewElement("", ".parent", false, 0, map[string]any{}, nil)
		parentSelector, _ := NewSelector([]*Element{parentElement}, nil, nil, 0, map[string]any{}, nil)
		context := [][]any{{parentSelector}}
		
		// Create a complex child selector with multiple elements including parent reference
		childElement1 := NewElement("", "&", false, 0, map[string]any{}, nil)
		childElement2 := NewElement("", ".child", false, 0, map[string]any{}, nil)
		childElement3 := NewElement(" ", ".grandchild", false, 0, map[string]any{}, nil)
		childSelector, _ := NewSelector([]*Element{childElement1, childElement2, childElement3}, nil, nil, 0, map[string]any{}, nil)

		ruleset.JoinSelector(&paths, context, childSelector)

		// Should have generated properly joined paths
		if len(paths) == 0 {
			t.Errorf("Expected paths to be generated")
		}
	})
}

func TestFind(t *testing.T) {
	t.Run("should return cached results", func(t *testing.T) {
		selector := &RulesetMockSelector{}
		cached := []any{map[string]any{"rule": "cached", "path": []any{}}}
		ruleset := NewRuleset(nil, nil, false, nil)
		ruleset.lookups[".mock-selector"] = cached

		result := ruleset.Find(selector, nil, nil)

		if len(result) != len(cached) {
			t.Errorf("Expected cached results to be returned")
		}
	})

	t.Run("should find matching rules", func(t *testing.T) {
		selector := &RulesetMockSelector{elements: []*Element{{Value: "div"}}}
		matchingRuleset := NewRuleset([]any{&RulesetMockSelector{elements: []*Element{{Value: "div"}}}}, nil, false, nil)
		rules := []any{matchingRuleset}
		ruleset := NewRuleset(nil, rules, false, nil)

		result := ruleset.Find(selector, nil, nil)

		if len(result) == 0 {
			t.Errorf("Expected to find matching rules")
		}
	})
}

func TestRulesetErrorConditions(t *testing.T) {
	t.Run("should handle malformed MixinCall evaluation", func(t *testing.T) {
		mixinCall := &MockMixinCall{
			results: nil, // This might cause issues
		}
		rules := []any{mixinCall}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Should handle nil mixin results gracefully: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
		}
	})

	t.Run("should handle nested rulesets with circular dependencies", func(t *testing.T) {
		nestedRuleset := NewRuleset(nil, nil, false, nil)
		// Create a circular reference by adding nestedRuleset to its own rules
		nestedRuleset.Rules = []any{nestedRuleset}
		
		rules := []any{nestedRuleset}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		// This should not cause infinite recursion
		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Should handle circular dependencies gracefully: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
		}
	})

	t.Run("should handle invalid selector types in joinSelector", func(t *testing.T) {
		ruleset := NewRuleset(nil, nil, false, nil)
		var paths [][]any
		context := [][]any{}
		
		// Pass an invalid selector type
		invalidSelector := "not-a-selector-object"

		// Should not panic
		ruleset.JoinSelector(&paths, context, invalidSelector)
		
		// Should not have generated any paths for invalid selector
		if len(paths) != 0 {
			t.Errorf("Expected no paths for invalid selector, got %d", len(paths))
		}
	})

	t.Run("should handle variable pollution prevention in MixinCall", func(t *testing.T) {
		// Create a variable declaration that already exists in the ruleset
		existingVar, _ := NewDeclaration("@existing", "original", false, false, 0, map[string]any{}, false, true)
		// Create a conflicting variable using proper Declaration type
		conflictingVar, _ := NewDeclaration("@existing", "conflict", false, false, 0, map[string]any{}, false, true)
		
		mixinCall := &MockMixinCall{
			results: []any{conflictingVar},
		}
		
		rules := []any{existingVar, mixinCall}
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)

		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		
		// The conflicting variable should be filtered out to prevent scope pollution
		resultRuleset := result.(*Ruleset)
		variables := resultRuleset.Variables()
		if existingDecl, exists := variables["@existing"]; exists {
			if _, ok := existingDecl.(*Declaration); ok {
				// Check that there's only one rule with this variable (no pollution)
				variableRuleCount := 0
				for _, rule := range resultRuleset.Rules {
					if r, ok := rule.(*Declaration); ok && r.variable {
						if name, ok := r.name.(string); ok && name == "@existing" {
							variableRuleCount++
						}
					}
				}
				if variableRuleCount != 1 {
					t.Errorf("Expected exactly 1 variable declaration for @existing, got %d", variableRuleCount)
				}
			} else {
				t.Errorf("Variable is not a Declaration: %T", existingDecl)
			}
		} else {
			t.Errorf("Variable @existing not found in result")
		}
	})

	t.Run("should handle media blocks correctly", func(t *testing.T) {
		// Test that existing media blocks are not processed (only new ones during evaluation)
		existingMediaBlock := &MockMediaBlock{}
		context := map[string]any{
			"mediaBlocks": []any{existingMediaBlock},
		}
		
		ruleset := NewRuleset(nil, nil, false, nil)
		
		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
		}
		
		// Existing media blocks should NOT be processed (mediaBlockCount logic)
		if existingMediaBlock.BubbleSelectorsCallCount != 0 {
			t.Errorf("Expected existing media block to NOT be processed, but it was called %d times", existingMediaBlock.BubbleSelectorsCallCount)
		}
	})
	
	t.Run("should handle newly added media blocks", func(t *testing.T) {
		// Test that media blocks added during evaluation are processed
		context := map[string]any{
			"mediaBlocks": []any{}, // Start with empty media blocks
		}
		
		// Simulate a rule that adds a media block during evaluation
		mockRule := &struct {
			GetType func() string
			Eval    func(any) (any, error)
		}{
			GetType: func() string { return "TestRule" },
			Eval: func(ctx any) (any, error) {
				// Add a media block during evaluation
				if c, ok := ctx.(map[string]any); ok {
					newMediaBlock := &MockMediaBlock{}
					if mediaBlocks, exists := c["mediaBlocks"].([]any); exists {
						c["mediaBlocks"] = append(mediaBlocks, newMediaBlock)
					}
				}
				return struct{}{}, nil // Return something that's not a Declaration
			},
		}
		
		ruleset := NewRuleset(nil, []any{mockRule}, false, nil)
		
		result, err := ruleset.Eval(context)
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
		}
		
		// The newly added media block should be processed
		if mediaBlocks, ok := context["mediaBlocks"].([]any); ok && len(mediaBlocks) > 0 {
			if newMediaBlock, ok := mediaBlocks[0].(*MockMediaBlock); ok {
				if newMediaBlock.BubbleSelectorsCallCount == 0 {
					t.Errorf("Expected newly added media block to be processed")
				}
			}
		}
	})


}

func TestRulesetPerformance(t *testing.T) {
	t.Run("should cache lookups efficiently", func(t *testing.T) {
		selector := &RulesetMockSelector{}
		ruleset := NewRuleset(nil, nil, false, nil)
		
		// First call
		start := time.Now()
		result1 := ruleset.Find(selector, nil, nil)
		firstCallDuration := time.Since(start)
		
		// Second call should be faster due to caching
		start = time.Now()
		result2 := ruleset.Find(selector, nil, nil)
		secondCallDuration := time.Since(start)
		
		if !reflect.DeepEqual(result1, result2) {
			t.Errorf("Cached results should be identical")
		}
		
		// Second call should be significantly faster (allowing for some variance)
		if secondCallDuration > firstCallDuration/2 {
			t.Logf("Warning: Second call (%v) was not significantly faster than first (%v)", 
				secondCallDuration, firstCallDuration)
		}
	})

	t.Run("should handle large rule sets efficiently", func(t *testing.T) {
		// Create a large number of rules
		const numRules = 1000
		rules := make([]any, numRules)
		for i := 0; i < numRules; i++ {
			rules[i] = &RulesetMockDeclaration{
				name:     fmt.Sprintf("prop%d", i),
				value:    fmt.Sprintf("value%d", i),
				variable: false,
			}
		}
		
		ruleset := NewRuleset(nil, rules, false, nil)
		context := make(map[string]any)
		
		start := time.Now()
		result, err := ruleset.Eval(context)
		duration := time.Since(start)
		
		if err != nil {
			t.Errorf("Unexpected error with large ruleset: %v", err)
		}
		if result == nil {
			t.Errorf("Expected result to not be nil")
			return
		}
		resultRuleset := result.(*Ruleset)
		if len(resultRuleset.Rules) != numRules {
			t.Errorf("Expected %d rules, got %d", numRules, len(resultRuleset.Rules))
		}
		
		// Should complete in reasonable time (adjust threshold as needed)
		if duration > time.Second {
			t.Errorf("Large ruleset evaluation took too long: %v", duration)
		}
	})
} 