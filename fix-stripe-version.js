const fs = require('fs');
const path = require('path');

const targetVersion = '2024-04-10';
const invalidVersion = '2025-09-30.clover';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                walkDir(filePath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(invalidVersion)) {
                console.log(`Fixing ${filePath}`);
                const newContent = content.replace(new RegExp(invalidVersion, 'g'), targetVersion);
                fs.writeFileSync(filePath, newContent);
            }
        }
    });
}

walkDir(path.join(__dirname, 'apps/web'));
walkDir(path.join(__dirname, 'apps/web/lib')); // Just in case, though apps/web covers it if run from root
