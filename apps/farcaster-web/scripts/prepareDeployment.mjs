import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { flagEnabled, loadBranding } from './whitelabel/core.mjs';

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const distDirectory = path.resolve(appDirectory, process.argv[2] || 'dist');
const environment = loadEnv('production', appDirectory, '');
const canonicalUrl = (
  environment.VITE_CANONICAL_URL ||
  (flagEnabled(environment.VITE_10X_FEATURE_WHITELABEL)
    ? loadBranding().config.siteUrl
    : 'https://10x.social')
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

const robotsPath = path.join(distDirectory, 'robots.txt');
const { existsSync } = await import('node:fs');
if (existsSync(robotsPath)) {
  writeFileSync(
    robotsPath,
    readFileSync(robotsPath, 'utf8').replaceAll(
      'https://farcaster.xyz/sitemap.xml',
      `${canonicalUrl}/sitemap.xml`,
    ),
  );
}
