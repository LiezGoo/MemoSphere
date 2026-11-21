import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

const baseUrl = process.env.MEMOSPHERE_BASE_URL ?? 'http://localhost:3000';
const authCookie = process.env.MEMOSPHERE_AUTH_COOKIE;
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const routes = [
  ['/dashboard', '/dashboard'], ['/my-diary', '/my-diary'], ['/my-diary?entry=nav-test', '/my-diary'], ['/writing-modes', '/writing-modes'],
  ['/memory-timeline', '/memory-timeline'], ['/files', '/files'], ['/beneficiaries', '/beneficiaries'],
  ['/legacy-policy', '/legacy-policy'], ['/letter-of-wishes', '/letter-of-wishes'], ['/settings', null],
];
const outputDir = path.resolve('artifacts/nav-consistency');
const profileDir = await mkdtemp(path.join(tmpdir(), 'memosphere-nav-'));
const port = await getFreePort();
let chrome;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForDebugger() {
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch { /* Chrome is still starting. */ }
    await sleep(125);
  }
  throw new Error('Chrome remote debugging did not start. Set CHROME_PATH to a Chrome executable.');
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('open', () => resolve({
      socket,
      send(method, params = {}) {
        const id = ++nextId;
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((ok, fail) => pending.set(id, { ok, fail }));
      },
    }), { once: true });
    socket.addEventListener('error', reject, { once: true });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const callbacks = pending.get(message.id);
      if (!callbacks) return;
      pending.delete(message.id);
      if (message.error) callbacks.fail(new Error(message.error.message));
      else callbacks.ok(message.result);
    });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed.');
  return result.result.value;
}

async function checkKeyboardFocus(cdp) {
  await evaluate(cdp, 'document.activeElement?.blur()');
  for (let index = 0; index < 24; index += 1) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const ring = await evaluate(cdp, `(() => {
      const element = document.activeElement;
      if (!element?.matches('.app-sidebar-link')) return null;
      const css = getComputedStyle(element);
      return { style: css.outlineStyle, width: css.outlineWidth, color: css.outlineColor, offset: css.outlineOffset };
    })()`);
    if (ring) {
      await evaluate(cdp, 'document.activeElement?.blur()');
      if (ring.style === 'none' || ring.width === '0px') throw new Error('Sidebar keyboard focus ring is not visible.');
      return ring;
    }
  }
  throw new Error('Tab did not reach the sidebar navigation within 24 stops.');
}

async function waitForApp(cdp, route) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await evaluate(cdp, '({ path: location.pathname, hasHeader: !!document.querySelector(".app-header"), hasSidebar: !!document.querySelector(".app-sidebar") })');
    if (state.path !== route) throw new Error(`Navigating to ${route} redirected to ${state.path}. Set MEMOSPHERE_AUTH_COOKIE to an authenticated local session cookie.`);
    if (state.hasHeader && state.hasSidebar) return;
    await sleep(100);
  }
  throw new Error(`Shared header/sidebar did not render on ${route}.`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  const targets = await waitForDebugger();
  const target = targets.find((item) => item.type === 'page');
  if (!target) throw new Error('Chrome started without a page target.');
  const cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  if (authCookie) await cdp.send('Network.setExtraHTTPHeaders', { headers: { Cookie: authCookie } });
  const viewports = [{ name: '1440', width: 1440, height: 900, mobile: false }, { name: '390', width: 390, height: 844, mobile: true }];
  const reference = new Map();
  const results = [];

  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    for (const [route, expectedHref] of routes) {
      await cdp.send('Page.navigate', { url: new URL(route, baseUrl).href });
      await waitForApp(cdp, new URL(route, baseUrl).pathname);
      await sleep(250);
      if (viewport.mobile) {
        await evaluate(cdp, 'document.querySelector(".app-header [aria-controls=app-sidebar]")?.click()');
        for (let attempt = 0; attempt < 30; attempt += 1) {
          if (await evaluate(cdp, 'document.querySelector(".app-sidebar.is-open") !== null')) break;
          await sleep(50);
        }
      }
      const focusRing = await checkKeyboardFocus(cdp);
      const snapshot = await evaluate(cdp, `(() => {
        const links = [...document.querySelectorAll('.app-sidebar-link')];
        const active = document.querySelector('.app-sidebar-link[aria-current="page"]');
        const style = (element) => {
          const css = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return { background: css.backgroundColor, backgroundImage: css.backgroundImage, border: css.border, boxShadow: css.boxShadow, borderRadius: css.borderRadius, iconColor: getComputedStyle(element.querySelector('svg')).color, width: rect.width, height: rect.height };
        };
        const header = getComputedStyle(document.querySelector('.app-header'));
        const rail = getComputedStyle(document.querySelector('.app-sidebar'));
        const items = links.map((item) => { const rect = item.getBoundingClientRect(); return { top: Math.round(rect.top * 100) / 100, height: Math.round(rect.height * 100) / 100 }; });
        const activeLook = active ?? links[0];
        if (!active) activeLook.setAttribute('aria-current', 'page');
        const activeStyle = style(activeLook);
        if (!active) activeLook.removeAttribute('aria-current');
        return {
          activeHref: active?.getAttribute('href') ?? null,
          active: activeStyle,
          inactive: style(links.find((item) => item !== active)),
          positions: items,
          rail: { background: rail.backgroundColor, border: rail.border, radius: rail.borderRadius },
          header: { background: header.backgroundColor, image: header.backgroundImage, border: header.borderBottomColor },
          accountActive: document.querySelector('.app-header-button.is-active') !== null,
        };
      })()`);

      if (expectedHref && snapshot.activeHref !== expectedHref) throw new Error(`${route}: expected active link ${expectedHref}, received ${snapshot.activeHref ?? 'none'}.`);
      if (!expectedHref && !snapshot.accountActive) throw new Error(`${route}: expected the existing account/settings header item to be active.`);
      const key = viewport.name;
      const comparable = { active: snapshot.active, inactive: snapshot.inactive, positions: snapshot.positions, rail: snapshot.rail, header: snapshot.header, focusRing };
      const prior = reference.get(key);
      if (prior && JSON.stringify(prior) !== JSON.stringify(comparable)) throw new Error(`${route} differs from the shared nav/header baseline at ${viewport.name}px.`);
      if (!prior) reference.set(key, comparable);

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      const parsedRoute = new URL(route, baseUrl);
      const routeName = `${parsedRoute.pathname.slice(1).replaceAll('/', '-') || 'home'}${parsedRoute.searchParams.has('entry') ? '-entry' : ''}`;
      await writeFile(path.join(outputDir, `${routeName}-${viewport.name}.png`), Buffer.from(screenshot.data, 'base64'));
      results.push({ route, viewport: viewport.name, activeHref: snapshot.activeHref, header: snapshot.header, navItemSize: snapshot.active?.width ? [snapshot.active.width, snapshot.active.height] : null });
    }
  }

  console.log(JSON.stringify({ checkedRoutes: routes.length, viewports: viewports.map(({ name }) => name), screenshots: outputDir, results }, null, 2));
  cdp.socket.close();
}

try {
  await main();
} finally {
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([exited, sleep(3000)]);
  }
  const resolvedProfile = path.resolve(profileDir);
  if (resolvedProfile.startsWith(path.resolve(tmpdir()) + path.sep)) {
    try { await rm(resolvedProfile, { recursive: true, force: true }); } catch { /* Windows may retain a transient Chrome profile lock. */ }
  }
}
