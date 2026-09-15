import { readFile } from 'node:fs/promises';

const logPath = process.argv[2];
if (!logPath) throw new Error('Usage: node scripts/extract-preview-url.mjs <deploy-log>');
const log = await readFile(logPath, 'utf8');
const urls = [...log.matchAll(/https:\/\/[a-z0-9-]+\.sac-225-calculator\.pages\.dev/gi)].map((match) => match[0]);
const immutable = urls.find((url) => {
  const hostPrefix = new URL(url).hostname.split('.')[0];
  return hostPrefix !== 'review-sac-225' && hostPrefix !== 'sac-225-calculator';
});
if (!immutable) throw new Error('Wrangler output did not contain an immutable hash preview URL');
process.stdout.write(`${immutable}\n`);
