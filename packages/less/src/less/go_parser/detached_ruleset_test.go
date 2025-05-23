package go_parser

import (
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

type mockVisitor struct {
	visited *Node
}

func (m *mockVisitor) Visit(node any) any {
	m.visited = node.(*Node)
	return node
}

type mockRuleset struct {
	*Node
	evalCalled bool
	context    any
}

func newMockRuleset() *Node {
	node := NewNode()
	mock := &mockRuleset{
		Node: node,
	}
	node.Value = mock // Store the mock in the Node's Value field
	return node
}

func (m *mockRuleset) SetContext(context any) {
	m.context = context
}

func (m *mockRuleset) Eval() *Node {
	m.evalCalled = true
	return m.Node
}

func TestDetachedRuleset(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("should create a DetachedRuleset instance with the provided ruleset", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			if dr.ruleset != ruleset {
				t.Errorf("Expected ruleset to be %v, got %v", ruleset, dr.ruleset)
			}
			if dr.frames != nil {
				t.Errorf("Expected frames to be nil, got %v", dr.frames)
			}
		})

		t.Run("should create a DetachedRuleset instance with the provided ruleset and frames", func(t *testing.T) {
			ruleset := NewNode()
			frames := []any{"frame1", "frame2"}
			dr := NewDetachedRuleset(ruleset, frames)
			if dr.ruleset != ruleset {
				t.Errorf("Expected ruleset to be %v, got %v", ruleset, dr.ruleset)
			}
			if len(dr.frames) != len(frames) {
				t.Errorf("Expected frames length to be %d, got %d", len(frames), len(dr.frames))
			}
		})

		t.Run("should set the parent of the ruleset to itself", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			if ruleset.Parent != dr.Node {
				t.Errorf("Expected ruleset parent to be %v, got %v", dr.Node, ruleset.Parent)
			}
		})

		t.Run("should handle null ruleset", func(t *testing.T) {
			dr := NewDetachedRuleset(nil, nil)
			if dr.ruleset != nil {
				t.Errorf("Expected ruleset to be nil, got %v", dr.ruleset)
			}
		})

		t.Run("should handle null frames", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			if dr.frames != nil {
				t.Errorf("Expected frames to be nil, got %v", dr.frames)
			}
		})
	})

	t.Run("eval", func(t *testing.T) {
		t.Run("should return a new DetachedRuleset with the same ruleset when no frames provided", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			context := &less.Eval{
				Frames: []any{"frame1", "frame2"},
			}
			result := dr.Eval(context)
			if result.ruleset != ruleset {
				t.Errorf("Expected ruleset to be %v, got %v", ruleset, result.ruleset)
			}
			if len(result.frames) != len(context.Frames) {
				t.Errorf("Expected frames length to be %d, got %d", len(context.Frames), len(result.frames))
			}
		})

		t.Run("should return a new DetachedRuleset with the same ruleset and frames when frames provided", func(t *testing.T) {
			ruleset := NewNode()
			frames := []any{"frame1", "frame2"}
			dr := NewDetachedRuleset(ruleset, frames)
			context := &less.Eval{
				Frames: []any{"frame3", "frame4"},
			}
			result := dr.Eval(context)
			if result.ruleset != ruleset {
				t.Errorf("Expected ruleset to be %v, got %v", ruleset, result.ruleset)
			}
			if len(result.frames) != len(frames) {
				t.Errorf("Expected frames length to be %d, got %d", len(frames), len(result.frames))
			}
		})

		t.Run("should handle undefined context frames", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			context := &less.Eval{
				Frames: []any{},
			}
			result := dr.Eval(context)
			if result.ruleset != ruleset {
				t.Errorf("Expected ruleset to be %v, got %v", ruleset, result.ruleset)
			}
			if len(result.frames) != 0 {
				t.Errorf("Expected frames length to be 0, got %d", len(result.frames))
			}
		})
	})

	t.Run("callEval", func(t *testing.T) {
		t.Run("should evaluate the ruleset with concatenated frames when frames exist", func(t *testing.T) {
			node := newMockRuleset()
			mock := node.Value.(*mockRuleset)
			frames := []any{"frame1", "frame2"}
			dr := NewDetachedRuleset(node, frames)
			context := &less.Eval{
				Frames: []any{"frame3", "frame4"},
			}
			dr.CallEval(context)
			if !mock.evalCalled {
				t.Error("Expected ruleset.Eval to be called")
			}
			if newContext, ok := mock.context.(*less.Eval); !ok {
				t.Error("Expected context to be of type *less.Eval")
			} else if len(newContext.Frames) != 4 {
				t.Errorf("Expected 4 frames, got %d", len(newContext.Frames))
			}
		})

		t.Run("should evaluate the ruleset with original context when no frames exist", func(t *testing.T) {
			node := newMockRuleset()
			mock := node.Value.(*mockRuleset)
			dr := NewDetachedRuleset(node, nil)
			context := &less.Eval{
				Frames: []any{"frame1", "frame2"},
			}
			dr.CallEval(context)
			if !mock.evalCalled {
				t.Error("Expected ruleset.Eval to be called")
			}
			if mock.context != context {
				t.Error("Expected context to be passed through unchanged")
			}
		})
	})

	t.Run("accept", func(t *testing.T) {
		t.Run("should visit the ruleset with the provided visitor", func(t *testing.T) {
			ruleset := NewNode()
			dr := NewDetachedRuleset(ruleset, nil)
			visitor := &mockVisitor{}
			dr.Accept(visitor)
			if visitor.visited != ruleset {
				t.Errorf("Expected visited node to be %v, got %v", ruleset, visitor.visited)
			}
		})
	})

	t.Run("inheritance", func(t *testing.T) {
		t.Run("should have the correct type", func(t *testing.T) {
			dr := NewDetachedRuleset(NewNode(), nil)
			if dr.Type() != "DetachedRuleset" {
				t.Errorf("Expected type to be 'DetachedRuleset', got %s", dr.Type())
			}
		})

		t.Run("should have evalFirst set to true", func(t *testing.T) {
			dr := NewDetachedRuleset(NewNode(), nil)
			if !dr.EvalFirst() {
				t.Error("Expected EvalFirst to be true")
			}
		})
	})
} 