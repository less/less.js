package less

type SourceMapBuilder struct {
	options                   SourceMapBuilderOptions
	sourceMap                string
	sourceMapURL             string
	sourceMapInputFilename   string
}

type SourceMapBuilderOptions struct {
	SourceMapFilename              string
	SourceMapURL                   string
	SourceMapOutputFilename        string
	SourceMapInputFilename         string
	SourceMapBasepath              string
	SourceMapRootpath              string
	OutputSourceFiles              bool
	SourceMapGenerator             any
	SourceMapFileInline            bool
	DisableSourcemapAnnotation     bool
}

type SourceMapEnvironment interface {
	EncodeBase64(str string) string
}

type Imports struct {
	Contents              map[string]string
	ContentsIgnoredChars  map[string]int
}

func NewSourceMapBuilder(options SourceMapBuilderOptions) *SourceMapBuilder {
	return &SourceMapBuilder{
		options: options,
	}
}

func (smb *SourceMapBuilder) ToCSS(rootNode Node, options map[string]any, imports *Imports, environment SourceMapEnvironment) string {
	sourceMapOutputOptions := SourceMapOutputOptions{
		ContentsIgnoredCharsMap:        imports.ContentsIgnoredChars,
		RootNode:                       rootNode,
		ContentsMap:                    imports.Contents,
		SourceMapFilename:              smb.options.SourceMapFilename,
		SourceMapURL:                   smb.options.SourceMapURL,
		OutputFilename:                 smb.options.SourceMapOutputFilename,
		SourceMapBasepath:              smb.options.SourceMapBasepath,
		SourceMapRootpath:              smb.options.SourceMapRootpath,
		OutputSourceFiles:              smb.options.OutputSourceFiles,
		SourceMapGeneratorConstructor:  func() SourceMapGenerator { 
			// This should be injected from the caller in real usage
			// For now, we'll use a default implementation
			return &defaultSourceMapGenerator{
				mappings: make([]SourceMapMapping, 0),
				sourceContents: make(map[string]string),
			}
		},
	}

	sourceMapOutput := NewSourceMapOutput(sourceMapOutputOptions)
	css := sourceMapOutput.ToCSS(options)
	smb.sourceMap = sourceMapOutput.SourceMap
	smb.sourceMapURL = sourceMapOutput.sourceMapURL
	
	if smb.options.SourceMapInputFilename != "" {
		smb.sourceMapInputFilename = sourceMapOutput.NormalizeFilename(smb.options.SourceMapInputFilename)
	}
	
	if smb.options.SourceMapBasepath != "" && smb.sourceMapURL != "" {
		smb.sourceMapURL = sourceMapOutput.RemoveBasepath(smb.sourceMapURL)
	}
	
	return css + smb.getCSSAppendage(environment)
}

func (smb *SourceMapBuilder) getCSSAppendage(environment SourceMapEnvironment) string {
	sourceMapURL := smb.sourceMapURL
	
	if smb.options.SourceMapFileInline {
		if smb.sourceMap == "" {
			return ""
		}
		sourceMapURL = "data:application/json;base64," + environment.EncodeBase64(smb.sourceMap)
	}

	if smb.options.DisableSourcemapAnnotation {
		return ""
	}

	if sourceMapURL != "" {
		return "/*# sourceMappingURL=" + sourceMapURL + " */"
	}
	return ""
}

func (smb *SourceMapBuilder) GetExternalSourceMap() string {
	return smb.sourceMap
}

func (smb *SourceMapBuilder) SetExternalSourceMap(sourceMap string) {
	smb.sourceMap = sourceMap
}

func (smb *SourceMapBuilder) IsInline() bool {
	return smb.options.SourceMapFileInline
}

func (smb *SourceMapBuilder) GetSourceMapURL() string {
	return smb.sourceMapURL
}

func (smb *SourceMapBuilder) GetOutputFilename() string {
	return smb.options.SourceMapOutputFilename
}

func (smb *SourceMapBuilder) GetInputFilename() string {
	return smb.sourceMapInputFilename
}

// defaultSourceMapGenerator provides a default implementation for testing
type defaultSourceMapGenerator struct {
	mappings       []SourceMapMapping
	sourceContents map[string]string
}

func (d *defaultSourceMapGenerator) AddMapping(mapping SourceMapMapping) {
	d.mappings = append(d.mappings, mapping)
}

func (d *defaultSourceMapGenerator) SetSourceContent(source, content string) {
	d.sourceContents[source] = content
}

func (d *defaultSourceMapGenerator) ToJSON() map[string]any {
	return map[string]any{
		"version":  3,
		"sources":  []string{},
		"mappings": "",
	}
}