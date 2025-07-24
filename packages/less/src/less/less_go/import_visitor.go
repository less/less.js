package less_go

import (
	"fmt"
)

// ImportVisitor processes import nodes in the AST
type ImportVisitor struct {
	visitor              *Visitor
	importer             any // Will be called with Push method
	finish               func(error)
	context              *Eval
	importCount          int
	onceFileDetectionMap map[string]bool
	recursionDetector    map[string]bool
	sequencer            *ImportSequencer
	isReplacing          bool
	isFinished           bool
	error                error
}

// NewImportVisitor creates a new ImportVisitor with the given importer and finish callback
func NewImportVisitor(importer any, finish func(error)) *ImportVisitor {
	iv := &ImportVisitor{
		importer:             importer,
		finish:               finish,
		context:              NewEval(nil, make([]any, 0)),
		importCount:          0,
		onceFileDetectionMap: make(map[string]bool),
		recursionDetector:    make(map[string]bool),
		isReplacing:          false,
		isFinished:           false,
	}

	iv.visitor = NewVisitor(iv)
	iv.sequencer = NewImportSequencer(iv.onSequencerEmpty)

	return iv
}

// Run processes the root node
func (iv *ImportVisitor) Run(root any) {
	defer func() {
		iv.isFinished = true
		iv.sequencer.TryRun()
	}()

	// Handle panics and convert them to errors
	defer func() {
		if r := recover(); r != nil {
			if err, ok := r.(error); ok {
				iv.error = err
			} else {
				// Convert panic to LessError
				iv.error = NewLessError(ErrorDetails{
					Message: fmt.Sprintf("%v", r),
					Index:   0,
				}, nil, "")
			}
		}
	}()

	iv.visitor.Visit(root)
}

// onSequencerEmpty is called when the sequencer has no more work
func (iv *ImportVisitor) onSequencerEmpty() {
	if !iv.isFinished {
		return
	}
	iv.finish(iv.error)
}

// VisitImport handles Import nodes - matches JavaScript visitImport
func (iv *ImportVisitor) VisitImport(importNode any, visitArgs *VisitArgs) {
	inlineCSS := false
	css := false

	// Get options and css property - direct access like JavaScript
	if node, ok := importNode.(map[string]any); ok {
		if options, hasOptions := node["options"].(map[string]any); hasOptions {
			if inline, hasInline := options["inline"].(bool); hasInline {
				inlineCSS = inline
			}
		}
		if cssValue, hasCss := node["css"].(bool); hasCss {
			css = cssValue
		}
	}

	if !css || inlineCSS {
		// Create context with copied frames - matches JavaScript
		frames := CopyArray(iv.context.Frames)
		context := NewEval(nil, frames)
		
		var importParent any
		if len(context.Frames) > 0 {
			importParent = context.Frames[0]
		}

		iv.importCount++

		if iv.isVariableImport(importNode) {
			iv.sequencer.AddVariableImport(func() {
				iv.processImportNode(importNode, context, importParent)
			})
		} else {
			iv.processImportNode(importNode, context, importParent)
		}
	}
	visitArgs.VisitDeeper = false
}

// processImportNode processes an individual import node - matches JavaScript
func (iv *ImportVisitor) processImportNode(importNode any, context *Eval, importParent any) {
	var evaldImportNode any
	inlineCSS := false

	// Get inline option
	if node, ok := importNode.(map[string]any); ok {
		if options, hasOptions := node["options"].(map[string]any); hasOptions {
			if inline, hasInline := options["inline"].(bool); hasInline {
				inlineCSS = inline
			}
		}
	}

	// Try to evaluate the import node - matches JavaScript try/catch
	func() {
		defer func() {
			if r := recover(); r != nil {
				var err error
				if e, ok := r.(error); ok {
					err = e
				} else {
					err = NewLessError(ErrorDetails{
						Message: fmt.Sprintf("%v", r),
						Index:   iv.getIndex(importNode),
					}, nil, iv.getFilename(importNode))
				}

				// Set error on import node and mark as CSS
				iv.setProperty(importNode, "css", true)
				iv.setProperty(importNode, "error", err)
			}
		}()

		evaldImportNode = iv.evalForImport(importNode, context)
	}()

	// Check if evaldImportNode is CSS
	evaldCSS := iv.getProperty(evaldImportNode, "css")
	isCSS := evaldCSS != nil && evaldCSS.(bool)

	if evaldImportNode != nil && (!isCSS || inlineCSS) {
		// Set context.importMultiple if multiple option is true
		if iv.getOptionBool(evaldImportNode, "multiple", false) {
			context.ImportMultiple = true
		}

		// Try appending less extension if CSS status is undefined
		tryAppendLessExtension := evaldCSS == nil

		// Replace import node in parent rules - matches JavaScript
		iv.replaceRuleInParent(importParent, importNode, evaldImportNode)

		onImported := func(args ...any) {
			iv.onImported(evaldImportNode, context, args...)
		}
		sequencedOnImported := iv.sequencer.AddImport(onImported)

		// Call importer.push - matches JavaScript
		iv.callImporterPush(
			evaldImportNode,
			tryAppendLessExtension,
			sequencedOnImported,
		)
	} else {
		iv.importCount--
		if iv.isFinished {
			iv.sequencer.TryRun()
		}
	}
}

// onImported handles the result of an import operation - matches JavaScript
func (iv *ImportVisitor) onImported(importNode any, context *Eval, args ...any) {
	// Parse callback arguments
	var e error
	var root any
	var importedAtRoot bool
	var fullPath string

	if len(args) >= 1 && args[0] != nil {
		if err, ok := args[0].(error); ok {
			e = err
		}
	}
	if len(args) >= 2 {
		root = args[1]
	}
	if len(args) >= 3 {
		if iar, ok := args[2].(bool); ok {
			importedAtRoot = iar
		}
	}
	if len(args) >= 4 {
		if fp, ok := args[3].(string); ok {
			fullPath = fp
		}
	}

	// Handle error - matches JavaScript
	if e != nil {
		if lessErr, ok := e.(*LessError); ok {
			if lessErr.Filename == "" {
				lessErr.Index = iv.getIndex(importNode)
				lessErr.Filename = iv.getFilename(importNode)
			}
		}
		iv.error = e
	}

	inlineCSS := iv.getOptionBool(importNode, "inline", false)
	isPlugin := iv.getOptionBool(importNode, "isPlugin", false)  
	isOptional := iv.getOptionBool(importNode, "optional", false)
	duplicateImport := importedAtRoot || iv.recursionDetector[fullPath]

	// Handle skip logic - matches JavaScript
	if !context.ImportMultiple {
		if duplicateImport {
			iv.setProperty(importNode, "skip", true)
		} else {
			// Set skip as function that checks onceFileDetectionMap
			iv.setProperty(importNode, "skip", func() bool {
				if iv.onceFileDetectionMap[fullPath] {
					return true
				}
				iv.onceFileDetectionMap[fullPath] = true
				return false
			})
		}
	}

	// Skip optional imports without fullPath
	if fullPath == "" && isOptional {
		iv.setProperty(importNode, "skip", true)
	}

	// Process root if provided - matches JavaScript
	if root != nil {
		iv.setProperty(importNode, "root", root)
		iv.setProperty(importNode, "importedFilename", fullPath)

		if !inlineCSS && !isPlugin && (context.ImportMultiple || !duplicateImport) {
			iv.recursionDetector[fullPath] = true

			// Save and restore context - matches JavaScript
			oldContext := iv.context
			iv.context = context
			
			defer func() {
				iv.context = oldContext
			}()

			defer func() {
				if r := recover(); r != nil {
					if err, ok := r.(error); ok {
						iv.error = err
					}
				}
			}()

			iv.visitor.Visit(root)
		}
	}

	iv.importCount--

	if iv.isFinished {
		iv.sequencer.TryRun()
	}
}

// Helper methods for property access - matches JavaScript direct property access

func (iv *ImportVisitor) getProperty(node any, prop string) any {
	if n, ok := node.(map[string]any); ok {
		return n[prop]
	} else if imp, ok := node.(*Import); ok {
		// Handle Import struct properties
		switch prop {
		case "root":
			return imp.root
		case "importedFilename":
			return imp.importedFilename
		case "skip":
			return imp.skip
		}
	}
	return nil
}

func (iv *ImportVisitor) setProperty(node any, prop string, value any) {
	if n, ok := node.(map[string]any); ok {
		n[prop] = value
	} else if imp, ok := node.(*Import); ok {
		// Handle Import struct properties
		switch prop {
		case "root":
			imp.root = value
		case "importedFilename":
			if filename, ok := value.(string); ok {
				imp.importedFilename = filename
			}
		case "skip":
			imp.skip = value
		}
	}
}

func (iv *ImportVisitor) getOptionBool(node any, option string, defaultValue bool) bool {
	if n, ok := node.(map[string]any); ok {
		if options, hasOptions := n["options"].(map[string]any); hasOptions {
			if val, hasVal := options[option].(bool); hasVal {
				return val
			}
		}
	} else if imp, ok := node.(*Import); ok {
		if imp.options != nil {
			if val, hasVal := imp.options[option].(bool); hasVal {
				return val
			}
		}
	}
	return defaultValue
}

func (iv *ImportVisitor) getIndex(node any) int {
	if n, ok := node.(map[string]any); ok {
		if idx, hasIdx := n["index"].(int); hasIdx {
			return idx
		}
	}
	return 0
}

func (iv *ImportVisitor) getFilename(node any) string {
	if n, ok := node.(map[string]any); ok {
		if fileInfo, hasFileInfo := n["fileInfo"].(map[string]any); hasFileInfo {
			if filename, hasFilename := fileInfo["filename"].(string); hasFilename {
				return filename
			}
		}
	}
	return ""
}

func (iv *ImportVisitor) isVariableImport(node any) bool {
	// Call isVariableImport method if it exists
	if n, ok := node.(map[string]any); ok {
		if method, hasMethod := n["isVariableImport"]; hasMethod {
			if fn, ok := method.(func() bool); ok {
				return fn()
			}
		}
	}
	return false
}

func (iv *ImportVisitor) evalForImport(node any, context *Eval) any {
	// Call evalForImport method if it exists
	if n, ok := node.(map[string]any); ok {
		if method, hasMethod := n["evalForImport"]; hasMethod {
			if fn, ok := method.(func(*Eval) any); ok {
				return fn(context)
			}
		}
	}
	return node
}

func (iv *ImportVisitor) replaceRuleInParent(parent any, oldRule any, newRule any) {
	if p, ok := parent.(map[string]any); ok {
		if rules, hasRules := p["rules"].([]any); hasRules {
			for i, rule := range rules {
				if rule == oldRule {
					rules[i] = newRule
					break
				}
			}
		}
	}
}

func (iv *ImportVisitor) callImporterPush(importNode any, tryAppendLessExtension bool, callback func(...any)) {
	// Handle ImportManager struct directly
	if importManager, ok := iv.importer.(*ImportManager); ok {
		path := iv.getPath(importNode)
		fileInfo := iv.getFileInfo(importNode)
		options := iv.getOptions(importNode)
		
		// Convert fileInfo map to FileInfo struct
		currentFileInfo := &FileInfo{}
		if fileInfo != nil {
			if cd, ok := fileInfo["currentDirectory"].(string); ok {
				currentFileInfo.CurrentDirectory = cd
			}
			if ep, ok := fileInfo["entryPath"].(string); ok {
				currentFileInfo.EntryPath = ep
			}
			if fn, ok := fileInfo["filename"].(string); ok {
				currentFileInfo.Filename = fn
			}
			if rp, ok := fileInfo["rootpath"].(string); ok {
				currentFileInfo.Rootpath = rp
			}
			if rfn, ok := fileInfo["rootFilename"].(string); ok {
				currentFileInfo.RootFilename = rfn
			}
			if ref, ok := fileInfo["reference"].(bool); ok {
				currentFileInfo.Reference = ref
			}
		}
		
		// Convert options map to ImportOptions struct
		importOptions := &ImportOptions{}
		if options != nil {
			if opt, ok := options["optional"].(bool); ok {
				importOptions.Optional = opt
			}
			if inline, ok := options["inline"].(bool); ok {
				importOptions.Inline = inline
			}
			if ref, ok := options["reference"].(bool); ok {
				importOptions.Reference = ref
			}
			if mult, ok := options["multiple"].(bool); ok {
				importOptions.Multiple = mult
			}
			if plugin, ok := options["isPlugin"].(bool); ok {
				importOptions.IsPlugin = plugin
			}
			if args, ok := options["pluginArgs"].(map[string]any); ok {
				importOptions.PluginArgs = args
			}
		}
		
		// Create a callback that matches the ImportManager.Push signature
		pushCallback := func(err error, root any, importedEqualsRoot bool, fullPath string) {
			if err != nil {
				callback(err, nil, false, "")
			} else {
				callback(nil, root, importedEqualsRoot, fullPath)
			}
		}
		
		importManager.Push(path, tryAppendLessExtension, currentFileInfo, importOptions, pushCallback)
		return
	}
	
	// Fallback: handle map-based importer (legacy)
	if imp, ok := iv.importer.(map[string]any); ok {
		if pushMethod, hasPush := imp["push"]; hasPush {
			if fn, ok := pushMethod.(func(string, bool, map[string]any, map[string]any, func(...any))); ok {
				path := iv.getPath(importNode)
				fileInfo := iv.getFileInfo(importNode)
				options := iv.getOptions(importNode)
				fn(path, tryAppendLessExtension, fileInfo, options, callback)
			}
		}
	}
}

func (iv *ImportVisitor) getPath(node any) string {
	// Handle Import struct directly
	if imp, ok := node.(*Import); ok {
		path := imp.GetPath()
		if pathStr, ok := path.(string); ok {
			return pathStr
		}
		// Handle Quoted path - use direct type assertion since we know it's *Quoted
		if quoted, ok := path.(*Quoted); ok {
			value := quoted.GetValue()
			return value
		}
		return ""
	}
	
	// Fallback: handle map-based node (legacy)
	if n, ok := node.(map[string]any); ok {
		if method, hasMethod := n["getPath"]; hasMethod {
			if fn, ok := method.(func() string); ok {
				return fn()
			}
		}
	}
	return ""
}

func (iv *ImportVisitor) getFileInfo(node any) map[string]any {
	// Handle Import struct directly
	if imp, ok := node.(*Import); ok {
		// Create fileInfo map from Import struct fields
		fileInfo := make(map[string]any)
		if imp._fileInfo != nil {
			// Copy from the _fileInfo field
			for k, v := range imp._fileInfo {
				fileInfo[k] = v
			}
		}
		// Add current directory if not present (GetFileInfo method doesn't exist, use _fileInfo)
		if _, hasCD := fileInfo["currentDirectory"]; !hasCD && imp._fileInfo != nil {
			if cd, ok := imp._fileInfo["currentDirectory"]; ok {
				fileInfo["currentDirectory"] = cd
			}
		}
		return fileInfo
	}
	
	// Fallback: handle map-based node (legacy)
	if n, ok := node.(map[string]any); ok {
		if method, hasMethod := n["fileInfo"]; hasMethod {
			if fn, ok := method.(func() map[string]any); ok {
				return fn()
			}
		}
	}
	return nil
}

func (iv *ImportVisitor) getOptions(node any) map[string]any {
	// Handle Import struct directly
	if imp, ok := node.(*Import); ok {
		return imp.options
	}
	
	// Fallback: handle map-based node (legacy)
	if n, ok := node.(map[string]any); ok {
		if options, hasOptions := n["options"].(map[string]any); hasOptions {
			return options
		}
	}
	return nil
}

// Frame management methods - matches JavaScript prototype methods

func (iv *ImportVisitor) VisitDeclaration(declNode any, visitArgs *VisitArgs) {
	if iv.isDetachedRuleset(declNode) {
		iv.context.Frames = append([]any{declNode}, iv.context.Frames...)
	} else {
		visitArgs.VisitDeeper = false
	}
}

func (iv *ImportVisitor) VisitDeclarationOut(declNode any) {
	if iv.isDetachedRuleset(declNode) {
		iv.context.Frames = iv.context.Frames[1:]
	}
}

func (iv *ImportVisitor) VisitAtRule(atRuleNode any, visitArgs *VisitArgs) {
	iv.context.Frames = append([]any{atRuleNode}, iv.context.Frames...)
}

func (iv *ImportVisitor) VisitAtRuleOut(atRuleNode any) {
	iv.context.Frames = iv.context.Frames[1:]
}

func (iv *ImportVisitor) VisitMixinDefinition(mixinDefinitionNode any, visitArgs *VisitArgs) {
	iv.context.Frames = append([]any{mixinDefinitionNode}, iv.context.Frames...)
}

func (iv *ImportVisitor) VisitMixinDefinitionOut(mixinDefinitionNode any) {
	iv.context.Frames = iv.context.Frames[1:]
}

func (iv *ImportVisitor) VisitRuleset(rulesetNode any, visitArgs *VisitArgs) {
	iv.context.Frames = append([]any{rulesetNode}, iv.context.Frames...)
}

func (iv *ImportVisitor) VisitRulesetOut(rulesetNode any) {
	iv.context.Frames = iv.context.Frames[1:]
}

func (iv *ImportVisitor) VisitMedia(mediaNode any, visitArgs *VisitArgs) {
	// Add mediaNode.rules[0] to frames - matches JavaScript behavior
	if n, ok := mediaNode.(map[string]any); ok {
		if rules, hasRules := n["rules"].([]any); hasRules && len(rules) > 0 {
			iv.context.Frames = append([]any{rules[0]}, iv.context.Frames...)
		}
	}
}

func (iv *ImportVisitor) VisitMediaOut(mediaNode any) {
	iv.context.Frames = iv.context.Frames[1:]
}

func (iv *ImportVisitor) isDetachedRuleset(node any) bool {
	if n, ok := node.(map[string]any); ok {
		if nodeType, hasType := n["type"].(string); hasType {
			return nodeType == "DetachedRuleset"
		}
	}
	return false
}