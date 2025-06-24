package visitors

// ImportItem represents an import item with its callback, arguments, and ready state
type ImportItem struct {
	callback func(...any)
	args     []any
	isReady  bool
}

// ImportSequencer manages sequential execution of imports and variable imports
type ImportSequencer struct {
	imports           []*ImportItem
	variableImports   []func()
	onSequencerEmpty  func()
	currentDepth      int
}

// NewImportSequencer creates a new ImportSequencer with an optional onSequencerEmpty callback
func NewImportSequencer(onSequencerEmpty func()) *ImportSequencer {
	return &ImportSequencer{
		imports:          make([]*ImportItem, 0),
		variableImports:  make([]func(), 0),
		onSequencerEmpty: onSequencerEmpty,
		currentDepth:     0,
	}
}

// AddImport adds an import callback and returns a trigger function
// The trigger function should be called with arguments when the import is ready
func (is *ImportSequencer) AddImport(callback func(...any)) func(...any) {
	importItem := &ImportItem{
		callback: callback,
		args:     nil,
		isReady:  false,
	}
	is.imports = append(is.imports, importItem)

	// Return trigger function that sets isReady and calls tryRun
	return func(args ...any) {
		importItem.args = args
		importItem.isReady = true
		is.TryRun()
	}
}

// AddVariableImport adds a variable import callback
func (is *ImportSequencer) AddVariableImport(callback func()) {
	is.variableImports = append(is.variableImports, callback)
}

// TryRun processes ready imports and variable imports sequentially
func (is *ImportSequencer) TryRun() {
	is.currentDepth++
	defer func() {
		is.currentDepth--
		if is.currentDepth == 0 && is.onSequencerEmpty != nil {
			is.onSequencerEmpty()
		}
	}()

	for {
		// Process all ready imports first
		for len(is.imports) > 0 {
			importItem := is.imports[0]
			if !importItem.isReady {
				return
			}
			// Remove the first item (FIFO)
			is.imports = is.imports[1:]
			// Call the callback with stored arguments
			importItem.callback(importItem.args...)
		}

		// If no variable imports, we're done
		if len(is.variableImports) == 0 {
			break
		}

		// Process one variable import (FIFO)
		variableImport := is.variableImports[0]
		is.variableImports = is.variableImports[1:]
		variableImport()
	}
}