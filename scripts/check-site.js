#!/usr/bin/env node
/**
 * Fails if lead forms regress to a placeholder inbox, a fake phone,
 * a client-side intake secret, or a missing local asset.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const skipDirs = new Set(['.git', 'node_modules', '.vercel']);
const textExt = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.md', '.yml', '.yaml', '.svg']);
const assetExt = new Set([
  '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.woff', '.woff2', '.ttf', '.xml', '.txt', '.pdf', '.webmanifest',
]);

const forbidden = ['form' + 'spree', 'YOUR_' + 'FORM_ID', 'REPLACE_' + 'WITH'];
const phoneRe = new RegExp('555' + '-\\d');
const secretRe = new RegExp('X-TDP-Lead-' + 'Secret', 'i');

function walk(dir, out) {
  out = out || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    if (skipDirs.has(ent.name)) return;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

const errors = [];
const files = walk(root);

files.forEach(function (file) {
  const ext = path.extname(file).toLowerCase();
  if (!textExt.has(ext)) return;
  const text = fs.readFileSync(file, 'utf8');
  forbidden.forEach(function (needle) {
    if (text.indexOf(needle) !== -1) errors.push(rel(file) + ': contains ' + needle);
  });
  if (phoneRe.test(text)) errors.push(rel(file) + ': contains a 555- phone number');
  if (secretRe.test(text)) errors.push(rel(file) + ': contains a client lead secret header');
});

function resolveLocal(fromFile, url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    return null;
  }
  const clean = trimmed.split('#')[0].split('?')[0];
  if (!assetExt.has(path.extname(clean).toLowerCase())) return null;
  if (clean.startsWith('/')) return path.join(root, clean);
  return path.resolve(path.dirname(fromFile), clean);
}

const attrRe = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

files.forEach(function (file) {
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.html' && ext !== '.css' && ext !== '.js') return;
  const text = fs.readFileSync(file, 'utf8');
  [attrRe, urlRe].forEach(function (re) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) {
      const target = resolveLocal(file, match[1]);
      if (target && !fs.existsSync(target)) {
        errors.push(rel(file) + ': missing local asset ' + match[1]);
      }
    }
  });
});

files.forEach(function (file) {
  if (!file.endsWith('.html')) return;
  const name = rel(file);
  if (name === 'blog' || name.indexOf('blog/') === 0) return;
  const text = fs.readFileSync(file, 'utf8');
  if (!/<form\b/i.test(text)) return;
  if (text.indexOf('/js/tdp-leads.js') === -1) {
    errors.push(name + ': form page is missing /js/tdp-leads.js');
  }
  if (text.indexOf('name="company_website"') === -1) {
    errors.push(name + ': form is missing the company_website honeypot');
  }
  const phoneTag = text.match(/<input\b[^>]*name=["']phone["'][^>]*>/i);
  if (!phoneTag || !/\brequired\b/i.test(phoneTag[0])) {
    errors.push(name + ': phone field must be required');
  }
});

if (errors.length) {
  console.error('Site check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('Site check passed (' + files.length + ' files).');
