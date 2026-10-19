import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { existsSync, readFileSync } from 'fs';
import { whiteLabelPlugin } from './scripts/whitelabel/vitePlugin.mjs';

const httpsEnabled = process.env.HTTPS !== 'false';
const relayRequestHeadersToRemove = [
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'connection',
  'cookie',
  'origin',
  'referer',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
];
const relayResponseHeadersToRemove = [
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'set-cookie',
];

function readDevVar(name, fileName) {
  const filePath = path.resolve(__dirname, fileName);
  if (!existsSync(filePath)) {
    return undefined;
  }

  const line = readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith(`${name}=`));
  if (!line) {
    return undefined;
  }

  const value = line.slice(line.indexOf('=') + 1).trim();
  const hasMatchingQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  return hasMatchingQuotes ? value.slice(1, -1) : value;
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, __dirname, '');
  const legacyVarsFile =
    mode === 'production' ? '.dev.vars.production' : '.dev.vars.local';
  // KLIPY requires the end-user client to call its API directly. This value is
  // therefore a public application credential embedded into the web bundle,
  // even when it is loaded from an ignored legacy .dev.vars file.
  const klipyPickerEnabled =
    environment.VITE_10X_FEATURE_KLIPY_MEDIA_PICKER ||
    (mode === 'production' ? 'false' : 'true');
  const klipyBrowserKey =
    klipyPickerEnabled.trim().toLowerCase() === 'true'
      ? environment.VITE_KLIPY_API_KEY ||
        readDevVar('KLIPY_API_KEY', legacyVarsFile) ||
        ''
      : '';

  return {
    define: {
      'import.meta.env.VITE_KLIPY_API_KEY': JSON.stringify(klipyBrowserKey),
      'import.meta.env.VITE_10X_FEATURE_KLIPY_MEDIA_PICKER':
        JSON.stringify(klipyPickerEnabled),
    },
    plugins: [
      whiteLabelPlugin(environment),
      react(),
      tailwindcss(),
      nodePolyfills({
        globals: {
          Buffer: true,
          stream: true,
          process: true,
        },
      }),
      ...(httpsEnabled ? [basicSsl()] : []),
    ],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
    server: {
      https: httpsEnabled,
      allowedHosts: ['local.10x.social'],
      proxy: {
        '/~api': {
          target: 'https://farcaster.xyz',
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              for (const header of relayRequestHeadersToRemove) {
                proxyRequest.removeHeader(header);
              }
            });
            proxy.on('proxyRes', (proxyResponse) => {
              for (const header of relayResponseHeadersToRemove) {
                delete proxyResponse.headers[header];
              }
              proxyResponse.headers['cache-control'] = 'no-store';
            });
          },
        },
      },
    },
    build: {
      sourcemap: 'hidden',
      // Match browserslist config: chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4
      // These browsers all support ES2020 features natively (classes, async/await, spread, etc.)
      target: ['chrome111', 'edge111', 'firefox128', 'safari16.4'],
      rollupOptions: {
        output: {
          manualChunks: {
            // Split heavy vendor libraries into separate chunks
            'vendor-viem': ['viem'],
            'vendor-wagmi': ['wagmi', '@wagmi/core', '@wagmi/connectors'],
            'vendor-solana': ['@solana/web3.js'],
            'vendor-privy': ['@privy-io/react-auth'],
            'vendor-draftjs': [
              'draft-js',
              '@draft-js-plugins/editor',
              '@draft-js-plugins/mention',
              '@draft-js-plugins/emoji',
              '@draft-js-plugins/linkify',
            ],
            'vendor-emoji': [
              'emoji-mart',
              '@emoji-mart/data',
              '@emoji-mart/react',
            ],
            'vendor-charts': ['recharts'],
          },
        },
        plugins: [],
      },
    },
  };
});
