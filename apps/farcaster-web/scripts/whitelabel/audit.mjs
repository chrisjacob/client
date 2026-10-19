import console from 'node:console';
import process from 'node:process';
import {
  appRoot,
  auditBranding,
  inventory,
  loadBranding,
  upstreamHash,
  within,
} from './core.mjs';

if (process.argv[2] === '--hash') {
  console.log(upstreamHash(within(appRoot, process.argv[3])));
} else if (process.argv.includes('--inventory')) {
  process.stdout.write(`${JSON.stringify(inventory(), null, 2)}\n`);
} else {
  try {
    const branding = loadBranding();
    const problems = auditBranding(branding);
    if (problems.length) {
      console.error(
        `White-label review required:\n${problems.join('\n')}\nSee whitelabel/README.md. No owner files were changed.`,
      );
      process.exitCode = 1;
    } else {
      const counts = Object.fromEntries(
        ['app', 'preserve', 'legal', 'override'].map((category) => [
          category,
          branding.strings.filter((entry) => entry.category === category)
            .length,
        ]),
      );
      console.log(
        `White-label audit passed: ${branding.strings.length} catalogue entries ${JSON.stringify(counts)}, ${branding.resources.public.length} public and ${branding.resources.source.length} source resources.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
