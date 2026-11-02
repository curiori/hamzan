// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', '.superpowers/*'],
  },
  {
    // eslint-config-expo 58 adds the React Compiler rules of eslint-plugin-react-hooks 7. The app does not use the
    // React Compiler, and these three flag patterns it relies on: Reanimated shared values written through `.value`
    // (and a counter kept while mapping a problem's parts), useKept reading its ref during render, and the room
    // starting a fresh plan from its focus effect.
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);