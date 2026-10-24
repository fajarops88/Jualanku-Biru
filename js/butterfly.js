/* butterfly.js — satu kupu-kupu realistis (kanvas) yang selalu mengikuti kursor / sentuhan.
   Fisika pegas + terbang meliuk, sayap mengepak, badan menghadap arah gerak, diam hinggap pelan-pelan. */
(function () {
  'use strict';
  const cv = document.getElementById('butterfly');
  if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if (cv) cv.style.display = 'none'; return; }
  const ctx = cv.getContext('2d'), S = 168, HALF = S / 2;
  let tx = innerWidth * 0.7, ty = innerHeight * 0.35;      // target (kursor)
  let x = -80, y = innerHeight * 0.3, vx = 0, vy = 0;       // posisi & kecepatan
  let ang = 0, flap = 0, t0 = performance.now(), lastMove = performance.now();

  function pointer(e) { const p = e.touches ? e.touches[0] : e; if (!p) return; tx = p.clientX; ty = p.clientY; lastMove = performance.now(); }
  addEventListener('mousemove', pointer, { passive: true });
  addEventListener('touchstart', pointer, { passive: true });
  addEventListener('touchmove', pointer, { passive: true });
  document.addEventListener('visibilitychange', function () { t0 = performance.now(); });

  // sayap: bentuk monarch (oranye, urat hitam, bintik putih)
  function wing(side, spread, hindScale) {
    ctx.save(); ctx.scale(side * spread, 1);
    // sayap depan
    const gf = ctx.createRadialGradient(10, -22, 4, 22, -22, 62);
    gf.addColorStop(0, '#FFB347'); gf.addColorStop(.55, '#F5761A'); gf.addColorStop(1, '#C2410C');
    ctx.beginPath(); ctx.moveTo(3, -4);
    ctx.bezierCurveTo(14, -50, 52, -68, 74, -52);
    ctx.bezierCurveTo(82, -38, 70, -14, 44, -2);
    ctx.bezierCurveTo(28, 2, 12, 2, 3, -4); ctx.closePath();
    ctx.fillStyle = gf; ctx.fill();
    ctx.lineWidth = 3.4; ctx.strokeStyle = '#1b0f08'; ctx.stroke();
    // urat
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(20,10,5,.85)';
    [[8, -4, 40, -48], [8, -4, 56, -34], [8, -4, 62, -18], [8, -4, 38, -8]].forEach(function (v) {
      ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.quadraticCurveTo((v[0] + v[2]) / 2 + 2, (v[1] + v[3]) / 2 - 8, v[2], v[3]); ctx.stroke();
    });
    // bintik putih di tepi
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    [[52, -60, 2.6], [64, -54, 2.4], [72, -42, 2.3], [70, -26, 2.2], [60, -14, 2], [44, -6, 1.8]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, 6.283); ctx.fill(); });
    // sayap belakang
    ctx.save(); ctx.scale(1, hindScale);
    const gh = ctx.createRadialGradient(12, 14, 3, 20, 20, 44);
    gh.addColorStop(0, '#FFB347'); gh.addColorStop(.6, '#F0640F'); gh.addColorStop(1, '#B93A0A');
    ctx.beginPath(); ctx.moveTo(3, 2);
    ctx.bezierCurveTo(34, 0, 58, 12, 54, 34);
    ctx.bezierCurveTo(48, 54, 20, 52, 6, 22); ctx.closePath();
    ctx.fillStyle = gh; ctx.fill(); ctx.lineWidth = 3.2; ctx.strokeStyle = '#1b0f08'; ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,5,.8)';
    [[8, 4, 44, 14], [8, 6, 46, 32], [8, 8, 30, 46]].forEach(function (v) { ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.quadraticCurveTo((v[0] + v[2]) / 2, (v[1] + v[3]) / 2 + 3, v[2], v[3]); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.9)'; [[46, 42, 2.2], [36, 48, 2], [52, 28, 2]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, 6.283); ctx.fill(); });
    ctx.restore(); ctx.restore();
  }
  function body() {
    ctx.save();
    const g = ctx.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#0d0705'); g.addColorStop(.5, '#3a2a22'); g.addColorStop(1, '#0d0705');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 6, 4.4, 30, 0, 0, 6.283); ctx.fill();   // badan
    ctx.beginPath(); ctx.ellipse(0, -26, 6, 6.4, 0, 0, 6.283); ctx.fill();                      // kepala
    ctx.fillStyle = 'rgba(255,255,255,.8)'; [[-2.6, -12], [2.6, -4], [-2.6, 4], [2.6, 12]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 1, 0, 6.283); ctx.fill(); });
    ctx.strokeStyle = '#0d0705'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';                    // antena
    ctx.beginPath(); ctx.moveTo(-2, -31); ctx.quadraticCurveTo(-8, -48, -17, -50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -31); ctx.quadraticCurveTo(8, -48, 17, -50); ctx.stroke();
    ctx.fillStyle = '#0d0705'; ctx.beginPath(); ctx.arc(-17, -50, 1.8, 0, 6.283); ctx.arc(17, -50, 1.8, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const idle = now - lastMove > 1800;
    // target melayang: bila kursor diam, kupu-kupu mengitari pelan
    const orbit = idle ? 38 : 22, tt = now / 1000;
    const gx = tx + Math.cos(tt * 1.7) * orbit + 28, gy = ty + Math.sin(tt * 2.3) * (orbit * .7) - 30;
    // pegas + redaman
    const k = idle ? 22 : 34, c = idle ? 7.5 : 9.5;
    vx += ((gx - x) * k - vx * c) * dt; vy += ((gy - y) * k - vy * c) * dt;
    // gerak meliuk khas kupu-kupu
    const wob = Math.sin(tt * 7) * 26; vy += wob * dt * 8;
    x += vx * dt; y += vy * dt;
    const sp = Math.hypot(vx, vy);
    if (sp > 20) { const want = Math.atan2(vy, vx) + Math.PI / 2; let d = want - ang; d = Math.atan2(Math.sin(d), Math.cos(d)); ang += d * Math.min(1, dt * 6); }
    // kepakan: cepat saat melaju, lambat saat melayang
    const rate = 9 + Math.min(sp / 40, 10);
    flap += dt * rate;
    const spread = 0.18 + 0.82 * Math.abs(Math.cos(flap)), hind = 0.82 + 0.18 * Math.abs(Math.cos(flap + .6));

    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.translate(HALF, HALF); ctx.scale(1.0, 1.0);
    wing(-1, spread, hind); wing(1, spread, hind); body();
    ctx.restore();
    const lean = Math.max(-0.35, Math.min(0.35, vx / 2200));
    cv.style.transform = 'translate3d(' + (x - HALF / 2) + 'px,' + (y - HALF / 2) + 'px,0) rotate(' + (ang * 0.55 + lean) + 'rad)';
    requestAnimationFrame(frame);
  }
  cv.style.transformOrigin = '50% 50%';
  requestAnimationFrame(frame);
})();
