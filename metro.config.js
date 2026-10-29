// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand's ESM build reads import.meta.env, which the web bundle cannot parse (it is not an ES module).
// On web, resolve zustand like a require() so it gets the CommonJS build, the same files iOS gets through
// the react-native condition. Expo's resolver adds the "import" condition for import statements
// (isESMImport), so that flag is what has to change.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest;
  if (platform === 'web' && /^zustand(\/|$)/.test(moduleName)) {
    return resolve({ ...context, isESMImport: false }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
