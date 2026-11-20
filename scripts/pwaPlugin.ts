import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { renderServiceWorker, selectPrecacheUrls } from '../src/pwa/swPolicy.ts';

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

export function miniArcadePwa(): Plugin {
  let outDir = 'dist';
  return {
    name: 'mini-arcade-pwa',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const files = await listFiles(outDir);
      const precache = selectPrecacheUrls(files);
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 16);
      await fs.writeFile(path.join(outDir, 'sw.js'), renderServiceWorker(version, precache));
    },
  };
}
