package less_go

import (
	"reflect"
	"testing"
)

// Mock functions for testing
func mockFunction1() string { return "result1" }
func mockFunction2() string { return "result2" }
func mockFunction3() string { return "result3" }

func TestRegistryFactoryFunction(t *testing.T) {
	t.Run("should create a registry with nil base", func(t *testing.T) {
		reg := DefaultRegistry.Create(nil)
		if reg == nil {
			t.Fatal("Expected registry to be created")
		}
		if len(reg.data) != 0 {
			t.Errorf("Expected empty data map, got %v", reg.data)
		}
	})

	t.Run("should create a registry with specified base", func(t *testing.T) {
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("baseFunc", mockFunction1)

		reg := DefaultRegistry.Create(baseRegistry)
		if reg == nil {
			t.Fatal("Expected registry to be created")
		}
		if len(reg.data) != 0 {
			t.Errorf("Expected empty data map, got %v", reg.data)
		}
		if reg.Get("basefunc") == nil {
			t.Error("Expected to find baseFunc in base registry")
		}
		// Verify it's the correct function by calling it
		if fn, ok := reg.Get("basefunc").(func() string); ok {
			if fn() != "result1" {
				t.Error("Expected baseFunc to return 'result1'")
			}
		} else {
			t.Error("Expected baseFunc to be a function")
		}
	})

	t.Run("should have default registry with color functions", func(t *testing.T) {
		// DefaultRegistry should contain the built-in color functions
		expectedFunctions := []string{"rgb", "rgba", "hsl", "hsla"}
		for _, funcName := range expectedFunctions {
			if DefaultRegistry.Get(funcName) == nil {
				t.Errorf("Expected default registry to contain %s function", funcName)
			}
		}
		
		// Should also verify they implement FunctionDefinition interface
		if rgbFunc := DefaultRegistry.Get("rgb"); rgbFunc != nil {
			if _, ok := rgbFunc.(FunctionDefinition); !ok {
				t.Errorf("Expected rgb function to implement FunctionDefinition, got %T", rgbFunc)
			}
		}
	})
}

func TestAddMethod(t *testing.T) {
	registry := DefaultRegistry.Create(nil)

	t.Run("should add a function to the registry", func(t *testing.T) {
		registry.Add("testFunc", mockFunction1)
		if registry.data["testfunc"] == nil {
			t.Error("Expected function to be added to registry")
		}
		// Verify it's the correct function by calling it
		if fn, ok := registry.data["testfunc"].(func() string); ok {
			if fn() != "result1" {
				t.Error("Expected testFunc to return 'result1'")
			}
		}
	})

	t.Run("should convert function names to lowercase", func(t *testing.T) {
		reg := DefaultRegistry.Create(nil)
		reg.Add("TestFunc", mockFunction1)
		reg.Add("UPPERCASE", mockFunction2)
		reg.Add("MiXeDcAsE", mockFunction3)

		if reg.data["testfunc"] == nil {
			t.Error("Expected TestFunc to be stored as testfunc")
		}
		if reg.data["uppercase"] == nil {
			t.Error("Expected UPPERCASE to be stored as uppercase")
		}
		if reg.data["mixedcase"] == nil {
			t.Error("Expected MiXeDcAsE to be stored as mixedcase")
		}
		
		// Verify functions by calling them
		if fn, ok := reg.data["testfunc"].(func() string); ok && fn() != "result1" {
			t.Error("Expected testfunc to return 'result1'")
		}
		if fn, ok := reg.data["uppercase"].(func() string); ok && fn() != "result2" {
			t.Error("Expected uppercase to return 'result2'")
		}
		if fn, ok := reg.data["mixedcase"].(func() string); ok && fn() != "result3" {
			t.Error("Expected mixedcase to return 'result3'")
		}
	})

	t.Run("should handle duplicate function names", func(t *testing.T) {
		reg := DefaultRegistry.Create(nil)
		reg.Add("testFunc", mockFunction1)
		reg.Add("testFunc", mockFunction2)

		// Should overwrite the first function
		if reg.data["testfunc"] == nil {
			t.Error("Expected function to be stored")
		}
		// Verify it's the second function by calling it
		if fn, ok := reg.data["testfunc"].(func() string); ok {
			if fn() != "result2" {
				t.Error("Expected second function to overwrite the first")
			}
		}
	})

	t.Run("should handle empty string names", func(t *testing.T) {
		reg := DefaultRegistry.Create(nil)
		reg.Add("", mockFunction1)
		if reg.data[""] == nil {
			t.Error("Expected function to be stored with empty string key")
		}
		// Verify by calling
		if fn, ok := reg.data[""].(func() string); ok && fn() != "result1" {
			t.Error("Expected function to return 'result1'")
		}
	})

	t.Run("should handle special characters in names", func(t *testing.T) {
		reg := DefaultRegistry.Create(nil)
		reg.Add("test-func", mockFunction1)
		reg.Add("test_func", mockFunction2)
		reg.Add("test.func", mockFunction3)

		if reg.data["test-func"] == nil {
			t.Error("Expected test-func to be stored")
		}
		if reg.data["test_func"] == nil {
			t.Error("Expected test_func to be stored")
		}
		if reg.data["test.func"] == nil {
			t.Error("Expected test.func to be stored")
		}
	})
}

func TestAddMultipleMethod(t *testing.T) {
	t.Run("should add multiple functions at once", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		functions := map[string]any{
			"func1": mockFunction1,
			"func2": mockFunction2,
			"func3": mockFunction3,
		}

		registry.AddMultiple(functions)

		if registry.data["func1"] == nil {
			t.Error("Expected func1 to be added")
		}
		if registry.data["func2"] == nil {
			t.Error("Expected func2 to be added")
		}
		if registry.data["func3"] == nil {
			t.Error("Expected func3 to be added")
		}
		
		// Verify by calling functions
		if fn, ok := registry.data["func1"].(func() string); ok && fn() != "result1" {
			t.Error("Expected func1 to return 'result1'")
		}
		if fn, ok := registry.data["func2"].(func() string); ok && fn() != "result2" {
			t.Error("Expected func2 to return 'result2'")
		}
		if fn, ok := registry.data["func3"].(func() string); ok && fn() != "result3" {
			t.Error("Expected func3 to return 'result3'")
		}
	})

	t.Run("should handle empty map", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.AddMultiple(map[string]any{})
		if len(registry.data) != 0 {
			t.Error("Expected data to remain empty")
		}
	})

	t.Run("should convert all function names to lowercase", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		functions := map[string]any{
			"TestFunc":  mockFunction1,
			"UPPERCASE": mockFunction2,
			"MiXeDcAsE":  mockFunction3,
		}

		registry.AddMultiple(functions)

		if registry.data["testfunc"] == nil {
			t.Error("Expected TestFunc to be stored as testfunc")
		}
		if registry.data["uppercase"] == nil {
			t.Error("Expected UPPERCASE to be stored as uppercase")
		}
		if registry.data["mixedcase"] == nil {
			t.Error("Expected MiXeDcAsE to be stored as mixedcase")
		}
	})

	t.Run("should handle functions with special characters", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		functions := map[string]any{
			"test-func": mockFunction1,
			"test_func": mockFunction2,
			"test.func": mockFunction3,
		}

		registry.AddMultiple(functions)

		if registry.data["test-func"] == nil {
			t.Error("Expected test-func to be stored")
		}
		if registry.data["test_func"] == nil {
			t.Error("Expected test_func to be stored")
		}
		if registry.data["test.func"] == nil {
			t.Error("Expected test.func to be stored")
		}
	})
}

func TestGetMethod(t *testing.T) {
	registry := DefaultRegistry.Create(nil)
	registry.Add("localFunc", mockFunction1)

	t.Run("should retrieve a function by name using lowercase", func(t *testing.T) {
		result := registry.Get("localfunc") // Note: lowercase
		if result == nil {
			t.Error("Expected to retrieve the function")
		}
		// Verify by calling
		if fn, ok := result.(func() string); ok && fn() != "result1" {
			t.Error("Expected function to return 'result1'")
		}
	})

	t.Run("should return nil for non-existent functions when no base", func(t *testing.T) {
		result := registry.Get("nonexistent")
		if result != nil {
			t.Error("Expected nil for non-existent function")
		}
	})

	t.Run("should return nil when using wrong case for retrieval", func(t *testing.T) {
		result := registry.Get("localFunc") // Original case
		if result != nil {
			t.Error("Expected nil when using wrong case")
		}
	})

	t.Run("should fall back to base registry when function not found locally", func(t *testing.T) {
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("baseFunc", mockFunction2)

		derivedRegistry := DefaultRegistry.Create(baseRegistry)
		derivedRegistry.Add("localFunc", mockFunction1)

		localResult := derivedRegistry.Get("localfunc")
		if localResult == nil {
			t.Error("Expected to get local function")
		}
		if fn, ok := localResult.(func() string); ok && fn() != "result1" {
			t.Error("Expected local function to return 'result1'")
		}
		
		baseResult := derivedRegistry.Get("basefunc")
		if baseResult == nil {
			t.Error("Expected to get base function")
		}
		if fn, ok := baseResult.(func() string); ok && fn() != "result2" {
			t.Error("Expected base function to return 'result2'")
		}
	})

	t.Run("should return nil when function not found in base either", func(t *testing.T) {
		baseRegistry := DefaultRegistry.Create(nil)
		derivedRegistry := DefaultRegistry.Create(baseRegistry)

		result := derivedRegistry.Get("nonexistent")
		if result != nil {
			t.Error("Expected nil when function not found anywhere")
		}
	})

	t.Run("should prioritize local functions over base functions", func(t *testing.T) {
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("sameFunc", mockFunction2)

		derivedRegistry := DefaultRegistry.Create(baseRegistry)
		derivedRegistry.Add("sameFunc", mockFunction1)

		result := derivedRegistry.Get("samefunc")
		if result == nil {
			t.Error("Expected to get function")
		}
		// Should get the local function (mockFunction1)
		if fn, ok := result.(func() string); ok && fn() != "result1" {
			t.Error("Expected local function to override base function")
		}
	})

	t.Run("should handle nested inheritance", func(t *testing.T) {
		level1Registry := DefaultRegistry.Create(nil)
		level1Registry.Add("level1Func", mockFunction1)

		level2Registry := DefaultRegistry.Create(level1Registry)
		level2Registry.Add("level2Func", mockFunction2)

		level3Registry := DefaultRegistry.Create(level2Registry)
		level3Registry.Add("level3Func", mockFunction3)

		if level3Registry.Get("level3func") == nil {
			t.Error("Expected to get level3 function")
		}
		if level3Registry.Get("level2func") == nil {
			t.Error("Expected to get level2 function")
		}
		if level3Registry.Get("level1func") == nil {
			t.Error("Expected to get level1 function")
		}
	})
}

func TestGetLocalFunctionsMethod(t *testing.T) {
	t.Run("should return the local data object", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.Add("func1", mockFunction1)
		registry.Add("func2", mockFunction2)

		localFunctions := registry.GetLocalFunctions()

		// Verify the behavior - changes to returned map should reflect in registry
		localFunctions["testKey"] = "testValue"
		if registry.data["testKey"] != "testValue" {
			t.Error("Expected to return the same data object")
		}
		// Clean up
		delete(registry.data, "testKey")
		if localFunctions["func1"] == nil {
			t.Error("Expected func1 to be present")
		}
		if localFunctions["func2"] == nil {
			t.Error("Expected func2 to be present")
		}
	})

	t.Run("should return empty map for new registry", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		localFunctions := registry.GetLocalFunctions()
		if len(localFunctions) != 0 {
			t.Error("Expected empty map for new registry")
		}
	})

	t.Run("should not include base registry functions", func(t *testing.T) {
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("baseFunc", mockFunction1)

		derivedRegistry := DefaultRegistry.Create(baseRegistry)
		derivedRegistry.Add("localFunc", mockFunction2)

		localFunctions := derivedRegistry.GetLocalFunctions()

		if localFunctions["localfunc"] == nil {
			t.Error("Expected localfunc to be present")
		}
		if _, exists := localFunctions["basefunc"]; exists {
			t.Error("Expected basefunc to not be in local functions")
		}
	})
}

func TestInheritMethod(t *testing.T) {
	t.Run("should create a new registry with current registry as base", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.Add("parentFunc", mockFunction1)

		childRegistry := registry.Inherit()
		childRegistry.Add("childFunc", mockFunction2)

		if childRegistry.Get("childfunc") == nil {
			t.Error("Expected child function in child registry")
		}
		if childRegistry.Get("parentfunc") == nil {
			t.Error("Expected parent function in child registry")
		}
		if _, exists := childRegistry.GetLocalFunctions()["parentfunc"]; exists {
			t.Error("Expected parent function to not be in local functions")
		}
	})

	t.Run("should create independent registries", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		child1 := registry.Inherit()
		child2 := registry.Inherit()

		child1.Add("child1Func", mockFunction1)
		child2.Add("child2Func", mockFunction2)

		if child1.Get("child1func") == nil {
			t.Error("Expected child1func in child1")
		}
		if child1.Get("child2func") != nil {
			t.Error("Expected child2func to not be in child1")
		}
		if child2.Get("child2func") == nil {
			t.Error("Expected child2func in child2")
		}
		if child2.Get("child1func") != nil {
			t.Error("Expected child1func to not be in child2")
		}
	})

	t.Run("should maintain inheritance chain", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.Add("grandparentFunc", mockFunction1)

		parentRegistry := registry.Inherit()
		parentRegistry.Add("parentFunc", mockFunction2)

		childRegistry := parentRegistry.Inherit()
		childRegistry.Add("childFunc", mockFunction3)

		if childRegistry.Get("childfunc") == nil {
			t.Error("Expected child function")
		}
		if childRegistry.Get("parentfunc") == nil {
			t.Error("Expected parent function")
		}
		if childRegistry.Get("grandparentfunc") == nil {
			t.Error("Expected grandparent function")
		}
	})
}

func TestCreateMethod(t *testing.T) {
	t.Run("should create a new registry with specified base", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("baseFunc", mockFunction1)

		newRegistry := registry.Create(baseRegistry)
		newRegistry.Add("newFunc", mockFunction2)

		if newRegistry.Get("newfunc") == nil {
			t.Error("Expected new function")
		}
		if newRegistry.Get("basefunc") == nil {
			t.Error("Expected base function")
		}
	})

	t.Run("should create registry with nil base", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		newRegistry := registry.Create(nil)
		newRegistry.Add("newFunc", mockFunction1)

		if newRegistry.Get("newfunc") == nil {
			t.Error("Expected new function")
		}
		if newRegistry.Get("nonexistent") != nil {
			t.Error("Expected nil for non-existent function")
		}
	})

	t.Run("should be equivalent to DefaultRegistry.Create", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("baseFunc", mockFunction1)

		registry1 := registry.Create(baseRegistry)
		registry2 := DefaultRegistry.Create(baseRegistry)

		registry1.Add("testFunc", mockFunction2)
		registry2.Add("testFunc", mockFunction2)

		// Both should have the functions (can't compare directly)
		if registry1.Get("testfunc") == nil {
			t.Error("Expected testfunc in registry1")
		}
		if registry2.Get("testfunc") == nil {
			t.Error("Expected testfunc in registry2")
		}
		if registry1.Get("basefunc") == nil {
			t.Error("Expected basefunc in registry1")
		}
		if registry2.Get("basefunc") == nil {
			t.Error("Expected basefunc in registry2")
		}
	})
}

func TestEdgeCasesAndErrorConditions(t *testing.T) {
	t.Run("should handle nil function values", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.Add("nullFunc", nil)
		if registry.Get("nullfunc") != nil {
			t.Error("Expected nil for nil function")
		}
	})

	t.Run("should handle non-function values", func(t *testing.T) {
		registry := DefaultRegistry.Create(nil)
		registry.Add("stringValue", "not a function")
		registry.Add("numberValue", 42)
		registry.Add("objectValue", map[string]string{"key": "value"})

		if registry.Get("stringvalue") != "not a function" {
			t.Error("Expected string value")
		}
		if registry.Get("numbervalue") != 42 {
			t.Error("Expected number value")
		}
		expectedObj := map[string]string{"key": "value"}
		if !reflect.DeepEqual(registry.Get("objectvalue"), expectedObj) {
			t.Error("Expected object value")
		}
	})

	t.Run("should handle circular inheritance safely", func(t *testing.T) {
		reg1 := DefaultRegistry.Create(nil)
		reg2 := DefaultRegistry.Create(reg1)

		// This doesn't create actual circular reference in the implementation
		// but tests that the structure handles complex inheritance
		reg1.Add("func1", mockFunction1)
		reg2.Add("func2", mockFunction2)

		if reg2.Get("func1") == nil {
			t.Error("Expected func1 from base")
		}
		if reg2.Get("func2") == nil {
			t.Error("Expected func2 from derived")
		}
	})
}

func TestIntegrationScenarios(t *testing.T) {
	t.Run("should work with complex inheritance and overrides", func(t *testing.T) {
		// Create a base registry with some functions
		baseRegistry := DefaultRegistry.Create(nil)
		baseRegistry.Add("common", func() string { return "base" })
		baseRegistry.Add("baseOnly", func() string { return "base-only" })

		// Create a derived registry that overrides some functions
		derivedRegistry := DefaultRegistry.Create(baseRegistry)
		derivedRegistry.Add("common", func() string { return "derived" })
		derivedRegistry.Add("derivedOnly", func() string { return "derived-only" })

		// Create a child registry
		childRegistry := derivedRegistry.Inherit()
		childRegistry.Add("childOnly", func() string { return "child-only" })

		// Test function resolution
		if childRegistry.Get("childonly").(func() string)() != "child-only" {
			t.Error("Expected child-only result")
		}
		if childRegistry.Get("derivedonly").(func() string)() != "derived-only" {
			t.Error("Expected derived-only result")
		}
		if childRegistry.Get("common").(func() string)() != "derived" {
			t.Error("Expected derived result for common function")
		}
		if childRegistry.Get("baseonly").(func() string)() != "base-only" {
			t.Error("Expected base-only result")
		}

		// Test local functions don't include inherited ones
		localFunctions := childRegistry.GetLocalFunctions()
		if len(localFunctions) != 1 {
			t.Errorf("Expected 1 local function, got %d", len(localFunctions))
		}
		if _, exists := localFunctions["childonly"]; !exists {
			t.Error("Expected childonly in local functions")
		}
	})

	t.Run("should handle multiple inheritance levels with same function names", func(t *testing.T) {
		level1 := DefaultRegistry.Create(nil)
		level1.Add("func", func() string { return "level1" })

		level2 := DefaultRegistry.Create(level1)
		level2.Add("func", func() string { return "level2" })

		level3 := DefaultRegistry.Create(level2)
		level3.Add("func", func() string { return "level3" })

		if level3.Get("func").(func() string)() != "level3" {
			t.Error("Expected level3 result")
		}
		if level2.Get("func").(func() string)() != "level2" {
			t.Error("Expected level2 result")
		}
		if level1.Get("func").(func() string)() != "level1" {
			t.Error("Expected level1 result")
		}
	})
} 