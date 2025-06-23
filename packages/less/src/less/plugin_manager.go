package less

import "slices"

// PluginLoader interface represents the minimal interface needed for plugin loading
type PluginLoader interface {
	EvalPlugin(contents string, newEnv *Parse, importManager any, pluginArgs map[string]any, newFileInfo any) any
	LoadPluginSync(path, currentDirectory string, context map[string]any, environment any, fileManager any) any
	LoadPlugin(path, currentDirectory string, context map[string]any, environment any, fileManager any) any
}

// PluginLoaderFactory represents a factory function for creating PluginLoader instances
type PluginLoaderFactory func(less LessInterface) PluginLoader

// Functions interface represents the functions registry
type Functions interface {
	GetFunctionRegistry() any
}

// LessInterface represents the minimal interface needed by PluginManager
type LessInterface interface {
	GetPluginLoader() PluginLoaderFactory
	GetFunctions() Functions
}

// ProcessorEntry represents a processor with its priority
type ProcessorEntry struct {
	Processor any
	Priority  int
}

// PluginManager manages plugins for the Less system
type PluginManager struct {
	less             LessInterface
	visitors         []any
	preProcessors    []ProcessorEntry
	postProcessors   []ProcessorEntry
	installedPlugins []any
	fileManagers     []any
	iterator         int
	pluginCache      map[string]any
	Loader           PluginLoader
}

// NewPluginManager creates a new PluginManager instance
func NewPluginManager(less LessInterface) *PluginManager {
	pm := &PluginManager{
		less:             less,
		visitors:         make([]any, 0),
		preProcessors:    make([]ProcessorEntry, 0),
		postProcessors:   make([]ProcessorEntry, 0),
		installedPlugins: make([]any, 0),
		fileManagers:     make([]any, 0),
		iterator:         -1,
		pluginCache:      make(map[string]any),
	}
	
	// Create a minimal PluginLoader - this will be replaced when PluginLoader is ported
	if less != nil {
		factory := less.GetPluginLoader()
		if factory != nil {
			pm.Loader = factory(less)
		}
	}
	
	return pm
}

// AddPlugins adds all the plugins in the slice
func (pm *PluginManager) AddPlugins(plugins []any) {
	if plugins != nil {
		for i := 0; i < len(plugins); i++ {
			pm.AddPlugin(plugins[i], "", nil)
		}
	}
}

// Plugin interface represents the minimal interface a plugin must implement
type Plugin interface {
	Install(less LessInterface, pluginManager *PluginManager, functionRegistry any) error
}

// AddPlugin adds a single plugin
func (pm *PluginManager) AddPlugin(plugin any, filename string, functionRegistry any) {
	pm.installedPlugins = append(pm.installedPlugins, plugin)
	
	if filename != "" {
		pm.pluginCache[filename] = plugin
	}
	
	// Check if plugin implements the Install method using type assertion
	if p, ok := plugin.(Plugin); ok {
		var registry any = functionRegistry
		if registry == nil && pm.less != nil {
			functions := pm.less.GetFunctions()
			if functions != nil {
				registry = functions.GetFunctionRegistry()
			}
		}
		p.Install(pm.less, pm, registry)
	}
}

// Get retrieves a cached plugin by filename
func (pm *PluginManager) Get(filename string) any {
	return pm.pluginCache[filename]
}

// AddVisitor adds a visitor
func (pm *PluginManager) AddVisitor(visitor any) {
	pm.visitors = append(pm.visitors, visitor)
}

// AddPreProcessor adds a pre processor object with priority
func (pm *PluginManager) AddPreProcessor(preProcessor any, priority int) {
	indexToInsertAt := 0
	for indexToInsertAt = 0; indexToInsertAt < len(pm.preProcessors); indexToInsertAt++ {
		if pm.preProcessors[indexToInsertAt].Priority >= priority {
			break
		}
	}
	
	entry := ProcessorEntry{
		Processor: preProcessor,
		Priority:  priority,
	}
	
	// Insert at the calculated index
	pm.preProcessors = slices.Insert(pm.preProcessors, indexToInsertAt, entry)
}

// AddPostProcessor adds a post processor object with priority
func (pm *PluginManager) AddPostProcessor(postProcessor any, priority int) {
	indexToInsertAt := 0
	for indexToInsertAt = 0; indexToInsertAt < len(pm.postProcessors); indexToInsertAt++ {
		if pm.postProcessors[indexToInsertAt].Priority >= priority {
			break
		}
	}
	
	entry := ProcessorEntry{
		Processor: postProcessor,
		Priority:  priority,
	}
	
	// Insert at the calculated index
	pm.postProcessors = slices.Insert(pm.postProcessors, indexToInsertAt, entry)
}

// AddFileManager adds a file manager
func (pm *PluginManager) AddFileManager(manager any) {
	pm.fileManagers = append(pm.fileManagers, manager)
}

// GetPreProcessors returns the array of pre processors only
func (pm *PluginManager) GetPreProcessors() []any {
	preProcessors := make([]any, len(pm.preProcessors))
	for i := 0; i < len(pm.preProcessors); i++ {
		preProcessors[i] = pm.preProcessors[i].Processor
	}
	return preProcessors
}

// GetPostProcessors returns the array of post processors only
func (pm *PluginManager) GetPostProcessors() []any {
	postProcessors := make([]any, len(pm.postProcessors))
	for i := 0; i < len(pm.postProcessors); i++ {
		postProcessors[i] = pm.postProcessors[i].Processor
	}
	return postProcessors
}

// GetVisitors returns the visitors array
func (pm *PluginManager) GetVisitors() []any {
	return pm.visitors
}

// VisitorIterator represents an iterator for visitors
type VisitorIterator struct {
	pm *PluginManager
}

// First resets the iterator and returns undefined/nil (matching JavaScript behavior)
func (vi *VisitorIterator) First() any {
	vi.pm.iterator = -1
	// JavaScript returns visitors[self.iterator] which is visitors[-1] = undefined
	// In Go, we return nil to match this behavior
	return nil
}

// Get returns the next visitor in the iteration
func (vi *VisitorIterator) Get() any {
	vi.pm.iterator++
	if vi.pm.iterator >= len(vi.pm.visitors) {
		return nil
	}
	return vi.pm.visitors[vi.pm.iterator]
}

// Visitor returns a visitor iterator
func (pm *PluginManager) Visitor() *VisitorIterator {
	return &VisitorIterator{pm: pm}
}

// GetFileManagers returns the file managers array
func (pm *PluginManager) GetFileManagers() []any {
	return pm.fileManagers
}

// Global plugin manager instance
var pm *PluginManager

// PluginManagerFactory creates or returns the global PluginManager instance
func PluginManagerFactory(less LessInterface, newFactory bool) *PluginManager {
	if newFactory || pm == nil {
		pm = NewPluginManager(less)
	}
	return pm
}