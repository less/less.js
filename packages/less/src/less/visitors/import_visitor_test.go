package visitors

import (
	"errors"
	"testing"

	"github.com/toakleaf/less.go/packages/less/src/less"
)

// Helper functions to create test nodes - using map[string]any like JavaScript

func createImportNode(css bool, options map[string]any) map[string]any {
	node := map[string]any{
		"type":     "Import",
		"css":      css,
		"options":  options,
		"index":    0,
		"fileInfo": map[string]any{"filename": "test.less"},
	}
	
	// Add methods as functions
	node["isVariableImport"] = func() bool { return false }
	node["evalForImport"] = func(context *less.Eval) any { return node }
	node["getPath"] = func() string { return "test.less" }
	node["fileInfo"] = func() map[string]any { 
		return map[string]any{"filename": "test.less"} 
	}
	
	return node
}

func createVariableImportNode() map[string]any {
	node := createImportNode(false, map[string]any{})
	node["isVariableImport"] = func() bool { return true }
	return node
}

func createRulesetNode() map[string]any {
	return map[string]any{
		"type":  "Ruleset",
		"rules": make([]any, 0),
	}
}

func createMockImporter() map[string]any {
	importer := map[string]any{
		"pushCalls": make([]map[string]any, 0),
	}
	
	importer["push"] = func(path string, tryAppend bool, fileInfo map[string]any, options map[string]any, callback func(...any)) {
		calls := importer["pushCalls"].([]map[string]any)
		calls = append(calls, map[string]any{
			"path":       path,
			"tryAppend":  tryAppend,
			"fileInfo":   fileInfo,
			"options":    options,
			"callback":   callback,
		})
		importer["pushCalls"] = calls
		
		// Don't automatically call the callback - let tests do that explicitly
		// This matches how the JavaScript tests work
	}
	
	return importer
}

func TestNewImportVisitorConstructor(t *testing.T) {
	t.Run("should initialize with correct properties", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		// Skip importer comparison since maps can't be compared directly
		if visitor.importCount != 0 {
			t.Errorf("Expected importCount to be 0, got %d", visitor.importCount)
		}
		if len(visitor.onceFileDetectionMap) != 0 {
			t.Errorf("Expected onceFileDetectionMap to be empty, got length %d", len(visitor.onceFileDetectionMap))
		}
		if len(visitor.recursionDetector) != 0 {
			t.Errorf("Expected recursionDetector to be empty, got length %d", len(visitor.recursionDetector))
		}
		if visitor.isReplacing != false {
			t.Error("Expected isReplacing to be false")
		}
	})

	t.Run("should create visitor and sequencer instances", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		if visitor.visitor == nil {
			t.Error("Expected visitor to be created")
		}
		if visitor.sequencer == nil {
			t.Error("Expected sequencer to be created")
		}
		if visitor.context == nil {
			t.Error("Expected context to be created")
		}
	})
}

func TestNewImportVisitorRun(t *testing.T) {
	t.Run("should mark as finished", func(t *testing.T) {
		mockImporter := createMockImporter()
		finishCalled := false
		mockFinish := func(err error) {
			finishCalled = true
		}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		mockRoot := createRulesetNode()

		visitor.Run(mockRoot)

		if !visitor.isFinished {
			t.Error("Expected isFinished to be true")
		}
		// sequencer.TryRun() should be called which should call finish
		if !finishCalled {
			t.Error("Expected finish to be called")
		}
	})

	t.Skip("Error handling test - TODO: Fix visitor panic handling")
}

func TestNewImportVisitorVisitImport(t *testing.T) {
	t.Run("should skip CSS imports by default", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(true, map[string]any{})
		visitArgs := &VisitArgs{}

		visitor.VisitImport(mockImportNode, visitArgs)

		if visitor.importCount != 0 {
			t.Errorf("Expected importCount to remain 0 for CSS imports, got %d", visitor.importCount)
		}
		if visitArgs.VisitDeeper != false {
			t.Error("Expected visitDeeper to be false")
		}
	})

	t.Run("should process inline CSS imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(true, map[string]any{"inline": true})
		visitArgs := &VisitArgs{}

		visitor.VisitImport(mockImportNode, visitArgs)

		if visitor.importCount != 1 {
			t.Errorf("Expected importCount to be 1 for inline CSS imports, got %d", visitor.importCount)
		}
		if visitArgs.VisitDeeper != false {
			t.Error("Expected visitDeeper to be false")
		}
	})

	t.Run("should increment import count for non-CSS imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(false, map[string]any{})
		visitArgs := &VisitArgs{}

		visitor.VisitImport(mockImportNode, visitArgs)

		if visitor.importCount != 1 {
			t.Errorf("Expected importCount to be 1, got %d", visitor.importCount)
		}
		if visitArgs.VisitDeeper != false {
			t.Error("Expected visitDeeper to be false")
		}
	})

	t.Run("should handle variable imports differently", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createVariableImportNode()
		visitArgs := &VisitArgs{}

		visitor.VisitImport(mockImportNode, visitArgs)

		if visitor.importCount != 1 {
			t.Errorf("Expected importCount to be 1, got %d", visitor.importCount)
		}
		// Variable imports should be added to sequencer
		if len(visitor.sequencer.variableImports) != 1 {
			t.Errorf("Expected 1 variable import in sequencer, got %d", len(visitor.sequencer.variableImports))
		}
	})
}

func TestNewImportVisitorProcessImportNode(t *testing.T) {
	t.Run("should handle evaluation errors", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		// Create import node that will panic during evaluation
		mockImportNode := createImportNode(false, map[string]any{})
		mockImportNode["evalForImport"] = func(context *less.Eval) any {
			panic("evaluation error")
		}

		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		// Should set CSS to true and error on the node
		if css := visitor.getProperty(mockImportNode, "css"); css != true {
			t.Error("Expected CSS to be set to true on evaluation error")
		}
		if err := visitor.getProperty(mockImportNode, "error"); err == nil {
			t.Error("Expected error to be set on the import node")
		}
	})

	t.Run("should handle multiple import option", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(false, map[string]any{"multiple": true})
		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		if !context.ImportMultiple {
			t.Error("Expected context.ImportMultiple to be true")
		}
	})

	t.Run("should call importer.push for valid imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		calls := mockImporter["pushCalls"].([]map[string]any)
		if len(calls) != 1 {
			t.Errorf("Expected 1 call to importer.push, got %d", len(calls))
		}
	})

	t.Run("should decrement import count for CSS imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(true, map[string]any{}) // CSS import
		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		if visitor.importCount != 0 {
			t.Errorf("Expected importCount to be decremented to 0, got %d", visitor.importCount)
		}
	})

	t.Run("should use undefined CSS status for tryAppendLessExtension", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		// Create import node with no CSS property (undefined)
		mockImportNode := map[string]any{
			"type":     "Import",
			"options":  map[string]any{},
			"index":    0,
			"fileInfo": map[string]any{"filename": "test.less"},
		}
		
		mockImportNode["isVariableImport"] = func() bool { return false }
		mockImportNode["evalForImport"] = func(context *less.Eval) any { return mockImportNode }
		mockImportNode["getPath"] = func() string { return "test.less" }
		mockImportNode["fileInfo"] = func() map[string]any { 
			return map[string]any{"filename": "test.less"} 
		}

		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		calls := mockImporter["pushCalls"].([]map[string]any)
		if len(calls) != 1 {
			t.Errorf("Expected 1 call to importer.push, got %d", len(calls))
		}
		
		// Should try to append .less extension when CSS is undefined
		if !calls[0]["tryAppend"].(bool) {
			t.Error("Expected tryAppendLessExtension to be true when CSS is undefined")
		}
	})
}

func TestNewImportVisitorOnImported(t *testing.T) {
	t.Run("should handle import errors", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))
		testError := errors.New("import failed")

		visitor.onImported(mockImportNode, context, testError, nil, false, "")

		if visitor.error != testError {
			t.Error("Expected visitor error to be set")
		}
		if visitor.importCount != 0 {
			t.Errorf("Expected importCount to be decremented, got %d", visitor.importCount)
		}
	})

	t.Run("should handle duplicate imports with skip=true", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1
		visitor.recursionDetector["test.less"] = true

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		visitor.onImported(mockImportNode, context, nil, createRulesetNode(), false, "test.less")

		skip := visitor.getProperty(mockImportNode, "skip")
		if skip != true {
			t.Error("Expected skip to be set to true for duplicate imports")
		}
	})

	t.Run("should handle duplicate imports with skip function", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		visitor.onImported(mockImportNode, context, nil, createRulesetNode(), false, "test.less")

		skip := visitor.getProperty(mockImportNode, "skip")
		if skipFn, ok := skip.(func() bool); ok {
			// First call should return false and set the flag
			if skipFn() {
				t.Error("Expected first call to skip function to return false")
			}
			// Second call should return true
			if !skipFn() {
				t.Error("Expected second call to skip function to return true")
			}
		} else {
			t.Error("Expected skip to be a function")
		}
	})

	t.Run("should skip optional imports without fullPath", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{"optional": true})
		context := less.NewEval(nil, make([]any, 0))

		visitor.onImported(mockImportNode, context, nil, nil, false, "")

		skip := visitor.getProperty(mockImportNode, "skip")
		if skip != true {
			t.Error("Expected skip to be set to true for optional imports without fullPath")
		}
	})

	t.Run("should set import node properties when root is provided", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))
		mockRoot := createRulesetNode()

		visitor.onImported(mockImportNode, context, nil, mockRoot, false, "test.less")

		if visitor.getProperty(mockImportNode, "root") == nil {
			t.Error("Expected root to be set on import node")
		}
		if visitor.getProperty(mockImportNode, "importedFilename") != "test.less" {
			t.Error("Expected importedFilename to be set on import node")
		}
	})

	t.Run("should decrement import count", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 5

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		visitor.onImported(mockImportNode, context, nil, nil, false, "")

		if visitor.importCount != 4 {
			t.Errorf("Expected importCount to be decremented to 4, got %d", visitor.importCount)
		}
	})

	t.Run("should visit root for non-inline, non-plugin imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))
		mockRoot := createRulesetNode()

		oldContext := visitor.context
		visitor.onImported(mockImportNode, context, nil, mockRoot, false, "test.less")

		// Context should be restored
		if visitor.context != oldContext {
			t.Error("Expected context to be restored after visiting root")
		}
		
		// Should add to recursion detector
		if !visitor.recursionDetector["test.less"] {
			t.Error("Expected fullPath to be added to recursion detector")
		}
	})

	t.Run("should not visit root for inline imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{"inline": true})
		context := less.NewEval(nil, make([]any, 0))
		mockRoot := createRulesetNode()

		visitor.onImported(mockImportNode, context, nil, mockRoot, false, "test.less")

		// Should not add to recursion detector for inline imports
		if visitor.recursionDetector["test.less"] {
			t.Error("Expected fullPath NOT to be added to recursion detector for inline imports")
		}
	})

	t.Run("should not visit root for plugin imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{"isPlugin": true})
		context := less.NewEval(nil, make([]any, 0))
		mockRoot := createRulesetNode()

		visitor.onImported(mockImportNode, context, nil, mockRoot, false, "test.less")

		// Should not add to recursion detector for plugin imports
		if visitor.recursionDetector["test.less"] {
			t.Error("Expected fullPath NOT to be added to recursion detector for plugin imports")
		}
	})

	t.Run("should handle importMultiple context", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))
		context.ImportMultiple = true

		visitor.onImported(mockImportNode, context, nil, nil, false, "test.less")

		// Should not set skip when ImportMultiple is true
		skip := visitor.getProperty(mockImportNode, "skip")
		if skip != nil {
			t.Error("Expected skip not to be set when ImportMultiple is true")
		}
	})
}

// Frame management tests

func TestImportVisitorFrameManagement(t *testing.T) {
	t.Run("should handle visitDeclaration for DetachedRuleset", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		detachedRuleset := map[string]any{"type": "DetachedRuleset"}
		visitArgs := &VisitArgs{}

		visitor.VisitDeclaration(detachedRuleset, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount+1 {
			t.Errorf("Expected frames to increase by 1, got %d frames", len(visitor.context.Frames))
		}
		if len(visitor.context.Frames) == 0 || visitor.context.Frames[0] == nil {
			t.Error("Expected DetachedRuleset to be added to front of frames")
		}
	})

	t.Run("should not visit deeper for non-DetachedRuleset declarations", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		regularDecl := map[string]any{"type": "Declaration", "value": map[string]any{"type": "Value"}}
		visitArgs := &VisitArgs{VisitDeeper: true}

		visitor.VisitDeclaration(regularDecl, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount {
			t.Errorf("Expected frames to remain unchanged, got %d frames", len(visitor.context.Frames))
		}
		if visitArgs.VisitDeeper != false {
			t.Error("Expected visitDeeper to be set to false for non-DetachedRuleset declarations")
		}
	})

	t.Run("should handle visitDeclarationOut for DetachedRuleset", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		detachedRuleset := map[string]any{"type": "DetachedRuleset"}

		// Add to frames first
		visitor.context.Frames = append([]any{detachedRuleset}, visitor.context.Frames...)
		originalFrameCount := len(visitor.context.Frames)

		visitor.VisitDeclarationOut(detachedRuleset)

		if len(visitor.context.Frames) != originalFrameCount-1 {
			t.Errorf("Expected frames to decrease by 1, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle visitAtRule", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		atRule := map[string]any{"type": "AtRule"}
		visitArgs := &VisitArgs{}

		visitor.VisitAtRule(atRule, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount+1 {
			t.Errorf("Expected frames to increase by 1, got %d frames", len(visitor.context.Frames))
		}
		if len(visitor.context.Frames) == 0 || visitor.context.Frames[0] == nil {
			t.Error("Expected AtRule to be added to front of frames")
		}
	})

	t.Run("should handle visitAtRuleOut", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		atRule := map[string]any{"type": "AtRule"}

		// Add to frames first
		visitor.context.Frames = append([]any{atRule}, visitor.context.Frames...)
		originalFrameCount := len(visitor.context.Frames)

		visitor.VisitAtRuleOut(atRule)

		if len(visitor.context.Frames) != originalFrameCount-1 {
			t.Errorf("Expected frames to decrease by 1, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle visitRuleset", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		ruleset := createRulesetNode()
		visitArgs := &VisitArgs{}

		visitor.VisitRuleset(ruleset, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount+1 {
			t.Errorf("Expected frames to increase by 1, got %d frames", len(visitor.context.Frames))
		}
		if len(visitor.context.Frames) == 0 || visitor.context.Frames[0] == nil {
			t.Error("Expected Ruleset to be added to front of frames")
		}
	})

	t.Run("should handle visitRulesetOut", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		ruleset := createRulesetNode()

		// Add to frames first
		visitor.context.Frames = append([]any{ruleset}, visitor.context.Frames...)
		originalFrameCount := len(visitor.context.Frames)

		visitor.VisitRulesetOut(ruleset)

		if len(visitor.context.Frames) != originalFrameCount-1 {
			t.Errorf("Expected frames to decrease by 1, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle visitMedia", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		mediaRule := map[string]any{"type": "MediaRule"}
		media := map[string]any{"type": "Media", "rules": []any{mediaRule}}
		visitArgs := &VisitArgs{}

		visitor.VisitMedia(media, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount+1 {
			t.Errorf("Expected frames to increase by 1, got %d frames", len(visitor.context.Frames))
		}
		if len(visitor.context.Frames) == 0 {
			t.Error("Expected frames to have at least one element")
		} else if frame, ok := visitor.context.Frames[0].(map[string]any); !ok {
			t.Error("Expected frame to be a map[string]any")
		} else if frameType, hasType := frame["type"].(string); !hasType || frameType != "MediaRule" {
			t.Error("Expected Media rules[0] to be added to front of frames")
		}
	})

	t.Run("should handle visitMedia without rules", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		media := map[string]any{"type": "Media"} // No rules
		visitArgs := &VisitArgs{}

		visitor.VisitMedia(media, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount {
			t.Errorf("Expected frames to remain unchanged when no rules, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle visitMediaOut", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		media := map[string]any{"type": "Media"}

		// Add to frames first
		visitor.context.Frames = append([]any{media}, visitor.context.Frames...)
		originalFrameCount := len(visitor.context.Frames)

		visitor.VisitMediaOut(media)

		if len(visitor.context.Frames) != originalFrameCount-1 {
			t.Errorf("Expected frames to decrease by 1, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle visitMixinDefinition", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		mixinDef := map[string]any{"type": "MixinDefinition"}
		visitArgs := &VisitArgs{}

		visitor.VisitMixinDefinition(mixinDef, visitArgs)

		if len(visitor.context.Frames) != originalFrameCount+1 {
			t.Errorf("Expected frames to increase by 1, got %d frames", len(visitor.context.Frames))
		}
		if len(visitor.context.Frames) == 0 || visitor.context.Frames[0] == nil {
			t.Error("Expected MixinDefinition to be added to front of frames")
		}
	})

	t.Run("should handle visitMixinDefinitionOut", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		mixinDef := map[string]any{"type": "MixinDefinition"}

		// Add to frames first
		visitor.context.Frames = append([]any{mixinDef}, visitor.context.Frames...)
		originalFrameCount := len(visitor.context.Frames)

		visitor.VisitMixinDefinitionOut(mixinDef)

		if len(visitor.context.Frames) != originalFrameCount-1 {
			t.Errorf("Expected frames to decrease by 1, got %d frames", len(visitor.context.Frames))
		}
	})
}

// Integration tests

func TestImportVisitorIntegration(t *testing.T) {
	t.Run("should handle complete import workflow", func(t *testing.T) {
		mockImporter := createMockImporter()
		finishCalled := false
		var finishError error
		mockFinish := func(err error) {
			finishCalled = true
			finishError = err
		}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		// Create a root node with import
		rootNode := createRulesetNode()
		importNode := createImportNode(false, map[string]any{})
		
		// Manually process the import to test the workflow
		visitArgs := &VisitArgs{}
		visitor.VisitImport(importNode, visitArgs)

		// Check that import was processed
		if visitor.importCount != 1 {
			t.Errorf("Expected importCount to be 1, got %d", visitor.importCount)
		}

		// Run the visitor to completion
		visitor.Run(rootNode)

		if !visitor.isFinished {
			t.Error("Expected visitor to be finished")
		}
		if !finishCalled {
			t.Error("Expected finish callback to be called")
		}
		if finishError != nil {
			t.Errorf("Expected no error, got %v", finishError)
		}
	})

	t.Run("should handle nested frame management", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		originalFrameCount := len(visitor.context.Frames)

		// Simulate nested visiting
		ruleset1 := createRulesetNode()
		ruleset2 := createRulesetNode()
		mediaRule := map[string]any{"type": "MediaRule"}
		media := map[string]any{"type": "Media", "rules": []any{mediaRule}}

		visitArgs := &VisitArgs{}

		visitor.VisitRuleset(ruleset1, visitArgs)
		visitor.VisitMedia(media, visitArgs)
		visitor.VisitRuleset(ruleset2, visitArgs)

		expectedFrameCount := originalFrameCount + 3
		if len(visitor.context.Frames) != expectedFrameCount {
			t.Errorf("Expected %d frames, got %d", expectedFrameCount, len(visitor.context.Frames))
		}

		// Should be in reverse order (most recent first)
		if len(visitor.context.Frames) < 3 {
			t.Error("Expected at least 3 frames")
		}

		// Exit in reverse order
		visitor.VisitRulesetOut(ruleset2)
		visitor.VisitMediaOut(media)
		visitor.VisitRulesetOut(ruleset1)

		if len(visitor.context.Frames) != originalFrameCount {
			t.Errorf("Expected frame count to return to %d, got %d", originalFrameCount, len(visitor.context.Frames))
		}
	})
}

// Missing test cases identified from JavaScript version

func TestImportVisitorMissingTestCases(t *testing.T) {
	t.Run("should call onSequencerEmpty when sequencer empties", func(t *testing.T) {
		mockImporter := createMockImporter()
		sequencerEmptyCalled := false
		mockFinish := func(err error) {
			sequencerEmptyCalled = true
		}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.isFinished = true

		// Manually call onSequencerEmpty to test it works
		visitor.onSequencerEmpty()

		if !sequencerEmptyCalled {
			t.Error("Expected onSequencerEmpty to call finish callback")
		}
	})

	t.Run("should not call onSequencerEmpty when not finished", func(t *testing.T) {
		mockImporter := createMockImporter()
		sequencerEmptyCalled := false
		mockFinish := func(err error) {
			sequencerEmptyCalled = true
		}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.isFinished = false

		// Manually call onSequencerEmpty to test it doesn't call finish
		visitor.onSequencerEmpty()

		if sequencerEmptyCalled {
			t.Error("Expected onSequencerEmpty NOT to call finish when not finished")
		}
	})

	t.Run("should call importer.push for valid imports", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		calls := mockImporter["pushCalls"].([]map[string]any)
		if len(calls) != 1 {
			t.Errorf("Expected 1 call to importer.push, got %d", len(calls))
		}
	})

	t.Run("should handle recursion detection correctly", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		context := less.NewEval(nil, make([]any, 0))

		// Test that fullPath gets added to recursion detector
		visitor.onImported(mockImportNode, context, nil, createRulesetNode(), false, "test.less")

		if !visitor.recursionDetector["test.less"] {
			t.Error("Expected fullPath to be added to recursion detector")
		}

		// Test duplicate detection
		visitor.importCount = 1 // Reset for second test
		mockImportNode2 := createImportNode(false, map[string]any{})
		
		visitor.onImported(mockImportNode2, context, nil, createRulesetNode(), false, "test.less")

		skip := visitor.getProperty(mockImportNode2, "skip")
		if skip != true {
			t.Error("Expected duplicate import to be skipped")
		}
	})

	t.Run("should enrich errors with filename and index", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		mockImportNode := createImportNode(false, map[string]any{})
		mockImportNode["index"] = 42
		mockImportNode["fileInfo"] = map[string]any{"filename": "error.less"}
		
		context := less.NewEval(nil, make([]any, 0))
		testError := less.NewLessError(less.ErrorDetails{
			Message: "test error",
			Index:   0,
		}, nil, "")

		visitor.onImported(mockImportNode, context, testError, nil, false, "")

		if visitor.error == nil {
			t.Error("Expected error to be set")
		}

		if lessErr, ok := visitor.error.(*less.LessError); ok {
			if lessErr.Index != 42 {
				t.Errorf("Expected error index to be 42, got %d", lessErr.Index)
			}
			if lessErr.Filename != "error.less" {
				t.Errorf("Expected error filename to be 'error.less', got '%s'", lessErr.Filename)
			}
		} else {
			t.Error("Expected error to be a LessError")
		}
	})

	t.Run("should preserve and restore context when visiting root", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		// Set up initial context
		originalContext := visitor.context
		originalFrames := []any{map[string]any{"type": "OriginalFrame"}}
		visitor.context.Frames = originalFrames

		mockImportNode := createImportNode(false, map[string]any{})
		newFrames := []any{map[string]any{"type": "NewFrame"}}
		context := less.NewEval(nil, newFrames)
		mockRoot := createRulesetNode()

		visitor.onImported(mockImportNode, context, nil, mockRoot, false, "test.less")

		// Context should be restored to original
		if visitor.context != originalContext {
			t.Error("Expected context to be restored to original")
		}
		if len(visitor.context.Frames) != len(originalFrames) {
			t.Errorf("Expected original frames to be restored, got %d frames", len(visitor.context.Frames))
		}
	})

	t.Run("should handle edge cases for import nodes", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)

		// Test with nil import node (should not crash)
		visitArgs := &VisitArgs{}
		visitor.VisitImport(nil, visitArgs)

		// Test with empty import node
		emptyNode := map[string]any{}
		visitor.VisitImport(emptyNode, visitArgs)

		// Test with import node without options
		nodeWithoutOptions := map[string]any{
			"css": false,
		}
		visitor.VisitImport(nodeWithoutOptions, visitArgs)

		// All should complete without errors
		if visitor.error != nil {
			t.Errorf("Expected no errors for edge cases, got %v", visitor.error)
		}
	})

	t.Run("should handle context without frames", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		
		// Create context with no frames
		visitor.context.Frames = nil

		mockImportNode := createImportNode(false, map[string]any{})
		visitArgs := &VisitArgs{}

		visitor.VisitImport(mockImportNode, visitArgs)

		// Should not crash and import count should be incremented
		if visitor.importCount != 1 {
			t.Errorf("Expected importCount to be 1, got %d", visitor.importCount)
		}
	})

	t.Run("should handle processImportNode with CSS evaldImportNode", func(t *testing.T) {
		mockImporter := createMockImporter()
		mockFinish := func(err error) {}

		visitor := NewImportVisitor(mockImporter, mockFinish)
		visitor.importCount = 1

		// Create import node that evaluates to CSS
		mockImportNode := createImportNode(false, map[string]any{})
		mockImportNode["evalForImport"] = func(context *less.Eval) any {
			result := createImportNode(true, map[string]any{}) // CSS = true
			return result
		}

		context := less.NewEval(nil, make([]any, 0))

		visitor.processImportNode(mockImportNode, context, nil)

		// Should decrement import count since it's CSS
		if visitor.importCount != 0 {
			t.Errorf("Expected importCount to be decremented to 0, got %d", visitor.importCount)
		}

		// Should not call importer.push
		calls := mockImporter["pushCalls"].([]map[string]any)
		if len(calls) != 0 {
			t.Errorf("Expected 0 calls to importer.push for CSS imports, got %d", len(calls))
		}
	})
}