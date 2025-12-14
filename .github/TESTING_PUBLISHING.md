# Testing the Publishing Flow

This guide explains how to test the publishing workflow without actually publishing to npm.

## Dry Run Mode

The publishing script supports a dry-run mode that shows what would happen without making any changes:

```bash
# Test from master branch
git checkout master
DRY_RUN=true pnpm run publish

# Or use the flag
pnpm run publish --dry-run
```

Dry-run mode will:
- ✅ Show what version would be created
- ✅ Show what packages would be published
- ✅ Show what git operations would happen
- ❌ **NOT** commit any changes
- ❌ **NOT** create git tags
- ❌ **NOT** push to remote
- ❌ **NOT** publish to npm

## Testing Locally

### 1. Test Version Calculation

```bash
# Check current version
node -p "require('./packages/less/package.json').version"

# Run dry-run to see what version would be created
DRY_RUN=true pnpm run publish
```

### 2. Test Branch Validation

```bash
# Try from a feature branch (should fail)
git checkout -b test-branch
pnpm run publish
# Should error: "Publishing is only allowed from 'master' or 'alpha' branches"
```

### 3. Test Alpha Branch Validations

```bash
# Switch to alpha branch
git checkout alpha

# Test with dry-run
DRY_RUN=true GITHUB_REF_NAME=alpha pnpm run publish

# This will show:
# - Version validation (must contain -alpha.)
# - Master sync check
# - Version comparison with master
```

### 4. Test Version Override

```bash
# Test explicit version override
EXPLICIT_VERSION=4.5.0 DRY_RUN=true pnpm run publish
# Should show: "✨ Using explicit version: 4.5.0"
```

## Testing the GitHub Actions Workflow

### 1. Test Workflow Syntax

```bash
# Validate workflow YAML
gh workflow view publish.yml
# Or use act (local GitHub Actions runner)
act push -W .github/workflows/publish.yml
```

### 2. Test on a Test Branch

Create a test branch that mimics master/alpha:

```bash
# Create test branch from master
git checkout -b test-publish-master master

# Make a small change
echo "# test" >> TEST.md
git add TEST.md
git commit -m "test: publishing workflow"

# Push to trigger workflow (if you want to test the full flow)
# Note: This will actually try to publish if version changed!
```

### 3. Test Workflow Manually

You can manually trigger the workflow from GitHub Actions UI:
1. Go to Actions tab
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Select branch and run

**Warning**: This will actually publish if conditions are met!

## Testing Specific Scenarios

### Test Master Branch Publishing

```bash
git checkout master
DRY_RUN=true pnpm run publish

# Should show:
# - Patch version increment (e.g., 4.4.2 → 4.4.3)
# - Publishing with 'latest' tag
# - Regular release creation
```

### Test Alpha Branch Publishing

```bash
git checkout alpha
DRY_RUN=true GITHUB_REF_NAME=alpha pnpm run publish

# Should show:
# - Alpha version increment (e.g., 5.0.0-alpha.1 → 5.0.0-alpha.2)
# - Publishing with 'alpha' tag
# - Pre-release creation
# - All alpha validations passing
```

### Test Version Validation

```bash
# Test that alpha versions can't go to latest
# (This is enforced in the script, so it will fail before publishing)

# Test that non-alpha versions can't go to alpha tag
# (Also enforced in the script)
```

## Safe Testing Checklist

Before actually publishing:

- [ ] Run dry-run mode to verify version calculation
- [ ] Verify branch restrictions work (try from wrong branch)
- [ ] Test alpha validations (if testing alpha branch)
- [ ] Check that version override works (if needed)
- [ ] Verify package.json files would be updated correctly
- [ ] Review what git operations would happen
- [ ] Confirm npm tag assignment is correct

## Troubleshooting

### Script fails with "branch not allowed"

Make sure you're on `master` or `alpha` branch, or set `GITHUB_REF_NAME` environment variable:

```bash
GITHUB_REF_NAME=master DRY_RUN=true pnpm run publish
```

### Version calculation seems wrong

Check the current version in `packages/less/package.json`:

```bash
node -p "require('./packages/less/package.json').version"
```

### Alpha validations failing

Make sure:
- Alpha branch is up-to-date with master
- Current version contains `-alpha.`
- Alpha base version is >= master version

## Real Publishing Test (Use with Caution)

If you want to test the actual publishing flow:

1. **Use a test npm package** (create a scoped package like `@your-username/less-test`)
2. **Temporarily modify the script** to use your test package name
3. **Test on a separate branch** that won't trigger the workflow
4. **Clean up** after testing

**Never test on the actual `less` package unless you're ready to publish!**
