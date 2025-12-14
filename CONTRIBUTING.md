# Contributing to Less.js

Thank you for your interest in contributing to Less.js! Contributions come in many forms—fixing bugs, improving code quality, enhancing tooling, updating documentation, and occasionally adding new features. This guide will help you get started.

## Getting Started

Before you begin, please note: **Words that begin with the at sign (`@`) must be wrapped in backticks!** This prevents unintended notifications to GitHub users. For example, use `` `@username` `` instead of `@username`.

GitHub has many great markdown features—[learn more about them here](https://help.github.com/articles/github-flavored-markdown).

## Reporting Issues

We welcome bug reports and feature requests! To help us help you, please follow these guidelines:

1. **Search for existing issues first.** Many issues have already been reported or resolved. Checking first saves everyone time.
2. **Create an isolated and reproducible test case.** Include [reduced test cases](http://css-tricks.com/reduced-test-cases/) that demonstrate the problem clearly.
3. **Test with the latest version.** Many issues are resolved in newer versions—please update first.
4. **Include examples with source code.** You can use [Less Preview](http://lesscss.org/less-preview/) to create a short test case.
5. **Share as much information as possible.** Include:
   - Operating system and version
   - How you're using Less (browser, command line, build tool, etc.)
   - Browser and version (if applicable)
   - Version of Less.js you're using
   - Clear steps to reproduce the issue
6. **Suggest solutions if you have them.** If you know how to fix it, share your approach or submit a pull request!

Please report documentation issues in [the documentation project](https://github.com/less/less-docs).

## Feature Requests

When suggesting features:

* **Search existing feature requests first** to see if something similar already exists. Many features are already planned or under consideration.
* **Include a clear and specific use-case.** Help us understand the practical need and how it would be used.
* **Consider alternatives.** Sometimes a function or a 3rd-party build system might be a better fit than a core language feature.

**Note:** Most helpful contributions to Less.js are organizational—addressing bugs, improving code quality, enhancing tooling, and updating documentation. The language features are generally stable, even if not all planned features have been implemented yet.

## Pull Requests

Pull requests are welcome! Here's how to make them go smoothly:

* **For new features, start with a feature request** to get feedback and see how your idea is received.
* **If your PR solves an existing issue**, but approaches it differently, please create a new issue first and discuss it with core contributors. This helps avoid wasted effort.
* **Don't modify the `./dist/` folder**—we handle that during releases.
* **Please add tests** for your work. Run tests using `npm test`, which runs both Node.js and browser (Headless Chrome) tests.

### Coding Standards

* Always use spaces, never tabs
* End lines with semicolons
* Aim for ESLint standards

## Developing

If you want to work on an issue, add a comment saying you're taking it on—this helps prevent duplicate work.

Learn more about [developing Less.js](http://lesscss.org/usage/#developing-less).

## Releases

Releases are fully automated! Here's how it works:

### Automated Publishing

When code is pushed to specific branches, GitHub Actions automatically:

1. **Runs tests and builds** the project
2. **Bumps the version** automatically
3. **Publishes to npm** with the appropriate tag
4. **Creates a GitHub release**

### Release Branches

- **`master` branch**: 
  - Publishes regular releases (e.g., `4.4.2` → `4.4.3`)
  - Published to npm with `latest` tag
  - Creates regular GitHub releases
  - Version auto-increments by patch unless explicitly set

- **`alpha` branch**:
  - Publishes alpha releases (e.g., `5.0.0-alpha.1` → `5.0.0-alpha.2`)
  - Published to npm with `alpha` tag
  - Creates GitHub pre-releases
  - Version auto-increments alpha suffix

### How to Publish

**For regular releases:**
1. Update version in `packages/less/package.json` (or let it auto-increment)
2. Commit and push to `master`
3. The workflow automatically publishes if the version changed

**For alpha releases:**
1. Make your changes on the `alpha` branch
2. Commit and push
3. The workflow automatically increments the alpha version and publishes

### Version Override

You can override auto-increment by including a version in your commit message:

```
feat: new feature

version: 4.5.0
```

### Security

We use npm's [trusted publishing](https://docs.npmjs.com/trusted-publishers) with OIDC authentication. This means:
- No long-lived tokens needed
- Automatic provenance generation
- Enhanced security through short-lived, workflow-specific credentials

The publishing workflow (`.github/workflows/publish.yml`) handles both release types automatically.

### Important Notes

- Publishing only works from `master` or `alpha` branches
- Alpha versions must contain `-alpha.` and are published to the `alpha` tag
- Regular versions are published to the `latest` tag
- Alpha branch must be up-to-date with master before publishing
- Alpha base version must be >= master version (semver)

---

Thank you for contributing to Less.js!
