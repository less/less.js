#!/usr/bin/env node

/**
 * Post-install script for Less.js package
 * 
 * This script installs Playwright browsers only when:
 * 1. This is a development environment (not when installed as a dependency)
 * 2. We're in a monorepo context (parent package.json exists)
 * 3. Not running in CI or other automated environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if we're in a development environment
function isDevelopmentEnvironment() {
    // Skip if this is a global install or user config
    if (process.env.npm_config_user_config || process.env.npm_config_global) {
        return false;
    }
    
    // Skip in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.TRAVIS) {
        return false;
    }
    
    // Check if we're in a monorepo (parent package.json exists)
    const parentPackageJson = path.join(__dirname, '../../../package.json');
    if (!fs.existsSync(parentPackageJson)) {
        return false;
    }
    
    // Check if this is the root of the monorepo
    const currentPackageJson = path.join(__dirname, '../package.json');
    if (!fs.existsSync(currentPackageJson)) {
        return false;
    }
    
    return true;
}

// Install Playwright browsers
function installPlaywrightBrowsers() {
    try {
        console.log('🎭 Installing Playwright browsers for development...');
        execSync('pnpm exec playwright install', { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        console.log('✅ Playwright browsers installed successfully');
    } catch (error) {
        console.warn('⚠️  Failed to install Playwright browsers:', error.message);
        console.warn('   You can install them manually with: pnpm exec playwright install');
    }
}

// Main execution
if (isDevelopmentEnvironment()) {
    installPlaywrightBrowsers();
}
