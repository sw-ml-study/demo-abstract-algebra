// Drive tests/browser/web-subset-check.html in a headless Chrome and print its
// verdict JSON on stdout.
//
// Chrome's --dump-dom cannot be used here: it needs --virtual-time-budget to
// wait for an async page, and virtual time races the wasm boot -- the harness's
// polling loop burns the whole budget before the module finishes loading. So
// the page is driven over the DevTools protocol and polled for real.
//
// Usage: node drive-web-subset.mjs <cdpPort> <url>
const [, , port, url] = process.argv;

const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
const page = targets.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r));
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });

const deadline = Date.now() + 120000;
let out = 'running';
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 750));
  const r = await send('Runtime.evaluate', {
    expression: 'document.getElementById("out").textContent',
    returnByValue: true,
  });
  out = r.result?.result?.value || 'running';
  if (out.trim() !== 'running') break;
}
console.log(out);
ws.close();
process.exit(0);
