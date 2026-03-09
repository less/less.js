#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isDevelopmentEnvironment() {
    if (process.env.npm_config_user_config || process.env.npm_config_global) {
        return false;
    }
    if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.TRAVIS) {
        return false;
    }
    const parentPackageJson = path.join(__dirname, '../../../package.json');
    if (!fs.existsSync(parentPackageJson)) {
        return false;
    }
    const currentPackageJson = path.join(__dirname, '../package.json');
    if (!fs.existsSync(currentPackageJson)) {
        return false;
    }
    return true;
}

function installPlaywrightBrowsers() {
    try {
        console.log('Installing Playwright browsers for development...');
        execSync('pnpm exec playwright install', {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        console.log('Playwright browsers installed successfully');
    } catch (error) {
        console.warn('Failed to install Playwright browsers:', error.message);
        console.warn('You can install them manually with: pnpm exec playwright install');
    }
}

if (isDevelopmentEnvironment()) {
    installPlaywrightBrowsers();
}
