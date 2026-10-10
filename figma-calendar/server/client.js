import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { ConfigurationError, ROOT } from './config.js';

export async function mountClient(app, server, dev) {
  if (dev) {
    const { createServer } = await import('vite');
    const vite = await createServer({ configFile: path.join(ROOT, 'vite.config.js'), server: { middlewareMode: true, ws: { server } }, appType: 'spa' });
    app.use(vite.middlewares);
    return () => vite.close();
  }
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new ConfigurationError('빌드 파일이 없습니다. npm run build를 먼저 실행해 주세요.');
  app.use(express.static(dist, { dotfiles: 'deny', index: false, fallthrough: true, redirect: false }));
  app.get('/', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  app.use((_req, res) => res.status(404).end());
  return async () => {};
}
