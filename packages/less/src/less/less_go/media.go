package less_go

import (
	"fmt"
)

// Media represents a media query node in the Less AST
type Media struct {
	*AtRule
	Features any
	Rules    []any
	DebugInfo any
}

// NewMedia creates a new Media instance
func NewMedia(value any, features any, index int, currentFileInfo map[string]any, visibilityInfo map[string]any) *Media {
	// Match JavaScript: (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors()
	selector, _ := NewSelector([]any{}, nil, nil, index, currentFileInfo, nil)
	emptySelectors, _ := selector.CreateEmptySelectors()
	
	// Convert selectors to []any for Ruleset
	selectors := make([]any, len(emptySelectors))
	for i, sel := range emptySelectors {
		selectors[i] = sel
	}

	// Match JavaScript: this.features = new Value(features)
	featuresValue, _ := NewValue(features)

	// Match JavaScript: this.rules = [new Ruleset(selectors, value)]
	// Convert value to []any for Ruleset
	var rules []any
	if value != nil {
		if valueSlice, ok := value.([]any); ok {
			rules = valueSlice
		} else {
			rules = []any{value}
		}
	}
	ruleset := NewRuleset(selectors, rules, false, visibilityInfo)
	ruleset.AllowImports = true

	// Create Media instance
	media := &Media{
		AtRule:   NewAtRule("@media", nil, nil, index, currentFileInfo, nil, false, visibilityInfo),
		Features: featuresValue,
		Rules:    []any{ruleset},
	}

	// Match JavaScript: this.allowRoot = true
	media.AllowRoot = true
	media.CopyVisibilityInfo(visibilityInfo)

	// Match JavaScript: this.setParent calls
	media.SetParent(selectors, media.AtRule.Node)
	media.SetParent(media.Features, media.AtRule.Node)
	media.SetParent(media.Rules, media.AtRule.Node)

	return media
}

// GetType returns the type of the node
func (m *Media) GetType() string {
	return "Media"
}

// IsRulesetLike returns true (implementing NestableAtRulePrototype)
func (m *Media) IsRulesetLike() bool {
	return true
}

// Accept visits the node with a visitor (implementing NestableAtRulePrototype)
func (m *Media) Accept(visitor any) {
	if m.Features != nil {
		if v, ok := visitor.(interface{ Visit(any) any }); ok {
			m.Features = v.Visit(m.Features)
		}
	}
	if m.Rules != nil {
		if v, ok := visitor.(interface{ VisitArray([]any) []any }); ok {
			m.Rules = v.VisitArray(m.Rules)
		}
	}
}

// EvalTop evaluates the media rule at the top level (implementing NestableAtRulePrototype)
func (m *Media) EvalTop(context any) any {
	return m
}

// EvalNested evaluates the media rule in a nested context (implementing NestableAtRulePrototype)
func (m *Media) EvalNested(context any) any {
	return m
}

// Permute creates permutations of the given array (implementing NestableAtRulePrototype)
func (m *Media) Permute(arr []any) any {
	if len(arr) == 0 {
		return []any{}
	}
	if len(arr) == 1 {
		return arr[0]
	}
	return []any{}
}

// BubbleSelectors bubbles selectors up the tree (implementing NestableAtRulePrototype)
func (m *Media) BubbleSelectors(selectors any) {
	// Mock implementation like nested-at-rule
}

// GenCSS generates CSS representation
func (m *Media) GenCSS(context any, output *CSSOutput) {
	output.Add("@media ", m.FileInfo(), m.GetIndex())
	
	if m.Features != nil {
		if gen, ok := m.Features.(interface{ GenCSS(any, *CSSOutput) }); ok {
			gen.GenCSS(context, output)
		}
	}
	
	m.OutputRuleset(context, output, m.Rules)
}

// Eval evaluates the media rule - matching JavaScript implementation closely
func (m *Media) Eval(context any) (any, error) {
	ctx, ok := context.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("context must be a map")
	}

	// Match JavaScript: if (!context.mediaBlocks) { context.mediaBlocks = []; context.mediaPath = []; }
	if ctx["mediaBlocks"] == nil {
		ctx["mediaBlocks"] = []any{}
		ctx["mediaPath"] = []any{}
	}

	// Match JavaScript: const media = new Media(null, [], this._index, this._fileInfo, this.visibilityInfo())
	media := NewMedia(nil, []any{}, m.GetIndex(), m.FileInfo(), m.VisibilityInfo())
	
	// Match JavaScript: if (this.debugInfo) { this.rules[0].debugInfo = this.debugInfo; media.debugInfo = this.debugInfo; }
	if m.DebugInfo != nil {
		if len(m.Rules) > 0 {
			if ruleset, ok := m.Rules[0].(*Ruleset); ok {
				ruleset.DebugInfo = m.DebugInfo
			}
		}
		media.DebugInfo = m.DebugInfo
	}

	// Match JavaScript: media.features = this.features.eval(context)
	if m.Features != nil {
		if eval, ok := m.Features.(interface{ Eval(any) (any, error) }); ok {
			evaluated, err := eval.Eval(context)
			if err != nil {
				return nil, err
			}
			media.Features = evaluated
		} else if eval, ok := m.Features.(interface{ Eval(any) any }); ok {
			media.Features = eval.Eval(context)
		}
	}

	// Match JavaScript: context.mediaPath.push(media); context.mediaBlocks.push(media);
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		ctx["mediaPath"] = append(mediaPath, media)
	}
	if mediaBlocks, ok := ctx["mediaBlocks"].([]any); ok {
		ctx["mediaBlocks"] = append(mediaBlocks, media)
	}

	// Match JavaScript: this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
	if len(m.Rules) > 0 {
		if ruleset, ok := m.Rules[0].(*Ruleset); ok {
			frames, framesOk := ctx["frames"].([]any)
			if !framesOk {
				// JavaScript would throw here - frames key must exist
				return nil, fmt.Errorf("frames is required for media evaluation")
			}
			
			// Handle function registry inheritance if frames exist
			if len(frames) > 0 {
				if frameRuleset, ok := frames[0].(*Ruleset); ok && frameRuleset.FunctionRegistry != nil {
					// Stub: ruleset.FunctionRegistry = frameRuleset.FunctionRegistry.Inherit()
					ruleset.FunctionRegistry = frameRuleset.FunctionRegistry
				}
			}

			// Match JavaScript: context.frames.unshift(this.rules[0]);
			newFrames := make([]any, len(frames)+1)
			newFrames[0] = ruleset
			copy(newFrames[1:], frames)
			ctx["frames"] = newFrames

			// Match JavaScript: media.rules = [this.rules[0].eval(context)];
			evaluated, err := ruleset.Eval(context)
			if err != nil {
				return nil, err
			}
			media.Rules = []any{evaluated}

			// Match JavaScript: context.frames.shift();
			if currentFrames, ok := ctx["frames"].([]any); ok && len(currentFrames) > 0 {
				ctx["frames"] = currentFrames[1:]
			}
		}
	}

	// Match JavaScript: context.mediaPath.pop();
	if mediaPath, ok := ctx["mediaPath"].([]any); ok && len(mediaPath) > 0 {
		ctx["mediaPath"] = mediaPath[:len(mediaPath)-1]
	}

	// Match JavaScript: return context.mediaPath.length === 0 ? media.evalTop(context) : media.evalNested(context);
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		if len(mediaPath) == 0 {
			return media.EvalTop(context), nil
		} else {
			return media.EvalNested(context), nil
		}
	}

	return media.EvalTop(context), nil
} 