/* admin.js — SPA admin: login, dashboard, pesanan, produk, testimoni, FAQ, konten, CRM, notifikasi/WA, migrasi, pengaturan */
(function () {
  'use strict';
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const esc = U.esc, rp = U.rp, view = $('#view');
  let ME = null, ROUTE = '', STATE = {};

  const MENU = [
    { id: 'dashboard', ic: 'dashboard', t: 'Dashboard', r: ['owner', 'cs'] },
    { id: 'orders', ic: 'receipt_long', t: 'Pesanan', r: ['owner', 'cs'] },
    { id: 'products', ic: 'inventory_2', t: 'Produk', r: ['owner'] },
    { id: 'testi', ic: 'reviews', t: 'Testimoni', r: ['owner'] },
    { id: 'faq', ic: 'help', t: 'FAQ', r: ['owner'] },
    { id: 'content', ic: 'edit_note', t: 'Konten Halaman', r: ['owner'] },
    { grp: 'Pelanggan & Pesan' },
    { id: 'crm', ic: 'contacts', t: 'CRM Kontak', r: ['owner', 'cs'] },
    { id: 'notif', ic: 'notifications_active', t: 'Notifikasi & Blast WA', r: ['owner', 'cs'] },
    { grp: 'Sistem' },
    { id: 'import', ic: 'move_down', t: 'Migrasi Data', r: ['owner'] },
    { id: 'settings', ic: 'settings', t: 'Pengaturan', r: ['owner'] }
  ];

  // ================= util UI =================
  const gagal = function (r) { U.toast((r && r.message) || 'Terjadi kesalahan.', 'err'); return false; };
  const loading = function (n) { view.innerHTML = '<div class="stats">' + '<div class="skel" style="height:96px"></div>'.repeat(n || 4) + '</div><div class="skel" style="height:280px"></div>'; };
  function call(action, data, opt) {
    return API.post(action, data || {}, opt).catch(function (e) { U.toast('Koneksi bermasalah: ' + (e.message || ''), 'err'); return { success: false, message: 'Koneksi bermasalah' }; });
  }
  function openDrawer(html, bind) {
    $('#drawerBody').innerHTML = html; $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
    if (bind) bind($('#drawerBody'));
  }
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); }
  $('#drawerX').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  function konfirmasi(msg) { return window.confirm(msg); }
  function switchHtml(id, on) { return '<label class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></label>'; }
  function fld(label, inner, hint) { return '<div class="field"><label>' + label + '</label>' + inner + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>'; }
  function btnBusy(b, on, txt) { if (on) { b.dataset.t = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spin"></span> ' + (txt || 'Memproses…'); } else { b.disabled = false; b.innerHTML = b.dataset.t || b.innerHTML; } }
  function pager(total, page, size, act) { const pages = Math.max(1, Math.ceil(total / size)); return '<div class="pager"><span>' + total + ' data • hal. ' + page + '/' + pages + '</span><span><button class="btn btn-soft btn-sm" data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹ Sebelumnya</button> <button class="btn btn-soft btn-sm" data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Berikutnya ›</button></span></div>'; }
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function toLocalDt(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  // ================= LOGIN =================
  function tampilLogin(pesan) { $('#login').hidden = false; $('#shell').hidden = true; if (pesan) U.toast(pesan, 'err'); initGoogle(); }
  window.onSesiBerakhir = function () { tampilLogin('Sesi berakhir. Silakan login ulang.'); };
  let gInit = false;
  function initGoogle() {
    if (!API.siap()) { $('#gInfo').textContent = 'API_URL belum diisi di js/config.js'; return; }
    call('auth.config', {}, { pub: true }).then(function (r) {
      const cid = r.success && r.data.googleClientId;
      if (!cid) { $('#gInfo').textContent = 'Login Google belum dikonfigurasi. Gunakan akses darurat lalu isi Client ID di Pengaturan.'; return; }
      const go = function () {
        if (!window.google || !google.accounts || gInit) return; gInit = true;
        google.accounts.id.initialize({ client_id: cid, callback: function (resp) {
          call('auth.google', { idToken: resp.credential }, { pub: true }).then(masuk);
        } });
        google.accounts.id.renderButton($('#gBtn'), { theme: 'outline', size: 'large', width: 320, text: 'signin_with', locale: 'id' });
      };
      window.__gsi = go; go();
    });
  }
  function masuk(r) {
    if (!r.success) return gagal(r);
    API.setSesi(r.data.token, r.data.me); boot();
  }
  $('#fDarurat').addEventListener('submit', function (e) {
    e.preventDefault(); const b = $('#lGo'); btnBusy(b, true, 'Masuk…');
    call('auth.darurat', { username: $('#lU').value.trim(), password: $('#lP').value }, { pub: true }).then(function (r) { btnBusy(b, false); $('#lP').value = ''; masuk(r); });
  });
  $('#btnOut').onclick = function () { call('auth.logout', {}).then(function () { API.logout(); location.reload(); }); };

  // ================= SHELL =================
  function boot() {
    ME = API.me();
    if (!ME || !API.token()) return tampilLogin();
    $('#login').hidden = true; $('#shell').hidden = false;
    $('#meNama').textContent = ME.nama || ME.email; $('#meRole').textContent = ME.role === 'owner' ? 'Owner' : 'Admin / CS';
    $('#menu').innerHTML = MENU.filter(function (m) { return m.grp || m.r.indexOf(ME.role) > -1; }).map(function (m) {
      return m.grp ? '<div class="grp">' + m.grp + '</div>' : '<a data-r="' + m.id + '"><span class="mi">' + m.ic + '</span>' + m.t + '</a>';
    }).join('');
    route();
    call('cache.refresh', {}).catch(function () {});
  }
  $('#menu').addEventListener('click', function (e) { const a = e.target.closest('a[data-r]'); if (!a) return; location.hash = '#/' + a.dataset.r; $('#side').classList.remove('open'); });
  $('#burger').onclick = function () { $('#side').classList.toggle('open'); };
  addEventListener('hashchange', route);
  $('#btnRefresh').onclick = function () { STATE = {}; call('cache.refresh', {}).then(function () { route(true); U.toast('Data dimuat ulang.', 'ok'); }); };

  const VIEWS = {};
  function route() {
    if (!API.token()) return;
    let id = (location.hash || '#/dashboard').replace('#/', '').split('?')[0];
    const m = MENU.filter(function (x) { return x.id === id; })[0];
    if (!m || m.r.indexOf(ME.role) === -1) { id = 'dashboard'; location.hash = '#/dashboard'; }
    ROUTE = id; closeDrawer();
    $$('#menu a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === id); });
    $('#judul').textContent = (MENU.filter(function (x) { return x.id === id; })[0] || {}).t;
    VIEWS[id]();
  }

  // ================= DASHBOARD =================
  VIEWS.dashboard = function () {
    loading(4);
    API.swr('dashboard', {}, function (r, cache) {
      if (ROUTE !== 'dashboard') return;
      if (!r.success) return !cache && (view.innerHTML = '<div class="empty">' + esc(r.message) + '</div>');
      const d = r.data, max = Math.max.apply(null, d.grafik.map(function (g) { return g.omzet; }).concat([1]));
      view.innerHTML =
        '<div class="stats">' +
        stat('payments', 'Omzet Hari Ini', rp(d.omzetHari), 'Bulan ini ' + rp(d.omzetBulan)) + stat('account_balance_wallet', 'Total Omzet (Lunas)', rp(d.omzet), d.status.Lunas + ' pesanan lunas') +
        stat('hourglass_top', 'Menunggu Pembayaran', d.status.Pending, 'Perlu diverifikasi') + stat('trending_up', 'Konversi', d.konversi + '%', d.kunjungan + ' kunjungan • ' + d.totalPesanan + ' pesanan') + '</div>' +
        '<div class="row2" style="align-items:start"><div class="panel"><header><h2>Omzet 7 Hari Terakhir</h2></header><div class="pad"><div class="chart">' +
        d.grafik.map(function (g) { return '<div class="col"><b>' + (g.omzet ? (g.omzet >= 1e6 ? (g.omzet / 1e6).toFixed(1) + 'jt' : Math.round(g.omzet / 1e3) + 'rb') : '') + '</b><div class="bar" style="height:' + Math.round(g.omzet / max * 100) + '%"></div><span>' + g.tanggal.slice(5) + '</span></div>'; }).join('') + '</div></div></div>' +
        '<div class="panel"><header><h2>Produk Terlaris</h2></header><div class="pad">' + (d.topProduk.length ? d.topProduk.map(function (p) { return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border)"><span>' + esc(p.nama) + '</span><b>' + p.terjual + ' terjual</b></div>'; }).join('') : '<div class="empty">Belum ada penjualan.</div>') + '</div></div></div>' +
        '<div class="panel"><header><h2>Pesanan Terbaru</h2><a class="btn btn-soft btn-sm" href="#/orders">Lihat semua</a></header>' + tabelPesanan(d.terbaru, true) + '</div>';
      bindOrderRows(d.terbaru);
    });
  };
  function stat(ic, label, val, sub) { return '<div class="stat"><small><span class="mi" style="font-size:18px;color:var(--primary)">' + ic + '</span>' + label + '</small><b>' + val + '</b><em>' + esc(sub || '') + '</em></div>'; }

  // ================= PESANAN =================
  function tabelPesanan(rows, ringkas) {
    if (!rows.length) return '<div class="empty">Belum ada pesanan.</div>';
    return '<div class="tbl-wrap"><table class="resp"><thead><tr><th>Kode</th><th>Tanggal</th><th>Pembeli</th><th>Produk</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (o) { return '<tr class="click" data-k="' + esc(o.kode) + '"><td data-l="Kode"><b>' + esc(o.kode) + '</b></td><td data-l="Tanggal">' + U.tgl(o.tanggal) + '</td><td data-l="Pembeli">' + esc(o.nama) + '<br><small style="color:var(--muted)">' + esc(o.whatsapp) + '</small></td><td data-l="Produk">' + esc(o.produk) + '</td><td data-l="Total"><b>' + rp(o.nominal) + '</b></td><td data-l="Status"><span class="pill ' + o.status + '">' + o.status + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function bindOrderRows(rows) { $$('tr[data-k]', view).forEach(function (tr) { tr.onclick = function () { drawerOrder(rows.filter(function (o) { return o.kode === tr.dataset.k; })[0]); }; }); }
  VIEWS.orders = function () {
    const S = STATE.orders = Object.assign({ status: '', q: '', page: 1 }, STATE.orders || {});
    view.innerHTML = '<div class="tabs" id="oTabs"></div><div class="tools"><input type="search" id="oQ" placeholder="Cari kode, nama, email, WhatsApp…" value="' + esc(S.q) + '"></div><div class="panel" id="oBox"><div class="pad"><div class="skel" style="height:240px"></div></div></div>';
    function muat() {
      call('orders.list', { status: S.status, q: S.q, page: S.page, size: 20 }, { read: true }).then(function (r) {
        if (ROUTE !== 'orders') return; if (!r.success) return gagal(r);
        const d = r.data, h = d.hitung;
        $('#oTabs').innerHTML = [['', 'Semua', h.semua], ['Pending', 'Menunggu', h.Pending], ['Lunas', 'Lunas', h.Lunas], ['Batal', 'Batal', h.Batal]].map(function (t) { return '<button data-s="' + t[0] + '" class="' + (S.status === t[0] ? 'on' : '') + '">' + t[1] + '<small>' + t[2] + '</small></button>'; }).join('');
        $$('#oTabs button').forEach(function (b) { b.onclick = function () { S.status = b.dataset.s; S.page = 1; muat(); }; });
        $('#oBox').innerHTML = tabelPesanan(d.rows) + pager(d.total, d.page, d.size);
        bindOrderRows(d.rows);
        $$('[data-pg]', $('#oBox')).forEach(function (b) { b.onclick = function () { S.page = +b.dataset.pg; muat(); }; });
        STATE.ordersMuat = muat;
      });
    }
    $('#oQ').oninput = debounce(function (e) { S.q = e.target.value; S.page = 1; muat(); }, 350);
    muat();
  };
  function drawerOrder(o) {
    if (!o) return;
    openDrawer('<h3>Pesanan ' + esc(o.kode) + '</h3><div class="kv"><span>Status</span><b><span class="pill ' + o.status + '">' + o.status + '</span></b></div>' +
      [['Tanggal', U.tgl(o.tanggal)], ['Pembeli', esc(o.nama)], ['Email', esc(o.email)], ['WhatsApp', '<a href="https://api.whatsapp.com/send?phone=' + U.wa62(o.whatsapp) + '" target="_blank" rel="noopener" style="color:var(--primary)">' + esc(o.whatsapp) + '</a>'], ['Produk', esc(o.produk)], ['Metode', esc(o.metode)], ['Total', '<b style="color:var(--primary)">' + rp(o.nominal) + '</b>']].map(function (a) { return '<div class="kv"><span>' + a[0] + '</span><b>' + a[1] + '</b></div>'; }).join('') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:18px 0"><button class="btn btn-primary" data-st="Lunas"' + (o.status === 'Lunas' ? ' disabled' : '') + '>✓ Tandai Lunas &amp; Kirim Link</button><button class="btn btn-danger" data-st="Batal"' + (o.status === 'Batal' ? ' disabled' : '') + '>Batalkan</button>' + (o.status !== 'Pending' ? '<button class="btn btn-soft" data-st="Pending">Kembalikan ke Pending</button>' : '') + (o.status === 'Lunas' ? '<button class="btn btn-soft" id="bResend">Kirim ulang link</button>' : '') + '</div>' +
      fld('Catatan admin', '<textarea id="oCat" maxlength="500">' + esc(o.catatan || '') + '</textarea>') + '<button class="btn btn-soft" id="bCat">Simpan catatan</button>', function (b) {
        $$('[data-st]', b).forEach(function (x) { x.onclick = function () {
          if (x.dataset.st === 'Batal' && !konfirmasi('Batalkan pesanan ' + o.kode + '?')) return;
          btnBusy(x, true); call('orders.status', { kode: o.kode, status: x.dataset.st }).then(function (r) { if (!r.success) { btnBusy(x, false); return gagal(r); } U.toast(r.message, 'ok'); closeDrawer(); route(); });
        }; });
        const rs = $('#bResend', b); if (rs) rs.onclick = function () { btnBusy(rs, true); call('orders.resend', { kode: o.kode }).then(function (r) { btnBusy(rs, false); r.success ? U.toast(r.message, 'ok') : gagal(r); }); };
        $('#bCat', b).onclick = function () { call('orders.note', { kode: o.kode, catatan: $('#oCat').value }).then(function (r) { r.success ? U.toast('Catatan disimpan.', 'ok') : gagal(r); }); };
      });
  }

  // ================= PRODUK =================
  VIEWS.products = function () {
    loading(0);
    call('products.list', {}, { read: true }).then(function (r) {
      if (ROUTE !== 'products') return; if (!r.success) return gagal(r);
      const L = r.data;
      view.innerHTML = '<div class="tools"><button class="btn btn-primary" id="pNew"><span class="mi">add</span> Tambah Produk</button></div><div class="pgrid">' + (L.length ? L.map(function (p) {
        return '<div class="pc' + (p.aktif ? '' : ' off') + '"><div class="im">' + (p.gambar[0] ? '<img src="' + esc(p.gambar[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') + '</div><div class="bd"><b>' + esc(p.nama) + '</b> ' + (p.aktif ? '' : '<span class="pill bad">Nonaktif</span>') +
          '<div style="margin:6px 0"><b style="color:var(--primary)">' + rp(p.harga) + '</b> ' + (p.promoAktif ? '<s style="color:var(--muted);font-size:13px">' + rp(p.hargaNormal) + '</s>' : '') + '</div><small style="color:var(--muted)">' + p.gambar.length + ' gambar • ' + p.terjual + ' terjual' + (p.stok !== '' ? ' • stok ' + p.stok : '') + '</small>' +
          '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-e="' + esc(p.id) + '">Edit</button><button class="btn btn-soft btn-sm" data-t="' + esc(p.id) + '">' + (p.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button><button class="btn btn-danger btn-sm" data-d="' + esc(p.id) + '">Hapus</button></div></div></div>';
      }).join('') : '<div class="empty" style="grid-column:1/-1">Belum ada produk.</div>') + '</div>';
      $('#pNew').onclick = function () { formProduk(null); };
      $$('[data-e]').forEach(function (b) { b.onclick = function () { formProduk(L.filter(function (p) { return p.id === b.dataset.e; })[0]); }; });
      $$('[data-t]').forEach(function (b) { b.onclick = function () { call('products.toggle', { id: b.dataset.t }).then(function (r) { r.success ? (U.toast(r.message, 'ok'), route()) : gagal(r); }); }; });
      $$('[data-d]').forEach(function (b) { b.onclick = function () { if (konfirmasi('Hapus produk ini permanen?')) call('products.delete', { id: b.dataset.d }).then(function (r) { r.success ? (U.toast(r.message, 'ok'), route()) : gagal(r); }); }; });
    });
  };
  function formProduk(p) {
    p = p || { nama: '', deskripsi: '', hargaNormal: '', hargaDiskon: '', promoSampai: '', bonus: [], gambar: [], badge: '', stok: '', urutan: 1, fileDriveId: '', aktif: true, slug: '' };
    let imgs = p.gambar.slice();
    openDrawer('<h3>' + (p.id ? 'Edit Produk' : 'Produk Baru') + '</h3>' +
      fld('Nama produk', '<input id="pNama" maxlength="120" value="' + esc(p.nama) + '">') + fld('Deskripsi singkat', '<textarea id="pDesk" maxlength="600">' + esc(p.deskripsi) + '</textarea>') +
      '<div class="row2">' + fld('Harga normal (Rp)', '<input id="pHN" type="number" min="0" value="' + esc(p.hargaNormal) + '">') + fld('Harga diskon (Rp)', '<input id="pHD" type="number" min="0" value="' + esc(p.hargaDiskon) + '">') + '</div>' +
      fld('Promo berakhir', '<input id="pPS" type="datetime-local" value="' + toLocalDt(p.promoSampai) + '">', 'Kosongkan = diskon tanpa batas waktu. Countdown muncul di landing page.') +
      fld('Gambar (slideshow otomatis)', '<div class="imgs" id="pImgs"></div><div class="dropzone">Unggah beberapa gambar (maks. ±3 MB/gambar)<br><input type="file" id="pFile" accept="image/*" multiple></div><div style="display:flex;gap:6px;margin-top:8px"><input class="inp" id="pUrl" placeholder="atau tempel URL gambar https://…" style="flex:1"><button class="btn btn-soft btn-sm" id="pUrlAdd" type="button">Tambah</button></div>', 'Gambar pertama = sampul. Urutan = urutan slideshow.') +
      fld('Bonus (satu per baris)', '<textarea id="pBonus">' + esc(p.bonus.join('\n')) + '</textarea>') +
      '<div class="row2">' + fld('Badge', '<input id="pBadge" maxlength="30" placeholder="Terlaris" value="' + esc(p.badge) + '">') + fld('Urutan tampil', '<input id="pUrut" type="number" value="' + esc(p.urutan) + '">') + '</div>' +
      '<div class="row2">' + fld('Stok', '<input id="pStok" type="number" min="0" placeholder="kosong = tak terbatas" value="' + esc(p.stok) + '">') + fld('ID file Drive produk', '<input id="pFile2" value="' + esc(p.fileDriveId) + '">', 'ID file di folder "File Produk Digital".') + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('pAktif', p.aktif) + '<span>Tampilkan di landing page</span></div><button class="btn btn-primary btn-block" id="pSave">Simpan Produk</button>',
      function (b) {
        function paint() { $('#pImgs', b).innerHTML = imgs.map(function (u, i) { return '<div class="th"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer"><button data-x="' + i + '" type="button" aria-label="Hapus">×</button></div>'; }).join('') || '<small style="color:var(--muted)">Belum ada gambar — landing memakai mockup bawaan.</small>'; $$('[data-x]', b).forEach(function (x) { x.onclick = function () { imgs.splice(+x.dataset.x, 1); paint(); }; }); }
        paint();
        $('#pUrlAdd', b).onclick = function () { const u = $('#pUrl', b).value.trim(); if (!/^https:\/\//.test(u)) return U.toast('URL harus diawali https://', 'err'); imgs.push(u); $('#pUrl', b).value = ''; paint(); };
        $('#pFile', b).onchange = function (e) {
          const files = Array.prototype.slice.call(e.target.files); if (!files.length) return;
          U.toast('Mengunggah ' + files.length + ' gambar…');
          files.reduce(function (pr, f) { return pr.then(function () { return resize(f).then(function (x) { return call('media.upload', { nama: f.name, mime: x.mime, base64: x.b64 }); }).then(function (r) { if (r.success) { imgs.push(r.data.url); paint(); } else gagal(r); }); }); }, Promise.resolve()).then(function () { e.target.value = ''; });
        };
        $('#pSave', b).onclick = function () {
          const s = this;
          btnBusy(s, true, 'Menyimpan…');
          call('products.save', { id: p.id || '', nama: $('#pNama', b).value, deskripsi: $('#pDesk', b).value, hargaNormal: $('#pHN', b).value, hargaDiskon: $('#pHD', b).value, promoSampai: $('#pPS', b).value ? new Date($('#pPS', b).value).toISOString() : '', gambar: imgs, bonus: $('#pBonus', b).value.split('\n'), badge: $('#pBadge', b).value, urutan: $('#pUrut', b).value, stok: $('#pStok', b).value, fileDriveId: $('#pFile2', b).value.trim(), aktif: $('#pAktif', b).checked })
            .then(function (r) { btnBusy(s, false); if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); route(); });
        };
      });
  }
  // kompres gambar di browser agar upload ringan
  function resize(file) {
    return new Promise(function (res) {
      const fr = new FileReader();
      fr.onload = function () {
        const im = new Image();
        im.onload = function () {
          const mx = 1400, k = Math.min(1, mx / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const d = c.toDataURL('image/jpeg', .85); res({ mime: 'image/jpeg', b64: d.split(',')[1] });
        };
        im.onerror = function () { res({ mime: file.type, b64: String(fr.result).split(',')[1] }); };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // ================= TESTIMONI =================
  VIEWS.testi = function () {
    loading(0);
    call('testimonials.list', {}, { read: true }).then(function (r) {
      if (ROUTE !== 'testi') return; if (!r.success) return gagal(r);
      const L = r.data;
      view.innerHTML = '<div class="tools"><button class="btn btn-primary" id="tNew"><span class="mi">add</span> Tambah Testimoni</button></div><div class="panel">' + (L.length ? '<div class="tbl-wrap"><table class="resp"><thead><tr><th>Nama</th><th>Ulasan</th><th>Rating</th><th>Tampil</th><th></th></tr></thead><tbody>' + L.map(function (t) {
        return '<tr><td data-l="Nama"><b>' + esc(t.nama) + '</b><br><small style="color:var(--muted)">' + esc(t.jabatan) + '</small></td><td data-l="Ulasan" style="max-width:380px">' + esc(t.ulasan.slice(0, 110)) + (t.ulasan.length > 110 ? '…' : '') + '</td><td data-l="Rating">' + '★'.repeat(t.rating) + '</td><td data-l="Tampil">' + switchHtml('tg' + t.id, t.tampil).replace('<input', '<input data-tg="' + esc(t.id) + '"') + '</td><td><button class="btn btn-soft btn-sm" data-e="' + esc(t.id) + '">Edit</button> <button class="btn btn-danger btn-sm" data-d="' + esc(t.id) + '">Hapus</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada testimoni.</div>') + '</div>';
      $('#tNew').onclick = function () { formTesti(null); };
      $$('[data-e]').forEach(function (b) { b.onclick = function () { formTesti(L.filter(function (t) { return t.id === b.dataset.e; })[0]); }; });
      $$('[data-tg]').forEach(function (c) { c.onchange = function () { call('testimonials.toggle', { id: c.dataset.tg }).then(function (r) { r.success ? U.toast(r.message, 'ok') : (gagal(r), route()); }); }; });
      $$('[data-d]').forEach(function (b) { b.onclick = function () { if (konfirmasi('Hapus testimoni ini?')) call('testimonials.delete', { id: b.dataset.d }).then(function (r) { r.success ? (U.toast(r.message, 'ok'), route()) : gagal(r); }); }; });
    });
  };
  function formTesti(t) {
    t = t || { nama: '', jabatan: '', ulasan: '', rating: 5, screenshot: '', avatar: '', tampil: true, urutan: 99 };
    openDrawer('<h3>' + (t.id ? 'Edit Testimoni' : 'Testimoni Baru') + '</h3>' + fld('Nama', '<input id="tN" maxlength="80" value="' + esc(t.nama) + '">') + fld('Jabatan / profesi', '<input id="tJ" maxlength="80" value="' + esc(t.jabatan) + '">') + fld('Ulasan', '<textarea id="tU" maxlength="800">' + esc(t.ulasan) + '</textarea>') +
      '<div class="row2">' + fld('Rating (1–5)', '<input id="tR" type="number" min="1" max="5" value="' + t.rating + '">') + fld('Urutan', '<input id="tO" type="number" value="' + t.urutan + '">') + '</div>' + fld('URL foto profil (opsional)', '<input id="tA" value="' + esc(t.avatar) + '" placeholder="https://…">') + fld('URL screenshot ulasan (opsional)', '<input id="tS" value="' + esc(t.screenshot) + '" placeholder="https://…">', 'Tampil pada pop-up tampilan lengkap.') +
      '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('tT', t.tampil) + '<span>Tampilkan di landing page (Showcase)</span></div><button class="btn btn-primary btn-block" id="tSave">Simpan</button>', function (b) {
        $('#tSave', b).onclick = function () { const s = this; btnBusy(s, true); call('testimonials.save', { id: t.id || '', nama: $('#tN', b).value, jabatan: $('#tJ', b).value, ulasan: $('#tU', b).value, rating: $('#tR', b).value, urutan: $('#tO', b).value, avatar: $('#tA', b).value, screenshot: $('#tS', b).value, tampil: $('#tT', b).checked }).then(function (r) { btnBusy(s, false); if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); route(); }); };
      });
  }

  // ================= FAQ =================
  VIEWS.faq = function () {
    loading(0);
    call('faq.list', {}, { read: true }).then(function (r) {
      if (ROUTE !== 'faq') return; if (!r.success) return gagal(r);
      const L = r.data;
      view.innerHTML = '<div class="tools"><button class="btn btn-primary" id="fNew"><span class="mi">add</span> Tambah FAQ</button></div><div class="panel">' + (L.length ? L.map(function (f, i) {
        return '<div style="display:flex;gap:10px;align-items:flex-start;padding:14px 18px;border-top:1px solid var(--border)"><div style="display:grid"><button class="btn btn-soft btn-sm" data-u="' + i + '"' + (i === 0 ? ' disabled' : '') + ' style="padding:2px 8px;min-height:26px">▲</button><button class="btn btn-soft btn-sm" data-n="' + i + '"' + (i === L.length - 1 ? ' disabled' : '') + ' style="padding:2px 8px;min-height:26px;margin-top:3px">▼</button></div><div style="flex:1"><b>' + esc(f.q) + '</b> ' + (f.tampil ? '' : '<span class="pill bad">Disembunyikan</span>') + '<div style="color:var(--muted);font-size:14px">' + esc(f.a.slice(0, 140)) + '</div></div><button class="btn btn-soft btn-sm" data-e="' + i + '">Edit</button><button class="btn btn-danger btn-sm" data-d="' + esc(f.id) + '">Hapus</button></div>';
      }).join('') : '<div class="empty">Belum ada FAQ.</div>') + '</div>';
      $('#fNew').onclick = function () { formFaq(null); };
      $$('[data-e]').forEach(function (b) { b.onclick = function () { formFaq(L[+b.dataset.e]); }; });
      $$('[data-d]').forEach(function (b) { b.onclick = function () { if (konfirmasi('Hapus FAQ ini?')) call('faq.delete', { id: b.dataset.d }).then(function (r) { r.success ? (U.toast(r.message, 'ok'), route()) : gagal(r); }); }; });
      function geser(i, j) { const ids = L.map(function (x) { return x.id; }); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; call('faq.reorder', { ids: ids }).then(function (r) { r.success ? route() : gagal(r); }); }
      $$('[data-u]').forEach(function (b) { b.onclick = function () { geser(+b.dataset.u, +b.dataset.u - 1); }; });
      $$('[data-n]').forEach(function (b) { b.onclick = function () { geser(+b.dataset.n, +b.dataset.n + 1); }; });
    });
  };
  function formFaq(f) {
    f = f || { q: '', a: '', tampil: true };
    openDrawer('<h3>' + (f.id ? 'Edit FAQ' : 'FAQ Baru') + '</h3>' + fld('Pertanyaan', '<input id="qQ" maxlength="250" value="' + esc(f.q) + '">') + fld('Jawaban', '<textarea id="qA" style="min-height:160px" maxlength="1500">' + esc(f.a) + '</textarea>') + '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('qT', f.tampil) + '<span>Tampilkan</span></div><button class="btn btn-primary btn-block" id="qS">Simpan</button>', function (b) {
      $('#qS', b).onclick = function () { const s = this; btnBusy(s, true); call('faq.save', { id: f.id || '', q: $('#qQ', b).value, a: $('#qA', b).value, tampil: $('#qT', b).checked }).then(function (r) { btnBusy(s, false); if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); route(); }); };
    });
  }

  // ================= KONTEN =================
  const NAMA_SEKSI = { header: 'Header', hero: 'Hero (bagian utama)', problem: 'Masalah', solution: 'Solusi', fitur: 'Fitur', testimoni: 'Judul Testimoni', offer: 'Penawaran', faq: 'Judul FAQ', footer: 'Footer' };
  const PETUNJUK = { hero: 'Format Isi (satu per baris): eyebrow=…, cta=…, cta2=…, garansi=…, rating=…, lisensi=…', problem: 'Satu kartu per baris: Judul | Penjelasan | nama_ikon', solution: 'Satu poin per baris: Judul | Penjelasan', fitur: 'Satu fitur per baris: Judul | Penjelasan | nama_ikon (Material Symbols)', offer: 'Format: garansi=…, aman=…, kirim=…' };
  VIEWS.content = function () {
    loading(0);
    Promise.all([call('content.list', {}, { read: true }), call('settings.get', {}, { read: true })]).then(function (rs) {
      if (ROUTE !== 'content') return; if (!rs[0].success) return gagal(rs[0]);
      const L = rs[0].data, hero = ((rs[1].data || {}).rows || []).filter(function (x) { return x.kunci === 'HERO_IMAGES'; })[0];
      view.innerHTML = '<div class="note blue">Teks setiap seksi landing page dikelola di sini. Perubahan tampil setelah disimpan.</div><div class="panel"><header><h2>Gambar Hero (slideshow)</h2></header><div class="pad">' + fld('URL gambar — satu per baris', '<textarea id="hImgs" style="min-height:110px" placeholder="https://…">' + esc(hero ? hero.nilai : '') + '</textarea>', 'Kosong = pakai gambar produk / mockup bawaan. Unggah gambar lewat menu Produk, lalu salin URL-nya ke sini.') + '<button class="btn btn-primary" id="hSave">Simpan Gambar Hero</button></div></div>' +
        '<div class="panel"><div class="tbl-wrap"><table class="resp"><thead><tr><th>Seksi</th><th>Judul</th><th>Tampil</th><th></th></tr></thead><tbody>' + L.map(function (k) { return '<tr><td data-l="Seksi"><b>' + esc(NAMA_SEKSI[k.kunci] || k.kunci) + '</b></td><td data-l="Judul">' + esc((k.judul || '—').slice(0, 70)) + '</td><td data-l="Tampil">' + (k.tampil ? '✓' : '—') + '</td><td><button class="btn btn-soft btn-sm" data-e="' + esc(k.kunci) + '">Edit</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
      $('#hSave').onclick = function () { const s = this; btnBusy(s, true); call('settings.save', { items: { HERO_IMAGES: $('#hImgs').value } }).then(function (r) { btnBusy(s, false); r.success ? U.toast('Gambar hero disimpan.', 'ok') : gagal(r); }); };
      $$('[data-e]').forEach(function (b) { b.onclick = function () {
        const k = L.filter(function (x) { return x.kunci === b.dataset.e; })[0];
        openDrawer('<h3>' + esc(NAMA_SEKSI[k.kunci] || k.kunci) + '</h3>' + fld('Judul', '<input id="cJ" value="' + esc(k.judul) + '">') + fld('Subjudul', '<textarea id="cS">' + esc(k.subjudul) + '</textarea>') + fld('Isi', '<textarea id="cI" style="min-height:200px" class="mono">' + esc(k.isi) + '</textarea>', esc(PETUNJUK[k.kunci] || 'Tidak dipakai pada seksi ini.')) + '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('cT', k.tampil) + '<span>Tampilkan seksi</span></div><button class="btn btn-primary btn-block" id="cSave">Simpan</button>', function (d) {
          $('#cSave', d).onclick = function () { const s = this; btnBusy(s, true); call('content.save', { kunci: k.kunci, judul: $('#cJ', d).value, subjudul: $('#cS', d).value, isi: $('#cI', d).value, tampil: $('#cT', d).checked }).then(function (r) { btnBusy(s, false); if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); route(); }); };
        });
      }; });
    });
  };

  // ================= CRM =================
  VIEWS.crm = function () {
    const S = STATE.crm = Object.assign({ q: '', segmen: '', statusWa: '', tag: '', page: 1 }, STATE.crm || {});
    view.innerHTML = '<div class="stats" id="cStats"></div><div class="tools"><input type="search" id="cQ" placeholder="Cari nama, email, nomor, tag…" value="' + esc(S.q) + '"><select id="cSeg"><option value="">Semua segmen</option><option>Pembeli</option><option>Prospek</option><option>Manual</option><option>Impor</option></select><select id="cWa"><option value="">Semua status WA</option><option value="aktif">WA aktif</option><option value="tidak">Bukan WA</option><option value="belum">Belum dicek</option></select><select id="cTag"><option value="">Semua tag</option></select></div>' +
      '<div class="tools"><button class="btn btn-primary btn-sm" id="cAdd"><span class="mi" style="font-size:18px">person_add</span> Kontak</button><button class="btn btn-soft btn-sm" id="cSync"><span class="mi" style="font-size:18px">sync</span> Sinkron dari Pesanan</button><button class="btn btn-soft btn-sm" id="cImp"><span class="mi" style="font-size:18px">upload_file</span> Impor CSV</button>' + (ME.role === 'owner' ? '<button class="btn btn-soft btn-sm" id="cExp"><span class="mi" style="font-size:18px">download</span> Ekspor</button>' : '') + '<span style="flex:1"></span><span id="cSel" style="color:var(--muted);font-size:13px"></span><button class="btn btn-soft btn-sm" id="cChk" disabled>Cek WA</button><button class="btn btn-soft btn-sm" id="cTagB" disabled>+ Tag</button><button class="btn btn-danger btn-sm" id="cDel" disabled>Hapus</button></div><div class="panel" id="cBox"><div class="pad"><div class="skel" style="height:240px"></div></div></div>';
    $('#cSeg').value = S.segmen; $('#cWa').value = S.statusWa;
    let sel = {}, rowsNow = [];
    function stats() { call('crm.stats', {}, { read: true }).then(function (r) { if (!r.success || ROUTE !== 'crm') return; const s = r.data; $('#cStats').innerHTML = stat('contacts', 'Total Kontak', s.total, s.pembeli + ' pembeli • ' + s.prospek + ' prospek') + stat('chat', 'WhatsApp Aktif', s.waAktif, s.waBelum + ' belum dicek') + stat('phone_disabled', 'Bukan WhatsApp', s.waTidak, 'dikecualikan dari blast') + stat('do_not_disturb_on', 'Opt-out', s.optOut, 'tidak menerima pesan'); }); }
    function muat() {
      call('crm.list', { q: S.q, segmen: S.segmen, statusWa: S.statusWa, tag: S.tag, page: S.page, size: 25 }, { read: true }).then(function (r) {
        if (ROUTE !== 'crm') return; if (!r.success) return gagal(r);
        const d = r.data; rowsNow = d.rows;
        $('#cTag').innerHTML = '<option value="">Semua tag</option>' + d.tag.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join(''); $('#cTag').value = S.tag;
        $('#cBox').innerHTML = d.rows.length ? '<div class="tbl-wrap"><table class="resp"><thead><tr><th><input type="checkbox" id="cAll"></th><th>Nama</th><th>Kontak</th><th>Segmen</th><th>WA</th><th>Tag</th></tr></thead><tbody>' + d.rows.map(function (k) {
          return '<tr class="click" data-id="' + esc(k.id) + '"><td onclick="event.stopPropagation()"><input type="checkbox" data-s="' + esc(k.id) + '"' + (sel[k.id] ? ' checked' : '') + '></td><td data-l="Nama"><b>' + esc(k.nama) + '</b>' + (k.optOut ? ' <span class="pill bad">opt-out</span>' : '') + '</td><td data-l="Kontak">' + esc(k.wa || '—') + '<br><small style="color:var(--muted)">' + esc(k.email || '') + '</small></td><td data-l="Segmen">' + esc(k.segmen) + '</td><td data-l="WA"><span class="pill ' + k.statusWa + '">' + (k.statusWa === 'aktif' ? 'aktif' : k.statusWa === 'tidak' ? 'bukan WA' : 'belum dicek') + '</span></td><td data-l="Tag">' + esc(k.tag) + '</td></tr>';
        }).join('') + '</tbody></table></div>' + pager(d.total, d.page, d.size) : '<div class="empty">Belum ada kontak. Klik <b>Sinkron dari Pesanan</b> atau impor CSV.</div>';
        $$('tr[data-id]', $('#cBox')).forEach(function (tr) { tr.onclick = function () { drawerKontak(tr.dataset.id); }; });
        $$('[data-s]', $('#cBox')).forEach(function (c) { c.onchange = function () { c.checked ? sel[c.dataset.s] = 1 : delete sel[c.dataset.s]; selUi(); }; });
        const all = $('#cAll'); if (all) all.onchange = function () { $$('[data-s]', $('#cBox')).forEach(function (c) { c.checked = all.checked; all.checked ? sel[c.dataset.s] = 1 : delete sel[c.dataset.s]; }); selUi(); };
        $$('[data-pg]', $('#cBox')).forEach(function (b) { b.onclick = function () { S.page = +b.dataset.pg; muat(); }; });
        selUi();
      });
    }
    function selUi() { const n = Object.keys(sel).length; $('#cSel').textContent = n ? n + ' dipilih' : ''; ['cChk', 'cTagB', 'cDel'].forEach(function (i) { $('#' + i).disabled = !n; }); }
    $('#cQ').oninput = debounce(function (e) { S.q = e.target.value; S.page = 1; muat(); }, 350);
    $('#cSeg').onchange = function (e) { S.segmen = e.target.value; S.page = 1; muat(); }; $('#cWa').onchange = function (e) { S.statusWa = e.target.value; S.page = 1; muat(); }; $('#cTag').onchange = function (e) { S.tag = e.target.value; S.page = 1; muat(); };
    $('#cAdd').onclick = function () { formKontak(null, function () { muat(); stats(); }); };
    $('#cSync').onclick = function () { const b = this; btnBusy(b, true, 'Sinkron…'); call('crm.sync', {}).then(function (r) { btnBusy(b, false); r.success ? (U.toast(r.message, 'ok'), muat(), stats()) : gagal(r); }); };
    $('#cImp').onclick = function () { drawerImporKontak(function () { muat(); stats(); }); };
    const ex = $('#cExp'); if (ex) ex.onclick = function () { call('crm.export', {}).then(function (r) { if (!r.success) return gagal(r); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + r.data.csv], { type: 'text/csv' })); a.download = r.data.nama; a.click(); }); };
    $('#cChk').onclick = function () { const ids = Object.keys(sel).slice(0, 50), b = this; btnBusy(b, true, 'Mengecek…'); call('wa.validate', { ids: ids }).then(function (r) { btnBusy(b, false); r.success ? (U.toast(r.message, 'ok'), muat(), stats()) : gagal(r); }); };
    $('#cTagB').onclick = function () { const t = prompt('Nama tag untuk kontak terpilih:'); if (!t) return; call('crm.bulk', { ids: Object.keys(sel), aksi: 'tag', nilai: t }).then(function (r) { r.success ? (U.toast(r.message, 'ok'), muat()) : gagal(r); }); };
    $('#cDel').onclick = function () { if (!konfirmasi('Hapus ' + Object.keys(sel).length + ' kontak terpilih?')) return; call('crm.bulk', { ids: Object.keys(sel), aksi: 'hapus' }).then(function (r) { if (r.success) { sel = {}; U.toast(r.message, 'ok'); muat(); stats(); } else gagal(r); }); };
    stats(); muat();
  };
  function formKontak(k, done) {
    k = k || { nama: '', email: '', wa: '', segmen: 'Manual', tag: '', catatan: '', optOut: false };
    openDrawer('<h3>' + (k.id ? 'Edit Kontak' : 'Kontak Baru') + '</h3>' + fld('Nama', '<input id="kN" value="' + esc(k.nama) + '">') + fld('Nomor WhatsApp', '<input id="kW" type="tel" value="' + esc(k.wa) + '" placeholder="081234567890">') + fld('Email', '<input id="kE" type="email" value="' + esc(k.email) + '">') + '<div class="row2">' + fld('Segmen', '<input id="kS" value="' + esc(k.segmen) + '">') + fld('Tag (pisahkan koma)', '<input id="kT" value="' + esc(k.tag) + '">') + '</div>' + fld('Catatan', '<textarea id="kC">' + esc(k.catatan) + '</textarea>') + '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('kO', k.optOut) + '<span>Opt-out (jangan kirim pesan)</span></div><button class="btn btn-primary btn-block" id="kSave">Simpan</button>', function (b) {
      $('#kSave', b).onclick = function () { const s = this; btnBusy(s, true); call('crm.save', { id: k.id || '', nama: $('#kN', b).value, wa: $('#kW', b).value, email: $('#kE', b).value, segmen: $('#kS', b).value, tag: $('#kT', b).value, catatan: $('#kC', b).value, optOut: $('#kO', b).checked }).then(function (r) { btnBusy(s, false); if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); done && done(); }); };
    });
  }
  function drawerKontak(id) {
    openDrawer('<div class="skel" style="height:300px"></div>');
    call('crm.detail', { id: id }, { read: true }).then(function (r) {
      if (!r.success) { closeDrawer(); return gagal(r); }
      const k = r.data.kontak;
      openDrawer('<h3>' + esc(k.nama) + '</h3><div class="kv"><span>WhatsApp</span><b>' + (k.wa ? '<a style="color:var(--primary)" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?phone=' + U.wa62(k.wa) + '">' + esc(k.wa) + '</a>' : '—') + '</b></div><div class="kv"><span>Email</span><b>' + esc(k.email || '—') + '</b></div><div class="kv"><span>Segmen / Sumber</span><b>' + esc(k.segmen) + ' / ' + esc(k.sumber) + '</b></div><div class="kv"><span>Status WA</span><b>' + esc(k.statusWa) + '</b></div><div class="kv"><span>Tag</span><b>' + esc(k.tag || '—') + '</b></div><div class="kv"><span>Pesan terkirim</span><b>' + k.jumlahPesan + '</b></div>' + (k.info ? '<div class="note blue" style="margin-top:12px">' + esc(k.info) + '</div>' : '') +
        '<div style="display:flex;gap:8px;margin:14px 0"><button class="btn btn-soft btn-sm" id="kEdit">Edit</button></div><h4 style="margin:16px 0 6px">Riwayat pesanan</h4>' + (r.data.pesanan.length ? r.data.pesanan.map(function (o) { return '<div class="kv"><span>' + esc(o.kode) + ' • ' + esc(o.produk) + '</span><b>' + rp(o.nominal) + ' <span class="pill ' + o.status + '">' + o.status + '</span></b></div>'; }).join('') : '<small style="color:var(--muted)">Belum ada.</small>') +
        '<h4 style="margin:16px 0 6px">Interaksi</h4>' + (r.data.interaksi.length ? r.data.interaksi.map(function (i) { return '<div class="kv"><span>' + U.tgl(i.Tanggal) + ' • ' + esc(i.Kanal) + '</span><b style="font-weight:500;max-width:60%">' + esc(i.Ringkasan) + '</b></div>'; }).join('') : '<small style="color:var(--muted)">Belum ada.</small>') +
        '<div class="field" style="margin-top:14px"><label>Tambah catatan interaksi</label><textarea id="iR" style="min-height:60px"></textarea></div><button class="btn btn-primary btn-sm" id="iAdd">Simpan catatan</button>', function (b) {
          $('#kEdit', b).onclick = function () { formKontak(k, function () { route(); }); };
          $('#iAdd', b).onclick = function () { const t = $('#iR', b).value.trim(); if (!t) return; call('crm.interaksi', { kontakId: k.id, ringkasan: t }).then(function (x) { x.success ? (U.toast(x.message, 'ok'), drawerKontak(k.id)) : gagal(x); }); };
        });
    });
  }
  function parseCsv(txt) {
    const rows = []; let row = [], cur = '', q = false;
    txt = txt.replace(/^﻿/, '');
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  function drawerImporKontak(done) {
    openDrawer('<h3>Impor Kontak CSV</h3><div class="note blue">Baris pertama = nama kolom: <b>nama, email, wa, tag, segmen</b> (urutan bebas). Jalankan <b>Simulasi</b> dulu — tidak ada data yang berubah.</div><div class="dropzone"><input type="file" id="iF" accept=".csv,text/csv"></div><div id="iRes" style="margin:14px 0"></div><div style="display:flex;gap:8px"><button class="btn btn-soft" id="iDry" disabled>Simulasi</button><button class="btn btn-primary" id="iRun" disabled>Impor Sekarang</button></div>', function (b) {
      let rows = [];
      $('#iF', b).onchange = function (e) {
        const f = e.target.files[0]; if (!f) return; const fr = new FileReader();
        fr.onload = function () {
          const t = parseCsv(String(fr.result)); if (t.length < 2) return U.toast('File kosong.', 'err');
          const h = t[0].map(function (x) { return x.trim().toLowerCase(); }), ix = function (n) { return h.indexOf(n); };
          rows = t.slice(1).map(function (r) { return { nama: r[ix('nama')] || '', email: r[ix('email')] || '', wa: r[ix('wa')] || r[ix('whatsapp')] || '', tag: r[ix('tag')] || '', segmen: r[ix('segmen')] || '' }; });
          $('#iRes', b).innerHTML = '<b>' + rows.length + '</b> baris terbaca.'; $('#iDry', b).disabled = false;
        };
        fr.readAsText(f);
      };
      function jalan(dry) { call('crm.import', { rows: rows, dry: dry }).then(function (r) { if (!r.success) return gagal(r); const d = r.data; $('#iRes', b).innerHTML = '<div class="note ' + (dry ? 'blue' : '') + '">' + esc(r.message) + '<br>Baru: <b>' + d.baru + '</b> • Diperbarui: <b>' + d.diperbarui + '</b> • Dilewati: <b>' + d.dilewati + '</b>' + (d.catatan.length ? '<br><small>' + d.catatan.map(esc).join('<br>') + '</small>' : '') + '</div>'; if (dry) $('#iRun', b).disabled = false; else { U.toast(r.message, 'ok'); closeDrawer(); done && done(); } }); }
      $('#iDry', b).onclick = function () { jalan(true); }; $('#iRun', b).onclick = function () { if (konfirmasi('Impor data sekarang?')) jalan(false); };
    });
  }

  // ================= NOTIFIKASI & BLAST =================
  const EV_LABEL = { order_baru: 'Pesanan baru', order_lunas: 'Pembayaran terverifikasi', order_batal: 'Pesanan dibatalkan' };
  VIEWS.notif = function () {
    const isOwner = ME.role === 'owner';
    const tabs = [['blast', 'Blast WhatsApp']].concat([['antrean', 'Antrean Pesan']]).concat(isOwner ? [['matriks', 'Matriks & Template'], ['koneksi', 'Koneksi & Saklar']] : []);
    const tab = STATE.notifTab && tabs.some(function (t) { return t[0] === STATE.notifTab; }) ? STATE.notifTab : 'blast';
    view.innerHTML = '<div class="tabs" id="nTabs">' + tabs.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="nBody"></div>';
    $$('#nTabs button').forEach(function (b) { b.onclick = function () { STATE.notifTab = b.dataset.t; VIEWS.notif(); }; });
    ({ blast: tabBlast, antrean: tabAntrean, matriks: tabMatriks, koneksi: tabKoneksi })[tab]();
  };
  function tabKoneksi() {
    const box = $('#nBody'); box.innerHTML = '<div class="skel" style="height:300px"></div>';
    call('notif.config', {}, { read: true }).then(function (r) {
      if (!r.success) return gagal(r); const c = r.data;
      box.innerHTML = '<div class="panel"><header><h2>Saklar Utama</h2></header><div class="pad">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' + switchHtml('nWa', c.waAktif) + '<div><b>Notifikasi WhatsApp (Fonnte)</b><br><small style="color:var(--muted)">Mati = tidak ada pesan WA yang dikirim, termasuk blast.</small></div></div>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' + switchHtml('nEm', c.emailAktif) + '<div><b>Notifikasi Email</b><br><small style="color:var(--muted)">Memakai kuota Gmail akun script (±100 email/hari untuk akun gratis).</small></div></div>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' + switchHtml('nDet', c.deteksiOtomatis) + '<div><b>Deteksi otomatis nomor WA kontak baru</b></div></div>' +
        '<div class="row2">' + fld('WhatsApp admin (terima notifikasi pesanan baru)', '<input id="nWaA" value="' + esc(c.waAdmin) + '" placeholder="081234567890">') + fld('Email admin', '<input id="nEmA" value="' + esc(c.emailAdmin) + '" placeholder="admin@email.com">') + '</div>' +
        '<div class="row3">' + fld('Ukuran batch blast', '<select id="nBatch">' + [10, 20, 50].map(function (n) { return '<option' + (n === c.batch ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>') + fld('Jeda antar pesan (detik)', '<input id="nJeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8">', 'Maks. 10 dtk. Jeda acak membantu menghindari pemblokiran.') + fld('URL frontend (untuk link unduhan)', '<input id="nApp" value="' + esc(c.appUrl) + '" placeholder="https://username.github.io/repo">') + '</div>' +
        '<button class="btn btn-primary" id="nSave">Simpan Pengaturan</button></div></div>' +
        '<div class="panel"><header><h2>Token Fonnte</h2></header><div class="pad"><p style="margin-top:0">Status: ' + (c.tokenAda ? '<span class="pill good">tersimpan ' + esc(c.tokenSamar) + '</span>' : '<span class="pill bad">belum diisi</span>') + '</p><div class="note blue">Token disimpan di Script Properties — tidak pernah ditampilkan ulang, tidak masuk Sheet, dan tidak dikirim ke halaman publik.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="inp" type="password" id="nTok" placeholder="Tempel token Fonnte baru" style="flex:1;min-width:220px" autocomplete="off"><button class="btn btn-primary" id="nTokSave">Simpan token</button>' + (c.tokenAda ? '<button class="btn btn-danger" id="nTokDel">Hapus</button>' : '') + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn btn-soft" id="nDev">Cek perangkat Fonnte</button><input class="inp" id="nTes" placeholder="Nomor tes 08…"><button class="btn btn-soft" id="nTesWa">Kirim WA tes</button><button class="btn btn-soft" id="nTesEm">Kirim email tes</button></div><div id="nDevRes" style="margin-top:12px"></div></div></div>';
      $('#nSave').onclick = function () { const s = this; btnBusy(s, true); call('notif.configSave', { waAktif: $('#nWa').checked, emailAktif: $('#nEm').checked, deteksiOtomatis: $('#nDet').checked, waAdmin: $('#nWaA').value, emailAdmin: $('#nEmA').value, batch: +$('#nBatch').value, jeda: $('#nJeda').value, appUrl: $('#nApp').value.trim() }).then(function (x) { btnBusy(s, false); x.success ? U.toast('Tersimpan.', 'ok') : gagal(x); }); };
      $('#nTokSave').onclick = function () { const v = $('#nTok').value.trim(); if (!v) return; call('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: v }).then(function (x) { x.success ? (U.toast('Token tersimpan.', 'ok'), tabKoneksi()) : gagal(x); }); };
      const td = $('#nTokDel'); if (td) td.onclick = function () { if (konfirmasi('Hapus token Fonnte?')) call('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: '__HAPUS__' }).then(function (x) { x.success ? tabKoneksi() : gagal(x); }); };
      $('#nDev').onclick = function () { const b = this; btnBusy(b, true); call('wa.device', {}).then(function (x) { btnBusy(b, false); $('#nDevRes').innerHTML = x.success ? '<div class="note blue">Perangkat: <b>' + esc(x.data.perangkat || '-') + '</b> • Status: <b>' + esc(x.data.status) + '</b> • Kuota: <b>' + esc(x.data.kuota) + '</b> • Paket: ' + esc(x.data.paket) + '</div>' : '<div class="note">' + esc(x.message) + '</div>'; }); };
      $('#nTesWa').onclick = function () { call('wa.test', { tujuan: $('#nTes').value }).then(function (x) { x.success ? U.toast(x.message, 'ok') : gagal(x); }); };
      $('#nTesEm').onclick = function () { const t = prompt('Kirim email tes ke:', $('#nEmA').value); if (t) call('email.test', { tujuan: t }).then(function (x) { x.success ? U.toast(x.message, 'ok') : gagal(x); }); };
    });
  }
  function tabMatriks() {
    const box = $('#nBody'); box.innerHTML = '<div class="skel" style="height:300px"></div>';
    call('notif.config', {}, { read: true }).then(function (r) {
      if (!r.success) return gagal(r); const M = r.data.matriks;
      box.innerHTML = '<div class="panel"><header><h2>Matriks Event × Kanal</h2></header><div class="tbl-wrap"><table class="mx"><thead><tr><th>Event</th><th>Pelanggan WA</th><th>Pelanggan Email</th><th>Admin WA</th><th>Admin Email</th></tr></thead><tbody>' + Object.keys(M).map(function (ev) {
        const m = M[ev]; return '<tr><td><b>' + esc(m.label) + '</b></td>' + [['pelanggan', 'wa'], ['pelanggan', 'email'], ['admin', 'wa'], ['admin', 'email']].map(function (a) { return '<td>' + switchHtml('mx_' + ev + a[0] + a[1], m[a[0]][a[1]]) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>' +
        '<div class="panel"><header><h2>Template Pesan</h2></header><div class="pad"><p style="margin-top:0;color:var(--muted)">Variabel: ' + r.data.variabel.map(function (v) { return '<code class="chip" style="cursor:default">{' + v + '}</code>'; }).join(' ') + '</p>' + Object.keys(M).map(function (ev) {
          const m = M[ev]; return '<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:700;padding:8px 0">' + esc(m.label) + '</summary>' + fld('Pesan WA ke pelanggan', '<textarea id="tp_' + ev + '_wa" style="min-height:130px">' + esc(m.waTpl) + '</textarea>') + fld('Subjek email', '<input id="tp_' + ev + '_es" value="' + esc(m.emailSubj) + '">') + fld('Isi email', '<textarea id="tp_' + ev + '_et" style="min-height:130px">' + esc(m.emailTpl) + '</textarea>') + (m.adminWa || ev === 'order_baru' ? fld('Pesan WA ke admin', '<textarea id="tp_' + ev + '_aw">' + esc(m.adminWa) + '</textarea>') + fld('Subjek email admin', '<input id="tp_' + ev + '_as" value="' + esc(m.adminSubj) + '">') + fld('Isi email admin', '<textarea id="tp_' + ev + '_ae">' + esc(m.adminEmail) + '</textarea>') : '') + '</details>';
        }).join('') + '<button class="btn btn-primary" id="mxSave">Simpan Matriks &amp; Template</button></div></div>';
      $('#mxSave').onclick = function () {
        const s = this, out = {}; Object.keys(M).forEach(function (ev) {
          const g = function (id) { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; }, m = M[ev];
          out[ev] = { pelanggan: { wa: g('mx_' + ev + 'pelangganwa'), email: g('mx_' + ev + 'pelangganemail') }, admin: { wa: g('mx_' + ev + 'adminwa'), email: g('mx_' + ev + 'adminemail') }, waTpl: g('tp_' + ev + '_wa'), emailSubj: g('tp_' + ev + '_es'), emailTpl: g('tp_' + ev + '_et'), adminWa: g('tp_' + ev + '_aw') === undefined ? m.adminWa : g('tp_' + ev + '_aw'), adminSubj: g('tp_' + ev + '_as') === undefined ? m.adminSubj : g('tp_' + ev + '_as'), adminEmail: g('tp_' + ev + '_ae') === undefined ? m.adminEmail : g('tp_' + ev + '_ae') };
        });
        btnBusy(s, true); call('notif.configSave', { matriks: out }).then(function (x) { btnBusy(s, false); x.success ? U.toast('Matriks & template tersimpan.', 'ok') : gagal(x); });
      };
    });
  }
  function tabAntrean() {
    const box = $('#nBody'); box.innerHTML = '<div class="skel" style="height:300px"></div>';
    const S = STATE.antri = STATE.antri || { status: '' };
    call('notif.queue', { status: S.status }, { read: true }).then(function (r) {
      if (!r.success) return gagal(r); const d = r.data, h = d.hitung;
      box.innerHTML = '<div class="tools"><div class="tabs" style="margin:0" id="qTabs">' + [['', 'Semua'], ['Antri', 'Antri (' + h.Antri + ')'], ['Terkirim', 'Terkirim (' + h.Terkirim + ')'], ['Gagal', 'Gagal (' + h.Gagal + ')'], ['Tahan', 'Ditahan (' + h.Tahan + ')']].map(function (t) { return '<button data-s="' + t[0] + '" class="' + (S.status === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><span style="flex:1"></span><button class="btn btn-primary btn-sm" id="qGo">Proses sekarang</button><button class="btn btn-soft btn-sm" id="qRetry">Ulangi yang gagal</button></div><div class="panel">' + (d.rows.length ? '<div class="tbl-wrap"><table class="resp"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Status</th><th>Respon</th></tr></thead><tbody>' + d.rows.map(function (q) { return '<tr><td data-l="Waktu">' + U.tgl(q.dibuat) + '</td><td data-l="Kanal">' + (q.kanal === 'wa' ? 'WhatsApp' : 'Email') + '</td><td data-l="Tujuan">' + esc(q.nama) + '<br><small style="color:var(--muted)">' + esc(q.tujuan) + '</small></td><td data-l="Event">' + esc(q.event) + '</td><td data-l="Status"><span class="pill ' + q.status + '">' + q.status + '</span></td><td data-l="Respon"><small>' + esc(q.respon) + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">Antrean kosong.</div>') + '</div>';
      $$('#qTabs button').forEach(function (b) { b.onclick = function () { S.status = b.dataset.s; tabAntrean(); }; });
      $('#qGo').onclick = function () { const b = this; btnBusy(b, true, 'Mengirim…'); call('notif.processNow', {}).then(function (x) { btnBusy(b, false); x.success ? (U.toast(x.message, 'ok'), tabAntrean()) : gagal(x); }); };
      $('#qRetry').onclick = function () { call('notif.retry', {}).then(function (x) { x.success ? (U.toast(x.message, 'ok'), tabAntrean()) : gagal(x); }); };
    });
  }
  function tabBlast() {
    const box = $('#nBody'); box.innerHTML = '<div class="skel" style="height:300px"></div>';
    Promise.all([call('wa.audience', { sasaran: 'semua' }), call('wa.blastList', {}, { read: true })]).then(function (rs) {
      if (!rs[1].success) return gagal(rs[1]);
      const a = rs[0].data || { segmen: [], tag: [], jumlah: 0 }, L = rs[1].data;
      box.innerHTML = '<div class="panel"><header><h2>Buat Blast Baru</h2></header><div class="pad"><div class="note">⚠️ Kirim hanya ke kontak yang sudah setuju menerima pesan. Pesan blast otomatis diberi catatan opt-out, dikirim per batch dengan jeda, dan kontak non-WA/opt-out dilewati.</div>' +
        fld('Judul internal', '<input id="bJ" maxlength="80" placeholder="Promo akhir bulan">') + '<div class="row2">' + fld('Sasaran', '<select id="bS"><option value="semua">Semua kontak WA aktif</option>' + a.segmen.map(function (s) { return '<option value="segmen:' + esc(s) + '">Segmen: ' + esc(s) + '</option>'; }).join('') + a.tag.map(function (s) { return '<option value="tag:' + esc(s) + '">Tag: ' + esc(s) + '</option>'; }).join('') + '</select>') + fld('Ukuran batch', '<select id="bB"><option>10</option><option selected>20</option><option>50</option></select>') + '</div>' +
        fld('Pesan', '<textarea id="bP" style="min-height:140px" maxlength="1500" placeholder="Halo {nama}! …"></textarea>', 'Variabel: {nama} {brand} {wa_cs}. <span id="bCnt"></span>') + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" id="bGo">Buat &amp; Mulai Kirim</button><span id="bAud" style="color:var(--muted);font-size:14px">Penerima: <b>' + a.jumlah + '</b></span></div><div id="bProg" style="margin-top:14px"></div></div></div>' +
        '<div class="panel"><header><h2>Riwayat Blast</h2></header>' + (L.length ? '<div class="tbl-wrap"><table class="resp"><thead><tr><th>Tanggal</th><th>Judul</th><th>Sasaran</th><th>Progres</th><th>Status</th><th></th></tr></thead><tbody>' + L.map(function (b) { return '<tr><td data-l="Tanggal">' + U.tgl(b.tanggal) + '</td><td data-l="Judul"><b>' + esc(b.judul) + '</b></td><td data-l="Sasaran">' + esc(b.sasaran) + '</td><td data-l="Progres">' + b.terkirim + '/' + b.total + (b.gagal ? ' • <span style="color:var(--red)">' + b.gagal + ' gagal</span>' : '') + '</td><td data-l="Status"><span class="pill ' + b.status + '">' + b.status + '</span></td><td>' + (b.status === 'Siap' || b.status === 'Berjalan' ? '<button class="btn btn-soft btn-sm" data-lanjut="' + esc(b.id) + '">Lanjutkan</button> <button class="btn btn-danger btn-sm" data-stop="' + esc(b.id) + '">Hentikan</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada blast.</div>') + '</div>';
      $('#bP').oninput = function () { $('#bCnt').textContent = this.value.length + '/1500'; };
      $('#bS').onchange = function () { call('wa.audience', { sasaran: this.value }).then(function (x) { if (x.success) $('#bAud').innerHTML = 'Penerima: <b>' + x.data.jumlah + '</b>' + (x.data.contoh.length ? ' (mis. ' + x.data.contoh.map(esc).join(', ') + ')' : ''); }); };
      let stopFlag = false;
      function jalankan(id) {
        stopFlag = false;
        const pr = $('#bProg');
        (function langkah() {
          if (stopFlag) return;
          call('wa.blastProcess', { blastId: id }).then(function (x) {
            if (!x.success) { pr.innerHTML = '<div class="note">' + esc(x.message) + '</div>'; return; }
            const h = x.data, tot = h.terkirim + h.gagal + h.sisa, p = tot ? Math.round((h.terkirim + h.gagal) / tot * 100) : 100;
            pr.innerHTML = '<div class="prog"><i style="width:' + p + '%"></i></div><small>' + h.terkirim + ' terkirim • ' + h.gagal + ' gagal • sisa ' + h.sisa + ' — jangan tutup halaman ini</small>';
            if (h.status === 'Selesai') { U.toast('Blast selesai 🎉', 'ok'); setTimeout(tabBlast, 800); } else langkah();
          });
        })();
      }
      $('#bGo').onclick = function () {
        const s = this; if (!$('#bP').value.trim()) return U.toast('Isi pesan dulu.', 'err');
        if (!konfirmasi('Kirim blast ke penerima terpilih? Tindakan ini tidak bisa ditarik kembali.')) return;
        btnBusy(s, true, 'Menyiapkan…');
        call('wa.blastCreate', { judul: $('#bJ').value, sasaran: $('#bS').value, batch: +$('#bB').value, pesan: $('#bP').value }).then(function (x) { btnBusy(s, false); if (!x.success) return gagal(x); U.toast(x.message, 'ok'); jalankan(x.data.blastId); });
      };
      $$('[data-lanjut]').forEach(function (b) { b.onclick = function () { jalankan(b.dataset.lanjut); }; });
      $$('[data-stop]').forEach(function (b) { b.onclick = function () { stopFlag = true; if (konfirmasi('Hentikan blast ini?')) call('wa.blastStop', { blastId: b.dataset.stop }).then(function (x) { x.success ? (U.toast(x.message, 'ok'), tabBlast()) : gagal(x); }); }; });
    });
  }

  // ================= MIGRASI =================
  VIEWS.import = function () {
    view.innerHTML = '<div class="note blue">Impor data dari spreadsheet aplikasi lama. <b>Aman diulang</b>: baris yang sudah ada diperbarui (bukan digandakan) dan yang tidak berubah dilewati. Selalu jalankan <b>Simulasi</b> dulu. Spreadsheet sumber harus bisa dibuka oleh akun pemilik script.</div>' +
      '<div class="panel"><div class="pad">' + fld('ID Spreadsheet sumber', '<input id="mId" placeholder="1AbC… (dari URL spreadsheet lama)">') + '<div id="mTabs"></div><button class="btn btn-soft btn-sm" id="mAdd" type="button">+ Tambah tab</button><div style="display:flex;gap:8px;margin-top:18px"><button class="btn btn-soft" id="mDry">Simulasi (dry-run)</button><button class="btn btn-primary" id="mRun" disabled>Impor Sekarang</button></div><div id="mRes" style="margin-top:16px"></div></div></div>';
    const T = ['Pesanan', 'Produk', 'Testimoni', 'FAQ', 'CRM_Kontak'];
    function addTab(sheet, target) { $('#mTabs').insertAdjacentHTML('beforeend', '<div class="row2" style="margin-bottom:8px;align-items:end"><div class="field" style="margin:0"><label>Nama tab di sumber</label><input data-sh value="' + esc(sheet || '') + '" placeholder="mis. Pesanan"></div><div class="field" style="margin:0"><label>Tujuan</label><select data-tg>' + T.map(function (t) { return '<option' + (t === target ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div></div>'); }
    addTab('Pesanan', 'Pesanan'); $('#mAdd').onclick = function () { addTab('', 'Pesanan'); };
    function payload(dry) { return { sumberId: $('#mId').value.trim(), dry: dry, tabs: $$('#mTabs .row2').map(function (r) { return { sheet: $('[data-sh]', r).value.trim(), target: $('[data-tg]', r).value }; }).filter(function (t) { return t.sheet; }) }; }
    function tampil(r, dry) {
      if (!r.success) return gagal(r);
      $('#mRes').innerHTML = '<div class="note ' + (dry ? 'blue' : '') + '">' + esc(r.message) + '</div><div class="tbl-wrap"><table><thead><tr><th>Tab</th><th>Tujuan</th><th>Baru</th><th>Diperbarui</th><th>Tanpa perubahan</th><th>Dilewati</th></tr></thead><tbody>' + r.data.laporan.map(function (l) { return l.galat ? '<tr><td>' + esc(l.tab) + '</td><td colspan="5" style="color:var(--red)">' + esc(l.galat) + '</td></tr>' : '<tr><td>' + esc(l.tab) + '</td><td>' + esc(l.target) + '</td><td><b>' + l.baru + '</b></td><td>' + l.diperbarui + '</td><td>' + l.tanpaPerubahan + '</td><td>' + l.dilewati + (l.catatan.length ? '<br><small>' + l.catatan.map(esc).join('<br>') + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (dry) $('#mRun').disabled = false; else { $('#mRun').disabled = true; U.toast('Impor selesai.', 'ok'); }
    }
    $('#mDry').onclick = function () { const b = this; if (!$('#mId').value.trim()) return U.toast('Isi ID spreadsheet sumber.', 'err'); btnBusy(b, true, 'Memeriksa…'); call('import.run', payload(true)).then(function (r) { btnBusy(b, false); tampil(r, true); }); };
    $('#mRun').onclick = function () { if (!konfirmasi('Jalankan impor sekarang? Data tujuan akan ditambah/diperbarui.')) return; const b = this; btnBusy(b, true, 'Mengimpor…'); call('import.run', payload(false)).then(function (r) { btnBusy(b, false); tampil(r, false); }); };
  };

  // ================= PENGATURAN =================
  VIEWS.settings = function () {
    loading(0);
    Promise.all([call('settings.get', {}, { read: true }), call('users.list', {}, { read: true })]).then(function (rs) {
      if (ROUTE !== 'settings') return; if (!rs[0].success) return gagal(rs[0]);
      const d = rs[0].data, U_ = rs[1].data || [], umum = ['NAMA_BRAND', 'WA_CS', 'FOOTER_TEKS', 'LINK_PRIVASI', 'WA_ORDER_TEMPLATE', 'DOWNLOAD_HARI', 'EMAIL_NAMA_PENGIRIM'], map = {};
      d.rows.forEach(function (x) { map[x.kunci] = x; });
      let bayar = {}; try { bayar = JSON.parse((map.METODE_BAYAR || {}).nilai || '{}'); } catch (e) {}
      bayar.bank = bayar.bank || []; bayar.ewallet = bayar.ewallet || [];
      view.innerHTML = '<div class="panel"><header><h2>Umum</h2></header><div class="pad"><div class="row2">' + umum.map(function (k) { const x = map[k]; return x ? fld(esc(x.keterangan || k), '<input data-set="' + k + '" value="' + esc(x.nilai) + '">') : ''; }).join('') + '</div><button class="btn btn-primary" id="sSave">Simpan Pengaturan Umum</button></div></div>' +
        '<div class="panel"><header><h2>Metode Pembayaran</h2></header><div class="pad">' + fld('Rekening bank (satu per baris: Nama Bank | Nomor | Atas Nama)', '<textarea id="bBank" class="mono" style="min-height:90px">' + esc(bayar.bank.map(function (b) { return [b.nama, b.nomor, b.atasNama].join(' | '); }).join('\n')) + '</textarea>') + fld('E-Wallet (satu per baris: Nama | Nomor)', '<textarea id="bEw" class="mono">' + esc(bayar.ewallet.map(function (b) { return [b.nama, b.nomor].join(' | '); }).join('\n')) + '</textarea>') + fld('URL gambar QRIS', '<input id="bQr" value="' + esc(bayar.qris || '') + '" placeholder="https://…">', 'Unggah gambar QRIS lewat menu Produk (drawer gambar), lalu tempel URL-nya di sini.') + '<button class="btn btn-primary" id="bSave">Simpan Metode Pembayaran</button></div></div>' +
        '<div class="panel"><header><h2>Keamanan & Rahasia</h2></header><div class="pad"><div class="note blue">Semua rahasia tersimpan di Script Properties dan tidak pernah ditampilkan utuh.</div>' +
        '<div class="kv"><span>Google Client ID (login Google)</span><b>' + (d.rahasia.GOOGLE_CLIENT_ID.ada ? '<span class="pill good">' + esc(d.rahasia.GOOGLE_CLIENT_ID.samar) + '</span>' : '<span class="pill bad">belum diisi</span>') + '</b></div><div style="display:flex;gap:8px;margin:10px 0 18px"><input class="inp" id="gCid" placeholder="xxxx.apps.googleusercontent.com" style="flex:1" autocomplete="off"><button class="btn btn-primary" id="gSave">Simpan</button></div>' +
        '<div class="kv"><span>Token Fonnte</span><b>' + (d.rahasia.FONNTE_TOKEN.ada ? '<span class="pill good">tersimpan</span>' : '<span class="pill bad">belum diisi</span>') + '</b></div><small style="color:var(--muted)">Diatur di menu Notifikasi → Koneksi.</small>' +
        '<h4 style="margin:20px 0 6px">Ganti kata sandi akses darurat</h4><div style="display:flex;gap:8px"><input class="inp" id="dPw" type="password" placeholder="Min. 12 karakter, huruf + angka" style="flex:1" autocomplete="new-password"><button class="btn btn-soft" id="dSave">Ganti</button></div></div></div>' +
        '<div class="panel"><header><h2>Pengguna Admin</h2><button class="btn btn-primary btn-sm" id="uAdd">Tambah</button></header>' + (U_.length ? '<div class="tbl-wrap"><table class="resp"><thead><tr><th>Email</th><th>Nama</th><th>Peran</th><th>Aktif</th><th></th></tr></thead><tbody>' + U_.map(function (u, i) { return '<tr><td data-l="Email">' + esc(u.email) + '</td><td data-l="Nama">' + esc(u.nama) + '</td><td data-l="Peran">' + (u.role === 'owner' ? 'Owner' : 'Admin/CS') + '</td><td data-l="Aktif">' + (u.aktif ? '✓' : '—') + '</td><td><button class="btn btn-soft btn-sm" data-u="' + i + '">Edit</button></td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</div>';
      $('#sSave').onclick = function () { const items = {}; $$('[data-set]').forEach(function (i) { items[i.dataset.set] = i.value; }); const s = this; btnBusy(s, true); call('settings.save', { items: items }).then(function (r) { btnBusy(s, false); r.success ? U.toast('Tersimpan.', 'ok') : gagal(r); }); };
      $('#bSave').onclick = function () {
        const baris = function (id) { return $('#' + id).value.split('\n').map(function (l) { return l.split('|').map(function (x) { return x.trim(); }); }).filter(function (a) { return a[0]; }); };
        const obj = { bank: baris('bBank').map(function (a) { return { nama: a[0], nomor: a[1] || '', atasNama: a[2] || '' }; }), ewallet: baris('bEw').map(function (a) { return { nama: a[0], nomor: a[1] || '' }; }), qris: $('#bQr').value.trim() };
        const s = this; btnBusy(s, true); call('settings.save', { items: { METODE_BAYAR: JSON.stringify(obj) } }).then(function (r) { btnBusy(s, false); r.success ? U.toast('Metode pembayaran tersimpan.', 'ok') : gagal(r); });
      };
      $('#gSave').onclick = function () { const v = $('#gCid').value.trim(); if (!v) return; call('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: v }).then(function (r) { r.success ? (U.toast('Client ID tersimpan.', 'ok'), route()) : gagal(r); }); };
      $('#dSave').onclick = function () { const v = $('#dPw').value; call('auth.rotasiDarurat', { password: v }).then(function (r) { $('#dPw').value = ''; r.success ? U.toast(r.message, 'ok') : gagal(r); }); };
      function formUser(u) {
        u = u || { email: '', nama: '', role: 'cs', aktif: true };
        openDrawer('<h3>' + (u.email ? 'Edit Pengguna' : 'Pengguna Baru') + '</h3>' + fld('Email Google', '<input id="uE" type="email" value="' + esc(u.email) + '"' + (u.email ? ' readonly' : '') + '>') + fld('Nama', '<input id="uN" value="' + esc(u.nama) + '">') + fld('Peran', '<select id="uR"><option value="cs"' + (u.role === 'cs' ? ' selected' : '') + '>Admin / CS (lihat &amp; proses pesanan, CRM)</option><option value="owner"' + (u.role === 'owner' ? ' selected' : '') + '>Owner (akses penuh)</option></select>') + '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 18px">' + switchHtml('uA', u.aktif) + '<span>Aktif</span></div><button class="btn btn-primary btn-block" id="uS">Simpan</button>', function (b) {
          $('#uS', b).onclick = function () { call('users.save', { email: $('#uE', b).value, nama: $('#uN', b).value, role: $('#uR', b).value, aktif: $('#uA', b).checked }).then(function (r) { if (!r.success) return gagal(r); U.toast(r.message, 'ok'); closeDrawer(); route(); }); };
        });
      }
      $('#uAdd').onclick = function () { formUser(null); };
      $$('[data-u]').forEach(function (b) { b.onclick = function () { formUser(U_[+b.dataset.u]); }; });
    });
  };

  // ================= START =================
  boot();
})();
