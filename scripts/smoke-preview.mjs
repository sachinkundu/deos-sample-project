const previewUrl = process.argv[2];
if (!previewUrl) throw new Error('Usage: node scripts/smoke-preview.mjs <preview-url>');

const response = await fetch(previewUrl, { redirect: 'follow' });
const html = await response.text();
console.log(`GET ${previewUrl}`);
console.log(`HTTP ${response.status}`);
console.log(html.slice(0, 500).replace(/\s+/g, ' '));

if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
for (const expected of ['class="calculator"', 'id="display"', 'data-action="calculate"']) {
  if (!html.includes(expected)) throw new Error(`Preview HTML is missing ${expected}`);
}
console.log('Smoke test passed: calculator shell and output are present.');
