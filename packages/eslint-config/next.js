import base from './base.js';
import pluginNext from '@next/eslint-plugin-next';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    plugins: {
      '@next/next': pluginNext,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      ...pluginReactHooks.configs.recommended.rules,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
