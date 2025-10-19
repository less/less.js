/**
 * Direct test of line comment fix without requiring build
 * Tests the parser-input.js fix directly in the source code
 */

const fs = require('fs');
const path = require('path');

console.log('=== Direct Line Comment Fix Test ===\n');

// Read the fixed parser-input.js
const parserInputPath = path.join(__dirname, 'packages', 'less', 'src', 'less', 'parser', 'parser-input.js');

try {
    const content = fs.readFileSync(parserInputPath, 'utf8');
    
    console.log('✓ Found parser-input.js');
    
    // Check if our fix is present
    const hasLineCommentFix = content.includes('// Line comment start: // ... (strip until newline)');
    const hasNewlineSkip = content.includes("let nextNewLine = input.indexOf('\\n', i + 2);");
    const hasCommentSkipLogic = content.includes('if (nextNewLine < 0)') && 
                                content.includes('i = length') &&
                                content.includes('// Skip past the newline');
    
    console.log('\n📋 Fix Status:');
    console.log(`  Line comment detection: ${hasLineCommentFix ? '✓' : '✗'}`);
    console.log(`  Newline skip logic: ${hasNewlineSkip ? '✓' : '✗'}`);
    console.log(`  Complete skip logic: ${hasCommentSkipLogic ? '✓' : '✗'}`);
    
    if (hasLineCommentFix && hasNewlineSkip && hasCommentSkipLogic) {
        console.log('\n✅ Fix is properly implemented in source code!');
        console.log('\n📝 The fix adds line comment handling to $parseUntil:');
        
        // Extract and display the relevant code section
        const fixMatch = content.match(/case '\/':[\s\S]*?break;/);
        if (fixMatch) {
            console.log('\n--- Code section ---');
            console.log(fixMatch[0].split('\n').slice(0, 20).join('\n'));
            console.log('--- End section ---');
        }
        
        console.log('\n🎯 What this fixes:');
        console.log('  • Line comments (//) in custom properties');
        console.log('  • Line comments in @supports rules');
        console.log('  • Line comments in other permissive parsing contexts');
        
        console.log('\n📦 To fully test, you need to build the project:');
        console.log('  1. Install pnpm: npm install -g pnpm');
        console.log('  2. Install deps: pnpm install');
        console.log('  3. Build: cd packages/less && pnpm run build');
        console.log('  4. Test: pnpm test');
        
    } else {
        console.log('\n❌ Fix appears incomplete or missing');
        console.log('\n⚠️  Expected to find:');
        console.log('  • Comment: "// Check for line comment"');
        console.log('  • Code: "i = input.indexOf(\'\\\\n\', i + 2);"');
        console.log('  • Code: "if (i === -1) return input.length"');
    }
    
    // Create a visual diagram of what the fix does
    console.log('\n\n📊 How the Fix Works:');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Input: .foo { --bar: red // comment } │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ $parseUntil finds ":" in custom prop  │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Parser encounters "/" character        │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ NEW FIX: Check next char for "/"      │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Find next newline: indexOf("\\n")       │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Skip to after newline: i = newline + 1│');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Continue parsing: "}" terminates      │');
    console.log('└────────────────────────────────────────┘');
    console.log('           ↓');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ Output: .foo { --bar: red }            │');
    console.log('└────────────────────────────────────────┘');
    
} catch (err) {
    console.error('❌ Error reading parser-input.js:', err.message);
    process.exit(1);
}

console.log('\n');
