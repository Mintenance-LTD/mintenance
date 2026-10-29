import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '../..');
export default defineConfig({
  root: here,
  publicDir: path.join(web, 'public'),
  plugins: [react()],
  css: { postcss: web },
  resolve: {
    alias: [
      { find: 'next/link', replacement: path.join(here, 'link.tsx') },
      { find: 'next/image', replacement: path.join(here, 'image.tsx') },
      {
        find: 'next/navigation',
        replacement: path.join(here, 'navigation.ts'),
      },
      {
        find: '@/hooks/useCurrentUser',
        replacement: path.join(here, 'services.ts'),
      },
      {
        find: '@/hooks/useNotificationCounts',
        replacement: path.join(here, 'services.ts'),
      },
      {
        find: '@/hooks/useRealtime',
        replacement: path.join(here, 'services.ts'),
      },
      { find: '@mintenance/shared', replacement: path.join(here, 'shared.ts') },
      { find: '@', replacement: web },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: 4318,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(web, '../..'),
        fs.realpathSync(path.resolve(web, '../../node_modules')),
      ],
    },
  },
});
