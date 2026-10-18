import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const VITE_PORT = 5173;
const PUBLIC_URL = 'https://local.10x.social';
const TUNNEL_NAME = 'social-local';
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const cloudflaredExecutable =
  process.platform === 'win32'
    ? 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe'
    : 'cloudflared';

const isViteRunning = async () => {
  try {
    const response = await globalThis.fetch(`http://127.0.0.1:${VITE_PORT}/`);
    return response.ok || response.status === 304;
  } catch {
    return false;
  }
};

const waitForVite = async () => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (await isViteRunning()) return;
    await sleep(500);
  }

  throw new Error(`Vite did not start on port ${VITE_PORT} within 30 seconds`);
};

const startVite = () => {
  const sitemap = spawnSync(
    process.execPath,
    ['scripts/syncSitemapIndex.mjs'],
    {
      cwd: appDir,
      stdio: 'inherit',
    },
  );

  if (sitemap.status !== 0) {
    throw new Error('Sitemap preparation failed');
  }

  return spawn(
    'pnpm',
    [
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(VITE_PORT),
      '--strictPort',
    ],
    {
      cwd: appDir,
      env: {
        ...process.env,
        HTTPS: 'false',
        VITE_FARCASTER_API_BASE_URL: `${PUBLIC_URL}/~api`,
      },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  );
};

const startTunnel = () =>
  spawn(
    cloudflaredExecutable,
    ['tunnel', 'run', '--url', `http://127.0.0.1:${VITE_PORT}`, TUNNEL_NAME],
    {
      cwd: appDir,
      stdio: 'inherit',
    },
  );

const main = async () => {
  const usingExistingVite = await isViteRunning();
  const vite = usingExistingVite ? undefined : startVite();

  if (usingExistingVite) {
    process.stdout.write(
      `Using the existing server on http://localhost:${VITE_PORT}\n`,
    );
  } else {
    await waitForVite();
  }

  process.stdout.write(`Local URL:  http://localhost:${VITE_PORT}\n`);
  process.stdout.write(`Tunnel URL: ${PUBLIC_URL}\n`);
  process.stdout.write(`Starting Cloudflare Tunnel ${TUNNEL_NAME}...\n`);

  const tunnel = startTunnel();
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    tunnel.kill();
    vite?.kill();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  tunnel.on('exit', (code) => {
    vite?.kill();
    if (!shuttingDown && code !== 0) process.exitCode = code ?? 1;
  });
  vite?.on('exit', shutdown);
};

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
