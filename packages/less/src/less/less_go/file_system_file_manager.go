package less_go

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// FileSystemFileManager implements a real file manager that loads files from disk
type FileSystemFileManager struct {
	AbstractFileManager
}

// NewFileSystemFileManager creates a new FileSystemFileManager
func NewFileSystemFileManager() *FileSystemFileManager {
	return &FileSystemFileManager{}
}

// Supports returns true for all files (this manager handles any file)
func (fm *FileSystemFileManager) Supports(filename, currentDirectory string, options map[string]any, environment map[string]any) bool {
	return true
}

// SupportsSync returns true (we support synchronous loading)
func (fm *FileSystemFileManager) SupportsSync(filename, currentDirectory string, options map[string]any, environment map[string]any) bool {
	return true
}

// isRemoteURL checks if a filename is a remote HTTP/HTTPS URL
func isRemoteURL(filename string) bool {
	return strings.HasPrefix(filename, "http://") || strings.HasPrefix(filename, "https://")
}

// fetchRemoteFile fetches a file from a remote URL
func fetchRemoteFile(url string) *LoadedFile {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make GET request
	resp, err := client.Get(url)
	if err != nil {
		return &LoadedFile{
			Message: fmt.Sprintf("Failed to fetch remote file: %v", err),
		}
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return &LoadedFile{
			Message: fmt.Sprintf("Remote file returned status %d: %s", resp.StatusCode, resp.Status),
		}
	}

	// Read response body
	contents, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return &LoadedFile{
			Message: fmt.Sprintf("Failed to read remote file: %v", err),
		}
	}

	return &LoadedFile{
		Filename: url,
		Contents: string(contents),
	}
}

// resolveNodeModule attempts to resolve a module path using Node.js module resolution algorithm
// This mimics Node's require.resolve() behavior
func resolveNodeModule(modulePath, startDir string) (string, error) {
	// Clean the start directory
	startDir, err := filepath.Abs(startDir)
	if err != nil {
		return "", err
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		cwd = startDir // Fallback to startDir if we can't get CWD
	}

	// Try to resolve from multiple starting points:
	// 1. Current working directory (where the process is running)
	// 2. Start directory (where the file being compiled is located)
	// This mimics Node's behavior where CWD node_modules is checked first
	searchDirs := []string{cwd}
	if startDir != cwd {
		searchDirs = append(searchDirs, startDir)
	}

	for _, searchStart := range searchDirs {
		// Walk up the directory tree from this search start
		currentDir := searchStart
		for {
			// Try looking in node_modules under current directory
			tryPath := filepath.Join(currentDir, "node_modules", modulePath)

			// Check if file exists
			if _, err := os.Stat(tryPath); err == nil {
				return tryPath, nil
			}

			// Try with .less extension if no extension present
			if !strings.Contains(filepath.Base(modulePath), ".") {
				tryPathWithExt := tryPath + ".less"
				if _, err := os.Stat(tryPathWithExt); err == nil {
					return tryPathWithExt, nil
				}
			}

			// Move up one directory
			parentDir := filepath.Dir(currentDir)

			// If we've reached the root, stop
			if parentDir == currentDir {
				break
			}

			currentDir = parentDir
		}
	}

	return "", fmt.Errorf("module not found: %s", modulePath)
}

// isExplicitPath checks if a path is explicit (starts with . or /)
func isExplicitPath(path string) bool {
	if len(path) == 0 {
		return false
	}
	prefix := path[0:1]
	return prefix == "." || prefix == "/"
}

// LoadFileSync loads a file synchronously
func (fm *FileSystemFileManager) LoadFileSync(filename, currentDirectory string, context map[string]any, environment ImportManagerEnvironment) *LoadedFile {
	// Check if this is a remote URL
	if isRemoteURL(filename) {
		return fetchRemoteFile(filename)
	}

	// Debug logging
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG FileManager] LoadFileSync: filename=%s, currentDirectory=%s\n", filename, currentDirectory)
		if context != nil {
			if contextPaths, ok := context["paths"]; ok {
				fmt.Printf("[DEBUG FileManager] Context paths: %v\n", contextPaths)
			}
		}
	}

	isAbsolute := fm.IsPathAbsolute(filename)
	paths := []string{}

	if isAbsolute {
		paths = append(paths, "")
	} else {
		paths = append(paths, currentDirectory)
	}

	// Add paths from options
	if context != nil {
		if optionPaths, ok := context["paths"].([]string); ok {
			paths = append(paths, optionPaths...)
		} else if optionPaths, ok := context["paths"].([]any); ok {
			for _, p := range optionPaths {
				if str, ok := p.(string); ok {
					paths = append(paths, str)
				}
			}
		}
	}

	// Debug logging
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG FileManager] Final paths to search: %v\n", paths)
	}
	
	// If not absolute and "." is not in paths, add it
	if !isAbsolute {
		hasDot := false
		for _, p := range paths {
			if p == "." {
				hasDot = true
				break
			}
		}
		if !hasDot {
			paths = append(paths, ".")
		}
	}
	
	// Try to find the file
	var fullPath string
	var contents []byte
	var err error
	explicit := isExplicitPath(filename)

	for _, dir := range paths {
		if isAbsolute {
			fullPath = filename
		} else {
			fullPath = filepath.Join(dir, filename)
		}

		// Debug logging
		if os.Getenv("LESS_GO_DEBUG") == "1" {
			fmt.Printf("[DEBUG FileManager] Trying path: %s\n", fullPath)
		}

		// Try Node module resolution if:
		// 1. Path is not explicit (doesn't start with . or /)
		// 2. We're searching in the current directory (.)
		if !explicit && dir == "." {
			resolvedPath, resolveErr := resolveNodeModule(filename, currentDirectory)
			if resolveErr == nil {
				// Successfully resolved as Node module
				contents, err = ioutil.ReadFile(resolvedPath)
				if err == nil {
					fullPath = resolvedPath
					if os.Getenv("LESS_GO_DEBUG") == "1" {
						fmt.Printf("[DEBUG FileManager] ✓ Found via Node module resolution: %s\n", fullPath)
					}
					break
				}
			}
			// If Node module resolution fails, continue with normal file resolution
		}

		// Try with .less extension if no extension
		if !strings.Contains(filepath.Base(fullPath), ".") {
			tryPath := fullPath + ".less"
			if os.Getenv("LESS_GO_DEBUG") == "1" {
				fmt.Printf("[DEBUG FileManager] Trying with .less extension: %s\n", tryPath)
			}
			contents, err = ioutil.ReadFile(tryPath)
			if err == nil {
				fullPath = tryPath
				if os.Getenv("LESS_GO_DEBUG") == "1" {
					fmt.Printf("[DEBUG FileManager] ✓ Found: %s\n", fullPath)
				}
				break
			}
		}

		// Try as-is
		if os.Getenv("LESS_GO_DEBUG") == "1" {
			fmt.Printf("[DEBUG FileManager] Trying as-is: %s\n", fullPath)
		}
		contents, err = ioutil.ReadFile(fullPath)
		if err == nil {
			if os.Getenv("LESS_GO_DEBUG") == "1" {
				fmt.Printf("[DEBUG FileManager] ✓ Found: %s\n", fullPath)
			}
			break
		}
	}
	
	if err != nil {
		return &LoadedFile{
			Message: err.Error(),
		}
	}
	
	return &LoadedFile{
		Filename: fullPath,
		Contents: string(contents),
	}
}

// LoadFile loads a file asynchronously (but we implement it synchronously for now)
func (fm *FileSystemFileManager) LoadFile(filename, currentDirectory string, context map[string]any, environment ImportManagerEnvironment, callback func(error, *LoadedFile)) any {
	result := fm.LoadFileSync(filename, currentDirectory, context, environment)
	if result.Message != "" {
		callback(&LessError{Message: result.Message}, nil)
	} else {
		callback(nil, result)
	}
	return nil
}

// GetPath returns the directory of a filename
func (fm *FileSystemFileManager) GetPath(filename string) string {
	// Return directory with trailing slash for PathDiff compatibility
	dir := filepath.Dir(filename)
	// Convert backslashes to forward slashes for consistency
	dir = strings.ReplaceAll(dir, "\\", "/")
	// Ensure trailing slash
	if !strings.HasSuffix(dir, "/") {
		dir += "/"
	}
	return dir
}

// Join joins two paths
func (fm *FileSystemFileManager) Join(basePath, relativePath string) string {
	// Use AbstractFileManager's Join for URL-safe path joining
	afm := NewAbstractFileManager()
	return afm.Join(basePath, relativePath)
}

// PathDiff returns the relative path between two directories
// This matches the JavaScript AbstractFileManager.pathDiff behavior:
// - Always uses forward slashes (/)
// - Adds trailing slash for directories
// - Input paths should be directories ending with /
func (fm *FileSystemFileManager) PathDiff(url, baseUrl string) string {
	// Use the AbstractFileManager implementation which handles URL-style paths correctly
	afm := NewAbstractFileManager()
	result := afm.PathDiff(url, baseUrl)
	if os.Getenv("LESS_GO_DEBUG") == "1" {
		fmt.Printf("[DEBUG FileSystemFileManager.PathDiff] url=%q, baseUrl=%q, result=%q\n", url, baseUrl, result)
	}
	return result
}

// IsPathAbsolute checks if a path is absolute
func (fm *FileSystemFileManager) IsPathAbsolute(filename string) bool {
	// Remote URLs are considered absolute
	if isRemoteURL(filename) {
		return true
	}
	return filepath.IsAbs(filename)
}

// AlwaysMakePathsAbsolute returns false (we don't always make paths absolute)
func (fm *FileSystemFileManager) AlwaysMakePathsAbsolute() bool {
	return false
}

// CanonicalizeFilename canonicalizes a filename
func (fm *FileSystemFileManager) CanonicalizeFilename(filename string) string {
	abs, err := filepath.Abs(filename)
	if err != nil {
		return filename
	}
	return abs
}

// ConvertToFileUrl converts a filename to a file URL
func (fm *FileSystemFileManager) ConvertToFileUrl(filename string, url string, options map[string]any) string {
	return "file://" + filename
}