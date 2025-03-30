package tree

import (
	"reflect" // Import reflect for deep equality checks
	"testing"
)

// Helper function for comparing slices (since Go doesn't directly compare slices for equality)
func slicesEqual(a, b []interface{}) bool {
	return reflect.DeepEqual(a, b)
}

// mockEvaluableNode is used for testing CallEval
// It embeds Node and provides an Eval method with the expected signature.
type mockEvaluableNode struct {
	*Node
	EvalFunc func(ctx interface{}) interface{} // Optional custom Eval behavior
}

// Eval implements the interface expected by CallEval
func (m *mockEvaluableNode) Eval(ctx interface{}) interface{} {
	if m.EvalFunc != nil {
		return m.EvalFunc(ctx)
	}
	// Default behavior: return the node itself
	return m
}

// newMockEvaluableNode creates a new mock node for testing
func newMockEvaluableNode() *mockEvaluableNode {
	return &mockEvaluableNode{Node: NewNode()}
}

func TestDetachedRuleset(t *testing.T) {
	// Mock dependencies
	mockRuleset := newMockEvaluableNode() // Use the new mock type
	mockContext := map[string]interface{}{
		"frames": []interface{}{"frame1", "frame2"},
	}

	t.Run("constructor", func(t *testing.T) {
		t.Run("should create a DetachedRuleset instance with the provided ruleset", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			if detachedRuleset.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, detachedRuleset.Ruleset)
			}
			if detachedRuleset.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", detachedRuleset.Frames)
			}
		})

		t.Run("should create a DetachedRuleset instance with the provided ruleset and frames", func(t *testing.T) {
			frames := []interface{}{"frame1", "frame2"}
			detachedRuleset := NewDetachedRuleset(mockRuleset, frames)
			if detachedRuleset.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, detachedRuleset.Ruleset)
			}
			if !slicesEqual(detachedRuleset.Frames, frames) {
				t.Errorf("Expected Frames to be %v, got %v", frames, detachedRuleset.Frames)
			}
		})

		t.Run("should set the parent of the ruleset to itself", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			// Check against the embedded Node of the mock
			if mockRuleset.Node.Parent != detachedRuleset.Node {
				t.Errorf("Expected mockRuleset.Node.Parent to be %v, got %v", detachedRuleset.Node, mockRuleset.Node.Parent)
			}
		})

		t.Run("should handle null ruleset", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(nil, nil)
			if detachedRuleset.Ruleset != nil {
				t.Errorf("Expected Ruleset to be nil, got %v", detachedRuleset.Ruleset)
			}
			if detachedRuleset.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", detachedRuleset.Frames)
			}
		})

		t.Run("should handle undefined ruleset (same as null in Go)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(nil, nil)
			if detachedRuleset.Ruleset != nil {
				t.Errorf("Expected Ruleset to be nil, got %v", detachedRuleset.Ruleset)
			}
			if detachedRuleset.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", detachedRuleset.Frames)
			}
		})

		t.Run("should handle null frames", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			if detachedRuleset.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", detachedRuleset.Frames)
			}
		})

		t.Run("should handle undefined frames (same as null in Go)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			if detachedRuleset.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", detachedRuleset.Frames)
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should return a new DetachedRuleset with the same ruleset when no frames provided", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.Eval(mockContext)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			expectedFrames := mockContext["frames"].([]interface{})
			if !slicesEqual(resultDR.Frames, expectedFrames) {
				t.Errorf("Expected Frames to be %v, got %v", expectedFrames, resultDR.Frames)
			}
		})

		t.Run("should return a new DetachedRuleset with the same ruleset and frames when frames provided", func(t *testing.T) {
			frames := []interface{}{"frame1", "frame2"}
			detachedRuleset := NewDetachedRuleset(mockRuleset, frames)
			result := detachedRuleset.Eval(mockContext)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if !slicesEqual(resultDR.Frames, frames) {
				t.Errorf("Expected Frames to be %v, got %v", frames, resultDR.Frames)
			}
		})

		t.Run("should handle undefined context frames (empty slice)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithoutFrames := map[string]interface{}{"frames": []interface{}{}}
			result := detachedRuleset.Eval(contextWithoutFrames)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if len(resultDR.Frames) != 0 {
				t.Errorf("Expected Frames to be empty, got %v", resultDR.Frames)
			}
		})

		t.Run("should handle null context", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.Eval(nil)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if resultDR.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", resultDR.Frames)
			}
		})

		t.Run("should handle undefined context (same as null)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.Eval(nil)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if resultDR.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", resultDR.Frames)
			}
		})

		t.Run("should handle context with undefined frames (nil map)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithUndefinedFrames := map[string]interface{}{} // No frames key
			result := detachedRuleset.Eval(contextWithUndefinedFrames)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if resultDR.Frames != nil {
				t.Errorf("Expected Frames to be nil, got %v", resultDR.Frames)
			}
		})

		t.Run("should handle empty frames array in context", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithEmptyFrames := map[string]interface{}{"frames": []interface{}{}}
			result := detachedRuleset.Eval(contextWithEmptyFrames)

			resultDR, ok := result.(*DetachedRuleset)
			if !ok {
				t.Fatalf("Expected result to be of type *DetachedRuleset, got %T", result)
			}
			if resultDR.Ruleset != mockRuleset {
				t.Errorf("Expected Ruleset to be %v, got %v", mockRuleset, resultDR.Ruleset)
			}
			if len(resultDR.Frames) != 0 {
				t.Errorf("Expected Frames to be empty, got %v", resultDR.Frames)
			}
		})
	})

	t.Run("callEval", func(t *testing.T) {
		t.Run("should evaluate the ruleset with concatenated frames when frames exist", func(t *testing.T) {
			frames := []interface{}{"frame1", "frame2"}
			detachedRuleset := NewDetachedRuleset(mockRuleset, frames)
			result := detachedRuleset.CallEval(mockContext)
			// The mock Eval returns itself by default
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should evaluate the ruleset with original context when no frames exist", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.CallEval(mockContext)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle undefined context (nil)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.CallEval(nil)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle null context", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			result := detachedRuleset.CallEval(nil)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle ruleset eval returning null", func(t *testing.T) {
			// Use the mock's ability to customize Eval return value
			nullReturningRuleset := newMockEvaluableNode()
			nullReturningRuleset.EvalFunc = func(ctx interface{}) interface{} {
				return nil
			}
			detachedRuleset := NewDetachedRuleset(nullReturningRuleset, nil)
			result := detachedRuleset.CallEval(mockContext)
			if result != nil {
				t.Errorf("Expected result to be nil, got %v", result)
			}
		})

		t.Run("should handle ruleset eval returning undefined (same as null)", func(t *testing.T) {
			undefinedReturningRuleset := newMockEvaluableNode()
			undefinedReturningRuleset.EvalFunc = func(ctx interface{}) interface{} {
				return nil
			}
			detachedRuleset := NewDetachedRuleset(undefinedReturningRuleset, nil)
			result := detachedRuleset.CallEval(mockContext)
			if result != nil {
				t.Errorf("Expected result to be nil, got %v", result)
			}
		})

		t.Run("should handle context with undefined frames (nil map)", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithUndefinedFrames := map[string]interface{}{}
			result := detachedRuleset.CallEval(contextWithUndefinedFrames)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle context with null frames", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithNullFrames := map[string]interface{}{"frames": nil}
			result := detachedRuleset.CallEval(contextWithNullFrames)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle ruleset eval throwing an error", func(t *testing.T) {
			errorRuleset := newMockEvaluableNode()
			errorRuleset.EvalFunc = func(ctx interface{}) interface{} {
				panic("Eval failed")
			}
			detachedRuleset := NewDetachedRuleset(errorRuleset, nil)

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected panic with 'Eval failed', but got none")
				} else if r != "Eval failed" {
					t.Errorf("Expected panic with 'Eval failed', but got %v", r)
				}
			}()

			detachedRuleset.CallEval(mockContext)
		})

		t.Run("should handle ruleset eval returning a non-null value", func(t *testing.T) {
			valueRuleset := newMockEvaluableNode()
			valueRuleset.EvalFunc = func(ctx interface{}) interface{} {
				return "test value"
			}
			detachedRuleset := NewDetachedRuleset(valueRuleset, nil)

			result := detachedRuleset.CallEval(mockContext)
			if result != "test value" {
				t.Errorf("Expected result to be 'test value', got %v", result)
			}
		})

		t.Run("should handle frames.concat failure", func(t *testing.T) {
			// Create a custom type that will fail on append
			type failingFrames struct {
				items []interface{}
			}
			ff := &failingFrames{items: []interface{}{"frame1"}}
			
			detachedRuleset := NewDetachedRuleset(mockRuleset, ff.items)
			contextWithInvalidFrames := map[string]interface{}{
				"frames": make(chan int), // This will cause a type assertion failure
			}

			result := detachedRuleset.CallEval(contextWithInvalidFrames)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle context type assertion failure", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			invalidContext := "not a map"

			result := detachedRuleset.CallEval(invalidContext)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})

		t.Run("should handle frames type assertion failure", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			contextWithInvalidFrames := map[string]interface{}{
				"frames": "not a slice",
			}

			result := detachedRuleset.CallEval(contextWithInvalidFrames)
			if result != mockRuleset {
				t.Errorf("Expected result to be mockRuleset (%v), got %v", mockRuleset, result)
			}
		})
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should visit the ruleset with the provided visitor", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			visited := false
			visitor := &mockVisitor{
				visit: func(node interface{}) interface{} {
					visited = true
					return node
				},
			}
			detachedRuleset.Accept(visitor)
			if !visited {
				t.Error("Expected visitor.visit to be called, but it wasn't")
			}
		})

		t.Run("should handle null visitor", func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("The code panicked when calling Accept with nil visitor: %v", r)
				}
			}()
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			detachedRuleset.Accept(nil)
		})

		t.Run("should handle undefined visitor (same as null)", func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("The code panicked when calling Accept with nil visitor: %v", r)
				}
			}()
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			detachedRuleset.Accept(nil)
		})

		t.Run("should handle visitor returning a different ruleset", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			newRuleset := newMockEvaluableNode() // Use mock type here too if needed
			visitor := &mockVisitor{
				visit: func(node interface{}) interface{} {
					return newRuleset
				},
			}
			detachedRuleset.Accept(visitor)
			if detachedRuleset.Ruleset != newRuleset {
				t.Errorf("Expected Ruleset to be updated to %v, got %v", newRuleset, detachedRuleset.Ruleset)
			}
		})
	})

	t.Run("inheritance", func(t *testing.T) {
		t.Run("should have embedded Node", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			if detachedRuleset.Node == nil {
				t.Error("Expected embedded Node field not to be nil")
			}
			if _, ok := interface{}(detachedRuleset.Node).(*Node); !ok {
				t.Errorf("Expected embedded field to be of type *Node, got %T", detachedRuleset.Node)
			}
		})

		t.Run("should have the correct type property", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			expectedType := "DetachedRuleset"
			if detachedRuleset.Type != expectedType {
				t.Errorf("Expected Type property to be %q, got %q", expectedType, detachedRuleset.Type)
			}
		})

		t.Run("should have evalFirst set to true", func(t *testing.T) {
			detachedRuleset := NewDetachedRuleset(mockRuleset, nil)
			if !detachedRuleset.EvalFirst {
				t.Error("Expected EvalFirst property to be true, got false")
			}
		})
	})
}

// mockVisitor implements the Visitor interface for testing
type mockVisitor struct {
	visit func(interface{}) interface{}
}

func (v *mockVisitor) Visit(node interface{}) interface{} {
	if v.visit == nil {
		return node
	}
	return v.visit(node)
} 