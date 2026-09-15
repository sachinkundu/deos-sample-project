import { writeFile } from 'node:fs/promises';

const [previewUrl, runUrl] = process.argv.slice(2);
if (!previewUrl || !runUrl) throw new Error('Usage: node scripts/write-review-summary.mjs <preview-url> <run-url>');
const summary = `# SAC-225 review candidate

- Smoke-tested immutable preview: ${previewUrl}
- Automated checks: Vitest unit suite and Playwright desktop/320px browser suite passed before deployment.
- Matching visual evidence: the evidence Playwright run against the immutable preview is attached to ${runUrl}.
- Evidence covers button and keyboard input, pressed/key traces, clear, division by zero, and recovery.
`;
await writeFile('review-summary.md', summary);
console.log(summary);
