package less_go

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

// testCondition implements Eval for testing selector condition evaluation
// and always returns true.
type testCondition struct{}

func (t *testCondition) Eval(context any) any {
	return true
}

// testExtend implements Eval for testing selector extendList evaluation
// and returns a map documenting the evaluation.
type testExtend struct{}

func (e *testExtend) Eval(context any) any {
	return map[string]any{"evaluated": true, "value": "extended"}
}

// selVisitor always returns a fixed value for any Visit call.
type selVisitor struct {
	returnVal any
}

func (v *selVisitor) IsReplacing() bool {
	return true
}

// Implement visitor methods for different node types
func (v *selVisitor) VisitElement(node any, visitArgs *VisitArgs) any {
	return v.returnVal
}

func (v *selVisitor) VisitElementOut(node any) {
	// No-op
}

// Since the visitor framework might not call VisitElement for all types,
// we need a catch-all that returns our value for any unhandled type
func (v *selVisitor) Visit(node any) any {
	return v.returnVal
}

func TestSelector(t *testing.T) {
	// Constructor tests
	t.Run("constructor", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		elem1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		elem2 := NewElement(" ", "class", false, mockIndex, mockFileInfo, nil)
		mockElements := []*Element{elem1, elem2}
		mockExtendList := []any{"extend1"}

		t.Run("should initialize with provided elements", func(t *testing.T) {
			sel, err := NewSelector(mockElements, mockExtendList, nil, mockIndex, mockFileInfo, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if !reflect.DeepEqual(sel.Elements, mockElements) {
				t.Errorf("Expected elements %v, got %v", mockElements, sel.Elements)
			}
			if !reflect.DeepEqual(sel.ExtendList, mockExtendList) {
				t.Errorf("Expected ExtendList %v, got %v", mockExtendList, sel.ExtendList)
			}
			if sel.Condition != nil {
				t.Errorf("Expected Condition nil, got %v", sel.Condition)
			}
			if sel.GetIndex() != mockIndex {
				t.Errorf("Expected index %d, got %d", mockIndex, sel.GetIndex())
			}
			if fi := sel.FileInfo(); !reflect.DeepEqual(fi, mockFileInfo) {
				t.Errorf("Expected FileInfo %v, got %v", mockFileInfo, fi)
			}
			if !sel.EvaldCondition {
				t.Errorf("Expected EvaldCondition true, got false")
			}
		})

		t.Run("should create default elements when none provided", func(t *testing.T) {
			sel, err := NewSelector(nil, nil, nil, 0, nil, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(sel.Elements) != 1 {
				t.Fatalf("Expected 1 element, got %d", len(sel.Elements))
			}
			if val, ok := sel.Elements[0].Value.(string); !ok || val != "&" {
				t.Errorf("Expected element value '&', got '%v'", sel.Elements[0].Value)
			}
		})

		t.Run("should error on string input without parse function", func(t *testing.T) {
			_, err := NewSelector("invalid{", nil, nil, 0, nil, nil)
			if err == nil {
				t.Fatal("Expected error for string input without parse function, got nil")
			}
		})

		t.Run("should handle null inputs gracefully", func(t *testing.T) {
			sel, err := NewSelector(nil, nil, nil, 0, nil, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(sel.Elements) == 0 || sel.Elements[0].Value != "&" {
				t.Errorf("Expected default '&' element, got %v", sel.Elements)
			}
			if sel.ExtendList != nil {
				t.Errorf("Expected nil ExtendList, got %v", sel.ExtendList)
			}
			if sel.Condition != nil {
				t.Errorf("Expected nil Condition, got %v", sel.Condition)
			}
		})
	})

	// String parsing tests (testing the new parser integration)
	t.Run("string parsing with parse functions", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockContext := map[string]any{"strictImports": false}
		mockImports := map[string]any{}

		// Create a mock parse function that returns test elements
		var mockParseFunc SelectorParseFunc = func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]*Element, error) {
			if input == "div.class" {
				// Return mock elements as if parsed successfully
				return []*Element{
					NewElement("", "div", false, index, fileInfo, nil),
					NewElement("", ".class", false, index, fileInfo, nil),
				}, nil
			}
			if input == "invalid{" {
				return nil, fmt.Errorf("parse error: unexpected character '{'")
			}
			return nil, fmt.Errorf("parse error: unrecognized input")
		}

		t.Run("should parse string input successfully", func(t *testing.T) {
			sel, err := NewSelector("div.class", nil, nil, 0, mockFileInfo, nil, mockParseFunc, mockContext, mockImports)
			
			// Debug: Check if ParseFunc was set
			if sel != nil && sel.ParseFunc == nil {
				t.Errorf("ParseFunc was not set on selector")
			}
			
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(sel.Elements) != 2 {
				t.Errorf("Expected 2 elements, got %d", len(sel.Elements))
			}
			if sel.Elements[0].Value != "div" {
				t.Errorf("Expected first element to be 'div', got %v", sel.Elements[0].Value)
			}
			if sel.Elements[1].Value != ".class" {
				t.Errorf("Expected second element to be '.class', got %v", sel.Elements[1].Value)
			}
		})

		t.Run("should handle parse errors gracefully", func(t *testing.T) {
			_, err := NewSelector("invalid{", nil, nil, 0, mockFileInfo, nil, mockParseFunc, mockContext, mockImports)
			if err == nil {
				t.Fatal("Expected parse error, got nil")
			}
			if !strings.Contains(err.Error(), "unexpected character") {
				t.Errorf("Expected error to mention unexpected character, got: %v", err)
			}
		})

		t.Run("should handle unrecognized input", func(t *testing.T) {
			_, err := NewSelector("unknown", nil, nil, 0, mockFileInfo, nil, mockParseFunc, mockContext, mockImports)
			if err == nil {
				t.Fatal("Expected parse error, got nil")
			}
			if !strings.Contains(err.Error(), "unrecognized input") {
				t.Errorf("Expected error to mention unrecognized input, got: %v", err)
			}
		})

		t.Run("should work without parse context", func(t *testing.T) {
			// Test that the function still works when parse context is nil
			sel, err := NewSelector("div.class", nil, nil, 0, mockFileInfo, nil, mockParseFunc, nil, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(sel.Elements) != 2 {
				t.Errorf("Expected 2 elements, got %d", len(sel.Elements))
			}
		})
	})

	// createDerived tests
	t.Run("createDerived", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		elem := NewElement("", "span", false, mockIndex, mockFileInfo, nil)
		original, _ := NewSelector([]*Element{elem}, nil, nil, mockIndex, mockFileInfo, nil)

		t.Run("should create a new selector with provided elements", func(t *testing.T) {
			newEls := []*Element{elem}
			derived, err := original.CreateDerived(newEls, nil, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if !reflect.DeepEqual(derived.Elements, newEls) {
				t.Errorf("Expected elements %v, got %v", newEls, derived.Elements)
			}
			if !reflect.DeepEqual(derived.ExtendList, original.ExtendList) {
				t.Errorf("Expected ExtendList %v, got %v", original.ExtendList, derived.ExtendList)
			}
			if derived.GetIndex() != mockIndex {
				t.Errorf("Expected index %d, got %d", mockIndex, derived.GetIndex())
			}
			if fi := derived.FileInfo(); !reflect.DeepEqual(fi, mockFileInfo) {
				t.Errorf("Expected FileInfo %v, got %v", mockFileInfo, fi)
			}
		})

		t.Run("should preserve EvaldCondition when specified", func(t *testing.T) {
			original.EvaldCondition = true
			falseVal := false
			derived, err := original.CreateDerived([]*Element{elem}, nil, &falseVal)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if derived.EvaldCondition {
				t.Errorf("Expected EvaldCondition false, got true")
			}
		})
	})

	// match tests
	t.Run("match", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		e1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		e2 := NewElement(" ", "class", false, mockIndex, mockFileInfo, nil)
		sel1, _ := NewSelector([]*Element{e1, e2}, nil, nil, mockIndex, mockFileInfo, nil)
		sel2, _ := NewSelector([]*Element{e1, e2}, nil, nil, mockIndex, mockFileInfo, nil)

		t.Run("should match identical selectors", func(t *testing.T) {
			count := sel1.Match(sel2)
			if count != len(sel1.Elements) {
				t.Errorf("Expected match count %d, got %d", len(sel1.Elements), count)
			}
		})

		t.Run("should not match different selectors", func(t *testing.T) {
			e3 := NewElement("", "span", false, mockIndex, mockFileInfo, nil)
			sel3, _ := NewSelector([]*Element{e3}, nil, nil, mockIndex, mockFileInfo, nil)
			if sel1.Match(sel3) != 0 {
				t.Errorf("Expected match 0, got %d", sel1.Match(sel3))
			}
		})
	})

	// mixinElements tests
	t.Run("mixinElements", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		e1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		e2 := NewElement(" ", "class", false, mockIndex, mockFileInfo, nil)
		sel, _ := NewSelector([]*Element{e1, e2}, nil, nil, mockIndex, mockFileInfo, nil)

		t.Run("should generate mixin elements correctly", func(t *testing.T) {
			parts, err := sel.MixinElements()
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(parts) == 0 {
				t.Errorf("Expected non-empty mixin elements, got %v", parts)
			}
		})

		t.Run("should handle & selector correctly", func(t *testing.T) {
			a := NewElement("", "&", false, mockIndex, mockFileInfo, nil)
			sel2, _ := NewSelector([]*Element{a}, nil, nil, mockIndex, mockFileInfo, nil)
			parts, _ := sel2.MixinElements()
			for _, p := range parts {
				if p == "&" {
					t.Errorf("Expected '&' to be removed, got %v", parts)
				}
			}
		})

		t.Run("should cache mixin elements", func(t *testing.T) {
			p1, _ := sel.MixinElements()
			p2, _ := sel.MixinElements()
			if reflect.ValueOf(p1).Pointer() != reflect.ValueOf(p2).Pointer() {
				t.Error("Expected cached mixin elements to be reused")
			}
		})
	})

	// isJustParentSelector tests
	t.Run("isJustParentSelector", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1

		t.Run("should identify parent selector correctly", func(t *testing.T) {
			a := NewElement("", "&", false, mockIndex, mockFileInfo, nil)
			sel, _ := NewSelector([]*Element{a}, nil, nil, mockIndex, mockFileInfo, nil)
			if !sel.IsJustParentSelector() {
				t.Error("Expected IsJustParentSelector true")
			}
		})

		t.Run("should return false for non-parent selectors", func(t *testing.T) {
			e := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
			sel, _ := NewSelector([]*Element{e}, nil, nil, mockIndex, mockFileInfo, nil)
			if sel.IsJustParentSelector() {
				t.Error("Expected IsJustParentSelector false")
			}
		})

		t.Run("should return false when mediaEmpty is true", func(t *testing.T) {
			a := NewElement("", "&", false, mockIndex, mockFileInfo, nil)
			sel, _ := NewSelector([]*Element{a}, nil, nil, mockIndex, mockFileInfo, nil)
			sel.MediaEmpty = true
			if sel.IsJustParentSelector() {
				t.Error("Expected IsJustParentSelector false when mediaEmpty")
			}
		})
	})

	// eval tests
	t.Run("eval", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		e1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		e2 := NewElement(":", "hover", false, mockIndex, mockFileInfo, nil)

		t.Run("should evaluate selector elements", func(t *testing.T) {
			sel, _ := NewSelector([]*Element{e1, e2}, nil, nil, mockIndex, mockFileInfo, nil)
			res, err := sel.Eval(map[string]any{})
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if len(res.Elements) != 2 {
				t.Errorf("Expected 2 elements, got %d", len(res.Elements))
			}
		})

		t.Run("should evaluate condition when present", func(t *testing.T) {
			cond := &testCondition{}
			sel, _ := NewSelector([]*Element{e1}, nil, cond, mockIndex, mockFileInfo, nil)
			res, err := sel.Eval(map[string]any{})
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if !res.EvaldCondition {
				t.Error("Expected EvaldCondition true")
			}
		})

		t.Run("should evaluate extendList elements", func(t *testing.T) {
			ext := &testExtend{}
			sel, _ := NewSelector([]*Element{e1}, []any{ext}, nil, mockIndex, mockFileInfo, nil)
			res, err := sel.Eval(map[string]any{})
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if m, ok := res.ExtendList[0].(map[string]any); !ok || m["evaluated"] != true || m["value"] != "extended" {
				t.Errorf("Expected evaluated extendList item, got %v", res.ExtendList[0])
			}
		})

		t.Run("should handle nil extendList", func(t *testing.T) {
			sel, _ := NewSelector([]*Element{e1}, nil, nil, mockIndex, mockFileInfo, nil)
			res, err := sel.Eval(map[string]any{})
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if res.ExtendList != nil {
				t.Errorf("Expected nil ExtendList, got %v", res.ExtendList)
			}
		})

		t.Run("should evaluate complex selector elements", func(t *testing.T) {
			sel, _ := NewSelector([]*Element{e1, e2}, nil, nil, mockIndex, mockFileInfo, nil)
			res, err := sel.Eval(map[string]any{})
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if res.Elements[0].Value != "div" || res.Elements[1].Value != "hover" {
				t.Errorf("Expected ['div','hover'], got ['%v','%v']", res.Elements[0].Value, res.Elements[1].Value)
			}
		})
	})

	// genCSS tests
	t.Run("genCSS", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		e1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		e2 := NewElement(">", "span", false, mockIndex, mockFileInfo, nil)
		e3 := NewElement("+", "p", false, mockIndex, mockFileInfo, nil)
		sel, _ := NewSelector([]*Element{e1, e2, e3}, nil, nil, mockIndex, mockFileInfo, nil)

		t.Run("should generate CSS correctly", func(t *testing.T) {
			calls := 0
			out := &CSSOutput{
				Add: func(chunk any, fi any, idx any) {
					if _, ok := chunk.(string); !ok {
						t.Errorf("Expected chunk string, got %T", chunk)
					}
					if !reflect.DeepEqual(fi, mockFileInfo) {
						t.Errorf("Expected FileInfo %v, got %v", mockFileInfo, fi)
					}
					if idx != mockIndex {
						t.Errorf("Expected index %d, got %v", mockIndex, idx)
					}
					calls++
				},
				IsEmpty: func() bool { return false },
			}
			sel.GenCSS(map[string]any{}, out)
			if calls != len(sel.Elements)+1 {
				t.Errorf("Expected %d calls, got %d", len(sel.Elements)+1, calls)
			}
		})

		t.Run("should handle multiple elements with different combinators", func(t *testing.T) {
			var outputStr string
			out := &CSSOutput{
				Add: func(chunk any, fi any, idx any) { outputStr += chunk.(string) },
				IsEmpty: func() bool { return false },
			}
			sel.GenCSS(map[string]any{"firstSelector": false}, out)
			if !strings.Contains(outputStr, "div > span + p") {
				t.Errorf("Expected 'div > span + p' in %q", outputStr)
			}
		})

		t.Run("should handle special characters in selectors", func(t *testing.T) {
			a := NewElement("", `div[data-test="value"]`, false, mockIndex, mockFileInfo, nil)
			b := NewElement(" ", ".class-name", false, mockIndex, mockFileInfo, nil)
			sel2, _ := NewSelector([]*Element{a, b}, nil, nil, mockIndex, mockFileInfo, nil)
			var outputStr string
			out := &CSSOutput{
				Add: func(chunk any, fi any, idx any) { outputStr += chunk.(string) },
				IsEmpty: func() bool { return false },
			}
			sel2.GenCSS(nil, out)
			if !strings.Contains(outputStr, `div[data-test="value"] .class-name`) {
				t.Errorf("Expected selector %q, got %q", `div[data-test="value"] .class-name`, outputStr)
			}
		})

		t.Run("should handle pseudo-classes and pseudo-elements", func(t *testing.T) {
			e1 := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
			e2 := NewElement(":", "hover", false, mockIndex, mockFileInfo, nil)
			e3 := NewElement("::", "before", false, mockIndex, mockFileInfo, nil)
			sel3, _ := NewSelector([]*Element{e1, e2, e3}, nil, nil, mockIndex, mockFileInfo, nil)
			var outputStr string
			out := &CSSOutput{
				Add: func(chunk any, fi any, idx any) { outputStr += chunk.(string) },
				IsEmpty: func() bool { return false },
			}
			sel3.GenCSS(nil, out)
			normalized := strings.Join(strings.Fields(outputStr), " ")
			if normalized != "div : hover :: before" {
				t.Errorf("Expected normalized %q, got %q", "div : hover :: before", normalized)
			}
		})
	})

	// accept tests
	t.Run("accept", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		visitorImpl := &selVisitor{returnVal: NewElement("", "v", false, mockIndex, mockFileInfo, nil)}
		sel, _ := NewSelector([]*Element{NewElement("", "div", false, mockIndex, mockFileInfo, nil)}, []any{"x"}, "cond", mockIndex, mockFileInfo, nil)
		
		// Use the visitor implementation directly (not through the framework)
		sel.Accept(visitorImpl)
		
		// Elements replaced
		for _, e := range sel.Elements {
			if e.Value != "v" {
				t.Errorf("Expected element value 'v', got %v", e.Value)
			}
		}
		// ExtendList replaced
		if len(sel.ExtendList) != 1 || sel.ExtendList[0] != visitorImpl.returnVal {
			t.Errorf("Expected ExtendList[0] %v, got %v", visitorImpl.returnVal, sel.ExtendList)
		}
		// Condition replaced
		if sel.Condition != visitorImpl.returnVal {
			t.Errorf("Expected Condition %v, got %v", visitorImpl.returnVal, sel.Condition)
		}
	})

	// createEmptySelectors tests
	t.Run("createEmptySelectors", func(t *testing.T) {
		mockFileInfo := map[string]any{"filename": "test.less"}
		mockIndex := 1
		e := NewElement("", "div", false, mockIndex, mockFileInfo, nil)
		sel, _ := NewSelector([]*Element{e}, nil, nil, mockIndex, mockFileInfo, nil)
		arr, err := sel.CreateEmptySelectors()
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if len(arr) != 1 {
			t.Fatalf("Expected len 1, got %d", len(arr))
		}
		if v, _ := arr[0].Elements[0].Value.(string); v != "&" {
			t.Errorf("Expected '&' element, got %v", v)
		}
		if !arr[0].MediaEmpty {
			t.Error("Expected MediaEmpty true")
		}
	})

	// getIsOutput tests
	t.Run("getIsOutput", func(t *testing.T) {
		e := NewElement("", "div", false, 0, nil, nil)
		sel, _ := NewSelector([]*Element{e}, nil, nil, 0, nil, nil)
		if sel.GetIsOutput() != sel.EvaldCondition {
			t.Errorf("Expected GetIsOutput %v, got %v", sel.EvaldCondition, sel.GetIsOutput())
		}
		cond := &testCondition{}
		sel2, _ := NewSelector([]*Element{e}, nil, cond, 0, nil, nil)
		if sel2.GetIsOutput() {
			t.Error("Expected GetIsOutput false for non-nil condition")
		}
	})
} 