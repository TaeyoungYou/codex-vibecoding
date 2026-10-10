import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pathFromRoot = (name) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  root: pathFromRoot('./client'),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    strictPort: true,
    fs: {
      strict: true,
      allow: [pathFromRoot('./client'), pathFromRoot('./node_modules')],
      deny: ['**/.env*', '**/.git/**', '**/server/**', '**/supabase/**', '**/.certs/**'],
    },
  },
  build: { outDir: pathFromRoot('./dist'), emptyOutDir: true, sourcemap: false },
  test: { root: pathFromRoot('./'), include: ['tests/**/*.test.{js,jsx}'], restoreMocks: true, maxWorkers: 2 },
});
