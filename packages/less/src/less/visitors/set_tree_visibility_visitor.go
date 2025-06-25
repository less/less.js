package visitors

import (
	"reflect"
)

// SetTreeVisibilityVisitor implements the visitor pattern to set tree visibility
type SetTreeVisibilityVisitor struct {
	visible any
}

// NewSetTreeVisibilityVisitor creates a new SetTreeVisibilityVisitor instance
func NewSetTreeVisibilityVisitor(visible any) *SetTreeVisibilityVisitor {
	return &SetTreeVisibilityVisitor{
		visible: visible,
	}
}

// Run starts the visitor on the root node
func (v *SetTreeVisibilityVisitor) Run(root any) {
	v.Visit(root)
}

// VisitArray visits an array of nodes
func (v *SetTreeVisibilityVisitor) VisitArray(nodes any) any {
	if nodes == nil {
		return nodes
	}

	// Handle different array types through reflection
	nodesVal := reflect.ValueOf(nodes)
	if nodesVal.Kind() != reflect.Slice && nodesVal.Kind() != reflect.Array {
		return nodes
	}

	cnt := nodesVal.Len()
	for i := 0; i < cnt; i++ {
		nodeInterface := nodesVal.Index(i).Interface()
		v.Visit(nodeInterface)
	}
	return nodes
}

// Visit visits a single node
func (v *SetTreeVisibilityVisitor) Visit(node any) any {
	if node == nil {
		return node
	}

	// Check if node is an array
	nodeVal := reflect.ValueOf(node)
	if nodeVal.Kind() == reflect.Slice || nodeVal.Kind() == reflect.Array {
		return v.VisitArray(node)
	}

	// Check if node has blocksVisibility method and if it blocks visibility
	if v.hasBlocksVisibilityMethod(node) && v.callBlocksVisibility(node) {
		return node
	}

	// Set visibility based on visitor's visible flag
	if v.isTruthy(v.visible) {
		v.callEnsureVisibility(node)
	} else {
		v.callEnsureInvisibility(node)
	}

	// Call accept method if it exists
	v.callAccept(node, v)

	return node
}

// hasBlocksVisibilityMethod checks if node has blocksVisibility method
func (v *SetTreeVisibilityVisitor) hasBlocksVisibilityMethod(node any) bool {
	if node == nil {
		return false
	}
	
	nodeVal := reflect.ValueOf(node)
	method := nodeVal.MethodByName("BlocksVisibility")
	return method.IsValid()
}

// callBlocksVisibility calls the blocksVisibility method on the node
func (v *SetTreeVisibilityVisitor) callBlocksVisibility(node any) bool {
	if node == nil {
		return false
	}
	
	nodeVal := reflect.ValueOf(node)
	method := nodeVal.MethodByName("BlocksVisibility")
	if !method.IsValid() {
		return false
	}
	
	results := method.Call(nil)
	if len(results) > 0 {
		if boolResult, ok := results[0].Interface().(bool); ok {
			return boolResult
		}
	}
	return false
}

// callEnsureVisibility calls the ensureVisibility method on the node
func (v *SetTreeVisibilityVisitor) callEnsureVisibility(node any) {
	if node == nil {
		return
	}
	
	nodeVal := reflect.ValueOf(node)
	method := nodeVal.MethodByName("EnsureVisibility")
	if !method.IsValid() {
		panic("node.ensureVisibility is not a function")
	}
	method.Call(nil)
}

// callEnsureInvisibility calls the ensureInvisibility method on the node
func (v *SetTreeVisibilityVisitor) callEnsureInvisibility(node any) {
	if node == nil {
		return
	}
	
	nodeVal := reflect.ValueOf(node)
	method := nodeVal.MethodByName("EnsureInvisibility")
	if !method.IsValid() {
		panic("node.ensureInvisibility is not a function")
	}
	method.Call(nil)
}

// callAccept calls the accept method on the node with the visitor
func (v *SetTreeVisibilityVisitor) callAccept(node any, visitor any) {
	if node == nil {
		return
	}
	
	nodeVal := reflect.ValueOf(node)
	method := nodeVal.MethodByName("Accept")
	if method.IsValid() {
		method.Call([]reflect.Value{reflect.ValueOf(visitor)})
	}
}

// isTruthy determines if a value is truthy (JavaScript-like behavior)
func (v *SetTreeVisibilityVisitor) isTruthy(value any) bool {
	if value == nil {
		return false
	}
	
	switch v := value.(type) {
	case bool:
		return v
	case int:
		return v != 0
	case int8:
		return v != 0
	case int16:
		return v != 0
	case int32:
		return v != 0
	case int64:
		return v != 0
	case uint:
		return v != 0
	case uint8:
		return v != 0
	case uint16:
		return v != 0
	case uint32:
		return v != 0
	case uint64:
		return v != 0
	case float32:
		return v != 0.0
	case float64:
		return v != 0.0
	case string:
		return v != ""
	default:
		// For other types, check if they're nil or have a zero value
		val := reflect.ValueOf(value)
		if !val.IsValid() {
			return false
		}
		if val.Kind() == reflect.Ptr || val.Kind() == reflect.Interface {
			return !val.IsNil()
		}
		return !val.IsZero()
	}
}