package less_go

import (
)

// DetachedRuleset represents a detached ruleset in the Less AST
type DetachedRuleset struct {
	*Node
	ruleset *Node
	frames  []any
}

// NewDetachedRuleset creates a new DetachedRuleset instance
func NewDetachedRuleset(ruleset *Node, frames []any) *DetachedRuleset {
	dr := &DetachedRuleset{
		Node:    NewNode(),
		ruleset: ruleset,
		frames:  frames,
	}
	dr.Node.SetParent(ruleset, dr.Node)
	return dr
}

// Accept implements the visitor pattern
func (dr *DetachedRuleset) Accept(visitor any) {
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		dr.ruleset = v.Visit(dr.ruleset).(*Node)
	}
}

// Eval evaluates the detached ruleset
func (dr *DetachedRuleset) Eval(context any) *DetachedRuleset {
	frames := dr.frames
	if frames == nil {
		if ctx, ok := context.(*Eval); ok {
			frames = CopyArray(ctx.Frames)
		}
	}
	return NewDetachedRuleset(dr.ruleset, frames)
}

// CallEval calls eval on the ruleset with the appropriate context
func (dr *DetachedRuleset) CallEval(context any) any {
	var evalContext any
	if dr.frames != nil {
		if ctx, ok := context.(*Eval); ok {
			// Create new Eval context with concatenated frames
			newFrames := append(dr.frames, ctx.Frames...)
			evalContext = NewEval(nil, newFrames)
		}
	} else {
		evalContext = context
	}
	
	// Try to set context if the ruleset supports it
	if evalContext != nil && dr.ruleset != nil && dr.ruleset.Value != nil {
		if contextSetter, ok := dr.ruleset.Value.(interface{ SetContext(context any) }); ok {
			contextSetter.SetContext(evalContext)
		}
	}
	
	// Check if the value inside the node has a more specific Eval method
	if dr.ruleset != nil && dr.ruleset.Value != nil {
		if evaluator, ok := dr.ruleset.Value.(interface{ Eval() *Node }); ok {
			return evaluator.Eval()
		}
	}

	// Fallback to the node's default Eval
	if dr.ruleset != nil {
		return dr.ruleset.Eval()
	}
	return nil // Or handle nil ruleset appropriately
}

// Type returns the type of the node
func (dr *DetachedRuleset) Type() string {
	return "DetachedRuleset"
}

// EvalFirst indicates whether this node should be evaluated first
func (dr *DetachedRuleset) EvalFirst() bool {
	return true
} 