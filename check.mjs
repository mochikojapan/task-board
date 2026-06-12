// check.mjs — run from the task-board/ project root:  node check.mjs
import { spawnSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');

const bold = (m) => `\x1b[1m${m}\x1b[0m`;
const green = (m) => `\x1b[32m${m}\x1b[0m`;
const red = (m) => `\x1b[31m${m}\x1b[0m`;
const step = (t) => console.log(`\n${bold(`=== ${t} ===`)}`);
const die = (m) => { console.error(red(`\n✗ ${m}`)); process.exit(1); };

if (!existsSync(path.join(backend, 'package.json')) || !existsSync(path.join(frontend, 'package.json')))
  die('Run this from the task-board/ root (must contain backend/ and frontend/).');

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) die(`"${cmd} ${args.join(' ')}" failed in ${path.basename(cwd)}/`);
}

step('1/4  Backend: install + tests');
run('npm', ['install', '--include=dev'], backend);
run('npm', ['test'], backend);

step('2/4  Frontend: install + tests');
run('npm', ['install', '--include=dev'], frontend);
run('npm', ['test'], frontend);

step('3/4  Frontend: production build (mirrors the Render build step)');
run('npm', ['run', 'build'], frontend);

step('4/4  Production smoke test on http://localhost:4100');
const PORT = '4100';
const base = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  cwd: backend,
  env: { ...process.env, NODE_ENV: 'production', PORT },
  stdio: 'inherit',
});

let pass = 0, fail = 0;
const ok = (m) => { console.log(green(`  ✓ ${m}`)); pass++; };
const bad = (m) => { console.log(red(`  ✗ ${m}`)); fail++; };
const get = (p, opts) => fetch(base + p, opts);

async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try { if ((await get('/health')).ok) return true; } catch {}
    await sleep(500);
  }
  return false;
}

try {
  if (!(await waitForHealth())) die('server never responded on /health (check the logs above)');

  let r = await get('/health');
  r.ok ? ok('GET /health → 200') : bad(`GET /health → ${r.status}`);

  r = await get('/');
  const html = await r.text();
  (r.ok && /<div id="root"|<title/i.test(html)) ? ok('GET / serves the built SPA') : bad('GET / did not serve the SPA');

  r = await get('/board/deep-link');
  (r.ok && (await r.text()).includes('<div id="root"')) ? ok('SPA fallback serves index.html on a deep route') : bad(`SPA fallback → ${r.status}`);

  r = await get('/api/tasks');
  r.status === 401 ? ok('GET /api/tasks without token → 401') : bad(`GET /api/tasks without token → ${r.status} (expected 401)`);

  r = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@taskboard.dev', password: 'password123' }),
  });
  const token = r.ok ? (await r.json()).token : null;
  token ? ok('POST /api/auth/login → token') : bad(`login failed → ${r.status}`);

  const h = { Authorization: `Bearer ${token}` };

  r = await get('/api/tasks', { headers: h });
  const list = r.ok ? await r.json() : {};
  (Array.isArray(list.data) && list.data.length > 0) ? ok(`GET /api/tasks → ${list.data.length} tasks`) : bad(`GET /api/tasks → ${r.status}`);

  r = await get('/api/stats', { headers: h });
  const s = r.ok ? await r.json() : {};
  s.byStatus ? ok(`GET /api/stats → todo ${s.byStatus.todo} / in_progress ${s.byStatus.in_progress} / done ${s.byStatus.done} / overdue ${s.overdue}`) : bad(`GET /api/stats → ${r.status}`);

  r = await get('/api/nope', { headers: h });
  r.status === 404 ? ok('GET /api/nope → 404') : bad(`GET /api/nope → ${r.status} (expected 404)`);
} finally {
  server.kill();
}

console.log((fail === 0 ? green : red)(`\nSmoke test: ${pass} passed, ${fail} failed`));
process.exit(fail === 0 ? 0 : 1);
