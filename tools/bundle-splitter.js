// ============================================================================
// BUNDLE SPLITTER
// Custom Metro serializer for intelligent bundle splitting
// ============================================================================

const fs = require('fs');
const path = require('path');

// ============================================================================
// BUNDLE SPLITTING CONFIGURATION
// ============================================================================

const SPLIT_CONFIG = {
  // Chunk definitions
  chunks: {
    vendor: {
      test: /node_modules\/(react|react-native)\//,
      name: 'vendor',
      priority: 10,
      enforce: true, // Always create this chunk
    },
    ui: {
      test: /src\/components\/ui\//,
      name: 'ui',
      priority: 8,
      minSize: 10 * 1024, // 10KB minimum
    },
    screens: {
      test: /src\/screens\//,
      name: 'screens',
      priority: 5,
      chunks: 'async', // Lazy load by default
      maxSize: 100 * 1024, // 100KB maximum per chunk
    },
    services: {
      test: /src\/services\//,
      name: 'services',
      priority: 6,
      minSize: 5 * 1024, // 5KB minimum
    },
    utils: {
      test: /src\/utils\//,
      name: 'utils',
      priority: 4,
      minSize: 5 * 1024,
    },
    thirdParty: {
      test: /node_modules\/(?!(react|react-native))/,
      name: 'third-party',
      priority: 3,
      maxSize: 200 * 1024, // 200KB maximum
    },
  },

  // Global settings
  maxAsyncRequests: 30,
  maxInitialRequests: 10,
  minSize: 20 * 1024, // 20KB minimum chunk size
  maxSize: 500 * 1024, // 500KB maximum chunk size
  automaticNameDelimiter: '~',

  // Cache group settings
  cacheGroups: {
    default: {
      minChunks: 2,
      priority: -20,
      reuseExistingChunk: true,
    },
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: -10,
      chunks: 'all',
    },
  },
};

// ============================================================================
// CHUNK ANALYZER
// ============================================================================

class ChunkAnalyzer {
  constructor() {
    this.chunks = new Map();
    this.modules = new Map();
    this.dependencies = new Map();
  }

  analyzeModule(module) {
    const modulePath = module.path;
    const moduleSize = this.estimateModuleSize(module);

    // Determine which chunk this module belongs to
    const chunkName = this.determineChunk(modulePath);

    if (!this.chunks.has(chunkName)) {
      this.chunks.set(chunkName, {
        name: chunkName,
        modules: [],
        size: 0,
        dependencies: new Set(),
      });
    }

    const chunk = this.chunks.get(chunkName);
    chunk.modules.push(module);
    chunk.size += moduleSize;

    // Track module dependencies
    this.analyzeDependencies(module, chunk);

    return chunkName;
  }

  determineChunk(modulePath) {
    // Find matching chunk configuration
    for (const [chunkName, config] of Object.entries(SPLIT_CONFIG.chunks)) {
      if (config.test.test(modulePath)) {
        return chunkName;
      }
    }

    // Default chunk
    return 'main';
  }

  analyzeDependencies(module, chunk) {
    // Parse module code to find dependencies
    const dependencies = this.extractDependencies(module.code);

    dependencies.forEach(dep => {
      chunk.dependencies.add(dep);

      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }

      this.dependencies.get(dep).add(chunk.name);
    });
  }

  extractDependencies(code) {
    const dependencies = [];

    // Match require() calls
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;

    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    // Match import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  estimateModuleSize(module) {
    if (module.code) {
      return Buffer.byteLength(module.code, 'utf8');
    }

    if (module.source) {
      return Buffer.byteLength(module.source, 'utf8');
    }

    // Fallback estimation
    return 1024; // 1KB default
  }

  optimizeChunks() {
    // Remove chunks that are too small
    for (const [chunkName, chunk] of this.chunks.entries()) {
      const config = SPLIT_CONFIG.chunks[chunkName];
      const minSize = config?.minSize || SPLIT_CONFIG.minSize;

      if (chunk.size < minSize && !config?.enforce) {
        // Merge with main chunk
        const mainChunk = this.chunks.get('main') || this.createMainChunk();
        mainChunk.modules.push(...chunk.modules);
        mainChunk.size += chunk.size;
        this.chunks.delete(chunkName);
      }
    }

    // Split chunks that are too large
    for (const [chunkName, chunk] of this.chunks.entries()) {
      const config = SPLIT_CONFIG.chunks[chunkName];
      const maxSize = config?.maxSize || SPLIT_CONFIG.maxSize;

      if (chunk.size > maxSize) {
        this.splitLargeChunk(chunkName, chunk, maxSize);
      }
    }
  }

  createMainChunk() {
    const mainChunk = {
      name: 'main',
      modules: [],
      size: 0,
      dependencies: new Set(),
    };

    this.chunks.set('main', mainChunk);
    return mainChunk;
  }

  splitLargeChunk(chunkName, chunk, maxSize) {
    if (chunk.modules.length <= 1) return; // Can't split single module

    const sortedModules = chunk.modules.sort((a, b) =>
      this.estimateModuleSize(b) - this.estimateModuleSize(a)
    );

    let currentSize = 0;
    let splitIndex = 0;
    const newChunks = [];

    for (let i = 0; i < sortedModules.length; i++) {
      const moduleSize = this.estimateModuleSize(sortedModules[i]);

      if (currentSize + moduleSize > maxSize && currentSize > 0) {
        // Create new chunk
        newChunks.push({
          name: `${chunkName}-${newChunks.length + 1}`,
          modules: sortedModules.slice(splitIndex, i),
          size: currentSize,
          dependencies: new Set(),
        });

        splitIndex = i;
        currentSize = 0;
      }

      currentSize += moduleSize;
    }

    // Add remaining modules
    if (splitIndex < sortedModules.length) {
      newChunks.push({
        name: newChunks.length === 0 ? chunkName : `${chunkName}-${newChunks.length + 1}`,
        modules: sortedModules.slice(splitIndex),
        size: currentSize,
        dependencies: new Set(),
      });
    }

    // Replace original chunk with split chunks
    this.chunks.delete(chunkName);
    newChunks.forEach(chunk => {
      this.chunks.set(chunk.name, chunk);
    });
  }

  getOptimizationReport() {
    const totalSize = Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.size, 0);
    const chunkSizes = Array.from(this.chunks.values()).map(chunk => ({
      name: chunk.name,
      size: chunk.size,
      modules: chunk.modules.length,
      percentage: ((chunk.size / totalSize) * 100).toFixed(1),
    }));

    return {
      totalSize,
      chunkCount: this.chunks.size,
      chunks: chunkSizes.sort((a, b) => b.size - a.size),
      recommendations: this.generateRecommendations(chunkSizes),
    };
  }

  generateRecommendations(chunkSizes) {
    const recommendations = [];

    // Check for unbalanced chunks
    const avgChunkSize = chunkSizes.reduce((sum, chunk) => sum + chunk.size, 0) / chunkSizes.length;
    const largeChunks = chunkSizes.filter(chunk => chunk.size > avgChunkSize * 2);

    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${largeChunks.length} chunks are significantly larger than average`,
        chunks: largeChunks.map(c => c.name),
      });
    }

    // Check for too many small chunks
    const smallChunks = chunkSizes.filter(chunk => chunk.size < SPLIT_CONFIG.minSize);
    if (smallChunks.length > 3) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider merging small chunks to reduce overhead',
        chunks: smallChunks.map(c => c.name),
      });
    }

    return recommendations;
  }
}

// ============================================================================
// CUSTOM SERIALIZER
// ============================================================================

function createCustomSerializer(options = {}) {
  return (entryPoint, preModules, graph, bundleOptions) => {
    const analyzer = new ChunkAnalyzer();
    const chunks = new Map();

    // Analyze all modules
    for (const module of graph.dependencies.values()) {
      const chunkName = analyzer.analyzeModule(module);

      if (!chunks.has(chunkName)) {
        chunks.set(chunkName, []);
      }

      chunks.get(chunkName).push(module);
    }

    // Optimize chunks
    analyzer.optimizeChunks();

    // Generate bundles
    const bundles = [];

    for (const [chunkName, chunk] of analyzer.chunks.entries()) {
      const bundle = generateBundle(chunkName, chunk, bundleOptions);
      bundles.push(bundle);
    }

    // Generate manifest
    const manifest = generateManifest(bundles, analyzer.getOptimizationReport());

    // Log optimization results in development
    if (bundleOptions.dev) {
      const report = analyzer.getOptimizationReport();
      console.log('🚀 Bundle splitting results:');
      console.log(`📦 ${report.chunkCount} chunks created`);
      console.log(`📊 Total size: ${formatSize(report.totalSize)}`);

      report.chunks.forEach(chunk => {
        console.log(`  ${chunk.name}: ${formatSize(chunk.size)} (${chunk.percentage}%)`);
      });

      if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        report.recommendations.forEach(rec => {
          console.log(`  ${rec.type}: ${rec.message}`);
        });
      }
    }

    return {
      bundles,
      manifest,
      report: analyzer.getOptimizationReport(),
    };
  };
}

// ============================================================================
// BUNDLE GENERATION
// ============================================================================

function generateBundle(chunkName, chunk, options) {
  const modules = chunk.modules || [];

  // Sort modules for consistent output
  const sortedModules = modules.sort((a, b) => a.path.localeCompare(b.path));

  // Generate module definitions
  const moduleDefinitions = sortedModules.map(module => {
    const moduleId = module.id || module.path;
    const moduleCode = module.code || module.getSource();

    return `__d(function(global, require, module, exports, __dirname, __filename) {
${moduleCode}
}, ${JSON.stringify(moduleId)}, ${JSON.stringify(module.path)});`;
  }).join('\n');

  // Bundle wrapper
  const bundleCode = `
(function() {
  'use strict';

  // Chunk: ${chunkName}
  // Generated: ${new Date().toISOString()}
  // Modules: ${modules.length}

  ${moduleDefinitions}

  // Chunk initialization
  if (typeof __registerChunk === 'function') {
    __registerChunk('${chunkName}', [${modules.map(m => `'${m.id || m.path}'`).join(', ')}]);
  }
})();
`;

  return {
    name: chunkName,
    code: bundleCode,
    modules: modules.map(m => ({ id: m.id || m.path, path: m.path })),
    size: Buffer.byteLength(bundleCode, 'utf8'),
    async: chunkName !== 'main', // Main chunk loads synchronously
  };
}

function generateManifest(bundles, report) {
  return {
    version: '1.0.0',
    generated: new Date().toISOString(),
    chunks: bundles.map(bundle => ({
      name: bundle.name,
      file: `${bundle.name}.bundle.js`,
      size: bundle.size,
      modules: bundle.modules.length,
      async: bundle.async,
    })),
    loadOrder: bundles
      .filter(b => !b.async)
      .map(b => b.name)
      .concat(['main']), // Ensure main loads last
    asyncChunks: bundles
      .filter(b => b.async)
      .map(b => b.name),
    optimization: report,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = createCustomSerializer;
module.exports.ChunkAnalyzer = ChunkAnalyzer;
module.exports.SPLIT_CONFIG = SPLIT_CONFIG;