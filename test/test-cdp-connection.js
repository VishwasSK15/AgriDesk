const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

async function testConnection() {
  console.log('Spawning Electron from:', electronPath);
  const electronProcess = spawn(electronPath, ['.', '--remote-debugging-port=9222'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, AGRI_ENV: 'qa' },
    stdio: 'pipe',
  });

  electronProcess.stdout.on('data', (d) => console.log('[Electron Out]:', d.toString().trim()));
  electronProcess.stderr.on('data', (d) => console.error('[Electron Err]:', d.toString().trim()));

  console.log('Waiting for remote debugging endpoint...');
  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const list = await res.json();
      target = list.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) {
        console.log('✓ Found target page:', target.title, target.url);
        break;
      }
    } catch (e) {
      // Retrying
    }
  }

  if (!target) {
    electronProcess.kill();
    throw new Error('Failed to find debugging target within 15 seconds');
  }

  console.log('Connecting to WebSocket:', target.webSocketDebuggerUrl);
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('✓ WebSocket connected successfully!');

  let msgId = 1;
  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const evalRes = await sendCommand('Runtime.evaluate', {
    expression: 'document.title',
    returnByValue: true,
  });

  console.log('✓ Page Title via CDP:', evalRes.result.value);

  ws.close();
  electronProcess.kill();
  console.log('✓ Test completed cleanly.');
}

testConnection().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
