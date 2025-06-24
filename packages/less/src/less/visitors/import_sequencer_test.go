package visitors

import (
	"fmt"
	"testing"
)

func TestImportSequencer(t *testing.T) {
	t.Run("constructor", func(t *testing.T) {
		t.Run("initializes with empty imports and variableImports arrays", func(t *testing.T) {
			var onSequencerEmpty func()
			sequencer := NewImportSequencer(onSequencerEmpty)

			if len(sequencer.imports) != 0 {
				t.Errorf("Expected imports to be empty, got length %d", len(sequencer.imports))
			}
			if len(sequencer.variableImports) != 0 {
				t.Errorf("Expected variableImports to be empty, got length %d", len(sequencer.variableImports))
			}
		})

		t.Run("stores the onSequencerEmpty callback", func(t *testing.T) {
			called := false
			onSequencerEmpty := func() {
				called = true
			}
			sequencer := NewImportSequencer(onSequencerEmpty)

			if sequencer.onSequencerEmpty == nil {
				t.Error("Expected onSequencerEmpty to be stored")
			}
			// Test that the callback works
			sequencer.onSequencerEmpty()
			if !called {
				t.Error("Expected onSequencerEmpty callback to be called")
			}
		})

		t.Run("initializes currentDepth to 0", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			if sequencer.currentDepth != 0 {
				t.Errorf("Expected currentDepth to be 0, got %d", sequencer.currentDepth)
			}
		})

		t.Run("can be created without onSequencerEmpty callback", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			if sequencer.onSequencerEmpty != nil {
				t.Error("Expected onSequencerEmpty to be nil")
			}
		})
	})

	t.Run("addImport", func(t *testing.T) {
		t.Run("adds an import item to the imports array", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback := func(args ...any) {}

			sequencer.AddImport(callback)

			if len(sequencer.imports) != 1 {
				t.Errorf("Expected imports length to be 1, got %d", len(sequencer.imports))
			}

			importItem := sequencer.imports[0]
			if importItem.callback == nil {
				t.Error("Expected callback to be stored")
			}
			if importItem.args != nil {
				t.Error("Expected args to be nil initially")
			}
			if importItem.isReady {
				t.Error("Expected isReady to be false initially")
			}
		})

		t.Run("returns a trigger function", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback := func(args ...any) {}

			trigger := sequencer.AddImport(callback)

			if trigger == nil {
				t.Error("Expected trigger function to be returned")
			}
		})

		t.Run("trigger function sets isReady to true and stores arguments", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			argsReceived := []any{}
			callback := func(args ...any) {
				argsReceived = args
			}

			trigger := sequencer.AddImport(callback)
			trigger("arg1", "arg2", "arg3")

			if len(argsReceived) != 3 {
				t.Errorf("Expected 3 args, got %d", len(argsReceived))
			}
			if argsReceived[0] != "arg1" ||
				argsReceived[1] != "arg2" ||
				argsReceived[2] != "arg3" {
				t.Error("Expected args to be passed correctly")
			}
		})

		t.Run("trigger function calls TryRun", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback := func(args ...any) {}

			trigger := sequencer.AddImport(callback)
			trigger()

			// If TryRun was called, the import should be processed (removed from queue)
			if len(sequencer.imports) != 0 {
				t.Error("Expected TryRun to process the import")
			}
		})

		t.Run("trigger function works with no arguments", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			argsReceived := []any{}
			callback := func(args ...any) {
				argsReceived = args
			}

			trigger := sequencer.AddImport(callback)
			trigger()

			if len(argsReceived) != 0 {
				t.Errorf("Expected 0 args, got %d", len(argsReceived))
			}
		})

		t.Run("can add multiple imports", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback1 := func(args ...any) {}
			callback2 := func(args ...any) {}

			sequencer.AddImport(callback1)
			sequencer.AddImport(callback2)

			if len(sequencer.imports) != 2 {
				t.Errorf("Expected imports length to be 2, got %d", len(sequencer.imports))
			}
		})
	})

	t.Run("addVariableImport", func(t *testing.T) {
		t.Run("adds a callback to the variableImports array", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback := func() {}

			sequencer.AddVariableImport(callback)

			if len(sequencer.variableImports) != 1 {
				t.Errorf("Expected variableImports length to be 1, got %d", len(sequencer.variableImports))
			}
		})

		t.Run("can add multiple variable imports", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callback1 := func() {}
			callback2 := func() {}

			sequencer.AddVariableImport(callback1)
			sequencer.AddVariableImport(callback2)

			if len(sequencer.variableImports) != 2 {
				t.Errorf("Expected variableImports length to be 2, got %d", len(sequencer.variableImports))
			}
		})
	})

	t.Run("tryRun", func(t *testing.T) {
		t.Run("does not run callback if import is not ready", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			called := false
			callback := func(args ...any) {
				called = true
			}

			sequencer.AddImport(callback)
			sequencer.TryRun()

			if called {
				t.Error("Expected callback not to be called")
			}
			if len(sequencer.imports) != 1 {
				t.Errorf("Expected imports length to be 1, got %d", len(sequencer.imports))
			}
		})

		t.Run("runs callback when import is ready", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			called := false
			var receivedArgs []any
			callback := func(args ...any) {
				called = true
				receivedArgs = args
			}

			trigger := sequencer.AddImport(callback)
			trigger("arg1", "arg2")

			if !called {
				t.Error("Expected callback to be called")
			}
			if len(receivedArgs) != 2 || receivedArgs[0] != "arg1" || receivedArgs[1] != "arg2" {
				t.Error("Expected callback to receive correct arguments")
			}
			if len(sequencer.imports) != 0 {
				t.Errorf("Expected imports to be empty after processing, got length %d", len(sequencer.imports))
			}
		})

		t.Run("processes imports in FIFO order", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}

			callback1 := func(args ...any) {
				callOrder = append(callOrder, "callback1")
			}
			callback2 := func(args ...any) {
				callOrder = append(callOrder, "callback2")
			}
			callback3 := func(args ...any) {
				callOrder = append(callOrder, "callback3")
			}

			trigger1 := sequencer.AddImport(callback1)
			trigger2 := sequencer.AddImport(callback2)
			trigger3 := sequencer.AddImport(callback3)

			// Trigger in reverse order to test FIFO
			trigger3("arg3")
			trigger1("arg1")
			trigger2("arg2")

			expectedOrder := []string{"callback1", "callback2", "callback3"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
		})

		t.Run("processes all ready imports before variable imports", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}

			importCallback := func(args ...any) {
				callOrder = append(callOrder, "import")
			}
			variableCallback := func() {
				callOrder = append(callOrder, "variable")
			}

			sequencer.AddVariableImport(variableCallback)
			trigger := sequencer.AddImport(importCallback)
			trigger()

			expectedOrder := []string{"import", "variable"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
		})

		t.Run("processes variable imports in FIFO order", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}

			callback1 := func() {
				callOrder = append(callOrder, "variable1")
			}
			callback2 := func() {
				callOrder = append(callOrder, "variable2")
			}

			sequencer.AddVariableImport(callback1)
			sequencer.AddVariableImport(callback2)
			sequencer.TryRun()

			expectedOrder := []string{"variable1", "variable2"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
			if len(sequencer.variableImports) != 0 {
				t.Errorf("Expected variableImports to be empty, got length %d", len(sequencer.variableImports))
			}
		})

		t.Run("handles mixed imports and variable imports correctly", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}

			importCallback1 := func(args ...any) {
				callOrder = append(callOrder, "import1")
			}
			importCallback2 := func(args ...any) {
				callOrder = append(callOrder, "import2")
			}
			variableCallback1 := func() {
				callOrder = append(callOrder, "variable1")
			}
			variableCallback2 := func() {
				callOrder = append(callOrder, "variable2")
			}

			trigger1 := sequencer.AddImport(importCallback1)
			sequencer.AddVariableImport(variableCallback1)
			trigger2 := sequencer.AddImport(importCallback2)
			sequencer.AddVariableImport(variableCallback2)

			trigger1()
			trigger2()

			expectedOrder := []string{"import1", "import2", "variable1", "variable2"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
		})

		t.Run("stops processing imports when encountering a non-ready import", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			called1 := false
			called2 := false
			called3 := false

			callback1 := func(args ...any) {
				called1 = true
			}
			callback2 := func(args ...any) {
				called2 = true
			}
			callback3 := func(args ...any) {
				called3 = true
			}

			trigger1 := sequencer.AddImport(callback1)
			sequencer.AddImport(callback2) // This one won't be triggered
			trigger3 := sequencer.AddImport(callback3)

			trigger1()
			trigger3()
			sequencer.TryRun()

			if !called1 {
				t.Error("Expected callback1 to be called")
			}
			if called2 {
				t.Error("Expected callback2 not to be called")
			}
			if called3 {
				t.Error("Expected callback3 not to be called")
			}
			if len(sequencer.imports) != 2 {
				t.Errorf("Expected 2 imports to remain, got %d", len(sequencer.imports))
			}
		})

		t.Run("increments and decrements currentDepth", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)

			if sequencer.currentDepth != 0 {
				t.Errorf("Expected currentDepth to be 0 initially, got %d", sequencer.currentDepth)
			}

			sequencer.TryRun()

			if sequencer.currentDepth != 0 {
				t.Errorf("Expected currentDepth to be 0 after completion, got %d", sequencer.currentDepth)
			}
		})

		t.Run("tracks depth correctly during nested calls", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			depthDuringCallback := -1

			callback := func(args ...any) {
				depthDuringCallback = sequencer.currentDepth
				sequencer.TryRun() // Nested call
				// Depth should still be 1 after nested call returns
				if sequencer.currentDepth != 1 {
					t.Errorf("Expected currentDepth to be 1 after nested call, got %d", sequencer.currentDepth)
				}
			}

			trigger := sequencer.AddImport(callback)
			trigger()

			if depthDuringCallback != 1 {
				t.Errorf("Expected currentDepth to be 1 during callback, got %d", depthDuringCallback)
			}
			if sequencer.currentDepth != 0 {
				t.Errorf("Expected currentDepth to be 0 after all calls, got %d", sequencer.currentDepth)
			}
		})

		t.Run("calls onSequencerEmpty when depth reaches 0 and all imports are processed", func(t *testing.T) {
			called := false
			onSequencerEmpty := func() {
				called = true
			}
			sequencer := NewImportSequencer(onSequencerEmpty)

			callback := func(args ...any) {}
			trigger := sequencer.AddImport(callback)
			trigger()

			if !called {
				t.Error("Expected onSequencerEmpty to be called")
			}
		})

		t.Run("does not call onSequencerEmpty when depth is not 0", func(t *testing.T) {
			callCount := 0
			onSequencerEmpty := func() {
				callCount++
			}
			sequencer := NewImportSequencer(onSequencerEmpty)

			callback := func(args ...any) {
				sequencer.TryRun() // This creates a nested call
			}
			trigger := sequencer.AddImport(callback)
			trigger()

			// onSequencerEmpty should only be called once, after the outermost TryRun completes
			if callCount != 1 {
				t.Errorf("Expected onSequencerEmpty to be called once, got %d times", callCount)
			}
		})

		t.Run("does not call onSequencerEmpty when callback is not provided", func(t *testing.T) {
			sequencer := NewImportSequencer(nil) // No callback provided

			callback := func(args ...any) {}
			trigger := sequencer.AddImport(callback)

			// Should not panic
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("TryRun should not panic when onSequencerEmpty is nil: %v", r)
				}
			}()

			trigger()
		})

		t.Run("handles exceptions in import callbacks gracefully", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)

			errorCallback := func(args ...any) {
				panic("Test error")
			}
			normalCallback := func(args ...any) {}

			sequencer.AddImport(errorCallback)
			sequencer.AddImport(normalCallback)

			// Need to manually set ready state since we're testing exception handling
			sequencer.imports[0].isReady = true
			sequencer.imports[0].args = []any{}
			sequencer.imports[1].isReady = true
			sequencer.imports[1].args = []any{}

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected TryRun to panic with 'Test error'")
				}
				// currentDepth should be properly decremented even after exception
				if sequencer.currentDepth != 0 {
					t.Errorf("Expected currentDepth to be 0 after exception, got %d", sequencer.currentDepth)
				}
			}()

			sequencer.TryRun()
		})

		t.Run("handles exceptions in variable import callbacks gracefully", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)

			errorCallback := func() {
				panic("Variable import error")
			}

			sequencer.AddVariableImport(errorCallback)

			defer func() {
				if r := recover(); r == nil {
					t.Error("Expected TryRun to panic with 'Variable import error'")
				}
				if sequencer.currentDepth != 0 {
					t.Errorf("Expected currentDepth to be 0 after exception, got %d", sequencer.currentDepth)
				}
			}()

			sequencer.TryRun()
		})

		t.Run("processes imports that become ready during execution", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}
			var trigger2 func(...any)

			callback1 := func(args ...any) {
				callOrder = append(callOrder, "callback1")
				// Make the second import ready during execution of first
				trigger2("arg2")
			}

			callback2 := func(args ...any) {
				callOrder = append(callOrder, "callback2")
			}

			trigger1 := sequencer.AddImport(callback1)
			trigger2 = sequencer.AddImport(callback2)

			trigger1("arg1")

			expectedOrder := []string{"callback1", "callback2"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
		})

		t.Run("handles variable imports that add new imports", func(t *testing.T) {
			sequencer := NewImportSequencer(nil)
			callOrder := []string{}

			variableCallback := func() {
				callOrder = append(callOrder, "variable")
				newImportCallback := func(args ...any) {
					callOrder = append(callOrder, "newImport")
				}
				trigger := sequencer.AddImport(newImportCallback)
				trigger()
			}

			regularCallback := func(args ...any) {
				callOrder = append(callOrder, "regular")
			}

			sequencer.AddVariableImport(variableCallback)
			trigger := sequencer.AddImport(regularCallback)
			trigger()

			expectedOrder := []string{"regular", "variable", "newImport"}
			if len(callOrder) != len(expectedOrder) {
				t.Errorf("Expected %d callbacks, got %d", len(expectedOrder), len(callOrder))
			}
			for i, expected := range expectedOrder {
				if i >= len(callOrder) || callOrder[i] != expected {
					t.Errorf("Expected callback order %v, got %v", expectedOrder, callOrder)
					break
				}
			}
		})
	})

	t.Run("integration scenarios", func(t *testing.T) {
		t.Run("handles complex workflow with multiple import types", func(t *testing.T) {
			called := false
			onSequencerEmpty := func() {
				called = true
			}
			sequencer := NewImportSequencer(onSequencerEmpty)
			results := []string{}

			// Add some variable imports
			sequencer.AddVariableImport(func() { results = append(results, "var1") })
			sequencer.AddVariableImport(func() { results = append(results, "var2") })

			// Add regular imports
			trigger1 := sequencer.AddImport(func(args ...any) { results = append(results, "import1") })
			trigger2 := sequencer.AddImport(func(args ...any) { results = append(results, "import2") })

			// Add more variable imports
			sequencer.AddVariableImport(func() { results = append(results, "var3") })

			// Trigger imports
			trigger2()
			trigger1()

			expectedOrder := []string{"import1", "import2", "var1", "var2", "var3"}
			if len(results) != len(expectedOrder) {
				t.Errorf("Expected %d results, got %d", len(expectedOrder), len(results))
			}
			for i, expected := range expectedOrder {
				if i >= len(results) || results[i] != expected {
					t.Errorf("Expected results %v, got %v", expectedOrder, results)
					break
				}
			}
			if !called {
				t.Error("Expected onSequencerEmpty to be called")
			}
		})

		t.Run("handles recursive import additions", func(t *testing.T) {
			called := false
			onSequencerEmpty := func() {
				called = true
			}
			sequencer := NewImportSequencer(onSequencerEmpty)
			results := []string{}
			recursionCount := 0

			var recursiveCallback func(args ...any)
			recursiveCallback = func(args ...any) {
				results = append(results, fmt.Sprintf("recursive%d", recursionCount))
				recursionCount++

				if recursionCount < 3 {
					trigger := sequencer.AddImport(recursiveCallback)
					trigger()
				}
			}

			trigger := sequencer.AddImport(recursiveCallback)
			trigger()

			expectedOrder := []string{"recursive0", "recursive1", "recursive2"}
			if len(results) != len(expectedOrder) {
				t.Errorf("Expected %d results, got %d", len(expectedOrder), len(results))
			}
			for i, expected := range expectedOrder {
				if i >= len(results) || results[i] != expected {
					t.Errorf("Expected results %v, got %v", expectedOrder, results)
					break
				}
			}
			if !called {
				t.Error("Expected onSequencerEmpty to be called")
			}
		})

		t.Run("maintains correct state when no imports are added", func(t *testing.T) {
			called := false
			onSequencerEmpty := func() {
				called = true
			}
			sequencer := NewImportSequencer(onSequencerEmpty)

			sequencer.TryRun()

			if len(sequencer.imports) != 0 {
				t.Errorf("Expected imports to be empty, got length %d", len(sequencer.imports))
			}
			if len(sequencer.variableImports) != 0 {
				t.Errorf("Expected variableImports to be empty, got length %d", len(sequencer.variableImports))
			}
			if sequencer.currentDepth != 0 {
				t.Errorf("Expected currentDepth to be 0, got %d", sequencer.currentDepth)
			}
			if !called {
				t.Error("Expected onSequencerEmpty to be called")
			}
		})
	})
}