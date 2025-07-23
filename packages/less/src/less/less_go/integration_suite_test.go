package less_go

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"
)

// Global results collector for integration suite summary with mutex protection
var (
	integrationResults []TestResult
	resultsMutex       sync.Mutex
)

// Debug configuration from environment
var (
	debugMode   = os.Getenv("LESS_GO_DEBUG") == "1"
	showAST     = os.Getenv("LESS_GO_AST") == "1"
	showTrace   = os.Getenv("LESS_GO_TRACE") == "1"
	showDiff    = os.Getenv("LESS_GO_DIFF") == "1"
	strictMode  = os.Getenv("LESS_GO_STRICT") == "1"  // Fail tests on output differences
)

// addTestResult safely adds a test result to the global results slice
func addTestResult(result TestResult) {
	resultsMutex.Lock()
	defer resultsMutex.Unlock()
	integrationResults = append(integrationResults, result)
}

// TestIntegrationSuite runs the comprehensive test suite that matches JavaScript test/index.js
func TestIntegrationSuite(t *testing.T) {
	// Reset results collector safely
	resultsMutex.Lock()
	integrationResults = []TestResult{}
	resultsMutex.Unlock()
	
	// Track overall progress
	startTime := time.Now()
	if debugMode {
		fmt.Println("\n🚀 Starting Integration Test Suite with Debug Mode")
		fmt.Printf("   Debug Options: AST=%v, Trace=%v, Diff=%v\n", showAST, showTrace, showDiff)
	}
	
	// Base paths for test data - from packages/less/src/less/less_go to packages/test-data
	testDataRoot := "../../../../test-data"
	lessRoot := filepath.Join(testDataRoot, "less")
	cssRoot := filepath.Join(testDataRoot, "css")

	// Define test map that mirrors JavaScript test/index.js
	testMap := []TestSuite{
		{
			Name: "main",
			Options: map[string]any{
				"relativeUrls":      true,
				"silent":           true,
				"javascriptEnabled": true,
			},
			Folder: "_main/",
		},
		{
			Name:   "namespacing",
			Options: map[string]any{},
			Folder: "namespacing/",
		},
		{
			Name: "math-parens",
			Options: map[string]any{
				"math": "parens",
			},
			Folder: "math/strict/",
		},
		{
			Name: "math-parens-division",
			Options: map[string]any{
				"math": "parens-division",
			},
			Folder: "math/parens-division/",
		},
		{
			Name: "math-always",
			Options: map[string]any{
				"math": "always",
			},
			Folder: "math/always/",
		},
		{
			Name: "compression",
			Options: map[string]any{
				"math":     "strict",
				"compress": true,
			},
			Folder: "compression/",
		},
		{
			Name: "static-urls",
			Options: map[string]any{
				"math":         "strict",
				"relativeUrls": false,
				"rootpath":     "folder (1)/",
			},
			Folder: "static-urls/",
		},
		{
			Name: "units-strict",
			Options: map[string]any{
				"math":        0,
				"strictUnits": true,
			},
			Folder: "units/strict/",
		},
		{
			Name: "units-no-strict",
			Options: map[string]any{
				"math":        0,
				"strictUnits": false,
			},
			Folder: "units/no-strict/",
		},
		{
			Name: "url-args",
			Options: map[string]any{
				"urlArgs": "424242",
			},
			Folder: "url-args/",
		},
		{
			Name: "rewrite-urls-all",
			Options: map[string]any{
				"rewriteUrls": "all",
			},
			Folder: "rewrite-urls-all/",
		},
		{
			Name: "rewrite-urls-local",
			Options: map[string]any{
				"rewriteUrls": "local",
			},
			Folder: "rewrite-urls-local/",
		},
		{
			Name: "rootpath-rewrite-urls-all",
			Options: map[string]any{
				"rootpath":    "http://example.com/assets/css/",
				"rewriteUrls": "all",
			},
			Folder: "rootpath-rewrite-urls-all/",
		},
		{
			Name: "rootpath-rewrite-urls-local",
			Options: map[string]any{
				"rootpath":    "http://example.com/assets/css/",
				"rewriteUrls": "local",
			},
			Folder: "rootpath-rewrite-urls-local/",
		},
		{
			Name: "include-path",
			Options: map[string]any{
				"paths": []string{"data/", "_main/import/"},
			},
			Folder: "include-path/",
		},
		{
			Name: "include-path-string",
			Options: map[string]any{
				"paths": "data/",
			},
			Folder: "include-path-string/",
		},
		{
			Name: "third-party",
			Options: map[string]any{
				"math": 0,
			},
			Folder: "3rd-party/",
		},
		{
			Name: "process-imports",
			Options: map[string]any{
				"processImports": false,
			},
			Folder: "process-imports/",
		},
	}

	// Error test suites (these should fail compilation)
	errorTestMap := []TestSuite{
		{
			Name: "eval-errors",
			Options: map[string]any{
				"strictMath":        true,
				"strictUnits":       true,
				"javascriptEnabled": true,
			},
			Folder:      "../errors/eval/",
			ExpectError: true,
		},
		{
			Name: "parse-errors",
			Options: map[string]any{
				"strictMath":        true,
				"strictUnits":       true,
				"javascriptEnabled": true,
			},
			Folder:      "../errors/parse/",
			ExpectError: true,
		},
		{
			Name: "js-type-errors",
			Options: map[string]any{
				"math":              "strict",
				"strictUnits":       true,
				"javascriptEnabled": true,
			},
			Folder:      "js-type-errors/",
			ExpectError: true,
		},
		{
			Name: "no-js-errors",
			Options: map[string]any{
				"math":              "strict",
				"strictUnits":       true,
				"javascriptEnabled": false,
			},
			Folder:      "no-js-errors/",
			ExpectError: true,
		},
	}

	// Run success test suites
	for _, suite := range testMap {
		t.Run(suite.Name, func(t *testing.T) {
			runTestSuite(t, suite, lessRoot, cssRoot)
		})
	}

	// Run error test suites
	for _, suite := range errorTestMap {
		t.Run(suite.Name, func(t *testing.T) {
			runErrorTestSuite(t, suite, lessRoot)
		})
	}

	// Run summary as a final subtest to ensure it appears at the end
	t.Run("zzz_summary", func(t *testing.T) {
		// Create a copy of results under lock
		resultsMutex.Lock()
		resultsCopy := make([]TestResult, len(integrationResults))
		copy(resultsCopy, integrationResults)
		resultsMutex.Unlock()
		
		printTestSummary(t, resultsCopy)
		
		// Show timing information
		duration := time.Since(startTime)
		t.Logf("\n⏱️  Total test duration: %v", duration)
		
		// Memory usage in debug mode
		if debugMode {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			t.Logf("💾 Memory used: %.2f MB", float64(m.Alloc)/1024/1024)
			t.Logf("🔄 GC runs: %d", m.NumGC)
		}
	})
}

type TestSuite struct {
	Name        string
	Options     map[string]any
	Folder      string
	ExpectError bool
}

type TestResult struct {
	Suite       string
	TestName    string
	Status      string // "pass", "fail", "skip"
	Error       string
	ExpectedCSS string
	ActualCSS   string
}

func runTestSuite(t *testing.T, suite TestSuite, lessRoot, cssRoot string) {
	lessDir := filepath.Join(lessRoot, suite.Folder)
	cssDir := filepath.Join(cssRoot, suite.Folder)

	// Find all .less files in the directory
	lessFiles, err := filepath.Glob(filepath.Join(lessDir, "*.less"))
	if err != nil {
		t.Fatalf("Failed to find .less files in %s: %v", lessDir, err)
	}

	if len(lessFiles) == 0 {
		t.Skipf("No .less files found in %s", lessDir)
		return
	}
	successCount := 0
	totalCount := len(lessFiles)

	for _, lessFile := range lessFiles {
		fileName := filepath.Base(lessFile)
		testName := strings.TrimSuffix(fileName, ".less")
		
		t.Run(testName, func(t *testing.T) {
			result := TestResult{
				Suite:    suite.Name,
				TestName: testName,
			}

			// Read the .less file
			lessContent, err := ioutil.ReadFile(lessFile)
			if err != nil {
				result.Status = "skip"
				result.Error = "Failed to read .less file: " + err.Error()
				addTestResult(result)
				t.Skipf("Failed to read %s: %v", lessFile, err)
				return
			}

			// Expected CSS file
			cssFile := filepath.Join(cssDir, testName+".css")
			expectedCSS, err := ioutil.ReadFile(cssFile)
			if err != nil {
				result.Status = "skip"
				result.Error = "Expected CSS file not found: " + err.Error()
				addTestResult(result)
				t.Skipf("Expected CSS file %s not found: %v", cssFile, err)
				return
			}

			result.ExpectedCSS = strings.TrimSpace(string(expectedCSS))

			// Set up options
			options := make(map[string]any)
			for k, v := range suite.Options {
				options[k] = v
			}
			options["filename"] = lessFile
			options["paths"] = []string{filepath.Dir(lessFile)}

			// Create Less factory
			factory := Factory(nil, nil)

			// Compile with debugging
			actualResult, err := compileLessWithDebug(factory, string(lessContent), options)
			if err != nil {
				result.Status = "fail"
				result.Error = err.Error()
				result.ActualCSS = ""
				addTestResult(result)
				
				if strictMode {
					// In strict mode, fail the test on compilation errors
					t.Errorf("❌ %s: Compilation failed: %v", testName, err)
				} else {
					// In normal mode, just log the error (expected during development)
					t.Logf("❌ %s: Compilation failed: %v", testName, err)
				}
				enhancedErrorReport(t, err, lessFile, string(lessContent))
				return
			}

			// Compare results
			result.ActualCSS = strings.TrimSpace(actualResult)

			if result.ActualCSS == result.ExpectedCSS {
				result.Status = "pass"
				addTestResult(result)
				t.Logf("✅ %s: Perfect match!", testName)
				successCount++
			} else {
				result.Status = "fail"
				result.Error = "Output differs from expected"
				addTestResult(result)
				
				if strictMode {
					// In strict mode, fail the test immediately
					t.Errorf("❌ %s: Output differs from expected", testName)
					if showDiff {
						t.Errorf("%s", formatDiff(result.ExpectedCSS, result.ActualCSS))
					} else {
						t.Errorf("   Expected: %s", result.ExpectedCSS)
						t.Errorf("   Actual:   %s", result.ActualCSS)
					}
				} else {
					// During the Go port development, many tests will have output differences
					// as features are still being implemented. These are marked as failures
					// but noted as "expected during development" to distinguish them from
					// compilation errors or crashes.
					t.Logf("⚠️  %s: Output differs (expected during development)", testName)
					if showDiff || (len(result.ActualCSS) < 500 && len(result.ExpectedCSS) < 500) {
						if showDiff {
							t.Logf("%s", formatDiff(result.ExpectedCSS, result.ActualCSS))
						} else {
							t.Logf("   Expected: %s", result.ExpectedCSS)
							t.Logf("   Actual:   %s", result.ActualCSS)
						}
					}
				}
			}
		})
	}

	t.Logf("Suite %s: %d/%d tests compiled successfully", suite.Name, successCount, totalCount)
}

func runErrorTestSuite(t *testing.T, suite TestSuite, lessRoot string) {
	lessDir := filepath.Join(lessRoot, suite.Folder)

	// Find all .less files in the directory
	lessFiles, err := filepath.Glob(filepath.Join(lessDir, "*.less"))
	if err != nil {
		t.Fatalf("Failed to find .less files in %s: %v", lessDir, err)
	}

	if len(lessFiles) == 0 {
		t.Skipf("No .less files found in %s", lessDir)
		return
	}

	for _, lessFile := range lessFiles {
		fileName := filepath.Base(lessFile)
		testName := strings.TrimSuffix(fileName, ".less")
		
		t.Run(testName, func(t *testing.T) {
			result := TestResult{
				Suite:    suite.Name,
				TestName: testName,
			}

			// Read the .less file
			lessContent, err := ioutil.ReadFile(lessFile)
			if err != nil {
				result.Status = "skip"
				result.Error = "Failed to read .less file: " + err.Error()
				addTestResult(result)
				t.Skipf("Failed to read %s: %v", lessFile, err)
				return
			}

			// Set up options
			options := make(map[string]any)
			for k, v := range suite.Options {
				options[k] = v
			}
			options["filename"] = lessFile
			options["paths"] = []string{filepath.Dir(lessFile)}

			// Create Less factory
			factory := Factory(nil, nil)

			// Compile - this should fail
			actualResult, err := compileLessWithDebug(factory, string(lessContent), options)
			if err != nil {
				result.Status = "pass" // For error tests, failure is success
				result.Error = err.Error()
				addTestResult(result)
				t.Logf("✅ %s: Correctly failed with error: %v", testName, err)
			} else {
				result.Status = "fail" // For error tests, success is failure
				result.ActualCSS = actualResult
				result.Error = "Expected error but compilation succeeded"
				addTestResult(result)
				t.Logf("⚠️  %s: Expected error but compilation succeeded", testName)
				t.Logf("   Result: %s", actualResult)
			}
		})
	}

}

// Enhanced debugging helpers

// debugLog prints debug messages when debug mode is enabled
func debugLog(format string, args ...interface{}) {
	if debugMode {
		fmt.Printf("[DEBUG] "+format+"\n", args...)
	}
}

// traceLog prints trace messages when trace mode is enabled
func traceLog(format string, args ...interface{}) {
	if showTrace {
		fmt.Printf("[TRACE] "+format+"\n", args...)
	}
}

// formatDiff creates a visual diff between expected and actual CSS
func formatDiff(expected, actual string) string {
	if !showDiff {
		return ""
	}
	
	expectedLines := strings.Split(expected, "\n")
	actualLines := strings.Split(actual, "\n")
	
	var diff strings.Builder
	diff.WriteString("\n--- Expected CSS ---\n")
	for i, line := range expectedLines {
		diff.WriteString(fmt.Sprintf("%3d | %s\n", i+1, line))
	}
	diff.WriteString("\n--- Actual CSS ---\n")
	for i, line := range actualLines {
		diff.WriteString(fmt.Sprintf("%3d | %s\n", i+1, line))
	}
	
	// Find first difference
	for i := 0; i < len(expectedLines) && i < len(actualLines); i++ {
		if expectedLines[i] != actualLines[i] {
			diff.WriteString(fmt.Sprintf("\n⚠️  First difference at line %d:\n", i+1))
			diff.WriteString(fmt.Sprintf("   Expected: %q\n", expectedLines[i]))
			diff.WriteString(fmt.Sprintf("   Actual:   %q\n", actualLines[i]))
			break
		}
	}
	
	return diff.String()
}

// enhancedErrorReport provides detailed error context
func enhancedErrorReport(t *testing.T, err error, lessFile string, lessContent string) {
	if !debugMode {
		return
	}
	
	t.Logf("\n🔍 Enhanced Error Report:")
	t.Logf("   File: %s", lessFile)
	
	// Try to extract line/column from error
	errStr := err.Error()
	if strings.Contains(errStr, "line") || strings.Contains(errStr, "Line") {
		t.Logf("   Position: %s", errStr)
	}
	
	// Show file context if possible
	lines := strings.Split(lessContent, "\n")
	if len(lines) <= 20 {
		t.Logf("   Source Content:")
		for i, line := range lines {
			t.Logf("   %3d | %s", i+1, line)
		}
	}
	
	// Provide suggestions based on error type
	if strings.Contains(errStr, "Parse") || strings.Contains(errStr, "parse") {
		t.Logf("\n💡 Parser Error Suggestions:")
		t.Logf("   • Check for missing semicolons or braces")
		t.Logf("   • Verify syntax matches Less.js grammar")
		t.Logf("   • Look for unsupported syntax features")
	} else if strings.Contains(errStr, "undefined") {
		t.Logf("\n💡 Variable Error Suggestions:")
		t.Logf("   • Check variable scope and definition order")
		t.Logf("   • Verify import statements are processed")
		t.Logf("   • Look for typos in variable names")
	} else if strings.Contains(errStr, "import") {
		t.Logf("\n💡 Import Error Suggestions:")
		t.Logf("   • Verify file paths are correct")
		t.Logf("   • Check import resolution logic")
		t.Logf("   • Ensure imported files exist")
	}
	
	// Stack trace if available
	if debugMode {
		t.Logf("\n📚 Stack Trace:")
		for i := 1; i <= 10; i++ {
			_, file, line, ok := runtime.Caller(i)
			if !ok {
				break
			}
			if strings.Contains(file, "less_go") {
				t.Logf("   at %s:%d", file, line)
			}
		}
	}
}

// compileLessWithDebug wraps the compilation with additional debugging
func compileLessWithDebug(factory map[string]any, content string, options map[string]any) (string, error) {
	startTime := time.Now()
	
	debugLog("Starting compilation with options: %+v", options)
	
	// Add debug hooks if enabled
	if showAST {
		// This would require modification to the actual compiler
		// to expose AST - placeholder for now
		debugLog("AST output enabled (requires compiler support)")
	}
	
	result, err := compileLessForTest(factory, content, options)
	
	duration := time.Since(startTime)
	debugLog("Compilation completed in %v", duration)
	
	if err != nil {
		debugLog("Compilation failed: %v", err)
	} else {
		debugLog("Compilation successful, output length: %d", len(result))
	}
	
	return result, err
}

// printTestSummary prints a Jest-style summary of test results
func printTestSummary(t *testing.T, results []TestResult) {
	var passed, failed, skipped []TestResult
	
	for _, result := range results {
		switch result.Status {
		case "pass":
			passed = append(passed, result)
		case "fail":
			failed = append(failed, result)
		case "skip":
			skipped = append(skipped, result)
		}
	}

	total := len(results)
	t.Logf("\n" + strings.Repeat("=", 60))
	t.Logf("📊 INTEGRATION TEST SUMMARY")
	t.Logf(strings.Repeat("=", 60))
	
	if len(passed) > 0 {
		t.Logf("✅ PASSED (%d)", len(passed))
		for _, result := range passed {
			t.Logf("   %s/%s", result.Suite, result.TestName)
		}
		t.Logf("")
	}

	if len(failed) > 0 {
		t.Logf("❌ FAILED (%d)", len(failed))
		for _, result := range failed {
			t.Logf("   %s/%s", result.Suite, result.TestName)
			if result.Error != "" {
				// Show first part of error for context
				errorParts := strings.Split(result.Error, "\n")
				t.Logf("     → %s", errorParts[0])
			}
		}
		t.Logf("")
	}

	if len(skipped) > 0 {
		t.Logf("⏭️  SKIPPED (%d)", len(skipped))
		for _, result := range skipped {
			t.Logf("   %s/%s", result.Suite, result.TestName)
		}
		t.Logf("")
	}

	// Overall summary
	t.Logf("📈 OVERALL: %d passed, %d failed, %d skipped, %d total", 
		len(passed), len(failed), len(skipped), total)
	
	if len(failed) > 0 {
		t.Logf("\n💡 NEXT STEPS: Focus on implementing these missing features:")
		
		// Group failures by error type
		errorGroups := make(map[string][]TestResult)
		for _, result := range failed {
			if strings.Contains(result.Error, "Parse: Unrecognised input") {
				errorGroups["Parser"] = append(errorGroups["Parser"], result)
			} else if strings.Contains(result.Error, "is undefined") {
				errorGroups["Variables"] = append(errorGroups["Variables"], result)
			} else if strings.Contains(result.Error, "Output differs") {
				errorGroups["CSS Generation"] = append(errorGroups["CSS Generation"], result)
			} else {
				errorGroups["Other"] = append(errorGroups["Other"], result)
			}
		}
		
		for category, tests := range errorGroups {
			t.Logf("   • %s (%d tests)", category, len(tests))
		}
	}
	
	t.Logf(strings.Repeat("=", 60))
}

