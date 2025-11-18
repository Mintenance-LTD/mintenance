const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Keep Metro config minimal and aligned with Expo defaults
/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(__dirname);

// Ensure proper node_modules resolution for monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Add monorepo root to watchFolders for proper module resolution
config.watchFolders = [monorepoRoot];

// Store the default resolveRequest for fallback
const defaultResolveRequest = config.resolver.resolveRequest;

// Ensure node_modules are resolved from both project and monorepo root
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  // Custom resolver for expo-sqlite to handle internal module resolution
  resolveRequest: (context, moduleName, platform) => {
    // Handle expo-sqlite internal module resolution
    if (moduleName === 'expo-sqlite') {
      // Try to resolve expo-sqlite from both locations
      const possiblePaths = [
        path.resolve(projectRoot, 'node_modules', 'expo-sqlite'),
        path.resolve(monorepoRoot, 'node_modules', 'expo-sqlite'),
      ];

      for (const packagePath of possiblePaths) {
        const packageJsonPath = path.join(packagePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const mainEntry = packageJson.main || packageJson.exports?.['.']?.default || 'build/index.js';
          const resolvedPath = path.resolve(packagePath, mainEntry);
          
          if (fs.existsSync(resolvedPath)) {
            return {
              type: 'sourceFile',
              filePath: resolvedPath,
            };
          }
        }
      }
    }

    // Handle expo-sqlite internal modules (e.g., ./SQLiteDatabase)
    if (moduleName.startsWith('expo-sqlite/') || moduleName.includes('./')) {
      const possiblePaths = [
        path.resolve(projectRoot, 'node_modules', 'expo-sqlite'),
        path.resolve(monorepoRoot, 'node_modules', 'expo-sqlite'),
      ];

      for (const packagePath of possiblePaths) {
        const buildPath = path.join(packagePath, 'build');
        if (fs.existsSync(buildPath)) {
          // Extract the internal module name (e.g., SQLiteDatabase from ./SQLiteDatabase)
          const internalModule = moduleName
            .replace('expo-sqlite/', '')
            .replace('./', '')
            .replace(/\/$/, '');
          
          // Try different file extensions
          const extensions = ['', '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs'];
          for (const ext of extensions) {
            const modulePath = path.join(buildPath, internalModule + ext);
            if (fs.existsSync(modulePath)) {
              return {
                type: 'sourceFile',
                filePath: modulePath,
              };
            }
          }

          // Also try index files in subdirectories
          const indexPath = path.join(buildPath, internalModule, 'index.js');
          if (fs.existsSync(indexPath)) {
            return {
              type: 'sourceFile',
              filePath: indexPath,
            };
          }
        }
      }
    }

    // Fallback to default resolution
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    
    // Final fallback
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Avoid non-ASCII logs to prevent encoding issues
if (config.reporter?.update) {
  const original = config.reporter.update;
  config.reporter.update = (event) => {
    if (process.env.NODE_ENV === 'development' && event.type === 'bundle_build_done') {
      // eslint-disable-next-line no-console
      console.log(`[Metro] Bundle built in ${event.buildTime}ms`);
    }
    return original(event);
  };
}

module.exports = config;

