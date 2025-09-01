# Less.js Test Data - Refactored Structure

This directory contains refactored test data that addresses two main issues with the original test structure:

## Problems Solved

### 1. Co-located Test Files
**Before**: Separate `less/` and `css/` folders with matching file sets
**After**: `.less` and `.css` files are co-located in the same directory

### 2. Single-Responsibility Tests
**Before**: Tests mixed multiple features (e.g., calc + nesting + mixins)
**After**: Each test focuses on a single feature or concept

## Directory Structure

```
tests/
├── calc/
│   ├── calc.less      # All calc-related functionality
│   └── calc.css       # Expected output
├── variables/
│   ├── variables.less # All variable-related functionality
│   └── variables.css  # Expected output
├── mixins/
│   ├── mixins.less    # All mixin-related functionality
│   ├── mixins.css     # Expected output
│   ├── maps.less      # Map functionality (separated from calc)
│   └── maps.css       # Expected output
└── nesting/
    ├── nesting.less   # Pure nesting functionality
    └── nesting.css    # Expected output
```

## Test Categories

### calc/
- Basic calc() function usage
- Variable interpolation in calc()
- Nested calc() functions
- Functions within calc() expressions
- Escape sequences in calc()
- Mixed operations with calc()

### variables/
- Basic variable usage
- Variable redefinition
- Variable scope
- Important variables
- Variable names (quoted/unquoted)
- Variable units
- Variable pollution

### mixins/
- Basic mixin usage
- Namespace mixins
- Mixin parameters
- Extended mixins
- Parent selectors in mixins
- Mixin guards

### nesting/
- Pure nesting functionality
- Parent selectors
- Nested selectors
- Flattening behavior

## Benefits

1. **Easier Maintenance**: Related files are co-located
2. **Clearer Test Intent**: Each test focuses on one feature
3. **Better Debugging**: Easier to isolate issues
4. **Reduced Nesting**: Tests don't mix nesting with feature testing
5. **Improved Readability**: Clear separation of concerns

## Migration Notes

The original tests in `less/_main/` and `css/_main/` are preserved for backward compatibility. The new structure is additive and can be used alongside existing tests.
