package tree

import (
	"github.com/toakleaf/less.go/packages/less/src/less"
)

// DetachedRuleset represents a detached ruleset in the Less AST
type DetachedRuleset struct {
	*Node
	Ruleset   interface{}
	Frames    []interface{}
	Type      string
	EvalFirst bool
}

// NewDetachedRuleset creates a new DetachedRuleset instance
func NewDetachedRuleset(ruleset interface{}, frames []interface{}) *DetachedRuleset {
	dr := &DetachedRuleset{
		Node:      NewNode(),
		Ruleset:   ruleset,
		Frames:    frames,
		Type:      "DetachedRuleset",
		EvalFirst: true,
	}

	if ruleset != nil {
		var nodeToSetParentOn *Node
		if rEvaluable, ok := ruleset.(*mockEvaluableNode); ok {
			nodeToSetParentOn = rEvaluable.Node
		} else if rNode, ok := ruleset.(*Node); ok {
			nodeToSetParentOn = rNode
		}

		if nodeToSetParentOn != nil {
			nodeToSetParentOn.Parent = dr.Node
		}
	}

	return dr
}

// Accept implements the visitor pattern
func (dr *DetachedRuleset) Accept(visitor interface{}) {
	if v, ok := visitor.(Visitor); ok {
		if dr.Ruleset != nil {
			dr.Ruleset = v.Visit(dr.Ruleset)
		}
	}
}

// Eval evaluates the detached ruleset
func (dr *DetachedRuleset) Eval(context interface{}) interface{} {
	frames := dr.Frames
	if frames == nil {
		if ctx, ok := context.(map[string]interface{}); ok {
			if ctxFrames, ok := ctx["frames"].([]interface{}); ok {
				frames = make([]interface{}, len(ctxFrames))
				copy(frames, ctxFrames)
			}
		}
	}
	return NewDetachedRuleset(dr.Ruleset, frames)
}

// CallEval evaluates the ruleset with the given context
func (dr *DetachedRuleset) CallEval(context interface{}) interface{} {
	if dr.Ruleset == nil {
		return nil
	}

	if dr.Frames != nil {
		if ctx, ok := context.(map[string]interface{}); ok {
			if ctxFrames, ok := ctx["frames"].([]interface{}); ok {
				newFrames := append(dr.Frames, ctxFrames...)
				newContext := less.NewEval(context.(map[string]interface{}), newFrames)
				if ruleset, ok := dr.Ruleset.(interface{ Eval(interface{}) interface{} }); ok {
					return ruleset.Eval(newContext)
				}
			}
		}
	}

	if ruleset, ok := dr.Ruleset.(interface{ Eval(interface{}) interface{} }); ok {
		return ruleset.Eval(context)
	}

	return nil
} 