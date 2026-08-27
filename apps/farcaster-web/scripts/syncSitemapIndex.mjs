import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './validateSitemaps.mjs';

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

copyFileSync(
  path.join(appDirectory, 'public', 'sitemaps', 'sitemap_index.xml'),
  path.join(appDirectory, 'public', 'sitemap.xml'),
);
