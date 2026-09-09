/**
 * RTL-Terminal Server - EXE edition (pkg, CJS)
 * Shell via child_process. Static via embedded snapshot OR external public/.
 * No native modules - exe safe.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');
const express = require('express');
const WebSocket = require('ws');

// ---- embedded public files (for pkg snapshot) ----
const EMBEDDED = {};
function loadEmbedded() {
  const files = ['index.html', 'app.js', 'rtl-bidi.js', 'vendor/xterm.js', 'vendor/xterm.css', 'vendor/addon-fit.js'];
  for (const f of files) {
    try {
      const p = path.join(__dirname, 'public', f);
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        EMBEDDED['/' + f] = buf;
        EMBEDDED['/public/' + f] = buf;
      }
    } catch (e) {}
  }
  try {
    const snapIndex = path.join(__dirname, 'public', 'index.html');
    console.log('[rtl] embedded files loaded: ' + Object.keys(EMBEDDED).length + ' (snapshot: ' + snapIndex + ')');
  } catch (e) {}
}
loadEmbedded();

const app = express();
const PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json' };

// 1) try embedded snapshot first (works inside exe)
app.use((req, res, next) => {
  let urlPath = decodeURIComponent(req.path);
  if (urlPath === '/') urlPath = '/index.html';
  if (EMBEDDED[urlPath]) {
    const ext = path.extname(urlPath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    return res.send(EMBEDDED[urlPath]);
  }
  next();
});
// 2) fallback: external public/ next to exe or source
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(path.dirname(process.execPath), 'public')));
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('/health', (req, res) => res.json({ ok: true, rtl: true, exe: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function getDefaultShell() {
  if (process.platform === 'win32') {
    const ps = (process.env.SystemRoot || 'C:\\Windows') + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    try { if (fs.existsSync(ps)) return { cmd: ps, args: ['-NoLogo', '-NoProfile'] }; } catch (e) {}
    return { cmd: process.env.COMSPEC || 'cmd.exe', args: [] };
  }
  return { cmd: process.env.SHELL || '/bin/bash', args: ['-i'] };
}

wss.on('connection', (ws) => {
  console.log('[ws] client connected');
  const sh = getDefaultShell();
  let child = null;
  try {
    child = spawn(sh.cmd, sh.args, { cwd: os.homedir(), env: process.env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: false });
  } catch (err) { console.error('shell spawn failed:', err.message); }
  if (!child || !child.stdin) {
    ws.send(JSON.stringify({ type: 'data', data: '\x1b[31mFailed to start shell.\x1b[0m\r\n' }));
    try { ws.close(); } catch (e) {}
    return;
  }
  child.stdout.on('data', (d) => { try { ws.send(JSON.stringify({ type: 'data', data: d.toString('utf8') })); } catch (e) {} });
  child.stderr.on('data', (d) => { try { ws.send(JSON.stringify({ type: 'data', data: d.toString('utf8') })); } catch (e) {} });
  child.on('exit', (code) => { try { ws.send(JSON.stringify({ type: 'data', data: '\r\n\x1b[90m[shell exited ' + code + ']\x1b[0m\r\n' })); } catch (e) {} });
  child.on('error', (err) => { try { ws.send(JSON.stringify({ type: 'data', data: '\r\n\x1b[31m[shell error: ' + err.message + ']\x1b[0m\r\n' })); } catch (e) {} });
  ws.send(JSON.stringify({ type: 'data', data: '\x1b[32mRTL-Terminal EXE - ' + sh.cmd + '\x1b[0m\r\n' }));
  ws.on('message', (msg) => {
    let m; try { m = JSON.parse(msg.toString()); } catch (e) { return; }
    if (m.type === 'input' && child && child.stdin.writable) { try { child.stdin.write(m.data); } catch (e) {} }
  });
  ws.on('close', () => { try { child.kill(); } catch (e) {} console.log('[ws] client disconnected'); });
});

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('\n  RTL-Terminal EXE running: ' + url);
  console.log('  Platform: ' + process.platform + '\n');
  if (process.platform === 'win32') { try { require('child_process').exec('start ' + url); } catch (e) {} }
});
