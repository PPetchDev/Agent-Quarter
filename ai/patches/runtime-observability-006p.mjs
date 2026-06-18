import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const debugPort = Number(process.env.CDP_PORT ?? 9233);
const appUrl = process.env.AAS_WEB_URL ?? 'http://localhost:3000/projects';
const apiBase = process.env.AAS_API_URL ?? 'http://localhost:3001';
const runId = process.env.AAS_RUN_ID ?? 'r-002';
const taskId = process.env.AAS_TASK_ID ?? 't-002';
const projectTitle = process.env.AAS_PROJECT_TITLE ?? 'Auth Service Refactor';
const taskTitle = process.env.AAS_TASK_TITLE ?? 'Implement token blacklist endpoint';
const cwd = process.cwd();

function redact(value) {
  if (typeof value !== 'string') return value;
  return value
    .replaceAll(cwd, '[CWD]')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/hsk_[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9+/=_-]{40,}/g, '[REDACTED]');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs, intervalMs = 250) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return last;
    await wait(intervalMs);
  }
  return last;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${res.status}`);
  }
  return res.json();
}

async function waitForCdp() {
  return waitFor(async () => {
    try {
      return await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
    } catch {
      return null;
    }
  }, 10_000);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 10_000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('CDP websocket error'));
      });
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message ?? 'CDP error'} (${msg.error.code ?? 'no-code'})`));
        else resolve(msg.result ?? {});
        return;
      }
      for (const listener of this.listeners) listener(msg);
    });
  }

  onEvent(listener) {
    this.listeners.push(listener);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function createTarget() {
  const base = `http://127.0.0.1:${debugPort}/json/new?about:blank`;
  try {
    return await fetchJson(base, { method: 'PUT' });
  } catch {
    return fetchJson(base);
  }
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

const userDataDir = await mkdtemp(join(tmpdir(), 'aas-cdp-006p-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  '--disable-background-networking',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
], {
  stdio: ['ignore', 'ignore', 'pipe'],
});

const chromeErrors = [];
chrome.stderr.on('data', (chunk) => {
  const text = redact(chunk.toString('utf8').trim());
  if (text) chromeErrors.push(text.slice(0, 300));
});

const state = {
  console: [],
  exceptions: [],
  socketRequests: [],
  socketFailures: [],
  executeRequests: [],
  executeResponses: [],
  executeFailures: [],
  responseBodies: new Map(),
};

let client;

try {
  const version = await waitForCdp();
  if (!version) throw new Error('Chrome CDP did not become ready');

  const target = await createTarget();
  client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  client.onEvent((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      state.console.push({
        type: msg.params.type,
        text: redact((msg.params.args ?? []).map((arg) => arg.value ?? arg.description ?? '').join(' ')).slice(0, 500),
      });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      state.exceptions.push(redact(msg.params.exceptionDetails?.text ?? 'exception').slice(0, 500));
    }
    if (msg.method === 'Network.requestWillBeSent') {
      const req = msg.params.request;
      const url = req.url;
      if (url.includes('/socket.io/') || url.includes('/runs')) {
        state.socketRequests.push(redact(url));
      }
      if (url.includes(`/api/runs/${runId}/execute`)) {
        state.executeRequests.push({
          requestId: msg.params.requestId,
          method: req.method,
          url: redact(url),
          postData: redact(req.postData ?? ''),
        });
      }
    }
    if (msg.method === 'Network.responseReceived') {
      const request = state.executeRequests.find((item) => item.requestId === msg.params.requestId);
      if (request) {
        state.executeResponses.push({
          requestId: msg.params.requestId,
          status: msg.params.response.status,
          url: redact(msg.params.response.url),
        });
      }
    }
    if (msg.method === 'Network.loadingFinished') {
      const request = state.executeRequests.find((item) => item.requestId === msg.params.requestId);
      if (request) {
        client.send('Network.getResponseBody', { requestId: msg.params.requestId })
          .then((body) => {
            state.responseBodies.set(msg.params.requestId, redact(body.body ?? ''));
          })
          .catch((err) => {
            state.responseBodies.set(msg.params.requestId, `BODY_ERROR:${redact(err.message)}`);
          });
      }
    }
    if (msg.method === 'Network.loadingFailed') {
      const request = state.executeRequests.find((item) => item.requestId === msg.params.requestId);
      const failedUrl = state.socketRequests.at(-1);
      if (request) {
        state.executeFailures.push({ requestId: msg.params.requestId, errorText: msg.params.errorText });
      } else if (failedUrl) {
        state.socketFailures.push({ url: failedUrl, errorText: msg.params.errorText });
      }
    }
    if (msg.method === 'Network.webSocketCreated') {
      state.socketRequests.push(redact(msg.params.url));
    }
  });

  await client.send('Network.enable');
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Log.enable').catch(() => {});

  await client.send('Page.navigate', { url: appUrl });
  await waitFor(async () => {
    const ready = await evaluate(client, 'document.readyState');
    return ready === 'complete';
  }, 30_000);
  await wait(2_000);

  const preClick = await evaluate(client, `(() => {
    function contextFor(button) {
      const card = button.closest('.group');
      return card?.innerText || '';
    }

    const body = document.body.innerText;
    const buttonNodes = [...document.querySelectorAll('button')];
    const buttons = buttonNodes.map((button) => button.textContent.trim());
    const devButtonDetails = buttonNodes
      .filter((button) => /dev:\\s*run read-only/i.test(button.textContent))
      .map((button) => {
        const context = contextFor(button);
        return {
          text: button.textContent.trim(),
          context: context.split('\\n').map((line) => line.trim()).filter(Boolean).slice(0, 12),
          isTarget:
            context.includes(${JSON.stringify(projectTitle)}) &&
            context.includes(${JSON.stringify(taskTitle)}),
        };
      });
    const targetButtonCount = devButtonDetails.filter((item) => item.isTarget).length;
    return {
      url: location.href,
      buttons,
      devButtonCount: devButtonDetails.length,
      targetButtonCount,
      devButtonDetails,
      hasWorkspaceWrite: /workspace-write/i.test(body),
      hasDangerFullAccess: /danger-full-access/i.test(body),
      hasCwdText: /cwd/i.test(body),
      hasPromptTextarea: Boolean(document.querySelector('textarea')),
      executionLines: body.split('\\n').filter((line) => /Execution|Starting|Dev:\\s*Run/i.test(line)).slice(-20),
    };
  })()`);

  if (preClick.targetButtonCount !== 1) {
    console.log(JSON.stringify({ preClick }, null, 2));
    throw new Error(`Expected exactly one target dev run button, found ${preClick.targetButtonCount}`);
  }
  if (preClick.hasWorkspaceWrite || preClick.hasDangerFullAccess || preClick.hasCwdText || preClick.hasPromptTextarea) {
    throw new Error(`Unsafe pre-click UI flags: ${JSON.stringify(preClick)}`);
  }

  const clicked = await evaluate(client, `(() => {
    function isTarget(button) {
      const card = button.closest('.group');
      const text = card?.innerText || '';
      return text.includes(${JSON.stringify(projectTitle)}) && text.includes(${JSON.stringify(taskTitle)});
    }

    const button = [...document.querySelectorAll('button')]
      .find((item) => /dev:\\s*run read-only/i.test(item.textContent) && isTarget(item));
    if (!button) return { clicked: false };
    button.click();
    return { clicked: true, text: button.textContent.trim() };
  })()`);
  if (!clicked.clicked) throw new Error('Dev run button was not clicked');

  await waitFor(() => state.executeRequests.length > 0 && state.executeResponses.length > 0, 30_000);
  await wait(500);

  const terminal = await waitFor(async () => {
    const panel = await evaluate(client, `(() => {
      const body = document.body.innerText;
      const lines = body.split('\\n').map((line) => line.trim()).filter(Boolean);
      const executionLines = lines.filter((line) => /Execution|provider:|\\[info\\]|failed|completed|started/i.test(line)).slice(-30);
      return {
        hasStarted: /Execution started/i.test(body),
        hasCompleted: /Execution completed/i.test(body),
        hasFailed: /Execution failed/i.test(body),
        hasWorkspaceWrite: /workspace-write/i.test(body),
        hasDangerFullAccess: /danger-full-access/i.test(body),
        hasCwdText: /cwd/i.test(body),
        executionLines,
      };
    })()`);
    return (panel.hasCompleted || panel.hasFailed) ? panel : null;
  }, 145_000, 1_000);

  const finalPanel = terminal ?? await evaluate(client, `(() => {
    const body = document.body.innerText;
    const lines = body.split('\\n').map((line) => line.trim()).filter(Boolean);
    return {
      hasStarted: /Execution started/i.test(body),
      hasCompleted: /Execution completed/i.test(body),
      hasFailed: /Execution failed/i.test(body),
      hasWorkspaceWrite: /workspace-write/i.test(body),
      hasDangerFullAccess: /danger-full-access/i.test(body),
      hasCwdText: /cwd/i.test(body),
      executionLines: lines.filter((line) => /Execution|provider:|\\[info\\]|failed|completed|started/i.test(line)).slice(-30),
    };
  })()`);

  const runsRes = await fetch(`${apiBase}/api/tasks/${taskId}/runs`);
  const runsBody = await runsRes.text();
  const runs = JSON.parse(runsBody);
  const selectedRun = Array.isArray(runs) ? runs.find((run) => run.id === runId) : null;

  const executeBodies = state.executeResponses.map((response) => ({
    requestId: response.requestId,
    status: response.status,
    url: response.url,
    body: state.responseBodies.get(response.requestId) ?? null,
  }));

  const parsedPayloads = state.executeRequests.map((request) => {
    let parsed = null;
    try {
      parsed = request.postData ? JSON.parse(request.postData) : null;
    } catch {
      parsed = null;
    }
    const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).sort() : [];
    return {
      method: request.method,
      url: request.url,
      keys,
      mode: parsed?.mode,
      promptLength: typeof parsed?.prompt === 'string' ? parsed.prompt.length : null,
      hasForbiddenField:
        keys.includes('cwd') ||
        keys.includes('sandbox') ||
        keys.includes('args') ||
        request.postData.includes('workspace-write') ||
        request.postData.includes('danger-full-access'),
    };
  });

  const summary = {
    preClick,
    clicked,
    executeRequestCount: state.executeRequests.length,
    executeRequests: parsedPayloads,
    executeResponses: executeBodies,
    executeFailures: state.executeFailures,
    socket: {
      requestCount: state.socketRequests.length,
      sampleUrls: [...new Set(state.socketRequests)].slice(0, 8),
      failures: state.socketFailures.slice(0, 8),
      hasLocalhost3001: state.socketRequests.some((url) => url.includes('localhost:3001') || url.includes('127.0.0.1:3001')),
      hasLocalhost3000RunsFailure: state.socketFailures.some((item) => /localhost:3000.*runs/i.test(item.url)),
    },
    console: {
      count: state.console.length,
      errors: state.console.filter((item) => item.type === 'error').slice(0, 10),
      hookOrHydrationErrors: state.console
        .filter((item) => /hook|hydration|rendered more hooks/i.test(item.text))
        .slice(0, 10),
      exceptions: state.exceptions.slice(0, 10),
    },
    panel: finalPanel,
    lifecycle: {
      statusCode: runsRes.status,
      selectedRun,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  client?.close();
  chrome.kill('SIGTERM');
  await wait(500);
  await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
