import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { transformSync } from '@babel/core';

export const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const brandRoot = path.join(appRoot, 'whitelabel');
export const brandPattern =
  /\b(?:Farcaster(?:s)?|Warpcast|Neynar|Merkle|Network State|Network School|10X Social)\b/i;
export const hash = (value) => createHash('sha256').update(value).digest('hex');
// Git may check text out as CRLF on Windows and LF in Linux CI.
export const upstreamHash = (filename) =>
  hash(
    /\.(?:[jt]sx?|css|json|svg)$/.test(filename)
      ? readFileSync(filename, 'utf8').replaceAll('\r\n', '\n')
      : readFileSync(filename),
  );
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
export const slash = (value) => value.replaceAll('\\', '/');
export const flagEnabled = (value) =>
  ['true', '1'].includes(value?.trim().toLowerCase());

export function within(root, relative) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Expected a relative slash-separated resource path: ${relative}`,
    );
  }
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Resource path escapes its directory: ${relative}`);
  }
  return resolved;
}

// Match React's JSX whitespace semantics, including intentional leading/trailing spaces.
export function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => {
    if (/[^ \t]/.test(line)) last = index;
  });
  return lines
    .map((line, index) => {
      let text = line.replace(/\t/g, ' ');
      if (index !== 0) text = text.replace(/^ +/, '');
      if (index !== lines.length - 1) text = text.replace(/ +$/, '');
      return text && index !== last ? `${text} ` : text;
    })
    .join('');
}

function eligibleLiteral(p) {
  // Never touch imports, type contracts, object keys, directives, or property names.
  const parent = p.parent;
  if (/^(?:Import|Export|TS|Directive)/.test(parent.type)) return false;
  if (
    (parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') &&
    p.key === 'key'
  )
    return false;
  if (parent.type === 'MemberExpression' && p.key === 'property') return false;
  return true;
}

export function literalInfo(p) {
  if (p.isJSXText()) return { kind: 'text', source: jsxText(p.node.value) };
  if (p.isStringLiteral() && eligibleLiteral(p))
    return { kind: 'literal', source: p.node.value };
  // Tagged templates can be executable query languages, not display text.
  if (
    p.isTemplateElement() &&
    p.parentPath.parent.type !== 'TaggedTemplateExpression'
  ) {
    return {
      kind: 'template',
      source: p.node.value.cooked ?? p.node.value.raw,
    };
  }
  return undefined;
}

export const entryKey = ({ file, kind, source }) =>
  JSON.stringify([file, kind, source]);

export function parseSource(code, filename, visitor) {
  return transformSync(code, {
    filename,
    configFile: false,
    babelrc: false,
    parserOpts: { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'] },
    plugins: [
      () => ({
        visitor: { 'JSXText|StringLiteral|TemplateElement': visitor.enter },
      }),
    ],
    sourceMaps: true,
  });
}

export function sourceFiles(directory = path.join(appRoot, 'src')) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.name === '__tests__' || entry.name === 'fork') return [];
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(absolute);
      return /\.[jt]sx?$/.test(entry.name) &&
        !/\.(?:test|spec|d)\./.test(entry.name)
        ? [absolute]
        : [];
    })
    .sort();
}

export function inventory() {
  const entries = new Map();
  for (const filename of sourceFiles()) {
    const code = readFileSync(filename, 'utf8');
    if (!brandPattern.test(code)) continue;
    const file = slash(path.relative(appRoot, filename));
    parseSource(code, filename, {
      enter(p) {
        const info = literalInfo(p);
        if (!info || !brandPattern.test(info.source)) return;
        const key = entryKey({ file, ...info });
        const existing = entries.get(key);
        if (existing) existing.count += 1;
        else
          entries.set(key, {
            file,
            ...info,
            count: 1,
            line: p.node.loc.start.line,
          });
      },
    });
  }
  return [...entries.values()];
}

export function interpolate(value, config) {
  return value.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_, key) => {
    if (typeof config[key] !== 'string')
      throw new Error(`Unknown white-label placeholder: {{${key}}}`);
    return config[key];
  });
}

export function loadBranding(root = brandRoot) {
  const config = readJson(path.join(root, 'brand.json'));
  for (const key of [
    'appName',
    'shortName',
    'description',
    'companyName',
    'legalEntity',
    'contactEmail',
    'websiteHost',
    'siteUrl',
    'socialHandle',
    'farcasterHandle',
    'logoUrl',
    'filledLogoUrl',
    'wordmarkUrl',
  ]) {
    if (typeof config[key] !== 'string')
      throw new Error(`brand.json: ${key} must be a string`);
  }
  if (!config.appName.trim() || !config.shortName.trim())
    throw new Error('Brand names must not be empty');
  const siteUrl = new URL(config.siteUrl);
  if (
    !['https:', 'http:'].includes(siteUrl.protocol) ||
    siteUrl.username ||
    siteUrl.password
  )
    throw new Error('siteUrl must be an HTTP(S) URL without credentials');
  for (const key of ['logoUrl', 'filledLogoUrl', 'wordmarkUrl']) {
    if (
      config[key] &&
      (!config[key].startsWith('/') ||
        config[key].startsWith('//') ||
        /[?#]/.test(config[key]))
    )
      throw new Error(`${key} must be a local absolute URL path`);
  }
  const strings = readJson(path.join(root, 'strings.json'));
  const resources = readJson(path.join(root, 'resources.json'));
  const seen = new Set();
  for (const entry of strings) {
    const key = entryKey(entry);
    if (seen.has(key)) throw new Error(`Duplicate catalogue entry: ${key}`);
    seen.add(key);
    if (
      !['text', 'literal', 'template'].includes(entry.kind) ||
      typeof entry.file !== 'string' ||
      !entry.file.startsWith('src/') ||
      typeof entry.source !== 'string' ||
      typeof entry.value !== 'string' ||
      !Number.isInteger(entry.count) ||
      entry.count < 1
    )
      throw new Error(`Invalid catalogue entry: ${key}`);
    if (!['app', 'preserve', 'legal', 'override'].includes(entry.category))
      throw new Error(`Invalid category: ${key}`);
    if (entry.category === 'preserve' && entry.value !== entry.source)
      throw new Error(
        `Preserved entry was edited; explicitly classify it as override: ${key}`,
      );
    interpolate(entry.value, config);
  }
  for (const [group, prefix] of [
    ['public', 'public/'],
    ['source', 'src/'],
  ]) {
    if (!Array.isArray(resources[group]))
      throw new Error(`resources.json: missing ${group} array`);
    const targets = new Set();
    for (const resource of resources[group]) {
      if (targets.has(resource.target))
        throw new Error(`Duplicate resource target: ${resource.target}`);
      targets.add(resource.target);
      if (!resource.target.startsWith(prefix))
        throw new Error(`Invalid ${group} target: ${resource.target}`);
      if (
        group === 'source' &&
        !/\.(?:[jt]sx?|css|json)$/.test(resource.target)
      )
        throw new Error(
          `Source overrides must be text modules: ${resource.target}`,
        );
      within(
        path.join(appRoot, group === 'public' ? 'public' : 'src'),
        resource.target.slice(prefix.length),
      );
      if (resource.upstream) within(appRoot, resource.upstream);
      const replacement = within(root, resource.replacement);
      if (!existsSync(replacement))
        throw new Error(`Missing replacement: ${resource.replacement}`);
      if (!/^[a-f0-9]{64}$/.test(resource.upstreamSha256))
        throw new Error(`Missing upstream hash: ${resource.target}`);
    }
  }
  for (const key of ['logoUrl', 'filledLogoUrl', 'wordmarkUrl']) {
    if (
      config[key] &&
      !resources.public.some((item) => item.target === `public${config[key]}`)
    )
      throw new Error(`${key} must name a mapped public resource`);
  }
  const branding = { config, strings, resources, root };
  for (const resource of [...resources.public, ...resources.source]) {
    if (resource.template) {
      if (!resource.replacement.endsWith('.json'))
        throw new Error(`JSON template required: ${resource.replacement}`);
      resourceBytes(resource, branding);
    }
  }
  return branding;
}

export function auditBranding(branding, current = inventory()) {
  const problems = [];
  const expected = new Map(
    branding.strings.map((entry) => [entryKey(entry), entry]),
  );
  for (const entry of current) {
    const known = expected.get(entryKey(entry));
    if (!known)
      problems.push(
        `NEW ${entry.file}:${entry.line} ${JSON.stringify(entry.source)}`,
      );
    else if (known.count !== entry.count)
      problems.push(
        `COUNT ${entry.file} ${JSON.stringify(entry.source)}: expected ${known.count}, found ${entry.count}`,
      );
    expected.delete(entryKey(entry));
  }
  for (const entry of expected.values())
    problems.push(`STALE ${entry.file} ${JSON.stringify(entry.source)}`);
  for (const group of ['public', 'source']) {
    for (const resource of branding.resources[group]) {
      const original = within(appRoot, resource.upstream || resource.target);
      if (!existsSync(original))
        problems.push(
          `REMOVED upstream resource ${resource.upstream || resource.target}`,
        );
      else if (upstreamHash(original) !== resource.upstreamSha256)
        problems.push(
          `CHANGED upstream resource ${resource.upstream || resource.target}; compare with ${resource.replacement}`,
        );
    }
  }
  return problems;
}

export function transformBrandSource(
  code,
  file,
  branding,
  { templates = false } = {},
) {
  const entries = new Map(
    branding.strings
      .filter((entry) => entry.file === file && entry.category !== 'preserve')
      .map((entry) => [entryKey(entry), entry]),
  );
  if (!entries.size && !templates) return null;
  let changed = false;
  const result = parseSource(code, path.join(appRoot, file), {
    enter(p) {
      const info = literalInfo(p);
      if (!info) return;
      const entry = entries.get(entryKey({ file, ...info }));
      const value = entry
        ? interpolate(entry.value, branding.config)
        : templates
          ? interpolate(info.source, branding.config)
          : info.source;
      if (value === info.source) return;
      changed = true;
      if (info.kind === 'text') {
        // A JSX expression preserves &, <, quotes, and braces as plain text.
        p.replaceWith({
          type: 'JSXExpressionContainer',
          expression: { type: 'StringLiteral', value },
        });
        p.skip();
      } else if (info.kind === 'literal') {
        if (p.parent.type === 'JSXAttribute') {
          p.replaceWith({
            type: 'JSXExpressionContainer',
            expression: { type: 'StringLiteral', value },
          });
          p.skip();
        } else {
          p.node.value = value;
          delete p.node.extra;
        }
      } else {
        p.node.value = {
          cooked: value,
          raw: value
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${'),
        };
      }
    },
  });
  return changed ? { code: result.code, map: result.map } : null;
}

export const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function transformBrandHtml(html, config) {
  const titled = html.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${escapeHtml(config.appName)}</title>`,
  );
  const fields = [
    ['name', 'description', config.description],
    ['property', 'og:title', config.appName],
    ['property', 'og:site_name', config.appName],
    ['property', 'og:description', config.description],
    ['property', 'og:image', `${config.siteUrl}/opengraph.png`],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', config.appName],
    ['name', 'twitter:description', config.description],
    ['name', 'twitter:image', `${config.siteUrl}/opengraph.png`],
    ['name', 'twitter:site', config.socialHandle],
  ];
  // The installed Helmet uses data-rh to replace initial tags on route changes.
  const metadata = fields
    .filter(([, , value]) => value)
    .map(
      ([attribute, key, value]) =>
        `<meta ${attribute}="${key}" content="${escapeHtml(value)}" data-rh="true" />`,
    )
    .join('\n');
  return titled.replace('</head>', () => `${metadata}\n</head>`);
}

export function resourceBytes(resource, branding) {
  const bytes = readFileSync(within(branding.root, resource.replacement));
  if (!resource.template) return bytes;
  // JSON is parsed first; interpolation cannot escape a JSON string.
  const replace = (value) =>
    typeof value === 'string'
      ? interpolate(value, branding.config)
      : Array.isArray(value)
        ? value.map(replace)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value).map(([key, child]) => [
                key,
                replace(child),
              ]),
            )
          : value;
  return Buffer.from(
    `${JSON.stringify(replace(JSON.parse(bytes.toString('utf8'))), null, 2)}\n`,
  );
}
