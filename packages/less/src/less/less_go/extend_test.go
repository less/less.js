package less_go

import (
	"fmt"
	"reflect"
	"testing"
)

// errSelector is used to simulate Eval error
type errSelector struct{}
func (e *errSelector) Eval(context any) (*Selector, error) {
    return nil, fmt.Errorf("Eval error")
}

// nilSelector is used to simulate Eval returning nil
type nilSelector struct{}
func (n *nilSelector) Eval(context any) (*Selector, error) {
    return nil, nil
}

func TestExtendConstructorBasic(t *testing.T) {
    // Reset ID counter
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    blocks := 2
    visible := true
    mockVisibilityInfo := map[string]any{"visibilityBlocks": &blocks, "nodeVisible": &visible}

    sel, err := NewSelector(nil, nil, nil, 0, mockFileInfo, mockVisibilityInfo)
    if err != nil {
        t.Fatalf("Failed to create selector: %v", err)
    }

    ext := NewExtend(sel, "all", 0, mockFileInfo, mockVisibilityInfo)

    if ext.Selector != sel {
        t.Errorf("Expected selector %v, got %v", sel, ext.Selector)
    }
    if ext.Option != "all" {
        t.Errorf("Expected option 'all', got %s", ext.Option)
    }
    if ext.ObjectId != 0 {
        t.Errorf("Expected ObjectId 0, got %d", ext.ObjectId)
    }
    if !reflect.DeepEqual(ext.ParentIds, []int{0}) {
        t.Errorf("Expected ParentIds [0], got %v", ext.ParentIds)
    }
    if ext.GetIndex() != 0 {
        t.Errorf("Expected index 0, got %d", ext.GetIndex())
    }
    if !reflect.DeepEqual(ext.FileInfo(), mockFileInfo) {
        t.Errorf("Expected FileInfo %v, got %v", mockFileInfo, ext.FileInfo())
    }
    if !ext.AllowRoot {
        t.Error("Expected AllowRoot true")
    }
    if !ext.AllowBefore {
        t.Error("Expected AllowBefore true")
    }
    if !ext.AllowAfter {
        t.Error("Expected AllowAfter true")
    }
}

func TestExtendConstructorOptionCases(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 0, mockFileInfo, nil)

    ext1 := NewExtend(sel, "!all", 0, mockFileInfo, nil)
    if !ext1.AllowBefore || !ext1.AllowAfter {
        t.Error("Expected AllowBefore and AllowAfter true for '!all'")
    }

    ext2 := NewExtend(sel, "default", 0, mockFileInfo, nil)
    if ext2.AllowBefore || ext2.AllowAfter {
        t.Error("Expected AllowBefore and AllowAfter false for default option")
    }
}

func TestExtendNextIDIncrement(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 0, mockFileInfo, nil)

    e1 := NewExtend(sel, "all", 0, mockFileInfo, nil)
    e2 := NewExtend(sel, "all", 0, mockFileInfo, nil)
    if e1.ObjectId != 0 || e2.ObjectId != 1 {
        t.Errorf("Expected ObjectIds 0 and 1, got %d and %d", e1.ObjectId, e2.ObjectId)
    }
}

func TestExtendParentRelationship(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 0, mockFileInfo, nil)
    ext := NewExtend(sel, "all", 0, mockFileInfo, nil)

    if sel.Node.Parent != ext.Node {
        t.Error("Expected selector parent to be the extend node")
    }
}

func TestExtendEval(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 5, mockFileInfo, nil)
    ext := NewExtend(sel, "all", 5, mockFileInfo, nil)

    result, err := ext.Eval(map[string]any{})
    if err != nil {
        t.Fatalf("Unexpected error: %v", err)
    }
    if result == ext {
        t.Error("Expected Eval to return a new instance")
    }
    if result.Option != ext.Option {
        t.Errorf("Expected Option %s, got %s", ext.Option, result.Option)
    }
    if result.GetIndex() != ext.GetIndex() {
        t.Errorf("Expected index %d, got %d", ext.GetIndex(), result.GetIndex())
    }
    if !reflect.DeepEqual(result.FileInfo(), ext.FileInfo()) {
        t.Errorf("Expected FileInfo %v, got %v", ext.FileInfo(), result.FileInfo())
    }
}

func TestExtendEvalError(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    ext := NewExtend(&errSelector{}, "all", 0, mockFileInfo, nil)
    _, err := ext.Eval(nil)
    if err == nil || err.Error() != "Eval error" {
        t.Errorf("Expected Eval error, got %v", err)
    }
}

func TestExtendEvalNilSelector(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    ext := NewExtend(&nilSelector{}, "all", 0, mockFileInfo, nil)
    result, err := ext.Eval(nil)
    if err != nil {
        t.Fatalf("Unexpected error: %v", err)
    }
    if result.Selector != nil {
        t.Errorf("Expected nil selector, got %v", result.Selector)
    }
}

func TestExtendClone(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 3, mockFileInfo, nil)
    ext := NewExtend(sel, "all", 3, mockFileInfo, nil)

    cloned := ext.Clone(map[string]any{"foo": "bar"})
    if cloned == ext {
        t.Error("Expected Clone to return a new instance")
    }
    if cloned.Selector != ext.Selector || cloned.Option != ext.Option || cloned.GetIndex() != ext.GetIndex() || !reflect.DeepEqual(cloned.FileInfo(), ext.FileInfo()) {
        t.Error("Clone did not preserve properties")
    }
    if !cloned.AllowRoot {
        t.Error("Expected AllowRoot true on cloned instance")
    }
}

func TestExtendFindSelfSelectors(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 0, mockFileInfo, nil)
    ext := NewExtend(sel, "all", 0, mockFileInfo, nil)

    // Empty selectors
    ext.FindSelfSelectors([]any{})
    if len(ext.SelfSelectors) != 1 {
        t.Errorf("Expected 1 self selector, got %d", len(ext.SelfSelectors))
    }
    if selfSel, ok := ext.SelfSelectors[0].(*Selector); ok {
        if len(selfSel.Elements) != 0 {
            t.Errorf("Expected 0 elements in self selector, got %d", len(selfSel.Elements))
        }
    } else {
        t.Error("Expected SelfSelectors[0] to be a *Selector")
    }

    // Single selector
    elem := NewElement(nil, "x", false, 0, mockFileInfo, nil)
    sel2, _ := NewSelector([]*Element{elem}, nil, nil, 0, mockFileInfo, nil)
    ext.FindSelfSelectors([]any{sel2})
    if selfSel, ok := ext.SelfSelectors[0].(*Selector); ok {
        if len(selfSel.Elements) != 1 {
            t.Errorf("Expected 1 element, got %d", len(selfSel.Elements))
        }
        if selfSel.Elements[0].Value != elem.Value {
            t.Errorf("Expected element Value %v, got %v", elem.Value, selfSel.Elements[0].Value)
        }
    } else {
        t.Error("Expected SelfSelectors[0] to be a *Selector")
    }

    // Concatenation with space
    elemA := NewElement(nil, "a", false, 0, mockFileInfo, nil)
    elemB := NewElement(nil, "b", false, 0, mockFileInfo, nil)
    selA, _ := NewSelector([]*Element{elemA}, nil, nil, 0, mockFileInfo, nil)
    selB, _ := NewSelector([]*Element{elemB}, nil, nil, 0, mockFileInfo, nil)
    // Reset combinator of second to empty string to simulate join
    selB.Elements[0].Combinator.Value = ""
    ext.FindSelfSelectors([]any{selA, selB})
    if selfSel, ok := ext.SelfSelectors[0].(*Selector); ok {
        if len(selfSel.Elements) != 2 {
            t.Errorf("Expected 2 elements after concatenation, got %d", len(selfSel.Elements))
        }
        if selfSel.Elements[1].Combinator.Value != " " {
            t.Errorf("Expected space combinator on second element, got '%s'", selfSel.Elements[1].Combinator.Value)
        }
    } else {
        t.Error("Expected SelfSelectors[0] to be a *Selector")
    }
}

func TestExtendTypeAndProperties(t *testing.T) {
    extendNextID = 0
    mockFileInfo := map[string]any{"filename": "test.less"}
    sel, _ := NewSelector(nil, nil, nil, 0, mockFileInfo, nil)
    ext := NewExtend(sel, "all", 0, mockFileInfo, nil)

    if ext.Type() != "Extend" {
        t.Errorf("Expected Type 'Extend', got '%s'", ext.Type())
    }
    // Ensure AllowRoot persists on clone
    cloned := ext.Clone(nil)
    if !cloned.AllowRoot {
        t.Error("Expected AllowRoot true on cloned instance")
    }

    // Visibility info presence
    visInfo := ext.VisibilityInfo()
    if visInfo == nil {
        t.Error("Expected VisibilityInfo to be non-nil")
    }
} 