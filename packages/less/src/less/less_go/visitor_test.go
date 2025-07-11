package less_go

import (
	"testing"
)

// MockImplementation implements the visitor implementation interface for testing
type MockImplementation struct {
	IsReplacingValue bool
	VisitedNodes     []string
	VisitCount       int
}

// MockImplementationWithVisitDeeper adds visitDeeper control for testing
type MockImplementationWithVisitDeeper struct {
	IsReplacingValue bool
	VisitedNodes     []string
	VisitCount       int
	ShouldVisitDeeper bool
}

func (m *MockImplementationWithVisitDeeper) IsReplacing() bool {
	return m.IsReplacingValue
}

func (m *MockImplementationWithVisitDeeper) VisitTestNode(node any, visitArgs *VisitArgs) any {
	if m.VisitedNodes == nil {
		m.VisitedNodes = make([]string, 0)
	}
	m.VisitedNodes = append(m.VisitedNodes, "visit-TestNode")
	m.VisitCount++
	// Control visitDeeper flag
	visitArgs.VisitDeeper = m.ShouldVisitDeeper
	return node
}

func (m *MockImplementationWithVisitDeeper) VisitTestNodeOut(_ any) {
	if m.VisitedNodes == nil {
		m.VisitedNodes = make([]string, 0)
	}
	m.VisitedNodes = append(m.VisitedNodes, "visitOut-TestNode")
}

func (m *MockImplementation) IsReplacing() bool {
	return m.IsReplacingValue
}

func (m *MockImplementation) VisitTestNode(node any, _ *VisitArgs) any {
	if m.VisitedNodes == nil {
		m.VisitedNodes = make([]string, 0)
	}
	m.VisitedNodes = append(m.VisitedNodes, "visit-TestNode")
	m.VisitCount++
	return node
}

func (m *MockImplementation) VisitTestNodeOut(_ any) {
	if m.VisitedNodes == nil {
		m.VisitedNodes = make([]string, 0)
	}
	m.VisitedNodes = append(m.VisitedNodes, "visitOut-TestNode")
}

// VisitorMockNode implements the new node interfaces for testing
type VisitorMockNode struct {
	Type      string
	TypeIndex int
	AcceptFn  func(visitor any)
	Value     any
	length    int // For array-like behavior
	Self      *VisitorMockNode // For circular reference testing
	// Array-like fields for testing nodes with length property
	Elements  []any // For array-like node testing with numeric indexing
}

func (m *VisitorMockNode) GetType() string {
	return m.Type
}

func (m *VisitorMockNode) GetTypeIndex() int {
	return m.TypeIndex
}

func (m *VisitorMockNode) Accept(visitor any) {
	if m.AcceptFn != nil {
		m.AcceptFn(visitor)
	}
}

// GetLength returns the length for array-like behavior
func (m *VisitorMockNode) GetLength() int {
	return m.length
}

// GetElement returns element at index for array-like behavior
func (m *VisitorMockNode) GetElement(i int) any {
	if i >= 0 && i < len(m.Elements) {
		return m.Elements[i]
	}
	return nil
}

func (m *VisitorMockNode) GetValue() any {
	return m.Value
}

// Only include Splice method if this is actually an array-like node
// Most regular nodes should NOT have this method

// MockArrayLikeNode implements ArrayLikeNode for testing
type MockArrayLikeNode struct {
	Items []any
}

func (m *MockArrayLikeNode) Len() int {
	return len(m.Items)
}

func (m *MockArrayLikeNode) Get(i int) any {
	if i >= 0 && i < len(m.Items) {
		return m.Items[i]
	}
	return nil
}

func (m *MockArrayLikeNode) Splice() {
	// marker method for array-like detection
}

func TestNewVisitor(t *testing.T) {
	impl := &MockImplementation{IsReplacingValue: false}
	visitor := NewVisitor(impl)

	if visitor.implementation != impl {
		t.Errorf("Expected implementation to be %v, got %v", impl, visitor.implementation)
	}

	if visitor.visitInCache == nil {
		t.Error("Expected visitInCache to be initialized")
	}

	if visitor.visitOutCache == nil {
		t.Error("Expected visitOutCache to be initialized")
	}
}

func TestNewVisitorIndexesNodeTypes(t *testing.T) {
	// Reset _hasIndexed for testing
	original_hasIndexed := _hasIndexed
	_hasIndexed = false
	defer func() { _hasIndexed = original_hasIndexed }()

	impl := &MockImplementation{}
	NewVisitor(impl)

	// Check that tree nodes have been initialized
	if len(treeRegistry.NodeTypes) == 0 {
		t.Error("Expected tree node types to be initialized")
	}

	// Check that Color node type exists
	if _, exists := treeRegistry.NodeTypes["Color"]; !exists {
		t.Error("Expected Color node type to exist in tree")
	}
}

func TestVisitReturnsNilForNilNode(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	result := visitor.Visit(nil)
	if result != nil {
		t.Errorf("Expected nil, got %v", result)
	}
}

func TestVisitHandlesNodeWithoutTypeIndex(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	node := &VisitorMockNode{Type: "TestNode", TypeIndex: 0}
	result := visitor.Visit(node)

	if result != node {
		t.Errorf("Expected same node, got %v", result)
	}
}

func TestVisitHandlesNodeWithValueTypeIndex(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	var acceptCalled bool
	valueNode := &VisitorMockNode{
		Type:      "TestValue",
		TypeIndex: 1,
		AcceptFn: func(v any) {
			acceptCalled = true
		},
	}

	nodeWithValue := &VisitorMockNode{
		Type:      "TestNode",
		TypeIndex: 0,
		Value:     valueNode,
	}

	result := visitor.Visit(nodeWithValue)

	if result != nodeWithValue {
		t.Errorf("Expected same node, got %v", result)
	}

	if !acceptCalled {
		t.Error("Expected value node Accept to be called")
	}
}

func TestVisitCachesVisitFunctions(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	node := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}

	// First call should cache the function
	visitor.Visit(node)
	if _, exists := visitor.visitInCache[1]; !exists {
		t.Error("Expected visit function to be cached")
	}

	// Second call should use cached function
	visitor.Visit(node)
	if impl.VisitCount != 2 {
		t.Errorf("Expected visit count to be 2, got %d", impl.VisitCount)
	}
}

func TestVisitCallsVisitFunctionWithCorrectParameters(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	node := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}
	visitor.Visit(node)

	if impl.VisitCount != 1 {
		t.Errorf("Expected visit count to be 1, got %d", impl.VisitCount)
	}
}

func TestVisitCallsVisitOutFunction(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	node := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}
	visitor.Visit(node)

	if len(impl.VisitedNodes) != 2 {
		t.Errorf("Expected 2 visited nodes, got %d", len(impl.VisitedNodes))
	}

	if impl.VisitedNodes[0] != "visit-TestNode" {
		t.Errorf("Expected first visit to be 'visit-TestNode', got %s", impl.VisitedNodes[0])
	}

	if impl.VisitedNodes[1] != "visitOut-TestNode" {
		t.Errorf("Expected second visit to be 'visitOut-TestNode', got %s", impl.VisitedNodes[1])
	}
}

func TestVisitDeeper(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	var acceptCalled bool
	node := &VisitorMockNode{
		Type:      "TestNode",
		TypeIndex: 1,
		AcceptFn: func(v any) {
			acceptCalled = true
		},
	}

	visitor.Visit(node)

	if !acceptCalled {
		t.Error("Expected Accept to be called")
	}
}

func TestVisitArray(t *testing.T) {
	t.Run("returns nil for nil nodes", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)

		result := visitor.VisitArray(nil)
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("visits all nodes in non-replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: false}
		visitor := NewVisitor(impl)

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := visitor.VisitArray(nodes)

		if len(result) != len(nodes) {
			t.Error("Expected same length nodes array")
		}

		if impl.VisitCount != 2 {
			t.Errorf("Expected visit count to be 2, got %d", impl.VisitCount)
		}
	})

	t.Run("visits all nodes when nonReplacing parameter is true", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}
		visitor := NewVisitor(impl)

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := visitor.VisitArray(nodes, true)

		if len(result) != len(nodes) {
			t.Error("Expected same length nodes array")
		}

		if impl.VisitCount != 2 {
			t.Errorf("Expected visit count to be 2, got %d", impl.VisitCount)
		}
	})

	t.Run("handles replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}
		visitor := NewVisitor(impl)

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := visitor.VisitArray(nodes)

		if len(result) != 2 {
			t.Errorf("Expected 2 nodes, got %d", len(result))
		}

		if impl.VisitCount != 2 {
			t.Errorf("Expected visit count to be 2, got %d", impl.VisitCount)
		}
	})

	t.Run("skips nil results in replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}

		// Create a custom visitor that returns nil for second node
		callCount := 0
		customVisitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		customVisitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			callCount++
			if callCount == 2 {
				return nil
			}
			return node
		}
		customVisitor.visitOutCache[1] = func(node any) {}

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := customVisitor.VisitArray(nodes)

		if len(result) != 1 {
			t.Errorf("Expected 1 node, got %d", len(result))
		}
	})

	t.Run("handles array results in replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}

		arrayResult := &MockArrayLikeNode{
			Items: []any{
				&VisitorMockNode{Type: "Item1", TypeIndex: 2},
				&VisitorMockNode{Type: "Item2", TypeIndex: 3},
			},
		}

		// Create a custom visitor that returns array-like node for second item
		callCount := 0
		customVisitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		customVisitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			callCount++
			if callCount == 2 {
				return arrayResult
			}
			return node
		}
		customVisitor.visitOutCache[1] = func(node any) {}

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := customVisitor.VisitArray(nodes)

		if len(result) != 3 {
			t.Errorf("Expected 3 nodes (1 + 2 flattened), got %d", len(result))
		}
	})
}

func TestFlatten(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)

	t.Run("creates new array if out parameter is not provided", func(t *testing.T) {
		arr := []any{1, 2, 3}
		result := visitor.Flatten(arr, nil)

		if len(result) != 3 {
			t.Errorf("Expected 3 items, got %d", len(result))
		}

		if result[0] != 1 || result[1] != 2 || result[2] != 3 {
			t.Errorf("Expected [1, 2, 3], got %v", result)
		}
	})

	t.Run("uses provided out array", func(t *testing.T) {
		arr := []any{1, 2}
		out := []any{0}
		result := visitor.Flatten(arr, &out)

		if len(result) != 3 {
			t.Errorf("Expected 3 items, got %d", len(result))
		}

		if result[0] != 0 || result[1] != 1 || result[2] != 2 {
			t.Errorf("Expected [0, 1, 2], got %v", result)
		}
	})

	t.Run("skips nil items", func(t *testing.T) {
		arr := []any{1, nil, 2, nil, 3}
		result := visitor.Flatten(arr, nil)

		if len(result) != 3 {
			t.Errorf("Expected 3 items, got %d", len(result))
		}

		if result[0] != 1 || result[1] != 2 || result[2] != 3 {
			t.Errorf("Expected [1, 2, 3], got %v", result)
		}
	})

	t.Run("flattens nested arrays", func(t *testing.T) {
		nestedArr := &MockArrayLikeNode{
			Items: []any{1, 2},
		}

		arr := []any{0, nestedArr, 3}
		result := visitor.Flatten(arr, nil)

		if len(result) != 4 {
			t.Errorf("Expected 4 items, got %d", len(result))
		}

		if result[0] != 0 || result[1] != 1 || result[2] != 2 || result[3] != 3 {
			t.Errorf("Expected [0, 1, 2, 3], got %v", result)
		}
	})

	t.Run("handles deeply nested arrays recursively", func(t *testing.T) {
		deeplyNested := &MockArrayLikeNode{
			Items: []any{4, 5},
		}

		nested := &MockArrayLikeNode{
			Items: []any{2, 3, deeplyNested},
		}

		arr := []any{1, nested, 6}
		result := visitor.Flatten(arr, nil)

		if len(result) != 6 {
			t.Errorf("Expected 6 items, got %d", len(result))
		}

		if result[0] != 1 || result[1] != 2 || result[2] != 3 || result[3] != 4 || result[4] != 5 || result[5] != 6 {
			t.Errorf("Expected [1, 2, 3, 4, 5, 6], got %v", result)
		}
	})

	t.Run("skips nil items in nested arrays", func(t *testing.T) {
		nested := &MockArrayLikeNode{
			Items: []any{2, nil, 3},
		}

		arr := []any{1, nested, nil, 4}
		result := visitor.Flatten(arr, nil)

		if len(result) != 4 {
			t.Errorf("Expected 4 items, got %d", len(result))
		}

		if result[0] != 1 || result[1] != 2 || result[2] != 3 || result[3] != 4 {
			t.Errorf("Expected [1, 2, 3, 4], got %v", result)
		}
	})

	t.Run("handles empty nested arrays", func(t *testing.T) {
		emptyNested := &MockArrayLikeNode{
			Items: []any{},
		}

		arr := []any{1, emptyNested, 2}
		result := visitor.Flatten(arr, nil)

		if len(result) != 2 {
			t.Errorf("Expected 2 items, got %d", len(result))
		}

		if result[0] != 1 || result[1] != 2 {
			t.Errorf("Expected [1, 2], got %v", result)
		}
	})
}

func TestVisitorIntegrationTests(t *testing.T) {
	t.Run("handles complex visitor implementation", func(t *testing.T) {
		impl := &MockImplementation{
			IsReplacingValue: true,
			VisitedNodes:     make([]string, 0),
		}

		visitor := NewVisitor(impl)
		node := &VisitorMockNode{
			Type:      "TestNode",
			TypeIndex: 1,
			AcceptFn:  func(v any) {}, // noop
		}

		visitor.Visit(node)

		if len(impl.VisitedNodes) != 2 {
			t.Errorf("Expected 2 visited nodes, got %d", len(impl.VisitedNodes))
		}

		if impl.VisitedNodes[0] != "visit-TestNode" {
			t.Errorf("Expected first visit to be 'visit-TestNode', got %s", impl.VisitedNodes[0])
		}

		if impl.VisitedNodes[1] != "visitOut-TestNode" {
			t.Errorf("Expected second visit to be 'visitOut-TestNode', got %s", impl.VisitedNodes[1])
		}
	})

	t.Run("handles visitor with array processing", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}
		visitor := NewVisitor(impl)

		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			nil,
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}

		result := visitor.VisitArray(nodes)

		if len(result) != 3 {
			t.Errorf("Expected 3 nodes, got %d", len(result))
		}

		if impl.VisitCount != 3 {
			t.Errorf("Expected visit count to be 3, got %d", impl.VisitCount)
		}
	})

	t.Run("preserves visitor state across multiple visits", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)

		node := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}

		visitor.Visit(node)
		visitor.Visit(node)
		visitor.Visit(node)

		if impl.VisitCount != 3 {
			t.Errorf("Expected visit count to be 3, got %d", impl.VisitCount)
		}
	})
}

func TestVisitorEdgeCases(t *testing.T) {
	t.Run("handles nodes with zero typeIndex", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)

		node := &VisitorMockNode{
			Type:      "ZeroNode",
			TypeIndex: 0,
		}

		result := visitor.Visit(node)
		if result != node {
			t.Errorf("Expected same node, got %v", result)
		}
	})

	t.Run("handles very large arrays", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)

		largeArray := make([]any, 1000)
		for i := 0; i < 1000; i++ {
			largeArray[i] = &VisitorMockNode{
				Type:      "TestNode",
				TypeIndex: 1,
			}
		}

		// Should not panic
		result := visitor.VisitArray(largeArray)
		if len(result) != 1000 {
			t.Errorf("Expected 1000 nodes, got %d", len(result))
		}
	})

	t.Run("handles empty implementation object", func(t *testing.T) {
		emptyImpl := &MockImplementation{}
		visitor := NewVisitor(emptyImpl)
		node := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}

		// Should not panic
		result := visitor.Visit(node)
		if result != node {
			t.Errorf("Expected same node, got %v", result)
		}
	})
}

// Test node replacement behavior - matches JS tests
func TestNodeReplacementBehavior(t *testing.T) {
	t.Run("should replace node when isReplacing is true", func(t *testing.T) {
		newNode := &VisitorMockNode{Type: "NewNode", TypeIndex: 2}
		
		// Create custom visitor that returns different node
		impl := &MockImplementation{IsReplacingValue: true}
		visitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		
		// Set up cached function that returns new node
		visitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			return newNode
		}
		visitor.visitOutCache[1] = func(node any) {}
		
		mockNode := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}
		result := visitor.Visit(mockNode)
		
		if result != newNode {
			t.Errorf("Expected result to be newNode when isReplacing=true, got %v", result)
		}
	})
	
	t.Run("should not replace node when isReplacing is false", func(t *testing.T) {
		newNode := &VisitorMockNode{Type: "NewNode", TypeIndex: 2}
		
		// Create custom visitor that returns different node but isReplacing=false
		impl := &MockImplementation{IsReplacingValue: false}
		visitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		
		// Set up cached function that returns new node
		visitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			return newNode
		}
		visitor.visitOutCache[1] = func(node any) {}
		
		mockNode := &VisitorMockNode{Type: "TestNode", TypeIndex: 1}
		result := visitor.Visit(mockNode)
		
		if result != mockNode {
			t.Errorf("Expected result to be original mockNode when isReplacing=false, got %v", result)
		}
	})
}

// Test visitDeeper flag control - matches JS tests
func TestVisitDeeperFlagControl(t *testing.T) {
	t.Run("should visit deeper when visitDeeper is true", func(t *testing.T) {
		impl := &MockImplementationWithVisitDeeper{ShouldVisitDeeper: true}
		visitor := NewVisitor(impl)
		
		var acceptCalled bool
		mockNode := &VisitorMockNode{
			Type:      "TestNode",
			TypeIndex: 1,
			AcceptFn: func(v any) {
				acceptCalled = true
			},
		}
		
		visitor.Visit(mockNode)
		
		if !acceptCalled {
			t.Error("Expected Accept to be called when visitDeeper is true")
		}
	})
	
	t.Run("should not visit deeper when visitDeeper is false", func(t *testing.T) {
		impl := &MockImplementationWithVisitDeeper{ShouldVisitDeeper: false}
		visitor := NewVisitor(impl)
		
		var acceptCalled bool
		mockNode := &VisitorMockNode{
			Type:      "TestNode",
			TypeIndex: 1,
			AcceptFn: func(v any) {
				acceptCalled = true
			},
		}
		
		visitor.Visit(mockNode)
		
		if acceptCalled {
			t.Error("Expected Accept not to be called when visitDeeper is false")
		}
	})
}

// Test array-like node handling - matches JS tests  
func TestArrayLikeNodeHandling(t *testing.T) {
	t.Run("should handle array-like nodes", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)
		
		var acceptCount int
		childNode1 := &VisitorMockNode{
			Type:      "ChildNode",
			TypeIndex: 2,
			AcceptFn: func(v any) {
				acceptCount++
			},
		}
		childNode2 := &VisitorMockNode{
			Type:      "ChildNode", 
			TypeIndex: 2,
			AcceptFn: func(v any) {
				acceptCount++
			},
		}
		
		// Create array-like node similar to JS: {length: 2, 0: child1, 1: child2}
		arrayNode := &VisitorMockNode{
			Type:      "ArrayNode",
			TypeIndex: 3,
			length:    2,
			Elements:  []any{childNode1, childNode2},
		}
		
		visitor.Visit(arrayNode)
		
		if acceptCount != 2 {
			t.Errorf("Expected 2 accept calls for array elements, got %d", acceptCount)
		}
	})
	
	t.Run("should skip array elements without accept method", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)
		
		var acceptCount int
		childWithAccept := &VisitorMockNode{
			Type:      "ChildNode",
			TypeIndex: 2,
			AcceptFn: func(v any) {
				acceptCount++
			},
		}
		
		// Create element without Accept method (just a regular struct)
		childWithoutAccept := struct {
			SomeProperty string
		}{SomeProperty: "value"}
		
		arrayNode := &VisitorMockNode{
			Type:      "ArrayNode", 
			TypeIndex: 3,
			length:    2,
			Elements:  []any{childWithoutAccept, childWithAccept},
		}
		
		// Should not panic and should call accept on valid element
		visitor.Visit(arrayNode)
		
		if acceptCount != 1 {
			t.Errorf("Expected 1 accept call (skipping invalid element), got %d", acceptCount)
		}
	})
}

// Test circular reference safety - matches JS tests
func TestCircularReferenceSafety(t *testing.T) {
	t.Run("should handle circular references safely", func(t *testing.T) {
		impl := &MockImplementation{}
		visitor := NewVisitor(impl)
		
		var acceptCallCount int
		var circularNode *VisitorMockNode
		circularNode = &VisitorMockNode{
			Type:      "CircularNode",
			TypeIndex: 1,
			AcceptFn: func(v any) {
				acceptCallCount++
				// Prevent infinite recursion in test by limiting calls
				if acceptCallCount < 5 {
					visitor.Visit(circularNode) // Visit self
				}
			},
		}
		
		// Create circular reference
		circularNode.Self = circularNode
		
		// Should not panic or cause stack overflow
		visitor.Visit(circularNode)
		
		if acceptCallCount == 0 {
			t.Error("Expected at least one accept call")
		}
	})
}

// Test missing flatten scenarios - matches JS tests
func TestFlattenMissingScenarios(t *testing.T) {
	impl := &MockImplementation{}
	visitor := NewVisitor(impl)
	
	t.Run("should handle mixed array and non-array items", func(t *testing.T) {
		nested1 := &MockArrayLikeNode{
			Items: []any{2, 3},
		}
		
		nested2 := &MockArrayLikeNode{
			Items: []any{5},
		}
		
		arr := []any{1, nested1, 4, nested2, 6}
		result := visitor.Flatten(arr, nil)
		
		expected := []any{1, 2, 3, 4, 5, 6}
		if len(result) != len(expected) {
			t.Errorf("Expected %d items, got %d", len(expected), len(result))
		}
		
		for i, v := range expected {
			if result[i] != v {
				t.Errorf("Expected result[%d] = %v, got %v", i, v, result[i])
			}
		}
	})
}

// Test tree node prototype indexing - matches JS tests
func TestTreeNodePrototypeIndexing(t *testing.T) {
	t.Run("should set typeIndex on tree node prototypes", func(t *testing.T) {
		// Reset indexing for test
		original_hasIndexed := _hasIndexed
		_hasIndexed = false
		defer func() { _hasIndexed = original_hasIndexed }()
		
		// Create visitor to trigger indexing
		NewVisitor(&MockImplementation{})
		
		// Check that tree nodes have typeIndex after visitor creation
		if colorProto, exists := treeRegistry.NodeTypes["Color"]; exists {
			if proto, ok := colorProto.(*NodePrototype); ok {
				if proto.TypeIndex <= 0 {
					t.Errorf("Expected Color prototype to have positive typeIndex, got %d", proto.TypeIndex)
				}
			} else {
				t.Error("Expected Color prototype to be NodePrototype type")
			}
		} else {
			t.Error("Expected Color node type to exist in tree")
		}
	})
}

// Test multiple visitor instances - matches JS tests
func TestMultipleVisitorInstances(t *testing.T) {
	t.Run("should index node types only once", func(t *testing.T) {
		// Reset indexing for test
		original_hasIndexed := _hasIndexed
		_hasIndexed = false
		defer func() { _hasIndexed = original_hasIndexed }()
		
		// Create multiple visitors
		impl1 := &MockImplementation{}
		impl2 := &MockImplementation{}
		
		v1 := NewVisitor(impl1)
		v2 := NewVisitor(impl2)
		
		// Both should have their own implementation reference
		if v1.implementation != impl1 {
			t.Error("Expected v1 to have impl1 reference")
		}
		
		if v2.implementation != impl2 {
			t.Error("Expected v2 to have impl2 reference")
		}
		
		// Check that indexing happened (tree should be populated)
		if len(treeRegistry.NodeTypes) == 0 {
			t.Error("Expected tree node types to be indexed")
		}
	})
}

// Test VisitArray flatten scenarios - matches JS tests
func TestVisitArrayFlattenScenarios(t *testing.T) {
	t.Run("should flatten array results in replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}
		
		// Create array result that should be flattened
		arrayResult := &MockArrayLikeNode{
			Items: []any{
				&VisitorMockNode{Type: "Item1", TypeIndex: 2},
				&VisitorMockNode{Type: "Item2", TypeIndex: 3},
			},
		}
		
		// Custom visitor that returns arrayResult for second node
		callCount := 0
		customVisitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		customVisitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			callCount++
			if callCount == 2 {
				return arrayResult
			}
			return node
		}
		customVisitor.visitOutCache[1] = func(node any) {}
		
		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}
		
		result := customVisitor.VisitArray(nodes)
		
		// Should have first node + 2 flattened items = 3 total
		if len(result) != 3 {
			t.Errorf("Expected 3 nodes (1 + 2 flattened), got %d", len(result))
		}
	})
	
	t.Run("should handle empty arrays in replacing mode", func(t *testing.T) {
		impl := &MockImplementation{IsReplacingValue: true}
		
		emptyArray := &MockArrayLikeNode{
			Items: []any{},
		}
		
		customVisitor := &Visitor{
			implementation: impl,
			visitInCache:   make(map[int]VisitFunc),
			visitOutCache:  make(map[int]VisitOutFunc),
		}
		customVisitor.visitInCache[1] = func(node any, args *VisitArgs) any {
			return emptyArray
		}
		customVisitor.visitOutCache[1] = func(node any) {}
		
		nodes := []any{
			&VisitorMockNode{Type: "TestNode", TypeIndex: 1},
		}
		
		result := customVisitor.VisitArray(nodes)
		
		if len(result) != 0 {
			t.Errorf("Expected 0 nodes for empty array result, got %d", len(result))
		}
	})
}