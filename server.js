/**
 * RTL-Terminal Server
 * Works on Windows (powershell/cmd) + Linux (bash)
 * - Express serves public/
 * - WebSocket bridges browser <-> pty
 * - Fallback to echo-mode if node-pty not installed (so it always runs)
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ ok: true, rtl: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Try to load node-pty (optional - needed for real shell)
let pty = null;
try {
  pty = require('node-pty');
  console.log('[rtl-terminal] node-pty loaded - real shell enabled');
} catch (e) {
  console.log('[rtl-terminal] node-pty NOT found - running in DEMO echo mode.');
  console.log('               Install for real shell: npm install node-pty');
}

function getDefaultShell() {
  if (process.platform === 'win32') {
    // Prefer PowerShell, fallback to cmd
    const ps = process.env.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    try { if (fs.existsSync(ps)) return ps; } catch {}
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

wss.on('connection', (ws) => {
  console.log('[ws] client connected');
  let proc = null;

  if (pty) {
    const shell = getDefaultShell();
    const args = shell.toLowerCase().includes('powershell') ? ['-NoLogo'] : [];
    try {
      proc = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 100,
        rows: 30,
        cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
        env: process.env
      });
      proc.onData((data) => {
        try { ws.send(JSON.stringify({ type: 'data', data })); } catch {}
      });
      proc.onExit(({ exitCode }) => {
        try { ws.send(JSON.stringify({ type: 'exit', code: exitCode })); } catch {}
      });
    } catch (err) {
      console.error('pty spawn failed:', err.message);
      proc = null;
    }
  }

  // DEMO fallback shell (works everywhere, no deps)
  if (!proc) {
    ws.send(JSON.stringify({ type: 'data', data: '\x1b[32mRTL-Terminal DEMO mode\x1b[0m\r\n' }));
    ws.send(JSON.stringify({ type: 'data', data: 'Real shell needs: npm install node-pty\r\n' }));
    ws.send(JSON.stringify({ type: 'data', data: 'Type anything - it echoes back. Try Arabic: مرحبا بالعالم\r\n$ ' }));
    let buf = '';
    ws.on('message', (msg) => {
      let m; try { m = JSON.parse(msg); } catch { return; }
      if (m.type === 'resize') return;
      if (m.type === 'input') {
        for (const ch of m.data) {
          if (ch === '\r' || ch === '\n') {
            ws.send(JSON.stringify({ type: 'data', data: '\r\n' }));
            const line = buf.trim(); buf = '';
            if (!line) { ws.send(JSON.stringify({ type: 'data', data: '$ ' })); continue; }
            // mini commands
            if (line === 'clear') { ws.send(JSON.stringify({ type: 'data', data: '\x1b[2J\x1b[H$ ' })); continue; }
            if (line.startsWith('echo ')) {
              ws.send(JSON.stringify({ type: 'data', data: line.slice(5) + '\r\n$ ' }));
              continue;
            }
            ws.send(JSON.stringify({ type: 'data', data: `echo: ${line}\r\n$ ` }));
          } else if (ch === '\u007f' || ch === '\b') {
            if (buf.length) { buf = buf.slice(0, -1); ws.send(JSON.stringify({ type: 'data', data: '\b \b' })); }
          } else {
            buf += ch;
            ws.send(JSON.stringify({ type: 'data', data: ch }));
          }
        }
      }
    });
    ws.on('close', () => console.log('[ws] client disconnected (demo)'));
    return;
  }

  // REAL pty bridge
  ws.on('message', (msg) => {
    let m; try { m = JSON.parse(msg); } catch { return; }
    if (m.type === 'input' && proc) proc.write(m.data);
    if (m.type === 'resize' && proc) { try { proc.resize(m.cols, m.rows); } catch {} }
  });
  ws.on('close', () => { try { proc.kill(); } catch {} console.log('[ws] client disconnected'); });
});

server.listen(PORT, () => {
  console.log(`\n  RTL-Terminal running: http://localhost:${PORT}`);
  console.log(`  Platform: ${process.platform} | Shell: ${getDefaultShell()}\n`);
});
