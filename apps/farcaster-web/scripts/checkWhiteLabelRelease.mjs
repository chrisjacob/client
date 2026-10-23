import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadEnv } from 'vite';
import {
  appRoot,
  auditBranding,
  escapeHtml,
  flagEnabled,
  loadBranding,
} from './whitelabel/core.mjs';
import { releaseApiConfiguration } from './whitelabel/releasePolicy.mjs';

const environment = loadEnv('production', appRoot, '');
assert.ok(
  flagEnabled(environment.VITE_10X_FEATURE_WHITELABEL),
  '10X releases require VITE_10X_FEATURE_WHITELABEL=true. Refusing an upstream-branded release.',
);
const branding = loadBranding();
const releaseApi = releaseApiConfiguration(environment, branding.config);
assert.deepEqual(
  auditBranding(branding),
  [],
  'White-label review is required before release',
);
if (process.argv.includes('--artifact')) {
  const manifest = JSON.parse(
    readFileSync(path.join(appRoot, 'dist/manifest.json'), 'utf8'),
  );
  const html = readFileSync(path.join(appRoot, 'dist/index.html'), 'utf8');
  assert.equal(
    manifest.name,
    branding.config.appName,
    'Built manifest has the wrong identity',
  );
  assert.ok(
    html.includes(`<title>${escapeHtml(branding.config.appName)}</title>`),
    'Built HTML has the wrong identity',
  );
  assert.ok(
    html.includes('id="whitelabel-theme"'),
    'Built HTML is missing the brand theme',
  );
}
process.stdout.write(
  `10X white-label release checks passed (${releaseApi.apiMode}).\n`,
);
