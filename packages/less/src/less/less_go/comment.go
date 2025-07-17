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
	// Line comments are always silent
	if c.IsLineComment {
		return true
	}
	
	// For block comments, check if we're in compress mode
	var compress bool
	
	// Context is typically a map
	if ctxMap, ok := context.(map[string]any); ok {
		if compressVal, exists := ctxMap["compress"]; exists {
			compress, _ = compressVal.(bool)
		}
	}
	
	// In compress mode, only keep comments starting with /*!
	if compress && len(c.Value) > 2 && c.Value[2] != '!' {
		return true
	}
	
	return false
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