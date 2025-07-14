# Less.go Makefile
# Simple commands for testing and building the Go port of Less.js

.PHONY: help test test-unit test-integration test-quick build clean install dev

# Default target
help:
	@echo "Less.go - Go port of Less.js"
	@echo ""
	@echo "Available commands:"
	@echo "  make test             - Run all tests (unit + integration)"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-integration - Run full integration test suite"
	@echo "  make test-basic       - Run basic integration tests"
	@echo "  make build           - Build the lessc-go CLI tool"
	@echo "  make install         - Install lessc-go to GOPATH/bin"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make dev             - Run tests in watch mode (requires entr)"
	@echo ""
	@echo "JavaScript equivalents:"
	@echo "  pnpm test:unit  →  make test-unit"
	@echo "  pnpm test       →  make test-integration"

# Run all tests
test: test-unit test-basic

# Run unit tests (equivalent to pnpm test:unit)
test-unit:
	@echo "🧪 Running unit tests..."
	cd packages/less && go test ./src/less/less_go -v -run "Test[^I]" | grep -E "(PASS|FAIL|RUN|===)"

# Run integration tests (equivalent to pnpm test)
test-integration:
	@echo "🔄 Running full integration test suite..."
	cd packages/less && go test ./src/less/less_go -v -run "TestIntegrationSuite" -timeout 5m

# Run basic integration tests for development
test-basic:
	@echo "⚡ Running basic integration tests..."
	cd packages/less && go test ./src/less/less_go -v -run "TestBasicIntegration" -timeout 1m

# Build the CLI tool
build:
	@echo "🔨 Building lessc-go..."
	go build -o bin/lessc-go ./cmd/lessc-go

# Install the CLI tool
install:
	@echo "📦 Installing lessc-go..."
	go install ./cmd/lessc-go

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	rm -rf bin/
	go clean ./...

# Development mode - watch files and run tests
dev:
	@if ! command -v entr >/dev/null 2>&1; then \
		echo "❌ entr not found. Install with: brew install entr"; \
		exit 1; \
	fi
	@echo "👀 Watching files for changes (ctrl+c to stop)..."
	find packages/less/src/less/less_go -name "*.go" | entr -c make test-basic

# Show Go port status
status:
	@echo "📊 Go Port Status"
	@echo "=================="
	@echo ""
	@echo "Go files:"
	@find packages/less/src/less/less_go -name "*.go" | wc -l | xargs echo "  "
	@echo ""
	@echo "Test files:"
	@find packages/less/src/less/less_go -name "*_test.go" | wc -l | xargs echo "  "
	@echo ""
	@echo "Available test data:"
	@find packages/test-data/less/_main -name "*.less" | wc -l | xargs echo "  .less files:"
	@find packages/test-data/css/_main -name "*.css" | wc -l | xargs echo "  .css files:"

# Run tests with coverage
test-coverage:
	@echo "📈 Running tests with coverage..."
	cd packages/less && go test ./src/less/less_go -coverprofile=coverage.out -covermode=atomic
	cd packages/less && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report saved to packages/less/coverage.html"

# Benchmark tests
benchmark:
	@echo "⏱️  Running benchmarks..."
	cd packages/less && go test ./src/less/less_go -bench=. -benchmem

# Compare with JavaScript tests
compare-js:
	@echo "🔄 Running JavaScript tests for comparison..."
	cd packages/less && pnpm test:unit --run
	@echo ""
	@echo "🔄 Running Go tests..."
	@$(MAKE) test-basic

# Lint Go code
lint:
	@if command -v golangci-lint >/dev/null 2>&1; then \
		echo "🔍 Linting Go code..."; \
		golangci-lint run ./...; \
	else \
		echo "⚠️  golangci-lint not found, using go vet..."; \
		go vet ./...; \
	fi

# Format Go code
fmt:
	@echo "💅 Formatting Go code..."
	go fmt ./...

# Run all quality checks
check: fmt lint test

# Build and test CLI
test-cli: build
	@echo "🧪 Testing lessc-go CLI..."
	@if [ -f "packages/test-data/less/_main/variables.less" ]; then \
		./bin/lessc-go packages/test-data/less/_main/variables.less /tmp/test-output.css; \
		echo "✅ CLI test completed - output saved to /tmp/test-output.css"; \
	else \
		echo "❌ Test file not found"; \
	fi