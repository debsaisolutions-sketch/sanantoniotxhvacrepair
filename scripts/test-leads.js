const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'tdp-leads.js'), 'utf8');

const PRELUDE = `
  var __now = 1700000000000;
  var RealDate = Date;
  Date = {
    now: function () { return __now; },
    parse: RealDate.parse,
    UTC: RealDate.UTC
  };
  function El(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.value = '';
    this.textContent = '';
    this.disabled = false;
    this.type = '';
    this.name = '';
    this.id = '';
    this.className = '';
    this.tabIndex = 0;
    this.autocomplete = '';
    this.parentNode = null;
    var self = this;
    this.classList = {
      contains: function (name) {
        return self.className.split(/\\s+/).indexOf(name) !== -1;
      }
    };
  }
  El.prototype.setAttribute = function (key, value) {
    this.attributes[key] = String(value);
    if (key === 'class') this.className = String(value);
    if (key === 'id') this.id = String(value);
    if (key === 'name') this.name = String(value);
    if (key === 'type') this.type = String(value);
  };
  El.prototype.getAttribute = function (key) { return this.attributes[key]; };
  El.prototype.removeAttribute = function (key) { delete this.attributes[key]; };
  El.prototype.addEventListener = function (type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  };
  El.prototype.appendChild = function (child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  };
  El.prototype.insertBefore = function (child, ref) {
    child.parentNode = this;
    var index = this.children.indexOf(ref);
    if (index < 0) this.children.unshift(child);
    else this.children.splice(index, 0, child);
    return child;
  };
  Object.defineProperty(El.prototype, 'firstChild', {
    get: function () { return this.children[0] || null; }
  });
  function matches(node, sel) {
    sel = sel.trim();
    if (!sel) return false;
    if (sel.charAt(0) === '.') return node.className.split(/\\s+/).indexOf(sel.slice(1)) !== -1;
    var m = sel.match(/^([a-z0-9]+)?(?:\\[name="([^"]+)"\\])?(?:\\[type="([^"]+)"\\])?(?::not\\(\\[type\\]\\))?$/i);
    if (!m) return false;
    if (m[1] && node.tagName.toLowerCase() !== m[1].toLowerCase()) return false;
    if (m[2] && node.attributes.name !== m[2] && node.name !== m[2]) return false;
    if (m[3] && node.attributes.type !== m[3] && node.type !== m[3]) return false;
    if (/:not\\(\\[type\\]\\)/.test(sel) && (node.attributes.type || node.type)) return false;
    if (!m[1] && m[2] && node.attributes.name !== m[2] && node.name !== m[2]) return false;
    return true;
  }
  El.prototype.querySelectorAll = function (selector) {
    var sels = selector.split(',');
    var out = [];
    function walk(node) {
      sels.forEach(function (sel) { if (matches(node, sel)) out.push(node); });
      node.children.forEach(walk);
    }
    this.children.forEach(walk);
    return out;
  };
  El.prototype.querySelector = function (selector) {
    return this.querySelectorAll(selector)[0] || null;
  };
  El.prototype.reset = function () {
    function walk(node) {
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
        node.value = '';
      }
      node.children.forEach(walk);
    }
    walk(this);
  };

  var document = {
    readyState: 'complete',
    listeners: {},
    head: new El('head'),
    body: new El('body'),
    documentElement: new El('html'),
    createElement: function (tag) { return new El(tag); },
    addEventListener: function (type, fn) {
      (this.listeners[type] || (this.listeners[type] = [])).push(fn);
    },
    querySelectorAll: function (selector) { return this.body.querySelectorAll(selector); },
    querySelector: function (selector) { return this.body.querySelector(selector); }
  };
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);

  var location = {
    href: 'https://sanantoniotxhvacrepair.com/?utm_source=google&utm_medium=cpc#estimate',
    search: '?utm_source=google&utm_medium=cpc'
  };
  var window = {
    document: document,
    location: location,
    __tdpLeadAttribution: true,
    tdpLeadAttribution: function () {
      return {
        landing_url: 'https://sanantoniotxhvacrepair.com/?utm_source=google&utm_medium=cpc',
        first_touch_url: 'https://sanantoniotxhvacrepair.com/?utm_source=google&utm_medium=cpc',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'sa-hvac',
        utm_term: '',
        utm_content: ''
      };
    }
  };
  window.fetch = function (url, init) {
    window.__calls.push({ url: url, init: init });
    if (window.__throw) return Promise.reject(new Error('network'));
    var status = window.__status;
    return Promise.resolve({
      status: status,
      ok: status >= 200 && status < 300
    });
  };
  window.__calls = [];
  window.__status = 201;
  window.__throw = false;
  this.window = window;
  this.document = document;
  this.location = location;
  this.fetch = window.fetch;
`;

function flush() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 20);
  });
}

function boot(options) {
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    Promise,
    setTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(PRELUDE, sandbox);
  if (options && options.attribution === null) {
    sandbox.window.tdpLeadAttribution = undefined;
  }
  if (options && options.now != null) sandbox.__now = options.now;
  vm.runInContext(script, sandbox);
  const document = sandbox.document;
  const form = document.createElement('form');
  form.setAttribute('class', 'lead-form');
  form.setAttribute('action', 'https://example.invalid/unused');
  document.body.appendChild(form);

  function add(tag, name, value) {
    const node = document.createElement(tag);
    node.setAttribute('name', name);
    node.value = value || '';
    form.appendChild(node);
    return node;
  }

  if (!options || !options.skipHoneypot) {
    const honeypot = add('input', 'company_website', '');
    honeypot.setAttribute('type', 'text');
  }
  add('input', 'name', 'Ada Lovelace');
  add('input', 'phone', '210-942-0199');
  add('input', 'email', 'ada@example.com');
  add('select', 'service', 'AC Repair');
  add('select', 'area', 'Stone Oak');
  add('textarea', 'message', 'Upstairs is warm.');
  const button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.textContent = 'Request Free Estimate';
  form.appendChild(button);
  sandbox.window.SanAntonioLeads.wireForm(form);
  return { sandbox, form, button };
}

async function submit(form) {
  const handlers = form.listeners.submit || [];
  assert.equal(handlers.length, 1);
  handlers[0]({ preventDefault() {} });
  await flush();
}

function bodyOf(sandbox) {
  assert.equal(sandbox.window.__calls.length, 1);
  const call = sandbox.window.__calls[0];
  assert.equal(call.url, 'https://www.tradedeskpro.com/api/leads');
  assert.equal(call.init.method, 'POST');
  assert.equal(JSON.stringify(call.init.headers), '{"Content-Type":"application/json"}');
  assert.equal(JSON.stringify(call.init.headers).includes('Lead-Secret'), false);
  return JSON.parse(call.init.body);
}

test('posts a TradeDeskPro lead with attribution on 201', async () => {
  const { sandbox, form } = boot();
  sandbox.__now += 4000;
  await submit(form);
  const body = bodyOf(sandbox);
  assert.equal(body.name, 'Ada Lovelace');
  assert.equal(body.phone, '210-942-0199');
  assert.equal(body.email, 'ada@example.com');
  assert.equal(body.profile_id, '63e7470e-fe1e-4367-aae0-56d0d6392d78');
  assert.equal(body.source, 'sanantoniotxhvacrepair.com');
  assert.equal(body.message, 'Service: AC Repair\nArea: Stone Oak\nUpstairs is warm.');
  assert.equal(body.landing_url, 'https://sanantoniotxhvacrepair.com/?utm_source=google&utm_medium=cpc');
  assert.equal(body.first_touch_url, body.landing_url);
  assert.equal(body.utm_source, 'google');
  assert.equal(body.utm_medium, 'cpc');
  assert.equal(body.utm_campaign, 'sa-hvac');
  assert.equal(body.utm_term, undefined);
  assert.equal(form.querySelector('.form-status').textContent.includes('Request received'), true);
  assert.equal(form.querySelector('.form-status').className.includes('is-error'), false);
  assert.equal(form.getAttribute('action'), undefined);
});

test('treats 202 filtered as success and does not post a secret', async () => {
  const { sandbox, form, button } = boot();
  sandbox.__now += 4000;
  sandbox.window.__status = 202;
  await submit(form);
  bodyOf(sandbox);
  assert.equal(form.querySelector('.form-status').textContent.includes('Request received'), true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Request Free Estimate');
});

test('403, 429, 500, and network errors show the phone fallback', async () => {
  for (const status of [403, 429, 500]) {
    const { sandbox, form } = boot();
    sandbox.__now += 4000;
    sandbox.window.__status = status;
    await submit(form);
    const text = form.querySelector('.form-status').textContent;
    assert.equal(text.includes('(210) 942-5218'), true, 'status ' + status);
    assert.equal(text.includes('Request received'), false, 'status ' + status);
    assert.equal(form.querySelector('.form-status').className.includes('is-error'), true);
  }

  const failed = boot();
  failed.sandbox.__now += 4000;
  failed.sandbox.window.__throw = true;
  await submit(failed.form);
  assert.equal(failed.form.querySelector('.form-status').textContent.includes('(210) 942-5218'), true);
  assert.equal(failed.button.disabled, false);
});

test('honeypot and too-fast submits fake success without posting', async () => {
  const spam = boot();
  spam.__now = spam.sandbox.__now + 4000;
  spam.sandbox.__now += 4000;
  spam.form.querySelector('[name="company_website"]').value = 'https://spam.example';
  await submit(spam.form);
  assert.equal(spam.sandbox.window.__calls.length, 0);
  assert.equal(spam.form.querySelector('.form-status').textContent.includes('Request received'), true);

  const fast = boot();
  await submit(fast.form);
  assert.equal(fast.sandbox.window.__calls.length, 0);
  assert.equal(fast.form.querySelector('.form-status').textContent.includes('Request received'), true);
});

test('reads utm fields from the page URL when the helper is absent', async () => {
  const { sandbox, form } = boot({ attribution: null });
  sandbox.__now += 4000;
  await submit(form);
  const body = bodyOf(sandbox);
  assert.equal(body.landing_url, 'https://sanantoniotxhvacrepair.com/?utm_source=google&utm_medium=cpc');
  assert.equal(body.utm_source, 'google');
  assert.equal(body.utm_medium, 'cpc');
  assert.equal(body.utm_campaign, undefined);
});

test('does not post when name or phone is missing', async () => {
  const { sandbox, form } = boot();
  sandbox.__now += 4000;
  form.querySelector('[name="phone"]').value = '   ';
  await submit(form);
  assert.equal(sandbox.window.__calls.length, 0);
  assert.equal(form.querySelector('.form-status').textContent.includes('(210) 942-5218'), true);
});

test('adds a honeypot when the markup does not include one', async () => {
  const { form } = boot({ skipHoneypot: true });
  assert.ok(form.querySelector('[name="company_website"]'));
});
