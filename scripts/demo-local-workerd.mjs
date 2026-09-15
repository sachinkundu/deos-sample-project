import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const wrangler = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname;
const persistence = '/deos/output/workerd-state';
const failurePort = 20_000 + (process.pid % 10_000) * 2;
const recoveryPort = failurePort + 1;

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

function start(directory, port) {
  const child = spawn(process.execPath, [
    wrangler, 'pages', 'dev', directory,
    '--ip=127.0.0.1', `--port=${port}`, `--persist-to=${persistence}`,
    '--compatibility-date=2026-09-15',
  ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_EXTRA_CA_CERTS: '/etc/cloudflare/certs/cloudflare-containers-ca.crt' } });
  child.stdout.on('data', (chunk) => process.stdout.write(`[workerd] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stdout.write(`[workerd] ${chunk}`));
  child.on('error', (error) => process.stdout.write('[workerd] failed to start: ' + error.message + '\n'));
  return child;
}

async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 2000)),
  ]);
}

async function requestUntilReady(url, child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('workerd exited before readiness with code ' + child.exitCode);
    }
    try {
      const remaining = Math.max(1, deadline - Date.now());
      return await fetch(url, { signal: AbortSignal.timeout(Math.min(2_000, remaining)) });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('workerd did not become ready within ' + timeoutMs + 'ms: ' + (lastError?.message ?? 'unknown error'));
}

console.log('Built dist contents:');
for (const file of await listFiles('dist')) console.log(`- dist/${file}`);

const emptyAssets = await mkdtemp(join(tmpdir(), 'sac-225-empty-assets-'));
const failedPreview = start(emptyAssets, failurePort);
try {
  const response = await requestUntilReady('http://127.0.0.1:' + failurePort + '/', failedPreview);
  console.log(`Intentional empty-assets smoke test: HTTP ${response.status}`);
  if (response.ok) throw new Error('Empty asset preview unexpectedly returned a success response');
} catch (error) {
  console.log(`Intentional empty-assets smoke test failed safely: ${error.message}`);
} finally {
  await stop(failedPreview);
}
console.log('Decision: this failed preview is not presented for review.');

const workingPreview = start('dist', recoveryPort);
try {
  const response = await requestUntilReady('http://127.0.0.1:' + recoveryPort + '/', workingPreview);
  const html = await response.text();
  console.log(`Recovered workerd smoke test: HTTP ${response.status}`);
  console.log(html.slice(0, 500).replace(/\s+/g, ' '));
  if (!response.ok || !html.includes('class="calculator"') || !html.includes('id="display"')) {
    throw new Error('Recovered preview did not serve the calculator shell');
  }
  console.log('Recovered preview accepted: calculator shell and output are present.');
} finally {
  await stop(workingPreview);
}

process.exit(0);
