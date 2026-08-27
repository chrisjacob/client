import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const distDirectory = path.join(appDirectory, 'dist');
const canonicalUrl = (
  process.env.VITE_CANONICAL_URL || 'https://10x.social'
).replace(/\/$/, '');

const rewriteSitemapHost = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      rewriteSitemapHost(entryPath);
    } else if (entry.name.endsWith('.xml')) {
      const xml = readFileSync(entryPath, 'utf8');
      writeFileSync(
        entryPath,
        xml.replaceAll('https://farcaster.xyz', canonicalUrl),
      );
    }
  }
};

rewriteSitemapHost(distDirectory);
