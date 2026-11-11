#!/usr/bin/env node
// chrome-shot.mjs — headless screenshot + timing + console capture over CDP.
//
// Why chrome-headless-shell and not "Google Chrome": under the seatbelt
// sandbox full Chrome aborts at startup because ProcessSingleton creates its
// socket dir via NSTemporaryDirectory() (/var/folders/<user>/T), which the
// sandbox denies; TMPDIR / --user-data-dir do not move it. chrome-headless-shell
// has no ProcessSingleton, so it starts fine.
//
// Usage:
//   node chrome-shot.mjs <url> <out.png> [options]
//     --width N        viewport width  (default 1600)
//     --height N       viewport height (default 1000)
//     --wait-for SEL   wait until document.querySelector(SEL) exists
//     --idle MS        network-idle window after load (default 800)
//     --max-wait MS    hard cap for the whole settle phase (default 30000)
//     --full           capture the full page height (default: viewport only)
//     --json           machine-readable summary on stdout (default: text)

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('usage: node chrome-shot.mjs <url> <out.png> [--width N] [--height N] [--wait-for SEL] [--idle MS] [--max-wait MS] [--full] [--json]');
  process.exit(2);
}

const url = args[0];
const out = args[1];
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const width = Number(opt('width', 1600));
const height = Number(opt('height', 1000));
const waitFor = opt('wait-for', null);
const idleMs = Number(opt('idle', 800));
const maxWait = Number(opt('max-wait', 30000));
const fullPage = flag('full');
const asJson = flag('json');

function findHeadlessShell() {
  if (process.env.CHROME_HEADLESS_SHELL) return process.env.CHROME_HEADLESS_SHELL;
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(cache)) throw new Error(`no Playwright browser cache at ${cache}`);
  const dirs = readdirSync(cache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()));
  for (const d of dirs) {
    const base = join(cache, d);
    for (const arch of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64']) {
      const bin = join(base, arch, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error(`no chrome-headless-shell under ${cache}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rpc(ws, method, params = {}, sessionId) {
  const id = ++rpc.n;
  return new Promise((resolve, reject) => {
    const pending = rpc.pending;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
rpc.n = 0;
rpc.pending = new Map();

async function main() {
  const bin = findHeadlessShell();
  const profile = mkdtempSync(join(tmpdir(), 'chrome-shot-'));
  const events = [];
  const consoleLines = [];
  const pageErrors = [];
  let child;
  let ws;

  const cleanup = () => {
    try { ws?.close(); } catch {}
    try { child?.kill('SIGKILL'); } catch {}
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  process.on('exit', cleanup);

  child = spawn(bin, [
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--disable-breakpad',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const debugUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error(`no DevTools endpoint; stderr:\n${buf.slice(-2000)}`)), 20000);
    child.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); resolve(new URL(m[1])); }
    });
    child.on('exit', (code) => { clearTimeout(t); reject(new Error(`headless shell exited early (${code}); stderr:\n${buf.slice(-2000)}`)); });
  });

  // Fresh page target.
  const hostPort = `${debugUrl.hostname}:${debugUrl.port}`;
  const newTarget = await fetch(`http://${hostPort}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const pageWs = new WebSocket(newTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { pageWs.onopen = res; pageWs.onerror = () => rej(new Error('ws connect failed')); });
  ws = pageWs;
  const navStart = Date.now();
  let inflight = 0;
  let lastActivity = Date.now();
  const net = { sent: 0, failed: 0, finished: 0, bytes: 0 };

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && rpc.pending.has(msg.id)) {
      const { resolve, reject, timer } = rpc.pending.get(msg.id);
      rpc.pending.delete(msg.id); clearTimeout(timer);
      if (msg.error) reject(new Error(`${msg.error.message}`)); else resolve(msg.result);
      return;
    }
    const p = msg.params || {};
    events.push({ method: msg.method, params: p, ts: Date.now() });
    switch (msg.method) {
      case 'Runtime.consoleAPICalled':
        consoleLines.push({ type: p.type, text: (p.args || []).map((a) => a.value ?? a.description ?? '').join(' ') });
        break;
      case 'Runtime.exceptionThrown':
        pageErrors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception');
        break;
      case 'Log.entryAdded': {
        const e = p.entry || {};
        if (e.level === 'error' || e.level === 'warning') consoleLines.push({ type: e.level, text: e.text });
        break;
      }
      case 'Network.requestWillBeSent': inflight++; net.sent++; lastActivity = Date.now(); break;
      case 'Network.loadingFinished': inflight = Math.max(0, inflight - 1); net.finished++; net.bytes += p.encodedDataLength || 0; lastActivity = Date.now(); break;
      case 'Network.loadingFailed': inflight = Math.max(0, inflight - 1); net.failed++; lastActivity = Date.now(); break;
      default: break;
    }
  };

  await rpc(ws, 'Page.enable');
  await rpc(ws, 'Runtime.enable');
  await rpc(ws, 'Log.enable');
  await rpc(ws, 'Network.enable');
  await rpc(ws, 'Performance.enable');
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  await rpc(ws, 'Page.navigate', { url });

  const deadline = Date.now() + maxWait;
  let loaded = false;
  while (!loaded && Date.now() < deadline) {
    if (events.some((e) => e.method === 'Page.loadEventFired')) loaded = true;
    else await sleep(25);
  }
  if (!loaded) pageErrors.push('load event never fired before --max-wait');

  const loadMs = Date.now() - navStart;

  // Optional selector wait.
  let selectorMs = null;
  if (waitFor) {
    const t0 = Date.now();
    for (;;) {
      const r = await rpc(ws, 'Runtime.evaluate', { expression: `!!document.querySelector(${JSON.stringify(waitFor)})`, returnByValue: true }).catch(() => ({ result: { value: false } }));
      if (r?.result?.value) { selectorMs = Date.now() - t0; break; }
      if (Date.now() > deadline) { pageErrors.push(`selector not found: ${waitFor}`); break; }
      await sleep(50);
    }
  }

  // Network idle (in-flight == 0 for idleMs), bounded by deadline.
  const idleStart = Date.now();
  for (;;) {
    if (inflight === 0 && Date.now() - lastActivity >= idleMs) break;
    if (Date.now() > deadline) break;
    await sleep(50);
  }
  const settleMs = Date.now() - idleStart;

  const metrics = await rpc(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
        loadEvent: Math.round(nav.loadEventEnd || 0),
        responseEnd: Math.round(nav.responseEnd || 0),
        fcp: paints['first-contentful-paint'] ?? null,
        resources: performance.getEntriesByType('resource').length,
        canvases: [...document.querySelectorAll('canvas')].map(c => [c.width, c.height]),
        title: document.title,
      };
    })()`,
    returnByValue: true,
  }).then((r) => r.result.value);

  const shot = await rpc(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
    ...(fullPage ? { fromSurface: true } : {}),
  });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));

  const errors = consoleLines.filter((l) => l.type === 'error');
  const warnings = consoleLines.filter((l) => l.type === 'warning' || l.type === 'warn');
  const summary = {
    url, screenshot: out, width, height,
    loadMs, selectorMs, settleMs,
    metrics,
    network: net,
    consoleErrors: errors.slice(0, 20),
    consoleWarnings: warnings.slice(0, 10),
    pageErrors: pageErrors.slice(0, 10),
  };
  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`screenshot: ${out}`);
    console.log(`load event: ${loadMs} ms${selectorMs != null ? `, selector: ${selectorMs} ms` : ''}, network-idle settle: ${settleMs} ms`);
    console.log(`DOMContentLoaded ${metrics.domContentLoaded} ms, loadEventEnd ${metrics.loadEvent} ms, FCP ${metrics.fcp} ms, ${metrics.resources} resources`);
    console.log(`canvas: ${metrics.canvases.map((c) => c.join('x')).join(', ') || '(none)'}`);
    console.log(`requests: ${net.sent} sent, ${net.finished} finished, ${net.failed} failed, ${(net.bytes / 1024).toFixed(0)} KiB`);
    if (errors.length) console.log(`console errors (${errors.length}):\n` + errors.slice(0, 20).map((e) => '  - ' + e.text.slice(0, 300)).join('\n'));
    if (warnings.length) console.log(`console warnings: ${warnings.length}`);
    if (pageErrors.length) console.log('page errors:\n' + pageErrors.slice(0, 10).map((e) => '  - ' + e).join('\n'));
  }
  cleanup();
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
