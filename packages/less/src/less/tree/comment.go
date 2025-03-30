package tree

// Comment represents a comment node in the Less AST
type Comment struct {
	*Node
	Value        string
	IsLineComment bool
	AllowRoot    bool
	DebugInfo    *DebugContext
}

// NewComment creates a new Comment instance
func NewComment(value string, isLineComment bool, index int, currentFileInfo map[string]interface{}) *Comment {
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
func (c *Comment) GenCSS(context interface{}, output *CSSOutput) {
	if c.DebugInfo != nil {
		output.Add(DebugInfo(context.(*Context), c.DebugInfo, ""), c.FileInfo(), c.GetIndex())
	}
	output.Add(c.Value, nil, nil)
}

// IsSilent determines if the comment should be silent based on context
func (c *Comment) IsSilent(context interface{}) bool {
	ctx, ok := context.(*Context)
	if !ok {
		return false
	}
	isCompressed := ctx.Compress && len(c.Value) > 2 && c.Value[2] != '!'
	return c.IsLineComment || isCompressed
}

// SetParent sets the parent for the comment node
func (c *Comment) SetParent(node interface{}, parent *Node) {
	if parent != nil {
		c.Parent = parent
	}
} 