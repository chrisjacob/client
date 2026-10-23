import path from 'node:path';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { clearTimeout, setTimeout } from 'node:timers';
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
  let development = false;
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
  const sourceTargetsByReplacement = new Map(
    branding?.resources.source.map((resource) => [
      path.resolve(brandRoot, resource.replacement),
      slash(path.join(appRoot, resource.target)),
    ]),
  );
  return {
    name: '10x-whitelabel',
    enforce: 'pre',
    configResolved(config) {
      development = config.command === 'serve';
    },
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
      if (problems.length) {
        const message = `White-label review required:\n${problems.join('\n')}\nRun pnpm branding:check; see whitelabel/README.md.`;
        // Keep the origin available while source and catalogue edits are paired.
        // Production builds and the standalone branding audit remain strict.
        if (development) this.warn(message);
        else this.error(message);
      }
    },
    configureServer(server) {
      if (!branding) return;
      const configurationFiles = new Set(
        ['brand.json', 'strings.json', 'resources.json'].map((file) =>
          path.join(brandRoot, file),
        ),
      );
      let restartTimer;
      server.httpServer?.once('close', () => clearTimeout(restartTimer));
      server.watcher.add(brandRoot);
      server.watcher.on('change', (file) => {
        const resolved = path.resolve(file);
        // Replacement modules participate in HMR below. Restarting here closes
        // the origin port and produces Bad Gateway responses through the tunnel.
        if (sourceTargetsByReplacement.has(resolved)) return;
        // README, backups and public assets do not change module configuration.
        if (!configurationFiles.has(resolved)) return;
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          void server.restart().catch((error) => {
            server.config.logger.error(`White-label restart failed: ${error}`);
          });
        }, 500);
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
    handleHotUpdate({ file, server, modules }) {
      const target = sourceTargetsByReplacement.get(path.resolve(file));
      if (!target) return;
      // The replacement file is loaded under its upstream module identity.
      const module = server.moduleGraph.getModuleById(target);
      return module ? [...new Set([...modules, module])] : modules;
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
