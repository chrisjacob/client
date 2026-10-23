import { spawn, spawnSync } from 'node:child_process';
import console from 'node:console';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { superviseProcess } from './devProcessSupervisor.mjs';

const VITE_PORT = 5173;
const PUBLIC_URL = 'https://local.10x.social';
const TUNNEL_NAME = 'social-local';
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.resolve(appDir, '../../tmp/local-tunnel');
const logDir = path.join(stateDir, `${Date.now()}-supervised`);
mkdirSync(logDir, { recursive: true });
const state = {
  logDir,
  supervisorPid: process.pid,
  vitePid: null,
  tunnelPid: null,
  whiteLabel: process.env.VITE_10X_FEATURE_WHITELABEL !== 'false',
  viteStdout: path.join(logDir, 'vite.stdout.log'),
  viteStderr: path.join(logDir, 'vite.stderr.log'),
};
const saveState = () =>
  writeFileSync(
    path.join(stateDir, 'active.json'),
    JSON.stringify(state, null, 2),
  );
const shutdown = new globalThis.AbortController();
process.on('SIGINT', () => shutdown.abort());
process.on('SIGTERM', () => shutdown.abort());

const cloudflaredExecutable =
  process.platform === 'win32'
    ? 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe'
    : 'cloudflared';

const isViteRunning = async () => {
  try {
    const response = await globalThis.fetch(`http://127.0.0.1:${VITE_PORT}/@vite/client`, {
      signal: globalThis.AbortSignal.any([shutdown.signal, globalThis.AbortSignal.timeout(3000)]),
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
};

function startLoggedProcess(name, executable, args, env = process.env) {
  const stdout = openSync(path.join(logDir, `${name}.stdout.log`), 'a');
  const stderr = openSync(path.join(logDir, `${name}.stderr.log`), 'a');
  try {
    return spawn(executable, args, {
      cwd: appDir,
      env,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
    });
  } finally {
    closeSync(stdout);
    closeSync(stderr);
  }
}

const startVite = () =>
  startLoggedProcess(
    'vite',
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      String(VITE_PORT),
      '--strictPort',
    ],
    {
      ...process.env,
      HTTPS: 'false',
      VITE_10X_FEATURE_WHITELABEL: String(state.whiteLabel),
      VITE_FARCASTER_API_BASE_URL: `${PUBLIC_URL}/~api`,
    },
  );

const main = async () => {
  const sitemap = spawnSync(
    process.execPath,
    ['scripts/syncSitemapIndex.mjs'],
    {
      cwd: appDir,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (sitemap.status !== 0) throw new Error('Sitemap preparation failed');
  saveState();
  const origin = superviseProcess({
    name: 'Social Vite',
    start: startVite,
    healthy: isViteRunning,
    signal: shutdown.signal,
    onChild: (child) => {
      state.vitePid = child?.pid ?? null;
      saveState();
    },
  });
  // Keep recovering a failed origin without tearing down the connector.
  while (!shutdown.signal.aborted && !(await isViteRunning())) {
    await sleep(500, undefined, { signal: shutdown.signal });
  }
  if (shutdown.signal.aborted) return;
  process.stdout.write(`Local URL:  http://localhost:${VITE_PORT}\n`);
  process.stdout.write(`Tunnel URL: ${PUBLIC_URL}\n`);
  process.stdout.write(`Logs: ${logDir}\n`);
  const tunnel = superviseProcess({
    name: 'Social Cloudflare Tunnel',
    start: () =>
      startLoggedProcess('tunnel', cloudflaredExecutable, [
        'tunnel',
        'run',
        '--url',
        `http://127.0.0.1:${VITE_PORT}`,
        TUNNEL_NAME,
      ]),
    signal: shutdown.signal,
    onChild: (child) => {
      state.tunnelPid = child?.pid ?? null;
      saveState();
    },
  });
  await Promise.all([origin, tunnel]);
};

main().catch((error) => {
  const stopped = shutdown.signal.aborted;
  shutdown.abort();
  if (!stopped) {
    console.error(error);
    process.exitCode = 1;
  }
});
