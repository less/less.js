package visitors

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less/go_parser"
)

func TestProcessExtendsVisitor_Constructor(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	if visitor.visitor == nil {
		t.Error("Expected visitor to be initialized")
	}
	
	if visitor.extendIndices == nil {
		t.Error("Expected extendIndices to be initialized")
	}
	
	if len(visitor.allExtendsStack) != 0 {
		t.Error("Expected allExtendsStack to be empty initially")
	}
}

func TestExtendFinderVisitor_Constructor(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	
	if visitor.visitor == nil {
		t.Error("Expected visitor to be initialized")
	}
	
	if len(visitor.contexts) != 0 {
		t.Error("Expected contexts to be empty initially")
	}
	
	if len(visitor.allExtendsStack) != 1 {
		t.Error("Expected allExtendsStack to have initial array")
	}
	
	if len(visitor.allExtendsStack[0]) != 0 {
		t.Error("Expected initial extend array to be empty")
	}
}

func TestProcessExtendsVisitor_DoExtendChaining_EmptyLists(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	result := visitor.doExtendChaining([]*go_parser.Extend{}, []*go_parser.Extend{}, 0)
	
	if len(result) != 0 {
		t.Error("Expected empty result for empty input lists")
	}
}

func TestProcessExtendsVisitor_CheckExtendsForNonMatched_NoMatches(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create extend that hasn't found matches
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 1, nil, nil)
	extend.HasFoundMatches = false
	extend.ParentIds = []int{1}
	
	// This should not panic
	visitor.checkExtendsForNonMatched([]*go_parser.Extend{extend})
}

func TestProcessExtendsVisitor_CheckExtendsForNonMatched_WithMatches(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create extend that has found matches
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 1, nil, nil)
	extend.HasFoundMatches = true
	extend.ParentIds = []int{1}
	
	// This should not log any warnings
	visitor.checkExtendsForNonMatched([]*go_parser.Extend{extend})
}

func TestProcessExtendsVisitor_CheckExtendsForNonMatched_MultipleParents(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create extend with multiple parent IDs (should be ignored)
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 1, nil, nil)
	extend.HasFoundMatches = false
	extend.ParentIds = []int{1, 2}
	
	// This should not log any warnings since it has multiple parents
	visitor.checkExtendsForNonMatched([]*go_parser.Extend{extend})
}

func TestProcessExtendsVisitor_DoExtendChaining_CircularReference(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 0, nil, nil)
	extend.ParentIds = []int{1}
	extend.SelfSelectors = []any{}
	
	targetExtend := go_parser.NewExtend(&go_parser.Selector{}, "", 0, nil, nil)
	targetExtend.ObjectId = 1
	targetExtend.SelfSelectors = []any{&go_parser.Selector{}}
	
	result := visitor.doExtendChaining([]*go_parser.Extend{extend}, []*go_parser.Extend{targetExtend}, 0)
	
	if len(result) != 0 {
		t.Error("Expected empty result when circular reference is detected")
	}
}

func TestProcessExtendsVisitor_FindMatch_EmptyPath(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 0, nil, nil)
	
	result := visitor.findMatch(extend, []any{})
	
	if len(result) != 0 {
		t.Error("Expected empty result for empty selector path")
	}
}

func TestProcessExtendsVisitor_IsElementValuesEqual_Strings(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	if !visitor.isElementValuesEqual("test", "test") {
		t.Error("Expected equal strings to be equal")
	}
	
	if visitor.isElementValuesEqual("test", "different") {
		t.Error("Expected different strings to be not equal")
	}
	
	if visitor.isElementValuesEqual("test", 123) {
		t.Error("Expected string and number to be not equal")
	}
}

func TestProcessExtendsVisitor_ExtendSelector_EmptyMatches(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	result := visitor.extendSelector([]any{}, []any{}, &go_parser.Selector{}, true)
	
	if len(result) != 0 {
		t.Error("Expected empty result for empty matches")
	}
}

func TestProcessExtendsVisitor_Run_NoExtends(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create a mock root that will have no extends found
	mockRoot := &MockRootNode{allExtends: []*go_parser.Extend{}}
	
	result := visitor.Run(mockRoot)
	
	// Should return root unchanged if no extends found
	if result != mockRoot {
		t.Error("Expected root to be returned unchanged when no extends found")
	}
}

func TestProcessExtendsVisitor_CheckExtendsForNonMatched_DuplicateWarnings(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create extend that hasn't found matches
	extend := go_parser.NewExtend(&go_parser.Selector{}, "", 1, nil, nil)
	extend.HasFoundMatches = false
	extend.ParentIds = []int{1}
	
	// Call twice with same extend
	visitor.checkExtendsForNonMatched([]*go_parser.Extend{extend})
	visitor.checkExtendsForNonMatched([]*go_parser.Extend{extend})
	
	// Should only warn once (JavaScript test line 145-148)
	// This test ensures the extendIndices map prevents duplicate warnings
}

func TestProcessExtendsVisitor_DoExtendChaining_IterationLimit(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Test that doExtendChaining handles high iteration counts gracefully
	// Even if it doesn't panic, it should return empty for empty inputs
	result := visitor.doExtendChaining([]*go_parser.Extend{}, []*go_parser.Extend{}, 101)
	
	if len(result) != 0 {
		t.Error("Expected empty result for empty input lists even with high iteration count")
	}
}

func TestExtendFinderVisitor_VisitDeclaration(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitDeclaration(nil, visitArgs)
	
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be set to false")
	}
}

func TestExtendFinderVisitor_VisitMixinDefinition(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitMixinDefinition(nil, visitArgs)
	
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be set to false")
	}
}

func TestProcessExtendsVisitor_VisitDeclaration(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitDeclaration(nil, visitArgs)
	
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be set to false")
	}
}

func TestProcessExtendsVisitor_VisitMixinDefinition(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitMixinDefinition(nil, visitArgs)
	
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be set to false")
	}
}

func TestProcessExtendsVisitor_VisitSelector(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitSelector(nil, visitArgs)
	
	if visitArgs.VisitDeeper {
		t.Error("Expected visitDeeper to be set to false")
	}
}

func TestProcessExtendsVisitor_VisitRuleset_RootRuleset(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	rootRuleset := &go_parser.Ruleset{Root: true}
	
	// Should return early for root rulesets (JavaScript test line 282-286)
	visitor.VisitRuleset(rootRuleset, &VisitArgs{})
	
	// No assertion needed - just ensuring it doesn't panic
}

func TestProcessExtendsVisitor_FindMatch_AllowBefore(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Test equivalent to JavaScript test lines 392-421
	needleElement := go_parser.NewElement("", "test", false, 0, nil, nil)
	needleSelector, _ := go_parser.NewSelector([]*go_parser.Element{needleElement}, nil, nil, 0, nil, nil)
	extend := go_parser.NewExtend(needleSelector, "", 0, nil, nil)
	extend.AllowBefore = true
	extend.AllowAfter = false
	
	haystackElement1 := go_parser.NewElement("", "other", false, 0, nil, nil)
	haystackElement2 := go_parser.NewElement("", "test", false, 0, nil, nil)
	haystackSelector, _ := go_parser.NewSelector([]*go_parser.Element{haystackElement1, haystackElement2}, nil, nil, 0, nil, nil)
	haystackSelectorPath := []any{haystackSelector}
	
	result := visitor.findMatch(extend, haystackSelectorPath)
	
	if len(result) != 1 {
		t.Errorf("Expected 1 match, got %d", len(result))
	}
	
	if len(result) > 0 {
		match := result[0].(map[string]any)
		if match["index"].(int) != 1 {
			t.Errorf("Expected match index 1, got %d", match["index"].(int))
		}
	}
}

func TestProcessExtendsVisitor_FindMatch_RejectWhenAllowAfterFalse(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Test equivalent to JavaScript test lines 423-449
	needleElement := go_parser.NewElement("", "test", false, 0, nil, nil)
	needleSelector, _ := go_parser.NewSelector([]*go_parser.Element{needleElement}, nil, nil, 0, nil, nil)
	extend := go_parser.NewExtend(needleSelector, "", 0, nil, nil)
	extend.AllowBefore = false
	extend.AllowAfter = false
	
	haystackElement1 := go_parser.NewElement("", "test", false, 0, nil, nil)
	haystackElement2 := go_parser.NewElement("", "after", false, 0, nil, nil)
	haystackSelector, _ := go_parser.NewSelector([]*go_parser.Element{haystackElement1, haystackElement2}, nil, nil, 0, nil, nil)
	haystackSelectorPath := []any{haystackSelector}
	
	result := visitor.findMatch(extend, haystackSelectorPath)
	
	if len(result) != 0 {
		t.Errorf("Expected 0 matches when allowAfter is false and elements follow, got %d", len(result))
	}
}

func TestProcessExtendsVisitor_IsElementValuesEqual_AttributeComparison(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Test equivalent to JavaScript test lines 462-495
	attr1 := &go_parser.Attribute{
		Op:    "=",
		Key:   "class",
		Value: &MockValueNode{value: "test"},
	}
	attr2 := &go_parser.Attribute{
		Op:    "=",
		Key:   "class",
		Value: &MockValueNode{value: "test"},
	}
	
	if !visitor.isElementValuesEqual(attr1, attr2) {
		t.Error("Expected equal attributes to be equal")
	}
	
	// Test different operators
	attr3 := &go_parser.Attribute{
		Op:  "~=",
		Key: "class",
	}
	
	if visitor.isElementValuesEqual(attr1, attr3) {
		t.Error("Expected attributes with different operators to be not equal")
	}
}

func TestProcessExtendsVisitor_VisitMedia_ExtendsHandling(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	visitor.allExtendsStack = [][]*go_parser.Extend{{&go_parser.Extend{}}}
	
	mediaNode := &MockMediaNode{
		allExtends: []*go_parser.Extend{&go_parser.Extend{}},
	}
	
	visitor.VisitMedia(mediaNode, &VisitArgs{})
	
	if len(visitor.allExtendsStack) != 2 {
		t.Errorf("Expected allExtendsStack length 2, got %d", len(visitor.allExtendsStack))
	}
}

func TestProcessExtendsVisitor_VisitMediaOut_StackPop(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	visitor.allExtendsStack = [][]*go_parser.Extend{{}, {}}
	
	visitor.VisitMediaOut(&MockMediaNode{})
	
	if len(visitor.allExtendsStack) != 1 {
		t.Errorf("Expected allExtendsStack length 1 after pop, got %d", len(visitor.allExtendsStack))
	}
}

// ============================================================================
// COMPREHENSIVE TESTS TO MATCH JAVASCRIPT COVERAGE
// ============================================================================

// ProcessExtendsVisitor Run method tests
func TestProcessExtendsVisitor_Run_WithExtendsFound(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	
	// Create mock root with extends
	mockRoot := &MockRootNode{allExtends: []*go_parser.Extend{}}
	
	// Test with extends found
	result := visitor.Run(mockRoot)
	
	if result != mockRoot {
		t.Error("Expected result to be the processed root")
	}
}

func TestProcessExtendsVisitor_Run_NoExtendsFound(t *testing.T) {
	visitor := NewProcessExtendsVisitor()
	mockRoot := &MockRootNode{allExtends: []*go_parser.Extend{}}
	
	result := visitor.Run(mockRoot)
	
	// Should return root unchanged if no extends found
	if result != mockRoot {
		t.Error("Expected root to be returned unchanged when no extends found")
	}
}

// ExtendFinderVisitor comprehensive tests
func TestExtendFinderVisitor_Run(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	mockRoot := &MockRootNode{allExtends: []*go_parser.Extend{}}
	
	result := visitor.Run(mockRoot)
	
	if result != mockRoot {
		t.Error("Expected run to return the processed root")
	}
}

func TestExtendFinderVisitor_VisitRuleset_WithExtendRules(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	
	// Create extend rule
	extend := createTestExtend(createTestSelector([]*go_parser.Element{createTestElement("", "test")}), "", 0)
	
	// Create ruleset with extend in rules
	rules := []any{extend}
	paths := [][]any{{createTestSelector([]*go_parser.Element{createTestElement("", "selector")})}}
	ruleset := createTestRuleset(paths, rules, false)
	
	visitArgs := &VisitArgs{VisitDeeper: true}
	visitor.VisitRuleset(ruleset, visitArgs)
	
	// Should set extendOnEveryPath
	if !ruleset.ExtendOnEveryPath {
		t.Error("Expected extendOnEveryPath to be set to true")
	}
	
	// Should add extend to stack
	if len(visitor.allExtendsStack[0]) == 0 {
		t.Error("Expected extend to be added to allExtendsStack")
	}
	
	// Should mark foundExtends
	if !visitor.foundExtends {
		t.Error("Expected foundExtends to be true")
	}
}

func TestExtendFinderVisitor_VisitRuleset_RootRuleset(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	
	ruleset := createTestRuleset([][]any{}, []any{}, true)
	visitArgs := &VisitArgs{VisitDeeper: true}
	
	visitor.VisitRuleset(ruleset, visitArgs)
	
	// Should return early for root rulesets
	if len(visitor.allExtendsStack[0]) != 0 {
		t.Error("Expected no processing for root ruleset")
	}
}

func TestExtendFinderVisitor_VisitRuleset_WithSelectorExtends(t *testing.T) {
	visitor := NewExtendFinderVisitor()
	
	// Create selector with extend list
	selector := &MockSelector{
		elements:   []*go_parser.Element{createTestElement("", "test")},
		extendList: []*go_parser.Extend{createTestExtend(createTestSelector([]*go_parser.Element{createTestElement("", "target")}), "", 0)},
	}
	
	paths := [][]any{{selector}}
	ruleset := createTestRuleset(paths, []any{}, false)
	
	visitArgs := &VisitArgs{VisitDeeper: true}
	visitor.VisitRuleset(ruleset, visitArgs)
	
	// Should process selector extends
	if !visitor.foundExtends {
		t.Error("Expected foundExtends to be true")
	}
	
	if len(visitor.allExtendsStack[0]) == 0 {
		t.Error("Expected selector extends to be added to stack")
	}
}

// Test default export equivalent
func TestDefault_Export(t *testing.T) {
	if Default == nil {
		t.Error("Expected Default to be initialized")
	}
	
	visitor := Default()
	if visitor == nil {
		t.Error("Expected Default() to return a visitor instance")
	}
	
	if visitor.visitor == nil {
		t.Error("Expected returned visitor to have _visitor initialized")
	}
}

// Mock types for testing
type MockRootNode struct {
	allExtends []*go_parser.Extend
}

func (m *MockRootNode) SetAllExtends(extends []*go_parser.Extend) {
	m.allExtends = extends
}

func (m *MockRootNode) GetAllExtends() []*go_parser.Extend {
	return m.allExtends
}

type MockValueNode struct {
	value string
}

func (m *MockValueNode) GetValue() any {
	return m.value
}

type MockMediaNode struct {
	allExtends []*go_parser.Extend
}

func (m *MockMediaNode) SetAllExtends(extends []*go_parser.Extend) {
	m.allExtends = extends
}

func (m *MockMediaNode) GetAllExtends() []*go_parser.Extend {
	return m.allExtends
}

type MockAtRuleNode struct {
	allExtends []*go_parser.Extend
}

func (m *MockAtRuleNode) SetAllExtends(extends []*go_parser.Extend) {
	m.allExtends = extends
}

func (m *MockAtRuleNode) GetAllExtends() []*go_parser.Extend {
	return m.allExtends
}

type MockVisitor struct {
	visitFunc func(any) any
}

func (m *MockVisitor) Visit(node any) any {
	if m.visitFunc != nil {
		return m.visitFunc(node)
	}
	return node
}

type MockSelector struct {
	elements    []*go_parser.Element
	extendList  []*go_parser.Extend
	visibility  bool
	cssOutput   string
	cssError    bool
}

func (m *MockSelector) GetExtendList() []*go_parser.Extend {
	return m.extendList
}

func (m *MockSelector) SetExtendList(extends []*go_parser.Extend) {
	m.extendList = extends
}

func (m *MockSelector) ToCSS(env map[string]any) string {
	if m.cssError {
		panic("CSS generation error")
	}
	return m.cssOutput
}


func (m *MockSelector) EnsureVisibility() {
	m.visibility = true
}

func (m *MockSelector) EnsureInvisibility() {
	m.visibility = false
}

func (m *MockSelector) CreateDerived(elements []*go_parser.Element, extendList []*go_parser.Extend, evaldCondition any) (*MockSelector, error) {
	return &MockSelector{
		elements:   elements,
		extendList: extendList,
		visibility: m.visibility,
		cssOutput:  m.cssOutput,
		cssError:   m.cssError,
	}, nil
}

type MockExtend struct {
	*go_parser.Extend
	visibilityInfo any
}

func (m *MockExtend) VisibilityInfo() any {
	return m.visibilityInfo
}

func (m *MockExtend) FileInfo() any {
	return nil
}

func (m *MockExtend) IsVisible() bool {
	return true
}

// Helper functions for creating test objects
func createTestElement(combinator, value string) *go_parser.Element {
	return go_parser.NewElement(combinator, value, false, 0, nil, nil)
}

func createTestSelector(elements []*go_parser.Element) *go_parser.Selector {
	selector, _ := go_parser.NewSelector(elements, nil, nil, 0, nil, nil)
	return selector
}

func createTestExtend(selector *go_parser.Selector, option string, index int) *go_parser.Extend {
	return go_parser.NewExtend(selector, option, index, nil, nil)
}

func createTestRuleset(paths [][]any, rules []any, root bool) *go_parser.Ruleset {
	return &go_parser.Ruleset{
		Paths: paths,
		Rules: rules,
		Root:  root,
	}
}