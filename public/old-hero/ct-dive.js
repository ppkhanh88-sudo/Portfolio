/* Contact block "dive" (after taxistudio.com): the top edge of the black box IS the water surface.
   The character (same sprites / outfit as the hero) runs along that edge from the left to the right corner,
   jumps in, the edge ripples as a damped wave spreading from the entry point, a few drops fly up, she sinks.
   Loops while the block is on screen. Canvas sits across the edge: the part below the edge is painted the box
   colour so the wavy fill joins the box seamlessly. */
(function () {
  'use strict';
  if (window.CTDive) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const INK = '#141318', ABOVE = 104, BELOW = 90, SCALE = 2;          // canvas extends ABOVE px over the edge and BELOW px into the box
  const PERIOD = 9.5, T_RUN = 3.0, T_JUMP = 0.62, T_SINK = 0.9;         // seconds
  function mount(cv) {
    if (cv._ct) return; cv._ct = true;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    let W = 0, H = ABOVE + BELOW, base = ABOVE, n = 0, h = [], v = [], drops = [], t0 = performance.now(), last = t0, sprites = null, outfitKey = '', raf = 0, alive = true;
    function size() {
      const box = cv.parentElement, w = Math.max(1, box.clientWidth), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === W && cv.width === Math.round(w * dpr)) return;
      W = w; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false;
      n = Math.max(16, Math.round(W / 4)); h = new Array(n).fill(0); v = new Array(n).fill(0);
    }
    function girl() {
      const o = (window.KP && window.KP.current) || {}, key = JSON.stringify(o);
      if (sprites && key === outfitKey) return sprites;
      if (!window.PixelHero || !window.PixelHero.girl) return null;
      outfitKey = key; sprites = window.PixelHero.girl(o); return sprites;
    }
    function impulse(x, power, width) {
      const i = Math.max(1, Math.min(n - 2, Math.round(x / W * (n - 1)))), R = width || 9;
      for (let k = -R; k <= R; k++) { const j = i + k; if (j > 0 && j < n - 1) v[j] += power * 0.5 * (1 + Math.cos(k / (R + 1) * Math.PI)); }
    }
    const plumes = [];
    function splash(x) {
      // 1) the body punches a cavity into the surface (down), the rim is thrown up around it
      impulse(x, 46, 9); impulse(x - 40, -22, 6); impulse(x + 40, -22, 6);
      // 2) a crown of water: many drops, varied size, a few big slow ones, the rest fine spray
      for (let k = 0; k < 34; k++) {
        const big = k < 8, a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5, sp = big ? 180 + Math.random() * 220 : 260 + Math.random() * 360;
        drops.push({ x: x + (Math.random() - 0.5) * 36, y: base - 4, vx: Math.cos(a) * sp * (0.35 + Math.random() * 0.4), vy: Math.sin(a) * sp, s: big ? 4 + Math.random() * 5 : 1.5 + Math.random() * 2.5, life: 0.9 + Math.random() * 0.6, px: 0, py: 0 });
      }
      // 3) a column of water rising from the entry point, then the Worthington jet shortly after the cavity closes
      plumes.push({ x, t: 0, dur: 0.55, hmax: 72, w: 28 });
      plumes.push({ x, t: -0.42, dur: 0.6, hmax: 118, w: 13 });
      cv._jet = { x, at: 0.42 };
    }
    function stepWave(dt) {
      // damped 1-D wave equation on the edge: tension pulls toward the neighbours, a weak spring back to flat, damping over time
      const sub = 5, k = 0.36, spring = 0.004, damp = 0.9915;   // a rolling swell: higher amplitude, still dies out within roughly half the width
      for (let s = 0; s < sub; s++) {
        for (let i = 1; i < n - 1; i++) v[i] += (k * (h[i - 1] + h[i + 1] - 2 * h[i]) - spring * h[i]);
        for (let i = 1; i < n - 1; i++) { v[i] *= damp; h[i] += v[i] * dt * 60 / sub; }
        h[0] = h[1]; h[n - 1] = h[n - 2];
      }
    }
    function frame(now) {
      raf = 0; if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      size();
      const r = cv.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      if (!visible) { t0 = now; raf = requestAnimationFrame(frame); return; }   // idle off-screen: restart the run when it comes back
      const t = ((now - t0) / 1000) % PERIOD;
      const S = girl();
      stepWave(dt);
      g.clearRect(0, 0, W, H);
      // character (drawn first, so the water fill paints over her once she is under the surface)
      const x0 = 24, x1 = W - 120, gw = 30 * SCALE, gh = 40 * SCALE;
      let gx = null, gy = base, frameImg = null, headImg = null, sink = 0;
      if (S && !reduce) {
        if (t < T_RUN) { const p = t / T_RUN; gx = x0 + (x1 - x0) * p; const f = Math.floor(t * 9) % 4; frameImg = S.v2 ? 1 : S.stand.walk[f]; headImg = S.v2 ? 1 : S.head[Math.floor(t * 2) % 7 === 0 ? 1 : 0]; gy = base + (f % 2 ? -SCALE : 0); }
        else if (t < T_RUN + T_JUMP) { const p = (t - T_RUN) / T_JUMP; gx = x1 + 56 * p; gy = base - 70 * Math.sin(p * Math.PI) + (gh + 10) * p * p; frameImg = S.v2 ? 1 : S.stand.walk[1]; headImg = S.v2 ? 1 : S.head[0]; if (!cv._hit && p > 0.78) { cv._hit = true; splash(gx + gw / 2); } }
        else if (t < T_RUN + T_JUMP + T_SINK) { const p = (t - T_RUN - T_JUMP) / T_SINK; gx = x1 + 56; gy = base + gh + 10 + 60 * p; frameImg = S.v2 ? 1 : S.stand.idle; headImg = S.v2 ? 1 : S.head[0]; sink = p; }
        else cv._hit = false;
        if (gx != null && frameImg) {
          g.save(); g.beginPath(); g.rect(0, 0, W, base); g.clip();   // she vanishes at the surface line (the splash cavity shows the box behind, never her body)
          g.globalAlpha = 1 - sink * 0.6;
          if (S.v2) {                                            // 48x48 chibi: one image per frame, feet on row 46
            const V = S.v2, f = Math.floor(t * 9) % 4;
            const img = t < T_RUN ? V.walk.right[[0, 1, 2, 1][f]] : t < T_RUN + T_JUMP ? V.walk.right[2] : V.idle.right;
            g.drawImage(img, Math.round(gx - 9 * SCALE), Math.round(gy - 47 * SCALE), 48 * SCALE, 48 * SCALE);
          } else {
          const top = gy - gh;                                   // feet on the surface line
          g.drawImage(frameImg, Math.round(gx), Math.round(top), gw, gh);
          g.drawImage(headImg, Math.round(gx + SCALE), Math.round(top - 10 * SCALE + S.ch * SCALE), 24 * SCALE, 22 * SCALE);
          }
          g.restore();
        }
      }
      // the water: box colour from the wavy edge down to the bottom of the canvas (joins the box below)
      g.fillStyle = INK; g.beginPath(); g.moveTo(0, H);
      // smooth the sampled surface (3-tap blur) and draw it with quadratic curves through the midpoints, so crests are round, not pointy
      const sm = h.map((v, i) => i === 0 || i === n - 1 ? v : (h[i - 1] + 2 * v + h[i + 1]) / 4);
      const px = (i) => i / (n - 1) * W;
      g.lineTo(0, base + sm[0]);
      for (let i = 1; i < n - 1; i++) { const xm = (px(i) + px(i + 1)) / 2, ym = base + (sm[i] + sm[i + 1]) / 2; g.quadraticCurveTo(px(i), base + sm[i], xm, ym); }
      g.lineTo(W, base + sm[n - 1]);
      g.lineTo(W, H); g.closePath(); g.fill();
      // the jet: when the cavity closes a thin column shoots up and throws a second, smaller set of drops
      if (cv._jet) { cv._jet.at -= dt; if (cv._jet.at <= 0) { impulse(cv._jet.x, 26, 5); for (let k = 0; k < 10; k++) drops.push({ x: cv._jet.x + (Math.random() - 0.5) * 10, y: base - 6, vx: (Math.random() - 0.5) * 90, vy: -(260 + Math.random() * 260), s: 2 + Math.random() * 3, life: 1, px: 0, py: 0 }); cv._jet = null; } }
      // plumes / jet columns: a tapered column of water joined to the surface, rising then collapsing
      for (let i = plumes.length - 1; i >= 0; i--) {
        const pl = plumes[i]; pl.t += dt; if (pl.t < 0) continue; if (pl.t > pl.dur) { plumes.splice(i, 1); continue; }
        const p = pl.t / pl.dur, hh = pl.hmax * Math.sin(p * Math.PI) * (1 - 0.3 * p), w = pl.w * (1 - 0.55 * p) * (0.6 + 0.4 * Math.sin(p * Math.PI));
        const yb = base + 6, yt = yb - hh;
        g.beginPath(); g.moveTo(pl.x - w, yb);
        g.bezierCurveTo(pl.x - w * 0.9, yb - hh * 0.55, pl.x - w * 0.28, yt + 4, pl.x, yt);
        g.bezierCurveTo(pl.x + w * 0.28, yt + 4, pl.x + w * 0.9, yb - hh * 0.55, pl.x + w, yb);
        g.closePath(); g.fill();
      }
      // drops: round, with a short motion trail so fast ones read as streaks
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.life -= dt; d.px = d.x; d.py = d.y; d.vy += 1100 * dt; d.vx *= (1 - 0.6 * dt); d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.life <= 0 || d.y > base + 24) { if (d.y > base && d.s >= 4) impulse(d.x, 6, 3); drops.splice(i, 1); continue; }
        g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = d.s; g.beginPath(); g.moveTo(d.px, d.py); g.lineTo(d.x, d.y); g.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    const ro = window.ResizeObserver ? new ResizeObserver(() => { size(); }) : null; if (ro) ro.observe(cv.parentElement);
    raf = requestAnimationFrame(frame);
    cv._ctDestroy = () => { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
  }
  function scan() { document.querySelectorAll('canvas.ct-dive').forEach(mount); }
  const mo = new MutationObserver(scan);
  const boot = () => { scan(); mo.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.CTDive = { mount };
})();
