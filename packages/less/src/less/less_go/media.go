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
	// Create empty selectors like JavaScript version
	selector, err := NewSelector([]any{}, nil, nil, index, currentFileInfo, nil)
	if err != nil {
		// If selector creation fails, create a basic one
		selector = &Selector{
			Node:           NewNode(),
			Elements:       []*Element{},
			ExtendList:     nil,
			Condition:      nil,
			EvaldCondition: true,
		}
		selector.Index = index
		if currentFileInfo != nil {
			selector.SetFileInfo(currentFileInfo)
		}
	}
	
	emptySelectors, err := selector.CreateEmptySelectors()
	if err != nil {
		// Fallback to basic empty selectors
		emptySelectors = []*Selector{selector}
	}
	
	// Convert selectors to []any for Ruleset
	selectors := make([]any, len(emptySelectors))
	for i, sel := range emptySelectors {
		selectors[i] = sel
	}

	// Create Value from features
	var featuresValue any
	if features != nil {
		if val, err := NewValue(features); err == nil {
			featuresValue = val
		} else {
			featuresValue = features
		}
	} else {
		if val, err := NewValue([]any{}); err == nil {
			featuresValue = val
		}
	}

	// Create Ruleset from selectors and value
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
		AtRule:    NewAtRule("@media", nil, nil, index, currentFileInfo, nil, false, visibilityInfo),
		Features:  featuresValue,
		Rules:     []any{ruleset},
	}

	// Set allowRoot like JavaScript version
	media.AllowRoot = true

	// Set parent relationships
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

// Eval evaluates the media rule
func (m *Media) Eval(context any) (any, error) {
	ctx, ok := context.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("context must be a map")
	}

	// Initialize mediaBlocks and mediaPath if not present
	if ctx["mediaBlocks"] == nil {
		ctx["mediaBlocks"] = []any{}
		ctx["mediaPath"] = []any{}
	}

	// Create new media instance
	media := NewMedia(nil, []any{}, m.GetIndex(), m.FileInfo(), m.VisibilityInfo())
	
	// Copy debug info if present
	if m.DebugInfo != nil {
		if len(m.Rules) > 0 {
			if ruleset, ok := m.Rules[0].(*Ruleset); ok {
				ruleset.DebugInfo = m.DebugInfo
			}
		}
		media.DebugInfo = m.DebugInfo
	}

	// Evaluate features
	if m.Features != nil {
		if eval, ok := m.Features.(interface{ Eval(any) (any, error) }); ok {
			evaluated, err := eval.Eval(context)
			if err != nil {
				return nil, err
			}
			media.Features = evaluated
		}
	}

	// Add to media path and blocks
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		ctx["mediaPath"] = append(mediaPath, media)
	}
	if mediaBlocks, ok := ctx["mediaBlocks"].([]any); ok {
		ctx["mediaBlocks"] = append(mediaBlocks, media)
	}

	// Handle function registry inheritance - match JavaScript behavior
	if len(m.Rules) > 0 {
		if ruleset, ok := m.Rules[0].(*Ruleset); ok {
			// JavaScript version accesses context.frames[0].functionRegistry.inherit() directly
			// This will error if frames is missing, but handles empty array gracefully
			frames, framesOk := ctx["frames"].([]any)
			if !framesOk {
				return nil, fmt.Errorf("frames is required for media evaluation")
			}
			
			// Only access frames[0] if frames is not empty
			if len(frames) > 0 {
				if frameRuleset, ok := frames[0].(*Ruleset); ok && frameRuleset.FunctionRegistry != nil {
					// Create inherited function registry (stubbed for now)
					ruleset.FunctionRegistry = frameRuleset.FunctionRegistry
				}
			}

			// Push ruleset to frames
			newFrames := make([]any, len(frames)+1)
			newFrames[0] = ruleset
			copy(newFrames[1:], frames)
			ctx["frames"] = newFrames

			// Evaluate the ruleset
			evaluated, err := ruleset.Eval(context)
			if err != nil {
				return nil, err
			}
			media.Rules = []any{evaluated}

			// Pop frames
			if currentFrames, ok := ctx["frames"].([]any); ok && len(currentFrames) > 0 {
				ctx["frames"] = currentFrames[1:]
			}
		}
	}

	// Pop media path
	if mediaPath, ok := ctx["mediaPath"].([]any); ok && len(mediaPath) > 0 {
		ctx["mediaPath"] = mediaPath[:len(mediaPath)-1]
	}

	// Return evalTop or evalNested based on media path length
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		if len(mediaPath) == 0 {
			return media.EvalTop(context), nil
		} else {
			return media.EvalNested(context), nil
		}
	}

	return media.EvalTop(context), nil
} 