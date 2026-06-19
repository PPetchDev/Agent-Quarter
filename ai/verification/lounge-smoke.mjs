import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const debugPort = Number(process.env.LOUNGE_SMOKE_DEBUG_PORT ?? 9234);
const targetUrl = process.env.LOUNGE_SMOKE_URL ?? 'http://localhost:3000/lounge';
const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  return res.json();
}

async function waitForChrome() {
  const endpoint = `http://127.0.0.1:${debugPort}/json/version`;
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await getJson(endpoint);
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw lastError ?? new Error('Chrome did not expose CDP in time');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const events = [];
  let nextId = 1;

  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result);
      return;
    }
    if (payload.method) events.push(payload);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        events,
        send(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((commandResolve, commandReject) => {
            pending.set(id, { resolve: commandResolve, reject: commandReject });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', () => reject(new Error('WebSocket failed to open')));
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return result.result.value;
}

async function sample(client, label) {
  return evaluate(
    client,
    `(() => {
      try {
        const canvas = document.querySelector('canvas');
        const rect = canvas?.getBoundingClientRect();
        return {
          label: ${JSON.stringify(label)},
          readyState: document.readyState,
          url: location.href,
          title: document.title,
          canvasCount: document.querySelectorAll('canvas').length,
          canvasRect: rect ? {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom)
          } : null,
          viewport: { width: innerWidth, height: innerHeight },
          agentVisuals: Array.from(document.querySelectorAll('[data-agent-id]')).map((node) => ({
            id: node.getAttribute('data-agent-id'),
            spineStatus: node.getAttribute('data-agent-spine-status'),
            avatarFallback: node.getAttribute('data-agent-avatar-fallback')
          })),
          bodyText: document.body.innerText.slice(0, 500),
          evalError: null
        };
      } catch (error) {
        return {
          label: ${JSON.stringify(label)},
          readyState: document.readyState,
          url: location.href,
          canvasCount: document.querySelectorAll('canvas').length,
          canvasRect: null,
          viewport: { width: innerWidth, height: innerHeight },
          agentVisuals: [],
          bodyText: '',
          evalError: error.message
        };
      }
    })()`,
  );
}

async function canvasColorCount(client, snapshot, label) {
  const rect = snapshot.canvasRect;
  if (!rect) return { label, uniqueColors: 0, clip: null };
  const x = Math.max(0, rect.left);
  const y = Math.max(0, rect.top);
  const width = Math.max(1, Math.min(snapshot.viewport.width - x, rect.right - x));
  const height = Math.max(1, Math.min(snapshot.viewport.height - y, rect.bottom - y));
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    clip: { x, y, width, height, scale: 1 },
  });
  const file = join(tmpdir(), `squad-lounge-${label}-${Date.now()}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  try {
    const { stdout: colorStdout } = await execFileAsync('magick', [
      file,
      '-resize',
      '96x96!',
      '-format',
      '%k',
      'info:',
    ]);
    return {
      label,
      uniqueColors: Number(colorStdout.trim()),
      clip: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      },
    };
  } finally {
    await rm(file, { force: true });
  }
}

async function waitForLoungeReady(client) {
  const deadline = Date.now() + 25000;
  let snapshot;
  while (Date.now() < deadline) {
    snapshot = await sample(client, 'wait');
    if (
      snapshot.readyState === 'complete' &&
      snapshot.canvasCount > 0 &&
      snapshot.canvasRect?.width > 100 &&
      snapshot.canvasRect?.height > 100 &&
      snapshot.evalError === null
    ) {
      return snapshot;
    }
    await sleep(500);
  }
  throw new Error(`Lounge did not render in time: ${JSON.stringify(snapshot)}`);
}

async function waitForAgentSpineVisuals(client) {
  const deadline = Date.now() + 25000;
  let snapshot;
  while (Date.now() < deadline) {
    snapshot = await sample(client, 'agent-visuals');
    const visuals = snapshot.agentVisuals ?? [];
    const loaded = visuals.filter((item) => item.spineStatus === 'loaded').length;
    const fallback = visuals.filter((item) => item.avatarFallback === 'true').length;
    if (visuals.length === 5 && loaded === 5 && fallback === 0) {
      return snapshot;
    }
    await sleep(500);
  }
  throw new Error(`Agent Spine visuals did not settle in time: ${JSON.stringify(snapshot)}`);
}

const userDataDir = await mkdtemp(join(tmpdir(), 'squad-lounge-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${userDataDir}`,
  // Pixi needs a renderer even in headless Chrome; disabling GPU makes
  // autoDetectRenderer fail before the lounge can mount.
  '--ignore-gpu-blocklist',
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1280,900',
  'about:blank',
]);

let stdout = '';
let stderr = '';
chrome.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});
chrome.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

let client;
let eventPump;
let failedEarly = false;
try {
  await waitForChrome();
  const target = await getJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  });
  client = await connect(target.webSocketDebuggerUrl);

  const consoleErrors = [];
  const pageErrors = [];
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.navigate', { url: targetUrl });

  const drainEvents = () => {
    const drained = client.events.splice(0);
    for (const event of drained) {
      if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') {
        consoleErrors.push(event.params.args.map((arg) => arg.value ?? arg.description).join(' '));
      }
      if (event.method === 'Runtime.exceptionThrown') {
        const details = event.params.exceptionDetails;
        pageErrors.push(
          details.exception?.description ??
            details.exception?.value ??
            details.text ??
            'Runtime.exceptionThrown',
        );
      }
    }
  };
  eventPump = setInterval(drainEvents, 100);

  try {
    await waitForLoungeReady(client);
  } catch (error) {
    drainEvents();
    console.log(
      JSON.stringify(
        {
          ok: false,
          targetUrl,
          failure: error.message,
          consoleErrors,
          pageErrors,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    failedEarly = true;
  }
  if (!failedEarly) {
    try {
      await waitForAgentSpineVisuals(client);
    } catch (error) {
      drainEvents();
      console.log(
        JSON.stringify(
          {
            ok: false,
            targetUrl,
            failure: error.message,
            consoleErrors,
            pageErrors,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      failedEarly = true;
    }
  }
  if (!failedEarly) {
    await sleep(1500);
    const desktop = await sample(client, 'desktop');
    const desktopPixels = await canvasColorCount(client, desktop, 'desktop');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    const mobile = await sample(client, 'mobile');
    const mobilePixels = await canvasColorCount(client, mobile, 'mobile');
    drainEvents();
    clearInterval(eventPump);
    eventPump = undefined;

    const ok =
      desktop.readyState === 'complete' &&
      desktop.canvasCount > 0 &&
      desktop.canvasRect.width > 100 &&
      desktop.canvasRect.height > 100 &&
      mobile.canvasCount > 0 &&
      mobile.canvasRect.width > 100 &&
      mobile.canvasRect.height > 100 &&
      desktopPixels.uniqueColors > 20 &&
      mobilePixels.uniqueColors > 20 &&
      desktop.agentVisuals.length === 5 &&
      desktop.agentVisuals.every(
        (item) => item.spineStatus === 'loaded' && item.avatarFallback === 'false',
      ) &&
      mobile.agentVisuals.length === 5 &&
      mobile.agentVisuals.every(
        (item) => item.spineStatus === 'loaded' && item.avatarFallback === 'false',
      ) &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0;

    console.log(
      JSON.stringify(
        {
          ok,
          targetUrl,
          desktop,
          desktopPixels,
          mobile,
          mobilePixels,
          consoleErrors,
          pageErrors,
        },
        null,
        2,
      ),
    );

    if (!ok) process.exitCode = 1;
  }
} finally {
  if (eventPump) clearInterval(eventPump);
  client?.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => {
    chrome.once('exit', resolve);
    setTimeout(resolve, 2000);
  });
  await rm(userDataDir, { recursive: true, force: true });
  if (process.exitCode && (stdout || stderr)) {
    console.error(stdout);
    console.error(stderr);
  }
}
