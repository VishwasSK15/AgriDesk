const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');
const fs = require('fs');

class ElectronDriver {
  constructor(options = {}) {
    this.port = options.port || 9222;
    this.env = options.env || { AGRI_ENV: 'qa', NODE_ENV: 'production' };
    this.process = null;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async launch() {
    console.log(`[Driver] Spawning Electron on port ${this.port}...`);
    this.process = spawn(
      electronPath,
      ['.', `--remote-debugging-port=${this.port}`],
      {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, ...this.env },
        stdio: 'pipe',
      }
    );

    this.process.stdout.on('data', (d) => {
      const s = d.toString().trim();
      if (s) console.log('[App Out]:', s);
    });

    this.process.stderr.on('data', (d) => {
      const s = d.toString().trim();
      if (s && !s.includes('DevTools listening')) console.error('[App Err]:', s);
    });

    // Wait for CDP endpoint
    let target = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
        if (target && target.webSocketDebuggerUrl) {
          break;
        }
      } catch (e) {
        // Retry
      }
    }

    if (!target) {
      this.close();
      throw new Error(`Failed to find Electron target page on port ${this.port}`);
    }

    console.log(`[Driver] Connected to target: ${target.title} (${target.url})`);
    this.ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    // Enable CDP Domains
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');

    console.log('[Driver] CDP domains enabled.');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(code) {
    const res = await this.send('Runtime.evaluate', {
      expression: typeof code === 'function' ? `(${code.toString()})()` : code,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text} - ${res.exceptionDetails.exception?.description}`);
    }
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
      if (exists) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async waitForText(text, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.evaluate(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`);
      if (found) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for text: "${text}"`);
  }

  async waitForTextDisappear(text, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.evaluate(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`);
      if (!found) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for text to disappear: "${text}"`);
  }

  async waitForFunction(fnStr, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await this.evaluate(`Boolean((${fnStr})())`);
      if (res) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for function to return truthy`);
  }

  async click(selector) {
    await this.waitForSelector(selector);
    const clicked = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not click selector: ${selector}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  async clickText(text, selector = 'button, a, span, div, p, label') {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const clicked = await this.evaluate(`(() => {
        const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
        // First prioritize interactive button/a elements
        let target = els.find(el => {
          const isInteractive = el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button';
          const t = (el.innerText || el.textContent || '').trim().toLowerCase();
          return isInteractive && t.includes(${JSON.stringify(text.toLowerCase())}) && el.offsetParent !== null;
        });
        // Otherwise, fall back to any matching element (search in reverse for modal dialog buttons)
        if (!target) {
          target = els.reverse().find(el => {
            const t = (el.innerText || el.textContent || '').trim().toLowerCase();
            return t.includes(${JSON.stringify(text.toLowerCase())}) && el.offsetParent !== null;
          });
        }
        if (!target) return false;
        target.scrollIntoView({ behavior: 'instant', block: 'center' });
        target.click();
        return true;
      })()`);
      if (clicked) {
        await new Promise((r) => setTimeout(r, 150));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout trying to click text: "${text}"`);
  }

  async fill(selector, value) {
    await this.waitForSelector(selector);
    const success = await this.evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return false;
      input.focus();
      const proto = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(input, ${JSON.stringify(value)});
      } else {
        input.value = ${JSON.stringify(value)};
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!success) throw new Error(`Could not fill input: ${selector}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  async fillByLabel(labelText, value) {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const success = await this.evaluate(`(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const lbl = labels.find(l => (l.innerText || '').trim().includes(${JSON.stringify(labelText)}));
        if (!lbl) return false;
        let input = lbl.querySelector('input, textarea, select');
        if (!input && lbl.htmlFor) {
          input = document.getElementById(lbl.htmlFor);
        }
        if (!input) {
          const parent = lbl.parentElement;
          input = parent ? parent.querySelector('input, textarea, select') : null;
        }
        if (!input) return false;
        input.focus();
        const proto = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(input, ${JSON.stringify(value)});
        } else {
          input.value = ${JSON.stringify(value)};
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (success) {
        await new Promise((r) => setTimeout(r, 100));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout trying to fill input by label: "${labelText}"`);
  }

  async selectByLabel(labelText, value) {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const success = await this.evaluate(`(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const lbl = labels.find(l => (l.innerText || '').trim().includes(${JSON.stringify(labelText)}));
        if (!lbl) return false;
        let select = lbl.querySelector('select');
        if (!select && lbl.htmlFor) {
          select = document.getElementById(lbl.htmlFor);
        }
        if (!select) {
          const parent = lbl.parentElement;
          select = parent ? parent.querySelector('select') : null;
        }
        if (!select) return false;
        select.focus();
        const proto = window.HTMLSelectElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(select, ${JSON.stringify(value)});
        } else {
          select.value = ${JSON.stringify(value)};
        }
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (success) {
        await new Promise((r) => setTimeout(r, 100));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout trying to select option by label: "${labelText}"`);
  }

  async select(selector, value) {
    await this.waitForSelector(selector);
    const success = await this.evaluate(`(() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      select.focus();
      const proto = window.HTMLSelectElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(select, ${JSON.stringify(value)});
      } else {
        select.value = ${JSON.stringify(value)};
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!success) throw new Error(`Could not select option on selector: ${selector}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  async selectOptionByText(selector, optionText) {
    await this.waitForSelector(selector);
    const success = await this.evaluate(`(() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      const opt = Array.from(select.options).find(o => (o.text || o.innerText || '').toLowerCase().includes(${JSON.stringify(optionText.toLowerCase())}));
      if (!opt) return false;
      select.focus();
      const proto = window.HTMLSelectElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(select, opt.value);
      } else {
        select.value = opt.value;
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!success) throw new Error(`Could not find option containing "${optionText}" on selector: ${selector}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  async clickRowAction(rowText, actionSelector) {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const clicked = await this.evaluate(`(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        const row = rows.find(r => (r.innerText || '').toLowerCase().includes(${JSON.stringify(rowText.toLowerCase())}));
        if (!row) return false;
        let btn = null;
        try {
          btn = row.querySelector(${JSON.stringify(actionSelector)});
        } catch (e) {}
        if (!btn) {
          const btns = Array.from(row.querySelectorAll('button, a'));
          btn = btns.find(b => 
            (b.title && b.title.toLowerCase().includes(${JSON.stringify(actionSelector.toLowerCase())})) ||
            (b.innerText || '').toLowerCase().includes(${JSON.stringify(actionSelector.toLowerCase())})
          );
        }
        if (!btn) return false;
        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        btn.click();
        return true;
      })()`);
      if (clicked) {
        await new Promise((r) => setTimeout(r, 200));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout trying to click "${actionSelector}" in table row containing "${rowText}"`);
  }

  async pressKey(key, code) {
    await this.evaluate(`(() => {
      const target = document.activeElement || document.body;
      const evtDown = new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code || key)}, bubbles: true, cancelable: true });
      target.dispatchEvent(evtDown);
      window.dispatchEvent(evtDown);
      const evtUp = new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code || key)}, bubbles: true, cancelable: true });
      target.dispatchEvent(evtUp);
      window.dispatchEvent(evtUp);
    })()`);
    await new Promise((r) => setTimeout(r, 100));
  }

  async getText(selector) {
    return this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      return el ? (el.innerText || el.textContent || '').trim() : '';
    })()`);
  }

  async getBodyText() {
    return this.evaluate('document.body.innerText');
  }

  async screenshot(savePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, buffer);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }
    if (this.process) {
      try {
        this.process.kill();
      } catch (e) {}
    }
    console.log('[Driver] Electron closed.');
  }
}

module.exports = { ElectronDriver };
