const fs = require('fs');
const path = require('path');

/**
 * Script to fix Next.js 15 async params and CSRF placement in API routes
 * 
 * Fixes two issues:
 * 1. CSRF protection incorrectly placed in function parameter list
 * 2. params need to be Promise<{...}> for Next.js 15
 */

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

let filesProcessed = 0;
let filesModified = 0;
let filesSkipped = 0;
let errors = [];

function log(message, level = 'info') {
    if (level === 'error') {
        logger.error(`❌ ${message}`);
    } else if (level === 'success') {
        logger.info(`✅ ${message}`);
    } else if (level === 'warn') {
        logger.info(`⚠️  ${message}`);
    } else if (VERBOSE || level === 'info') {
        logger.info(`ℹ️  ${message}`);
    }
}

function findRouteFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findRouteFiles(filePath, fileList);
        } else if (file === 'route.ts') {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function fixRouteFile(filePath) {
    filesProcessed++;

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Normalize line endings to \n for processing
        content = content.replace(/\r\n/g, '\n');

        // Check if file has the broken pattern (CSRF in params)
        const hasBrokenPattern = content.includes('  // CSRF protection\n  await requireCSRF(request);\nparams }');

        if (!hasBrokenPattern) {
            log(`Skipping ${path.relative(process.cwd(), filePath)} - no broken pattern`, 'debug');
            filesSkipped++;
            return;
        }

        log(`Fixing ${path.relative(process.cwd(), filePath)}`, 'info');

        // Step 1: Fix the function signature
        // Remove CSRF from params and fix params type
        content = content.replace(
            /(\s+request:\s*NextRequest,\s*\n\s+{\s*\n\s+\/\/\s*CSRF protection\s*\n\s+await requireCSRF\(request\);\s*\n)(params\s*}:\s*{\s*params:\s*)(Promise<)?({[^}]+})(>)?(\s*})/g,
            (match, before, paramsPart, promise1, type, promise2, after) => {
                // Return fixed signature
                return `  request: NextRequest,\n  { params }: { params: Promise<${type}> }`;
            }
        );

        // Step 2: Add CSRF protection at start of try block if it's not there
        if (!content.match(/try\s*{\s*\n\s*\/\/\s*CSRF protection/)) {
            content = content.replace(
                /(\)\s*{\s*\n\s*)try\s*{\s*\n/,
                '$1try {\n    // CSRF protection\n    await requireCSRF(request);\n'
            );
        }

        // Step 3: Find params usage and create await destructure
        const paramAccessMatches = [...content.matchAll(/params\.(\w+)/g)];
        const paramProps = [...new Set(paramAccessMatches.map(m => m[1]))];

        if (paramProps.length > 0) {
            const hasAwaitParams = content.includes('= await params;');

            if (!hasAwaitParams) {
                const destructure = `const { ${paramProps.join(', ')} } = await params;`;

                // Insert after CSRF call
                content = content.replace(
                    /(await requireCSRF\(request\);)\s*\n/,
                    `$1\n    ${destructure}\n`
                );

                // Replace all params.xxx with just xxx
                paramProps.forEach(prop => {
                    content = content.replace(new RegExp(`params\\.${prop}`, 'g'), prop);
                });
            }
        }

        if (originalContent !== content) {
            if (!DRY_RUN) {
                // Restore original line endings
                const hasWindowsLineEndings = originalContent.includes('\r\n');
                if (hasWindowsLineEndings) {
                    content = content.replace(/\n/g, '\r\n');
                }
                fs.writeFileSync(filePath, content, 'utf8');
            }
            filesModified++;
            log(`Modified ${path.relative(process.cwd(), filePath)}`, 'success');
        } else {
            filesSkipped++;
        }

    } catch (error) {
        errors.push({ file: filePath, error: error.message });
        log(`Error processing ${filePath}: ${error.message}`, 'error');
    }
}

function main() {
    logger.info('🔧 Next.js 15 API Route Fixer\n');

    if (DRY_RUN) {
        logger.info('🌵 DRY RUN MODE - No files will be modified\n');
    }

    const apiDir = path.join(__dirname, 'app', 'api');

    if (!fs.existsSync(apiDir)) {
        logger.error('❌ API directory not found:', apiDir);
        process.exit(1);
    }

    log(`Scanning ${apiDir} for route.ts files...`, 'info');

    const routeFiles = findRouteFiles(apiDir);

    logger.info(`\n📁 Found ${routeFiles.length} route files\n`);

    routeFiles.forEach(fixRouteFile);

    logger.info('\n' + '='.repeat(60));
    logger.info('📊 Summary:');
    logger.info('='.repeat(60));
    logger.info(`Total files processed: ${filesProcessed}`);
    logger.info(`Files modified: ${filesModified}`);
    logger.info(`Files skipped: ${filesSkipped}`);
    logger.info(`Errors: ${errors.length}`);

    if (errors.length > 0) {
        logger.info('\n❌ Errors encountered:');
        errors.forEach(({ file, error }) => {
            logger.info(`  - ${path.basename(file)}: ${error}`);
        });
    }

    if (DRY_RUN) {
        logger.info('\n💡 Run without --dry-run to apply changes');
    } else if (filesModified > 0) {
        logger.info('\n✅ Files have been modified. Run "npx next build" to verify.');
    }

    logger.info('='.repeat(60) + '\n');
}

main();
