const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Keep Metro config minimal and aligned with Expo defaults
/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(__dirname);

// Ensure proper node_modules resolution for monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Add monorepo root to watchFolders for proper module resolution
config.watchFolders = [monorepoRoot];

// Ensure node_modules are resolved from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
