package main

import (
	"fmt"
	"github.com/toakleaf/less.go/packages/less/src/less/less_go"
)

func main() {
	// Test rgba with hex colors
	inputs := []string{
		`test1 { color: rgba(#55FF5599); }`,
		`test2 { color: rgba(#5F59); }`,
		`test3 { color: rgba(85, 255, 85, 0.6); }`,
		`test4 { color: fade(#5F59, 10%); }`,
		`test5 { color: color('#55FF5599'); }`,
	}

	factory := less_go.Factory(nil, nil)
	renderFunc, _ := factory["render"].(func(string, ...any) any)
	
	for i, input := range inputs {
		fmt.Printf("=== Test %d ===\n", i+1)
		fmt.Printf("Input: %s\n", input)
		
		result := renderFunc(input, map[string]any{"filename": "test.less"})
		
		switch v := result.(type) {
		case string:
			fmt.Printf("Output: %s\n", v)
		case map[string]any:
			if css, ok := v["css"].(string); ok {
				fmt.Printf("Output: %s\n", css)
			} else if err, ok := v["error"]; ok {
				fmt.Printf("Error: %v\n", err)
			}
		}
		fmt.Println()
	}
}