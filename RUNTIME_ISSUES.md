# Runtime & Evaluation Issues

**⚠️ DELETE THIS FILE once all runtime issues are resolved ⚠️**

## Status Overview

**Current Test Results** (as of 2025-11-03):
- ✅ **Perfect CSS Matches**: 13 tests (7.0%)
- ✅ **Correct Error Handling**: 56 tests (30.3%)
- ⚠️ **Output Differs**: 98 tests (53.0%) - Compiles but CSS output differs
- ❌ **Runtime Failures**: 18 tests (9.7%) - Evaluation/runtime errors
- **Total Active Tests**: 185 (7 quarantined for plugins/JS execution)

**Overall Success Rate**: 37.3% passing
**Compilation Rate**: 90.3% (167/185 tests compile successfully)

---

## 🎉 Parser Status: ALL FIXED!

All parser bugs have been resolved. The parser correctly handles the full LESS syntax:
- ✅ Comments and comment preservation
- ✅ Import statements (inline, reference, remote, modules)
- ✅ Media queries (including simple `@media (hover)`)
- ✅ Boolean/if functions with nested conditions
- ✅ Detached rulesets and variable calls
- ✅ Each() function with detached ruleset arguments

**Remaining work is in runtime evaluation and functional implementation, NOT parsing.**

---

## Categories of Remaining Issues

### 1. Evaluation Errors (18 tests failing)

These tests compile successfully but crash during evaluation:

**Variable Evaluation**:
- `functions` - "Could not evaluate variable call @1"
- `detached-rulesets` - "Could not evaluate variable call @ruleset"
- `functions-each` - "variable @msgs is undefined"

**Mixin/Namespace Resolution**:
- `import-reference-issues` - "#Namespace > .mixin is undefined"
- `mixins` - Various mixin-related evaluation errors
- `mixins-args` - Mixin argument binding issues
- `mixins-closure` - Closure/scope issues
- `mixins-interpolated` - Variable interpolation in mixin names
- `namespacing-6` - Namespace resolution failures
- `namespacing-functions` - Functions within namespaces

**Import Issues**:
- `import-interpolation` - Variable interpolation in import paths (architectural - deferred)
- `import-reference` - CSS import handling

**Other**:
- `urls` - URL processing issues
- `include-path` - Include path resolution
- `bootstrap4` - Large real-world test (multiple issues)

### 2. Output Differences (98 tests)

These tests compile and evaluate without errors, but produce incorrect CSS output:

**Common Issues**:
- Missing or incorrect CSS properties
- Wrong selector generation
- Incorrect operator precedence
- Missing extend resolution
- Guard evaluation differences
- Import content not properly inserted

**Test Categories**:
- Math operations (strict mode, parens-division)
- Guards and conditionals
- Extend functionality
- Compression/minification
- Source maps
- URL rewriting
- Custom properties

---

## Priority Fix Order

### Phase 1: Core Evaluation (High Impact)
1. **Variable evaluation in function contexts** - Fixes `functions`, `functions-each`
2. **Detached ruleset variable calls** - Fixes `detached-rulesets`
3. **Mixin argument binding** - Fixes `mixins-args`
4. **Mixin scope/closure** - Fixes `mixins-closure`

### Phase 2: Import & Reference (Medium Impact)
5. **Import reference functionality** - Fixes `import-reference`, `import-reference-issues`
6. **CSS import handling** - Proper @import generation
7. **Namespace resolution** - Fixes `namespacing-6`, `namespacing-functions`

### Phase 3: Complex Features (Lower Impact)
8. **Mixin interpolation** - Fixes `mixins-interpolated`
9. **URL processing** - Fixes `urls`
10. **Large integration tests** - `bootstrap4`

### Phase 4: Output Differences (98 tests)
11. **Systematic fixes** - Group by similar issues, fix category by category

---

## Detailed Issue Analysis

### Issue #1: Variable Evaluation in Functions

**Tests Affected**: `functions`, `functions-each`

**Problem**: Variables defined in outer scopes aren't accessible within function evaluation contexts.

**Example**:
```less
@1: 10px;
.test {
  width: custom(@1);  // Error: "Could not evaluate variable call @1"
}
```

**Investigation Needed**:
- Check how `*Eval` context manages variable frames
- Verify function call creates proper evaluation context
- Compare with JavaScript implementation of function evaluation

**Files to Check**:
- `variable.go` - Variable resolution logic
- `call.go` - Function call evaluation
- `eval.go` - Evaluation context management

---

### Issue #2: Detached Ruleset Variable Calls

**Test Affected**: `detached-rulesets`

**Problem**: Detached rulesets stored in variables can't be called with `@var()` syntax.

**Example**:
```less
@ruleset: {
  color: black;
}
@ruleset();  // Error: "Could not evaluate variable call @ruleset"
```

**Investigation Needed**:
- Parser correctly creates VariableCall nodes ✅
- Need to implement evaluation logic for VariableCall nodes
- Check if detached rulesets are properly stored in variable scope

**Files to Check**:
- `variable_call.go` - Variable call evaluation
- `detached_ruleset.go` - Detached ruleset storage/retrieval
- `ruleset.go` - Ruleset evaluation

---

### Issue #3: Import Reference Functionality

**Tests Affected**: `import-reference`, `import-reference-issues`

**Problem**: Files imported with `(reference)` option aren't being handled correctly.

**Expected Behavior**:
- Referenced imports should not output CSS by default
- Only output referenced selectors when explicitly used via extend or mixins
- CSS files should remain as `@import` statements

**Investigation Needed**:
- Check if `reference` option is preserved during import
- Verify visibility flags are set correctly
- Compare with JavaScript import visitor logic

**Files to Check**:
- `import.go` - Import option handling
- `import_visitor.go` - Import processing
- `import_manager.go` - Import resolution

---

### Issue #4: Namespace Resolution

**Tests Affected**: `namespacing-6`, `namespacing-functions`

**Problem**: Namespace lookups like `#Namespace > .mixin` fail to resolve.

**Example**:
```less
#namespace {
  .mixin() { color: red; }
}
.test {
  #namespace > .mixin();  // Error: "#Namespace > .mixin is undefined"
}
```

**Investigation Needed**:
- Check namespace lookup logic
- Verify ruleset indexing for namespace resolution
- Compare with JavaScript namespace implementation

**Files to Check**:
- `namespace_value.go` - Namespace value resolution
- `mixin_call.go` - Mixin lookup with namespace
- `ruleset.go` - Namespace structure

---

## Testing Strategy

### For Each Fix:

1. **Create Minimal Test Case**
   ```bash
   cat > /tmp/test.less << 'EOF'
   # Minimal reproduction of the issue
   EOF
   ```

2. **Run Specific Test**
   ```bash
   pnpm -w test:go:filter -- "test-name"
   ```

3. **Debug with Trace**
   ```bash
   LESS_GO_TRACE=1 go test -run "TestIntegrationSuite/main/test-name" -v
   ```

4. **Verify No Regressions**
   ```bash
   pnpm -w test:go:unit  # All unit tests
   pnpm -w test:go:summary  # Integration test overview
   ```

---

## Debug Tools Available

- **LESS_GO_TRACE=1** - Enhanced execution tracing with call stacks
- **LESS_GO_DEBUG=1** - Enhanced error reporting
- **LESS_GO_DIFF=1** - Visual CSS diffs
- **pnpm -w test:go:debug** - Combined debug features
- **pnpm -w test:go:filter -- "pattern"** - Run specific tests

---

## Success Criteria

### Short Term (Core Evaluation)
- [ ] Fix 18 failing tests → reduce to <10
- [ ] Success rate: 37.3% → 50%+
- [ ] All variable evaluation issues resolved

### Medium Term (Import & Features)
- [ ] Fix import reference functionality
- [ ] Fix namespace resolution
- [ ] Success rate: 50% → 75%+

### Long Term (Output Differences)
- [ ] Reduce "output differs" from 98 → <30
- [ ] Success rate: 75% → 95%+
- [ ] Perfect CSS match rate: 7% → 50%+

### Ultimate Goal
- [ ] All 185 active tests passing (100%)
- [ ] Implement quarantined features (plugins, JS execution)
- [ ] All 192 tests passing

---

## Notes

- Keep IMPORT_INTERPOLATION_INVESTIGATION.md - that issue is deferred pending architecture refactor
- Trace infrastructure is fully functional and very helpful for debugging
- All parser code is working correctly - focus on `eval()` methods and variable resolution
- Compare with JavaScript implementation when stuck - behavior should match exactly
