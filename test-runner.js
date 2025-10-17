// Simple test runner for the Less.js fixes
const fs = require('fs');
const path = require('path');

console.log('=== Testing Less.js Fixes ===\n');

// Test 1: Check if our changes are in the source files
console.log('1. Checking if fixes are applied...');

const numberJsPath = path.join(__dirname, 'packages', 'less', 'src', 'less', 'functions', 'number.js');
const operationJsPath = path.join(__dirname, 'packages', 'less', 'src', 'less', 'tree', 'operation.js');

try {
    const numberJs = fs.readFileSync(numberJsPath, 'utf8');
    const operationJs = fs.readFileSync(operationJsPath, 'utf8');
    
    // Check for our fixes
    const hasCallImport = numberJs.includes("import Call from '../tree/call'");
    const hasNonDimensionFlag = numberJs.includes('hasNonDimension');
    const hasImprovedCatch = numberJs.includes('return new Anonymous(`min(${argsCSS})`);');
    
    const hasCallImportOp = operationJs.includes("import Call from './call'");
    const hasAnonymousImportOp = operationJs.includes("import Anonymous from './anonymous'");
    const hasCSSVarCheck = operationJs.includes('a instanceof Call || b instanceof Call');
    
    console.log('✓ number.js fixes:');
    console.log(`  - Call import: ${hasCallImport ? '✓' : '✗'}`);
    console.log(`  - hasNonDimension flag: ${hasNonDimensionFlag ? '✓' : '✗'}`);
    console.log(`  - Improved error handling: ${hasImprovedCatch ? '✓' : '✗'}`);
    
    console.log('\n✓ operation.js fixes:');
    console.log(`  - Call import: ${hasCallImportOp ? '✓' : '✗'}`);
    console.log(`  - Anonymous import: ${hasAnonymousImportOp ? '✓' : '✗'}`);
    console.log(`  - CSS variable check: ${hasCSSVarCheck ? '✓' : '✗'}`);
    
    console.log('\n2. Source code analysis:');
    
    // Show key sections
    console.log('\n--- Key section from number.js ---');
    const minFuncMatch = numberJs.match(/min: function\(\.\.\.args\) \{[\s\S]{0,300}\}/);
    if (minFuncMatch) {
        console.log(minFuncMatch[0].substring(0, 200) + '...');
    }
    
    console.log('\n--- Key section from operation.js ---');
    const opCheckMatch = operationJs.match(/if \(a instanceof Call \|\| b instanceof Call[\s\S]{0,200}\}/);
    if (opCheckMatch) {
        console.log(opCheckMatch[0]);
    }
    
    console.log('\n=== Summary ===');
    const allFixesApplied = hasCallImport && hasNonDimensionFlag && hasImprovedCatch && 
                           hasCallImportOp && hasAnonymousImportOp && hasCSSVarCheck;
    
    if (allFixesApplied) {
        console.log('✓ All fixes have been successfully applied to the source code!');
        console.log('\nNext steps:');
        console.log('1. Install dependencies (if not already done)');
        console.log('2. Build the project to compile TypeScript/ES6 to dist');
        console.log('3. Run tests to verify functionality');
        console.log('\nCommands:');
        console.log('  cd packages/less');
        console.log('  npm install');
        console.log('  npm run build');
        console.log('  npm test');
    } else {
        console.log('⚠ Some fixes may not be fully applied. Please review the changes.');
    }
    
} catch (error) {
    console.error('Error reading files:', error.message);
}
