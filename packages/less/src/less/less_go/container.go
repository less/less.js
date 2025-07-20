package less_go

import (
	"fmt"
)

// Container represents a CSS container at-rule node
type Container struct {
	*AtRule
	Features *Value
	Rules    []any
}

// NewContainer creates a new Container instance
func NewContainer(value any, features any, index int, currentFileInfo map[string]any, visibilityInfo map[string]any) (*Container, error) {
	// Create empty selectors via Selector
	selector, err := NewSelector([]any{}, nil, nil, index, currentFileInfo, nil)
	if err != nil {
		return nil, err
	}
	
	emptySelectors, err := selector.CreateEmptySelectors()
	if err != nil {
		return nil, err
	}

	// Convert emptySelectors to []any for Ruleset
	selectors := make([]any, len(emptySelectors))
	for i, sel := range emptySelectors {
		selectors[i] = sel
	}

	// Create features as Value instance - handle nil case
	var containerFeatures *Value
	if features == nil {
		containerFeatures, err = NewValue([]any{})
		if err != nil {
			return nil, err
		}
	} else {
		containerFeatures, err = NewValue(features)
		if err != nil {
			return nil, err
		}
	}

	// Create rules with Ruleset - convert value to slice if needed
	var rulesetRules []any
	if value != nil {
		if valueSlice, ok := value.([]any); ok {
			rulesetRules = valueSlice
		} else {
			rulesetRules = []any{value}
		}
	}
	ruleset := NewRuleset(selectors, rulesetRules, false, nil)
	ruleset.AllowImports = true
	rules := []any{ruleset}

	// Create the base AtRule
	atRule := NewAtRule("@container", nil, rules, index, currentFileInfo, nil, false, visibilityInfo)
	atRule.AllowRoot = true

	// Create Container instance
	container := &Container{
		AtRule:   atRule,
		Features: containerFeatures,
		Rules:    rules,
	}

	// Set parent relationships
	container.SetParent(selectors, container.Node)
	container.SetParent(containerFeatures.Node, container.Node)
	container.SetParent(rules, container.Node)

	return container, nil
}

// Type returns the node type
func (c *Container) Type() string {
	return "Container"
}

// GetType returns the node type
func (c *Container) GetType() string {
	return "Container"
}

// GenCSS generates CSS representation
func (c *Container) GenCSS(context any, output *CSSOutput) {
	output.Add("@container ", c.FileInfo(), c.GetIndex())
	c.Features.GenCSS(context, output)
	c.OutputRuleset(context, output, c.Rules)
}

// Eval evaluates the container at-rule
func (c *Container) Eval(context any) (*Container, error) {
	ctx, ok := context.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("context must be a map[string]any")
	}

	// Initialize mediaBlocks and mediaPath if not present (like JavaScript !context.mediaBlocks)
	if ctx["mediaBlocks"] == nil {
		ctx["mediaBlocks"] = []any{}
		ctx["mediaPath"] = []any{}
	}

	// Create new Container instance for evaluation
	media, err := NewContainer(nil, []any{}, c.GetIndex(), c.FileInfo(), c.VisibilityInfo())
	if err != nil {
		return nil, fmt.Errorf("error creating media container: %w", err)
	}

	// Copy debug info if present
	if c.DebugInfo != nil {
		c.Rules[0].(*Ruleset).DebugInfo = c.DebugInfo
		media.DebugInfo = c.DebugInfo
	}

	// Evaluate features
	evaluatedFeatures, err := c.Features.Eval(context)
	if err != nil {
		return nil, fmt.Errorf("error evaluating features: %w", err)
	}
	
	if featuresValue, ok := evaluatedFeatures.(*Value); ok {
		media.Features = featuresValue
	} else {
		// If eval doesn't return a Value, wrap it
		media.Features, err = NewValue(evaluatedFeatures)
		if err != nil {
			return nil, fmt.Errorf("error wrapping features in Value: %w", err)
		}
	}

	// Add to media path and blocks
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		ctx["mediaPath"] = append(mediaPath, media)
	}
	if mediaBlocks, ok := ctx["mediaBlocks"].([]any); ok {
		ctx["mediaBlocks"] = append(mediaBlocks, media)
	}

	// Set up function registry inheritance
	firstRuleset := c.Rules[0].(*Ruleset)
	if frames, ok := ctx["frames"].([]any); ok && len(frames) > 0 {
		if firstFrame, ok := frames[0].(*Ruleset); ok && firstFrame.FunctionRegistry != nil {
			// Create a mock function registry with inherit method
			firstRuleset.FunctionRegistry = map[string]any{
				"inherit": func() any {
					return firstFrame.FunctionRegistry
				},
			}
		}
	}

	// Evaluate rules
	frames := []any{firstRuleset}
	if existingFrames, ok := ctx["frames"].([]any); ok {
		frames = append(frames, existingFrames...)
	}
	ctx["frames"] = frames

	evaluatedRuleset, err := firstRuleset.Eval(context)
	if err != nil {
		return nil, fmt.Errorf("error evaluating ruleset: %w", err)
	}
	media.Rules = []any{evaluatedRuleset}

	// Remove current ruleset from frames
	if framesList, ok := ctx["frames"].([]any); ok && len(framesList) > 0 {
		ctx["frames"] = framesList[1:]
	}

	// Pop from media path
	if mediaPath, ok := ctx["mediaPath"].([]any); ok && len(mediaPath) > 0 {
		ctx["mediaPath"] = mediaPath[:len(mediaPath)-1]
	}

	// Determine return value based on mediaPath length
	var mediaPathLength int
	if mediaPath, ok := ctx["mediaPath"].([]any); ok {
		mediaPathLength = len(mediaPath)
	}

	if mediaPathLength == 0 {
		return media.EvalTop(context), nil
	}
	return media.EvalNested(context), nil
}

// EvalTop evaluates the container at the top level
func (c *Container) EvalTop(context any) *Container {
	// Embed NestableAtRulePrototype functionality
	prototype := NewNestableAtRulePrototype()
	prototype.Type = "Container"
	prototype.Features = c.Features
	prototype.Rules = c.Rules
	prototype.Node = c.Node

	result := prototype.EvalTop(context)
	
	// If EvalTop returns a different type (like Ruleset), we need to handle it
	if result != c {
		// Return the container as-is since the prototype may have modified context
		return c
	}
	
	return c
}

// EvalNested evaluates the container in a nested context
func (c *Container) EvalNested(context any) *Container {
	// Embed NestableAtRulePrototype functionality
	prototype := NewNestableAtRulePrototype()
	prototype.Type = "Container"
	prototype.Features = c.Features
	prototype.Rules = c.Rules
	prototype.Node = c.Node

	result := prototype.EvalNested(context)
	
	// EvalNested typically returns a Ruleset for nested contexts
	if ruleset, ok := result.(*Ruleset); ok {
		// Create a new container with the nested ruleset
		newContainer, err := NewContainer(ruleset.Rules, c.Features, c.GetIndex(), c.FileInfo(), c.VisibilityInfo())
		if err != nil {
			return c
		}
		return newContainer
	}
	
	return c
} 