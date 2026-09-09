/**
 * RTL-Terminal Desktop — Electron main process
 * Single-window native app: embedded backend (express+ws+shell) + xterm UI.
 * No external browser needed.
 */
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

const PORT = process.env.RTL_PORT ? parseInt(process.env.RTL_PORT, 10) : 34770;

// ---------- backend (same logic as server.js, in-process) ----------
function startBackend() {
  const express = require('express');
  const WebSocket = require('ws');
  const eapp = express();

  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
  };
  // serve public/ — works in dev (__dirname=electron) and packaged (extraResources)
  const candidates = [
    path.join(__dirname, '..', 'public'),
    path.join(process.resourcesPath || '', 'public'),
    path.join(app.getAppPath ? app.getAppPath() : '', 'public'),
  ];
  let PUBLIC_DIR = candidates.find((p) => { try { return fs.existsSync(path.join(p, 'index.html')); } catch { return false; } }) || candidates[0];
  console.log('[rtl-desktop] public dir:', PUBLIC_DIR);

  eapp.get('/health', (req, res) => res.json({ ok: true, rtl: true, desktop: true }));
  eapp.use(express.static(PUBLIC_DIR));

  const server = http.createServer(eapp);
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
    const sh = getDefaultShell();
    let child = null;
    try {
      child = spawn(sh.cmd, sh.args, { cwd: os.homedir(), env: process.env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    } catch (err) { console.error('shell spawn failed:', err.message); }
    if (!child || !child.stdin) {
      try { ws.send(JSON.stringify({ type: 'data', data: '\x1b[31mFailed to start shell.\x1b[0m\r\n' })); ws.close(); } catch (e) {}
      return;
    }
    child.stdout.on('data', (d) => { try { ws.send(JSON.stringify({ type: 'data', data: d.toString('utf8') })); } catch (e) {} });
    child.stderr.on('data', (d) => { try { ws.send(JSON.stringify({ type: 'data', data: d.toString('utf8') })); } catch (e) {} });
    child.on('exit', (code) => { try { ws.send(JSON.stringify({ type: 'data', data: '\r\n\x1b[90m[shell exited ' + code + ']\x1b[0m\r\n' })); } catch (e) {} });
    ws.send(JSON.stringify({ type: 'data', data: '\x1b[32mRTL-Terminal Desktop — ' + sh.cmd + '\x1b[0m\r\n' }));
    ws.on('message', (msg) => {
      let m; try { m = JSON.parse(msg.toString()); } catch (e) { return; }
      if (m.type === 'input' && child && child.stdin.writable) { try { child.stdin.write(m.data); } catch (e) {} }
    });
    ws.on('close', () => { try { child.kill(); } catch (e) {} });
  });

  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// ---------- window ----------
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    title: 'RTL Terminal',
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL('http://127.0.0.1:' + PORT + '/');
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  await startBackend();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
