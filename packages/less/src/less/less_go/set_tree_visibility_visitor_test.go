package less_go

import (
	"testing"
)

// Mock node for testing
type VisibilityMockNode struct {
	Type                     string
	BlocksVisibilityValue    bool
	BlocksVisibilityWasCalled bool
	EnsureVisibilityWasCalled bool
	EnsureInvisibilityWasCalled bool
	AcceptWasCalled          bool
	AcceptedVisitor          any
	HasBlocksVisibilityMethod bool
}

func (m *VisibilityMockNode) BlocksVisibility() bool {
	if !m.HasBlocksVisibilityMethod {
		panic("BlocksVisibility method called but not available")
	}
	m.BlocksVisibilityWasCalled = true
	return m.BlocksVisibilityValue
}

func (m *VisibilityMockNode) EnsureVisibility() {
	m.EnsureVisibilityWasCalled = true
}

func (m *VisibilityMockNode) EnsureInvisibility() {
	m.EnsureInvisibilityWasCalled = true
}

func (m *VisibilityMockNode) Accept(visitor any) {
	m.AcceptWasCalled = true
	m.AcceptedVisitor = visitor
}

// Mock node without methods for testing error cases
type IncompleteNode struct {
	Type                     string
	BlocksVisibilityValue    bool
	HasBlocksVisibilityMethod bool
	AcceptWasCalled          bool
}

func (i *IncompleteNode) BlocksVisibility() bool {
	if !i.HasBlocksVisibilityMethod {
		panic("BlocksVisibility method called but not available")
	}
	return i.BlocksVisibilityValue
}

func (i *IncompleteNode) Accept(visitor any) {
	// Accept exists but no ensure methods
	i.AcceptWasCalled = true
}

// SimpleNode represents a node without a blocksVisibility method at all
type SimpleNode struct {
	Type                      string
	EnsureVisibilityWasCalled bool
	AcceptWasCalled          bool
	AcceptedVisitor          any
}

func (s *SimpleNode) EnsureVisibility() {
	s.EnsureVisibilityWasCalled = true
}

func (s *SimpleNode) Accept(visitor any) {
	s.AcceptWasCalled = true
	s.AcceptedVisitor = visitor
}

func TestSetTreeVisibilityVisitor_Constructor(t *testing.T) {
	t.Run("should initialize with visible true", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(true)
		if visitor.visible != true {
			t.Errorf("Expected visible to be true, got %v", visitor.visible)
		}
	})

	t.Run("should initialize with visible false", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(false)
		if visitor.visible != false {
			t.Errorf("Expected visible to be false, got %v", visitor.visible)
		}
	})

	t.Run("should initialize with falsy values", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(nil)
		if visitor.visible != nil {
			t.Errorf("Expected visible to be nil, got %v", visitor.visible)
		}

		visitor = NewSetTreeVisibilityVisitor(0)
		if visitor.visible != 0 {
			t.Errorf("Expected visible to be 0, got %v", visitor.visible)
		}
	})
}

func TestSetTreeVisibilityVisitor_Run(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should call visit with the root node", func(t *testing.T) {
		mockRoot := &SimpleNode{Type: "root"}
		
		// We can't easily spy on Visit method in Go, so we'll check the side effects
		visitor.Run(mockRoot)
		
		// The root should have had its methods called since it doesn't block visibility
		if !mockRoot.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility to be called")
		}
		if !mockRoot.AcceptWasCalled {
			t.Error("Expected Accept to be called")
		}
	})

	t.Run("should handle nil root", func(t *testing.T) {
		// Should not panic
		visitor.Run(nil)
	})
}

func TestSetTreeVisibilityVisitor_VisitArray(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should return nil when given nil", func(t *testing.T) {
		result := visitor.VisitArray(nil)
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("should return empty array unchanged", func(t *testing.T) {
		emptyArray := []any{}
		result := visitor.VisitArray(emptyArray)
		if result == nil {
			t.Error("Expected non-nil result")
		}
		// Check that it's still an empty array
		if resultSlice, ok := result.([]any); !ok || len(resultSlice) != 0 {
			t.Error("Expected empty array result")
		}
	})

	t.Run("should visit each node in array", func(t *testing.T) {
		mockNode1 := &VisibilityMockNode{
			Type: "node1",
			HasBlocksVisibilityMethod: true,
			BlocksVisibilityValue: false,
		}
		mockNode2 := &VisibilityMockNode{
			Type: "node2",
			HasBlocksVisibilityMethod: true,
			BlocksVisibilityValue: false,
		}
		mockNode3 := &VisibilityMockNode{
			Type: "node3",
			HasBlocksVisibilityMethod: true,
			BlocksVisibilityValue: false,
		}
		nodes := []any{mockNode1, mockNode2, mockNode3}
		
		result := visitor.VisitArray(nodes)
		
		if result == nil {
			t.Error("Expected non-nil result")
		}
		
		// Check that all nodes were processed
		if !mockNode1.EnsureVisibilityWasCalled {
			t.Error("Expected node1 EnsureVisibility to be called")
		}
		if !mockNode2.EnsureVisibilityWasCalled {
			t.Error("Expected node2 EnsureVisibility to be called")
		}
		if !mockNode3.EnsureVisibilityWasCalled {
			t.Error("Expected node3 EnsureVisibility to be called")
		}
	})

	t.Run("should handle array with nil elements", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type: "node",
			HasBlocksVisibilityMethod: true,
			BlocksVisibilityValue: false,
		}
		nodes := []any{nil, mockNode}
		
		result := visitor.VisitArray(nodes)
		
		if result == nil {
			t.Error("Expected non-nil result")
		}
		
		// Only the non-nil node should be processed
		if !mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected node EnsureVisibility to be called")
		}
	})

	t.Run("should preserve array length and order", func(t *testing.T) {
		originalArray := []any{
			&VisibilityMockNode{
				Type: "first",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
			&VisibilityMockNode{
				Type: "second",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
			&VisibilityMockNode{
				Type: "third",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
			&VisibilityMockNode{
				Type: "fourth",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
		}
		
		result := visitor.VisitArray(originalArray)
		
		if result == nil {
			t.Error("Expected non-nil result")
		}
		
		resultSlice := result.([]any)
		if len(resultSlice) != 4 {
			t.Errorf("Expected length 4, got %d", len(resultSlice))
		}
		
		if first, ok := resultSlice[0].(*VisibilityMockNode); !ok || first.Type != "first" {
			t.Error("First element not preserved")
		}
		if fourth, ok := resultSlice[3].(*VisibilityMockNode); !ok || fourth.Type != "fourth" {
			t.Error("Fourth element not preserved")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_NullAndUndefinedHandling(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should return nil when given nil", func(t *testing.T) {
		result := visitor.Visit(nil)
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_ArrayHandling(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should call visitArray for array nodes", func(t *testing.T) {
		arrayNode := []any{
			&VisibilityMockNode{
				Type: "child1",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
			&VisibilityMockNode{
				Type: "child2",
				HasBlocksVisibilityMethod: true,
				BlocksVisibilityValue: false,
			},
		}
		
		result := visitor.Visit(arrayNode)
		
		if result == nil {
			t.Error("Expected non-nil result")
		}
		
		// Check that array elements were processed
		child1 := arrayNode[0].(*VisibilityMockNode)
		child2 := arrayNode[1].(*VisibilityMockNode)
		
		if !child1.EnsureVisibilityWasCalled {
			t.Error("Expected child1 EnsureVisibility to be called")
		}
		if !child2.EnsureVisibilityWasCalled {
			t.Error("Expected child2 EnsureVisibility to be called")
		}
	})

	t.Run("should handle empty arrays", func(t *testing.T) {
		emptyArray := []any{}
		
		result := visitor.Visit(emptyArray)
		
		if result == nil {
			t.Error("Expected non-nil result")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_NodesThatBlockVisibility(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should return unchanged when node has no blocksVisibility method", func(t *testing.T) {
		mockNode := &SimpleNode{Type: "simple"}
		
		result := visitor.Visit(mockNode)
		
		if result != mockNode {
			t.Error("Expected same node reference")
		}
		
		// Should call visibility methods since no blocking
		if !mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility to be called")
		}
		if !mockNode.AcceptWasCalled {
			t.Error("Expected Accept to be called")
		}
	})

	t.Run("should return unchanged when blocksVisibility returns true", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "blocking",
			BlocksVisibilityValue:    true,
			HasBlocksVisibilityMethod: true,
		}
		
		result := visitor.Visit(mockNode)
		
		if result != mockNode {
			t.Error("Expected same node reference")
		}
		
		if !mockNode.BlocksVisibilityWasCalled {
			t.Error("Expected BlocksVisibility to be called")
		}
		
		// Should NOT call visibility methods on blocking nodes
		if mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility NOT to be called on blocking node")
		}
		if mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility NOT to be called on blocking node")  
		}
		if mockNode.AcceptWasCalled {
			t.Error("Expected Accept NOT to be called on blocking node")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_VisibilityHandlingForVisibleMode(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should call ensureVisibility when visible is true", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility to be called")
		}
		if mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility NOT to be called")
		}
	})

	t.Run("should call accept after setting visibility", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "testNode", 
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility to be called")
		}
		if !mockNode.AcceptWasCalled {
			t.Error("Expected Accept to be called")
		}
		if mockNode.AcceptedVisitor != visitor {
			t.Error("Expected Accept to be called with visitor")
		}
	})

	t.Run("should handle nodes without ensureVisibility method gracefully", func(t *testing.T) {
		incompleteNode := &IncompleteNode{
			Type:                     "incomplete",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		// Should handle gracefully without panicking - this is better Go design
		// The visitor simply skips visibility operations on nodes that don't support them
		visitor.Visit(incompleteNode)
		
		// The test passes if no panic occurs and Accept is called
		if !incompleteNode.AcceptWasCalled {
			t.Error("Expected Accept to be called even when visibility methods are missing")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_VisibilityHandlingForInvisibleMode(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(false)

	t.Run("should call ensureInvisibility when visible is false", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility to be called")
		}
		if mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility NOT to be called")
		}
	})

	t.Run("should call accept after setting invisibility", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false, 
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility to be called")
		}
		if !mockNode.AcceptWasCalled {
			t.Error("Expected Accept to be called")
		}
		if mockNode.AcceptedVisitor != visitor {
			t.Error("Expected Accept to be called with visitor")
		}
	})

	t.Run("should handle nodes without ensureInvisibility method gracefully", func(t *testing.T) {
		incompleteNode := &IncompleteNode{
			Type:                     "incomplete",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		// Should handle gracefully without panicking - this is better Go design
		// The visitor simply skips visibility operations on nodes that don't support them
		visitor.Visit(incompleteNode)
		
		// The test passes if no panic occurs and Accept is called
		if !incompleteNode.AcceptWasCalled {
			t.Error("Expected Accept to be called even when visibility methods are missing")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_FalsyVisibleValues(t *testing.T) {
	t.Run("should call ensureInvisibility for nil visible", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(nil)
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility to be called")
		}
		if mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility NOT to be called")
		}
	})

	t.Run("should call ensureInvisibility for 0 visible", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(0)
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureInvisibilityWasCalled {
			t.Error("Expected EnsureInvisibility to be called")
		}
	})

	t.Run("should call ensureVisibility for truthy visible values", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor("truthy")
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		visitor.Visit(mockNode)
		
		if !mockNode.EnsureVisibilityWasCalled {
			t.Error("Expected EnsureVisibility to be called")
		}
	})
}

func TestSetTreeVisibilityVisitor_Visit_MethodCallOrder(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should call methods in correct order", func(t *testing.T) {
		callOrder := []string{}
		
		// Create a more sophisticated mock that tracks call order
		mockNode := &MockTrackingNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
			CallOrder:               &callOrder,
		}
		
		visitor.Visit(mockNode)
		
		expectedOrder := []string{"blocksVisibility", "ensureVisibility", "accept"}
		if len(callOrder) != len(expectedOrder) {
			t.Errorf("Expected %d calls, got %d", len(expectedOrder), len(callOrder))
		}
		
		for i, expected := range expectedOrder {
			if i >= len(callOrder) || callOrder[i] != expected {
				t.Errorf("Expected call %d to be %s, got %v", i, expected, callOrder)
			}
		}
	})
}

// MockTrackingNode tracks method call order
type MockTrackingNode struct {
	Type                     string
	BlocksVisibilityValue    bool
	HasBlocksVisibilityMethod bool
	CallOrder               *[]string
}

func (m *MockTrackingNode) BlocksVisibility() bool {
	if !m.HasBlocksVisibilityMethod {
		panic("BlocksVisibility method called but not available")
	}
	*m.CallOrder = append(*m.CallOrder, "blocksVisibility")
	return m.BlocksVisibilityValue
}

func (m *MockTrackingNode) EnsureVisibility() {
	*m.CallOrder = append(*m.CallOrder, "ensureVisibility")
}

func (m *MockTrackingNode) EnsureInvisibility() {
	*m.CallOrder = append(*m.CallOrder, "ensureInvisibility")
}

func (m *MockTrackingNode) Accept(visitor any) {
	*m.CallOrder = append(*m.CallOrder, "accept")
}

func TestSetTreeVisibilityVisitor_Visit_ReturnValues(t *testing.T) {
	visitor := NewSetTreeVisibilityVisitor(true)

	t.Run("should return the same node after processing", func(t *testing.T) {
		mockNode := &VisibilityMockNode{
			Type:                     "testNode",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		result := visitor.Visit(mockNode)
		
		if result != mockNode {
			t.Error("Expected same node reference")
		}
	})

	t.Run("should return the same blocking node unchanged", func(t *testing.T) {
		blockingNode := &VisibilityMockNode{
			Type:                     "blocking",
			BlocksVisibilityValue:    true,
			HasBlocksVisibilityMethod: true,
		}
		
		result := visitor.Visit(blockingNode)
		
		if result != blockingNode {
			t.Error("Expected same blocking node reference")
		}
	})
}

func TestSetTreeVisibilityVisitor_IntegrationTests(t *testing.T) {
	t.Run("should process complex tree structure with visible true", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(true)
		
		leafNode := &VisibilityMockNode{
			Type:                     "leaf",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		parentNode := &MockAcceptingNode{
			VisibilityMockNode: VisibilityMockNode{
				Type:                     "parent",
				BlocksVisibilityValue:    false,
				HasBlocksVisibilityMethod: true,
			},
			ChildToVisit: leafNode,
		}
		
		visitor.Run(parentNode)
		
		if !parentNode.EnsureVisibilityWasCalled {
			t.Error("Expected parent EnsureVisibility to be called")
		}
		if !leafNode.EnsureVisibilityWasCalled {
			t.Error("Expected leaf EnsureVisibility to be called")
		}
		if !parentNode.AcceptWasCalled {
			t.Error("Expected parent Accept to be called")
		}
		if !leafNode.AcceptWasCalled {
			t.Error("Expected leaf Accept to be called")
		}
	})

	t.Run("should process array of mixed nodes", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(false)
		
		visibleNode := &VisibilityMockNode{
			Type:                     "visible",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		blockingNode := &VisibilityMockNode{
			Type:                     "blocking",
			BlocksVisibilityValue:    true,
			HasBlocksVisibilityMethod: true,
		}
		
		nodes := []any{visibleNode, blockingNode, nil}
		
		visitor.Run(nodes)
		
		if !visibleNode.EnsureInvisibilityWasCalled {
			t.Error("Expected visible node EnsureInvisibility to be called")
		}
		if !visibleNode.AcceptWasCalled {
			t.Error("Expected visible node Accept to be called")
		}
		if !blockingNode.BlocksVisibilityWasCalled {
			t.Error("Expected blocking node BlocksVisibility to be called")
		}
	})

	t.Run("should handle deeply nested arrays", func(t *testing.T) {
		visitor := NewSetTreeVisibilityVisitor(true)
		
		deepNode := &VisibilityMockNode{
			Type:                     "deep",
			BlocksVisibilityValue:    false,
			HasBlocksVisibilityMethod: true,
		}
		
		nestedStructure := []any{[]any{[]any{deepNode}}}
		
		visitor.Run(nestedStructure)
		
		if !deepNode.EnsureVisibilityWasCalled {
			t.Error("Expected deep node EnsureVisibility to be called")
		}
	})
}

// MockAcceptingNode simulates a parent that visits its children
type MockAcceptingNode struct {
	VisibilityMockNode
	ChildToVisit any
}

func (m *MockAcceptingNode) Accept(visitor any) {
	m.AcceptWasCalled = true
	m.AcceptedVisitor = visitor
	
	// Simulate parent visiting its children
	if v, ok := visitor.(*SetTreeVisibilityVisitor); ok {
		v.Visit(m.ChildToVisit)
	}
}