# Changes Made to Support New Test Structure

## Files Modified

### 1. `packages/less/test/less-test.js`

**Line ~430**: Modified the CSS file path resolution to support both old and new structures:

```javascript
// Check if we're using the new co-located structure (tests/) or the old separated structure
var cssPath;
if (foldername.startsWith('../tests/')) {
    // New co-located structure: CSS file is in the same directory as LESS file
    cssPath = path.join(path.dirname(fileInfo.fullPath), path.basename(file, '.less') + '.css');
} else {
    // Old separated structure: CSS file is in separate css/ folder
    cssPath = path.join(testFolder, 'css', css_name) + '.css';
}
```

**Line ~360**: Added glob support for scanning direct children of test sub-folders:

```javascript
// Check if this is a glob pattern
var isGlob = foldername.indexOf('/*/*') !== -1;
var isRecursive = foldername.indexOf('/*/*') !== -1;

if (isRecursive) {
    // Scan direct children of test sub-folders (prevents running import assets)
    var baseDir = foldername.replace(/\/\*\/\*.*$/, '');
    // Ensure baseDir ends with a slash for proper path construction
    if (baseDir.charAt(baseDir.length - 1) !== '/') {
        baseDir = baseDir + '/';
    }
    
    // Scan the base directory for sub-folders, then scan each sub-folder for .less files
    var baseDirPath = path.join(baseFolder, baseDir);
    var subDirs = fs.readdirSync(baseDirPath);
    
    subDirs.forEach(function(subDir) {
        var subDirPath = path.join(baseDirPath, subDir);
        var stat = fs.statSync(subDirPath);
        
        if (stat.isDirectory()) {
            // Scan this sub-directory for .less files
            var subDirItems = fs.readdirSync(subDirPath);
            subDirItems.forEach(function(item) {
                if (/\.less$/.test(item)) {
                    filesToProcess.push({
                        file: item,
                        fullPath: path.join(subDirPath, item),
                        relativePath: baseDir + subDir + '/'
                    });
                }
            });
        }
    });
} else {
    // Original behavior: only scan the immediate directory
    // ... existing code ...
}
```

**Line ~355**: Fixed path construction in getBasename function:

```javascript
function getBasename(file, relativePath) {
    var basePath = relativePath || foldername;
    // Ensure basePath ends with a slash for proper path construction
    if (basePath.charAt(basePath.length - 1) !== '/') {
        basePath = basePath + '/';
    }
    return basePath + path.basename(file, '.less');
}
```

### 2. `packages/less/test/index.js`

**Line ~15**: Added new test configuration for the co-located structure:

```javascript
[{
    relativeUrls: true,
    silent: true,
    javascriptEnabled: true
}, '../tests/'],
[{
    relativeUrls: true,
    silent: true,
    javascriptEnabled: true
}, '../tests/*/*'],
```

## How It Works

1. **Backward Compatibility**: The old structure (`less/` + `css/` folders) continues to work unchanged
2. **New Structure Support**: The new co-located structure (`tests/` folder) is detected by checking if the foldername starts with `../tests/`
3. **Glob Support**: 
   - `../tests/` - scans only the immediate directory (backward compatible)
   - `../tests/*/*` - scans direct children of test sub-folders (prevents running import assets)
4. **Path Resolution**: 
   - Old structure: CSS files are looked for in `testFolder/css/`
   - New structure: CSS files are looked for in the same directory as the LESS files
5. **Path Construction Fixes**:
   - Ensures proper trailing slashes in path construction
   - Handles both flat and nested directory structures correctly
   - Fixes test name output to show clean relative paths

## Test Structure

The new structure supports:
- Co-located `.less` and `.css` files
- Single-responsibility tests (no mixing of features)
- Clear separation of concerns
- Easier maintenance and debugging
- Recursive directory scanning with glob patterns

## Benefits

1. **Easier File Management**: No need to maintain parallel folder structures
2. **Clearer Test Intent**: Each test focuses on one feature
3. **Better Debugging**: Related files are in the same location
4. **Reduced Complexity**: No unnecessary nesting in feature tests
5. **Flexible Organization**: Support for both flat and nested directory structures
6. **Backward Compatibility**: Existing tests continue to work unchanged
7. **Proper Path Handling**: Correct path construction for both old and new structures
