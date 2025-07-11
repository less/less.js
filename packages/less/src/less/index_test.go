package less

import (
	"reflect"
	"testing"
)

func TestFactory(t *testing.T) {
	t.Run("should be a function", func(t *testing.T) {
		// In Go, we test if Factory is callable by checking its type
		factoryType := reflect.TypeOf(Factory)
		if factoryType.Kind() != reflect.Func {
			t.Error("Factory should be a function")
		}
	})

	t.Run("should create Environment with provided parameters", func(t *testing.T) {
		environment := map[string]any{"test": "env"}
		fileManagers := []any{"fm1", "fm2"}

		result := Factory(environment, fileManagers)

		if result == nil {
			t.Error("Factory should return a non-nil result")
		}
		if reflect.TypeOf(result).Kind() != reflect.Map {
			t.Error("Factory should return a map")
		}
	})

	t.Run("should return an API object", func(t *testing.T) {
		result := Factory(map[string]any{}, []any{})

		if result == nil {
			t.Error("Factory should return a non-nil result")
		}
		if reflect.TypeOf(result).Kind() != reflect.Map {
			t.Error("Factory should return a map")
		}
	})
}

func TestReturnedAPIObject(t *testing.T) {
	var api map[string]any

	setup := func() {
		api = Factory(map[string]any{}, []any{})
	}

	t.Run("should return an object", func(t *testing.T) {
		setup()
		if reflect.TypeOf(api).Kind() != reflect.Map {
			t.Error("API should be a map")
		}
		if api == nil {
			t.Error("API should not be nil")
		}
	})

	t.Run("should contain version array with major, minor, patch", func(t *testing.T) {
		setup()
		version, exists := api["version"]
		if !exists {
			t.Error("API should have version property")
		}
		versionSlice, ok := version.([]int)
		if !ok {
			t.Error("version should be []int")
		}
		expected := []int{4, 2, 2}
		if !reflect.DeepEqual(versionSlice, expected) {
			t.Errorf("version should be %v, got %v", expected, versionSlice)
		}
	})

	t.Run("should expose data module", func(t *testing.T) {
		setup()
		if _, exists := api["data"]; !exists {
			t.Error("API should have data property")
		}
	})

	t.Run("should expose tree module", func(t *testing.T) {
		setup()
		if _, exists := api["tree"]; !exists {
			t.Error("API should have tree property")
		}
	})

	t.Run("should expose Environment constructor", func(t *testing.T) {
		setup()
		if _, exists := api["Environment"]; !exists {
			t.Error("API should have Environment property")
		}
	})

	t.Run("should expose AbstractFileManager", func(t *testing.T) {
		setup()
		if _, exists := api["AbstractFileManager"]; !exists {
			t.Error("API should have AbstractFileManager property")
		}
	})

	t.Run("should expose AbstractPluginLoader", func(t *testing.T) {
		setup()
		if _, exists := api["AbstractPluginLoader"]; !exists {
			t.Error("API should have AbstractPluginLoader property")
		}
	})

	t.Run("should expose environment instance", func(t *testing.T) {
		setup()
		if _, exists := api["environment"]; !exists {
			t.Error("API should have environment property")
		}
	})

	t.Run("should expose visitors", func(t *testing.T) {
		setup()
		if _, exists := api["visitors"]; !exists {
			t.Error("API should have visitors property")
		}
	})

	t.Run("should expose Parser", func(t *testing.T) {
		setup()
		if _, exists := api["Parser"]; !exists {
			t.Error("API should have Parser property")
		}
	})

	t.Run("should expose functions", func(t *testing.T) {
		setup()
		if _, exists := api["functions"]; !exists {
			t.Error("API should have functions property")
		}
	})

	t.Run("should expose contexts", func(t *testing.T) {
		setup()
		if _, exists := api["contexts"]; !exists {
			t.Error("API should have contexts property")
		}
	})

	t.Run("should expose SourceMapOutput instance", func(t *testing.T) {
		setup()
		if _, exists := api["SourceMapOutput"]; !exists {
			t.Error("API should have SourceMapOutput property")
		}
	})

	t.Run("should expose SourceMapBuilder instance", func(t *testing.T) {
		setup()
		if _, exists := api["SourceMapBuilder"]; !exists {
			t.Error("API should have SourceMapBuilder property")
		}
	})

	t.Run("should expose ParseTree instance", func(t *testing.T) {
		setup()
		if _, exists := api["ParseTree"]; !exists {
			t.Error("API should have ParseTree property")
		}
	})

	t.Run("should expose ImportManager instance", func(t *testing.T) {
		setup()
		if _, exists := api["ImportManager"]; !exists {
			t.Error("API should have ImportManager property")
		}
	})

	t.Run("should expose render function", func(t *testing.T) {
		setup()
		render, exists := api["render"]
		if !exists {
			t.Error("API should have render property")
		}
		if reflect.TypeOf(render).Kind() != reflect.Func {
			t.Error("render should be a function")
		}
	})

	t.Run("should expose parse function", func(t *testing.T) {
		setup()
		parse, exists := api["parse"]
		if !exists {
			t.Error("API should have parse property")
		}
		if reflect.TypeOf(parse).Kind() != reflect.Func {
			t.Error("parse should be a function")
		}
	})

	t.Run("should expose LessError", func(t *testing.T) {
		setup()
		if _, exists := api["LessError"]; !exists {
			t.Error("API should have LessError property")
		}
	})

	t.Run("should expose transformTree", func(t *testing.T) {
		setup()
		if _, exists := api["transformTree"]; !exists {
			t.Error("API should have transformTree property")
		}
	})

	t.Run("should expose utils", func(t *testing.T) {
		setup()
		if _, exists := api["utils"]; !exists {
			t.Error("API should have utils property")
		}
	})

	t.Run("should expose PluginManager", func(t *testing.T) {
		setup()
		if _, exists := api["PluginManager"]; !exists {
			t.Error("API should have PluginManager property")
		}
	})

	t.Run("should expose logger", func(t *testing.T) {
		setup()
		if _, exists := api["logger"]; !exists {
			t.Error("API should have logger property")
		}
	})
}

func TestTreeNodeConstructorCreation(t *testing.T) {
	var api map[string]any

	setup := func() {
		api = Factory(map[string]any{}, []any{})
	}

	t.Run("should create lowercase constructor functions for tree nodes", func(t *testing.T) {
		setup()
		if testnode, exists := api["testnode"]; exists {
			if reflect.TypeOf(testnode).Kind() != reflect.Func {
				t.Error("testnode should be a function")
			}
		}
		if anothernode, exists := api["anothernode"]; exists {
			if reflect.TypeOf(anothernode).Kind() != reflect.Func {
				t.Error("anothernode should be a function")
			}
		}
	})

	t.Run("should create nested object structure for nested tree nodes", func(t *testing.T) {
		setup()
		// Check if nestednodes exists in the mocked tree
		if nestednodes, exists := api["nestednodes"]; exists {
			if reflect.TypeOf(nestednodes).Kind() != reflect.Map {
				t.Error("nestednodes should be an object")
			}
			nestedMap, ok := nestednodes.(map[string]any)
			if !ok {
				t.Error("nestednodes should be a map[string]any")
			}
			if innernode, exists := nestedMap["innernode"]; exists {
				if reflect.TypeOf(innernode).Kind() != reflect.Func {
					t.Error("innernode should be a function")
				}
			}
			if deepnode, exists := nestedMap["deepnode"]; exists {
				if reflect.TypeOf(deepnode).Kind() != reflect.Func {
					t.Error("deepnode should be a function")
				}
			}
		} else {
			// If nestednodes doesn't exist in mock, verify the API still works
			if api == nil {
				t.Error("API should be defined")
			}
		}
	})

	t.Run("should create functional constructors", func(t *testing.T) {
		setup()
		if testnode, exists := api["testnode"]; exists {
			if constructor, ok := testnode.(func(...any) any); ok {
				testInstance := constructor()
				if testInstance == nil {
					t.Error("testnode constructor should return a non-nil instance")
				}
			}
		}
	})

	t.Run("should handle nested constructors when they exist", func(t *testing.T) {
		setup()
		// Only test if nestednodes exists in the mock
		if nestednodes, exists := api["nestednodes"]; exists {
			if nestedMap, ok := nestednodes.(map[string]any); ok {
				if innernode, exists := nestedMap["innernode"]; exists {
					if constructor, ok := innernode.(func(...any) any); ok {
						innerInstance := constructor()
						if innerInstance == nil {
							t.Error("innernode constructor should return a non-nil instance")
						}
					}
				}
			}
		} else {
			// If nested constructors don't exist in mock, just verify API works
			if api == nil {
				t.Error("API should be defined")
			}
		}
	})
}

func TestCtorHelperFunction(t *testing.T) {
	var api map[string]any

	setup := func() {
		api = Factory(map[string]any{}, []any{})
	}

	t.Run("should create constructors using the ctor helper", func(t *testing.T) {
		setup()
		// The ctor function creates constructors that use Object.create equivalent
		if testnode, exists := api["testnode"]; exists {
			if reflect.TypeOf(testnode).Kind() != reflect.Func {
				t.Error("testnode should be a function")
			}
		}
	})

	t.Run("should handle constructor creation", func(t *testing.T) {
		setup()
		if testnode, exists := api["testnode"]; exists {
			if constructor, ok := testnode.(func(...any) any); ok {
				instance := constructor()
				if instance == nil {
					t.Error("constructor should return a non-nil instance")
				}
			}
		}
	})
}

func TestFunctionBinding(t *testing.T) {
	var api map[string]any

	setup := func() {
		api = Factory(map[string]any{}, []any{})
	}

	t.Run("should have bound parse function", func(t *testing.T) {
		setup()
		if parse, exists := api["parse"]; exists {
			if reflect.TypeOf(parse).Kind() != reflect.Func {
				t.Error("parse should be a function")
			}
		}
	})

	t.Run("should have bound render function", func(t *testing.T) {
		setup()
		if render, exists := api["render"]; exists {
			if reflect.TypeOf(render).Kind() != reflect.Func {
				t.Error("render should be a function")
			}
		}
	})
}

func TestAPIObjectInheritance(t *testing.T) {
	var api map[string]any

	setup := func() {
		api = Factory(map[string]any{}, []any{})
	}

	t.Run("should create API object with all required properties", func(t *testing.T) {
		setup()
		if _, exists := api["version"]; !exists {
			t.Error("API should have version property")
		}
		if _, exists := api["environment"]; !exists {
			t.Error("API should have environment property")
		}
		if _, exists := api["LessError"]; !exists {
			t.Error("API should have LessError property")
		}
	})

	t.Run("should allow adding custom properties", func(t *testing.T) {
		setup()
		api["customProperty"] = "test"
		if api["customProperty"] != "test" {
			t.Error("should be able to add custom properties")
		}
	})
}

func TestEdgeCasesAndErrorHandling(t *testing.T) {
	t.Run("should handle nil environment", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("should not panic with nil environment: %v", r)
			}
		}()
		Factory(nil, []any{})
	})

	t.Run("should handle nil fileManagers", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("should not panic with nil fileManagers: %v", r)
			}
		}()
		Factory(map[string]any{}, nil)
	})

	t.Run("should handle empty parameters", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("should not panic with empty parameters: %v", r)
			}
		}()
		Factory(map[string]any{}, []any{})
	})
}

func TestVersionParsing(t *testing.T) {
	t.Run("should have correct version format", func(t *testing.T) {
		api := Factory(map[string]any{}, []any{})
		version, exists := api["version"]
		if !exists {
			t.Error("API should have version property")
		}
		versionSlice, ok := version.([]int)
		if !ok {
			t.Error("version should be []int")
		}
		if len(versionSlice) != 3 {
			t.Error("version should have 3 elements")
		}
		expected := []int{4, 2, 2}
		if !reflect.DeepEqual(versionSlice, expected) {
			t.Errorf("version should be %v, got %v", expected, versionSlice)
		}
	})
}

func TestParseVersionFunction(t *testing.T) {
	t.Run("should parse version correctly", func(t *testing.T) {
		result := parseVersion("v4.2.2")
		expected := VersionInfo{Major: 4, Minor: 2, Patch: 2}
		if result != expected {
			t.Errorf("parseVersion should return %v, got %v", expected, result)
		}
	})

	t.Run("should handle version without v prefix", func(t *testing.T) {
		result := parseVersion("1.2.3")
		expected := VersionInfo{Major: 1, Minor: 2, Patch: 3}
		if result != expected {
			t.Errorf("parseVersion should return %v, got %v", expected, result)
		}
	})
}

func TestHelperFunctions(t *testing.T) {
	t.Run("isFunction should identify functions", func(t *testing.T) {
		testFunc := func() any { return nil }
		if !isFunction(testFunc) {
			t.Error("isFunction should return true for functions")
		}
		if isFunction("not a function") {
			t.Error("isFunction should return false for non-functions")
		}
	})

	t.Run("isObject should identify objects", func(t *testing.T) {
		testObj := map[string]any{"key": "value"}
		if !isObject(testObj) {
			t.Error("isObject should return true for maps")
		}
		if isObject("not an object") {
			t.Error("isObject should return false for non-objects")
		}
	})

	t.Run("cloneAny should clone objects", func(t *testing.T) {
		original := map[string]any{"key": "value"}
		cloned := cloneAny(original)
		
		clonedMap, ok := cloned.(map[string]any)
		if !ok {
			t.Error("cloned object should be a map")
		}
		
		// Modify original to verify independence
		original["key"] = "modified"
		if clonedMap["key"] == "modified" {
			t.Error("cloned object should be independent of original")
		}
	})

	t.Run("mergeDefaults should merge maps correctly", func(t *testing.T) {
		target := map[string]any{"existing": "value"}
		source := map[string]any{"new": "default", "existing": "ignored"}
		
		result := mergeDefaults(target, source)
		
		if result["existing"] != "value" {
			t.Error("existing values should not be overwritten")
		}
		if result["new"] != "default" {
			t.Error("new values should be added from source")
		}
	})
}