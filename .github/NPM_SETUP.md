# NPM Publishing Setup

This document explains how to configure the GitHub workflow to automatically publish to npm.

## Prerequisites

1. An npm account at https://www.npmjs.com
2. Package name `realtimex-crm` must be available or you own it
3. GitHub repository with Actions enabled

## Setup Steps

### 1. Generate npm Access Token

1. Log in to https://www.npmjs.com
2. Click on your profile icon → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** (for CI/CD publishing)
5. Copy the token (starts with `npm_...`)

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

### 3. Verify Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## How the Workflow Works

### Automatic Publishing (on push to main)

When you push to the `main` branch:

1. **Version Bump Logic** (based on conventional commits):
   - `feat!:` or `BREAKING CHANGE:` → **major** (1.0.0 → 2.0.0)
   - `feat:` → **minor** (1.0.0 → 1.1.0)
   - `fix:`, `chore:`, etc. → **patch** (1.0.0 → 1.0.1)

2. **Build & Test**:
   - Runs `npm test`
   - Runs `npm run typecheck`
   - Runs `npm run lint`

3. **Publish**:
   - Bumps version in `package.json`
   - Commits version change with `[skip ci]`
   - Creates git tag (e.g., `v1.2.3`)
   - Publishes to npm
   - Creates GitHub release

### Manual Publishing (workflow_dispatch)

You can manually trigger publishing:

1. Go to **Actions** → **Publish to npm**
2. Click **Run workflow**
3. Select version bump: `patch`, `minor`, or `major`
4. Click **Run workflow**

## Conventional Commit Examples

```bash
# Patch version (1.0.0 → 1.0.1)
git commit -m "fix: resolve database connection issue"
git commit -m "chore: update dependencies"

# Minor version (1.0.0 → 1.1.0)
git commit -m "feat: add dark mode support"
git commit -m "feat(ui): add new dashboard widget"

# Major version (1.0.0 → 2.0.0)
git commit -m "feat!: redesign authentication system"
git commit -m "fix!: change API response format

BREAKING CHANGE: API now returns data in new format"
```

## Skip CI

To push changes without triggering the workflow:

```bash
git commit -m "docs: update README [skip ci]"
```

Or push to a branch other than `main`.

## Troubleshooting

### "npm publish failed: 403"
- Verify your npm token has **Automation** permissions
- Check if package name is available/owned by you
- Ensure `NPM_TOKEN` secret is set correctly

### "Permission denied to create release"
- Check **Workflow permissions** are set to **Read and write**
- Ensure `GITHUB_TOKEN` has correct scopes

### "Version already exists"
- The workflow automatically bumps versions
- If manually bumped, ensure tag doesn't exist: `git tag -d v1.2.3`

### "Tests/typecheck failed"
- Fix the errors locally first
- Run `npm test`, `npm run typecheck`, `npm run lint`
- Commit fixes and push again

## Package Visibility

The package is published with `--access public`. To change:

Edit `.github/workflows/publish.yml`:
```yaml
- name: Publish to npm
  run: npm publish --access restricted  # For scoped private packages
```

## Version History

All versions are tracked in:
- **npm**: https://www.npmjs.com/package/realtimex-crm?activeTab=versions
- **GitHub Releases**: https://github.com/ledangtrung/atomic-crm/releases
- **Git Tags**: `git tag -l`

## Testing the Workflow

Before the first publish, test locally:

```bash
# Dry run
npm publish --dry-run

# Check what files will be published
npm pack
tar -xvzf realtimex-crm-*.tgz
```
