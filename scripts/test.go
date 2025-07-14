package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	if len(os.Args) < 2 {
		printHelp()
		os.Exit(1)
	}

	command := os.Args[1]
	
	switch command {
	case "unit":
		runUnitTests()
	case "integration":
		runIntegrationTests()
	case "basic":
		runBasicTests()
	case "summary":
		runSummaryOnly()
	case "all":
		runAllTests()
	case "build":
		buildCLI()
	case "status":
		showStatus()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printHelp()
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Println(`Less.go Test Runner

Usage: go run scripts/test.go <command>

Commands:
  unit         Run unit tests (equivalent to pnpm test:unit)
  integration  Run full integration tests (equivalent to pnpm test)
  basic        Run basic integration tests for development
  summary      Show only the integration test summary
  all          Run all tests (unit + integration)
  build        Build lessc-go CLI tool
  status       Show Go port status

Examples:
  go run scripts/test.go basic
  go run scripts/test.go integration
  go run scripts/test.go unit`)
}

func runUnitTests() {
	fmt.Println("🧪 Running unit tests...")
	cmd := exec.Command("go", "test", "./src/less/less_go", "-v", "-run", "Test[^I]")
	cmd.Dir = "packages/less"
	runCommand(cmd)
}

func runIntegrationTests() {
	fmt.Println("🔄 Running full integration test suite...")
	fmt.Println("📋 Note: Output will be piped to 'less' for easy navigation")
	fmt.Println("   Use arrows/Page Up/Down to scroll, 'q' to quit, '/' to search")
	
	cmd := exec.Command("bash", "-c", "go test ./src/less/less_go -v -run TestIntegrationSuite -timeout 5m | less +G")
	cmd.Dir = "packages/less"
	cmd.Stdin = os.Stdin
	runCommand(cmd)
}

func runBasicTests() {
	fmt.Println("⚡ Running basic integration tests...")
	cmd := exec.Command("go", "test", "./src/less/less_go", "-v", "-run", "TestBasicIntegration", "-timeout", "1m")
	cmd.Dir = "packages/less"
	runCommand(cmd)
}

func runAllTests() {
	fmt.Println("🔄 Running all tests...")
	runUnitTests()
	fmt.Println("")
	runIntegrationTests()
}

func buildCLI() {
	fmt.Println("🔨 Building lessc-go...")
	cmd := exec.Command("go", "build", "-o", "bin/lessc-go", "./cmd/lessc-go")
	runCommand(cmd)
}

func showStatus() {
	fmt.Println("📊 Go Port Status")
	fmt.Println("==================")
	fmt.Println("")
	
	// Count Go files
	goFiles := countFiles("packages/less/src/less/less_go", "*.go")
	fmt.Printf("Go files: %d\n", goFiles)
	
	// Count test files
	testFiles := countFiles("packages/less/src/less/less_go", "*_test.go")
	fmt.Printf("Test files: %d\n", testFiles)
	
	fmt.Println("")
	
	// Count test data
	lessFiles := countFiles("packages/test-data/less/_main", "*.less")
	cssFiles := countFiles("packages/test-data/css/_main", "*.css")
	fmt.Printf("Available test data:\n")
	fmt.Printf("  .less files: %d\n", lessFiles)
	fmt.Printf("  .css files: %d\n", cssFiles)
}

func runCommand(cmd *exec.Cmd) {
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		fmt.Printf("Command failed: %v\n", err)
		os.Exit(1)
	}
}

func runSummaryOnly() {
	fmt.Println("📊 Running integration tests and showing only the summary...")
	cmd := exec.Command("bash", "-c", "go test ./src/less/less_go -v -run TestIntegrationSuite -timeout 5m | grep -A 100 '📊 INTEGRATION TEST SUMMARY'")
	cmd.Dir = "packages/less"
	runCommand(cmd)
}

func countFiles(dir, pattern string) int {
	matches, err := filepath.Glob(filepath.Join(dir, pattern))
	if err != nil {
		return 0
	}
	return len(matches)
}