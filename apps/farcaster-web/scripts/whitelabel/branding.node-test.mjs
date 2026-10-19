import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  appRoot,
  auditBranding,
  brandRoot,
  entryKey,
  flagEnabled,
  interpolate,
  inventory,
  jsxText,
  loadBranding,
  parseSource,
  resourceBytes,
  transformBrandHtml,
  transformBrandSource,
  within,
} from './core.mjs';
import { whiteLabelPlugin } from './vitePlugin.mjs';

const branding = loadBranding();
const custom = {
  ...branding,
  config: {
    ...branding.config,
    appName: '10X <&> "Social" ${globalThis.injected = true} `',
    companyName: 'Example Co',
    legalEntity: 'Example Pty Ltd',
    contactEmail: 'hello@example.test',
  },
};
const file = 'src/pages/test/Test.tsx';
const entry = (kind, source, value, category = 'app') => ({
  file,
  kind,
  source,
  value,
  category,
  count: 1,
});

test('identity flag is explicit and independent of optional product flags', () => {
  assert.equal(flagEnabled(undefined), false);
  assert.equal(flagEnabled('false'), false);
  assert.equal(flagEnabled(' TRUE '), true);
  assert.equal(flagEnabled('1'), true);
  const plugin = whiteLabelPlugin({ VITE_10X_FEATURE_WHITELABEL: 'false' });
  assert.equal(plugin.config().define.__WHITELABEL__, '{"enabled":false}');
  assert.equal(plugin.transform('Farcaster', 'src/a.ts'), null);
  assert.equal(plugin.load('src/a.ts'), null);
  const enabled = whiteLabelPlugin({
    VITE_10X_FEATURE_WHITELABEL: '1',
    VITE_10X_FEATURES: 'false',
  });
  assert.equal(
    JSON.parse(enabled.config().define.__WHITELABEL__).enabled,
    true,
  );
  const canonical = whiteLabelPlugin({
    VITE_10X_FEATURE_WHITELABEL: 'true',
    VITE_CANONICAL_URL: 'https://brand.example/',
  });
  assert.equal(
    JSON.parse(canonical.config().define.__WHITELABEL__).siteUrl,
    'https://brand.example',
  );
});

test('only exact catalogued app literals change; user data, imports, identifiers, and preserved services survive', () => {
  const code = `import { Farcaster } from 'farcaster-client-data';
    const protocol = 'Farcaster protocol';
    const title = 'Farcaster / Home';
    const userText = input.text;
    const page = <div title="Farcaster / Home">Welcome to Farcaster{userText}</div>;`;
  const output = transformBrandSource(code, file, {
    ...custom,
    strings: [
      entry('literal', 'Farcaster / Home', '{{appName}} / Home'),
      entry('text', 'Welcome to Farcaster', 'Welcome to {{appName}}'),
      entry('literal', 'Farcaster protocol', 'Farcaster protocol', 'preserve'),
    ],
  });
  assert.ok(output.code.includes('farcaster-client-data'));
  assert.ok(output.code.includes("'Farcaster protocol'"));
  assert.ok(output.code.includes('input.text'));
  assert.ok(output.code.includes('10X <&>'));
  assert.ok(output.code.includes('{userText}'));
  assert.doesNotThrow(() =>
    parseSource(output.code, 'test.tsx', { enter() {} }),
  );
  assert.ok(output.map);
});

test('template expressions remain expressions and replacement dollar signs/backticks cannot execute', () => {
  const code = 'const title = `${user.name} on Farcaster`;';
  const output = transformBrandSource(code, file, {
    ...custom,
    strings: [entry('template', ' on Farcaster', ' on {{appName}}')],
  });
  const title = new Function('user', `${output.code}; return title;`)({
    name: 'Farcaster fan',
  });
  assert.equal(title, `Farcaster fan on ${custom.config.appName}`);
  assert.equal(globalThis.injected, undefined);
});

test('JSX whitespace follows React semantics and HTML branding is escaped', () => {
  assert.equal(jsxText('\n  Hello\n  world.\n'), 'Hello world.');
  assert.equal(jsxText(' on Farcaster '), ' on Farcaster ');
  const html = transformBrandHtml(
    '<head><title>Farcaster</title></head>',
    custom.config,
  );
  assert.ok(html.includes('10X &lt;&amp;&gt; &quot;Social&quot;'));
  assert.equal(html.includes('<&>'), false);
  assert.ok(html.includes('property="og:site_name"'));
  assert.ok(html.includes('name="description"'));
  assert.ok(html.includes('data-rh="true"'));
  assert.throws(() => interpolate('{{unknown}}', custom.config), /Unknown/);
});

test('legal names/contact use config while protocol identity stays accurate', () => {
  for (const name of ['TermsOfUse', 'PrivacyPolicy']) {
    const folder = name === 'TermsOfUse' ? 'termsOfUse' : 'privacyPolicy';
    const sourceFile = `src/pages/${folder}/${name}Page.tsx`;
    const source = readFileSync(
      path.join(brandRoot, `resources/source/${name}Page.tsx`),
      'utf8',
    );
    const output = transformBrandSource(source, sourceFile, custom, {
      templates: true,
    });
    assert.ok(output.code.includes('Example Pty Ltd'));
    assert.ok(output.code.includes('hello@example.test'));
    assert.equal(output.code.includes('team+contact@neynar.com'), false);
    assert.doesNotThrow(() =>
      parseSource(output.code, sourceFile, { enter() {} }),
    );
    if (name === 'TermsOfUse')
      assert.ok(output.code.includes('Farcaster protocol'));
  }
});

test('full source replacements preserve module identity and support explicit placeholders in edited paragraphs', () => {
  const plugin = whiteLabelPlugin({ VITE_10X_FEATURE_WHITELABEL: 'true' });
  const id = path
    .join(appRoot, 'src/pages/termsOfUse/TermsOfUsePage.tsx')
    .replaceAll('\\', '/');
  const code = plugin.load.call({ addWatchFile() {} }, id);
  assert.ok(code.includes('export { TermsOfUsePage }'));
  const output = transformBrandSource(
    "export const Policy = () => <p>{'{{legalEntity}} custom policy'}</p>;",
    file,
    { ...custom, strings: [] },
    { templates: true },
  );
  assert.ok(output.code.includes('Example Pty Ltd custom policy'));
});

test('manifest interpolation preserves protocol handlers and JSON escapes unusual brand names', () => {
  const resource = branding.resources.public.find(
    (item) => item.target === 'public/manifest.json',
  );
  const original = JSON.parse(
    readFileSync(path.join(appRoot, resource.target), 'utf8'),
  );
  const result = JSON.parse(resourceBytes(resource, custom));
  assert.equal(result.name, custom.config.appName);
  assert.deepEqual(result.protocols, original.protocols);
  assert.deepEqual(result.share_target, original.share_target);
});

test('dev middleware and production overlay serve the same resources without modifying originals', async () => {
  const plugin = whiteLabelPlugin({ VITE_10X_FEATURE_WHITELABEL: 'true' });
  let middleware;
  plugin.configureServer({
    watcher: { add() {}, on() {} },
    middlewares: {
      use(value) {
        middleware = value;
      },
    },
  });
  let served;
  middleware(
    { url: '/manifest.json?test' },
    {
      setHeader() {},
      end(bytes) {
        served = bytes;
      },
    },
    () => assert.fail('missed overlay'),
  );
  assert.deepEqual(
    JSON.parse(served),
    JSON.parse(
      resourceBytes(
        branding.resources.public.find(
          (item) => item.target === 'public/manifest.json',
        ),
        branding,
      ),
    ),
  );
  const directory = mkdtempSync(path.join(appRoot, '.branding-test-'));
  const original = readFileSync(path.join(appRoot, 'public/manifest.json'));
  try {
    await plugin.writeBundle({ dir: directory });
    assert.deepEqual(
      readFileSync(path.join(directory, 'manifest.json')),
      served,
    );
    assert.deepEqual(
      readFileSync(path.join(appRoot, 'public/manifest.json')),
      original,
    );
    assert.ok(
      readFileSync(path.join(directory, 'brand/logo.svg')).includes(
        Buffer.from('<svg'),
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('audit detects new, removed, repeated, and changed upstream references without rewriting owner content', () => {
  const current = inventory();
  assert.deepEqual(auditBranding(branding, current), []);
  const changed = current.map((item, index) =>
    index === 0 ? { ...item, count: item.count + 1 } : item,
  );
  assert.ok(
    auditBranding(branding, changed).some((message) =>
      message.startsWith('COUNT'),
    ),
  );
  assert.ok(
    auditBranding(branding, current.slice(1)).some((message) =>
      message.startsWith('STALE'),
    ),
  );
  assert.ok(
    auditBranding(branding, [
      ...current,
      {
        file,
        kind: 'text',
        source: 'Network School client',
        count: 1,
        line: 1,
      },
    ]).some((message) => message.startsWith('NEW')),
  );
  const broken = {
    ...branding,
    resources: {
      ...branding.resources,
      source: [
        { ...branding.resources.source[0], upstreamSha256: '0'.repeat(64) },
      ],
    },
  };
  assert.ok(
    auditBranding(broken, current).some((message) =>
      message.startsWith('CHANGED'),
    ),
  );
  assert.equal(
    new Set(branding.strings.map(entryKey)).size,
    branding.strings.length,
  );
});

test('invalid configuration, path traversal, missing assets, and edited preserved strings fail clearly', () => {
  assert.throws(() => within(brandRoot, '../secret'), /escapes/);
  const directory = mkdtempSync(path.join(appRoot, '.branding-test-'));
  try {
    const config = {
      ...branding.config,
      logoUrl: '',
      filledLogoUrl: '',
      wordmarkUrl: '',
    };
    const write = (name, data) =>
      writeFileSync(path.join(directory, name), JSON.stringify(data));
    write('brand.json', config);
    write('resources.json', { public: [], source: [] });
    write('strings.json', [
      {
        ...branding.strings.find((item) => item.category === 'preserve'),
        value: 'Changed',
      },
    ]);
    assert.throws(() => loadBranding(directory), /Preserved entry/);
    write('strings.json', []);
    write('resources.json', {
      public: [
        {
          target: 'public/missing.png',
          replacement: 'absent.png',
          upstreamSha256: '0'.repeat(64),
        },
      ],
      source: [],
    });
    assert.throws(() => loadBranding(directory), /Missing replacement/);
    write('resources.json', {
      public: [
        {
          target: 'public/../escape.png',
          replacement: 'brand.json',
          upstreamSha256: '0'.repeat(64),
        },
      ],
      source: [],
    });
    assert.throws(() => loadBranding(directory), /escapes/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('every editable original compiles with hostile replacement characters; parser and asset identities remain intact', () => {
  const files = new Set(
    branding.strings
      .filter((item) => item.category !== 'preserve')
      .map((item) => item.file),
  );
  for (const sourceFile of files) {
    const code = readFileSync(path.join(appRoot, sourceFile), 'utf8');
    const output = transformBrandSource(code, sourceFile, custom);
    if (output)
      assert.doesNotThrow(
        () => parseSource(output.code, sourceFile, { enter() {} }),
        sourceFile,
      );
  }
  for (const sourceFile of [
    'src/components/attachments/FauxQuoteCast.tsx',
    'src/components/attachments/ExploreChannelsAttachment.tsx',
  ]) {
    const code = readFileSync(path.join(appRoot, sourceFile), 'utf8');
    assert.equal(transformBrandSource(code, sourceFile, custom), null);
  }
});

test('deployment sitemaps use the same canonical environment override as the branded app', () => {
  const directory = mkdtempSync(path.join(appRoot, '.branding-test-'));
  try {
    writeFileSync(
      path.join(directory, 'sitemap.xml'),
      '<url><loc>https://farcaster.xyz/example</loc></url>',
    );
    const result = spawnSync(
      process.execPath,
      ['scripts/prepareDeployment.mjs', directory],
      {
        cwd: appRoot,
        env: {
          ...process.env,
          VITE_10X_FEATURE_WHITELABEL: 'true',
          VITE_CANONICAL_URL: 'https://brand.example/',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      readFileSync(path.join(directory, 'sitemap.xml'), 'utf8'),
      /https:\/\/brand.example\/example/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
