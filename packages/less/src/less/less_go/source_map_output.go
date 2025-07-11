package less_go

import (
	"encoding/json"
	"strings"
)

type SourceMapOutput struct {
	css                            []string
	rootNode                       SourceMapNode
	contentsMap                    map[string]string
	contentsIgnoredCharsMap        map[string]int
	sourceMapFilename              string
	outputFilename                 string
	sourceMapURL                   string
	sourceMapBasepath              string
	sourceMapRootpath              string
	outputSourceFiles              bool
	sourceMapGeneratorConstructor  func() SourceMapGenerator
	lineNumber                     int
	column                         int
	sourceMapGenerator             SourceMapGenerator
	SourceMap                      string
}

type SourceMapGenerator interface {
	AddMapping(mapping SourceMapMapping)
	SetSourceContent(source, content string)
	ToJSON() map[string]any
}

type SourceMapMapping struct {
	Generated SourceMapPosition `json:"generated"`
	Original  SourceMapPosition `json:"original"`
	Source    string           `json:"source"`
}

type SourceMapPosition struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type SourceMapNode interface {
	GenCSSSourceMap(context map[string]any, output *SourceMapOutput)
}


type SourceMapOutputOptions struct {
	RootNode                       SourceMapNode
	ContentsMap                    map[string]string
	ContentsIgnoredCharsMap        map[string]int
	SourceMapFilename              string
	OutputFilename                 string
	SourceMapURL                   string
	SourceMapBasepath              string
	SourceMapRootpath              string
	OutputSourceFiles              bool
	SourceMapGeneratorConstructor  func() SourceMapGenerator
}

func NewSourceMapOutput(options SourceMapOutputOptions) *SourceMapOutput {
	smo := &SourceMapOutput{
		css:                     make([]string, 0),
		rootNode:               options.RootNode,
		contentsMap:            options.ContentsMap,
		contentsIgnoredCharsMap: options.ContentsIgnoredCharsMap,
		outputFilename:         options.OutputFilename,
		outputSourceFiles:      options.OutputSourceFiles,
		sourceMapGeneratorConstructor: options.SourceMapGeneratorConstructor,
		lineNumber:             0,
		column:                 0,
	}

	if options.SourceMapFilename != "" {
		smo.sourceMapFilename = strings.ReplaceAll(options.SourceMapFilename, "\\", "/")
	}

	smo.sourceMapURL = options.SourceMapURL

	if options.SourceMapBasepath != "" {
		smo.sourceMapBasepath = strings.ReplaceAll(options.SourceMapBasepath, "\\", "/")
	}

	if options.SourceMapRootpath != "" {
		smo.sourceMapRootpath = strings.ReplaceAll(options.SourceMapRootpath, "\\", "/")
		if !strings.HasSuffix(smo.sourceMapRootpath, "/") {
			smo.sourceMapRootpath += "/"
		}
	} else {
		smo.sourceMapRootpath = ""
	}

	return smo
}

func (smo *SourceMapOutput) RemoveBasepath(path string) string {
	if smo.sourceMapBasepath != "" && strings.HasPrefix(path, smo.sourceMapBasepath) {
		path = path[len(smo.sourceMapBasepath):]
		if len(path) > 0 && (path[0] == '\\' || path[0] == '/') {
			path = path[1:]
		}
	}
	return path
}

func (smo *SourceMapOutput) NormalizeFilename(filename string) string {
	filename = strings.ReplaceAll(filename, "\\", "/")
	filename = smo.RemoveBasepath(filename)
	return smo.sourceMapRootpath + filename
}

func (smo *SourceMapOutput) Add(chunk string, fileInfo *FileInfo, index int, mapLines bool) {
	// ignore adding empty strings
	if chunk == "" {
		return
	}

	var lines, sourceLines []string
	var columns, sourceColumns string

	if fileInfo != nil && fileInfo.Filename != "" {
		inputSource, exists := smo.contentsMap[fileInfo.Filename]

		// remove vars/banner added to the top of the file
		if ignoredChars, hasIgnored := smo.contentsIgnoredCharsMap[fileInfo.Filename]; hasIgnored {
			// adjust the index
			index -= ignoredChars
			if index < 0 {
				index = 0
			}
			// adjust the source
			if exists && len(inputSource) > ignoredChars {
				inputSource = inputSource[ignoredChars:]
			}
		}

		// ignore empty content, or failsafe if contents map is incorrect
		if !exists {
			smo.css = append(smo.css, chunk)
			return
		}

		if len(inputSource) > index {
			inputSource = inputSource[:index]
		}
		sourceLines = strings.Split(inputSource, "\n")
		sourceColumns = sourceLines[len(sourceLines)-1]
	}

	lines = strings.Split(chunk, "\n")
	columns = lines[len(lines)-1]

	if fileInfo != nil && fileInfo.Filename != "" {
		if !mapLines {
			mapping := SourceMapMapping{
				Generated: SourceMapPosition{Line: smo.lineNumber + 1, Column: smo.column},
				Original:  SourceMapPosition{Line: len(sourceLines), Column: len(sourceColumns)},
				Source:    smo.NormalizeFilename(fileInfo.Filename),
			}
			smo.sourceMapGenerator.AddMapping(mapping)
		} else {
			for i := 0; i < len(lines); i++ {
				var genColumn, origColumn int
				if i == 0 {
					genColumn = smo.column
					origColumn = len(sourceColumns)
				} else {
					genColumn = 0
					origColumn = 0
				}
				mapping := SourceMapMapping{
					Generated: SourceMapPosition{Line: smo.lineNumber + i + 1, Column: genColumn},
					Original:  SourceMapPosition{Line: len(sourceLines) + i, Column: origColumn},
					Source:    smo.NormalizeFilename(fileInfo.Filename),
				}
				smo.sourceMapGenerator.AddMapping(mapping)
			}
		}
	}

	if len(lines) == 1 {
		smo.column += len(columns)
	} else {
		smo.lineNumber += len(lines) - 1
		smo.column = len(columns)
	}

	smo.css = append(smo.css, chunk)
}

func (smo *SourceMapOutput) IsEmpty() bool {
	return len(smo.css) == 0
}

func (smo *SourceMapOutput) ToCSS(context map[string]any) string {
	smo.sourceMapGenerator = smo.sourceMapGeneratorConstructor()

	if smo.outputSourceFiles {
		for filename, content := range smo.contentsMap {
			source := content
			if ignoredChars, hasIgnored := smo.contentsIgnoredCharsMap[filename]; hasIgnored {
				if len(source) > ignoredChars {
					source = source[ignoredChars:]
				}
			}
			smo.sourceMapGenerator.SetSourceContent(smo.NormalizeFilename(filename), source)
		}
	}

	smo.rootNode.GenCSSSourceMap(context, smo)

	if len(smo.css) > 0 {
		var sourceMapURL string
		sourceMapJSON := smo.sourceMapGenerator.ToJSON()
		sourceMapContent, _ := json.Marshal(sourceMapJSON)

		if smo.sourceMapURL != "" {
			sourceMapURL = smo.sourceMapURL
		} else if smo.sourceMapFilename != "" {
			sourceMapURL = smo.sourceMapFilename
		}
		smo.sourceMapURL = sourceMapURL
		smo.SourceMap = string(sourceMapContent)
	}

	return strings.Join(smo.css, "")
}