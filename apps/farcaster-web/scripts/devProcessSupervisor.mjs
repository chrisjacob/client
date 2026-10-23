import { setTimeout as sleep } from 'node:timers/promises';
import { log as defaultLog } from 'node:console';

// Keep the connector and origin independent: one exiting must not kill the other.
export async function superviseProcess({
  name,
  start,
  healthy,
  signal,
  onChild = () => {},
  log = defaultLog,
  intervalMs = 2000,
  startupGraceMs = 90_000,
  now = Date.now,
  pause = (ms) => sleep(ms, undefined, { signal }),
}) {
  let child;
  let startedAt = 0;
  let failedChecks = 0;
  const stop = () => child?.kill();
  signal.addEventListener('abort', stop, { once: true });
  try {
    while (!signal.aborted) {
      if (!child) {
        // Reuse an existing origin, but monitor it after attachment as well.
        if (!healthy || !(await healthy())) {
          if (signal.aborted) break;
          try {
            const launched = start();
            child = launched;
            startedAt = now();
            failedChecks = 0;
            onChild(launched);
            const ended = (reason) => {
              if (child !== launched) return;
              child = undefined;
              onChild(undefined);
              if (!signal.aborted)
                log(`${name} ${reason}; restarting shortly.`);
            };
            launched.once('exit', (code) => ended(`exited (${code})`));
            launched.once('error', (error) =>
              ended(`failed: ${error.message}`),
            );
            log(`${name} started (PID ${launched.pid}).`);
          } catch (error) {
            log(`${name} could not start: ${error.message}; retrying shortly.`);
          }
        }
      } else if (healthy && now() - startedAt >= startupGraceMs) {
        failedChecks = (await healthy()) ? 0 : failedChecks + 1;
        if (failedChecks >= 3) {
          log(`${name} stopped responding; restarting the managed process.`);
          child?.kill();
          failedChecks = 0;
        }
      }
      if (!signal.aborted) await pause(intervalMs);
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}
