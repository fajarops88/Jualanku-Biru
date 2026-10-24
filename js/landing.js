/* landing.js — render halaman publik dari data GAS, slideshow, countdown, flip testimoni, modal pesanan */
(function () {
  'use strict';
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const esc = U.esc;
  let DATA = null, PRODUK = [], selected = null, countdownTo = 0, serverSkew = 0, ssReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- util ----------
  function kv(isi) { const o = {}; String(isi || '').split(/\r?\n/).forEach(function (l) { const i = l.indexOf('='); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); return o; }
  function barisPipa(isi) { return String(isi || '').split(/\r?\n/).map(function (l) { return l.split('|').map(function (x) { return x.trim(); }); }).filter(function (a) { return a[0]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }

  // ---------- slideshow generik ----------
  function slideshow(el, urls, opt) {
    opt = opt || {};
    const mock = opt.mock;
    const items = urls.length ? urls : [null];
    el.innerHTML = items.map(function (u, i) {
      return '<div class="slide' + (i === 0 ? ' on' : '') + '">' + (u ? '<img src="' + esc(u) + '" alt="' + esc(opt.alt || '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" referrerpolicy="no-referrer">' : mockHtml(mock)) + '</div>';
    }).join('');
    if (items.length < 2) return;
    el.insertAdjacentHTML('beforeend', '<div class="slide-dots">' + items.map(function (_, i) { return '<button type="button" aria-label="Slide ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
      (opt.nav ? '<button type="button" class="slide-nav prev" aria-label="Sebelumnya"><span class="mi">chevron_left</span></button><button type="button" class="slide-nav next" aria-label="Berikutnya"><span class="mi">chevron_right</span></button>' : ''));
    const sl = $$('.slide', el), dots = $$('.slide-dots button', el); let i = 0, timer = null;
    function go(n) { sl[i].classList.remove('on'); dots[i].classList.remove('on'); i = (n + sl.length) % sl.length; sl[i].classList.add('on'); dots[i].classList.add('on'); }
    function start() { if (ssReduced) return; stop(); timer = setInterval(function () { if (!document.hidden) go(i + 1); }, opt.ms || 4000); }
    function stop() { clearInterval(timer); }
    dots.forEach(function (d, n) { d.addEventListener('click', function (e) { e.stopPropagation(); go(n); start(); }); });
    const pv = $('.prev', el), nx = $('.next', el);
    if (pv) pv.addEventListener('click', function (e) { e.stopPropagation(); go(i - 1); start(); });
    if (nx) nx.addEventListener('click', function (e) { e.stopPropagation(); go(i + 1); start(); });
    el.addEventListener('mouseenter', stop); el.addEventListener('mouseleave', start);
    // geser jari di ponsel
    let sx = 0; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); start(); } }, { passive: true });
    start();
  }
  function mockHtml(v) {
    const tags = [['120+ Template', '8%', '10%'], ['Kode Bersih', '70%', '14%'], ['Update Gratis', '12%', '80%']];
    const t = tags[(v || 0) % tags.length];
    return '<div class="mock"><div class="win"><div class="bar"><i></i><i></i><i></i></div><div class="row"></div><div class="row m"></div><div class="row s"></div><div class="blk"><b></b><b></b><b></b></div></div><span class="tag" style="left:' + t[1] + ';top:' + t[2] + '">' + t[0] + '</span></div>';
  }

  // ---------- render ----------
  function render(res) {
    if (!res || !res.success) return;
    DATA = res.data; PRODUK = DATA.produk || [];
    serverSkew = res.serverNow ? res.serverNow - Date.now() : 0;
    const K = DATA.konten || {}, S = DATA.pengaturan || {};

    document.title = (S.NAMA_BRAND || 'DigitazPro') + ' — ' + ((K.hero || {}).judul || 'Produk Digital');
    $('#brandName').textContent = S.NAMA_BRAND || 'DigitazPro'; $('#ftBrand').textContent = S.NAMA_BRAND || 'DigitazPro';
    $('#ftTeks').textContent = S.FOOTER_TEKS || ''; if (S.LINK_PRIVASI) $('#ftPrivasi').href = S.LINK_PRIVASI;

    // hero
    const h = K.hero || {}, hx = kv(h.isi);
    if (h.judul) { const parts = h.judul.split(' '), cut = Math.max(2, Math.ceil(parts.length * .55)); $('#hJudul').innerHTML = esc(parts.slice(0, cut).join(' ')) + ' <em>' + esc(parts.slice(cut).join(' ')) + '</em>'; }
    if (h.subjudul) $('#hSub').textContent = h.subjudul;
    if (hx.eyebrow) $('#hEyebrow').innerHTML = '<span class="mi" style="font-size:16px">bolt</span> ' + esc(hx.eyebrow);
    if (hx.cta) $('#hCta').firstChild.nodeValue = hx.cta + ' '; if (hx.cta2) $('#hCta2').textContent = hx.cta2;
    $('#hTrust').innerHTML = [['verified_user', hx.garansi], ['star', hx.rating], ['license', hx.lisensi]].filter(function (a) { return a[1]; }).map(function (a) { return '<span><span class="mi">' + a[0] + '</span> ' + esc(a[1]) + '</span>'; }).join('');
    const heroImgs = (S.HERO_IMAGES || []).filter(function (u) { return /^https?:/.test(u); });
    const prodImgs = [].concat.apply([], PRODUK.map(function (p) { return p.gambar; })).filter(Boolean);
    slideshow($('#heroSlides'), heroImgs.length ? heroImgs : prodImgs.slice(0, 5), { ms: 4200, nav: true, alt: 'Pratinjau produk', mock: 0 });
    slideshow($('#solSlides'), prodImgs.slice(0, 4).reverse(), { ms: 5000, alt: 'Isi paket', mock: 1 });

    // masalah
    const pr = K.problem || {};
    $('#pJudul').textContent = pr.judul || ''; $('#pSub').textContent = pr.subjudul || '';
    $('#pList').innerHTML = barisPipa(pr.isi).map(function (a, i) {
      return '<div class="card reveal d' + (i % 3) + '"><div class="ico red"><span class="mi">' + esc(a[2] || 'error') + '</span></div><h3>' + esc(a[0]) + '</h3><p>' + esc(a[1] || '') + '</p></div>';
    }).join('');

    // solusi
    const so = K.solution || {};
    $('#sJudul').textContent = so.judul || ''; $('#sSub').textContent = so.subjudul || '';
    $('#sList').innerHTML = barisPipa(so.isi).map(function (a) { return '<li><span class="mi">check_circle</span><div><b>' + esc(a[0]) + '</b><span>' + esc(a[1] || '') + '</span></div></li>'; }).join('');

    // fitur
    const fi = K.fitur || {};
    $('#fJudul').textContent = fi.judul || ''; $('#fSub').textContent = fi.subjudul || '';
    $('#fList').innerHTML = barisPipa(fi.isi).map(function (a, i) {
      return '<div class="card reveal d' + (i % 3) + '"><div class="ico"><span class="mi">' + esc(a[2] || 'star') + '</span></div><h3>' + esc(a[0]) + '</h3><p>' + esc(a[1] || '') + '</p></div>';
    }).join('');

    renderProduk(); renderTesti(DATA.testimoni || [], K.testimoni || {}); renderFaq(DATA.faq || [], K.faq || {});

    // penawaran
    const of = K.offer || {}, ox = kv(of.isi);
    $('#oJudul').textContent = of.judul || ''; $('#oSub').textContent = of.subjudul || '';
    $('#oGar').innerHTML = [['verified_user', ox.garansi], ['lock', ox.aman], ['mail', ox.kirim]].filter(function (a) { return a[1]; }).map(function (a) { return '<span><span class="mi">' + a[0] + '</span> ' + esc(a[1]) + '</span>'; }).join('');

    // WhatsApp mengambang
    const wa = U.wa62(S.WA_CS);
    if (wa) { $('#waFloat').href = 'https://api.whatsapp.com/send?phone=' + wa + '&text=' + encodeURIComponent('Halo, saya ingin bertanya tentang ' + (S.NAMA_BRAND || 'produk') + '.'); } else $('#waFloat').style.display = 'none';

    // promo tercepat berakhir
    const promos = PRODUK.filter(function (p) { return p.promoAktif && p.promoSampai; }).map(function (p) { return new Date(p.promoSampai).getTime(); }).filter(Boolean);
    countdownTo = promos.length ? Math.min.apply(null, promos) : 0;
    $('#ribbon').hidden = !countdownTo; $('#cd').style.display = countdownTo ? '' : 'none';
    tick();
    initReveal();
    updateSticky();
  }

  function diskonPersen(p) { return p.hargaNormal > 0 && p.promoAktif ? Math.round((1 - p.hargaDiskon / p.hargaNormal) * 100) : 0; }

  function renderProduk() {
    const g = $('#prodGrid');
    if (!PRODUK.length) { g.innerHTML = '<div class="empty">Produk belum tersedia.</div>'; return; }
    g.innerHTML = PRODUK.map(function (p, i) {
      const off = diskonPersen(p);
      return '<article class="pcard' + (i === 0 ? ' best' : '') + ' reveal" data-id="' + esc(p.id) + '"><div class="inner">' +
        '<div class="pimg" data-slide>' + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
        '<div class="pbody"><h3>' + esc(p.nama) + '</h3><p class="desc">' + esc(p.deskripsi) + '</p>' +
        '<div class="price"><span class="now">' + U.rp(p.harga) + '</span>' + (p.promoAktif ? '<span class="old">' + U.rp(p.hargaNormal) + '</span><span class="off">HEMAT ' + off + '%</span>' : '') + '</div>' +
        (p.bonus.length ? '<div><div class="bonus-t">🎁 Bonus eksklusif</div><ul class="bonus" style="margin-top:8px">' + p.bonus.map(function (b) { return '<li><span class="mi">redeem</span>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        (p.terjual ? '<div class="sold"><span class="mi">local_fire_department</span>' + p.terjual.toLocaleString('id-ID') + '+ terjual</div>' : '') +
        '<button class="btn ' + (p.stokHabis ? 'stokhabis' : 'btn-red shine glow') + ' btn-block btn-lg" data-beli="' + esc(p.id) + '"' + (p.stokHabis ? ' disabled' : '') + '>' + (p.stokHabis ? 'Stok Habis' : 'Beli Sekarang <span class="mi go">arrow_forward</span>') + '</button>' +
        '</div></div></article>';
    }).join('');
    $$('.pcard', g).forEach(function (card, i) {
      const p = PRODUK[i];
      slideshow($('[data-slide]', card), p.gambar, { ms: 3200 + i * 500, alt: p.nama, mock: i });
      // badge harus di atas slide: dipindahkan ulang setelah render slideshow
      if (p.badge) $('[data-slide]', card).insertAdjacentHTML('beforeend', '<span class="badge">' + esc(p.badge) + '</span>');
      const old = $$('.badge', card); if (old.length > 1) old[0].remove();
    });
    $$('[data-beli]', g).forEach(function (b) { b.addEventListener('click', function () { openOrder(b.getAttribute('data-beli')); }); });
  }

  // ---------- testimoni ----------
  let flipTimer = null;
  function renderTesti(list, kon) {
    $('#tJudul').textContent = kon.judul || 'Apa Kata Pembeli Kami'; $('#tSub').textContent = kon.subjudul || '';
    const w = $('#testiWrap');
    if (!list.length) { w.innerHTML = '<div class="empty">Belum ada testimoni.</div>'; return; }
    w.innerHTML = list.map(function (t, i) {
      const ini = esc((t.nama || '?').trim().charAt(0).toUpperCase()), stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
      const av = t.avatar ? '<img src="' + esc(t.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : ini;
      return '<div class="flip reveal" tabindex="0" role="button" aria-label="Testimoni ' + esc(t.nama) + ', klik untuk tampilan lengkap" data-i="' + i + '"><span class="glowspot"></span><div class="flip-in">' +
        '<div class="face front"><div class="stars" aria-label="Rating ' + t.rating + ' dari 5">' + stars + '</div><p class="quote">“' + esc(t.ulasan) + '”</p><div class="who"><div class="av">' + av + '</div><div><b>' + esc(t.nama) + '</b><small>' + esc(t.jabatan) + '</small></div></div></div>' +
        '<div class="face back"><div class="av">' + av + '</div><b style="font-size:18px">' + esc(t.nama) + '</b><small style="opacity:.85">' + esc(t.jabatan) + '</small><div class="stars">' + stars + '</div><span class="more"><span class="mi" style="font-size:16px">open_in_full</span> Klik untuk baca lengkap</span></div>' +
        '</div></div>';
    }).join('');
    $$('.flip', w).forEach(function (el) {
      const spot = $('.glowspot', el);
      el.addEventListener('mousemove', function (e) { const r = el.getBoundingClientRect(); spot.style.left = (e.clientX - r.left) + 'px'; spot.style.top = (e.clientY - r.top) + 'px'; });
      el.addEventListener('mouseenter', function () { el.dataset.hover = '1'; });
      el.addEventListener('mouseleave', function () { delete el.dataset.hover; });
      const open = function () { openTesti(list[+el.dataset.i]); };
      el.addEventListener('click', open); el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    // flip otomatis bergantian
    clearInterval(flipTimer);
    if (!ssReduced) {
      let n = 0; const cards = $$('.flip', w);
      flipTimer = setInterval(function () {
        if (document.hidden || !cards.length) return;
        const vis = cards.filter(function (c) { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && !c.dataset.hover; });
        cards.forEach(function (c) { if (!c.dataset.hover) c.classList.remove('flipped'); });
        if (vis.length) vis[n++ % vis.length].classList.add('flipped');
      }, 3200);
    }
  }
  function openTesti(t) {
    const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating), ini = esc((t.nama || '?').charAt(0).toUpperCase());
    $('#testiBody').innerHTML = '<div class="who" style="margin:0 0 6px"><div class="av" style="width:56px;height:56px;font-size:22px">' + (t.avatar ? '<img src="' + esc(t.avatar) + '" alt="" referrerpolicy="no-referrer">' : ini) + '</div><div><b style="font-size:18px">' + esc(t.nama) + '</b><small>' + esc(t.jabatan) + '</small></div></div><div class="stars">' + stars + '</div><p class="quote">“' + esc(t.ulasan) + '”</p>' + (t.screenshot ? '<img class="ss" src="' + esc(t.screenshot) + '" alt="Tangkapan layar ulasan" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<button class="btn btn-red btn-block shine" style="margin-top:16px" data-cta2>Saya Juga Mau</button>';
    openModal('testiModal');
    $('[data-cta2]', $('#testiBody')).addEventListener('click', function () { closeModal('testiModal'); openOrder(); });
  }

  function renderFaq(list, kon) {
    $('#qJudul').textContent = kon.judul || 'Pertanyaan yang Sering Diajukan'; $('#qSub').textContent = kon.subjudul || '';
    $('#faqList').innerHTML = list.length ? list.map(function (f) { return '<details><summary>' + esc(f.q) + '<span class="mi">expand_more</span></summary><div class="ans">' + esc(f.a) + '</div></details>'; }).join('') : '<div class="empty">Belum ada FAQ.</div>';
  }

  // ---------- countdown ----------
  function tick() {
    if (!countdownTo) return;
    let s = Math.max(0, Math.floor((countdownTo - (Date.now() + serverSkew)) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sc = s % 60;
    $('#rbH').textContent = pad(d * 24 + h); $('#rbM').textContent = pad(m); $('#rbS').textContent = pad(sc);
    $('#cdD').textContent = pad(d); $('#cdH').textContent = pad(h); $('#cdM').textContent = pad(m); $('#cdS').textContent = pad(sc);
    if (s === 0) { countdownTo = 0; $('#ribbon').hidden = true; load(true); }
  }
  setInterval(tick, 1000);

  // ---------- reveal & sticky ----------
  let io = null;
  function initReveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(function (e) { e.classList.add('in'); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .12 });
    $$('.reveal').forEach(function (e) { io.observe(e); });
  }
  function updateSticky() {
    const p = PRODUK[0]; if (!p) return;
    $('#stNow').textContent = U.rp(p.harga); $('#stOld').textContent = p.promoAktif ? U.rp(p.hargaNormal) : ''; $('#stNama').textContent = p.nama;
  }
  addEventListener('scroll', function () { $('#sticky').classList.toggle('show', scrollY > 520); }, { passive: true });

  // ---------- modal ----------
  function openModal(id) { const m = document.getElementById(id); m.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
  $$('.overlay').forEach(function (o) {
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-close]')) closeModal(o.id); });
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.overlay.open').forEach(function (o) { closeModal(o.id); }); });

  function openOrder(id) {
    if (!PRODUK.length) { U.toast('Produk belum siap, coba sebentar lagi.', 'err'); return; }
    const sel = $('#fProduk');
    sel.innerHTML = PRODUK.filter(function (p) { return !p.stokHabis; }).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nama) + ' — ' + U.rp(p.harga) + '</option>'; }).join('');
    sel.value = id || PRODUK[0].id; if (!sel.value && sel.options.length) sel.selectedIndex = 0;
    syncSum();
    $$('.field.err').forEach(function (f) { f.classList.remove('err'); });
    openModal('checkoutModal'); setTimeout(function () { $('#fNama').focus(); }, 120);
    API.siap() && API.post('track', { jenis: 'cta' }, { pub: true }).catch(function () {});
  }
  function syncSum() { selected = PRODUK.filter(function (p) { return p.id === $('#fProduk').value; })[0]; if (selected) { $('#sumNama').textContent = selected.nama; $('#sumHarga').textContent = U.rp(selected.harga); } }
  $('#fProduk').addEventListener('change', syncSum);
  $$('[data-cta]').forEach(function (b) { b.addEventListener('click', function () { openOrder(PRODUK[0] && PRODUK[0].id); }); });

  function setErr(inputId, bad) { const f = document.getElementById(inputId).closest('.field'); f.classList.toggle('err', bad); return bad; }
  $('#orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const nama = $('#fNama').value.trim(), email = $('#fEmail').value.trim(), wa = $('#fWa').value.replace(/[^\d+]/g, '');
    let bad = false;
    bad = setErr('fNama', nama.length < 3) || bad;
    bad = setErr('fEmail', !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || bad;
    bad = setErr('fWa', !/^(\+?62|0)8\d{8,12}$/.test(wa)) || bad;
    if (bad || !selected) return;
    const btn = $('#btnOrder'), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Memproses…';
    API.post('order.create', { produkId: selected.id, nama: nama, email: email, whatsapp: wa, metode: (document.querySelector('input[name=metode]:checked') || {}).value, website: $('#fWeb').value }, { pub: true })
      .then(function (r) {
        if (!r.success) { U.toast(r.message || 'Gagal membuat pesanan.', 'err'); btn.disabled = false; btn.innerHTML = old; return; }
        try { sessionStorage.setItem('dp_order', JSON.stringify(r.data)); } catch (x) {}
        location.href = 'konfirmasi.html?k=' + encodeURIComponent(r.data.kode);
      }).catch(function (err) { U.toast('Koneksi bermasalah. Coba lagi. ' + (err.message || ''), 'err'); btn.disabled = false; btn.innerHTML = old; });
  });

  // ---------- muat data (SWR) ----------
  function load(force) {
    if (!API.siap()) {
      $('#prodGrid').innerHTML = '<div class="empty" style="grid-column:1/-1">⚠️ Backend belum terhubung.<br>Isi <b>API_URL</b> di <code>js/config.js</code> dengan URL Web App Anda.</div>';
      $('#testiWrap').innerHTML = ''; $('#pList').innerHTML = ''; slideshow($('#heroSlides'), [], { mock: 0 }); return;
    }
    let got = false;
    try { const c = JSON.parse(localStorage.getItem('dp_pub') || 'null'); if (c && !force) { render(c); got = true; } } catch (e) {}
    API.get({ action: 'publicData' }).then(function (j) {
      if (j && j.success) { try { localStorage.setItem('dp_pub', JSON.stringify(j)); } catch (e) {} render(j); API.post('track', { jenis: 'view' }, { pub: true }).catch(function () {}); }
      else if (!got) U.toast((j && j.message) || 'Gagal memuat data.', 'err');
    }).catch(function () { if (!got) { $('#prodGrid').innerHTML = '<div class="empty" style="grid-column:1/-1">Gagal memuat data. <button class="btn btn-ghost" onclick="location.reload()">Coba lagi</button></div>'; } });
  }
  load();
})();
