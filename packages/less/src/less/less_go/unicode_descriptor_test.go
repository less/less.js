package less_go

import (
	"fmt"
	"testing"
)



func TestUnicodeDescriptorConstructorAndBasicProperties(t *testing.T) {
	t.Run("should create a UnicodeDescriptor with a value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("U+1F600")
		if descriptor.GetValue() != "U+1F600" {
			t.Errorf("Expected value to be %q, got %v", "U+1F600", descriptor.GetValue())
		}
	})

	t.Run("should create a UnicodeDescriptor with string value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("emoji-smile")
		if descriptor.GetValue() != "emoji-smile" {
			t.Errorf("Expected value to be %q, got %v", "emoji-smile", descriptor.GetValue())
		}
	})

	t.Run("should create a UnicodeDescriptor with numeric value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor(128512)
		if descriptor.GetValue() != 128512 {
			t.Errorf("Expected value to be %d, got %v", 128512, descriptor.GetValue())
		}
	})

	t.Run("should create a UnicodeDescriptor with nil value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor(nil)
		if descriptor.GetValue() != nil {
			t.Errorf("Expected value to be nil, got %v", descriptor.GetValue())
		}
	})

	t.Run("should create a UnicodeDescriptor with empty string value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("")
		if descriptor.GetValue() != "" {
			t.Errorf("Expected value to be empty string, got %v", descriptor.GetValue())
		}
	})

	t.Run("should create a UnicodeDescriptor with object value", func(t *testing.T) {
		objValue := map[string]any{"unicode": "U+1F600", "name": "smile"}
		descriptor := NewUnicodeDescriptor(objValue)
		if fmt.Sprintf("%v", descriptor.GetValue()) != fmt.Sprintf("%v", objValue) {
			t.Errorf("Expected value to be %v, got %v", objValue, descriptor.GetValue())
		}
	})
}

func TestUnicodeDescriptorTypeProperty(t *testing.T) {
	t.Run("should have type property set to UnicodeDescriptor", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("test")
		if descriptor.Type() != "UnicodeDescriptor" {
			t.Errorf("Expected type to be %q, got %q", "UnicodeDescriptor", descriptor.Type())
		}
	})

	t.Run("should maintain type property after instantiation", func(t *testing.T) {
		descriptor1 := NewUnicodeDescriptor("value1")
		descriptor2 := NewUnicodeDescriptor("value2")
		if descriptor1.Type() != "UnicodeDescriptor" {
			t.Errorf("Expected descriptor1 type to be %q, got %q", "UnicodeDescriptor", descriptor1.Type())
		}
		if descriptor2.Type() != "UnicodeDescriptor" {
			t.Errorf("Expected descriptor2 type to be %q, got %q", "UnicodeDescriptor", descriptor2.Type())
		}
	})
}

func TestUnicodeDescriptorInheritanceFromNode(t *testing.T) {
	var descriptor *UnicodeDescriptor

	setUp := func() {
		descriptor = NewUnicodeDescriptor("test-value")
	}

	t.Run("should have Node properties initialized", func(t *testing.T) {
		setUp()
		if descriptor.Parent != nil {
			t.Errorf("Expected parent to be nil, got %v", descriptor.Parent)
		}
		if descriptor.VisibilityBlocks != nil {
			t.Errorf("Expected visibilityBlocks to be nil, got %v", descriptor.VisibilityBlocks)
		}
		if descriptor.NodeVisible != nil {
			t.Errorf("Expected nodeVisible to be nil, got %v", descriptor.NodeVisible)
		}
		if descriptor.RootNode != nil {
			t.Errorf("Expected rootNode to be nil, got %v", descriptor.RootNode)
		}
		if descriptor.Parsed != nil {
			t.Errorf("Expected parsed to be nil, got %v", descriptor.Parsed)
		}
	})

	t.Run("should have access to Node methods", func(t *testing.T) {
		setUp()
		// Test that methods exist and are callable
		descriptor.SetParent(descriptor, nil)
		index := descriptor.GetIndex()
		fileInfo := descriptor.FileInfo()
		css := descriptor.ToCSS(map[string]any{})
		
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {},
			IsEmpty: func() bool { return false },
		}
		descriptor.GenCSS(map[string]any{}, output)
		
		eval := descriptor.Eval()
		descriptor.Accept(nil)
		isRulesetLike := descriptor.IsRulesetLike()

		// Basic checks to ensure methods work
		if index < 0 {
			t.Errorf("GetIndex returned negative value: %d", index)
		}
		if fileInfo == nil {
			t.Errorf("FileInfo returned nil")
		}
		if css != "test-value" {
			t.Errorf("Expected CSS to be %q, got %q", "test-value", css)
		}
		if eval != descriptor {
			t.Errorf("Eval should return self")
		}
		if isRulesetLike != false {
			t.Errorf("IsRulesetLike should return false")
		}
	})

	t.Run("should inherit Node getter properties", func(t *testing.T) {
		setUp()
		index := descriptor.GetIndex()
		fileInfo := descriptor.FileInfo()
		
		if index != 0 {
			t.Errorf("Expected index to be 0, got %d", index)
		}
		if len(fileInfo) != 0 {
			t.Errorf("Expected fileInfo to be empty map, got %v", fileInfo)
		}
	})
}

func TestUnicodeDescriptorCSSGeneration(t *testing.T) {
	t.Run("should generate CSS using inherited toCSS method", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("U+1F600")
		css := descriptor.ToCSS(map[string]any{})
		if css != "U+1F600" {
			t.Errorf("Expected CSS to be %q, got %q", "U+1F600", css)
		}
	})

	t.Run("should generate CSS with string value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("unicode-descriptor")
		css := descriptor.ToCSS(map[string]any{})
		if css != "unicode-descriptor" {
			t.Errorf("Expected CSS to be %q, got %q", "unicode-descriptor", css)
		}
	})

	t.Run("should generate CSS with numeric value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor(12345)
		css := descriptor.ToCSS(map[string]any{})
		if css != "12345" {
			t.Errorf("Expected CSS to be %q, got %q", "12345", css)
		}
	})

	t.Run("should handle genCSS method correctly", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("test-unicode")
		var addedChunk any
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				addedChunk = chunk
			},
			IsEmpty: func() bool { return false },
		}
		descriptor.GenCSS(map[string]any{}, output)
		if addedChunk != "test-unicode" {
			t.Errorf("Expected added chunk to be %q, got %v", "test-unicode", addedChunk)
		}
	})

	t.Run("should handle empty genCSS output", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("")
		var addedChunk any
		output := &CSSOutput{
			Add: func(chunk any, fileInfo any, index any) {
				addedChunk = chunk
			},
			IsEmpty: func() bool { return true },
		}
		descriptor.GenCSS(map[string]any{}, output)
		if addedChunk != "" {
			t.Errorf("Expected added chunk to be empty string, got %v", addedChunk)
		}
	})
}

func TestUnicodeDescriptorEvaluation(t *testing.T) {
	t.Run("should return itself when evaluated", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("test")
		result := descriptor.Eval()
		if result != descriptor {
			t.Errorf("Expected eval to return self")
		}
	})

	t.Run("should return itself when evaluated with context", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("test")
		// Note: Go version doesn't take context parameter like JavaScript
		result := descriptor.Eval()
		if result != descriptor {
			t.Errorf("Expected eval to return self")
		}
	})
}

func TestUnicodeDescriptorVisitorPattern(t *testing.T) {
	t.Run("should accept visitor and update value", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("original")
		visitor := &testVisitor{
			visitFunc: func(val any) any {
				if str, ok := val.(string); ok {
					return str + "-visited"
				}
				return val
			},
		}
		descriptor.Accept(visitor)
		if descriptor.GetValue() != "original-visited" {
			t.Errorf("Expected value to be %q, got %v", "original-visited", descriptor.GetValue())
		}
	})

	t.Run("should handle visitor with complex transformation", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("U+1F600")
		visitor := &testVisitor{
			visitFunc: func(val any) any {
				if _, ok := val.(string); ok {
					return "\\1F600" // Replace U+ with \
				}
				return val
			},
		}
		descriptor.Accept(visitor)
		if descriptor.GetValue() != "\\1F600" {
			t.Errorf("Expected value to be %q, got %v", "\\1F600", descriptor.GetValue())
		}
	})

	t.Run("should handle visitor that returns different type", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("123")
		visitor := &testVisitor{
			visitFunc: func(val any) any {
				if str, ok := val.(string); ok {
					if str == "123" {
						return 123
					}
				}
				return val
			},
		}
		descriptor.Accept(visitor)
		if descriptor.GetValue() != 123 {
			t.Errorf("Expected value to be %d, got %v", 123, descriptor.GetValue())
		}
	})
}

func TestUnicodeDescriptorParentChildRelationships(t *testing.T) {
	t.Run("should set parent using inherited setParent method", func(t *testing.T) {
		parent := NewUnicodeDescriptor("parent")
		child := NewUnicodeDescriptor("child")
		child.SetParent(child.Node, parent.Node)
		if child.Parent != parent.Node {
			t.Errorf("Expected parent to be set correctly")
		}
	})

	t.Run("should handle array of UnicodeDescriptors in setParent", func(t *testing.T) {
		parent := NewUnicodeDescriptor("parent")
		children := []*Node{
			NewUnicodeDescriptor("child1").Node,
			NewUnicodeDescriptor("child2").Node,
		}
		children[0].SetParent(children, parent.Node)
		for i, child := range children {
			if child.Parent != parent.Node {
				t.Errorf("Expected child %d parent to be set correctly", i)
			}
		}
	})
}

func TestUnicodeDescriptorIndexAndFileInfo(t *testing.T) {
	t.Run("should return correct index from parent", func(t *testing.T) {
		parent := NewUnicodeDescriptor("parent")
		child := NewUnicodeDescriptor("child")
		parent.Index = 5
		child.Parent = parent.Node
		index := child.GetIndex()
		if index != 5 {
			t.Errorf("Expected index to be 5, got %d", index)
		}
	})

	t.Run("should return fileInfo from parent", func(t *testing.T) {
		parent := NewUnicodeDescriptor("parent")
		child := NewUnicodeDescriptor("child")
		fileInfo := map[string]any{"filename": "test.less", "line": 10}
		parent.SetFileInfo(fileInfo)
		child.Parent = parent.Node
		childFileInfo := child.FileInfo()
		if fmt.Sprintf("%v", childFileInfo) != fmt.Sprintf("%v", fileInfo) {
			t.Errorf("Expected fileInfo to be %v, got %v", fileInfo, childFileInfo)
		}
	})

	t.Run("should return default values when no parent", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor("test")
		index := descriptor.GetIndex()
		fileInfo := descriptor.FileInfo()
		if index != 0 {
			t.Errorf("Expected index to be 0, got %d", index)
		}
		if len(fileInfo) != 0 {
			t.Errorf("Expected fileInfo to be empty, got %v", fileInfo)
		}
	})
}

func TestUnicodeDescriptorVisibilityManagement(t *testing.T) {
	var descriptor *UnicodeDescriptor

	setUp := func() {
		descriptor = NewUnicodeDescriptor("test")
	}

	t.Run("should handle visibility blocks correctly", func(t *testing.T) {
		setUp()
		if descriptor.BlocksVisibility() != false {
			t.Errorf("Expected BlocksVisibility to be false initially")
		}
		descriptor.AddVisibilityBlock()
		if descriptor.BlocksVisibility() != true {
			t.Errorf("Expected BlocksVisibility to be true after adding block")
		}
		descriptor.RemoveVisibilityBlock()
		if descriptor.BlocksVisibility() != false {
			t.Errorf("Expected BlocksVisibility to be false after removing block")
		}
	})

	t.Run("should handle visibility state correctly", func(t *testing.T) {
		setUp()
		descriptor.EnsureVisibility()
		visible := descriptor.IsVisible()
		if visible == nil || *visible != true {
			t.Errorf("Expected visibility to be true")
		}
		descriptor.EnsureInvisibility()
		visible = descriptor.IsVisible()
		if visible == nil || *visible != false {
			t.Errorf("Expected visibility to be false")
		}
	})

	t.Run("should copy visibility info from another descriptor", func(t *testing.T) {
		setUp()
		source := NewUnicodeDescriptor("source")
		source.AddVisibilityBlock()
		source.EnsureVisibility()

		descriptor.CopyVisibilityInfo(source.VisibilityInfo())
		if descriptor.VisibilityBlocks == nil || *descriptor.VisibilityBlocks != 1 {
			t.Errorf("Expected visibilityBlocks to be 1")
		}
		if descriptor.NodeVisible == nil || *descriptor.NodeVisible != true {
			t.Errorf("Expected nodeVisible to be true")
		}
	})
}

func TestUnicodeDescriptorArithmeticOperations(t *testing.T) {
	var descriptor *UnicodeDescriptor

	setUp := func() {
		descriptor = NewUnicodeDescriptor("test")
	}

	t.Run("should perform arithmetic operations using inherited _operate method", func(t *testing.T) {
		setUp()
		if descriptor.Operate(map[string]any{}, "+", 5, 3) != 8 {
			t.Errorf("Expected 5 + 3 = 8")
		}
		if descriptor.Operate(map[string]any{}, "-", 10, 4) != 6 {
			t.Errorf("Expected 10 - 4 = 6")
		}
		if descriptor.Operate(map[string]any{}, "*", 6, 7) != 42 {
			t.Errorf("Expected 6 * 7 = 42")
		}
		if descriptor.Operate(map[string]any{}, "/", 15, 3) != 5 {
			t.Errorf("Expected 15 / 3 = 5")
		}
	})

	t.Run("should handle floating point rounding", func(t *testing.T) {
		setUp()
		result := descriptor.Fround(map[string]any{"numPrecision": 2}, 3.14159)
		if result != 3.14 {
			t.Errorf("Expected 3.14, got %f", result)
		}
		result = descriptor.Fround(map[string]any{"numPrecision": 3}, 2.71828)
		if result != 2.718 {
			t.Errorf("Expected 2.718, got %f", result)
		}
		result = descriptor.Fround(nil, 1.23456)
		if result != 1.23456 {
			t.Errorf("Expected 1.23456, got %f", result)
		}
	})
}

func TestUnicodeDescriptorOtherInheritedMethods(t *testing.T) {
	var descriptor *UnicodeDescriptor

	setUp := func() {
		descriptor = NewUnicodeDescriptor("test")
	}

	t.Run("should return false for isRulesetLike", func(t *testing.T) {
		setUp()
		if descriptor.IsRulesetLike() != false {
			t.Errorf("Expected IsRulesetLike to return false")
		}
	})

	t.Run("should handle visibility info operations", func(t *testing.T) {
		setUp()
		descriptor.AddVisibilityBlock()
		descriptor.AddVisibilityBlock()
		descriptor.EnsureVisibility()

		info := descriptor.VisibilityInfo()
		if blocks, ok := info["visibilityBlocks"].(*int); ok {
			if *blocks != 2 {
				t.Errorf("Expected visibilityBlocks to be 2, got %d", *blocks)
			}
		} else {
			t.Errorf("Expected visibilityBlocks in info")
		}

		if visible, ok := info["nodeVisible"].(*bool); ok {
			if *visible != true {
				t.Errorf("Expected nodeVisible to be true")
			}
		} else {
			t.Errorf("Expected nodeVisible in info")
		}

		newDescriptor := NewUnicodeDescriptor("new")
		newDescriptor.CopyVisibilityInfo(info)
		if newDescriptor.VisibilityBlocks == nil || *newDescriptor.VisibilityBlocks != 2 {
			t.Errorf("Expected new descriptor visibilityBlocks to be 2")
		}
		if newDescriptor.NodeVisible == nil || *newDescriptor.NodeVisible != true {
			t.Errorf("Expected new descriptor nodeVisible to be true")
		}
	})
}

func TestUnicodeDescriptorEdgeCases(t *testing.T) {
	t.Run("should handle extremely long unicode values", func(t *testing.T) {
		longValue := "U+" + fmt.Sprintf("%01000d", 1)
		descriptor := NewUnicodeDescriptor(longValue)
		if descriptor.GetValue() != longValue {
			t.Errorf("Expected value to be preserved")
		}
		if descriptor.ToCSS(map[string]any{}) != longValue {
			t.Errorf("Expected CSS to match long value")
		}
	})

	t.Run("should handle special characters in unicode values", func(t *testing.T) {
		specialValue := "U+1F600;emoji:smile"
		descriptor := NewUnicodeDescriptor(specialValue)
		if descriptor.GetValue() != specialValue {
			t.Errorf("Expected value to be %q, got %v", specialValue, descriptor.GetValue())
		}
		if descriptor.ToCSS(map[string]any{}) != specialValue {
			t.Errorf("Expected CSS to be %q, got %q", specialValue, descriptor.ToCSS(map[string]any{}))
		}
	})

	t.Run("should handle array values", func(t *testing.T) {
		arrayValue := []string{"U+1F600", "U+1F601", "U+1F602"}
		descriptor := NewUnicodeDescriptor(arrayValue)
		if fmt.Sprintf("%v", descriptor.GetValue()) != fmt.Sprintf("%v", arrayValue) {
			t.Errorf("Expected array value to be preserved")
		}
	})

	t.Run("should handle boolean values", func(t *testing.T) {
		descriptor1 := NewUnicodeDescriptor(true)
		descriptor2 := NewUnicodeDescriptor(false)
		if descriptor1.GetValue() != true {
			t.Errorf("Expected value to be true, got %v", descriptor1.GetValue())
		}
		if descriptor2.GetValue() != false {
			t.Errorf("Expected value to be false, got %v", descriptor2.GetValue())
		}
	})

	t.Run("should handle function values", func(t *testing.T) {
		funcValue := func() string { return "U+1F600" }
		descriptor := NewUnicodeDescriptor(funcValue)
		// Can't directly compare functions, so just check it's not nil
		if descriptor.GetValue() == nil {
			t.Errorf("Expected function value to be preserved")
		}
	})
}

func TestUnicodeDescriptorStaticMethodsFromNode(t *testing.T) {
	t.Run("should use Node.Compare for comparing UnicodeDescriptors", func(t *testing.T) {
		descriptor1 := NewUnicodeDescriptor("test")
		descriptor2 := NewUnicodeDescriptor("test")
		descriptor3 := NewUnicodeDescriptor("different")

		if Compare(descriptor1.Node, descriptor2.Node) != 0 {
			t.Errorf("Expected equal descriptors to compare as 0")
		}
		// Note: Compare may return 0 for different types as per Node implementation
		Compare(descriptor1.Node, descriptor3.Node) // Just test it doesn't panic
	})

	t.Run("should use Node.NumericCompare for numeric comparisons", func(t *testing.T) {
		if NumericCompare(1, 2) != -1 {
			t.Errorf("Expected 1 < 2 to return -1")
		}
		if NumericCompare(2, 2) != 0 {
			t.Errorf("Expected 2 == 2 to return 0")
		}
		if NumericCompare(3, 2) != 1 {
			t.Errorf("Expected 3 > 2 to return 1")
		}
	})
}

func TestUnicodeDescriptorConstructorEdgeCases(t *testing.T) {
	t.Run("should handle no arguments", func(t *testing.T) {
		descriptor := NewUnicodeDescriptor(nil)
		if descriptor.GetValue() != nil {
			t.Errorf("Expected value to be nil when no arguments provided")
		}
	})
}

 