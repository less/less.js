//go:build enhanced
// +build enhanced

package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

// ANSI color codes
const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorBold   = "\033[1m"
)

// TestMode represents different test execution modes
type TestMode int

const (
	ModeNormal TestMode = iota
	ModeDebug
	ModeVerbose
	ModeTrace
)

// EnhancedTestRunner provides advanced debugging capabilities
type EnhancedTestRunner struct {
	mode         TestMode
	filter       string
	showDiff     bool
	showAST      bool
	showProgress bool
	captureTrace bool
	outputFile   string
	startTime    time.Time
	totalTests   int
	passedTests  int
	failedTests  int
	currentSuite string
	debugOutput  *os.File
}

func mainEnhanced() {
	runner := &EnhancedTestRunner{
		mode:         ModeNormal,
		showDiff:     true,
		showProgress: true,
		startTime:    time.Now(),
	}

	// Parse command line arguments
	args := os.Args[1:]
	testType := "integration" // Default to integration for filter command

	// Find the position of "--" separator if it exists
	dashDashIndex := -1
	for i, arg := range args {
		if arg == "--" {
			dashDashIndex = i
			break
		}
	}

	// Parse arguments, treating everything after "--" as filter
	parseArgs := args
	if dashDashIndex > 0 {
		parseArgs = args[:dashDashIndex]
		// Everything after "--" is treated as filter
		if dashDashIndex+1 < len(args) {
			runner.filter = args[dashDashIndex+1]
			testType = "integration" // Force integration when filtering
			fmt.Printf(colorYellow+"🎯 Filtering tests: %s"+colorReset+"\n", runner.filter)
		}
	}

	for i := 0; i < len(parseArgs); i++ {
		switch parseArgs[i] {
		case "unit":
			testType = "unit"
		case "integration":
			testType = "integration"
		case "summary":
			testType = "summary"
		case "--debug", "-d":
			runner.mode = ModeDebug
			fmt.Println(colorYellow + "🔍 Debug mode enabled" + colorReset)
		case "--verbose", "-v":
			runner.mode = ModeVerbose
			fmt.Println(colorYellow + "📢 Verbose mode enabled" + colorReset)
		case "--trace", "-t":
			runner.mode = ModeTrace
			runner.captureTrace = true
			fmt.Println(colorYellow + "🔬 Trace mode enabled" + colorReset)
		case "--filter", "-f":
			if i+1 < len(parseArgs) {
				runner.filter = parseArgs[i+1]
				i++
				fmt.Printf(colorYellow+"🎯 Filtering tests: %s"+colorReset+"\n", runner.filter)
			}
		case "--ast":
			runner.showAST = true
			fmt.Println(colorYellow + "🌳 AST output enabled" + colorReset)
		case "--no-diff":
			runner.showDiff = false
		case "--no-progress":
			runner.showProgress = false
		case "--output", "-o":
			if i+1 < len(parseArgs) {
				runner.outputFile = parseArgs[i+1]
				i++
			}
		case "--help", "-h":
			runner.printHelp()
			return
		}
	}

	// Set up debug output file if needed
	if runner.outputFile != "" {
		file, err := os.Create(runner.outputFile)
		if err != nil {
			fmt.Printf(colorRed+"Error creating output file: %v"+colorReset+"\n", err)
			os.Exit(1)
		}
		defer file.Close()
		runner.debugOutput = file
	}

	// Run the appropriate test type
	switch testType {
	case "unit":
		runner.runUnitTests()
	case "integration":
		runner.runIntegrationTests()
	case "summary":
		runner.runSummaryTests()
	default:
		fmt.Printf(colorRed+"Unknown test type: %s"+colorReset+"\n", testType)
		runner.printHelp()
		os.Exit(1)
	}
}

func (r *EnhancedTestRunner) printHelp() {
	fmt.Print(`Enhanced Less.go Test Runner

Usage: go run scripts/test_enhanced.go [test-type] [options]

Test Types:
  unit          Run unit tests
  integration   Run full integration test suite (default)
  summary       Run tests with summary output only

Options:
  --debug, -d       Enable debug mode with detailed error information
  --verbose, -v     Enable verbose output
  --trace, -t       Enable trace mode with execution tracking
  --filter, -f      Filter tests by pattern (e.g., --filter "color")
  --ast            Show AST output for debugging parser issues
  --no-diff        Disable diff output for CSS comparisons
  --no-progress    Disable progress bar
  --output, -o      Save debug output to file
  --help, -h       Show this help message

Examples:
  go run scripts/test_enhanced.go --debug
  go run scripts/test_enhanced.go --filter "variables"
  go run scripts/test_enhanced.go integration --trace --output debug.log

Debug Features:
  - Enhanced error messages with line/column information
  - Stack traces for panics and runtime errors
  - AST visualization for parser debugging
  - Execution tracing for visitor patterns
  - Smart diff output with syntax highlighting
  - Progress tracking with ETA
  - Test filtering by name/pattern
`)
}

func (r *EnhancedTestRunner) runUnitTests() {
	fmt.Println(colorBold + "\n🧪 Running Unit Tests..." + colorReset)

	// Change to the packages/less directory
	packageDir := filepath.Join("packages", "less")
	if err := os.Chdir(packageDir); err != nil {
		fmt.Printf(colorRed+"Error changing directory: %v"+colorReset+"\n", err)
		os.Exit(1)
	}

	// Build test command with enhanced options
	args := []string{"test", "./..."}

	if r.mode >= ModeVerbose {
		args = append(args, "-v")
	}

	if r.filter != "" {
		args = append(args, "-run", r.filter)
	}

	if r.mode >= ModeDebug {
		args = append(args, "-race")
	}

	// Set environment variables for enhanced debugging
	env := os.Environ()
	if r.mode >= ModeDebug {
		env = append(env, "LESS_GO_DEBUG=1")
	}
	if r.showAST {
		env = append(env, "LESS_GO_AST=1")
	}
	if r.captureTrace {
		env = append(env, "LESS_GO_TRACE=1")
	}

	cmd := exec.Command("go", args...)
	cmd.Env = env

	// Capture and process output
	r.runWithEnhancedOutput(cmd)
}

func getCurrentDir() string {
	dir, _ := os.Getwd()
	return dir
}

func (r *EnhancedTestRunner) runIntegrationTests() {
	fmt.Println(colorBold + "\n🔥 Running Full Integration Test Suite..." + colorReset)

	// Change to packages/less/src/less/less_go directory
	targetDir := filepath.Join("packages", "less", "src", "less", "less_go")
	if err := os.Chdir(targetDir); err != nil {
		// Try from packages/less if we're already there
		if err := os.Chdir(filepath.Join("src", "less", "less_go")); err != nil {
			fmt.Printf(colorRed+"Error changing to less_go directory: %v"+colorReset+"\n", err)
			fmt.Printf(colorRed+"Current directory: %s"+colorReset+"\n", getCurrentDir())
			os.Exit(1)
		}
	}

	r.runIntegrationTestsWithFilter("")
}

func (r *EnhancedTestRunner) runSummaryTests() {
	fmt.Println(colorBold + "\n📊 Running Tests (Summary Mode)..." + colorReset)

	// Change to packages/less/src/less/less_go directory
	targetDir := filepath.Join("packages", "less", "src", "less", "less_go")
	if err := os.Chdir(targetDir); err != nil {
		// Try from packages/less if we're already there
		if err := os.Chdir(filepath.Join("src", "less", "less_go")); err != nil {
			fmt.Printf(colorRed+"Error changing to less_go directory: %v"+colorReset+"\n", err)
			fmt.Printf(colorRed+"Current directory: %s"+colorReset+"\n", getCurrentDir())
			os.Exit(1)
		}
	}

	// Run integration tests and capture output
	cmd := exec.Command("go", "test", "-v", "-run", "TestIntegrationSuite", ".")

	output, err := cmd.CombinedOutput()
	if err != nil && cmd.ProcessState.ExitCode() != 1 {
		fmt.Printf(colorRed+"Error running tests: %v"+colorReset+"\n", err)
		os.Exit(1)
	}

	// Extract and display summary
	r.extractAndDisplaySummary(string(output))
}

func (r *EnhancedTestRunner) runIntegrationTestsWithFilter(testFilter string) {
	// Build test command - include all necessary files
	args := []string{"test", "-v", "."}

	if r.filter != "" {
		testFilter = r.filter
	}

	if testFilter != "" {
		// If filter doesn't contain /, assume it's a main test and prepend main/
		if !strings.Contains(testFilter, "/") {
			testFilter = "main/" + testFilter
		}
		args = append(args, "-run", fmt.Sprintf("TestIntegrationSuite/%s", testFilter))
	}

	// Set environment variables
	env := os.Environ()
	if r.mode >= ModeDebug {
		env = append(env, "LESS_GO_DEBUG=1")
	}
	if r.showAST {
		env = append(env, "LESS_GO_AST=1")
	}
	if r.captureTrace {
		env = append(env, "LESS_GO_TRACE=1")
	}
	if r.showDiff {
		env = append(env, "LESS_GO_DIFF=1")
	}

	// When running filtered tests, use strict mode to actually fail tests
	if r.filter != "" {
		env = append(env, "LESS_GO_STRICT=1")
		fmt.Printf("[DEBUG] Setting LESS_GO_STRICT=1 for filtered test: %s\n", r.filter)
	}

	cmd := exec.Command("go", args...)
	cmd.Env = env

	// Run with enhanced output processing
	r.runWithEnhancedOutput(cmd)
}

func (r *EnhancedTestRunner) runWithEnhancedOutput(cmd *exec.Cmd) {
	// Create pipes for stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Printf(colorRed+"Error creating stdout pipe: %v"+colorReset+"\n", err)
		os.Exit(1)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		fmt.Printf(colorRed+"Error creating stderr pipe: %v"+colorReset+"\n", err)
		os.Exit(1)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		fmt.Printf(colorRed+"Error starting command: %v"+colorReset+"\n", err)
		os.Exit(1)
	}

	// Process output in real-time
	done := make(chan bool, 2)

	go r.processOutput(stdout, false, done)
	go r.processOutput(stderr, true, done)

	// Wait for processing to complete
	<-done
	<-done

	// Wait for command to finish
	err = cmd.Wait()

	// Display final summary
	r.displayFinalSummary()

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		os.Exit(1)
	}
}

func (r *EnhancedTestRunner) processOutput(reader io.Reader, isError bool, done chan bool) {
	scanner := bufio.NewScanner(reader)
	testPattern := regexp.MustCompile(`^=== RUN\s+(.+)$`)
	passPattern := regexp.MustCompile(`^--- PASS:\s+(.+)\s+\(([0-9.]+)s\)$`)
	failPattern := regexp.MustCompile(`^--- FAIL:\s+(.+)\s+\(([0-9.]+)s\)$`)
	errorPattern := regexp.MustCompile(`^\s*(.*\.go):(\d+):(\d+):\s+(.+)$`)
	panicPattern := regexp.MustCompile(`^panic:`)
	noTestsPattern := regexp.MustCompile(`testing: warning: no tests to run`)

	var currentTest string
	var errorBuffer []string
	inError := false
	inPanic := false

	for scanner.Scan() {
		line := scanner.Text()

		// Write to debug output if configured
		if r.debugOutput != nil {
			fmt.Fprintln(r.debugOutput, line)
		}

		// Check for "no tests to run" warning
		if noTestsPattern.MatchString(line) {
			if r.filter != "" {
				fmt.Printf(colorRed+"❌ ERROR: No tests matched filter '%s'"+colorReset+"\n", r.filter)
				fmt.Printf(colorYellow + "💡 Hint: Use the full test path, e.g., 'main/colors2' or 'math/strict/operations'" + colorReset + "\n")
			}
		}

		// Check for test start
		if matches := testPattern.FindStringSubmatch(line); matches != nil {
			currentTest = matches[1]
			r.currentSuite = currentTest
			if r.showProgress {
				fmt.Printf(colorCyan+"▶ Running: %s"+colorReset+"\n", currentTest)
			}
			r.totalTests++
			continue
		}

		// Check for test pass
		if matches := passPattern.FindStringSubmatch(line); matches != nil {
			r.passedTests++
			if r.mode >= ModeVerbose {
				fmt.Printf(colorGreen+"✓ PASS: %s (%s)"+colorReset+"\n", matches[1], matches[2])
			}
			continue
		}

		// Check for test fail
		if matches := failPattern.FindStringSubmatch(line); matches != nil {
			r.failedTests++
			testName := matches[1]
			duration := matches[2]

			fmt.Printf(colorRed+colorBold+"✗ FAIL: %s (%s)"+colorReset+"\n", testName, duration)

			// Display collected error buffer
			if len(errorBuffer) > 0 {
				r.displayEnhancedError(testName, errorBuffer)
				errorBuffer = nil
			}

			inError = false
			continue
		}

		// Check for panic
		if panicPattern.MatchString(line) {
			inPanic = true
		}

		// Collect error information
		if currentTest != "" && (inError || strings.Contains(line, "Error:") || strings.Contains(line, "error:")) {
			inError = true
			errorBuffer = append(errorBuffer, line)
		}

		// Enhanced error parsing
		if matches := errorPattern.FindStringSubmatch(line); matches != nil {
			file := matches[1]
			lineNum := matches[2]
			colNum := matches[3]
			message := matches[4]

			r.displaySourceError(file, lineNum, colNum, message)
			continue
		}

		// Stack trace handling
		if inPanic && r.mode >= ModeDebug {
			fmt.Println(colorGray + line + colorReset)
			continue
		}

		// Default output
		if r.mode >= ModeVerbose || isError {
			if isError {
				fmt.Println(colorRed + line + colorReset)
			} else {
				fmt.Println(line)
			}
		}
	}

	done <- true
}

func (r *EnhancedTestRunner) displayEnhancedError(testName string, errorLines []string) {
	fmt.Println(colorRed + "  Error Details:" + colorReset)

	// Group error lines by type
	var parseErrors []string
	var compileErrors []string
	var diffErrors []string
	var otherErrors []string

	for _, line := range errorLines {
		switch {
		case strings.Contains(line, "parse") || strings.Contains(line, "Parse"):
			parseErrors = append(parseErrors, line)
		case strings.Contains(line, "compile") || strings.Contains(line, "Compile"):
			compileErrors = append(compileErrors, line)
		case strings.Contains(line, "Expected") && strings.Contains(line, "Actual"):
			diffErrors = append(diffErrors, line)
		default:
			otherErrors = append(otherErrors, line)
		}
	}

	// Display categorized errors
	if len(parseErrors) > 0 {
		fmt.Println(colorYellow + "  📝 Parse Errors:" + colorReset)
		for _, err := range parseErrors {
			fmt.Printf("    %s\n", r.enhanceErrorMessage(err))
		}
	}

	if len(compileErrors) > 0 {
		fmt.Println(colorYellow + "  🔧 Compile Errors:" + colorReset)
		for _, err := range compileErrors {
			fmt.Printf("    %s\n", r.enhanceErrorMessage(err))
		}
	}

	if len(diffErrors) > 0 && r.showDiff {
		fmt.Println(colorYellow + "  📊 Output Differences:" + colorReset)
		r.displayDiff(diffErrors)
	}

	if len(otherErrors) > 0 {
		fmt.Println(colorYellow + "  ❓ Other Errors:" + colorReset)
		for _, err := range otherErrors {
			fmt.Printf("    %s\n", err)
		}
	}

	// Provide debugging suggestions
	if r.mode >= ModeDebug {
		r.provideSuggestions(testName, errorLines)
	}
}

func (r *EnhancedTestRunner) enhanceErrorMessage(message string) string {
	// Add context to common error patterns
	enhanced := message

	// Enhance parser errors
	if strings.Contains(message, "unexpected token") {
		enhanced += colorGray + " (check syntax and token types)" + colorReset
	}

	// Enhance variable errors
	if strings.Contains(message, "undefined variable") {
		enhanced += colorGray + " (check variable scope and definition order)" + colorReset
	}

	// Enhance import errors
	if strings.Contains(message, "import") && strings.Contains(message, "not found") {
		enhanced += colorGray + " (verify import paths and file existence)" + colorReset
	}

	return enhanced
}

func (r *EnhancedTestRunner) displaySourceError(file, line, col, message string) {
	fmt.Printf(colorRed+"  📍 %s:%s:%s: %s"+colorReset+"\n", file, line, col, message)

	// Try to show source context if in debug mode
	if r.mode >= ModeDebug {
		r.showSourceContext(file, line, col)
	}
}

func (r *EnhancedTestRunner) showSourceContext(file, lineStr, colStr string) {
	// Read the file and show context around the error
	content, err := os.ReadFile(file)
	if err != nil {
		return
	}

	lines := strings.Split(string(content), "\n")
	lineNum := 0
	fmt.Sscanf(lineStr, "%d", &lineNum)
	colNum := 0
	fmt.Sscanf(colStr, "%d", &colNum)

	if lineNum > 0 && lineNum <= len(lines) {
		// Show 2 lines before and after
		start := lineNum - 3
		if start < 0 {
			start = 0
		}
		end := lineNum + 2
		if end > len(lines) {
			end = len(lines)
		}

		fmt.Println(colorGray + "  Source context:" + colorReset)
		for i := start; i < end; i++ {
			if i == lineNum-1 {
				// Highlight the error line
				fmt.Printf("  %s%4d | %s%s\n", colorRed, i+1, lines[i], colorReset)
				if colNum > 0 && colNum <= len(lines[i]) {
					// Show column pointer
					fmt.Printf("  %s     | %s^%s\n", colorRed, strings.Repeat(" ", colNum-1), colorReset)
				}
			} else {
				fmt.Printf("  %s%4d |%s %s\n", colorGray, i+1, colorReset, lines[i])
			}
		}
	}
}

func (r *EnhancedTestRunner) displayDiff(diffLines []string) {
	// Implement smart diff display
	// This is a simplified version - you could integrate a proper diff library
	for _, line := range diffLines {
		if strings.Contains(line, "Expected:") {
			fmt.Printf("  %s+ Expected:%s\n", colorGreen, colorReset)
			// Extract and format expected content
		} else if strings.Contains(line, "Actual:") {
			fmt.Printf("  %s- Actual:%s\n", colorRed, colorReset)
			// Extract and format actual content
		}
	}
}

func (r *EnhancedTestRunner) provideSuggestions(testName string, errors []string) {
	fmt.Println(colorPurple + "\n  💡 Debugging Suggestions:" + colorReset)

	// Analyze error patterns and provide targeted suggestions
	errorText := strings.Join(errors, " ")

	if strings.Contains(errorText, "nil pointer") {
		fmt.Println("  • Check for uninitialized structs or maps")
		fmt.Println("  • Verify all required fields are set before use")
		fmt.Println("  • Add nil checks for optional values")
	}

	if strings.Contains(errorText, "index out of range") {
		fmt.Println("  • Verify array/slice bounds before access")
		fmt.Println("  • Check loop conditions and indices")
		fmt.Println("  • Consider using range loops instead of index access")
	}

	if strings.Contains(errorText, "type assertion") {
		fmt.Println("  • Use type switches for multiple type checks")
		fmt.Println("  • Always use the two-value form: value, ok := x.(Type)")
		fmt.Println("  • Consider using interfaces instead of type assertions")
	}

	if strings.Contains(testName, "import") {
		fmt.Println("  • Verify import resolution logic matches JavaScript")
		fmt.Println("  • Check file path normalization")
		fmt.Println("  • Test with both relative and absolute paths")
	}

	if strings.Contains(testName, "variable") {
		fmt.Println("  • Check variable scope handling")
		fmt.Println("  • Verify lazy evaluation is implemented correctly")
		fmt.Println("  • Test variable overrides and default values")
	}

	// General debugging tips
	fmt.Printf("\n  %sGeneral debugging commands:%s\n", colorGray, colorReset)
	fmt.Printf("  • Run with --trace to see execution flow\n")
	fmt.Printf("  • Use --ast to inspect parsed tree structure\n")
	fmt.Printf("  • Add fmt.Printf() statements in the Go code\n")
	fmt.Printf("  • Check the corresponding JavaScript implementation\n")
	fmt.Printf("  • Run the JavaScript test with: pnpm --filter=less test:unit %s\n", testName)
}

func (r *EnhancedTestRunner) extractAndDisplaySummary(output string) {
	// Extract test results and summary
	lines := strings.Split(output, "\n")

	// Count different types of test results
	var perfectMatches int // CSS compilation perfect matches
	var correctErrors int  // Correctly handled error tests
	var outputDiffers int
	var compilationFailed int
	var totalTests int

	// Collect test names for each category
	var perfectMatchTests []string
	var correctErrorTests []string
	var outputDifferTests []string
	var compilationFailedTests []string

	for _, line := range lines {
		// Extract test name from the line (format: "filename:line: ✅ testname: message")
		extractTestName := func(line string) string {
			// Look for emoji followed by test name
			emojiPos := -1
			for _, emoji := range []string{"✅", "⚠️", "❌"} {
				if pos := strings.Index(line, emoji); pos != -1 {
					emojiPos = pos
					break
				}
			}
			if emojiPos == -1 {
				return ""
			}

			// Extract text after emoji and before the next colon
			afterEmoji := line[emojiPos+len("✅"):] // All emojis are same byte length
			afterEmoji = strings.TrimSpace(afterEmoji)

			if colonPos := strings.Index(afterEmoji, ":"); colonPos > 0 {
				return strings.TrimSpace(afterEmoji[:colonPos])
			}

			return ""
		}

		// Count test result types based on emojis and messages
		if strings.Contains(line, "✅") && strings.Contains(line, "Perfect match!") {
			perfectMatches++
			totalTests++
			if testName := extractTestName(line); testName != "" {
				perfectMatchTests = append(perfectMatchTests, testName)
			}
		} else if strings.Contains(line, "✅") && strings.Contains(line, "Correctly failed") {
			correctErrors++
			totalTests++
			if testName := extractTestName(line); testName != "" {
				correctErrorTests = append(correctErrorTests, testName)
			}
		} else if strings.Contains(line, "⚠️") {
			outputDiffers++
			totalTests++
			if testName := extractTestName(line); testName != "" {
				outputDifferTests = append(outputDifferTests, testName)
			}
		} else if strings.Contains(line, "❌") {
			compilationFailed++
			totalTests++
			if testName := extractTestName(line); testName != "" {
				compilationFailedTests = append(compilationFailedTests, testName)
			}
		}

		// Look for existing summary sections
		if strings.Contains(line, "Test Summary") {
			fmt.Println(line)
		} else if strings.Contains(line, "Total:") ||
			strings.Contains(line, "Passed:") ||
			strings.Contains(line, "Failed:") ||
			strings.Contains(line, "Error Summary") {
			fmt.Println(line)
		}
	}

	// Display detailed results by category
	if totalTests > 0 {
		fmt.Println(colorBold + "\n📊 Integration Test Results by Category" + colorReset)

		// Perfect CSS Matches
		if len(perfectMatchTests) > 0 {
			fmt.Printf("\n%s✅ Perfect CSS Matches (%d):%s\n", colorGreen, len(perfectMatchTests), colorReset)
			for _, test := range perfectMatchTests {
				fmt.Printf("  • %s\n", test)
			}
		}

		// Correct Error Handling
		if len(correctErrorTests) > 0 {
			fmt.Printf("\n%s✅ Correct Error Handling (%d):%s\n", colorGreen, len(correctErrorTests), colorReset)
			for _, test := range correctErrorTests {
				fmt.Printf("  • %s\n", test)
			}
		}

		// Output Differs/Warnings
		if len(outputDifferTests) > 0 {
			fmt.Printf("\n%s⚠️  Output Differs/Warnings (%d):%s\n", colorYellow, len(outputDifferTests), colorReset)
			for _, test := range outputDifferTests {
				fmt.Printf("  • %s\n", test)
			}
		}

		// Failing Tests
		if len(compilationFailedTests) > 0 {
			fmt.Printf("\n%s❌ Failing Tests (%d):%s\n", colorRed, len(compilationFailedTests), colorReset)
			for _, test := range compilationFailedTests {
				fmt.Printf("  • %s\n", test)
			}
		}

		// Summary totals
		fmt.Println(colorBold + "\n📈 Summary Totals" + colorReset)
		fmt.Printf("  %s✅ Perfect CSS Matches: %d%s\n", colorGreen, perfectMatches, colorReset)
		fmt.Printf("  %s✅ Correct Error Handling: %d%s\n", colorGreen, correctErrors, colorReset)
		fmt.Printf("  %s⚠️  Output Differs/Warnings: %d%s\n", colorYellow, outputDiffers, colorReset)
		fmt.Printf("  %s❌ Failing Tests: %d%s\n", colorRed, compilationFailed, colorReset)
		fmt.Printf("  %sTotal Tests: %d%s\n", colorBold, totalTests, colorReset)

		if totalTests > 0 {
			totalPassing := perfectMatches + correctErrors
			successRate := float64(totalPassing) / float64(totalTests) * 100
			fmt.Printf("  %sOverall Success Rate: %.1f%%%s\n", colorBold, successRate, colorReset)

			if perfectMatches > 0 {
				cssSuccessRate := float64(perfectMatches) / float64(totalTests) * 100
				fmt.Printf("  %sPerfect CSS Compilation Rate: %.1f%%%s\n", colorCyan, cssSuccessRate, colorReset)
			}
		}
	}
}

func (r *EnhancedTestRunner) displayFinalSummary() {
	duration := time.Since(r.startTime)

	fmt.Println(colorBold + "\n📈 Final Test Summary" + colorReset)
	fmt.Printf("  Total Tests: %d\n", r.totalTests)
	fmt.Printf("  %sPassed: %d%s\n", colorGreen, r.passedTests, colorReset)
	fmt.Printf("  %sFailed: %d%s\n", colorRed, r.failedTests, colorReset)
	fmt.Printf("  Duration: %s\n", duration.Round(time.Millisecond))

	if r.totalTests > 0 {
		passRate := float64(r.passedTests) / float64(r.totalTests) * 100
		fmt.Printf("  Pass Rate: %.1f%%\n", passRate)

		// Visual progress bar
		barLength := 40
		filledLength := int(passRate / 100 * float64(barLength))
		bar := strings.Repeat("█", filledLength) + strings.Repeat("░", barLength-filledLength)

		color := colorGreen
		if passRate < 50 {
			color = colorRed
		} else if passRate < 80 {
			color = colorYellow
		}

		fmt.Printf("  Progress: %s[%s]%s\n", color, bar, colorReset)
	}

	// Performance metrics if in debug mode
	if r.mode >= ModeDebug {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		fmt.Printf("\n%s⚡ Performance Metrics%s\n", colorBold, colorReset)
		fmt.Printf("  Memory Used: %.2f MB\n", float64(m.Alloc)/1024/1024)
		fmt.Printf("  GC Runs: %d\n", m.NumGC)
		fmt.Printf("  Goroutines: %d\n", runtime.NumGoroutine())
	}
}

func main() {
	mainEnhanced()
}
