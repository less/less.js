package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	less_go "github.com/toakleaf/less.go/packages/less/src/less/less_go"
)

const version = "4.2.2-go"

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "-v", "--version":
		fmt.Printf("lessc-go %s (Less Compiler Go Port)\n", version)
		os.Exit(0)
	case "-h", "--help":
		printUsage()
		os.Exit(0)
	}

	inputFile := os.Args[1]
	var outputFile string
	if len(os.Args) > 2 {
		outputFile = os.Args[2]
	}

	// Read input file
	inputContent, err := ioutil.ReadFile(inputFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file %s: %v\n", inputFile, err)
		os.Exit(1)
	}

	// Get absolute path for proper context
	absPath, err := filepath.Abs(inputFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting absolute path: %v\n", err)
		os.Exit(1)
	}

	// Set up Less compilation options
	options := map[string]any{
		"filename": absPath,
		"paths":    []string{filepath.Dir(absPath)},
	}

	// Create Less factory instance
	factory := less_go.Factory(nil, nil)

	// Compile the Less content
	result, err := compileLess(factory, string(inputContent), options)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Compilation error: %v\n", err)
		os.Exit(1)
	}

	// Output result
	if outputFile != "" {
		err = ioutil.WriteFile(outputFile, []byte(result), 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error writing output file %s: %v\n", outputFile, err)
			os.Exit(1)
		}
		fmt.Printf("Compiled %s -> %s\n", inputFile, outputFile)
	} else {
		fmt.Print(result)
	}
}

func compileLess(factory map[string]any, input string, options map[string]any) (string, error) {
	// Try to use the render function
	if renderFunc, ok := factory["render"].(func(string, ...any) any); ok {
		result := renderFunc(input, options)

		// Handle RenderPromise results
		if promise, ok := result.(*less_go.RenderPromise); ok {
			promiseResult, err := promise.Await()
			if err != nil {
				return "", fmt.Errorf("render promise failed: %v", err)
			}
			result = promiseResult
		}

		// Check if we got a CSS string directly from ToCSS
		if css, ok := result.(string); ok {
			return fmt.Sprintf("/* Go Less Compiler v%s - Success! */\n%s", version, css), nil
		}

		// Check if we got a Ruleset that can generate CSS (fallback for old path)
		if ruleset, ok := result.(*less_go.Ruleset); ok {

			// Create a CSS output collector
			var cssOutput strings.Builder
			output := &less_go.CSSOutput{
				Add: func(chunk, fileInfo, index any) {
					if chunk != nil {
						cssOutput.WriteString(fmt.Sprintf("%v", chunk))
					}
				},
				IsEmpty: func() bool {
					return cssOutput.Len() == 0
				},
			}

			// Generate CSS
			context := map[string]any{
				"compress": false,
			}
			ruleset.GenCSS(context, output)

			css := cssOutput.String()
			return fmt.Sprintf("/* Go Less Compiler v%s - Success! */\n%s", version, css), nil
		}

		if resultMap, ok := result.(map[string]any); ok {
			if resultMap["type"] == "Render" {
				// Current implementation is still stubbed
				return fmt.Sprintf("/* Go Less Compiler v%s - Stub Implementation */\n/* Input was: %s */\n/* TODO: Implement actual CSS generation */\n%s\n",
					version,
					options["filename"],
					input), nil
			}

			// Check if it's a parsed result (Ruleset)
			if resultMap["type"] == "Ruleset" {
				// We got parsed AST! Now we need CSS generation
				return fmt.Sprintf("/* Go Less Compiler v%s - Parsed Successfully! */\n/* Got AST: %+v */\n/* TODO: Implement CSS generation from AST */\n",
					version,
					resultMap), nil
			}
		}

		return fmt.Sprintf("/* Go Less Compiler v%s - Error */\n/* Unexpected result type: %T */\n/* Result: %+v */", version, result, result), nil
	}

	return "", fmt.Errorf("render function not found or not callable")
}

func printUsage() {
	fmt.Printf(`lessc-go %s (Less Compiler Go Port)
Usage: lessc-go [option option=parameter ...] <source> [destination]

Example: lessc-go style.less style.css

Options:
  -h, --help               Print help (this message) and exit
  -v, --version            Print version number and exit

This is a development version of the Less compiler ported to Go.
Currently implements basic infrastructure with stubbed parsing.

For production use, please use the official lessc compiler:
  npm install -g less
  lessc style.less style.css

`, version)
}
