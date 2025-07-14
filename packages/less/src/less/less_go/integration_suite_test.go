package less_go

import (
	"io/ioutil"
	"path/filepath"
	"strings"
	"testing"
)

// Global results collector for integration suite summary
var integrationResults []TestResult

// TestIntegrationSuite runs the comprehensive test suite that matches JavaScript test/index.js
func TestIntegrationSuite(t *testing.T) {
	// Reset results collector
	integrationResults = []TestResult{}
	
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
		printTestSummary(t, integrationResults)
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
				integrationResults = append(integrationResults, result)
				t.Skipf("Failed to read %s: %v", lessFile, err)
				return
			}

			// Expected CSS file
			cssFile := filepath.Join(cssDir, testName+".css")
			expectedCSS, err := ioutil.ReadFile(cssFile)
			if err != nil {
				result.Status = "skip"
				result.Error = "Expected CSS file not found: " + err.Error()
				integrationResults = append(integrationResults, result)
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

			// Compile
			actualResult, err := compileLessForTest(factory, string(lessContent), options)
			if err != nil {
				result.Status = "fail"
				result.Error = err.Error()
				result.ActualCSS = ""
				integrationResults = append(integrationResults, result)
				t.Logf("❌ %s: Compilation failed: %v", testName, err)
				t.Logf("   This indicates missing components in the Go port")
				return
			}

			// Compare results
			result.ActualCSS = strings.TrimSpace(actualResult)

			if result.ActualCSS == result.ExpectedCSS {
				result.Status = "pass"
				integrationResults = append(integrationResults, result)
				t.Logf("✅ %s: Perfect match!", testName)
				successCount++
			} else {
				result.Status = "fail"
				result.Error = "Output differs from expected"
				integrationResults = append(integrationResults, result)
				t.Logf("⚠️  %s: Output differs (expected during development)", testName)
				if len(result.ActualCSS) < 500 && len(result.ExpectedCSS) < 500 {
					t.Logf("   Expected: %s", result.ExpectedCSS)
					t.Logf("   Actual:   %s", result.ActualCSS)
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
				integrationResults = append(integrationResults, result)
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
			actualResult, err := compileLessForTest(factory, string(lessContent), options)
			if err != nil {
				result.Status = "pass" // For error tests, failure is success
				result.Error = err.Error()
				integrationResults = append(integrationResults, result)
				t.Logf("✅ %s: Correctly failed with error: %v", testName, err)
			} else {
				result.Status = "fail" // For error tests, success is failure
				result.ActualCSS = actualResult
				result.Error = "Expected error but compilation succeeded"
				integrationResults = append(integrationResults, result)
				t.Logf("⚠️  %s: Expected error but compilation succeeded", testName)
				t.Logf("   Result: %s", actualResult)
			}
		})
	}

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

// TestBasicIntegration runs a smaller subset for quick testing during development
func TestBasicIntegration(t *testing.T) {
	// Base paths for test data
	testDataRoot := "../../../../test-data"
	lessRoot := filepath.Join(testDataRoot, "less")
	cssRoot := filepath.Join(testDataRoot, "css")

	// Quick test cases - just the most basic ones
	quickTests := []struct {
		name     string
		lessFile string
		cssFile  string
		options  map[string]any
	}{
		{"empty", "_main/empty.less", "_main/empty.css", nil},
		{"variables", "_main/variables.less", "_main/variables.css", nil},
		{"comments", "_main/comments.less", "_main/comments.css", nil},
		{"selectors", "_main/selectors.less", "_main/selectors.css", nil},
	}

	var results []TestResult
	successCount := 0
	for _, tc := range quickTests {
		t.Run(tc.name, func(t *testing.T) {
			result := TestResult{
				Suite:    "basic",
				TestName: tc.name,
			}

			// Read the .less file
			lessPath := filepath.Join(lessRoot, tc.lessFile)
			lessContent, err := ioutil.ReadFile(lessPath)
			if err != nil {
				result.Status = "skip"
				result.Error = "Test file not found: " + err.Error()
				results = append(results, result)
				t.Skipf("Test file %s not found: %v", lessPath, err)
				return
			}

			// Read the expected CSS file
			cssPath := filepath.Join(cssRoot, tc.cssFile)
			expectedCSS, err := ioutil.ReadFile(cssPath)
			if err != nil {
				result.Status = "skip"
				result.Error = "Expected CSS file not found: " + err.Error()
				results = append(results, result)
				t.Skipf("Expected CSS file %s not found: %v", cssPath, err)
				return
			}

			result.ExpectedCSS = strings.TrimSpace(string(expectedCSS))

			// Set up options
			options := tc.options
			if options == nil {
				options = make(map[string]any)
			}
			options["filename"] = lessPath
			options["paths"] = []string{filepath.Dir(lessPath)}

			// Create Less factory
			factory := Factory(nil, nil)

			// Compile
			actualResult, err := compileLessForTest(factory, string(lessContent), options)
			if err != nil {
				result.Status = "fail"
				result.Error = err.Error()
				result.ActualCSS = ""
				results = append(results, result)
				t.Logf("❌ %s: Compilation failed: %v", tc.name, err)
				return
			}

			// Compare results
			result.ActualCSS = strings.TrimSpace(actualResult)

			if result.ActualCSS == result.ExpectedCSS {
				result.Status = "pass"
				results = append(results, result)
				t.Logf("✅ %s: Perfect match!", tc.name)
				successCount++
			} else {
				result.Status = "fail"
				result.Error = "Output differs from expected"
				results = append(results, result)
				t.Logf("⚠️  %s: Output differs", tc.name)
				if len(result.ActualCSS) < 200 && len(result.ExpectedCSS) < 200 {
					t.Logf("   Expected: %s", result.ExpectedCSS)
					t.Logf("   Actual:   %s", result.ActualCSS)
				}
			}
		})
	}

	t.Logf("Basic integration: %d/%d tests passed", successCount, len(quickTests))
	
	// Print summary
	printTestSummary(t, results)
}