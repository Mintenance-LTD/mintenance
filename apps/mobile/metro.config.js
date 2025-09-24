const { getDefaultConfig } = require('expo/metro-config');

// Keep Metro config minimal and aligned with Expo defaults
/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(__dirname);

// Remove custom watchFolders; rely on Expo defaults


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

