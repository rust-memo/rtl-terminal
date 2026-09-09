// Frontend: xterm.js + RTL layer + WebSocket bridge
(function () {
  const termWrap = document.getElementById('term-wrap');
  const statusEl = document.getElementById('status');
  const statusT = document.getElementById('status-t');
  const rtlToggle = document.getElementById('rtl-toggle');
  const shapeToggle = document.getElementById('shape-toggle');
  const cmdInput = document.getElementById('cmd');

  let rtlEnabled = true;
  let shapeEnabled = true;

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 15,
    fontFamily: "'Cascadia Code','Segoe UI',Consolas,'Courier New',monospace",
    theme: { background: '#000000', foreground: '#e6edf3' },
    allowProposedApi: true,
  });
  const fit = new FitAddon.FitAddon();
  if (fit && typeof term.loadAddon === 'function') term.loadAddon(fit);
  else if (fit && typeof fit.activate === 'function') fit.activate(term);
  term.open(document.getElementById('term'));
  fit.fit();
  window.addEventListener('resize', () => { try { fit.fit(); } catch {} });

  term.writeln('\x1b[36mRTL-Terminal — جارٍ الاتصال بالسيرفر...\x1b[0m');

  // ---- WebSocket ----
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => {
    statusEl.classList.add('on');
    statusT.textContent = 'متصل ✓';
    term.writeln('\x1b[32m✓ متصل! اكتب أو استخدم صندوق الإدخال بالأسفل.\x1b[0m');
    term.writeln('\x1b[90mTry: echo مرحبا بالعالم 123\x1b[0m');
    sendResize();
  };
  ws.onclose = () => {
    statusEl.classList.remove('on');
    statusT.textContent = 'غير متصل';
    term.writeln('\r\n\x1b[31m✗ انقطع الاتصال بالسيرفر.\x1b[0m');
  };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'data') {
      let out = m.data;
      if (rtlEnabled) {
        out = shapeEnabled ? RTLBidi.processOutput(out) : out;
        if (!shapeEnabled) {
          // still reorder without shaping: naive wrap
          out = RTLBidi.processOutput(out);
        }
      }
      term.write(out);
    }
  };

  function sendResize() {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }
  term.onResize(sendResize);

  // Typing directly in terminal → logical order sent to shell
  term.onData((d) => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', data: d }));
  });

  // ---- Smart input box ----
  function sendCmd() {
    const v = cmdInput.value;
    if (!v) return;
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', data: v + '\r' }));
    // local echo respects RTL automatically via dir=auto
    cmdInput.value = '';
    cmdInput.focus();
  }
  document.getElementById('send-btn').onclick = sendCmd;
  cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCmd();
  });
  // auto direction
  cmdInput.addEventListener('input', () => {
    cmdInput.setAttribute('dir', RTLBidi.isRTL(cmdInput.value) ? 'rtl' : 'ltr');
  });

  // ---- Toggles ----
  rtlToggle.onchange = () => {
    rtlEnabled = rtlToggle.checked;
    termWrap.classList.toggle('rtl-mode', rtlEnabled);
    document.documentElement.setAttribute('dir', rtlEnabled ? 'rtl' : 'ltr');
  };
  shapeToggle.onchange = () => { shapeEnabled = shapeToggle.checked; };
  document.getElementById('clear-btn').onclick = () => term.clear();
  document.getElementById('dir-btn').onclick = () => {
    const cur = document.documentElement.getAttribute('dir');
    const next = cur === 'rtl' ? 'ltr' : 'rtl';
    document.documentElement.setAttribute('dir', next);
    rtlToggle.checked = next === 'rtl';
    rtlEnabled = rtlToggle.checked;
    termWrap.classList.toggle('rtl-mode', rtlEnabled);
  };

  // default RTL mode on
  termWrap.classList.add('rtl-mode');
  term.onKey(({ domEvent }) => {
    if (domEvent.ctrlKey && domEvent.key === 'l') { term.clear(); domEvent.preventDefault(); }
  });
})();
