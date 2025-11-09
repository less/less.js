package main

import (
	"fmt"
	"os"
	less "github.com/toakleaf/less.go/packages/less/src/less/less_go"
)

func main() {
	// Read input file
	content, err := os.ReadFile("packages/test-data/less/_main/functions.less")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
		os.Exit(1)
	}

	// Create Less factory
	factory := less.Factory(nil, nil)

	// Compile
	options := map[string]any{
		"relativeUrls":      true,
		"silent":            true,
		"javascriptEnabled": true,
		"filename":          "packages/test-data/less/_main/functions.less",
	}

	fmt.Fprintf(os.Stderr, "Factory: %+v\n", factory)
	renderFunc, ok := factory["render"].(func(string, ...any) any)
	if !ok {
		fmt.Fprintf(os.Stderr, "No render function found in factory\n")
		os.Exit(1)
	}
	result := renderFunc(string(content), options)

	fmt.Fprintf(os.Stderr, "Result type: %T\n", result)

	if resultMap, ok := result.(map[string]any); ok {
		if errorMsg, hasError := resultMap["error"]; hasError {
			fmt.Fprintf(os.Stderr, "Error compiling: %v\n", errorMsg)
			os.Exit(1)
		}
		if css, hasCSS := resultMap["css"]; hasCSS {
			if cssStr, ok := css.(string); ok {
				fmt.Print(cssStr)
			}
		}
	} else {
		fmt.Fprintf(os.Stderr, "Result is not a map: %v\n", result)
	}
}
