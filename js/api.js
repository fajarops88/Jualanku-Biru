/* api.js — klien REST untuk GAS (fetch + JSON). Dipakai landing, konfirmasi, unduh, dan admin. */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const inflight = {};
  let writeEpoch = 0;

  const API = {
    siap: function () { return CFG.API_URL && CFG.API_URL.indexOf('GANTI_') !== 0; },

    // GET publik (cache server) + SWR localStorage
    get: function (params) {
      if (!API.siap()) return Promise.reject(new Error('API_URL belum diisi di js/config.js'));
      const qs = Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      const key = 'G' + qs;
      if (inflight[key]) return inflight[key];
      const p = fetch(CFG.API_URL + '?' + qs, { method: 'GET' }).then(function (r) { return r.json(); }).then(function (j) { delete inflight[key]; return j; }, function (e) { delete inflight[key]; throw e; });
      inflight[key] = p;
      return p;
    },

    // POST (text/plain agar tanpa preflight CORS)
    post: function (action, data, opt) {
      opt = opt || {};
      if (!API.siap()) return Promise.reject(new Error('API_URL belum diisi di js/config.js'));
      const body = { action: action, data: data || {} };
      const tk = API.token(); if (tk && !opt.pub) body.token = tk;
      const isRead = opt.read === true;
      const key = isRead ? 'P' + action + JSON.stringify(data || {}) : null;
      if (key && inflight[key]) return inflight[key];
      const epoch = writeEpoch;
      const p = fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (key) delete inflight[key];
          if (!isRead) writeEpoch++;
          if (j && j.code === 'AUTH' && !opt.pub) { API.logout(); if (typeof opt.onAuth === 'function') opt.onAuth(); else if (window.onSesiBerakhir) window.onSesiBerakhir(); }
          j._stale = isRead && epoch !== writeEpoch;
          return j;
        }, function (e) { if (key) delete inflight[key]; throw e; });
      if (key) inflight[key] = p;
      return p;
    },

    // baca dengan stale-while-revalidate: cb dipanggil 2x (cache lalu data segar)
    swr: function (action, data, cb, ttlMs) {
      const k = 'swr:' + action + ':' + JSON.stringify(data || {});
      try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && c.j) cb(c.j, true); } catch (e) {}
      return API.post(action, data, { read: true }).then(function (j) {
        if (j && j.success) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), j: j })); } catch (e) {} }
        cb(j, false); return j;
      });
    },

    batch: function (calls) { return API.post('batch', { calls: calls }, { read: true }); },

    token: function () { try { return sessionStorage.getItem('dp_token') || ''; } catch (e) { return ''; } },
    setSesi: function (token, me) { try { sessionStorage.setItem('dp_token', token); sessionStorage.setItem('dp_me', JSON.stringify(me)); } catch (e) {} },
    me: function () { try { return JSON.parse(sessionStorage.getItem('dp_me') || 'null'); } catch (e) { return null; } },
    logout: function () { try { sessionStorage.removeItem('dp_token'); sessionStorage.removeItem('dp_me'); Object.keys(localStorage).forEach(function (k) { if (k.indexOf('swr:') === 0) localStorage.removeItem(k); }); } catch (e) {} }
  };
  window.API = API;

  // util bersama
  window.U = {
    rp: function (n) { return 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    tgl: function (iso) { if (!iso) return '-'; const d = new Date(iso); if (isNaN(d)) return String(iso); return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); },
    wa62: function (v) { let s = String(v || '').replace(/\D/g, ''); if (s.indexOf('62') === 0) return s; if (s[0] === '0') return '62' + s.slice(1); return s; },
    toast: function (msg, tipe) {
      let box = document.getElementById('toasts');
      if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const t = document.createElement('div'); t.className = 'toast ' + (tipe || 'info'); t.textContent = msg; box.appendChild(t);
      setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 3800);
    },
    gambar: function (url) { return /^https?:\/\//.test(url || '') ? url : ''; }
  };
})();
