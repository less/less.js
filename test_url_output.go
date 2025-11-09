package main

import (
	"fmt"
	"io/ioutil"
	"path/filepath"

	less "github.com/toakleaf/less.go/packages/less/src/less/less_go"
)

func main() {
	// Read the input file
	lessFile := "/home/user/less.go/packages/test-data/less/static-urls/urls.less"
	lessContent, err := ioutil.ReadFile(lessFile)
	if err != nil {
		panic(err)
	}

	// Set up options for static-urls test
	options := map[string]any{
		"math":         "strict",
		"relativeUrls": false,
		"rootpath":     "folder (1)/",
		"filename":     lessFile,
		"paths":        []string{filepath.Dir(lessFile)},
	}

	// Create Less factory
	factory := less.Factory(nil, nil)

	// Get render function
	renderFunc := factory["render"].(func(string, ...any) any)

	// Compile
	result := renderFunc(string(lessContent), options)

	// Extract CSS from result
	var css string
	switch v := result.(type) {
	case string:
		css = v
	case map[string]any:
		if cssVal, ok := v["css"]; ok {
			css = cssVal.(string)
		}
	}

	// Print output
	fmt.Println(css)
}
