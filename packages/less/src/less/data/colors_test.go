package data

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestColorsMatchJS(t *testing.T) {
	// Read the JavaScript file
	jsPath := filepath.Join("..", "..", "less", "data", "colors.js")
	jsContent, err := os.ReadFile(jsPath)
	if err != nil {
		t.Fatalf("Failed to read colors.js: %v", err)
	}

	// Extract the object content from the JavaScript file
	// Remove "export default" and the surrounding curly braces
	content := string(jsContent)
	content = strings.TrimPrefix(content, "export default")
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "{")
	content = strings.TrimSuffix(content, "};")
	content = strings.TrimSpace(content)

	// Parse the JavaScript object into a map
	jsColors := make(map[string]string)
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Remove trailing comma if present
		line = strings.TrimSuffix(line, ",")
		
		// Split on colon and clean up
		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			t.Errorf("Invalid line format: %s", line)
			continue
		}
		
		key := strings.Trim(strings.TrimSpace(parts[0]), "'")
		value := strings.Trim(strings.TrimSpace(parts[1]), "'")
		
		jsColors[key] = value
	}

	// Compare with Go colors
	for jsKey, jsValue := range jsColors {
		goValue, exists := Colors[jsKey]
		if !exists {
			t.Errorf("Color %s exists in JS but not in Go", jsKey)
			continue
		}
		if goValue != jsValue {
			t.Errorf("Color %s has different values: JS=%s, Go=%s", jsKey, jsValue, goValue)
		}
	}

	// Check for colors in Go that don't exist in JS
	for goKey := range Colors {
		if _, exists := jsColors[goKey]; !exists {
			t.Errorf("Color %s exists in Go but not in JS", goKey)
		}
	}
} 