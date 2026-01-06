#!/usr/bin/env node

/**
 * Script to automatically add rate limiting to all API routes
 * This script analyzes each route.ts file and adds appropriate rate limiting
 * based on the route type and sensitivity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Rate limit configurations for different route types
const RATE_LIMIT_CONFIG = {
  // Critical admin routes - strictest limits
  admin: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: 'Admin routes: 10 requests per minute'
  },
  // AI routes - expensive operations
  ai: {
    windowMs: 60000,
    maxRequests: 5,
    message: 'AI routes: 5 requests per minute'
  },
  // Payment routes - financial sensitivity
  payments: {
    windowMs: 60000,
    maxRequests: 20,
    message: 'Payment routes: 20 requests per minute'
  },
  stripe: {
    windowMs: 60000,
    maxRequests: 20,
    message: 'Stripe routes: 20 requests per minute'
  },
  // Auth routes - prevent brute force
  auth: {
    windowMs: 60000,
    maxRequests: 5,
    message: 'Auth routes: 5 requests per minute'
  },
  // Webhook routes
  webhooks: {
    windowMs: 60000,
    maxRequests: 100,
    message: 'Webhook routes: 100 requests per minute'
  },
  // Cron jobs
  cron: {
    windowMs: 60000,
    maxRequests: 1,
    message: 'Cron routes: 1 request per minute'
  },
  // General API routes
  general: {
    windowMs: 60000,
    maxRequests: 30,
    message: 'General routes: 30 requests per minute'
  }
};

// Determine rate limit config based on route path
function getRateLimitConfig(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  if (normalizedPath.includes('/admin/')) return RATE_LIMIT_CONFIG.admin;
  if (normalizedPath.includes('/ai/') || normalizedPath.includes('/openai/')) return RATE_LIMIT_CONFIG.ai;
  if (normalizedPath.includes('/payments/') || normalizedPath.includes('/escrow/')) return RATE_LIMIT_CONFIG.payments;
  if (normalizedPath.includes('/stripe/')) return RATE_LIMIT_CONFIG.stripe;
  if (normalizedPath.includes('/auth/')) return RATE_LIMIT_CONFIG.auth;
  if (normalizedPath.includes('/webhooks/')) return RATE_LIMIT_CONFIG.webhooks;
  if (normalizedPath.includes('/cron/')) return RATE_LIMIT_CONFIG.cron;

  return RATE_LIMIT_CONFIG.general;
}

// Check if file already has rate limiting
function hasRateLimiting(content) {
  return content.includes('rateLimiter') ||
         content.includes('checkRateLimit') ||
         content.includes('checkApiRateLimit') ||
         content.includes('checkAIAnalysisRateLimit') ||
         content.includes('checkLoginRateLimit');
}

// Add rate limiting import if not present
function addRateLimitImport(content) {
  // Check if import already exists
  if (content.includes("from '@/lib/rate-limiter'") ||
      content.includes('from "@/lib/rate-limiter"')) {
    return content;
  }

  // Find the right place to add import (after other imports)
  const importRegex = /^import .* from ['"].*/m;
  const lastImportMatch = content.match(/^import .* from ['"].*$/gm);

  if (lastImportMatch && lastImportMatch.length > 0) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const importStatement = `\nimport { rateLimiter } from '@/lib/rate-limiter';`;
    return content.replace(lastImport, lastImport + importStatement);
  } else {
    // Add at the beginning if no imports found
    return `import { rateLimiter } from '@/lib/rate-limiter';\n` + content;
  }
}

// Add rate limiting check to a handler function
function addRateLimitCheck(handlerContent, config, identifier) {
  const rateLimitCode = `
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: \`\${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:\${request.url}\`,
    windowMs: ${config.windowMs},
    maxRequests: ${config.maxRequests}
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(${config.maxRequests}),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }
`;

  // Find the first line after the function declaration and any try statement
  const tryMatch = handlerContent.match(/\s*try\s*{/);
  if (tryMatch) {
    // Add after try {
    return handlerContent.replace(/(\s*try\s*{)/, `$1${rateLimitCode}`);
  } else {
    // Add at the beginning of the function body
    const functionBodyMatch = handlerContent.match(/(export\s+async\s+function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{)/);
    if (functionBodyMatch) {
      return handlerContent.replace(functionBodyMatch[1], functionBodyMatch[1] + rateLimitCode);
    }
  }

  return handlerContent;
}

// Process a single route file
function processRouteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has rate limiting
    if (hasRateLimiting(content)) {
      console.log(`✅ Already has rate limiting: ${filePath}`);
      return { status: 'already_protected', path: filePath };
    }

    // Get appropriate rate limit config
    const config = getRateLimitConfig(filePath);

    // Add import statement
    content = addRateLimitImport(content);

    // Process each HTTP method handler
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    let modified = false;

    for (const method of methods) {
      const handlerRegex = new RegExp(`(export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\s*{[\\s\\S]*?^})`, 'gm');
      const handlerMatch = content.match(handlerRegex);

      if (handlerMatch) {
        const originalHandler = handlerMatch[0];
        const modifiedHandler = addRateLimitCheck(originalHandler, config, method.toLowerCase());

        if (originalHandler !== modifiedHandler) {
          content = content.replace(originalHandler, modifiedHandler);
          modified = true;
        }
      }
    }

    if (modified) {
      // Write the modified content back
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Added rate limiting to: ${filePath} (${config.message})`);
      return { status: 'protected', path: filePath, config: config.message };
    } else {
      console.log(`⚠️  No handlers found in: ${filePath}`);
      return { status: 'no_handlers', path: filePath };
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return { status: 'error', path: filePath, error: error.message };
  }
}

// Find all route files
function findRouteFiles() {
  const apiDir = path.join(process.cwd(), 'apps', 'web', 'app', 'api');
  const files = [];

  function walkDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item === 'route.ts') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }

  walkDir(apiDir);
  return files;
}

// Main execution
async function main() {
  console.log('=== ADDING RATE LIMITING TO ALL API ROUTES ===\n');

  // Find all route files
  const routeFiles = findRouteFiles();
  console.log(`Found ${routeFiles.length} API route files\n`);

  // Process statistics
  const stats = {
    already_protected: [],
    protected: [],
    no_handlers: [],
    error: []
  };

  // Process each file
  for (const filePath of routeFiles) {
    const result = processRouteFile(filePath);
    stats[result.status].push(result);
  }

  // Print summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`✅ Already protected: ${stats.already_protected.length} routes`);
  console.log(`✅ Newly protected: ${stats.protected.length} routes`);
  console.log(`⚠️  No handlers found: ${stats.no_handlers.length} routes`);
  console.log(`❌ Errors: ${stats.error.length} routes`);

  // List newly protected routes
  if (stats.protected.length > 0) {
    console.log('\n=== NEWLY PROTECTED ROUTES ===');
    stats.protected.forEach(r => {
      const shortPath = r.path.replace(/.*\/api\//, 'api/');
      console.log(`  - ${shortPath} (${r.config})`);
    });
  }

  // List errors if any
  if (stats.error.length > 0) {
    console.log('\n=== ERRORS ===');
    stats.error.forEach(r => {
      const shortPath = r.path.replace(/.*\/api\//, 'api/');
      console.log(`  - ${shortPath}: ${r.error}`);
    });
  }

  console.log('\n✅ Rate limiting addition complete!');
  console.log(`Total routes protected: ${stats.already_protected.length + stats.protected.length}/${routeFiles.length}`);

  // Create a report file
  const report = {
    timestamp: new Date().toISOString(),
    total_routes: routeFiles.length,
    already_protected: stats.already_protected.length,
    newly_protected: stats.protected.length,
    no_handlers: stats.no_handlers.length,
    errors: stats.error.length,
    protected_routes: stats.protected.map(r => ({
      path: r.path.replace(/.*\/api\//, 'api/'),
      config: r.config
    })),
    error_details: stats.error
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'rate-limiting-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  console.log('\n📊 Detailed report saved to: rate-limiting-report.json');
}

// Run the script
main().catch(console.error);