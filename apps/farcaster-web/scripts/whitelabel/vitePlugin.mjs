import path from 'node:path';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import {
  appRoot,
  auditBranding,
  brandRoot,
  flagEnabled,
  loadBranding,
  resourceBytes,
  slash,
  transformBrandHtml,
  transformBrandSource,
} from './core.mjs';

const contentType = (filename) =>
  ({
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/manifest+json',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
  })[path.extname(filename)] || 'application/octet-stream';

export function whiteLabelPlugin(environment) {
  const enabled = flagEnabled(environment.VITE_10X_FEATURE_WHITELABEL);
  // Disabled builds do not load, validate, or publish alternate resources.
  const branding = enabled ? loadBranding() : undefined;
  if (branding) {
    branding.config.siteUrl = (
      environment.VITE_CANONICAL_URL || branding.config.siteUrl
    ).replace(/\/$/, '');
    const canonical = new URL(branding.config.siteUrl);
    if (
      !['http:', 'https:'].includes(canonical.protocol) ||
      canonical.username ||
      canonical.password
    ) {
      throw new Error(
        'White-label canonical URL must use HTTP(S) without credentials',
      );
    }
  }
  const publicResources = new Map(
    branding?.resources.public.map((resource) => [
      `/${resource.target.slice('public/'.length)}`,
      resource,
    ]),
  );
  const sourceResources = new Map(
    branding?.resources.source.map((resource) => [
      slash(path.join(appRoot, resource.target)),
      resource,
    ]),
  );
  return {
    name: '10x-whitelabel',
    enforce: 'pre',
    config() {
      return {
        define: {
          __WHITELABEL__: JSON.stringify(
            branding
              ? { enabled: true, ...branding.config }
              : { enabled: false },
          ),
        },
      };
    },
    buildStart() {
      if (!branding) return;
      const problems = auditBranding(branding);
      if (problems.length)
        this.error(
          `White-label review required:\n${problems.join('\n')}\nRun pnpm branding:check; see whitelabel/README.md.`,
        );
    },
    configureServer(server) {
      if (!branding) return;
      server.watcher.add(brandRoot);
      server.watcher.on('change', (file) => {
        if (path.resolve(file).startsWith(`${brandRoot}${path.sep}`))
          void server.restart();
      });
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/robots.txt') {
          response.setHeader('Content-Type', 'text/plain');
          response.setHeader('Cache-Control', 'no-store');
          response.end(
            readFileSync(
              path.join(appRoot, 'public/robots.txt'),
              'utf8',
            ).replaceAll(
              'https://farcaster.xyz/sitemap.xml',
              `${branding.config.siteUrl}/sitemap.xml`,
            ),
          );
          return;
        }
        const resource = publicResources.get(request.url?.split('?')[0]);
        if (!resource) return next();
        response.setHeader('Content-Type', contentType(resource.target));
        response.setHeader('Cache-Control', 'no-store');
        response.end(resourceBytes(resource, branding));
      });
    },
    load(id) {
      if (!branding) return null;
      const resource = sourceResources.get(slash(id));
      if (!resource) return null;
      this.addWatchFile(path.join(brandRoot, resource.replacement));
      // Same module identity keeps relative imports and export contracts intact.
      return resourceBytes(resource, branding).toString('utf8');
    },
    transform(code, id) {
      if (!branding) return null;
      const cleanId = slash(id.split('?')[0]);
      const file = slash(path.relative(appRoot, cleanId));
      if (
        !file.startsWith('src/') ||
        !/\.[jt]sx?$/.test(file) ||
        /[?]/.test(id)
      )
        return null;
      return transformBrandSource(code, file, branding, {
        templates: sourceResources.has(cleanId),
      });
    },
    transformIndexHtml(html) {
      return branding ? transformBrandHtml(html, branding.config) : html;
    },
    // writeBundle runs after Vite's copyPublicDir step. Never modify public/.
    async writeBundle(options) {
      if (!branding) return;
      const { mkdir, writeFile } = await import('node:fs/promises');
      const directory = path.resolve(appRoot, options.dir || 'dist');
      for (const resource of publicResources.values()) {
        const target = path.join(
          directory,
          resource.target.slice('public/'.length),
        );
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, resourceBytes(resource, branding));
      }
    },
  };
}
