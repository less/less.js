package less_go

import (
	"io/ioutil"
	"path/filepath"
	"strings"
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

// LoadFileSync loads a file synchronously
func (fm *FileSystemFileManager) LoadFileSync(filename, currentDirectory string, context map[string]any, environment ImportManagerEnvironment) *LoadedFile {
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
	
	for _, dir := range paths {
		if isAbsolute {
			fullPath = filename
		} else {
			fullPath = filepath.Join(dir, filename)
		}
		
		// Try with .less extension if no extension
		if !strings.Contains(filepath.Base(fullPath), ".") {
			tryPath := fullPath + ".less"
			contents, err = ioutil.ReadFile(tryPath)
			if err == nil {
				fullPath = tryPath
				break
			}
		}
		
		// Try as-is
		contents, err = ioutil.ReadFile(fullPath)
		if err == nil {
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
	return filepath.Dir(filename)
}

// Join joins two paths
func (fm *FileSystemFileManager) Join(basePath, relativePath string) string {
	return filepath.Join(basePath, relativePath)
}

// PathDiff returns the relative path between two directories
func (fm *FileSystemFileManager) PathDiff(url, baseUrl string) string {
	// Clean paths
	url = filepath.Clean(url)
	baseUrl = filepath.Clean(baseUrl)
	
	// If they're the same, return empty
	if url == baseUrl {
		return ""
	}
	
	// Try to get relative path
	rel, err := filepath.Rel(baseUrl, url)
	if err != nil {
		return url
	}
	
	return rel
}

// IsPathAbsolute checks if a path is absolute
func (fm *FileSystemFileManager) IsPathAbsolute(filename string) bool {
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