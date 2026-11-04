/* TradeDeskPro first-touch/UTM capture. Safe to load twice. */
(function () {
  if (typeof document === 'undefined') return;
  if (window.__tdpLeadAttribution) return;
  var s = document.createElement('script');
  s.src = 'https://www.tradedeskpro.com/js/tdp-lead-attribution.js';
  s.defer = true;
  (document.head || document.documentElement).appendChild(s);
})();

/**
 * Lead intake for sanantoniotxhvacrepair.com → TradeDeskPro /api/leads.
 * No client secret. Service, area, and the visitor's note are folded into message.
 */
(function () {
  var API_URL = 'https://www.tradedeskpro.com/api/leads';
  var PROFILE_ID = '63e7470e-fe1e-4367-aae0-56d0d6392d78';
  var SOURCE = 'sanantoniotxhvacrepair.com';
  var PHONE_FALLBACK = '(210) 942-5218';
  var MIN_FILL_MS = 3000;
  var loadedAt = Date.now();
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || '';
    } catch (e) {
      return '';
    }
  }

  function currentUrl() {
    try {
      var u = new URL(window.location.href);
      u.hash = '';
      return u.toString();
    } catch (e) {
      return String((window.location && window.location.href) || '').split('#')[0];
    }
  }

  function fieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  function attribution() {
    var fromHelper = {};
    try {
      if (typeof window.tdpLeadAttribution === 'function') {
        fromHelper = window.tdpLeadAttribution() || {};
      }
    } catch (e) {}

    var extra = {
      landing_url: fromHelper.landing_url || currentUrl(),
      first_touch_url: fromHelper.first_touch_url || '',
    };
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var key = UTM_KEYS[i];
      extra[key] = fromHelper[key] || qs(key) || '';
    }
    return extra;
  }

  function buildMessage(service, area, message) {
    var lines = [];
    if (service) lines.push('Service: ' + service);
    if (area) lines.push('Area: ' + area);
    if (message) lines.push(message);
    return lines.join('\n');
  }

  function showStatus(form, text, isError) {
    var status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      var button = form.querySelector('button[type="submit"], button:not([type])');
      if (button) form.insertBefore(status, button);
      else form.appendChild(status);
    }
    status.textContent = text;
    status.className = isError ? 'form-status is-error' : 'form-status';
  }

  function successCopy() {
    return "Request received. We'll be in touch soon. For faster help call " + PHONE_FALLBACK + '.';
  }

  function errorCopy(status) {
    if (status === 429) {
      return "We're getting a lot of requests right now. Please call " + PHONE_FALLBACK + ' and we will help right away.';
    }
    if (status === 403) {
      return "We couldn't send that from this page. Please call " + PHONE_FALLBACK + ' and we will help right away.';
    }
    return "We couldn't confirm the send. Please call " + PHONE_FALLBACK + ' and we will help right away.';
  }

  function ensureHoneypot(form) {
    if (form.querySelector('[name="company_website"]')) return;
    var wrap = document.createElement('div');
    wrap.className = 'hp-field';
    wrap.setAttribute('aria-hidden', 'true');
    var label = document.createElement('label');
    label.textContent = 'Company website';
    var input = document.createElement('input');
    input.type = 'text';
    input.name = 'company_website';
    input.tabIndex = -1;
    input.autocomplete = 'off';
    label.appendChild(input);
    wrap.appendChild(label);
    form.insertBefore(wrap, form.firstChild);
  }

  function wireForm(form) {
    if (!form || form.dataset.leadsWired === '1') return;
    form.dataset.leadsWired = '1';
    form.removeAttribute('action');
    form.setAttribute('method', 'post');
    ensureHoneypot(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"], button:not([type])');
      var original = btn ? btn.textContent : '';

      if (fieldValue(form, 'company_website') || Date.now() - loadedAt < MIN_FILL_MS) {
        showStatus(form, successCopy(), false);
        form.reset();
        return;
      }

      var name = fieldValue(form, 'name');
      var phone = fieldValue(form, 'phone');
      var email = fieldValue(form, 'email');
      var service = fieldValue(form, 'service');
      var area = fieldValue(form, 'area');
      var message = fieldValue(form, 'message');

      if (!name || !phone) {
        showStatus(form, 'Please add your name and phone, or call ' + PHONE_FALLBACK + '.', true);
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
      }

      var body = {
        name: name,
        phone: phone,
        email: email,
        message: buildMessage(service, area, message),
        source: SOURCE,
        profile_id: PROFILE_ID,
      };
      var extra = attribution();
      Object.keys(extra).forEach(function (key) {
        if (extra[key]) body[key] = extra[key];
      });

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (res) {
          if (res.status >= 200 && res.status < 300) {
            showStatus(form, successCopy(), false);
            form.reset();
            return;
          }
          showStatus(form, errorCopy(res.status), true);
        })
        .catch(function () {
          showStatus(form, errorCopy(0), true);
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form.lead-form');
    Array.prototype.forEach.call(forms, wireForm);
  }

  window.SanAntonioLeads = {
    wireForm: wireForm,
    buildMessage: buildMessage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
