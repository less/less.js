package less

import (
	"reflect"
	"testing"
)

// MockPluginLoader implements PluginLoader for testing
type MockPluginLoader struct{}

func (m *MockPluginLoader) EvalPlugin(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any {
	return map[string]string{"name": "test-plugin"}
}

func (m *MockPluginLoader) LoadPluginSync(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	return map[string]string{"filename": "/resolved/test.js", "contents": "module.exports = {};"}
}

func (m *MockPluginLoader) LoadPlugin(path, currentDirectory string, context map[string]any, environment any, fileManager any) any {
	return nil
}

// MockFunctions implements Functions for testing
type MockFunctions struct {
	Registry any
}

func (mf *MockFunctions) GetFunctionRegistry() any {
	return mf.Registry
}

// MockLess implements LessInterface for testing
type MockLess struct {
	pluginLoader PluginLoaderFactory
	functions    Functions
}

func (ml *MockLess) GetPluginLoader() PluginLoaderFactory {
	return ml.pluginLoader
}

func (ml *MockLess) GetFunctions() Functions {
	return ml.functions
}

// MockPlugin implements Plugin for testing
type MockPlugin struct {
	name        string
	installFunc func(less LessInterface, pm *PluginManager, registry any) error
}

func (mp *MockPlugin) Install(less LessInterface, pm *PluginManager, registry any) error {
	if mp.installFunc != nil {
		return mp.installFunc(less, pm, registry)
	}
	return nil
}

func newMockLess() *MockLess {
	return &MockLess{
		pluginLoader: func(less LessInterface) PluginLoader {
			return &MockPluginLoader{}
		},
		functions: &MockFunctions{
			Registry: map[string]any{},
		},
	}
}

func TestPluginManagerFactory(t *testing.T) {
	t.Run("should create a new PluginManager instance when first called", func(t *testing.T) {
		mockLess := newMockLess()
		pm1 := PluginManagerFactory(mockLess, true) // force new instance
		
		if pm1 == nil {
			t.Fatal("Expected PluginManager instance, got nil")
		}
		
		if pm1.less != mockLess {
			t.Error("Expected less instance to be set correctly")
		}
	})
	
	t.Run("should return the same instance on subsequent calls", func(t *testing.T) {
		mockLess := newMockLess()
		// Reset global pm to nil for this test
		pm = nil
		
		pm1 := PluginManagerFactory(mockLess, false)
		pm2 := PluginManagerFactory(mockLess, false)
		
		if pm1 != pm2 {
			t.Error("Expected same instance on subsequent calls")
		}
	})
	
	t.Run("should create a new instance when newFactory is true", func(t *testing.T) {
		mockLess := newMockLess()
		pm1 := PluginManagerFactory(mockLess, false)
		pm2 := PluginManagerFactory(mockLess, true)
		
		if pm1 == pm2 {
			t.Error("Expected different instances when newFactory is true")
		}
	})
}

func TestPluginManagerConstructor(t *testing.T) {
	t.Run("should initialize with correct default values", func(t *testing.T) {
		mockLess := newMockLess()
		pluginManager := PluginManagerFactory(mockLess, true)
		
		if pluginManager.less != mockLess {
			t.Error("Expected less to be set correctly")
		}
		
		if len(pluginManager.visitors) != 0 {
			t.Error("Expected visitors to be empty")
		}
		
		if len(pluginManager.preProcessors) != 0 {
			t.Error("Expected preProcessors to be empty")
		}
		
		if len(pluginManager.postProcessors) != 0 {
			t.Error("Expected postProcessors to be empty")
		}
		
		if len(pluginManager.installedPlugins) != 0 {
			t.Error("Expected installedPlugins to be empty")
		}
		
		if len(pluginManager.fileManagers) != 0 {
			t.Error("Expected fileManagers to be empty")
		}
		
		if pluginManager.iterator != -1 {
			t.Errorf("Expected iterator to be -1, got %d", pluginManager.iterator)
		}
		
		if len(pluginManager.pluginCache) != 0 {
			t.Error("Expected pluginCache to be empty")
		}
		
		if pluginManager.Loader == nil {
			t.Error("Expected Loader to be set")
		}
	})
}

func TestAddPlugins(t *testing.T) {
	t.Run("should add multiple plugins from slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin1 := map[string]any{"name": "plugin1"}
		plugin2 := map[string]any{"name": "plugin2"}
		plugins := []any{plugin1, plugin2}
		
		pluginManager.AddPlugins(plugins)
		
		expected := []any{plugin1, plugin2}
		if !reflect.DeepEqual(pluginManager.installedPlugins, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.installedPlugins)
		}
	})
	
	t.Run("should handle empty slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		pluginManager.AddPlugins([]any{})
		
		if len(pluginManager.installedPlugins) != 0 {
			t.Error("Expected installedPlugins to remain empty")
		}
	})
	
	t.Run("should handle nil plugins", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		pluginManager.AddPlugins(nil)
		
		if len(pluginManager.installedPlugins) != 0 {
			t.Error("Expected installedPlugins to remain empty")
		}
	})
}

func TestAddPlugin(t *testing.T) {
	t.Run("should add plugin to installedPlugins", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin := map[string]any{"name": "testPlugin"}
		
		pluginManager.AddPlugin(plugin, "", nil)
		
		if len(pluginManager.installedPlugins) != 1 {
			t.Error("Expected 1 installed plugin")
		}
		
		if !reflect.DeepEqual(pluginManager.installedPlugins[0], plugin) {
			t.Error("Expected plugin to be added to installedPlugins")
		}
	})
	
	t.Run("should cache plugin with filename when provided", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin := map[string]any{"name": "testPlugin"}
		filename := "test-plugin.js"
		
		pluginManager.AddPlugin(plugin, filename, nil)
		
		if !reflect.DeepEqual(pluginManager.pluginCache[filename], plugin) {
			t.Error("Expected plugin to be cached with filename")
		}
	})
	
	t.Run("should not cache plugin when filename is not provided", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin := map[string]any{"name": "testPlugin"}
		
		pluginManager.AddPlugin(plugin, "", nil)
		
		if len(pluginManager.pluginCache) != 0 {
			t.Error("Expected pluginCache to remain empty")
		}
	})
	
	t.Run("should call plugin.Install when install method exists", func(t *testing.T) {
		mockLess := newMockLess()
		pluginManager := PluginManagerFactory(mockLess, true)
		
		installCalled := false
		plugin := &MockPlugin{
			name: "testPlugin",
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				installCalled = true
				if less != mockLess {
					t.Error("Expected correct less instance")
				}
				if pm != pluginManager {
					t.Error("Expected correct plugin manager instance")
				}
				if !reflect.DeepEqual(registry, mockLess.functions.GetFunctionRegistry()) {
					t.Error("Expected correct function registry")
				}
				return nil
			},
		}
		
		pluginManager.AddPlugin(plugin, "test-plugin.js", nil)
		
		if !installCalled {
			t.Error("Expected plugin.Install to be called")
		}
	})
	
	t.Run("should use custom functionRegistry when provided", func(t *testing.T) {
		mockLess := newMockLess()
		pluginManager := PluginManagerFactory(mockLess, true)
		customRegistry := map[string]any{"custom": true}
		
		plugin := &MockPlugin{
			name: "testPlugin",
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				if !reflect.DeepEqual(registry, customRegistry) {
					t.Error("Expected custom registry to be used")
				}
				return nil
			},
		}
		
		pluginManager.AddPlugin(plugin, "", customRegistry)
	})
	
	t.Run("should not panic when plugin has no install method", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin := map[string]any{"name": "testPlugin"}
		
		// Should not panic
		pluginManager.AddPlugin(plugin, "", nil)
		
		if len(pluginManager.installedPlugins) != 1 {
			t.Error("Expected plugin to be added despite no install method")
		}
	})
}

func TestGet(t *testing.T) {
	t.Run("should return cached plugin by filename", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		plugin := map[string]any{"name": "testPlugin"}
		filename := "test-plugin.js"
		
		pluginManager.AddPlugin(plugin, filename, nil)
		
		result := pluginManager.Get(filename)
		if !reflect.DeepEqual(result, plugin) {
			t.Error("Expected to get cached plugin")
		}
	})
	
	t.Run("should return nil for non-existent filename", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		result := pluginManager.Get("non-existent.js")
		if result != nil {
			t.Error("Expected nil for non-existent filename")
		}
	})
}

func TestAddVisitor(t *testing.T) {
	t.Run("should add visitor to visitors slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor := map[string]any{"name": "testVisitor"}
		
		pluginManager.AddVisitor(visitor)
		
		if len(pluginManager.visitors) != 1 {
			t.Error("Expected 1 visitor")
		}
		
		if !reflect.DeepEqual(pluginManager.visitors[0], visitor) {
			t.Error("Expected visitor to be added")
		}
	})
	
	t.Run("should add multiple visitors in order", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		
		pluginManager.AddVisitor(visitor1)
		pluginManager.AddVisitor(visitor2)
		
		expected := []any{visitor1, visitor2}
		if !reflect.DeepEqual(pluginManager.visitors, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.visitors)
		}
	})
}

func TestAddPreProcessor(t *testing.T) {
	t.Run("should add preProcessor with priority", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		preProcessor := map[string]any{"name": "testPreProcessor"}
		priority := 1000
		
		pluginManager.AddPreProcessor(preProcessor, priority)
		
		if len(pluginManager.preProcessors) != 1 {
			t.Error("Expected 1 preProcessor")
		}
		
		expected := ProcessorEntry{
			Processor: preProcessor,
			Priority:  priority,
		}
		
		if !reflect.DeepEqual(pluginManager.preProcessors[0], expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.preProcessors[0])
		}
	})
	
	t.Run("should insert preProcessors in priority order (ascending)", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		preProcessor1 := map[string]any{"name": "high"}
		preProcessor2 := map[string]any{"name": "low"}
		preProcessor3 := map[string]any{"name": "medium"}
		
		pluginManager.AddPreProcessor(preProcessor1, 2000)
		pluginManager.AddPreProcessor(preProcessor2, 500)
		pluginManager.AddPreProcessor(preProcessor3, 1000)
		
		expected := []ProcessorEntry{
			{Processor: preProcessor2, Priority: 500},
			{Processor: preProcessor3, Priority: 1000},
			{Processor: preProcessor1, Priority: 2000},
		}
		
		if !reflect.DeepEqual(pluginManager.preProcessors, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.preProcessors)
		}
	})
	
	t.Run("should handle same priority correctly", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		preProcessor1 := map[string]any{"name": "first"}
		preProcessor2 := map[string]any{"name": "second"}
		
		pluginManager.AddPreProcessor(preProcessor1, 1000)
		pluginManager.AddPreProcessor(preProcessor2, 1000)
		
		expected := []ProcessorEntry{
			{Processor: preProcessor2, Priority: 1000},
			{Processor: preProcessor1, Priority: 1000},
		}
		
		if !reflect.DeepEqual(pluginManager.preProcessors, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.preProcessors)
		}
	})
}

func TestAddPostProcessor(t *testing.T) {
	t.Run("should add postProcessor with priority", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		postProcessor := map[string]any{"name": "testPostProcessor"}
		priority := 1000
		
		pluginManager.AddPostProcessor(postProcessor, priority)
		
		if len(pluginManager.postProcessors) != 1 {
			t.Error("Expected 1 postProcessor")
		}
		
		expected := ProcessorEntry{
			Processor: postProcessor,
			Priority:  priority,
		}
		
		if !reflect.DeepEqual(pluginManager.postProcessors[0], expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.postProcessors[0])
		}
	})
	
	t.Run("should insert postProcessors in priority order (ascending)", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		postProcessor1 := map[string]any{"name": "high"}
		postProcessor2 := map[string]any{"name": "low"}
		postProcessor3 := map[string]any{"name": "medium"}
		
		pluginManager.AddPostProcessor(postProcessor1, 2000)
		pluginManager.AddPostProcessor(postProcessor2, 500)
		pluginManager.AddPostProcessor(postProcessor3, 1000)
		
		expected := []ProcessorEntry{
			{Processor: postProcessor2, Priority: 500},
			{Processor: postProcessor3, Priority: 1000},
			{Processor: postProcessor1, Priority: 2000},
		}
		
		if !reflect.DeepEqual(pluginManager.postProcessors, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.postProcessors)
		}
	})
	
	t.Run("should handle same priority correctly", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		postProcessor1 := map[string]any{"name": "first"}
		postProcessor2 := map[string]any{"name": "second"}
		
		pluginManager.AddPostProcessor(postProcessor1, 1000)
		pluginManager.AddPostProcessor(postProcessor2, 1000)
		
		expected := []ProcessorEntry{
			{Processor: postProcessor2, Priority: 1000},
			{Processor: postProcessor1, Priority: 1000},
		}
		
		if !reflect.DeepEqual(pluginManager.postProcessors, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.postProcessors)
		}
	})
}

func TestAddFileManager(t *testing.T) {
	t.Run("should add file manager to fileManagers slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		manager := map[string]any{"name": "testFileManager"}
		
		pluginManager.AddFileManager(manager)
		
		if len(pluginManager.fileManagers) != 1 {
			t.Error("Expected 1 file manager")
		}
		
		if !reflect.DeepEqual(pluginManager.fileManagers[0], manager) {
			t.Error("Expected file manager to be added")
		}
	})
	
	t.Run("should add multiple file managers in order", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		manager1 := map[string]any{"name": "manager1"}
		manager2 := map[string]any{"name": "manager2"}
		
		pluginManager.AddFileManager(manager1)
		pluginManager.AddFileManager(manager2)
		
		expected := []any{manager1, manager2}
		if !reflect.DeepEqual(pluginManager.fileManagers, expected) {
			t.Errorf("Expected %v, got %v", expected, pluginManager.fileManagers)
		}
	})
}

func TestGetPreProcessors(t *testing.T) {
	t.Run("should return slice of preProcessors only", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		preProcessor1 := map[string]any{"name": "pre1"}
		preProcessor2 := map[string]any{"name": "pre2"}
		
		pluginManager.AddPreProcessor(preProcessor1, 1000)
		pluginManager.AddPreProcessor(preProcessor2, 500)
		
		result := pluginManager.GetPreProcessors()
		expected := []any{preProcessor2, preProcessor1}
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should return empty slice when no preProcessors", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		result := pluginManager.GetPreProcessors()
		if len(result) != 0 {
			t.Error("Expected empty slice")
		}
	})
}

func TestGetPostProcessors(t *testing.T) {
	t.Run("should return slice of postProcessors only", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		postProcessor1 := map[string]any{"name": "post1"}
		postProcessor2 := map[string]any{"name": "post2"}
		
		pluginManager.AddPostProcessor(postProcessor1, 1000)
		pluginManager.AddPostProcessor(postProcessor2, 500)
		
		result := pluginManager.GetPostProcessors()
		expected := []any{postProcessor2, postProcessor1}
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should return empty slice when no postProcessors", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		result := pluginManager.GetPostProcessors()
		if len(result) != 0 {
			t.Error("Expected empty slice")
		}
	})
}

func TestGetVisitors(t *testing.T) {
	t.Run("should return visitors slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		
		pluginManager.AddVisitor(visitor1)
		pluginManager.AddVisitor(visitor2)
		
		result := pluginManager.GetVisitors()
		expected := []any{visitor1, visitor2}
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should return empty slice when no visitors", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		result := pluginManager.GetVisitors()
		if len(result) != 0 {
			t.Error("Expected empty slice")
		}
	})
}

func TestGetFileManagers(t *testing.T) {
	t.Run("should return fileManagers slice", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		manager1 := map[string]any{"name": "manager1"}
		manager2 := map[string]any{"name": "manager2"}
		
		pluginManager.AddFileManager(manager1)
		pluginManager.AddFileManager(manager2)
		
		result := pluginManager.GetFileManagers()
		expected := []any{manager1, manager2}
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should return empty slice when no file managers", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		result := pluginManager.GetFileManagers()
		if len(result) != 0 {
			t.Error("Expected empty slice")
		}
	})
}

func TestVisitorIterator(t *testing.T) {
	t.Run("should return visitor iterator object", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		iterator := pluginManager.Visitor()
		
		if iterator == nil {
			t.Error("Expected visitor iterator")
		}
		
		if iterator.pm != pluginManager {
			t.Error("Expected iterator to reference plugin manager")
		}
	})
	
	t.Run("should reset iterator with First() and return nil for empty visitors", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		iterator := pluginManager.Visitor()
		
		result := iterator.First()
		
		if pluginManager.iterator != -1 {
			t.Errorf("Expected iterator to be -1, got %d", pluginManager.iterator)
		}
		
		if result != nil {
			t.Error("Expected nil for empty visitors")
		}
	})
	
	t.Run("should iterate through visitors with Get()", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		
		pluginManager.AddVisitor(visitor1)
		pluginManager.AddVisitor(visitor2)
		
		iterator := pluginManager.Visitor()
		iterator.First()
		
		first := iterator.Get()
		second := iterator.Get()
		third := iterator.Get()
		
		if !reflect.DeepEqual(first, visitor1) {
			t.Error("Expected first visitor")
		}
		
		if !reflect.DeepEqual(second, visitor2) {
			t.Error("Expected second visitor")
		}
		
		if third != nil {
			t.Error("Expected nil after all visitors")
		}
	})
	
	t.Run("should handle multiple iterator calls correctly", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		
		pluginManager.AddVisitor(visitor1)
		pluginManager.AddVisitor(visitor2)
		
		iterator := pluginManager.Visitor()
		
		// First iteration
		iterator.First()
		if !reflect.DeepEqual(iterator.Get(), visitor1) {
			t.Error("Expected first visitor")
		}
		if !reflect.DeepEqual(iterator.Get(), visitor2) {
			t.Error("Expected second visitor")
		}
		
		// Reset and iterate again
		iterator.First()
		if !reflect.DeepEqual(iterator.Get(), visitor1) {
			t.Error("Expected first visitor on reset")
		}
		if !reflect.DeepEqual(iterator.Get(), visitor2) {
			t.Error("Expected second visitor on reset")
		}
	})
	
	t.Run("should maintain iterator state across multiple Get() calls", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		visitor3 := map[string]any{"name": "visitor3"}
		
		pluginManager.AddVisitor(visitor1)
		pluginManager.AddVisitor(visitor2)
		pluginManager.AddVisitor(visitor3)
		
		iterator := pluginManager.Visitor()
		iterator.First()
		
		if pluginManager.iterator != -1 {
			t.Errorf("Expected iterator to be -1, got %d", pluginManager.iterator)
		}
		
		if !reflect.DeepEqual(iterator.Get(), visitor1) {
			t.Error("Expected first visitor")
		}
		if pluginManager.iterator != 0 {
			t.Errorf("Expected iterator to be 0, got %d", pluginManager.iterator)
		}
		
		if !reflect.DeepEqual(iterator.Get(), visitor2) {
			t.Error("Expected second visitor")
		}
		if pluginManager.iterator != 1 {
			t.Errorf("Expected iterator to be 1, got %d", pluginManager.iterator)
		}
		
		if !reflect.DeepEqual(iterator.Get(), visitor3) {
			t.Error("Expected third visitor")
		}
		if pluginManager.iterator != 2 {
			t.Errorf("Expected iterator to be 2, got %d", pluginManager.iterator)
		}
		
		if iterator.Get() != nil {
			t.Error("Expected nil after all visitors")
		}
		if pluginManager.iterator != 3 {
			t.Errorf("Expected iterator to be 3, got %d", pluginManager.iterator)
		}
	})
}

func TestIntegrationTests(t *testing.T) {
	t.Run("should handle complex plugin with all features", func(t *testing.T) {
		mockLess := newMockLess()
		pluginManager := PluginManagerFactory(mockLess, true)
		
		mockVisitor := map[string]any{"name": "pluginVisitor"}
		mockPreProcessor := map[string]any{"name": "pluginPreProcessor"}
		mockPostProcessor := map[string]any{"name": "pluginPostProcessor"}
		mockFileManager := map[string]any{"name": "pluginFileManager"}
		
		complexPlugin := &MockPlugin{
			name: "complexPlugin",
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				pm.AddVisitor(mockVisitor)
				pm.AddPreProcessor(mockPreProcessor, 1000)
				pm.AddPostProcessor(mockPostProcessor, 1000)
				pm.AddFileManager(mockFileManager)
				return nil
			},
		}
		
		pluginManager.AddPlugin(complexPlugin, "complex-plugin.js", nil)
		
		if pluginManager.Get("complex-plugin.js") != complexPlugin {
			t.Error("Expected plugin to be cached")
		}
		
		visitors := pluginManager.GetVisitors()
		if len(visitors) != 1 || !reflect.DeepEqual(visitors[0], mockVisitor) {
			t.Error("Expected visitor to be added")
		}
		
		preProcessors := pluginManager.GetPreProcessors()
		if len(preProcessors) != 1 || !reflect.DeepEqual(preProcessors[0], mockPreProcessor) {
			t.Error("Expected preProcessor to be added")
		}
		
		postProcessors := pluginManager.GetPostProcessors()
		if len(postProcessors) != 1 || !reflect.DeepEqual(postProcessors[0], mockPostProcessor) {
			t.Error("Expected postProcessor to be added")
		}
		
		fileManagers := pluginManager.GetFileManagers()
		if len(fileManagers) != 1 || !reflect.DeepEqual(fileManagers[0], mockFileManager) {
			t.Error("Expected fileManager to be added")
		}
	})
	
	t.Run("should handle multiple plugins with priority ordering", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		earlyPreProcessor := map[string]any{"name": "early"}
		latePreProcessor := map[string]any{"name": "late"}
		middlePreProcessor := map[string]any{"name": "middle"}
		
		plugin1 := &MockPlugin{
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				pm.AddPreProcessor(latePreProcessor, 2000)
				return nil
			},
		}
		plugin2 := &MockPlugin{
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				pm.AddPreProcessor(earlyPreProcessor, 500)
				return nil
			},
		}
		plugin3 := &MockPlugin{
			installFunc: func(less LessInterface, pm *PluginManager, registry any) error {
				pm.AddPreProcessor(middlePreProcessor, 1000)
				return nil
			},
		}
		
		pluginManager.AddPlugins([]any{plugin1, plugin2, plugin3})
		
		processors := pluginManager.GetPreProcessors()
		expected := []any{earlyPreProcessor, middlePreProcessor, latePreProcessor}
		
		if !reflect.DeepEqual(processors, expected) {
			t.Errorf("Expected %v, got %v", expected, processors)
		}
	})
	
	t.Run("should maintain separate instances when newFactory is used", func(t *testing.T) {
		mockLess := newMockLess()
		pm1 := PluginManagerFactory(mockLess, true)
		pm2 := PluginManagerFactory(mockLess, true)
		
		visitor1 := map[string]any{"name": "visitor1"}
		visitor2 := map[string]any{"name": "visitor2"}
		
		pm1.AddVisitor(visitor1)
		pm2.AddVisitor(visitor2)
		
		if !reflect.DeepEqual(pm1.GetVisitors(), []any{visitor1}) {
			t.Error("Expected pm1 to have only visitor1")
		}
		
		if !reflect.DeepEqual(pm2.GetVisitors(), []any{visitor2}) {
			t.Error("Expected pm2 to have only visitor2")
		}
	})
}

func TestPluginManagerEdgeCases(t *testing.T) {
	t.Run("should handle negative priorities", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		processor1 := map[string]any{"name": "negative"}
		processor2 := map[string]any{"name": "positive"}
		
		pluginManager.AddPreProcessor(processor1, -100)
		pluginManager.AddPreProcessor(processor2, 100)
		
		expected := []any{processor1, processor2}
		result := pluginManager.GetPreProcessors()
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should handle zero priority", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		processor := map[string]any{"name": "zero"}
		
		pluginManager.AddPreProcessor(processor, 0)
		
		expected := []any{processor}
		result := pluginManager.GetPreProcessors()
		
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})
	
	t.Run("should handle large arrays", func(t *testing.T) {
		pluginManager := PluginManagerFactory(newMockLess(), true)
		
		visitors := make([]any, 1000)
		for i := 0; i < 1000; i++ {
			visitor := map[string]any{"name": "visitor" + string(rune('0'+i%10))}
			visitors[i] = visitor
			pluginManager.AddVisitor(visitor)
		}
		
		result := pluginManager.GetVisitors()
		if len(result) != 1000 {
			t.Errorf("Expected 1000 visitors, got %d", len(result))
		}
		
		firstVisitor := result[0].(map[string]any)
		if firstVisitor["name"] != "visitor0" {
			t.Errorf("Expected first visitor to be visitor0, got %v", firstVisitor["name"])
		}
		
		lastVisitor := result[999].(map[string]any)
		if lastVisitor["name"] != "visitor9" {
			t.Errorf("Expected last visitor to be visitor9, got %v", lastVisitor["name"])
		}
	})
}