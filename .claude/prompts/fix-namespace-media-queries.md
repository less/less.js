# Fix namespace lookups with @@variables in media queries

## Issue
The `namespacing-media` test is failing because namespace lookups with @@variable indirection are not working correctly when used inside mixin calls that generate media queries.

**Test file:** `packages/test-data/less/namespacing/namespacing-media.less`

**Current output:**
```css
/* Empty - no output */
```

**Expected output:**
```css
@media not all and (min-width: 480px) {
  .selector {
    prop: val;
  }
}
```

## Root Cause
The test uses a complex pattern:
1. A mixin `.breakpoint(@size)` that internally does `#ns.sizes[@@size]`
2. The `@@size` should lookup the value of `@size` parameter (which is "small")
3. Then lookup `#ns.sizes[@small]` to get `480px`
4. Build a media query with that value

The entire media query generation is not happening, suggesting the mixin is failing to evaluate or the @@variable lookup in namespace context is broken.

## Test Input Explanation
```less
#ns {
  .sizes() {
    @small: 480px;  // Last definition wins
  }
  .breakpoint(@size) {
    @val: #ns.sizes[@@size];  // @@size -> @small -> lookup #ns.sizes[@small]
    @min: (min-width: @val);
    @max: not all and @min;
  }
}

.selector {
  #ns > .breakpoint(small);  // Calls with @size = "small"
  @media #ns.breakpoint(small)[@max] {
    prop: val;
  }
}
```

## Investigation Steps
1. Test if `#ns.sizes[@@size]` works in isolation (likely broken)
2. Check if @@variable lookup in namespace context is properly resolving the inner variable
3. Verify mixin parameter values are accessible during namespace lookup evaluation
4. Check if media query detached ruleset access `[@max]` is working

## Files to Check
- `packages/less/src/less/less_go/namespace_value.go` - @@variable handling (lines 117-148 were recently fixed, but may need more work)
- `packages/less/src/less/less_go/mixin_call.go` - Parameter passing and scope
- `packages/less/src/less/less_go/media.go` - Media query evaluation

## Debugging Approach
Create simpler test cases:
```less
// Test 1: Does @@variable work in namespace with direct variable?
@key: small;
#ns { .sizes() { @small: 480px; } }
.test { value: #ns.sizes[@@key]; }  // Should output: value: 480px;

// Test 2: Does it work with mixin parameters?
#ns {
  .test(@param) {
    @value: @param;
  }
}
.foo { #ns > .test(hello); }  // Should work
```

## Solution Approach
1. Ensure @@variable lookup properly resolves in the current frame context (mixin parameters)
2. Verify the resolved variable name is then used for the namespace property lookup
3. Check that media query generation with namespace lookups works correctly

## Test Command
```bash
go run ./cmd/lessc-go packages/test-data/less/namespacing/namespacing-media.less
```

Should output a media query with `480px` (the last defined value of `@small`).
