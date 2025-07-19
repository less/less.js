package less_go

import (
	"regexp"
	"strings"
)

type AbstractFileManager struct{}

type URLParts struct {
	HostPart     string
	Directories  []string
	RawPath      string
	Path         string
	Filename     string
	FileURL      string
	URL          string
}

func NewAbstractFileManager() *AbstractFileManager {
	return &AbstractFileManager{}
}

func (afm *AbstractFileManager) GetPath(filename string) string {
	j := strings.LastIndex(filename, "?")
	if j > 0 {
		filename = filename[:j]
	}
	j = strings.LastIndex(filename, "/")
	if j < 0 {
		j = strings.LastIndex(filename, "\\")
	}
	if j < 0 {
		return ""
	}
	return filename[:j+1]
}

func (afm *AbstractFileManager) TryAppendExtension(path, ext string) string {
	re := regexp.MustCompile(`(\.[a-z]*$)|([?;].*)$`)
	if re.MatchString(path) {
		return path
	}
	return path + ext
}

func (afm *AbstractFileManager) TryAppendLessExtension(path string) string {
	return afm.TryAppendExtension(path, ".less")
}

func (afm *AbstractFileManager) SupportsSync() bool {
	return false
}

func (afm *AbstractFileManager) AlwaysMakePathsAbsolute() bool {
	return false
}

func (afm *AbstractFileManager) IsPathAbsolute(filename string) bool {
	re := regexp.MustCompile(`(?i)^(?:[a-z-]+:|\/|\\|#)`)
	return re.MatchString(filename)
}

func (afm *AbstractFileManager) Join(basePath, laterPath string) string {
	if basePath == "" {
		return laterPath
	}
	return basePath + laterPath
}

func (afm *AbstractFileManager) PathDiff(url, baseURL string) string {
	urlParts, err := afm.ExtractURLParts(url, "")
	if err != nil {
		return ""
	}

	baseURLParts, err := afm.ExtractURLParts(baseURL, "")
	if err != nil {
		return ""
	}

	if urlParts.HostPart != baseURLParts.HostPart {
		return ""
	}

	maxLen := len(baseURLParts.Directories)
	if len(urlParts.Directories) > maxLen {
		maxLen = len(urlParts.Directories)
	}

	i := 0
	for i < maxLen {
		if i >= len(baseURLParts.Directories) || i >= len(urlParts.Directories) ||
			baseURLParts.Directories[i] != urlParts.Directories[i] {
			break
		}
		i++
	}

	baseURLDirectories := baseURLParts.Directories[i:]
	urlDirectories := urlParts.Directories[i:]

	diff := ""
	for j := 0; j < len(baseURLDirectories)-1; j++ {
		diff += "../"
	}
	for j := 0; j < len(urlDirectories)-1; j++ {
		diff += urlDirectories[j] + "/"
	}

	return diff
}

func (afm *AbstractFileManager) ExtractURLParts(url, baseURL string) (*URLParts, error) {
	urlPartsRegex := regexp.MustCompile(`(?i)^((?:[a-z-]+:)?\/{2}(?:[^/?#]*\/)|([/\\]))?((?:[^/\\?#]*[/\\])*)([^/\\?#]*)([#?].*)?$`)

	urlParts := urlPartsRegex.FindStringSubmatch(url)
	if urlParts == nil {
		return nil, &URLParseError{URL: url}
	}

	returner := &URLParts{}
	var rawDirectories []string
	var directories []string
	var baseURLParts []string

	// Stylesheets in IE don't always return the full path
	if baseURL != "" && (urlParts[1] == "" || urlParts[2] != "") {
		baseURLParts = urlPartsRegex.FindStringSubmatch(baseURL)
		if baseURLParts == nil {
			return nil, &BaseURLParseError{BaseURL: baseURL}
		}
		if urlParts[1] == "" {
			urlParts[1] = baseURLParts[1]
		}
		if urlParts[2] == "" {
			urlParts[3] = baseURLParts[3] + urlParts[3]
		}
	}

	if urlParts[3] != "" {
		rawDirectories = strings.Split(strings.ReplaceAll(urlParts[3], "\\", "/"), "/")

		// collapse '..' and skip '.'
		for _, dir := range rawDirectories {
			if dir == ".." {
				if len(directories) > 0 {
					directories = directories[:len(directories)-1]
				}
			} else if dir != "." {
				directories = append(directories, dir)
			}
		}
	}

	returner.HostPart = urlParts[1]
	returner.Directories = directories
	
	// Handle empty urlParts[1] for rawPath and path
	hostPart := ""
	if urlParts[1] != "" {
		hostPart = urlParts[1]
	}
	returner.RawPath = hostPart + strings.Join(rawDirectories, "/")
	returner.Path = hostPart + strings.Join(directories, "/")
	returner.Filename = urlParts[4]
	
	// Handle empty urlParts[4] for fileURL
	filename := ""
	if urlParts[4] != "" {
		filename = urlParts[4]
	}
	returner.FileURL = returner.Path + filename
	
	// Handle empty urlParts[5] for URL
	params := ""
	if len(urlParts) > 5 && urlParts[5] != "" {
		params = urlParts[5]
	}
	returner.URL = returner.FileURL + params

	return returner, nil
}

type URLParseError struct {
	URL string
}

func (e *URLParseError) Error() string {
	return "Could not parse sheet href - '" + e.URL + "'"
}

type BaseURLParseError struct {
	BaseURL string
}

func (e *BaseURLParseError) Error() string {
	return "Could not parse page url - '" + e.BaseURL + "'"
}