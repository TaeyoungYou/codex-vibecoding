import js from '@eslint/js';
import hooks from 'eslint-plugin-react-hooks';

const globals = Object.fromEntries([
  'AbortController', 'AbortSignal', 'Buffer', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'console', 'crypto', 'document', 'Event', 'EventSource', 'fetch', 'globalThis',
  'process', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'window',
  'requestAnimationFrame', 'navigator',
].map((name) => [name, 'readonly']));

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'artifacts/**', 'supabase/**', '.cache/**', '.vercel/**', '.tools/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }] },
  },
  {
    files: ['client/**/*.jsx', 'client/**/*.js'],
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
];
