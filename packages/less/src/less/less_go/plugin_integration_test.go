package less_go

import (
	"testing"
)

func TestPluginIntegration(t *testing.T) {
	t.Run("should register and use Go plugin functions", func(t *testing.T) {
		// Create plugin manager
		pm := NewPluginManager(nil)
		
		// Create and register example plugin
		plugin := NewExamplePlugin()
		
		// Install plugin functions
		functionsMap := make(map[string]any)
		plugin.Install(functionsMap, nil)
		
		pm.AddPlugin(plugin, "example-plugin", nil)
		
		// Get installed functions from the plugin directly
		functions := plugin.functions
		
		// Test add-prefix function
		if fn, ok := functions["add-prefix"]; ok {
			result := fn("Hello, ", "World!")
			if anon, ok := result.(*Anonymous); ok {
				if anon.Value != "Hello, World!" {
					t.Errorf("Expected 'Hello, World!', got '%s'", anon.Value)
				}
			} else {
				t.Errorf("Expected Anonymous node, got %T", result)
			}
		} else {
			t.Error("add-prefix function not found")
		}
		
		// Test reverse-string function
		if fn, ok := functions["reverse-string"]; ok {
			result := fn("Hello")
			if anon, ok := result.(*Anonymous); ok {
				if anon.Value != "olleH" {
					t.Errorf("Expected 'olleH', got '%s'", anon.Value)
				}
			} else {
				t.Errorf("Expected Anonymous node, got %T", result)
			}
		} else {
			t.Error("reverse-string function not found")
		}
	})
	
	t.Run("should register pre and post processors", func(t *testing.T) {
		pm := NewPluginManager(nil)
		
		// Add pre-processor
		preProcessor := &ExamplePreProcessor{}
		pm.AddPreProcessor(preProcessor, 1000)
		
		// Add post-processor
		postProcessor := &ExamplePostProcessor{}
		pm.AddPostProcessor(postProcessor, 1000)
		
		// Verify processors were added
		preProcessors := pm.GetPreProcessors()
		if len(preProcessors) != 1 {
			t.Errorf("Expected 1 pre-processor, got %d", len(preProcessors))
		}
		
		postProcessors := pm.GetPostProcessors()
		if len(postProcessors) != 1 {
			t.Errorf("Expected 1 post-processor, got %d", len(postProcessors))
		}
	})
	
	t.Run("should integrate plugin functions with parser context", func(t *testing.T) {
		// Create a function registry and add plugin functions
		registry := DefaultRegistry.Inherit()
		plugin := NewExamplePlugin()
		
		// Install plugin functions into a map
		functions := make(map[string]any)
		err := plugin.Install(functions, nil)
		if err != nil {
			t.Fatalf("Failed to install plugin: %v", err)
		}
		
		// Add functions to registry
		for name, fn := range functions {
			registry.Add(name, fn)
		}
		
		// Create parser context with plugin manager and function registry
		pm := NewPluginManager(nil)
		pm.AddPlugin(plugin, "example-plugin", registry)
		
		context := map[string]any{
			"pluginManager":    pm,
			"functionRegistry": registry,
		}
		
		// Test parsing with plugin function (function calls will be evaluated during eval phase)
		lessCode := `.test { content: "test-value"; }`
		
		lessErr, root := parseLess(lessCode, context, nil)
		if lessErr != nil {
			t.Fatalf("Parse error: %v", lessErr)
		}
		
		// The actual function evaluation would happen during the eval phase
		// For now, just verify the parse succeeded
		if root == nil {
			t.Error("Expected root node, got nil")
		}
	})
}

func TestPluginWithFunctionRegistry(t *testing.T) {
	t.Run("should make plugin functions available through registry", func(t *testing.T) {
		// Create registry
		registry := DefaultRegistry.Inherit()
		
		// Create plugin and install functions
		plugin := NewExamplePlugin()
		functions := make(map[string]any)
		plugin.Install(functions, nil)
		
		// Add to registry
		registry.AddMultiple(functions)
		
		// Verify functions are accessible
		if fn := registry.Get("add-prefix"); fn == nil {
			t.Error("add-prefix function not found in registry")
		}
		
		if fn := registry.Get("reverse-string"); fn == nil {
			t.Error("reverse-string function not found in registry")
		}
		
		if fn := registry.Get("go-version"); fn == nil {
			t.Error("go-version function not found in registry")
		}
		
		// Test function execution through registry
		if fn := registry.Get("add-prefix"); fn != nil {
			if callable, ok := fn.(func(...any) any); ok {
				result := callable("Test: ", "Success")
				if anon, ok := result.(*Anonymous); ok {
					if anon.Value != "Test: Success" {
						t.Errorf("Expected 'Test: Success', got '%s'", anon.Value)
					}
				}
			}
		}
	})
}