package less_go

// Comment represents a comment node in the Less AST
type Comment struct {
	*Node
	Value        string
	IsLineComment bool
	AllowRoot    bool
	DebugInfo    map[string]any
}

// NewComment creates a new Comment instance
func NewComment(value string, isLineComment bool, index int, currentFileInfo map[string]any) *Comment {
	comment := &Comment{
		Node:         NewNode(),
		Value:        value,
		IsLineComment: isLineComment,
	}
	comment.Index = index
	comment.SetFileInfo(currentFileInfo)
	comment.AllowRoot = true
	return comment
}

// GetType returns the node type
func (c *Comment) GetType() string {
	return "Comment"
}

// Accept accepts a visitor
func (c *Comment) Accept(visitor any) {
	// Comments don't have children to visit, so just visit self
	if v, ok := visitor.(interface{ VisitComment(any, any) any }); ok {
		v.VisitComment(c, nil)
	}
}

// GenCSS generates CSS representation of the comment
func (c *Comment) GenCSS(context any, output *CSSOutput) {
	if c.DebugInfo != nil {
		// Convert context to map if needed
		var ctx map[string]any
		if ctxMap, ok := context.(map[string]any); ok {
			ctx = ctxMap
		}
		if ctx != nil {
			output.Add(DebugInfo(ctx, c, ""), c.FileInfo(), c.GetIndex())
		}
	}
	output.Add(c.Value, nil, nil)
}

// IsSilent determines if the comment should be silent based on context
func (c *Comment) IsSilent(context any) bool {
	// JavaScript implementation:
	// const isCompressed = context.compress && this.value[2] !== '!';
	// return this.isLineComment || isCompressed;
	
	// Check if we're in compress mode
	var compress bool
	if ctxMap, ok := context.(map[string]any); ok {
		if compressVal, exists := ctxMap["compress"]; exists {
			compress, _ = compressVal.(bool)
		}
	}
	
	// Match JavaScript logic exactly
	isCompressed := compress && len(c.Value) > 2 && c.Value[2] != '!'
	return c.IsLineComment || isCompressed
}

// SetParent sets the parent for the comment node
func (c *Comment) SetParent(node any, parent *Node) {
	if parent != nil {
		c.Parent = parent
	}
}

// GetDebugInfo returns debug information for this comment
func (c *Comment) GetDebugInfo() map[string]any {
	return c.DebugInfo
}

// Eval evaluates the comment - just returns itself
func (c *Comment) Eval(context any) any {
	return c
}

// DebugInfo formats debug info for a comment node
func DebugInfo(context map[string]any, node any, separator string) string {
	if context == nil || node == nil {
		return ""
	}
	
	// Check if dumpLineNumbers is enabled
	dumpLineNumbers, ok := context["dumpLineNumbers"].(string)
	if !ok || dumpLineNumbers == "" {
		return ""
	}
	
	// Check if compress is enabled
	compress, _ := context["compress"].(bool)
	if compress && dumpLineNumbers != "all" {
		return ""
	}
	
	// Get debug info from the node
	var debugInfo map[string]any
	if comment, ok := node.(*Comment); ok && comment.DebugInfo != nil {
		debugInfo = comment.DebugInfo
	} else {
		return ""
	}
	
	// Extract line number and filename
	lineNumber, ok := debugInfo["lineNumber"].(int)
	if !ok {
		return ""
	}
	
	fileName, ok := debugInfo["fileName"].(string)
	if !ok {
		return ""
	}
	
	// Use the same formatting functions as GetDebugInfo in ruleset.go
	var result string
	switch dumpLineNumbers {
	case "comments":
		result = asComment(lineNumber, fileName)
	case "mediaquery":
		result = asMediaQuery(lineNumber, fileName)
	case "all":
		result = asComment(lineNumber, fileName)
		if separator != "" {
			result += separator
		}
		result += asMediaQuery(lineNumber, fileName)
	}
	
	return result
} 