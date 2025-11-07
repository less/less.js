package less_go

import (
)

// DetachedRuleset represents a detached ruleset in the Less AST
type DetachedRuleset struct {
	*Node
	ruleset any // Can be *Node or *Ruleset
	frames  []any
}

// NewDetachedRuleset creates a new DetachedRuleset instance
func NewDetachedRuleset(ruleset any, frames []any) *DetachedRuleset {
	dr := &DetachedRuleset{
		Node:    NewNode(),
		ruleset: ruleset,
		frames:  frames,
	}
	if node, ok := ruleset.(*Node); ok {
		dr.Node.SetParent(node, dr.Node)
	}
	return dr
}

// Accept implements the visitor pattern
func (dr *DetachedRuleset) Accept(visitor any) {
	// Match JavaScript: this.ruleset = visitor.visit(this.ruleset);
	if v, ok := visitor.(interface{ Visit(any) any }); ok {
		if result := v.Visit(dr.ruleset); result != nil {
			dr.ruleset = result
		}
	}
}

// Eval evaluates the detached ruleset
func (dr *DetachedRuleset) Eval(context any) any {
	// Match JavaScript: const frames = this.frames || utils.copyArray(context.frames);
	frames := dr.frames
	if frames == nil {
		// Copy frames from context
		switch ctx := context.(type) {
		case *Eval:
			if ctx.Frames != nil {
				frames = CopyArray(ctx.Frames)
			}
		case map[string]any:
			if contextFrames, ok := ctx["frames"].([]any); ok {
				frames = CopyArray(contextFrames)
			}
		}
	}
	// Match JavaScript: return new DetachedRuleset(this.ruleset, frames);
	return NewDetachedRuleset(dr.ruleset, frames)
}

// CallEval calls eval on the ruleset with the appropriate context
func (dr *DetachedRuleset) CallEval(context any) any {
	// Match JavaScript: return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);

	var evalContext any = context

	if dr.frames != nil {
		// Create concatenated frames: this.frames.concat(context.frames)
		var contextFrames []any

		switch ctx := context.(type) {
		case *Eval:
			contextFrames = ctx.Frames
			// Create new Eval with concatenated frames and all properties copied
			newEval := &Eval{
				Frames:            append(dr.frames, contextFrames...),
				Compress:          ctx.Compress,
				Math:              ctx.Math,
				StrictUnits:       ctx.StrictUnits,
				Paths:             ctx.Paths,
				SourceMap:         ctx.SourceMap,
				ImportMultiple:    ctx.ImportMultiple,
				UrlArgs:           ctx.UrlArgs,
				JavascriptEnabled: ctx.JavascriptEnabled,
				PluginManager:     ctx.PluginManager,
				ImportantScope:    ctx.ImportantScope,
				RewriteUrls:       ctx.RewriteUrls,
				CalcStack:         ctx.CalcStack,
				ParensStack:       ctx.ParensStack,
				InCalc:            ctx.InCalc,
				MathOn:            ctx.MathOn,
				DefaultFunc:       ctx.DefaultFunc,
			}
			evalContext = newEval
		case map[string]any:
			// Copy all context keys to preserve mediaBlocks, mediaPath, etc.
			contextMap := make(map[string]any, len(ctx))
			for k, v := range ctx {
				contextMap[k] = v
			}

			if frames, ok := ctx["frames"].([]any); ok {
				contextFrames = frames
			}
			newFrames := append(dr.frames, contextFrames...)
			contextMap["frames"] = newFrames
			evalContext = contextMap
		default:
			// Fallback for unknown context types
			evalContext = context
		}
	}

	// Call eval on the ruleset
	if dr.ruleset != nil {
		// Check if ruleset is a Ruleset
		if ruleset, ok := dr.ruleset.(*Ruleset); ok {
			// Ruleset.Eval expects map[string]any, convert if needed
			mapContext := evalContextToMap(evalContext)
			result, err := ruleset.Eval(mapContext)
			if err != nil {
				// Match JavaScript behavior - throw the error
				panic(err)
			}
			return result
		}

		// Check if ruleset is a Node with Value
		if node, ok := dr.ruleset.(*Node); ok && node.Value != nil {
			// Check if the value is a Ruleset
			if ruleset, ok := node.Value.(*Ruleset); ok {
				// Ruleset.Eval expects map[string]any, convert if needed
				mapContext := evalContextToMap(evalContext)
				result, err := ruleset.Eval(mapContext)
				if err != nil {
					panic(err)
				}
				return result
			}

			// Try single-return eval first (matches most nodes)
			if evaluator, ok := node.Value.(interface{ Eval(any) any }); ok {
				return evaluator.Eval(evalContext)
			}
			// Try double-return eval
			if evaluator, ok := node.Value.(interface{ Eval(any) (any, error) }); ok {
				result, err := evaluator.Eval(evalContext)
				if err != nil {
					// Match JavaScript behavior - throw the error
					panic(err)
				}
				return result
			}
		}

		// Try to eval the ruleset directly if it has an Eval method
		if evaluator, ok := dr.ruleset.(interface{ Eval(any) (any, error) }); ok {
			result, err := evaluator.Eval(evalContext)
			if err != nil {
				panic(err)
			}
			return result
		}

		// If nothing worked, return the ruleset itself
		return dr.ruleset
	}

	return nil
}

// evalContextToMap converts an evaluation context to map[string]any for Ruleset.Eval
func evalContextToMap(context any) map[string]any {
	switch ctx := context.(type) {
	case map[string]any:
		return ctx
	case *Eval:
		// Convert Eval to map, preserving all necessary properties
		return map[string]any{
			"frames":            ctx.Frames,
			"compress":          ctx.Compress,
			"math":              ctx.Math,
			"strictUnits":       ctx.StrictUnits,
			"paths":             ctx.Paths,
			"sourceMap":         ctx.SourceMap,
			"importMultiple":    ctx.ImportMultiple,
			"urlArgs":           ctx.UrlArgs,
			"javascriptEnabled": ctx.JavascriptEnabled,
			"pluginManager":     ctx.PluginManager,
			"importantScope":    ctx.ImportantScope,
			"rewriteUrls":       ctx.RewriteUrls,
		}
	default:
		// Fallback for unknown types
		return map[string]any{
			"frames": []any{},
		}
	}
}

// Type returns the type of the node
func (dr *DetachedRuleset) Type() string {
	return "DetachedRuleset"
}

// GetType returns the type of the node for visitor pattern consistency
func (dr *DetachedRuleset) GetType() string {
	return "DetachedRuleset"
}

// EvalFirst indicates whether this node should be evaluated first
func (dr *DetachedRuleset) EvalFirst() bool {
	return true
}

// HasRuleset indicates whether this detached ruleset has an inner ruleset
// This is used by NamespaceValue to determine if it should unwrap the ruleset
func (dr *DetachedRuleset) HasRuleset() bool {
	return dr.ruleset != nil
}

// GetRuleset returns the inner ruleset for evaluation
// This is used by NamespaceValue to unwrap detached rulesets and access their variables/properties
func (dr *DetachedRuleset) GetRuleset() any {
	return dr.ruleset
} 