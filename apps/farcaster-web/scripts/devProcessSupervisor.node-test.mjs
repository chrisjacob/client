import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { superviseProcess } from './devProcessSupervisor.mjs';

async function exercise({ healthy, startupGraceMs, step, startError = false }) {
  const controller = new globalThis.AbortController();
  const children = [];
  let ticks = 0;
  let starts = 0;
  await superviseProcess({
    name: 'fixture',
    signal: controller.signal,
    startupGraceMs,
    healthy: healthy && (() => healthy(ticks)),
    now: () => ticks * 2000,
    log() {},
    start() {
      starts++;
      if (startError && starts === 1)
        throw new Error('temporary spawn failure');
      const child = new EventEmitter();
      child.pid = starts;
      child.kills = 0;
      child.kill = () => {
        child.kills++;
        child.emit('exit', 0);
      };
      children.push(child);
      return child;
    },
    async pause() {
      ticks++;
      if (ticks > 10) throw new Error('supervisor did not stop');
      step({ ticks, children, controller });
    },
  });
  return { children, starts };
}

test('restarts a failed child and stops its replacement on shutdown', async () => {
  const { children } = await exercise({
    step({ ticks, children, controller }) {
      if (ticks === 1) children[0].emit('exit', 1);
      if (ticks === 2) controller.abort();
    },
  });
  assert.equal(children.length, 2);
  assert.equal(children[1].kills, 1);
});

test('monitors a reused origin and starts a managed replacement when it disappears', async () => {
  const { children } = await exercise({
    healthy: (ticks) => ticks === 0,
    step({ ticks, children, controller }) {
      if (ticks === 1) assert.equal(children.length, 0);
      if (ticks === 2) controller.abort();
    },
  });
  assert.equal(children.length, 1);
});

test('allows startup time, and restarts an owned origin only after three failed checks', async () => {
  const { children } = await exercise({
    healthy: () => false,
    startupGraceMs: 4000,
    step({ ticks, children, controller }) {
      if (ticks <= 4) assert.equal(children[0].kills, 0);
      if (ticks === 5) assert.equal(children[0].kills, 1);
      if (ticks === 6) controller.abort();
    },
  });
  assert.equal(children.length, 2);
});

test('retries a spawn failure without abandoning supervision', async () => {
  const result = await exercise({
    startError: true,
    step({ ticks, controller }) {
      if (ticks === 2) controller.abort();
    },
  });
  assert.equal(result.starts, 2);
  assert.equal(result.children.length, 1);
});
