#!/usr/bin/env node
/**
 * Web Bundle Analysis Script V2
 * Enhanced version with dependency graph analysis to detect indirect client dependencies
 *
 * Usage: node scripts/analyze-web-bundle-v2.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Patterns that require client components
const CLIENT_REQUIRED_PATTERNS = {
  hooks: [
    /useState\s*\(/,
    /useEffect\s*\(/,
    /useReducer\s*\(/,
    /useCallback\s*\(/,
    /useMemo\s*\(/,
    /useRef\s*\(/,
    /useContext\s*\(/,
    /useLayoutEffect\s*\(/,
    /useId\s*\(/,
    /useTransition\s*\(/,
    /useDeferredValue\s*\(/,
    /useImperativeHandle\s*\(/,
    /useDebugValue\s*\(/,
    /useSyncExternalStore\s*\(/,
    /useInsertionEffect\s*\(/,
    // Custom hooks
    /use[A-Z]\w+\s*\(/
  ],
  eventHandlers: [
    /onClick\s*[=:]/,
    /onChange\s*[=:]/,
    /onSubmit\s*[=:]/,
    /onFocus\s*[=:]/,
    /onBlur\s*[=:]/,
    /onKeyDown\s*[=:]/,
    /onKeyUp\s*[=:]/,
    /onKeyPress\s*[=:]/,
    /onMouseEnter\s*[=:]/,
    /onMouseLeave\s*[=:]/,
    /onMouseOver\s*[=:]/,
    /onMouseOut\s*[=:]/,
    /onMouseDown\s*[=:]/,
    /onMouseUp\s*[=:]/,
    /onMouseMove\s*[=:]/,
    /onScroll\s*[=:]/,
    /onResize\s*[=:]/,
    /onDrag\s*[=:]/,
    /onDrop\s*[=:]/,
    /onInput\s*[=:]/,
    /onLoad\s*[=:]/,
    /onError\s*[=:]/,
    /onTouchStart\s*[=:]/,
    /onTouchEnd\s*[=:]/,
    /onTouchMove\s*[=:]/,
    /onPointerDown\s*[=:]/,
    /onPointerUp\s*[=:]/,
    /onPointerMove\s*[=:]/
  ],
  browserAPIs: [
    /window\./,
    /document\./,
    /navigator\./,
    /localStorage\./,
    /sessionStorage\./,
    /location\./,
    /history\./,
    /screen\./,
    /alert\s*\(/,
    /confirm\s*\(/,
    /prompt\s*\(/,
    /console\./,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /IntersectionObserver/,
    /MutationObserver/,
    /ResizeObserver/,
    /requestAnimationFrame/,
    /cancelAnimationFrame/,
    /getComputedStyle/,
    /matchMedia/,
    /getBoundingClientRect/,
    /scrollIntoView/,
    /File\s+/,
    /FileReader/,
    /FormData/,
    /Blob\s+/,
    /URL\.createObjectURL/
  ],
  clientLibraries: [
    /framer-motion/,
    /react-hook-form/,
    /react-query|@tanstack\/react-query/,
    /swr/,
    /react-hot-toast/,
    /react-toastify/,
    /react-select/,
    /react-datepicker/,
    /react-beautiful-dnd/,
    /react-dnd/,
    /react-dropzone/,
    /react-intersection-observer/,
    /react-use/,
    /ahooks/,
    /@stripe\/stripe-js/,
    /mapbox-gl/,
    /leaflet/,
    /chart\.js/,
    /recharts/,
    /d3/,
    /three\.js/,
    /lottie/,
    /video\.js/,
    /plyr/,
    /swiper/,
    /embla-carousel/
  ]
};

// Known client-only components
const KNOWN_CLIENT_COMPONENTS = [
  'MotionDiv',
  'MotionSpan',
  'AnimatedCard',
  'InteractiveMap',
  'StripeElements',
  'PaymentForm',
  'FileUploader',
  'ImageCropper',
  'VideoPlayer',
  'AudioPlayer',
  'CodeEditor',
  'RichTextEditor',
  'DatePicker',
  'TimePicker',
  'ColorPicker',
  'Carousel',
  'DragDropList',
  'VirtualList',
  'InfiniteScroll',
  'LazyLoad',
  'Modal',
  'Drawer',
  'Toast',
  'Notification'
];

class EnhancedBundleAnalyzer {
  constructor() {
    this.stats = {
      totalFiles: 0,
      clientComponents: 0,
      serverComponents: 0,
      convertible: [],
      needsClient: [],
      falsePositives: [],
      byReason: {
        hooks: [],
        eventHandlers: [],
        browserAPIs: [],
        clientLibraries: [],
        indirectDependencies: [],
        unknown: []
      },
      estimatedSavings: 0,
      dependencyGraph: new Map(),
      componentClientStatus: new Map()
    };
  }

  // Build dependency graph by parsing imports
  buildDependencyGraph(filePath, content) {
    const dependencies = new Set();

    // Parse ES6 imports
    const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*{[^}]+})?\s*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Skip external packages and built-in modules
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        continue;
      }

      // Resolve relative import to absolute path
      const resolvedPath = this.resolveImportPath(filePath, importPath);
      if (resolvedPath) {
        dependencies.add(resolvedPath);
      }
    }

    // Also check for dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.') || importPath.startsWith('@/')) {
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath) {
          dependencies.add(resolvedPath);
        }
      }
    }

    // Check for specific component imports that are known to be client-only
    const componentImportRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
    while ((match = componentImportRegex.exec(content)) !== null) {
      const imports = match[1] || match[2];
      if (imports) {
        const importedNames = imports.split(',').map(s => s.trim());
        for (const name of importedNames) {
          if (KNOWN_CLIENT_COMPONENTS.includes(name)) {
            this.stats.componentClientStatus.set(filePath, {
              isClient: true,
              reason: `imports client-only component: ${name}`
            });
          }
        }
      }
    }

    this.stats.dependencyGraph.set(filePath, dependencies);
  }

  resolveImportPath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    let resolvedPath;

    if (importPath.startsWith('@/')) {
      // Handle @/ alias (usually points to src or app root)
      const webRoot = path.join(process.cwd(), 'apps', 'web');
      resolvedPath = path.join(webRoot, importPath.substring(2));
    } else if (importPath.startsWith('.')) {
      // Handle relative imports
      resolvedPath = path.resolve(fromDir, importPath);
    } else {
      return null;
    }

    // Try to find the actual file (handle index files and extensions)
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    const possiblePaths = [
      resolvedPath,
      ...extensions.map(ext => resolvedPath + ext),
      ...extensions.map(ext => path.join(resolvedPath, 'index' + ext))
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  // Check if a component has indirect client dependencies
  hasIndirectClientDependency(filePath, visited = new Set()) {
    // Prevent infinite recursion
    if (visited.has(filePath)) {
      return false;
    }
    visited.add(filePath);

    // Check if this component is known to be client-only
    const status = this.stats.componentClientStatus.get(filePath);
    if (status && status.isClient) {
      return status.reason;
    }

    // Check direct client requirements
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const directReasons = this.findClientReasons(content);
      if (directReasons.length > 0) {
        return `depends on ${path.basename(filePath)} which has ${directReasons[0].type}`;
      }
    }

    // Check dependencies recursively
    const dependencies = this.stats.dependencyGraph.get(filePath) || new Set();
    for (const dep of dependencies) {
      const reason = this.hasIndirectClientDependency(dep, visited);
      if (reason) {
        return `${reason} (via ${path.basename(filePath)})`;
      }
    }

    return false;
  }

  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Build dependency graph
    this.buildDependencyGraph(filePath, content);

    // Check if it's a client component
    const hasUseClient = lines[0].includes("'use client'") || lines[0].includes('"use client"');

    if (!hasUseClient) {
      this.stats.serverComponents++;
      return;
    }

    this.stats.clientComponents++;

    // Analyze why it needs to be client
    const directReasons = this.findClientReasons(content);
    const indirectReason = this.hasIndirectClientDependency(filePath);

    const fileInfo = {
      path: path.relative(process.cwd(), filePath),
      size: fs.statSync(filePath).size,
      directReasons: directReasons,
      indirectReason: indirectReason,
      componentName: this.extractComponentName(content),
      convertible: directReasons.length === 0 && !indirectReason
    };

    if (directReasons.length === 0 && !indirectReason) {
      this.stats.convertible.push(fileInfo);
      this.stats.estimatedSavings += fileInfo.size;
    } else if (directReasons.length === 0 && indirectReason) {
      // This is a false positive from the previous analyzer
      this.stats.falsePositives.push({
        ...fileInfo,
        reason: indirectReason
      });
      this.stats.needsClient.push(fileInfo);
      this.stats.byReason.indirectDependencies.push(fileInfo);
    } else {
      this.stats.needsClient.push(fileInfo);

      // Categorize by reason
      directReasons.forEach(reason => {
        this.stats.byReason[reason.type].push({
          ...fileInfo,
          pattern: reason.pattern
        });
      });
    }
  }

  findClientReasons(content) {
    const reasons = [];

    // Remove comments to avoid false positives
    const cleanContent = this.removeComments(content);

    // Check for hooks
    for (const pattern of CLIENT_REQUIRED_PATTERNS.hooks) {
      if (pattern.test(cleanContent)) {
        reasons.push({
          type: 'hooks',
          pattern: pattern.toString()
        });
        break;
      }
    }

    // Check for event handlers
    for (const pattern of CLIENT_REQUIRED_PATTERNS.eventHandlers) {
      if (pattern.test(cleanContent)) {
        reasons.push({
          type: 'eventHandlers',
          pattern: pattern.toString()
        });
        break;
      }
    }

    // Check for browser APIs
    for (const pattern of CLIENT_REQUIRED_PATTERNS.browserAPIs) {
      if (pattern.test(cleanContent)) {
        reasons.push({
          type: 'browserAPIs',
          pattern: pattern.toString()
        });
        break;
      }
    }

    // Check for client-only libraries
    for (const pattern of CLIENT_REQUIRED_PATTERNS.clientLibraries) {
      if (pattern.test(cleanContent)) {
        reasons.push({
          type: 'clientLibraries',
          pattern: pattern.toString()
        });
        break;
      }
    }

    return reasons;
  }

  removeComments(content) {
    // Remove single-line comments
    content = content.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove JSX comments
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    return content;
  }

  extractComponentName(content) {
    // Try to extract the main component name
    const exportDefaultMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (exportDefaultMatch) {
      return exportDefaultMatch[1];
    }

    const exportFunctionMatch = content.match(/export\s+function\s+(\w+)/);
    if (exportFunctionMatch) {
      return exportFunctionMatch[1];
    }

    const constComponentMatch = content.match(/(?:export\s+)?const\s+(\w+)\s*[:=]\s*(?:\([^)]*\)|[^=]+)\s*=>/);
    if (constComponentMatch) {
      return constComponentMatch[1];
    }

    return 'Unknown';
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  printReport() {
    console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════');
    console.log('               ENHANCED BUNDLE ANALYSIS REPORT V2             ');
    console.log('═══════════════════════════════════════════════════════════' + colors.reset);

    // Summary
    console.log('\n' + colors.bright + '📊 SUMMARY' + colors.reset);
    console.log('├─ Total Files Analyzed: ' + colors.cyan + this.stats.totalFiles + colors.reset);
    console.log('├─ Client Components: ' + colors.yellow + this.stats.clientComponents + colors.reset);
    console.log('├─ Server Components: ' + colors.green + this.stats.serverComponents + colors.reset);
    console.log('├─ Truly Convertible: ' + colors.bright + colors.green + this.stats.convertible.length + colors.reset);
    console.log('├─ False Positives Found: ' + colors.red + this.stats.falsePositives.length + colors.reset);
    console.log('└─ Estimated Savings: ' + colors.bright + colors.green + this.formatFileSize(this.stats.estimatedSavings) + colors.reset);

    // Conversion rate
    const conversionRate = this.stats.clientComponents > 0
      ? (this.stats.convertible.length / this.stats.clientComponents * 100).toFixed(1)
      : 0;
    console.log('\n' + colors.bright + '🎯 TRUE CONVERSION POTENTIAL: ' + colors.green + conversionRate + '%' + colors.reset);

    // False positives that were detected
    if (this.stats.falsePositives.length > 0) {
      console.log('\n' + colors.bright + colors.red + '⚠️  FALSE POSITIVES DETECTED (' + this.stats.falsePositives.length + ' components)' + colors.reset);
      console.log(colors.gray + '   These components appear safe but have indirect client dependencies:' + colors.reset);

      this.stats.falsePositives.slice(0, 10).forEach(file => {
        console.log('   ├─ ' + colors.yellow + file.path + colors.reset);
        console.log('   │  └─ ' + colors.gray + file.reason + colors.reset);
      });

      if (this.stats.falsePositives.length > 10) {
        console.log('   └─ ... and ' + (this.stats.falsePositives.length - 10) + ' more');
      }
    }

    // Truly convertible components
    if (this.stats.convertible.length > 0) {
      console.log('\n' + colors.bright + colors.green + '✅ TRULY SAFE TO CONVERT (' + this.stats.convertible.length + ' components)' + colors.reset);
      console.log(colors.gray + '   These components have no client dependencies (direct or indirect):' + colors.reset);

      // Sort by size for maximum impact
      const sorted = this.stats.convertible.sort((a, b) => b.size - a.size);
      sorted.slice(0, 20).forEach(file => {
        console.log('   ├─ ' + colors.green + file.path + colors.reset +
                   ' (' + this.formatFileSize(file.size) + ')' +
                   ' [' + file.componentName + ']');
      });

      if (sorted.length > 20) {
        console.log('   └─ ... and ' + (sorted.length - 20) + ' more');
      }
    }

    // Breakdown by reason including indirect dependencies
    console.log('\n' + colors.bright + colors.yellow + '⚠️  CLIENT REQUIRED BREAKDOWN' + colors.reset);

    if (this.stats.byReason.indirectDependencies.length > 0) {
      console.log('\n' + colors.yellow + '🔗 Indirect Client Dependencies (' + this.stats.byReason.indirectDependencies.length + ')' + colors.reset);
      this.stats.byReason.indirectDependencies.slice(0, 5).forEach(file => {
        console.log('   ├─ ' + file.path);
        if (file.indirectReason) {
          console.log('   │  └─ ' + colors.gray + file.indirectReason + colors.reset);
        }
      });
      if (this.stats.byReason.indirectDependencies.length > 5) {
        console.log('   └─ ... and ' + (this.stats.byReason.indirectDependencies.length - 5) + ' more');
      }
    }

    if (this.stats.byReason.hooks.length > 0) {
      console.log('\n' + colors.yellow + '🪝 Using Hooks (' + this.stats.byReason.hooks.length + ')' + colors.reset);
      this.stats.byReason.hooks.slice(0, 5).forEach(file => {
        console.log('   ├─ ' + file.path.substring(0, 60) + '...');
      });
      if (this.stats.byReason.hooks.length > 5) {
        console.log('   └─ ... and ' + (this.stats.byReason.hooks.length - 5) + ' more');
      }
    }

    if (this.stats.byReason.eventHandlers.length > 0) {
      console.log('\n' + colors.yellow + '🎯 Event Handlers (' + this.stats.byReason.eventHandlers.length + ')' + colors.reset);
      this.stats.byReason.eventHandlers.slice(0, 5).forEach(file => {
        console.log('   ├─ ' + file.path.substring(0, 60) + '...');
      });
      if (this.stats.byReason.eventHandlers.length > 5) {
        console.log('   └─ ... and ' + (this.stats.byReason.eventHandlers.length - 5) + ' more');
      }
    }

    if (this.stats.byReason.browserAPIs.length > 0) {
      console.log('\n' + colors.yellow + '🌐 Browser APIs (' + this.stats.byReason.browserAPIs.length + ')' + colors.reset);
      this.stats.byReason.browserAPIs.slice(0, 5).forEach(file => {
        console.log('   ├─ ' + file.path.substring(0, 60) + '...');
      });
      if (this.stats.byReason.browserAPIs.length > 5) {
        console.log('   └─ ... and ' + (this.stats.byReason.browserAPIs.length - 5) + ' more');
      }
    }

    if (this.stats.byReason.clientLibraries.length > 0) {
      console.log('\n' + colors.yellow + '📦 Client Libraries (' + this.stats.byReason.clientLibraries.length + ')' + colors.reset);
      this.stats.byReason.clientLibraries.slice(0, 5).forEach(file => {
        console.log('   ├─ ' + file.path.substring(0, 60) + '...');
      });
      if (this.stats.byReason.clientLibraries.length > 5) {
        console.log('   └─ ... and ' + (this.stats.byReason.clientLibraries.length - 5) + ' more');
      }
    }

    // Enhanced recommendations
    console.log('\n' + colors.bright + colors.blue + '💡 ENHANCED RECOMMENDATIONS' + colors.reset);
    console.log('1. ✅ Only convert components with NO indirect dependencies');
    console.log('2. ⚠️  Components importing MotionDiv, animations, or forms need client');
    console.log('3. 🔍 Review false positives before conversion');
    console.log('4. 📦 Use dynamic imports for heavy client components');
    console.log('5. 🔄 Consider extracting static parts from mixed components');

    // Export results to JSON
    const outputPath = path.join(process.cwd(), 'web-bundle-analysis-v2.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      ...this.stats,
      dependencyGraph: Array.from(this.stats.dependencyGraph.entries()),
      componentClientStatus: Array.from(this.stats.componentClientStatus.entries())
    }, null, 2));
    console.log('\n' + colors.gray + '📄 Full report saved to: ' + outputPath + colors.reset);

    // Safety warning
    console.log('\n' + colors.bright + colors.red + '⚠️  IMPORTANT SAFETY NOTE' + colors.reset);
    console.log('The enhanced analyzer has detected ' + colors.red + this.stats.falsePositives.length + colors.reset + ' false positives.');
    console.log('These components would break if converted. Always use this enhanced analyzer!');

    // Action script
    console.log('\n' + colors.bright + colors.green + '🚀 NEXT STEPS' + colors.reset);
    console.log('1. Review the truly convertible components list');
    console.log('2. Update convert script to use web-bundle-analysis-v2.json');
    console.log('3. Run conversion with: ' + colors.cyan + 'node scripts/convert-to-server-components.js --dry-run' + colors.reset);

    console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset);
  }

  async run() {
    const webAppPath = path.join(process.cwd(), 'apps', 'web');

    if (!fs.existsSync(webAppPath)) {
      console.error(colors.red + '❌ Error: apps/web directory not found!' + colors.reset);
      process.exit(1);
    }

    console.log(colors.cyan + '🔍 Running enhanced bundle analysis with dependency tracking...' + colors.reset);

    // Find all TypeScript/React files
    const patterns = [
      'components/**/*.tsx',
      'app/**/*.tsx',
      'lib/**/*.tsx'
    ];

    const allFiles = [];
    for (const pattern of patterns) {
      // Use forward slashes for glob pattern even on Windows
      const globPattern = path.join(webAppPath, pattern).replace(/\\/g, '/');
      const files = glob.sync(globPattern);

      files.forEach(file => {
        // Skip test files, stories, and type files
        if (file.includes('.test.') ||
            file.includes('.spec.') ||
            file.includes('.stories.') ||
            file.includes('.d.ts') ||
            file.includes('__tests__') ||
            file.includes('__mocks__')) {
          return;
        }
        allFiles.push(file);
      });
    }

    // First pass: build dependency graph
    console.log(colors.gray + '📊 Building dependency graph...' + colors.reset);
    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        this.buildDependencyGraph(file, content);
      } catch (error) {
        console.error(colors.red + `Error building graph for ${file}: ${error.message}` + colors.reset);
      }
    }

    // Second pass: analyze with dependency information
    console.log(colors.gray + '🔍 Analyzing components with dependency information...' + colors.reset);
    for (const file of allFiles) {
      this.stats.totalFiles++;
      try {
        this.analyzeFile(file);
      } catch (error) {
        console.error(colors.red + `Error analyzing ${file}: ${error.message}` + colors.reset);
      }
    }

    this.printReport();
  }
}

// Run the enhanced analyzer
const analyzer = new EnhancedBundleAnalyzer();
analyzer.run().catch(console.error);