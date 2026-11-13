/* Pixel Hero engine — shared by every hero option on this canvas.
   The scene is drawn on a low-res canvas and scaled up by a whole number,
   so every pixel stays square and crisp. Sprites are built from shapes,
   then auto-shaded and auto-outlined (placeholder art until Khanh redraws it). */
(function () {
  'use strict';
  if (window.PixelHero) return;

  /* ---------- utils ---------- */
  function hx(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { const r = c[0] | 0, g = c[1] | 0, b = c[2] | 0; return a == null ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, a).toFixed(3) + ')'; }
  function RNG(seed) { let s = (Math.floor(seed) * 2654435761) >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /* ---------- sprite builder ---------- */
  function Spr(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  Spr.prototype.px = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; return this; };
  Spr.prototype.at = function (x, y) { x = Math.round(x); y = Math.round(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.d[y * this.w + x]; };
  Spr.prototype.rect = function (x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; };
  Spr.prototype.ell = function (cx, cy, rx, ry, c) {
    if (rx <= 0.4 || ry <= 0.4) return this;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) this.px(x, y, c);
    }
    return this;
  };
  // bottom edge of a colour region gets its shade, top edge its highlight
  Spr.prototype.shade = function (map) {
    const src = this.d.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = src[y * w + x]; if (!c) continue; const m = map[c]; if (!m) continue;
      const below = y + 1 < h ? src[(y + 1) * w + x] : null, above = y > 0 ? src[(y - 1) * w + x] : null;
      if (m[0] && below !== c) this.d[y * w + x] = m[0]; else if (m[1] && above !== c) this.d[y * w + x] = m[1];
    }
    return this;
  };
  Spr.prototype.shift = function (dy) { const d = new Array(this.w * this.h).fill(null); for (let y = 0; y < this.h - dy; y++) for (let x = 0; x < this.w; x++) d[(y + dy) * this.w + x] = this.d[y * this.w + x]; this.d = d; return this; };
  Spr.prototype.outline = function (c) {
    const src = this.d.slice(), w = this.w, h = this.h;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !!src[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (src[y * w + x]) continue; if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) this.d[y * w + x] = c; }
    return this;
  };
  Spr.prototype.canvas = function () {
    const c = mk(this.w, this.h), g = c.getContext('2d'), m = new Uint8Array(this.d.length);
    for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; if (!v) continue; m[i] = 1; g.fillStyle = v; g.fillRect(i % this.w, (i / this.w) | 0, 1, 1); }
    c._m = m; return c;
  };
  function flipC(src) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }

  /* ---------- palette ---------- */
  const P = {
    K: '#2a2238',
    hair: '#4a2c2a', hairD: '#301c1c', hairL: '#73453a',
    skin: '#f7d0b0', skinD: '#e2a688', blush: '#f2958a',
    ph: '#ff8fa3', phD: '#d9566f', phL: '#ffd0d8',
    sw: '#f3c34f', swD: '#cf962c', swL: '#ffe18e',
    pant: '#3f4f80', pantD: '#2c375e', shoe: '#6b4a3a',
    chair: '#5d6178', chairD: '#41445a', chairL: '#7e839c',
    wood: '#b77d4f', woodD: '#8a5636', woodL: '#d9a06c',
    metal: '#c8ccd8', metalD: '#8d93a8', mug: '#f1ece4', lamp: '#3f6fb0', pot: '#d27a4a', potL: '#e8945e',
    fur: '#e8913f', furD: '#b8642a', furL: '#f7b96f', wh: '#fff4e4', whD: '#e6d2bb', earIn: '#f2a6a0', tongue: '#f26a7a',
    bun: '#f6f7fb', bunD: '#c9d0e6', bunEye: '#e04a5a', bunEar: '#f4a6b8'
  };
  const TC = ['#9ad85e', '#62b84a', '#3f9440', '#2a7036'], TOUT = '#1b4d2e';
  const FL = [['#ffffff', '#ffd23f'], ['#ffd23f', '#ff9a3c'], ['#ff8fb1', '#fff3a0'], ['#ff5a4f', '#ffd23f'], ['#8fb8ff', '#ffffff']];
  const BLADE = ['#2f7a34', '#3d8f3a', '#245f2c', '#56a83f'];

  // [hour, sky top, sky mid, sky bottom, world tint]
  const KF_NORMAL = [
    [0, '#0c1233', '#18215a', '#283a78', '#4a589e'],
    [4.5, '#111a46', '#1f2a66', '#33427f', '#5260a6'],
    [6, '#3b3f8e', '#b06fa8', '#ffb07a', '#d3a9c2'],
    [7.5, '#3f7fd6', '#86c2ef', '#ffd9a8', '#fff0dd'],
    [10, '#2a6fd6', '#5faaf0', '#aee0ff', '#ffffff'],
    [14, '#2468d0', '#56a3ee', '#a6dcff', '#ffffff'],
    [16.5, '#2f6fc0', '#6fa8df', '#ffc98a', '#ffe6c8'],
    [18.2, '#2d3a8a', '#8a5aa8', '#ff8a5c', '#ffb894'],
    [19.6, '#1f2566', '#4a3a8a', '#8a4a8e', '#8a80bc'],
    [21, '#0e1640', '#1c2860', '#2b3b7a', '#5462a6'],
    [24, '#0c1233', '#18215a', '#283a78', '#4a589e']
  ];
  const KF_VIVID = [
    [0, '#141a6a', '#2a2a8a', '#3a3aa0', '#5a5ab8'],
    [4.5, '#1c2280', '#2e2e96', '#4040a8', '#6464bc'],
    [6, '#3f4fc8', '#a05ad0', '#ff9a6a', '#d0a0d0'],
    [7.5, '#4a8cf0', '#9ad0ff', '#ffe2a0', '#fff0d8'],
    [10, '#2f7ff0', '#5fb6ff', '#a8e6ff', '#ffffff'],
    [14, '#2a78ee', '#58b0ff', '#a0e2ff', '#ffffff'],
    [16.5, '#3d6fe0', '#9a7ae0', '#ffc27a', '#ffe6c0'],
    [18.2, '#3a40c0', '#a040c0', '#ff6a3a', '#ffb080'],
    [19.6, '#2a2a9a', '#6a3ab0', '#c04a8a', '#9080d0'],
    [21, '#1a1f78', '#2e2a8e', '#3d3aa0', '#6a6ac0'],
    [24, '#141a6a', '#2a2a8a', '#3a3aa0', '#5a5ab8']
  ];
  function parseKF(kf) { return kf.map(r => [r[0], hx(r[1]), hx(r[2]), hx(r[3]), hx(r[4])]); }
  const KFN = parseKF(KF_NORMAL), KFV = parseKF(KF_VIVID);
  function darkness(h) {
    if (h >= 7 && h <= 17.5) return 0;
    if (h > 17.5 && h < 20.5) return smooth((h - 17.5) / 3);
    if (h >= 20.5 || h < 4.5) return 1;
    return 1 - smooth((h - 4.5) / 2.5);
  }
  function timeName(h) { return h >= 5 && h < 10.5 ? 'morning' : h >= 10.5 && h < 14.5 ? 'noon' : h >= 14.5 && h < 19 ? 'afternoon' : 'night'; }
  const PRESET = { morning: 7.5, noon: 12.5, afternoon: 16.8, night: 21.5 };

  /* ---------- sprites ---------- */
  // outfit of the character (headphones stay pink): hair 'down' | 'pony' | 'bun', dress or sweater + pants, shoes, optional bow
  function tone(h, f) { const c = hx(h), m = (v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); return '#' + c.map((v) => m(v).toString(16).padStart(2, '0')).join(''); }
  // body 'chibi' (legs 6 rows shorter, head lower) | 'normal'; face 'grin' (teeth) | 'smile'; eyes 'dots' | 'happy' (^ ^)
  const DEF_OUT = { hair: 'down', hairC: P.hair, dress: false, top: P.sw, bottom: P.pant, shoe: P.shoe, bow: null, body: 'chibi', face: 'grin', eyes: 'dots' };
  function outfit(o) {
    o = Object.assign({}, DEF_OUT, o || {});
    const ok = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
    const H = ok(o.hairC) ? o.hairC : P.hair, T = ok(o.top) ? o.top : P.sw, B = ok(o.bottom) ? o.bottom : P.pant, S = ok(o.shoe) ? o.shoe : P.shoe, W = ok(o.bow) ? o.bow : null;
    return { hair: ['down', 'pony', 'bun'].indexOf(o.hair) >= 0 ? o.hair : 'down', H, HD: H === P.hair ? P.hairD : tone(H, -0.35), HL: H === P.hair ? P.hairL : tone(H, 0.25),
      dress: !!o.dress, T, TD: T === P.sw ? P.swD : tone(T, -0.3), TL: T === P.sw ? P.swL : tone(T, 0.3), B, BD: B === P.pant ? P.pantD : tone(B, -0.3),
      S, SD: S === P.shoe ? '#4a3226' : tone(S, -0.3), bow: W, bowD: W ? tone(W, -0.3) : null,
      ch: o.body === 'normal' ? 0 : 6, face: o.face === 'smile' ? 'smile' : 'grin', eyes: o.eyes === 'happy' ? 'happy' : 'dots', v2: o.v2 || null };
  }
  // a 5x3 bow drawn on top of the finished head (after its outline) so it always reads
  function bow(s, x, y, C) {
    if (!C.bow) return;
    for (let i = -3; i <= 3; i++) { s.px(x + i, y - 1, P.K); s.px(x + i, y + 2, P.K); } s.px(x - 3, y, P.K); s.px(x - 3, y + 1, P.K); s.px(x + 3, y, P.K); s.px(x + 3, y + 1, P.K);
    s.rect(x - 2, y, 2, 2, C.bow); s.rect(x + 1, y, 2, 2, C.bow); s.px(x - 2, y + 1, C.bowD); s.px(x + 2, y + 1, C.bowD); s.px(x, y, C.bowD); s.px(x, y + 1, C.bowD);
  }
  function girlHead(blink, C) {
    const s = new Spr(24, 22);
    if (C.hair === 'down') s.ell(7, 13, 4.5, 6, C.H);
    s.ell(11, 10, 7.5, 7.5, C.H);
    s.ell(14, 12, 5, 5.5, P.skin);
    s.ell(11, 6, 7, 4, C.H);
    s.px(18, 8, C.H); s.px(19, 9, C.H);
    s.px(20, 13, P.skin);
    if (C.hair === 'pony') { s.ell(4.5, 8, 2.5, 2.5, C.H); s.rect(3, 10, 3, 7, C.H); s.px(2, 16, C.H); s.px(2, 17, C.H); }
    if (C.hair === 'bun') s.ell(5, 5, 3, 3, C.H);
    s.shade({ [C.H]: [C.HD, C.HL], [P.skin]: [P.skinD, null] });
    if (blink) { s.px(17, 13, P.K); s.px(18, 13, P.K); } else { s.px(17, 12, P.K); s.px(17, 13, P.K); }
    s.px(17, 15, P.blush); s.px(18, 15, P.blush); s.px(19, 16, P.skinD);
    for (let y = 1; y <= 10; y++) { const x = Math.round(9 + (10 - y) * 0.2); s.px(x, y, P.ph); s.px(x + 1, y, P.phD); }
    s.ell(10, 13, 2.5, 3.2, P.phD); s.ell(10, 13, 1.5, 2.2, P.ph); s.px(9, 11, P.phL); s.px(9, 12, P.phL);
    s.outline(P.K);
    bow(s, C.hair === 'pony' ? 5 : 7, C.hair === 'pony' ? 7 : C.hair === 'bun' ? 2 : 3, C);
    return s.canvas();
  }
  function girlHeadFront(blink, C) {
    const s = new Spr(24, 22);
    s.ell(12, 11, C.hair === 'down' ? 8.5 : 7.6, 8, C.H);     // hair mass
    if (C.hair === 'bun') s.ell(12, 1.6, 3, 1.8, C.H);
    if (C.hair === 'pony') { s.rect(19, 13, 2, 7, C.H); s.px(20, 20, C.H); }
    s.ell(12, 13.5, 5.8, 6, P.skin);                     // face
    s.ell(12, 6.5, 7.5, 3.6, C.H);                       // fringe
    s.px(6, 12, C.H); s.px(18, 12, C.H);
    s.shade({ [C.H]: [C.HD, C.HL], [P.skin]: [P.skinD, null] });
    if (C.eyes === 'happy') { s.px(8, 13, P.K); s.px(9, 12, P.K); s.px(10, 13, P.K); s.px(14, 13, P.K); s.px(15, 12, P.K); s.px(16, 13, P.K); }   // ^ ^ (no blink)
    else if (blink) { s.rect(9, 13, 2, 1, P.K); s.rect(14, 13, 2, 1, P.K); } else { s.rect(9, 12, 1, 2, P.K); s.rect(15, 12, 1, 2, P.K); }
    s.px(8, 15, P.blush); s.px(16, 15, P.blush);
    if (C.face === 'smile') s.rect(11, 17, 3, 1, P.skinD); else {
    // big open grin with teeth
    s.px(9, 15, P.K); s.px(15, 15, P.K);
    s.px(9, 16, P.K); s.rect(10, 16, 5, 1, '#ffffff'); s.px(15, 16, P.K);
    s.px(10, 17, P.K); s.rect(11, 17, 3, 1, '#d9566f'); s.px(14, 17, P.K);
    s.rect(11, 18, 3, 1, P.K); }
    for (let x = 5; x <= 19; x++) s.px(x, Math.round(3 + Math.abs(x - 12) * 0.35), P.ph);   // headband
    s.ell(4.5, 12.5, 2.2, 3, P.phD); s.ell(19.5, 12.5, 2.2, 3, P.phD); s.px(4, 11, P.phL); s.px(19, 11, P.phL);   // ear cups
    s.outline(P.K);
    bow(s, C.hair === 'pony' ? 19 : 17, C.hair === 'bun' ? 1 : 2, C);
    return s.canvas();
  }
  function girlStandFront(f, C) {
    // f: 0 = arms down, 1 / 2 = waving hand up (two frames)
    const s = new Spr(30, 40);
    if (C.dress) {
      for (let y = 19; y < 27; y++) { const e = Math.round((y - 19) * 0.45); s.rect(9 - e, y, 9 + 2 * e, 1, C.T); }
      s.rect(10, 27, 3, 3, P.skin); s.rect(15, 27, 3, 3, P.skin);
    } else {
      s.rect(9, 22, 4, 8, C.BD); s.rect(14, 22, 4, 8, C.B);
      s.rect(9, 19, 9, 4, C.B);
    }
    s.rect(8, 30, 5, 2, C.S); s.rect(14, 30, 5, 2, C.S);
    s.ell(13.5, 13.5, 6.5, 6.5, C.T);
    s.shade({ [C.T]: [C.TD, C.TL], [C.B]: [C.BD, null], [C.S]: [C.SD, null], [P.skin]: [P.skinD, null] });
    for (let y = 9; y < 19; y++) { s.rect(7, y, 3, 1, C.T); s.px(7, y, C.TD); }   // left arm down
    s.ell(8.5, 20, 1.5, 1.3, P.skin);
    if (f === 0) { for (let y = 9; y < 19; y++) { s.rect(17, y, 3, 1, C.T); s.px(19, y, C.TD); } s.ell(18.5, 20, 1.5, 1.3, P.skin); }
    else {
      const dx = f === 1 ? 0 : 2;                      // waving arm: up and out, two positions
      for (let i = 0; i < 9; i++) { s.rect(17 + Math.round(i * (0.55 + dx * 0.1)), 12 - i, 3, 1, C.T); }
      s.ell(23 + dx, 2.5, 2, 1.8, P.skin); s.px(22 + dx, 1, P.skin); s.px(24 + dx, 1, P.skin);
    }
    s.shift(C.ch).outline(P.K);
    return s.canvas();
  }
  function hairBack(s, C, h) {   // hair hanging behind the body in side view
    if (C.hair === 'down') { s.rect(3, 6, 6, h, C.H); s.ell(6, 6 + h, 3, 2.5, C.H); }
    else if (C.hair === 'pony') { s.rect(4, 8, 3, h - 2, C.H); s.ell(5.5, 6 + h, 2, 2, C.H); }
  }
  function girlBody(frame, C) {
    const s = new Spr(30, 36);
    hairBack(s, C, 9);
    s.rect(11, 5, 3, 4, P.skinD);
    s.ell(12, 14, 5.5, 6.5, C.T);
    if (C.dress) { s.rect(9, 19, 12, 5, C.T); s.rect(17, 24, 4, 4, P.skin); }
    else { s.rect(9, 19, 12, 4, C.B); s.rect(17, 22, 4, 6, C.B); }
    s.rect(17, 28, 6, 2, C.S);
    s.shade({ [C.H]: [C.HD, C.HL], [C.T]: [C.TD, C.TL], [C.B]: [C.BD, null], [C.S]: [C.SD, null], [P.skin]: [P.skinD, null] });
    if (frame === 2) {
      s.rect(13, 10, 3, 4, C.T); s.rect(15, 12, 9, 2, C.T); s.rect(22, 4, 3, 9, C.T);
      s.ell(23.5, 2.5, 1.7, 1.7, P.skin);
      for (let y = 10; y < 14; y++) s.px(12, y, C.TD);
      for (let x = 15; x < 22; x++) s.px(x, 14, C.TD);
    } else {
      const hy = frame === 1 ? -1 : 0;
      s.rect(12, 10, 3, 5, C.T); s.rect(14, 14, 7, 3, C.T);
      s.ell(22, 15 + hy, 1.6, 1.2, P.skin);
      for (let y = 10; y < 15; y++) s.px(11, y, C.TD);
      for (let x = 14; x < 21; x++) s.px(x, 17, C.TD);
      s.px(20, 14, C.TL);
    }
    s.outline(P.K);
    return s.canvas();
  }
  // full-height girl (side view, facing right). pose: 'idle' | 'walk' (f 0-3) | 'drink' (f 0 hold, 1 sip)
  function girlStand(pose, f, C) {
    const s = new Spr(30, 40);
    hairBack(s, C, 10);
    s.rect(11, 5, 3, 4, P.skinD);
    const sh = pose === 'walk' ? [2, 0, -2, 0][f] : 0;
    if (C.dress) {
      for (let y = 27; y < 30; y++) { const k = (y - 22) / 8; s.rect(Math.round(9 - sh * k), y, 3, 1, P.skin); s.rect(Math.round(13 + sh * k), y, 3, 1, P.skin); }
      for (let y = 19; y < 27; y++) { const e = Math.round((y - 19) * 0.45); s.rect(9 - e, y, 8 + 2 * e, 1, C.T); }
    } else {
      for (let y = 22; y < 30; y++) { const k = (y - 22) / 8; s.rect(Math.round(9 - sh * k), y, 3, 1, C.BD); s.rect(Math.round(13 + sh * k), y, 3, 1, C.B); }
      s.rect(9, 19, 8, 4, C.B);
    }
    s.rect(Math.round(8 - sh), 30, 5, 2, C.S); s.rect(Math.round(13 + sh), 30, 5, 2, C.S);
    s.ell(12.5, 13.5, 5.5, 6.5, C.T);
    s.shade({ [C.H]: [C.HD, C.HL], [C.T]: [C.TD, C.TL], [C.B]: [C.BD, null], [C.S]: [C.SD, null], [P.skin]: [P.skinD, null] });
    if (pose === 'drink') {
      s.rect(14, 9, 3, 5, C.T); s.rect(16, 4 + f, 3, 7 - f, C.T);
      s.ell(18.5, 4 + f, 1.6, 1.4, P.skin);
      s.rect(18, 1 + f, 3, 4, P.mug); s.px(21, 2 + f, P.mug); s.px(21, 3 + f, P.mug); s.rect(18, 1 + f, 3, 1, '#6b3f22');
      for (let y = 9; y < 14; y++) s.px(13, y, C.TD);
    } else {
      const a = pose === 'walk' ? [1, 0, -1, 0][f] : 0;
      for (let y = 9; y < 19; y++) { const k = (y - 9) / 10; s.rect(Math.round(12 + a * k), y, 3, 1, C.T); s.px(Math.round(11 + a * k), y, C.TD); }
      s.ell(13.5 + a, 20, 1.5, 1.3, P.skin);
    }
    s.shift(C.ch).outline(P.K);
    return s.canvas();
  }
  function girlSprites(C) {
    // v2: the 48x48 chibi from chibi.js (every pose comes pre-rendered from there)
    if (C.v2 && window.Chibi) return { v2: window.Chibi.sprites(C.v2), ch: 0 };
    const g = { v2: null,
      head: [girlHead(false, C), girlHead(true, C)], body: [girlBody(0, C), girlBody(1, C), girlBody(2, C)],
      stand: { idle: girlStand('idle', 0, C), walk: [0, 1, 2, 3].map((f) => girlStand('walk', f, C)), drink: [girlStand('drink', 0, C), girlStand('drink', 1, C)] },
      front: [girlStandFront(0, C), girlStandFront(1, C), girlStandFront(2, C)], headF: [girlHeadFront(false, C), girlHeadFront(true, C)]
    };
    g.standL = { idle: flipC(g.stand.idle), walk: g.stand.walk.map(flipC), drink: g.stand.drink.map(flipC) };
    g.headL = g.head.map(flipC); g.ch = C.ch;
    return g;
  }
  // coffee corner: small round table, an espresso machine and two cups
  function coffeeS() {
    const s = new Spr(22, 26);
    s.rect(2, 15, 18, 2, P.wood); s.rect(10, 17, 2, 7, P.woodD); s.rect(6, 24, 10, 1, P.woodD);
    s.rect(4, 5, 9, 10, '#2f3240'); s.rect(4, 4, 9, 1, '#c8ccd8'); s.rect(5, 6, 7, 2, '#4a4e62'); s.px(11, 6, '#ff6a5a'); s.px(10, 6, '#7dffb0');
    s.rect(7, 9, 3, 1, '#c8ccd8'); s.rect(7, 11, 3, 4, P.mug);
    s.rect(14, 11, 3, 4, P.mug); s.px(17, 12, P.mug); s.px(17, 13, P.mug); s.rect(14, 11, 3, 1, '#6b3f22');
    s.rect(18, 13, 2, 2, '#c49a6c');
    s.shade({ [P.wood]: [P.woodD, P.woodL], '#2f3240': ['#1d1f2a', '#454a5e'] });
    s.outline(P.K);
    return s.canvas();
  }
  // mailbox: click it and a letter flies out (ties in with Contact)
  function mailS(up) {
    const s = new Spr(14, 24);
    s.rect(6, 10, 2, 12, '#7a4f34'); s.rect(4, 22, 6, 1, '#5a3824');
    s.rect(1, 4, 11, 7, '#e0483e'); s.rect(2, 3, 9, 1, '#e0483e');
    s.rect(1, 4, 1, 7, '#b8352e'); s.rect(3, 6, 4, 3, '#b8352e');
    if (up) { s.rect(12, 0, 1, 6, '#3b3f55'); s.rect(13, 0, 1, 3, '#ffc94a'); } else { s.rect(12, 5, 1, 2, '#3b3f55'); s.rect(13, 5, 1, 1, '#ffc94a'); }
    s.shade({ '#e0483e': [null, '#ff7a6b'] });
    s.outline(P.K);
    return s.canvas();
  }
  function chairS() {
    const s = new Spr(30, 36);
    s.rect(3, 10, 3, 14, P.chair); s.rect(5, 23, 14, 2, P.chair);
    s.rect(11, 25, 2, 6, P.chairD); s.rect(6, 31, 13, 1, P.chairD);
    s.px(6, 32, P.K); s.px(12, 32, P.K); s.px(18, 32, P.K);
    s.shade({ [P.chair]: [P.chairD, P.chairL] });
    s.outline(P.K);
    return s.canvas();
  }
  // Side view: we see the desk's depth, so it is short. Her knees go under the top,
  // the laptop sits right under her hands, the screen tilts back and faces her.
  function deskS() {
    const s = new Spr(50, 41);
    s.rect(4, 23, 32, 2, P.wood);
    s.rect(4, 25, 32, 1, P.woodD);
    // slim black-metal legs with small feet (no drawer cabinet)
    s.rect(7, 26, 2, 13, '#3b3f55'); s.rect(6, 38, 4, 1, '#3b3f55');
    s.rect(31, 26, 2, 13, '#3b3f55'); s.rect(30, 38, 4, 1, '#3b3f55');
    s.rect(9, 27, 22, 1, '#3b3f55');
    s.rect(7, 21, 12, 2, P.metal);
    s.rect(23, 18, 4, 5, P.mug); s.px(27, 19, P.mug); s.px(28, 20, P.mug); s.px(27, 21, P.mug);
    s.rect(30, 21, 6, 2, P.lamp);
    for (let j = 0; j < 9; j++) s.px(33 + Math.round(j * 0.12), 20 - j, P.lamp);
    for (let j = 0; j < 5; j++) s.px(34 - j, 11 - Math.round(j * 0.5), P.lamp);
    s.rect(25, 7, 6, 3, P.lamp); s.px(24, 9, P.lamp);
    // glazed ceramic flower pot beside the desk
    s.rect(40, 30, 8, 2, '#f6f1e8'); s.rect(41, 32, 6, 5, '#dfe7f2'); s.rect(42, 37, 4, 2, '#dfe7f2');
    s.rect(41, 34, 6, 1, '#8fb3e0');
    s.shade({ [P.wood]: [null, P.woodL], [P.metal]: [P.metalD, null], [P.mug]: ['#cfc6b8', null], ['#dfe7f2']: ['#b4c2d6', null], [P.lamp]: ['#2a4f86', '#6a9ae0'] });
    s.px(41, 32, '#ffffff'); s.px(41, 33, '#ffffff');
    for (let i = 0; i <= 10; i++) { const x = 18 + Math.round(i * 0.25), y = 20 - i; s.px(x, y, P.metalD); s.px(x + 1, y, P.metal); }
    s.px(26, 10, '#fff2b0'); s.px(27, 10, '#fff2b0');
    s.outline(P.K);
    return s.canvas();
  }
  function speakerS() {
    // studio monitor: dark front baffle, light wood side panels, a tweeter and a woofer, on a short steel stand
    const s = new Spr(16, 21);
    s.rect(2, 2, 12, 15, '#1d1f27');
    s.rect(2, 2, 2, 15, '#c99a62'); s.rect(12, 2, 2, 15, '#a97c4a'); s.rect(3, 2, 1, 15, '#e0b878'); s.rect(13, 2, 1, 15, '#8a6238');
    s.rect(4, 1, 8, 1, '#2f3342');
    s.rect(6, 4, 4, 1, '#5b6080'); s.rect(7, 3, 2, 3, '#5b6080'); s.rect(7, 4, 2, 1, '#9aa0c0');          // tweeter
    for (let y = 8; y <= 15; y++) for (let x = 5; x <= 10; x++) { const dx = x - 7.5, dy = y - 11.5; if (dx * dx + dy * dy <= 10.5) s.px(x, y, (dx * dx + dy * dy <= 2.5) ? '#9aa0c0' : ((x + y) & 1) ? '#3a3f55' : '#2a2e3f'); }   // woofer
    s.px(11, 15, '#7af0ff');                                                                                // power LED
    s.rect(6, 17, 4, 2, '#8d93a8'); s.rect(4, 19, 8, 1, '#c9ccd6'); s.rect(3, 20, 10, 1, '#8d93a8');        // stand
    s.outline(P.K);
    return s.canvas();
  }
  function umbS() {
    const s = new Spr(78, 22), cx = 39, r = 36, hh = 16;
    const col = (x) => (Math.floor((x + r) / 12) % 2) ? '#fff3dc' : '#ff7a6b';
    for (let j = 0; j <= hh; j++) { const t = j / hh; const hw = Math.round(r * Math.sqrt(1 - (1 - t) * (1 - t))); for (let x = -hw; x <= hw; x++) s.px(cx + x, 2 + j, col(x)); }
    for (let x = -r; x <= r; x++) if (((x + r) % 6) < 3) s.px(cx + x, 3 + hh, col(x));
    s.shade({ '#ff7a6b': ['#d9544a', '#ff9f92'], '#fff3dc': ['#e9d6b4', null] });
    s.px(cx, 1, '#e9e2d0');
    s.outline(P.K);
    return s.canvas();
  }
  function corgiWalk(f) {
    const s = new Spr(30, 20);
    const lift = [[0, 1, 1, 0], [0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0]][f], sh = [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    const LX = [6, 9, 16, 19];
    for (let i = 0; i < 4; i++) { const x = LX[i] + sh[i], l = lift[i]; s.rect(x, 15, 3, 3 - l, (i === 1 || i === 2) ? P.furD : P.fur); s.rect(x, 17 - l, 3, 1, P.wh); }
    s.ell(3.5, 9, 2.2, 2.2, P.fur);
    s.ell(12, 11, 9.4, 4.8, P.fur);
    s.ell(13, 14, 7.5, 2, P.wh);
    s.ell(20.5, 11.5, 3.6, 3.8, P.wh);
    s.ell(22.5, 7, 4, 3.6, P.fur);
    s.ell(25.5, 8.8, 2.6, 1.8, P.wh);
    s.rect(19, 2, 2, 3, P.fur); s.px(19, 1, P.fur); s.rect(22, 1, 2, 3, P.fur);
    s.shade({ [P.fur]: [P.furD, P.furL], [P.wh]: [P.whD, null] });
    s.px(20, 3, P.earIn); s.px(22, 2, P.earIn);
    s.px(23, 5, P.wh); s.px(23, 6, P.wh);
    s.px(24, 7, P.K); s.px(27, 8, P.K);
    s.outline(P.K);
    return s.canvas();
  }
  function corgiSit(f) {
    const s = new Spr(30, 20);
    s.ell(10, 14, 5.8, 4, P.fur);
    s.rect(18, 13, 3, 5, P.furD); s.rect(18, 17, 3, 1, P.wh);
    s.ell(14, 10.5, 4.8, 5.6, P.fur);
    s.rect(15, 13, 3, 5, P.fur); s.rect(15, 17, 3, 1, P.wh);
    s.ell(16.5, 11.5, 2.8, 3.8, P.wh);
    s.ell(16, 6, 3.6, 3.2, P.fur);
    s.ell(19, 7.5, 2.4, 1.6, P.wh);
    s.rect(13, 1, 2, 3, P.fur); s.rect(16, 1, 2, 3, P.fur);
    if (f) { s.px(6, 12, P.fur); s.px(5, 11, P.fur); } else { s.px(6, 14, P.fur); s.px(5, 15, P.fur); }
    s.shade({ [P.fur]: [P.furD, P.furL], [P.wh]: [P.whD, null] });
    s.px(14, 2, P.earIn); s.px(16, 2, P.earIn);
    s.px(17, 4, P.wh); s.px(17, 5, P.wh);
    s.px(18, 6, P.K); s.px(21, 7, P.K);
    if (f) s.px(19, 9, P.tongue);
    s.outline(P.K);
    return s.canvas();
  }
  function corgiLie(sleep) {
    const s = new Spr(30, 20);
    s.ell(12, 14.6, 10.4, 3.8, P.fur);
    s.ell(4, 14, 1.8, 1.8, P.fur);
    s.rect(20, 16, 6, 2, P.fur); s.rect(25, 16, 2, 2, P.wh);
    s.ell(19, 16, 2.5, 1.5, P.wh);
    s.ell(22, 12, 3.6, 3, P.fur);
    s.ell(25, 13.5, 2.4, 1.5, P.wh);
    s.rect(19, 8, 2, 3, P.fur); s.rect(22, 7, 2, 3, P.fur);
    s.shade({ [P.fur]: [P.furD, P.furL], [P.wh]: [P.whD, null] });
    s.px(20, 9, P.earIn); s.px(22, 8, P.earIn);
    s.px(23, 10, P.wh); s.px(23, 11, P.wh);
    if (sleep) { s.px(23, 12, P.K); s.px(24, 12, P.K); } else s.px(24, 12, P.K);
    s.px(27, 13, P.K);
    s.outline(P.K);
    return s.canvas();
  }
  function bunS(leap) {
    const s = new Spr(18, 15);
    if (!leap) {
      s.ell(7, 10, 4.5, 3, P.bun); s.ell(3, 9, 1.3, 1.3, P.bun); s.ell(11, 7, 2.6, 2.3, P.bun);
      s.rect(9, 1, 2, 5, P.bun); s.rect(12, 1, 2, 5, P.bun); s.rect(5, 12, 5, 2, P.bun); s.rect(11, 11, 2, 3, P.bun);
      s.shade({ [P.bun]: [P.bunD, null] });
      s.rect(13, 2, 1, 3, P.bunEar); s.px(12, 7, P.bunEye);
    } else {
      s.ell(8, 8, 5.5, 2.5, P.bun); s.ell(2.5, 7, 1.3, 1.3, P.bun); s.ell(13, 6, 2.6, 2.3, P.bun);
      s.rect(9, 2, 2, 4, P.bun); s.rect(11, 1, 2, 4, P.bun); s.rect(1, 9, 4, 2, P.bun); s.rect(14, 9, 2, 2, P.bun);
      s.shade({ [P.bun]: [P.bunD, null] });
      s.px(12, 2, P.bunEar); s.px(12, 3, P.bunEar); s.px(14, 6, P.bunEye);
    }
    s.outline(P.K);
    return s.canvas();
  }
  function noteS() { const s = new Spr(8, 10); s.rect(4, 1, 1, 6, '#ffffff'); s.px(5, 1, '#ffffff'); s.px(6, 2, '#ffffff'); s.px(6, 3, '#ffffff'); s.ell(3, 7, 1.6, 1.2, '#ffffff'); s.outline(P.K); return s.canvas(); }
  function heartS() {
    const s = new Spr(9, 8), c = '#ff5a76';
    [[2, 1], [3, 1], [5, 1], [6, 1]].forEach(p => s.px(p[0], p[1], c));
    s.rect(1, 2, 7, 2, c); s.rect(2, 4, 5, 1, c); s.rect(3, 5, 3, 1, c); s.px(4, 6, c); s.px(2, 2, '#ffc2cc');
    s.outline(P.K); return s.canvas();
  }
  function bangS() { const s = new Spr(5, 10); s.rect(2, 1, 1, 5, '#ffffff'); s.px(2, 7, '#ffffff'); s.outline(P.K); return s.canvas(); }
  function zS() { const s = new Spr(6, 6); s.rect(1, 1, 3, 1, '#ffffff'); s.px(2, 2, '#ffffff'); s.rect(1, 3, 3, 1, '#ffffff'); s.outline(P.K); return s.canvas(); }
  function arrowS() { const s = new Spr(9, 7); s.rect(2, 1, 5, 1, '#ffffff'); s.rect(3, 2, 3, 1, '#ffffff'); s.px(4, 3, '#ffffff'); s.outline(P.K); return s.canvas(); }
  function sunS(low) {
    const s = new Spr(26, 26), c = low ? ['#ff9f4a', '#ffc06a', '#ffe2b0'] : ['#ffd84a', '#ffeb8a', '#fff9d8'];
    s.ell(13, 13, 9, 9, c[0]); s.ell(13, 13, 7.6, 7.6, c[1]); s.ell(12, 12, 5, 5, c[2]);
    return s.canvas();
  }
  function moonS() {
    const s = new Spr(20, 20);
    s.ell(10, 10, 7, 7, '#fff1c4'); s.ell(13, 8, 6.2, 6.2, null);
    s.px(6, 11, '#e8d49a'); s.px(8, 14, '#e8d49a'); s.px(5, 8, '#e8d49a');
    return s.canvas();
  }
  // kinds: 'round' (oak), 'fruit' (oak with apples), 'blossom' (pink), 'pine', 'bush', 'berry' (bush with berries)
  const LEAF = ['#c6ef7a', '#8fd24f', '#62b84a', '#3f9440', '#2a7036'];
  const PINK = ['#fff0f6', '#ffc8dd', '#ff9cc4', '#e8709f', '#b8507a'];
  const PINE = ['#9fd66a', '#5aa83b', '#3f8a35', '#2c6b31', '#1f5129'];
  const AMBER = ['#ffe08a', '#ffb547', '#f08a2c', '#c9611f', '#8f4116'];
  const WILLOW = ['#d9f59a', '#a8dd6a', '#7cc257', '#559a44', '#3b7236'];
  // flower beds traced from the reference art Khanh supplied (rows + palette); drawn 1:1, outlined like the trees
  const FLOWER_ART = {"rose":[["....a...bb.....aaaca...........","..aaca.abbb...caaacaa..........","..aaaa.bbb....caaaca...........","..caac.ddd....cacaac...........","...ccc.dea.....cccc............","....f....bb.....f...b....ccc...",".fff....abbbb..ffffaaba.ccfac..","..gff...bbbba..fff.abaa.ccaac..",".bb.f...bbbb..fff..caa...accc..","bbbb.....fg....fff.ffa....f....","....b....f......f...f...g.f....",".....bbb..gf...ac...f..ggff....",".....bbba.f..aacca..ffbb..fff..",".....bbbb....caaaac.fbbbbbff...","....fgbb.....cccaac.fbbbbaf....","..heehf.......cccc..f.....f....",".aaeeegeeeh....c....f.....fig..",".....aeeeea.ggg...gigig...fgi..",".....feedg..hiig.aiiiii...ig...",".....eeeeddec..i.iiii.....ii...","...eeeeehhhhieedheehgidddbfc...","..beeihhdehhdddiddigghheeegiadb","...hehhdedhheiigiiigiihhddiieed","...heedeeeiiiihffhhhhihhhhideee",".....bedd.ddhehhhhehhheeeeee.e.","..........ddeedheeehhee..eeg...","............d..e.eghee..g......"],{"a":"#e4486c","b":"#84c00c","c":"#a83c60","d":"#6c9c00","e":"#6ca800","f":"#24303c","g":"#549024","h":"#608418","i":"#549018"}],"blue":[["......abb..bb...","...b..bc...cb...","..baab.db..ea...","...e.bcebb.e.bb.",".bbe.bdebbee.ab.",".bbb..debbed.ed.",".e.bdbdeefebbe.d","ee.febbefeebbed.",".egeeegebbeefdd.","..egffdebbffdehi","..igggfdefggfgib",".iihghggfgggghi.","..iihihggghhi...","....iiihhhii....",".......iiii....."],{"a":"#3078c0","b":"#6ca8cc","c":"#306cb4","d":"#486c3c","e":"#002424","f":"#6c9048","g":"#3c5400","h":"#60840c","i":"#78a800"}],"marigold":[["..............a...",".............aa...","..bb.....bb..ab...","..aaa...bbb.bbb...","...baa.bbcd.dcb...","....babcbbd.ddb.e.","......dcdbf.aeeee.",".eeeffddeefaabff..","...eegfffafbef....","...eeebefffcbbg...","...hhbcdfffbbgb...","...hhhddfffhhhhai.","..hhhhhhhfhhhhegg.",".gggghhhhhehhheegi","iigghhhghhhegggii.",".iihgighhehheii...","...iiiggheihhgii..",".....iiiigiiiib..."],{"a":"#485400","b":"#fcc060","c":"#a83c00","d":"#f07818","e":"#909c30","f":"#244800","g":"#60840c","h":"#0c3c24","i":"#78a800"}]};
  const FLOWER_KINDS = ['rose', 'blue', 'marigold'];
  function makeFlowers(kind) {
    const [rows, pal] = FLOWER_ART[kind], w = rows[0].length, h = rows.length, s = new Spr(w + 2, h + 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x]; if (ch !== '.') s.px(x + 1, y + 1, pal[ch]); }
    s.outline(TOUT);
    return s.canvas();
  }
  // bloom bush: a low leafy mound with 6-8 big round blooms (two tones + a white highlight), used for 'pinkbush' / 'orangebush'
  function makeBloomBush(seed, r, kind) {
    const R = RNG(seed), w = Math.ceil(r * 2.6 + 10), h = Math.ceil(r * 1.9 + 8), s = new Spr(w, h), cx = w / 2, base = h - 3;
    const G = ['#8fd24f', '#62b84a', '#3f9440', '#2a7036'];
    const F = kind === 'orangebush' ? ['#ff8a3c', '#e8601c', '#ffd27a'] : ['#ff6fa3', '#d9397a', '#ffd6e8'];
    // mound: four overlapping leaf clumps, lit from the top-left
    const clumps = [[cx, base - r * 0.5, r * 0.78], [cx - r * 0.8, base - r * 0.32, r * 0.58], [cx + r * 0.8, base - r * 0.32, r * 0.58], [cx - r * 0.25, base - r * 0.75, r * 0.5], [cx + r * 0.35, base - r * 0.7, r * 0.5]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y > base) continue;
      let v = null;
      for (const c of clumps) { const dx = (x - c[0]) / c[2], dy = (y - c[1]) / (c[2] * 0.85); const d = dx * dx + dy * dy; if (d <= 1) { const vv = dx * 0.45 + dy * 0.8; v = v == null ? vv : Math.min(v, vv); } }
      if (v == null) continue;
      v += (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.5;
      s.px(x, y, G[v < -0.7 ? 0 : v < -0.2 ? 1 : v < 0.35 ? 2 : 3]);
    }
    // leaf tips poking out of the mound
    for (let i = 0; i < r; i++) { const x = Math.round(cx + (R() - 0.5) * r * 2.4), y0 = Math.round(base - r * 0.8 + R() * r * 0.5); s.px(x, y0, G[1]); s.px(x, y0 - 1, G[0]); }
    // blooms: bigger in front, smaller behind
    const n = 7 + (R() * 3 | 0);
    const blooms = [];
    for (let i = 0; i < n; i++) blooms.push([cx + (i / (n - 1) - 0.5) * r * 2.2 + (R() - 0.5) * 3, base - r * (0.5 + R() * 0.8) - (i % 2) * 2, 2.1 + R() * 1.1]);
    blooms.sort((a, b) => a[1] - b[1]);
    for (const b of blooms) {
      const [bx, by, br] = b;
      s.rect(Math.round(bx), Math.round(by), 1, Math.round(base - by), G[3]);                         // stem
      for (let y = Math.floor(by - br); y <= Math.ceil(by + br); y++) for (let x = Math.floor(bx - br); x <= Math.ceil(bx + br); x++) {
        const dx = (x - bx) / br, dy = (y - by) / br; if (dx * dx + dy * dy > 1) continue;
        s.px(x, y, dx + dy > 0.5 ? F[1] : F[0]);
      }
      s.px(Math.round(bx - br * 0.4), Math.round(by - br * 0.45), F[2]);
      s.px(Math.round(bx), Math.round(by), F[1]);
    }
    s.outline(TOUT);
    return s.canvas();
  }
  // banana tree (v2): slender slightly curved trunk, a crown of 5 broad paddle leaves — two drooping to each side with
  // a torn edge, one young leaf standing up rolled in the middle — and a bunch of bananas with the purple flower bud hanging below
  function makeBanana(seed, r) {
    const R = RNG(seed), w = Math.ceil(r * 3.6 + 8), h = Math.ceil(r * 3.0 + 10), s = new Spr(w, h), cx = Math.round(w / 2), top = Math.round(r * 1.05), base = h - 2;
    const LF = ['#cdef7a', '#9ddc55', '#63bd4d', '#3f9440', '#2a7036'];
    // trunk: pale green sheaths, a gentle lean to the right, darker rings
    const tw = Math.max(3, Math.round(r / 3));
    for (let y = top; y <= base; y++) {
      const lean = Math.round(((y - top) / (base - top)) * -r * 0.12);
      for (let x = 0; x < tw; x++) { const px = cx - Math.floor(tw / 2) + x + lean; s.px(px, y, (y % 5 === 0) ? '#86a455' : x === 0 ? '#d2e59a' : x === tw - 1 ? '#8aa85c' : '#a9c46c'); }
    }
    // paddle leaf: a midrib curve, blade width swelling then tapering; notches cut along the lower edge
    const leaf = (d, angle, len, thick, droop) => {
      for (let i = 0; i <= len; i++) {
        const t = i / len, x = cx + d * Math.cos(angle) * i, y = top - Math.sin(angle) * i + droop * t * t * r;
        const half = Math.max(1, Math.round(thick * Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.05))));
        for (let k = -half; k <= half; k++) { const v = k / Math.max(1, half); s.px(Math.round(x), Math.round(y + k), v < -0.55 ? LF[0] : v < 0 ? LF[1] : v < 0.55 ? LF[2] : LF[3]); }
        s.px(Math.round(x), Math.round(y), LF[4]);                                       // midrib
        if (t > 0.25 && i % 4 === 1) { s.px(Math.round(x), Math.round(y + half), null); s.px(Math.round(x), Math.round(y + half - 1), null); }   // torn edge
        if (t > 0.4 && i % 5 === 2) s.px(Math.round(x), Math.round(y - half), null);
      }
    };
    const L = r * 1.5, th = Math.max(3, Math.round(r * 0.42));
    leaf(-1, 0.55, L, th, 1.25); leaf(1, 0.5, L * 1.05, th, 1.3);        // big side leaves, drooping
    leaf(-1, 1.05, L * 0.8, th * 0.9, 0.5); leaf(1, 1.0, L * 0.85, th * 0.9, 0.55);   // upper pair
    // young rolled leaf standing up in the middle
    for (let i = 0; i <= r * 0.9; i++) { const y = top - i, half = i < 2 ? 0 : 1; for (let k = -half; k <= half; k++) s.px(cx + k, Math.round(y), k < 0 ? LF[1] : LF[2]); s.px(cx, Math.round(y), LF[3]); }
    s.px(cx - 1, top - Math.round(r * 0.9), LF[0]);
    // bunch of bananas + flower bud hanging from the crown on the right
    const bx = cx + Math.round(r * 0.3), by = top + Math.round(r * 0.35);
    s.rect(bx, by - 4, 1, 5, '#6b4a3a');
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - (row === 2 ? 1 : 0); i++) {
      const x = bx - 3 + i * 2 + (row & 1), y = by + row * 2;
      s.rect(x, y, 2, 3, '#ffd23f'); s.px(x, y, '#fff3a0'); s.px(x + 1, y + 2, '#e0a51c');
    }
    s.rect(bx - 1, by + 7, 3, 1, '#6b4a3a'); s.ell(bx + 0.5, by + 10, 1.6, 2.4, '#8a3a6b'); s.px(bx, by + 9, '#b65a8c');   // purple bud
    s.outline(TOUT);
    return s.canvas();
  }
  function makeTree(seed, r, kind) {
    const R = RNG(seed), bush = kind === 'bush' || kind === 'berry' || kind === 'flower', pine = kind === 'pine', willow = kind === 'willow';
    const pal = kind === 'blossom' ? PINK : pine ? PINE : kind === 'autumn' ? AMBER : willow ? WILLOW : LEAF;
    const trunkH = bush ? 0 : Math.round(r * (pine ? 0.5 : willow ? 1.1 : 0.8));
    const w = Math.ceil(r * (pine ? 2.2 : 2.8) + 8), cy = r + 4;
    const h = Math.ceil(cy + r * (bush ? 0.75 : pine ? 1.6 : willow ? 1.3 : 0.85) + trunkH + 3), cx = w / 2;
    const s = new Spr(w, h);
    const B = '#7a4f34', BD = '#55351f', BL = '#9a6a48';
    // trunk: tapered, bark lines, root flare, a branch or two
    if (!bush) {
      const tb = Math.max(3, Math.round(r / 4)), top = Math.round(cy + r * (pine ? 0.9 : 0.25)), base = h - 2;
      for (let y = top; y <= base; y++) {
        const k = (y - top) / Math.max(1, base - top), tw = Math.max(2, Math.round(tb * (0.6 + 0.4 * k)) + (y > base - 2 ? 2 : 0));
        const x0 = Math.round(cx - tw / 2);
        for (let x = x0; x < x0 + tw; x++) s.px(x, y, x === x0 ? BL : x === x0 + tw - 1 ? BD : ((x * 3 + y) % 7 === 0 ? BD : B));
      }
      if (!pine) for (const d of [-1, 1]) { if (R() < 0.3) continue; const L = Math.round(r * 0.5); for (let i = 0; i < L; i++) s.px(Math.round(cx + d * (1 + i)), Math.round(cy + r * 0.45 - i * 0.7), BD); }
    }
    if (pine) {
      const tiers = 4 + (R() * 2 | 0), apex = 2, baseY = Math.round(cy + r * 1.0);
      for (let t = 0; t < tiers; t++) {
        const ty0 = Math.round(apex + (baseY - apex) * (t / tiers) * 0.85), ty1 = Math.round(apex + (baseY - apex) * ((t + 1) / tiers) + 2);
        for (let y = ty0; y <= ty1; y++) {
          const k = (y - ty0) / Math.max(1, ty1 - ty0), hw = (r * 0.35 + r * 0.65 * ((t + 1) / tiers)) * (0.35 + 0.65 * k);
          for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            const u = (x - cx) / Math.max(1, hw);
            let v = u * 0.55 + k * 0.7 - 0.25 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.45;
            if (y === ty1 && ((x + t) & 1)) v += 0.6;
            s.px(x, y, pal[v < -0.35 ? 0 : v < 0.05 ? 1 : v < 0.45 ? 2 : v < 0.8 ? 3 : 4]);
          }
        }
      }
      s.outline(TOUT);
      return s.canvas();
    }
    // canopy: overlapping leaf clusters, each lit from the top-left
    const blobs = [];
    const main = bush ? [[cx, cy + r * 0.25, r * 0.95]] : [[cx, cy, r * 0.9]];
    main.forEach((b) => blobs.push(b));
    const n = bush ? 4 + (R() * 2 | 0) : 7 + (R() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.02 + R() * 0.96), d = r * (bush ? 0.55 : 0.6 + R() * 0.25);
      blobs.push([cx + Math.cos(a) * d * 1.05, cy + Math.sin(a) * d * (bush ? 0.45 : 0.72) + r * (bush ? 0.3 : 0.18), r * (bush ? 0.45 : 0.36 + R() * 0.2)]);
    }
    if (!bush) { blobs.push([cx - r * 0.82, cy + r * 0.32, r * 0.48]); blobs.push([cx + r * 0.82, cy + r * 0.32, r * 0.48]); }
    blobs.sort((a, b) => a[1] - b[1]);
    const sq = bush ? 0.78 : 0.9, own = new Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      for (let i = blobs.length - 1; i >= 0; i--) { const b = blobs[i], dx = (x - b[0]) / b[2], dy = (y - b[1]) / (b[2] * sq); if (dx * dx + dy * dy <= 1) { own[y * w + x] = i; break; } }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = own[y * w + x]; if (i < 0) continue;
      const b = blobs[i], lx = (x - b[0]) / b[2], ly = (y - b[1]) / (b[2] * sq);
      let v = lx * 0.45 + ly * 0.75 + ((y - cy) / r) * 0.35 + (R() - 0.5) * 0.18 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.4;
      const below = y + 1 < h ? own[(y + 1) * w + x] : -1;
      if (below >= 0 && below !== i && blobs[below][1] > b[1]) v = Math.max(v, 0.95);
      s.px(x, y, pal[v < -0.6 ? 0 : v < -0.15 ? 1 : v < 0.3 ? 2 : v < 0.75 ? 3 : 4]);
    }
    // leaf texture: small light flecks up top, dark notches below
    for (let k = 0; k < r * (bush ? 3 : 5); k++) {
      const x = Math.round(cx + (R() - 0.5) * r * 2), y = Math.round(cy + (R() - 0.6) * r * 1.4);
      if (own[y * w + x] < 0 || own[y * w + x + 1] < 0) continue;
      if (y < cy) { s.px(x, y, pal[0]); s.px(x + 1, y, pal[1]); } else { s.px(x, y, pal[4]); }
    }
    if (kind === 'fruit' || kind === 'berry') {
      const nf = kind === 'fruit' ? 7 + (R() * 4 | 0) : 5 + (R() * 3 | 0), c = kind === 'fruit' ? ['#e8433a', '#ff8a7a'] : ['#7a4fd0', '#c4a8ff'];
      for (let k = 0, g = 0; k < nf && g < 80; g++) {
        const x = Math.round(cx + (R() - 0.5) * r * 1.7), y = Math.round(cy + (R() - 0.3) * r * 1.1);
        if (own[y * w + x] < 0 || own[(y + 1) * w + x + 1] < 0) continue;
        s.rect(x, y, 2, 2, c[0]); s.px(x, y, c[1]); k++;
      }
    }
    if (willow) for (let i = 0; i < 9; i++) { const x = Math.round(cx + (i - 4) * r * 0.2 + (R() - 0.5) * 2), L = Math.round(r * (0.5 + R() * 0.7)), y0 = Math.round(cy + r * 0.6); for (let j = 0; j < L; j++) s.px(x + (j % 5 === 4 ? 1 : 0), y0 + j, j % 3 === 2 ? pal[3] : pal[2]); }
    if (kind === 'flower') { const FC = [['#ff6b8a', '#ffd1dc'], ['#ffd23f', '#fff3a0'], ['#ffffff', '#ffe9f0'], ['#b388ff', '#e2d4ff']]; for (let k = 0, g = 0; k < r * 2.2 && g < 120; g++) { const x = Math.round(cx + (R() - 0.5) * r * 1.8), y = Math.round(cy + (R() - 0.25) * r * 1.1); if (own[y * w + x] < 0 || own[(y + 1) * w + x + 1] < 0) continue; const c = FC[(R() * 4) | 0]; s.px(x, y, c[0]); s.px(x + 1, y, c[0]); s.px(x, y + 1, c[0]); s.px(x + 1, y + 1, c[0]); s.px(x, y, c[1]); k++; } }
    if (kind === 'blossom') {
      for (let k = 0; k < r * 2; k++) { const x = Math.round(cx + (R() - 0.5) * r * 1.8), y = Math.round(cy + (R() - 0.5) * r * 1.3); if (own[y * w + x] >= 0) s.px(x, y, '#ffffff'); }
      // cherries: pairs of red berries hanging from one stem, on the lower half of the crown
      const np = Math.max(3, Math.round(r * 0.45));
      for (let k = 0, g = 0; k < np && g < 90; g++) {
        const x = Math.round(cx + (R() - 0.5) * r * 1.6), y = Math.round(cy + (R() * 0.6 + 0.05) * r * 1.1);
        if (own[y * w + x] < 0 || own[(y + 2) * w + x + 3] < 0) continue;
        s.px(x + 1, y - 2, '#3f8a35'); s.px(x + 1, y - 1, '#3f8a35'); s.px(x + 2, y - 1, '#3f8a35');   // stem
        s.rect(x, y, 2, 2, '#d7263d'); s.rect(x + 2, y + 1, 2, 2, '#d7263d'); s.px(x, y, '#ff7b86'); s.px(x + 2, y + 1, '#ff7b86'); k++;
      }
    }
    s.outline(kind === 'blossom' ? '#6e2f4c' : TOUT);
    return s.canvas();
  }
  // kinds: 'cumulus' (dome), 'long' (stretched, low), 'puff' (2-4 round lobes), 'tower' (tall stack), 'wisp' (thin streak)
  // cloud art traced 1:1 from the reference sheet the user supplied ('w' light, 'S' shade); no generated shapes
  const CLOUD_ART = [["...........ww...............","..........wwwwS.............",".........wwwwwwS............","....w...wwwwwwwSS.ww........","...wwwwwwwwwwwwwSSwwww......","..wwwwwSSwwwwwwwSSwwwww.....","wwwwwwwwwSwwwwwSSSSSwwwwww..",".SwwwwwSSSSwwSSSSSSSSSSSSSS.","..SSSSSSSSSSSSSSSSSSSSSSSSSS"],[".........................www.............","........................wwwSS............","......................SSwwSwwS.www.......",".............Sw.....SSwwwwwwwSSwwwww.....","...........SSwww...SSwwwwwwSSSwwwwwww....",".........SSwwwwwwwwSSwwwwSSSSwwwwwwwww...","......SSSSSwwwwwwwSSSSwwSSSSSSwwwwwwwww..","..SSSSSSSSSSwwwwwSSSSSSSSSSSSSSSwSwwwwww.","SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"],["....................wwww..........","..................SSwwwww.........","..................Swwwwwww........",".................Swwwwwwww........","..........wwww...SwwwSSwwww.......",".........wwwwwwwSSSSSwwwwSww......","........SwwwwwwSSSSSwwwwSwSS......",".....wwwwSwwwwSSSSSSwwwwwwSSSww...","....wwwwwSSwwwSSSSSSSSSwwwSSwwww..",".SSSSSSSSSSSSSSSSSSSSSSSSSSSSwwww.","SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"],["......SSSwww......",".....Swwwwwww.....",".....wwwwwwwww....","....SwwSSSwwww....","..SSwwSwwwwwww....",".SSSwSSwwwwwwSww..",".SSSSSSSSwwwSSwww.","SSSSSSSSSSSSSSSwww","SSSSSSSSSSSSSSSSSS"],["...........................Swww....................","..........................Swwwwww..................",".........................SwwwwwwwwwwwwS............",".....................SSSSSwwwwwwwwwwwSSS...........","....................SSwwSSwwwwwwwwwwwSSw...........","...................SSwwwwSSwwwwwSwwwwSSww..........","..................SSwwwwwSSSwwwSwwwwwSwww..........",".................SSwwwwwwwSSSSSwwwwwSwwww..........",".................SSwwwwwwwSSSwwwwwwwwwwww..........","................SSwwwwwwwSSSwwwwwwwwwwwwwww........","............SSSSSSwwwwwwSSSSwwwwwwwwwwwwwwww.......","...........SSSSwwSSwwwwwSwwSwwwwwwwwwwwwwwwwSww....","..........SSSSwwwwSwwwwwSwwSSwwwwwwwwwwwwwSSwwwww..",".........SSSSwwwwwwwwwwwwwwwSSwwwSwwwwwwwwSSwwwwww.","..wwwww..SSSSwwwwwwwwwwwwwwwwSSSSwwwwwwwwwwwwSwwww.",".SSwwwwwwSSSSSwwwwwwwwwwwwwwwSSwwwwwwwwwwwwwwSSwww.","SSSwwwwwSSSSSSSwwwwwwwSwwwwwwwSSwwwwwwwwwwSSwwSS...","SSSSSwwSSSSSSSSSwwwwwwSSwwwwSSSSwwwwwwwwwSSwwwwwSS.","SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwwwwwwSSSSwwwwwwww","SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwwwwww",".SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS."],["..www.....",".wwwwSwwS.","SwwSSwwwwS","SSSSSwwwww",".SSSSSSSS."],["........Sw......","......SSwww.....",".....SSwwwww....",".....Swwwwwww...","..wwSSSSSwwwww..",".wwwwSSwwwwSSww.","SSSwSSwwwwSwwwww","SSSSSSSwSSSSwwwS","..SSSSSSSSSSSSS."],["...............SSww............","..............SSwwww...........",".............SSwwwwww..........",".......Swww.SSwwwwwwww.........","......SSwwwwSSwwwwwwwwww.......",".....SSwwwwwSSwwwwwwwSwwwww....","....SSwwwwwSSwwwwwwwSwwwwww....","..SwSSwwwwwSwwwSSSSSSwwwwwwww..",".SwwwSSwwwSwwwSwwwwSSSwwwwwSSw.","SSSSSSSSSSSSwwSwwwwSSSSSSSSSSSw",".SSSSSSSSSSSSSSSwwSSSSSSSSSSSS."],[".....wwww..","....wwwwwww","..SSSwwwwww","SSSSSSSSSSS"],["........Swwwwww..........",".......Swwwwwwww.........","......Swwwwwwwwww........",".....SSwwwwwwwwww........","....SSwwwwSSSSSwww.......","....SSwwwSSwwwwwwwSSS....","....SSwwSSwwwwwwwwSwww...","...wSSSSSSwwwwwwwwwwwww..","...wwSSSSSwwwwwwSwwwwww..",".wwwwSSSSSSwwwwSSwwwwwww.","wwwwwwSSSSSwwwwSSwwwwwwww","wwwwwwSSSSSSSSwwwSwwwwwww","SSSSSSSSSSSSSwwwwwSSSSSS.",".SSSSSSSSSSSSSSSSSSSSSS.."],[".........SSSS..........................................","........SSwwwww........................................",".......SSwwwwwww.......................................","...SS.SSwwwwwwwww..............Swwwwww.................","..SSwwwSwwwwwwwwww............SSwwwwwww.....Sww........",".SSwwwwSSwwwwSSwww..www......SSwwwwwwwww.SSSwwwwww.....",".SwwwwSSSSwwSwwwwwSwwwwww...SSSwwwwwwwwwSSwwwwwwwww....",".SSSSSSSSSSSwwwwwSSSSwwwwwSSSSSSwwwwwwwSSSSSwwwwwwwww..","SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"]];
  const CLOUD_COL = { w: '#ffffff', S: '#e4f3fd' };
  let CLOUD_FLAT = false;   // sky:'none' — clouds sit on the page colour, so they get a lavender shade and outline to stay visible
  function refCloud(i, sc) {
    const rows = CLOUD_ART[i], w = rows[0].length, h = rows.length, c = mk(w * sc, h * sc), x = c.getContext('2d');
    const col = CLOUD_FLAT ? { w: '#ffffff', S: '#E6E0FA' } : CLOUD_COL;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const ch = rows[y][xx]; if (ch === '.') continue; x.fillStyle = col[ch]; x.fillRect(xx * sc, y * sc, sc, sc); }
    if (CLOUD_FLAT) {
      const on = (xx, yy) => yy >= 0 && yy < h && xx >= 0 && xx < w && rows[yy][xx] !== '.';
      x.fillStyle = '#B4A8EA';
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (on(xx, y) && (!on(xx - 1, y) || !on(xx + 1, y) || !on(xx, y - 1) || !on(xx, y + 1))) x.fillRect(xx * sc, y * sc, sc, sc);
    }
    return c;
  }
  // little sparkles around a cloud: offsets relative to the cloud, a plus mark or a dot, each with its own twinkle
  function sparkSet(R, w, h) {
    const out = [], n = 2 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const side = R() < 0.5 ? -1 : 1, x = side < 0 ? -4 - R() * 10 : w + 2 + R() * 10, y = -6 + R() * (h * 0.7);
      out.push({ x: Math.round(R() < 0.35 ? R() * w : x), y: Math.round(R() < 0.35 ? -4 - R() * 8 : y), big: R() < 0.45, ph: R() * 6.28 });
    }
    return out;
  }
  function makeCloud(seed, w, h, kind) {
    const R = RNG(seed), s = new Spr(w, h), blobs = [];
    kind = kind || 'cumulus';
    const add = (x, y, r) => { r = Math.max(2, Math.min(r, x - 1, w - 2 - x, h * 0.95)); y = Math.max(r * 0.9 + 1, Math.min(y, h - r * 0.9 - 3)); blobs.push([x, y, r]); };
    if (kind === 'puff') {
      const n = 2 + (R() * 3 | 0);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; add(w * (0.18 + 0.64 * t) + (R() - 0.5) * w * 0.1, h * (0.55 + (R() - 0.5) * 0.25), h * (0.3 + R() * 0.16)); }
    } else if (kind === 'wisp') {
      const n = Math.max(4, Math.round(w / 6));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; add(w * (0.06 + 0.88 * t), h * (0.6 + Math.sin(t * 5 + R()) * 0.12), h * (0.22 + 0.22 * Math.sin(Math.PI * t)) * (0.7 + R() * 0.5)); }
    } else {
      const n = Math.max(3, Math.round(w / (kind === 'long' ? 12 : 19)));
      const env = kind === 'long' ? 0.25 : kind === 'tower' ? 0.5 : 0.7;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, r = h * (kind === 'long' ? 0.32 : 0.3) * (0.6 + env * Math.sin(Math.PI * t)) * (0.8 + R() * 0.4);
        add(w * (0.07 + 0.86 * t), h - r - 2 - R() * h * 0.1, r);
      }
      const nt = kind === 'long' ? 1 + (R() * 2 | 0) : kind === 'tower' ? 3 + (R() * 2 | 0) : 2 + (R() * 3 | 0);
      for (let i = 0; i < nt; i++) {
        if (kind === 'tower') { const tt = (i + 1) / (nt + 0.5); add(w * (0.5 + (R() - 0.5) * 0.25), h * (0.72 - tt * 0.5), h * (0.28 - tt * 0.08) * (0.85 + R() * 0.3)); }
        else { const tt = 0.22 + R() * 0.56; add(w * tt, h * (kind === 'long' ? 0.45 : 0.42) - R() * h * 0.12, h * (kind === 'long' ? 0.24 : 0.24 + R() * 0.16)); }
      }
    }
    // reference look: chunky lobes, each one cyan at the rim, pale inside, with a white cap toward the top-left;
    // back lobes first so every front lobe's white cap reads against the cyan of the lobe behind it
    blobs.sort((a, b) => a[1] - b[1]);
    const lobe = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) s.px(x, y, c); } };
    // lobes high in the cloud catch the light (big white cap); low lobes stay pale cyan, so the cloud reads as one mass
    for (const b of blobs) {
      const cx = b[0], cy = b[1], r = b[2], ry = r * 0.86, f = Math.min(1, Math.max(0, (cy - ry * 0.3) / h));
      lobe(cx, cy, r, ry, '#a8e8fa');
      lobe(cx - r * 0.05, cy - ry * 0.1, r * 0.92, ry * 0.86, '#c8f3fd');
      if (f < 0.85) lobe(cx - r * 0.1, cy - ry * 0.2, r * (0.86 - f * 0.4), ry * (0.74 - f * 0.4), '#e6fbff');
      if (f < 0.6) lobe(cx - r * 0.12, cy - ry * 0.3, r * (0.74 - f * 0.7), ry * (0.6 - f * 0.6), '#ffffff');
    }
    // flat cyan underside, like the reference banks
    for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) { if (s.at(x, y)) { s.px(x, y, '#9ee2f6'); break; } }
    return s.canvas();
  }
  function makeMini(seed, rx, deco) {
    const R = RNG(seed), w = rx * 2 + 8, top = deco === 'tree' ? 20 : 14, depth = Math.round(rx * 1.25) + 4, h = top + depth + 10, s = new Spr(w, h), cx = Math.round(w / 2);
    const STR = ['#9a6a44', '#7d5236', '#62402a', '#4a2e1e'];
    for (let x = -rx; x <= rx; x++) {
      const u = x / rx, d = Math.max(2, Math.pow(1 - u * u, 0.75) * depth + R() * 2 - 1);
      for (let y = 0; y < d; y++) { const f = y / d; let c = y < 2 ? '#4f9d39' : STR[Math.min(3, Math.floor(f * 4))]; if (y >= 2 && R() < 0.06) c = R() < 0.5 ? '#c49a6c' : '#34200f'; s.px(cx + x, top + y, c); }
      if (R() < 0.12 && Math.abs(u) < 0.8) { const L = 2 + (R() * 5 | 0); for (let j = 0; j < L; j++) s.px(cx + x, top + Math.round(d) + j, j < L - 1 ? '#6a4a30' : '#8a6a48'); }
      if (R() < 0.1 && Math.abs(u) < 0.9) { const L = 2 + (R() * 4 | 0); for (let j = 0; j < L; j++) s.px(cx + x, top + 2 + j, '#3f8a35'); }
    }
    for (let y = -2; y <= 1; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / 2.6) * (y / 2.6)))); s.rect(cx - hw, top + y, hw * 2 + 1, 1, y < -1 ? '#b4e231' : y < 1 ? '#8fd03a' : '#6cbb3c'); }
    for (let x = -rx + 1; x < rx; x += 2) if (R() < 0.5) s.px(cx + x, top - 3, '#d2f05a');
    if (rx >= 6) { const gx = cx + Math.round((R() - 0.5) * rx), gy = top + Math.round(depth * 0.45); s.rect(gx, gy, 2, 2, ['#7af0ff', '#c08cff', '#ff9ad5'][(R() * 3) | 0]); s.px(gx, gy, '#ffffff'); }
    if (deco === 'tree') { const tx = cx - Math.round(rx * 0.3); s.rect(tx, top - 8, 2, 7, '#7a4f34'); s.ell(tx + 1, top - 11, 5, 4.2, '#4fa83f'); s.ell(tx - 0.5, top - 12.5, 3, 2.4, '#6cc24a'); s.px(tx - 1, top - 14, '#9ad85e'); s.ell(cx + Math.round(rx * 0.45), top - 3, 2.6, 2, '#3f9440'); }
    else if (deco === 'bush') { s.ell(cx - 1, top - 3.5, 3.6, 2.8, '#4fa83f'); s.ell(cx - 2, top - 4.5, 2, 1.4, '#6cc24a'); s.px(cx + 3, top - 4, '#ff8fb1'); s.px(cx + 3, top - 3, '#3f8a35'); }
    else { s.px(cx - 2, top - 4, '#fff3a0'); s.px(cx - 2, top - 3, '#3f8a35'); s.px(cx + 1, top - 5, '#ff8fb1'); s.rect(cx + 1, top - 4, 1, 2, '#3f8a35'); s.rect(cx + 3, top - 3, 2, 1, '#9aa0b0'); }
    s.outline('#2e1c12');
    return s.canvas();
  }
  function makeRock(seed, r, grassy) {
    const R = RNG(seed), w = Math.ceil(r * 2 + 4), h = Math.ceil(r * 1.8 + 8), s = new Spr(w, h), cx = w / 2, top = 3;
    for (let x = 0; x < w; x++) {
      const u = (x - cx + 0.5) / r; if (Math.abs(u) > 1) continue;
      const d = Math.pow(1 - u * u, 0.6) * r * 1.5 + R() * 1.5;
      for (let y = 0; y < d; y++) s.px(x, top + y, (y < 1 && grassy) ? '#5aa83b' : y < d * 0.4 ? '#9a6a44' : y < d * 0.75 ? '#7a5034' : '#5c3a26');
    }
    if (grassy) for (let x = Math.ceil(cx - r * 0.8); x < cx + r * 0.8; x++) { s.px(x, top - 1, '#86cc4b'); if (R() < 0.3) s.px(x, top - 2, '#6cbf45'); }
    s.outline('#2e1c12');
    return s.canvas();
  }
  function balloonS() {
    const s = new Spr(13, 18);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 13; x++) {
      const dx = (x - 6) / 5.6, dy = (y - 5) / 5.4;
      if (dx * dx + dy * dy <= 1 || (y >= 8 && Math.abs(x - 6) <= 4 - (y - 8) * 1.3)) s.px(x, y + 1, (Math.floor((x + 1) / 3) % 2) ? '#fff3dc' : '#ff7a6b');
    }
    s.shade({ '#ff7a6b': ['#d9544a', '#ff9f92'], '#fff3dc': ['#e9d6b4', null] });
    s.px(4, 12, '#6b4a3a'); s.px(8, 12, '#6b4a3a'); s.px(4, 13, '#6b4a3a'); s.px(8, 13, '#6b4a3a');
    s.rect(4, 14, 5, 2, '#a8744a');
    s.outline(P.K);
    return s.canvas();
  }
  function makeRainbow(W, H, cx, cy, R0) {
    const c = mk(W, H), x = c.getContext('2d');
    const cols = ['#ff5a5a', '#ffa04a', '#ffe45a', '#6ed36a', '#5ab4ff', '#6a6aff', '#b46aff'], bw = Math.max(2, Math.round(R0 / 40));
    for (let y = Math.max(0, Math.floor(cy - R0)); y <= Math.min(H - 1, cy); y++) for (let xx = Math.max(0, Math.floor(cx - R0)); xx <= Math.min(W - 1, Math.ceil(cx + R0)); xx++) {
      const d = Math.sqrt((xx - cx) * (xx - cx) + (y - cy) * (y - cy)), b = Math.floor((R0 - d) / bw);
      if (b >= 0 && b < 7) { x.fillStyle = cols[b]; x.fillRect(xx, y, 1, 1); }
    }
    return c;
  }


  /* ---------- pixel style filters (opts.style) ---------- */
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const lumA = (d, w, h) => { const L = new Float32Array(w * h); for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114; return L; };
  const put = (d, j, c) => { d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; };
  const isSky = (r, g, b, l) => b > r + 40 && l > 110;   // the sky and its tint: kept flat so UI text on it stays readable
  const STYLES = {
    // blueprint: flat navy sky with a 16 px grid; island, trees, props become cyan contour lines over 3 flat navy fills
    blueprint(d, w, h) {
      const L = lumA(d, w, h), BG = rgb('#0c2440'), GR = rgb('#163a60'), F = [rgb('#123058'), rgb('#1a4272'), rgb('#255a94')], LN = rgb('#9fe0ff'), HI = rgb('#ffffff');
      const band = (i) => { const j = i * 4, l = L[i]; if (isSky(d[j], d[j + 1], d[j + 2], l)) return -1; return l > 215 ? 3 : l > 140 ? 0 : l > 80 ? 1 : 2; };
      const B = new Int8Array(w * h); for (let i = 0; i < B.length; i++) B[i] = band(i);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 4, b0 = B[i];
        const br = x + 1 < w ? B[i + 1] : b0, bd = y + 1 < h ? B[i + w] : b0;
        if (b0 !== br || b0 !== bd) { put(d, j, (b0 === 3 || br === 3 || bd === 3) ? HI : LN); continue; }
        if (b0 === -1 || b0 === 3) { put(d, j, (x % 16 === 0 || y % 16 === 0) ? GR : BG); continue; }
        put(d, j, F[b0]);
      }
    },
    // 1-bit: ink on paper. Sky and clouds stay paper (clouds keep an ink outline); the island is ordered-dithered; her sweater is the one colour
    onebit(d, w, h) {
      const L = lumA(d, w, h), P = rgb('#f2eee5'), K = rgb('#1b1b1a'), A = rgb('#ff5a1f');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 4, r = d[j], g = d[j + 1], b = d[j + 2], l = L[i];
        if (r > 200 && g > 150 && b < 110 && r - b > 120) { put(d, j, A); continue; }
        const sky = isSky(r, g, b, l), cloud = l > 228;
        if (sky || cloud) {
          const lr = x + 1 < w ? L[i + 1] : l, ld = y + 1 < h ? L[i + w] : l;
          put(d, j, (Math.abs(l - lr) > 45 || Math.abs(l - ld) > 45) ? K : P); continue;
        }
        const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 * 255;
        put(d, j, l * 1.2 > th ? P : K);
      }
    },
    // green phosphor CRT: 4 greens, darker every other line, a slow rolling bright band
    phosphor(d, w, h, t) {
      const G = [rgb('#04140a'), rgb('#0d3b1c'), rgb('#1f7a3a'), rgb('#58d36e'), rgb('#c8ffcf')], band = ((t * 18) % (h + 40)) - 20;
      for (let y = 0; y < h; y++) {
        const dim = (y & 1) ? 0.72 : 1, roll = Math.abs(y - band) < 6 ? 1.18 : 1;
        for (let x = 0; x < w; x++) {
          const j = (y * w + x) * 4, l = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) * roll;
          const c = G[l > 225 ? 4 : l > 165 ? 3 : l > 105 ? 2 : l > 50 ? 1 : 0];
          d[j] = c[0] * dim; d[j + 1] = c[1] * dim; d[j + 2] = c[2] * dim; d[j + 3] = 255;
        }
      }
    },
    // synth night: everything posterised onto a 6-step violet ramp, warm lights pop in hot pink, cool lights in cyan
    synth(d, w, h) {
      const R = ['#0e0820', '#24104a', '#45207a', '#7a3db0', '#c070e0', '#ffd6ff'].map(rgb), PK = rgb('#ff3d9a'), CY = rgb('#47f3ff');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const j = (y * w + x) * 4, r = d[j], g = d[j + 1], b = d[j + 2], l = r * 0.299 + g * 0.587 + b * 0.114, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn > 90 && l > 120) { put(d, j, r > b ? PK : CY); continue; }
        const th = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 30;
        put(d, j, R[Math.max(0, Math.min(5, Math.floor((l + th) / 43)))]);
      }
    },
    // risograph: cream paper, sky left blank, clouds as a blue outline; island in blue dot grain + a mis-registered fluoro-pink plate
    riso(d, w, h) {
      const L = lumA(d, w, h), src = new Uint8ClampedArray(d), P = rgb('#f4efe3'), BL = [38, 77, 216], PK = [255, 72, 128];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 4, r = src[j], g = src[j + 1], b = src[j + 2], l = L[i];
        let blue = 0, pink = 0;
        if (isSky(r, g, b, l) || l > 228) {
          const lr = x + 1 < w ? L[i + 1] : l, ld = y + 1 < h ? L[i + w] : l;
          blue = (Math.abs(l - lr) > 45 || Math.abs(l - ld) > 45) ? 1 : 0;
        } else {
          const k2 = ((y + 1 < h ? y + 1 : y) * w + (x + 1 < w ? x + 1 : x)) * 4;
          const warm = Math.max(0, (src[k2] - src[k2 + 2]) * 0.9 + (src[k2] - src[k2 + 1]) * 0.3);
          const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
          blue = (1 - l / 255) * 1.15 > th ? 1 : 0; pink = warm / 160 > th ? 1 : 0;
        }
        let R = P[0], G = P[1], Bb = P[2];
        if (blue) { R = R * BL[0] / 255; G = G * BL[1] / 255; Bb = Bb * BL[2] / 255; }
        if (pink) { R = R * PK[0] / 255; G = G * PK[1] / 255; Bb = Bb * PK[2] / 255; }
        d[j] = R; d[j + 1] = G; d[j + 2] = Bb; d[j + 3] = 255;
      }
    }
  };

  let SP = null;
  function sprites(C) {
    if (SP) return Object.assign({}, SP, girlSprites(C || outfit()));
    const walk = [0, 1, 2, 3].map(corgiWalk), sit = [0, 1].map(corgiSit), lie = [false, true].map(corgiLie), bun = [bunS(false), bunS(true)];
    SP = {
      coffee: coffeeS(), mail: [mailS(false), mailS(true)], chair: chairS(), desk: deskS(), speaker: speakerS(), umb: umbS(),
      corgi: { walk, sit, lie }, corgiL: { walk: walk.map(flipC), sit: sit.map(flipC), lie: lie.map(flipC) }, bun, bunL: bun.map(flipC),
      note: noteS(), heart: heartS(), bang: bangS(), z: zS(), arrow: arrowS(), sun: sunS(false), sunLow: sunS(true), moon: moonS(), balloon: balloonS()
    };
    return Object.assign({}, SP, girlSprites(C || outfit()));
    return SP;
  }

  /* ---------- chiptune ---------- */
  const _ = null;
  const CH = { C: [48, [60, 64, 67]], Am: [45, [57, 60, 64]], F: [41, [53, 57, 60]], G: [43, [55, 59, 62]] };
  const DAY = [76, _, 79, _, 84, _, 79, _, 81, _, 79, _, 76, _, 74, _,
    72, _, 76, _, 81, _, _, _, 79, _, 76, _, 72, _, 74, _,
    77, _, 81, _, 84, _, 81, _, 79, _, 77, _, 76, _, 77, _,
    79, _, _, _, 83, _, 86, _, _, _, 83, _, 79, _, _, _];
  const DAY_END = [79, _, 77, _, 76, _, 74, _, 72, _, _, _, _, _, _, _];
  const NIGHT = [69, _, 72, _, 76, _, _, _, 74, _, 72, _, 71, _, _, _,
    69, _, _, _, 65, _, 69, _, 72, _, _, _, _, _, _, _,
    67, _, 72, _, 76, _, _, _, 79, _, 76, _, 74, _, _, _,
    74, _, _, _, 71, _, _, _, 67, _, _, _, _, _, _, _];
  const NIGHT_END = [71, _, _, _, 72, _, _, _, 69, _, _, _, _, _, _, _];
  const SONGS = [
    { name: 'Meadow Day', bpm: 116, wave: 'p25', vol: 0.16, arp: 0.035, bass: 0.2, drums: true, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], notes: DAY.concat(DAY.slice(0, 48), DAY_END) },
    { name: 'Firefly Lullaby', bpm: 84, wave: 'p12', vol: 0.14, arp: 0.03, bass: 0.17, drums: false, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'], notes: NIGHT.concat(NIGHT.slice(0, 48), NIGHT_END) }
  ];
  // the bark recording (two barks, mp3) is inlined so it plays wherever the scene is embedded, with no URL to resolve
  const BARK_B64 = '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KzH2RIlrnebj8kISrbRfYrH+akWxsZUKetU2UwxiIDh2RFnmKB+tnda3/3W/Jf6LKmzX5FbkLGOrLLIqe4iZAAKAfpAfx06iPq3ygS0INiByC6qxVroOqQfnlmTwYOUteSrkWeasskPR/O7qqvWb8xu0+a2HeIMuUxkQ973uyKXr/St////+nt/ft5V/+1/su3rW3uslKJmu6lV6lIzG//tixJEADKCTLUwYbsF0EqUo8w4YfW8yPRwztIAATK0UZS5NFICHIWTpyXIhIhoakxY8UnAUZqQZG2cTVmzbUgokOiUaGqFA0eiWoKIZtzrcivf79/6nSXwVfxp3/ZqnishDrg6SlQVdztJYSkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqoAZb0hUIUENOTBQoJ0MmUMGBhlwqKcVEhqVFBb4qRAIVFRViMVFBaoWS5ILC7KQWFRHMhMVDPxCKCz8WxYXFdfWz+oXwEEhUM1TEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7YMSoggzF1SEsGE+BRwtiiMeMMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7YMSsA8kMKObhBGBgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
  const Music = {
    ctx: null, out: null, fx: null, waves: null, noise: null, playing: false, timer: 0, step: 0, next: 0, song: 0, pending: null, t0: 0,
    init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC();
      this.out = this.ctx.createGain(); this.out.gain.value = 0; this.out.connect(this.ctx.destination);
      this.fx = this.ctx.createGain(); this.fx.gain.value = 0.5; this.fx.connect(this.ctx.destination);
      const pulse = (d) => { const n = 64, re = new Float32Array(n), im = new Float32Array(n); for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * d); return this.ctx.createPeriodicWave(re, im); };
      this.waves = { p25: pulse(0.25), p12: pulse(0.125), p50: pulse(0.5) };
      const len = Math.floor(this.ctx.sampleRate * 0.3), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      return true;
    },
    tone(midi, t, dur, wave, vol) {
      const c = this.ctx, o = c.createOscillator(), gn = c.createGain();
      if (wave === 'tri') o.type = 'triangle'; else o.setPeriodicWave(this.waves[wave]);
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      const sus = Math.max(t + 0.06, t + dur * 0.8), end = Math.max(sus + 0.03, t + dur);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      gn.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.05); gn.gain.setValueAtTime(vol * 0.55, sus); gn.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(gn); gn.connect(this.out); o.start(t); o.stop(end + 0.02);
    },
    hit(kind, t, vol) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = this.noise;
      if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); }
      else { f.type = 'bandpass'; f.frequency.value = 1800; gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); }
      s.connect(f); f.connect(gn); gn.connect(this.out); s.start(t); s.stop(t + 0.15);
    },
    kick(t, vol) {
      const c = this.ctx, o = c.createOscillator(), gn = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(gn); gn.connect(this.out); o.start(t); o.stop(t + 0.18);
    },
    sched() {
      const c = this.ctx;
      while (this.next < c.currentTime + 0.15) {
        const song = SONGS[this.song], spb = 60 / song.bpm / 4, L = song.notes.length;
        const i = this.step % L, bar = Math.floor(i / 16), s16 = i % 16, ch = CH[song.chords[bar]], t = this.next;
        const n = song.notes[i];
        if (n != null) { let len = 1; while (len < 6 && song.notes[(i + len) % L] == null) len++; this.tone(n, t, len * spb * 0.92, song.wave, song.vol); }
        this.tone(ch[1][s16 % 3] + (s16 % 6 >= 3 ? 12 : 0), t, spb * 0.8, 'p12', song.arp);
        if (s16 % 2 === 0) this.tone(ch[0] + (s16 % 4 === 2 ? 12 : 0), t, spb * 1.8, 'tri', song.bass);
        if (song.drums) { if (s16 % 8 === 0) this.kick(t, 0.45); if (s16 % 4 === 2) this.hit('hat', t, 0.1); if (s16 === 4 || s16 === 12) this.hit('snare', t, 0.14); }
        else if (s16 % 8 === 4) this.hit('hat', t, 0.05);
        this.next += spb; this.step++;
        if (this.step % L === 0 && this.pending != null) { this.song = this.pending; this.pending = null; this.step = 0; this.t0 = this.next; }
      }
    },
    start(song) {
      if (!this.init()) return false;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.playing) return true;
      this.song = song || 0; this.pending = null; this.step = 0; this.next = this.ctx.currentTime + 0.06; this.t0 = this.next;
      this.out.gain.cancelScheduledValues(this.ctx.currentTime); this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime); this.out.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.1);
      this.timer = setInterval(() => this.sched(), 25); this.playing = true;
      return true;
    },
    stop() {
      if (!this.playing) return;
      clearInterval(this.timer); this.playing = false; this.pending = null;
      const t = this.ctx.currentTime; this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(0, t + 0.12);
    },
    want(i) { if (!this.playing) return; this.pending = i === this.song ? null : i; },
    phase() { if (!this.playing) return 0; const p = (this.ctx.currentTime - this.t0) * SONGS[this.song].bpm / 60; return p < 0 ? 0 : p % 1; },
    blip(f0, f1, t, d, wave, vol) {
      const c = this.ctx, o = c.createOscillator(), gn = c.createGain();
      o.setPeriodicWave(this.waves[wave]); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
      gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(this.fx); o.start(t); o.stop(t + d + 0.02);
    },
    // one "woof": a low pulse that drops in pitch, a bright overtone, and a puff of noise on the attack
    woof(t) {
      this.blip(420, 230, t, 0.11, 'p50', 0.34); this.blip(980, 520, t, 0.06, 'p25', 0.12);
      const c = this.ctx, n = c.createBufferSource(), gn = c.createGain(); n.buffer = this.noise;
      gn.gain.setValueAtTime(0.16, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.connect(gn); gn.connect(this.fx); n.start(t); n.stop(t + 0.06);
    },
    // water splash: a filtered noise burst that opens then closes (the "whoosh"), plus a few pitched droplets ("plink") landing after it
    splash(t) {
      const c = this.ctx;
      const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.06); bp.frequency.exponentialRampToValueAtTime(900, t + 0.42);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      n.connect(bp); bp.connect(g); g.connect(this.fx); n.start(t); n.stop(t + 0.5);
      const drops = [[0.16, 1900, 0.5], [0.24, 2600, 0.4], [0.31, 1500, 0.45], [0.4, 2200, 0.3]];
      drops.forEach(([dt, f, v]) => {
        const o = c.createOscillator(), og = c.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(f * 0.6, t + dt); o.frequency.exponentialRampToValueAtTime(f, t + dt + 0.04);
        og.gain.setValueAtTime(0.0001, t + dt); og.gain.exponentialRampToValueAtTime(0.18 * v, t + dt + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.16);
        o.connect(og); og.connect(this.fx); o.start(t + dt); o.stop(t + dt + 0.2);
      });
    },
    rain(t, dur) {
      const c = this.ctx;
      const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.4;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.35); g.gain.setValueAtTime(0.22, t + dur - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.fx); n.start(t); n.stop(t + dur + 0.05);
      for (let i = 0; i < 28; i++) {                       // individual drops: tiny high clicks scattered through the shower
        const dt = 0.2 + Math.random() * (dur - 0.5), d = 0.015 + Math.random() * 0.02;
        const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.value = 3000 + Math.random() * 4000;
        og.gain.setValueAtTime(0.0001, t + dt); og.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, t + dt + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
        o.connect(og); og.connect(this.fx); o.start(t + dt); o.stop(t + dt + d + 0.01);
      }
    },
    rustle(t) {
      const c = this.ctx;
      for (let i = 0; i < 7; i++) {                       // 7 short overlapping bursts, slightly different pitch each, fading over ~0.6s
        const dt = i * 0.07 + Math.random() * 0.03, d = 0.09 + Math.random() * 0.08, f = 2600 + Math.random() * 2400;
        const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.4;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
        const g = c.createGain(); const v = 0.26 * (1 - i / 9);
        g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(v, t + dt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
        n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.fx); n.start(t + dt); n.stop(t + dt + d + 0.02);
      }
    },
    sfx(kind) {
      // the bark is a user click, so it may create / resume the audio context on its own (music can stay off)
      if (kind === 'bark') {
        // 1) <audio> with the inlined clip, started synchronously inside the click gesture
        // 2) fallback: Web Audio with the same clip (context created / resumed in the gesture)
        // 3) last resort: the synthesised woof
        const synth = () => { const go = () => { const t = this.ctx.currentTime + 0.01; this.woof(t); this.woof(t + 0.24); }; if (!this.init()) return; if (this.ctx.state === 'running') go(); else if (this.ctx.resume) this.ctx.resume().then(go, () => {}); };
        const wa = () => {
          if (!this.init()) return synth();
          const play = () => { const src = this.ctx.createBufferSource(); src.buffer = this.barkBuf; const gn = this.ctx.createGain(); gn.gain.value = 0.9; src.connect(gn); gn.connect(this.ctx.destination); src.start(); };
          const ready = () => { if (this.barkBuf) return play(); const bin = atob(BARK_B64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); this.ctx.decodeAudioData(u8.buffer, (b) => { this.barkBuf = b; play(); }, synth); };
          if (this.ctx.state === 'running') ready(); else if (this.ctx.resume) this.ctx.resume().then(ready, synth); else synth();
        };
        try {
          if (!this.barkEl) { this.barkEl = new Audio('data:audio/mpeg;base64,' + BARK_B64); this.barkEl.preload = 'auto'; this.barkEl.volume = 0.9; }
          const a = this.barkEl; a.currentTime = 0;
          const pr = a.play(); if (pr && pr.catch) pr.catch(wa);
        } catch (e) { wa(); }
        return;
      }
      if (kind === 'rain') {     // cloud click: a 2.6s shower — steady filtered noise swelling in and out, with scattered drop ticks
        if (!this.init()) return;
        const go = () => this.rain(this.ctx.currentTime + 0.01, 2.6);
        if (this.ctx.state === 'running') go(); else if (this.ctx.resume) this.ctx.resume().then(go, () => {});
        return;
      }
      if (kind === 'rustle') {   // tree click: leaves rustling — layered bursts of high-passed noise with a slight crackle, like a hand through foliage
        if (!this.init()) return;
        const go = () => this.rustle(this.ctx.currentTime + 0.01);
        if (this.ctx.state === 'running') go(); else if (this.ctx.resume) this.ctx.resume().then(go, () => {});
        return;
      }
      if (kind === 'splash') {   // pond click: a click is a user gesture, so the audio context may start here too
        if (!this.init()) return;
        const go = () => this.splash(this.ctx.currentTime + 0.01);
        if (this.ctx.state === 'running') go(); else if (this.ctx.resume) this.ctx.resume().then(go, () => {});
        return;
      }
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime + 0.01;
      if (kind === 'pop') this.blip(1200, 1800, t, 0.06, 'p25', 0.1);
      else if (kind === 'boing') this.blip(300, 900, t, 0.15, 'p25', 0.1);
      else if (kind === 'click') this.blip(1500, 1500, t, 0.03, 'p50', 0.07);
    }
  };

  /* ---------- the scene ---------- */
  function mount(canvas, opts) {
    opts = opts || {};
    const layout = opts.layout || 'meadow';
    const KF = opts.vivid ? KFV : KFN;
    const FLAT = opts.sky === 'none'; CLOUD_FLAT = FLAT;
    const g = canvas.getContext('2d');
    const host = canvas.parentElement || canvas;
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const M = reduce ? 0.35 : 1;
    const SPR = sprites(outfit(opts.outfit));
    let W = 480, H = 270, k = 3, S = null;
    // the scene keeps its chunky low-res pixels, but moving things are placed on the real
    // (k-times finer) screen grid, so drifting clouds and the floating island glide instead of stepping
    const q = (v) => Math.round(v * k) / k;
    let layer = mk(W, H), lg = layer.getContext('2d'), mask = mk(W, H), mg = mask.getContext('2d');
    const skyC = { c: mk(W, H), key: '' };
    const st = { hour: opts.hour != null ? opts.hour : 12.5, target: null, weather: opts.weather || 'sun', rain: 0, rainbow: 0, lamp: true, auto: false, t: 0, hinted: false, steamT: 0, noteT: 0, zT: 0, autoT: 0, mistT: 0, hl: null, hlT: null };
    st.rain = st.weather === 'rain' ? 1 : 0; st.rainbow = st.weather === 'rainbow' ? 1 : 0;
    const parts = [], drops = [];
    let hits = [];
    const girl = { wave: 0, frame: 0, ft: 0, typing: true, burst: 3, blink: 0, nextBlink: 2.5, mode: 'work', gx: 0, dir: 1, wf: 0, wft: 0, q: [], act: null, at: 0, routineT: reduce ? 1e9 : (opts.routineIn != null ? opts.routineIn : 14), sip: 0 };
    const fx = { ripples: [], fish: null, shoot: null, shootT: 5, mailUp: 0, lantern: true, say: null, sayI: 0 };
    // what the character says when clicked: the role line first, then friendly small talk (cycles)
    const WAVES = ['Hi! Nice to meet you.', 'Hello there!', 'Thanks for visiting!'];
    const LINES = opts.lines || ['Product Designer · Saigon · 13+ years', 'Hi there! Welcome to my little island.', 'Hope your day is going well!', 'Want a coffee? I just made one.', 'Psst… try clicking the clouds.', 'Thanks for stopping by!'];
    const corgi = { x: 0, dir: 1, mode: 'sit', timer: 3, tx: 0, ft: 0, f: 0, sleep: false, shelter: false };
    const rab = { on: false, x: 0, t: 0, next: 1e9, air: 0, leap: false, jump: 0, ltr: true, seen: false };
    let flies = [], fireflies = [];
    let raf = 0, last = 0, visible = true, alive = true, lastNotify = '';

    // sky:'none' — the page itself is the sky: one flat colour per hour (lavender by day, peach at dusk, deep indigo at night)
    const PAGE_KF = [[0, '#16132B'], [5.2, '#1C1834'], [6.6, '#EADCEC'], [8.5, '#F4F2FC'], [15, '#F4F2FC'], [17, '#FBE9E2'], [18.4, '#EFD3DD'], [19.4, '#3A3058'], [20.6, '#16132B'], [24, '#16132B']];
    function pageColor(h, rain) {
      let a = PAGE_KF[0], b = PAGE_KF[PAGE_KF.length - 1];
      for (let i = 0; i < PAGE_KF.length - 1; i++) if (h >= PAGE_KF[i][0] && h <= PAGE_KF[i + 1][0]) { a = PAGE_KF[i]; b = PAGE_KF[i + 1]; break; }
      let c = mixc(hx(a[1]), hx(b[1]), (h - a[0]) / Math.max(0.0001, b[0] - a[0]));
      const L0 = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
      if (rain > 0.001) c = mixc(c, L0 > 0.5 ? hx('#E3E2EC') : hx('#1A1A26'), rain * 0.7);
      const L = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
      return { color: css(c), dark: L < 0.45 };
    }
    function palette(h, rain, dk) {
      let a = KF[0], b = KF[KF.length - 1];
      for (let i = 0; i < KF.length - 1; i++) if (h >= KF[i][0] && h <= KF[i + 1][0]) { a = KF[i]; b = KF[i + 1]; break; }
      const t = (h - a[0]) / Math.max(0.0001, b[0] - a[0]);
      let top = mixc(a[1], b[1], t), mid = mixc(a[2], b[2], t), bot = mixc(a[3], b[3], t), tint = mixc(a[4], b[4], t);
      if (rain > 0.001) {
        const gT = mixc(hx('#7d8798'), hx('#171b2c'), dk), gB = mixc(hx('#aeb6c2'), hx('#262c40'), dk), r = rain * 0.78;
        top = mixc(top, gT, r); mid = mixc(mid, mixc(gT, gB, 0.5), r); bot = mixc(bot, gB, r);
        tint = mixc(tint, mixc(hx('#a3abbc'), hx('#4a5590'), dk), rain * 0.6);
      }
      return { top, mid, bot, tint };
    }

    /* ---- island arrangements: where the desk, speaker, pond/waterfall, lantern and trees sit (fractions of the island half-width) ---- */
    const ARR = {
      classic: { desk: -30, spk: 66, pond: 0.6, lantern: -0.36, corgi: -80, trees: [[-1, 30, 1, 17, 'willow'], [1, -26, -1, 15, 'autumn'], [1, -54, -7, 9, 'pine'], [-1, 60, 7, 7, 'flower'], [1, -50, 8, 6, 'flower'], [0, 64, -8, 6, 'berry'], [0, -40, -9, 5, 'flower']] },
      // terrace: desk on the right under the blossom, waterfall on the left, the corgi has the open lawn in the middle
      terrace: { desk: -30, spk: 66, pond: -0.56, lantern: -0.2, corgi: -60, trees: [[1, -30, -2, 22, 'blossom'], [-1, 30, 0, 18, 'willow'], [-1, 90, -3, 10, 'banana'], [0, 92, 8, 11, 'orangebush']] },   // big cherry, big-ish willow, small banana
      // grove: desk dead centre under one big fruit tree, pines either side, pond and fall at the far right, lantern at the far left
      grove: { desk: -14, spk: 60, pond: 0.72, lantern: -0.82, corgi: -70, trees: [[0, 6, -14, 22, 'fruit'], [-1, 26, 2, 10, 'pine'], [-1, 54, -4, 8, 'pine'], [1, -26, 1, 9, 'pine'], [1, -62, 8, 6, 'berry'], [-1, 80, 8, 5, 'bush']] },
      // meadow: desk far left, a wide empty lawn, the pond in the centre-right, a tree cluster on the right edge
      meadow: { desk: -80, spk: 66, pond: 0.34, lantern: -0.24, corgi: 4, trees: [[1, -22, -1, 16, 'blossom'], [1, -46, -8, 11, 'round'], [1, -70, 6, 8, 'berry'], [-1, 20, 9, 6, 'bush'], [0, -40, -7, 5, 'bush'], [1, -96, 9, 5, 'bush']] }
    };
    const A = ARR[opts.arrange] || ARR.terrace;   // the chosen arrangement

    /* ---- layout ---- */
    function buildScene() {
      const R = RNG(opts.seed || 11);
      const s = {};
      s.cx = clamp(Math.round(W * (opts.focusX != null ? opts.focusX : 0.5)), 52, W - 52);
      if (layout === 'island') { s.hY = Math.round(H * 0.72); s.Y0 = s.hY + 3; s.iw = Math.round(clamp(W * (opts.islandW || 0.7), 190, 340)); if (opts.islandY) { s.hY = Math.round(H * opts.islandY); s.Y0 = s.hY + 3; } }
      else if (layout === 'river') { s.hY = Math.round(H * 0.58); s.rT = s.hY + 12; s.rB = s.hY + 32; s.Y0 = Math.max(s.rB + 30, Math.round(H * 0.84)); }
      else if (layout === 'hill') { s.hY = Math.round(H * 0.86); s.Y0 = s.hY - 20; }
      else { s.hY = Math.round(H * 0.67); s.Y0 = Math.min(H - 24, Math.round(H * 0.885)); }
      s.bodyX = s.cx + A.desk; s.bodyY = s.Y0 - 34; s.deskX = s.bodyX + 12; s.deskY = s.Y0 - 40;
      s.spkX = s.bodyX + A.spk; s.spkY = s.Y0 - 21; s.umbX = s.bodyX + 32; s.umbOpen = 0;
      s.cY = s.Y0 + 5;
      if (layout === 'island') {
        const rx = s.iw / 2;
        s.cMin = s.cx - rx + 12; s.cMax = s.cx + rx - 42; s.rY = s.hY - 2; s.rMin = s.cx - rx + 10; s.rMax = s.cx + rx - 26;
      } else if (layout === 'hill') {
        s.hill = { cx: s.cx, rx: Math.min(170, W * 0.48), ry: 40 }; s.hill.cy = s.Y0 - 1 + s.hill.ry;
        s.cMin = s.cx - s.hill.rx * 0.55; s.cMax = s.cx + s.hill.rx * 0.55 - 30; s.rY = Math.min(s.hY + 16, H - 6); s.rMin = -20; s.rMax = W + 20;
      } else {
        s.cMin = Math.max(4, s.cx - 130); s.cMax = Math.min(W - 32, s.cx + 140); s.rY = Math.min(s.Y0 + 15, H - 4); s.rMin = -20; s.rMax = W + 20;
      }
      if (layout === 'river') {
        s.rTop = []; s.rBot = [];
        for (let x = 0; x < W; x++) { s.rTop.push(s.rT + Math.round(Math.sin(x * 0.021) * 1.6 + Math.sin(x * 0.007 + 2) * 1.2)); s.rBot.push(s.rB + Math.round(Math.sin(x * 0.017 + 1) * 2 + Math.sin(x * 0.05) * 0.8)); }
      }
      S = s;

      // clouds: big ones drift slowly, small ones quickly
      const skyFloat = layout === 'island' ? Math.round(H * 0.42) : Math.max(30, s.hY - 85);
      s.clouds = [];
      const sc = W >= 300 ? 3 : 2;
      const FLOAT = [0, 9, 7, 3, 6, 2, 5, 8], BANK = [1, 7, 2, 10, 9, 0], SEA = [4, 10, 1, 9, 7, 2];
      const nF = opts.calm ? Math.max(2, Math.round(W / 200)) : Math.max(3, Math.round(W / 90));   // calm: a few clear clouds only
      for (let i = 0; i < nF; i++) { const img = refCloud(FLOAT[i % FLOAT.length], sc), w = img.width, h = img.height; s.clouds.push({ img, x: (i + R() * 0.6) / nF * (W + 80) - 40, y: Math.round(10 + R() * Math.max(4, skyFloat - 20)), w, h, v: (5 - w / 30) * (0.6 + R() * 0.3), shower: 0, puff: 0, dropT: 0, sp: sparkSet(R, w, h) }); }
      s.bank = [];
      const bankBase = layout === 'island' ? Math.round(H * 0.56) : s.hY + 6;
      let x = -20 + R() * 30, bi = (R() * BANK.length) | 0;
      while (x < W + 80) {
        const img = refCloud(BANK[bi++ % BANK.length], sc), w = img.width, h = img.height;
        s.bank.push({ img, x, y: bankBase - h + Math.round((R() - 0.5) * 12), back: false, sp: sparkSet(R, w, h) });
        x += Math.round(w * (0.7 + R() * 0.25));
      }
      s.bankSpan = x + 80;
      if (layout === 'island') {
        s.sea = []; let x2 = FLAT ? W + 200 : -60, si = 0;
        while (x2 < W + 80) { const img = refCloud(SEA[si++ % SEA.length], sc), w = img.width, h = img.height; s.sea.push({ img, x: x2, y: H - h + Math.round(h * 0.2) + Math.round(R() * 6), front: si % 2 === 0 }); x2 += Math.round(w * 0.4); }
        s.seaSpan = x2 + 80;
        // 3 small islands drifting around the main one (fewer on narrow screens)
        s.minis = [{ img: makeMini(R() * 1e6, 15, 'tree'), x: W * 0.05, y: H * 0.42, ph: 0 }, { img: makeMini(R() * 1e6, 10, 'bush'), x: W * 0.87, y: H * 0.36, ph: 2.1 }, { img: makeMini(R() * 1e6, 6, 'flowers'), x: W * 0.77, y: H * 0.19, ph: 4.2 }];
        if (opts.calm && W < 320) { s.minis = [{ img: s.minis[0].img, x: W * 0.08, y: H * 0.3, ph: 0 }, { img: s.minis[2].img, x: W * 0.78, y: H * 0.2, ph: 4.2 }]; }
        else if (opts.calm) { const rx = s.iw / 2; s.minis = [{ img: s.minis[0].img, x: s.cx - rx - 64, y: H * 0.5, ph: 0 }, { img: s.minis[2].img, x: s.cx + rx + 40, y: H * 0.6, ph: 4.2 }]; }   // calm: two small islets hugging the main one
        else if (W < 300) { s.minis = s.minis.slice(1); s.minis[0].x = W * 0.02; s.minis[0].y = H * 0.4; s.minis[1].x = W * 0.8; s.minis[1].y = H * 0.33; }
      }

      // trees
      s.trees = [];
      let flowerN = 0;
      const addTree = (tx, base, r, kind) => { const img = kind === 'banana' ? makeBanana(R() * 1e6, r) : kind === 'flower' ? makeFlowers(FLOWER_KINDS[flowerN++ % 3]) : (kind === 'pinkbush' || kind === 'orangebush') ? makeBloomBush(R() * 1e6, r, kind) : makeTree(R() * 1e6, r, kind); s.trees.push({ img, x: Math.round(tx - img.width / 2), y: base - img.height, ph: R() * 6.28, amp: kind === 'bush' ? 0.6 : 1.2, shake: 0 }); };
      if (layout !== 'island') {
        const gap = layout === 'hill' ? 60 : 84;
        let tx = -6;
        while (tx < W + 6) { const d = Math.abs(tx - s.cx); if (d > gap) { const ef = clamp(d / (W / 2), 0, 1); addTree(tx, s.hY + 3, Math.round(7 + ef * 9 + R() * 5), R() < 0.25 ? 'bush' : 'round'); } tx += Math.round(10 + R() * 14); }
        if (W > 220) { addTree(Math.round(W * 0.04), s.hY + 20, 24 + Math.round(R() * 5), 'round'); addTree(Math.round(W * 0.96), s.hY + 16, 22 + Math.round(R() * 5), 'round'); }
      } else {
        const rx = s.iw / 2;
        const addT = (tx, base, r, kind) => { addTree(tx, base, r, kind); s.trees[s.trees.length - 1].kind = kind; };
        // [edge, dx, dy, r, kind]: edge -1 = from the left rim, 1 = from the right rim, 0 = from the centre
        for (const t of A.trees) addT(s.cx + (t[0] < 0 ? -rx : t[0] > 0 ? rx : 0) + t[1], s.hY + t[2], t[3], t[4] === 'bush' ? 'flower' : t[4]);
      }
      s.trees.sort((a, b) => (a.y + a.img.height) - (b.y + b.img.height));

      s.birds = []; s.birdT = 8;
      if (layout === 'island') {
        const rx = s.iw / 2, top = s.hY;
        s.rocks = []; // small floating rocks/islets removed: only the main island floats
        const addRock = (x, y, r, grassy) => s.rocks.push({ img: makeRock(R() * 1e6, r, grassy), x: Math.round(x), y: Math.round(y), ph: R() * 6.28, amp: 1 + R() * 1.5 });
        s.balloon = opts.calm ? null : { img: SPR.balloon, x: W * 0.22, y: Math.round(H * 0.14) };
        s.plantSpot = [s.cx - Math.round(s.iw * 0.22), s.hY + 6];
        s.cofX = s.cx - 70; s.mailX = s.cx - 108;
        s.chairX = s.bodyX + 12;
      } else if (layout === 'hill') s.plantSpot = [s.cx - 70, s.Y0 + 14];
      else s.plantSpot = [clamp(s.cx - 110, 10, W - 10), Math.min(H - 8, s.Y0 + 10)];

      s.ground = buildGround(R);
      scatter(R);

      s.blades = [];
      if (layout !== 'island') for (let bx = 0; bx < W; bx++) { if (R() > 0.65) continue; const nearGroup = bx > s.bodyX - 6 && bx < s.spkX + 22; const hgt = nearGroup ? 3 + R() * 2 : 3 + R() * 7 + (Math.abs(bx - s.cx) / W) * 10; s.blades.push({ x: bx, h: Math.round(hgt), c: BLADE[(R() * BLADE.length) | 0] }); }

      // high cirrus streaks drifting slowly near the top
      s.cirrus = [];   // (far faded layer removed: the sky keeps only clear clouds)
      // (a far, pale layer of big clouds gives the sky depth behind the drifting ones)
      s.stars = [];
      const skyH = layout === 'island' ? H * 0.55 : s.hY * 0.8;
      for (let i = 0; i < Math.round(W / 6); i++) s.stars.push({ x: (R() * W) | 0, y: (2 + R() * skyH) | 0, ph: R() * 6.28, big: R() < 0.12 });
      s.rainbowC = layout === 'island' ? makeRainbow(W, H, W / 2, Math.round(H * 0.62), Math.min(W * 0.45, H * 0.56)) : makeRainbow(W, H, Math.round(W / 2), s.hY + 20, Math.min(W * 0.45, s.hY * 0.95));

      flies = []; fireflies = [];
      const gy0 = layout === 'island' ? s.hY - 14 : s.hY + 8, gy1 = layout === 'island' ? s.hY + 4 : H - 20;
      const gx0 = layout === 'island' ? s.cx - s.iw / 2 : 0, gx1 = layout === 'island' ? s.cx + s.iw / 2 : W;
      const fc = ['#ffd166', '#ff8fb1', '#ffffff', '#8fd3ff'];
      for (let i = 0; i < 3; i++) flies.push({ x: gx0 + R() * (gx1 - gx0), by: gy0 + R() * (gy1 - gy0), y: 0, t: R() * 10, ph: R() * 6.28, c: fc[i % 4], vx: 0, flee: 0, a: 0 });
      for (let i = 0; i < Math.round(W / 20); i++) fireflies.push({ x: gx0 + R() * (gx1 - gx0), y: (layout === 'island' ? s.hY - 30 : s.hY - 10) + R() * (layout === 'island' ? 40 : (H - s.hY)), t: R() * 10, ph: R() * 6.28, a: 0 });

      corgi.x = clamp(s.cx + A.corgi, s.cMin, s.cMax); corgi.mode = 'sit'; corgi.dir = 1; corgi.timer = 3; corgi.shelter = false;
      rab.on = false;
      drops.length = 0;
    }

    function hillHalf(y) { const h = S.hill, dy = (y - h.cy) / h.ry; return Math.abs(dy) > 1 ? -1 : h.rx * Math.sqrt(1 - dy * dy); }
    function inGround(x, y) {
      if (x < 0 || x >= W || y >= H) return false;
      if (layout === 'island') { const dx = (x - S.cx) / (S.iw / 2 - 3), dy = (y - S.hY) / 10; return dx * dx + dy * dy <= 1; }
      if (layout === 'river') return y > S.hY + 3 && (y < S.rTop[x | 0] - 2 || y > S.rBot[x | 0] + 3);
      if (layout === 'hill') return y > S.hY + 4 || (y > S.Y0 && Math.abs(x - S.cx) < hillHalf(y) - 3);
      return y > S.hY + 3;
    }
    function blocked(x, y) { const x0 = Math.min(S.bodyX, S.spkX - 2), x1 = Math.max(S.bodyX + 60, S.spkX + 18); return x > x0 && x < x1 && y > S.Y0 - 8 && y < S.Y0 + 2; }
    function canPlant(x, y) {
      if (S.pond) { const dx = (x - S.pond.x) / 18, dy = (y - S.pond.y) / 6; if (dx * dx + dy * dy <= 1) return false; }
      return inGround(x, y) && !blocked(x, y);
    }
    function mkFlower(x, y, ty, r) { return { x, y, c: FL[ty][0], mid: FL[ty][1], ph: r * 6.28, grow: 1 }; }

    function scatter(R) {
      S.tufts = []; S.flowers = [];
      const pick = () => { const r = R(); return r < 0.45 ? 0 : r < 0.65 ? 1 : r < 0.78 ? 2 : r < 0.9 ? 3 : 4; };
      const y0 = layout === 'island' ? S.hY - 10 : layout === 'hill' ? S.Y0 : S.hY;
      const y1 = layout === 'island' ? S.hY + 10 : H;
      const area = layout === 'island' ? Math.PI * S.iw / 2 * 10 : W * (H - S.hY);
      const nT = Math.round(area / 110), nF = Math.round(area / 260);
      let guard = 0;
      while (S.tufts.length < nT && guard++ < nT * 8) { const x = (R() * W) | 0, y = (y0 + R() * (y1 - y0)) | 0; if (canPlant(x, y)) S.tufts.push({ x, y, ph: R() * 6.28 }); }
      guard = 0;
      while (S.flowers.length < nF && guard++ < nF * 10) {
        const x0 = R() * W, yc = y0 + R() * (y1 - y0), n = 1 + (R() * 5 | 0), ty = pick();
        for (let i = 0; i < n; i++) { const x = Math.round(x0 + (R() - 0.5) * 16), y = Math.round(yc + (R() - 0.5) * 8); if (canPlant(x, y)) S.flowers.push(mkFlower(x, y, R() < 0.75 ? ty : pick(), R())); }
      }
      S.tufts.sort((a, b) => a.y - b.y); S.flowers.sort((a, b) => a.y - b.y);
    }

    function buildGround(R) {
      const c = mk(W, H), x = c.getContext('2d');
      const fill = (col, X, Y, w, h) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
      const GA = [hx('#8fd24f'), hx('#80c849')], GB = [hx('#4f9d39'), hx('#478f34')];
      const stripes = (y0, y1, x0, x1) => {
        let y = y0, i = 0;
        while (y < y1) {
          const hh = Math.max(2, Math.round(2 + i * 1.25)), d = clamp((y - y0) / Math.max(1, H - y0), 0, 1);
          const A = css(mixc(GA[0], GB[0], d)), B = css(mixc(GA[1], GB[1], d));
          fill(i % 2 ? B : A, x0, y, x1 - x0, Math.min(hh, y1 - y));
          if (y + hh < y1) { x.fillStyle = i % 2 ? A : B; for (let xx = x0 + ((y + hh) & 1); xx < x1; xx += 2) x.fillRect(xx, y + hh - 1, 1, 1); }
          y += hh; i++;
        }
      };
      const specks = (y0, y1, n) => { for (let i = 0; i < n; i++) { const X = (R() * W) | 0, Y = (y0 + R() * (y1 - y0)) | 0; if (!canPlant(X, Y)) continue; fill(R() < 0.5 ? 'rgba(190,240,120,0.55)' : 'rgba(40,110,50,0.35)', X, Y, R() < 0.3 ? 2 : 1, 1); } };
      const mound = (base, amp, fq, ph, col, top) => { for (let xx = 0; xx < W; xx++) { const tp = Math.round(base - amp * (0.5 + 0.5 * Math.sin(xx * fq + ph)) - (Math.sin(xx * fq * 3.1 + ph * 2) > 0.7 ? 1 : 0)); fill(col, xx, tp, 1, base - tp + 1); fill(top, xx, tp, 1, 1); } };
      if (layout !== 'island') {
        stripes(S.hY, H, 0, W);
        mound(S.hY + 1, 7, 0.043, 1.3, '#74b947', '#94d058');
        mound(S.hY + 2, 4, 0.071, 4.1, '#8fd24f', '#b2e46c');
        if (layout === 'hill') {
          const h = S.hill;
          for (let y = Math.ceil(h.cy - h.ry); y <= S.hY + 10; y++) { const hw = Math.round(hillHalf(y)); if (hw < 0) continue; const band = Math.floor((y - (h.cy - h.ry)) / 4); fill(y > S.hY + 5 ? '#5aa83b' : band % 2 ? '#86cc4b' : '#94d455', Math.round(h.cx - hw), y, hw * 2 + 1, 1); }
          for (let xx = -Math.floor(h.rx); xx <= h.rx; xx++) { const yy = Math.round(h.cy - h.ry * Math.sqrt(Math.max(0, 1 - (xx / h.rx) * (xx / h.rx)))); if (yy < S.hY + 2) fill('#b2e46c', Math.round(h.cx + xx), yy, 1, 1); }
        }
        specks(S.hY + 2, H, Math.round(W * (H - S.hY) / 60));
      } else {
        // floating island: layered cliff, gems, vines, roots, pond + waterfall, lantern, fairy lights
        const cx = S.cx, rx = S.iw / 2, ry = 12, top = S.hY, depth = Math.min(72, Math.round(H * 0.22));
        const front = (xx) => top + ry * Math.sqrt(Math.max(0, 1 - ((xx - cx) / rx) * ((xx - cx) / rx)));
        const STRATA = ['#a8744a', '#8f5f3d', '#774d32', '#5f3b27', '#47291b'];
        for (let xx = Math.ceil(cx - rx); xx <= Math.floor(cx + rx); xx++) {
          const u = (xx - cx) / rx, yS = Math.round(front(xx));
          const dpt = Math.max(3, Math.pow(Math.max(0, 1 - u * u), 0.7) * depth + Math.sin(xx * 0.31) * 2.5 + Math.sin(xx * 0.093 + 1) * 4 + (R() * 3 - 1.5));
          const yEnd = Math.round(yS + dpt);
          for (let y = yS; y < yEnd; y++) {
            const f = (y - yS) / dpt + Math.sin(xx * 0.15 + y * 0.05) * 0.04, band = (f - 0.06) / 0.94 * STRATA.length;
            let col = f < 0.06 ? '#3f8a35' : STRATA[clamp(Math.floor(band), 0, STRATA.length - 1)];
            if (f >= 0.06 && (band % 1) < 0.08 && ((xx + y) & 1) === 0) col = '#3a2418';
            if (f >= 0.1 && R() < 0.05) col = R() < 0.5 ? '#c49a6c' : '#34200f';
            fill(col, xx, y, 1, 1);
          }
          if (Math.abs(u) > 0.9) for (let y = yS; y < yEnd; y++) if (R() < 0.6) fill('rgba(30,15,10,0.35)', xx, y, 1, 1);
          fill('#2e1c12', xx, yEnd, 1, 1);
          if (R() < 0.09) { const L = 2 + (R() * 7 | 0); for (let j = 0; j < L; j++) fill(j < L - 1 ? '#6a4a30' : '#8a6a48', xx + (j > 3 && R() < 0.4 ? 1 : 0), yEnd + 1 + j, 1, 1); }
          if (R() < 0.55) fill(R() < 0.5 ? '#5aa83b' : '#3f8a35', xx, yS + 1 + (R() < 0.3 ? 1 : 0), 1, 1);
          if (R() < 0.07 && Math.abs(u) < 0.9) {
            const L = 6 + (R() * 16 | 0);
            for (let j = 0; j < L; j++) { const vx = xx + Math.round(Math.sin(j * 0.5 + xx) * 0.6); fill('#3f8a35', vx, yS + 2 + j, 1, 1); if (j % 3 === 1) fill('#6cbf45', vx + (j % 2 ? 1 : -1), yS + 2 + j, 1, 1); }
            if (R() < 0.5) fill(R() < 0.5 ? '#ff8fb1' : '#fff3a0', xx, yS + 2 + L, 1, 1);
          }
        }
        // more detail: grass that hangs over the rim, moss on the cliff, longer hanging vines
        for (let xx = Math.ceil(cx - rx + 2); xx <= Math.floor(cx + rx - 2); xx++) {
          const yS = Math.round(front(xx)), u = (xx - cx) / rx;
          if (R() < 0.16) { const L = 1 + (R() * 3 | 0); for (let j = 0; j < L; j++) fill(j === L - 1 ? '#2f7a34' : '#4f9d39', xx, yS + 2 + j, 1, 1); }
          if (Math.abs(u) < 0.85 && R() < 0.05) { const my = yS + 8 + (R() * 18 | 0); fill('rgba(90,168,59,0.75)', xx - 1, my, 3, 1); fill('rgba(63,138,53,0.7)', xx, my + 1, 2, 1); }
        }
        for (const v of [-0.62, -0.18, 0.34]) {
          const vx0 = Math.round(cx + rx * v), vy0 = Math.round(front(vx0)) + 2, L = 18 + (R() * 10 | 0);
          for (let j = 0; j < L; j++) { const vx = vx0 + Math.round(Math.sin(j * 0.35 + v * 7) * 1.2); fill('#2f7a34', vx, vy0 + j, 1, 1); if (j % 4 === 2) { fill('#6cbf45', vx + 1, vy0 + j, 2, 1); fill('#4f9d39', vx + 1, vy0 + j + 1, 1, 1); } if (j % 4 === 0 && j > 2) fill('#6cbf45', vx - 1, vy0 + j, 1, 1); }
          fill(v < 0 ? '#ffd27a' : '#ff8fb1', vx0, vy0 + L, 1, 1); fill('#ffffff', vx0, vy0 + L - 1, 1, 1);
        }
        S.gems = [];
        for (let i = 0; i < 12 && S.gems.length < 8; i++) {
          const xx = Math.round(cx + (R() * 1.6 - 0.8) * rx), u = (xx - cx) / rx, d = Math.pow(Math.max(0, 1 - u * u), 0.7) * depth;
          if (d < 16) continue;
          const y = Math.round(front(xx) + 6 + R() * (d - 14)), c = ['#7af0ff', '#c08cff', '#ff9ad5', '#9dffb0'][(R() * 4) | 0];
          fill('#2a1a24', xx - 1, y - 1, 4, 4); fill(c, xx, y, 2, 2); fill('#ffffff', xx, y, 1, 1);
          S.gems.push({ x: xx, y, ph: R() * 6.28 });
        }
        // grass top: a rolling meadow of overlapping mounds in several greens (lime far -> deep green near), bumpy skyline
        const inTop = (xx, y, lift) => { const dx = (xx - cx) / rx; if (Math.abs(dx) > 1) return false; const yTop = top - ry * Math.sqrt(1 - dx * dx); return y >= yTop - lift && y <= top + ry * Math.sqrt(1 - dx * dx); };
        for (let y = top - ry; y <= top + ry; y++) { const dy = (y - top) / ry, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy))), d = (y - top + ry) / (2 * ry); fill(d < 0.3 ? '#8fd03a' : d < 0.62 ? '#5fae3a' : '#4b9535', Math.round(cx - hw), y, hw * 2 + 1, 1); }
        const MND = [['#b4e231', '#d2f05a'], ['#9bd63a', '#bce852'], ['#7cc43e', '#9bd63a'], ['#5fae3a', '#7cc43e'], ['#4b9535', '#63b03b']];
        const mounds = [];
        for (let i = 0, n = Math.round(rx / 4); i < n; i++) {
          const mx = cx + (R() * 2 - 1) * rx * 0.98, d = R(), my = Math.round(top - ry + 1 + d * ry * 2), mrx = 10 + R() * 30, mry = 3 + R() * 3;
          mounds.push({ mx, my, mrx, mry, c: MND[clamp(Math.floor(d * 3.6 + (R() - 0.65) * 2.6), 0, 4)] });
        }
        mounds.sort((a, b) => a.my - b.my);
        for (const m of mounds) {
          for (let xx = Math.floor(m.mx - m.mrx); xx <= Math.ceil(m.mx + m.mrx); xx++) {
            const u = (xx - m.mx) / m.mrx; if (Math.abs(u) > 1) continue;
            const yT = Math.round(m.my - m.mry * Math.pow(1 - u * u, 0.6) - (Math.sin(xx * 0.9 + m.mx) > 0.75 ? 1 : 0));
            for (let y = yT; y <= m.my; y++) if (inTop(xx, y, 3)) fill(y === yT ? m.c[1] : m.c[0], xx, y, 1, 1);
            if (R() < 0.18 && inTop(xx, yT - 1, 4)) fill(m.c[0], xx, yT - 1, 1, 1);
          }
        }
        // skyline: bumpy light rim along the back edge, a few blades poking above it
        for (let xx = -Math.floor(rx); xx <= rx; xx++) {
          const X = Math.round(cx + xx), yy = Math.round(top - ry * Math.sqrt(Math.max(0, 1 - (xx / rx) * (xx / rx)))), b = Math.round(1 + Math.sin(xx * 0.11 + 1.7) * 1 + Math.sin(xx * 0.29) * 0.8);
          if (b > 0) fill('#9bd63a', X, yy - b, 1, b);
          fill('#c6ec50', X, yy - Math.max(0, b), 1, 1);
          if (R() < 0.12) fill('#7cc43e', X, yy - b - 1, 1, 1);
        }
        // pond with a stone rim; a short channel feeds the waterfall
        const px0 = Math.round(cx + rx * A.pond), py0 = top + 3;
        S.pond = { x: px0, y: py0 };
        for (let y = -5; y <= 5; y++) for (let xx = -17; xx <= 17; xx++) { const d = (xx / 17) * (xx / 17) + (y / 5) * (y / 5); if (d <= 1 && d > 0.6) fill(((xx + y) & 1) ? '#9aa0b0' : '#7d8396', px0 + xx, py0 + y, 1, 1); }
        for (let y = -4; y <= 4; y++) for (let xx = -15; xx <= 15; xx++) { const d = (xx / 15) * (xx / 15) + (y / 4) * (y / 4); if (d <= 0.8) fill(y < -1 ? '#8fd6ff' : '#5ab0f0', px0 + xx, py0 + y, 1, 1); }
        fill('#4fa83f', px0 - 7, py0, 3, 1); fill('#4fa83f', px0 - 6, py0 - 1, 2, 1); fill('#ff8fb1', px0 - 6, py0 - 1, 1, 1);
        fill('#4fa83f', px0 + 5, py0 + 1, 3, 1); fill('#6cbf45', px0 + 6, py0 + 1, 1, 1);
        S.fallX = px0; S.fallY = Math.round(front(px0)) - 1;
        fill('#5ab0f0', px0 - 1, py0 + 3, 3, Math.max(1, S.fallY - py0 - 2)); fill('#8fd6ff', px0, py0 + 3, 1, Math.max(1, S.fallY - py0 - 2));
        // a crystal cluster hangs from the island's lowest point
        const ty = Math.round(top + ry + depth * 0.92);
        for (const sh of [[-5, 7, '#6fd0ef'], [-2, 12, '#9ff3ff'], [1, 9, '#c08cff'], [4, 6, '#6fd0ef']]) {
          const sx = cx + sh[0];
          for (let j = 0; j < sh[1]; j++) { const w = j < sh[1] - 3 ? 2 : 1; fill('#2a1a24', sx - 1, ty + j, w + 2, 1); }
          fill('#2a1a24', sx, ty + sh[1], 1, 1);
          for (let j = 0; j < sh[1]; j++) { const w = j < sh[1] - 3 ? 2 : 1; fill(sh[2], sx, ty + j, w, 1); if (j < sh[1] - 3) fill('rgba(255,255,255,0.55)', sx, ty + j, 1, 1); }
          S.gems.push({ x: sx, y: ty + 2, ph: R() * 6.28 });
        }
        // stepping stones from the desk to the pond
        for (let i = 0; i < 3; i++) { const d0 = S.deskX + (px0 > S.deskX ? 48 : -10), sx = Math.round(d0 + i * ((px0 + (px0 > S.deskX ? -22 : 22) - d0) / 2)), sy = top + 6 - i; fill('#7d8396', sx - 1, sy, 5, 2); fill('#b9bfcc', sx, sy, 3, 1); }
        // mushrooms and stones
        const mush = (mx, my) => { fill('#f4ead6', mx, my - 1, 1, 2); fill('#e0483e', mx - 1, my - 2, 3, 1); fill('#e0483e', mx, my - 3, 1, 1); fill('#ffffff', mx - 1, my - 2, 1, 1); };
        mush(Math.round(cx - rx * 0.78), top + 2); mush(Math.round(cx - rx * 0.72), top + 5); mush(Math.round(cx + rx * 0.3), top - 6);
        const stone = (sx, sy, w) => { fill('#5d6274', sx - 1, sy - 1, w + 2, 3); fill('#9aa0b0', sx, sy - 1, w, 2); fill('#c4c9d4', sx, sy - 1, Math.max(1, w - 2), 1); };
        stone(Math.round(cx - rx * 0.55), top + 7, 4); stone(Math.round(cx + rx * 0.8), top + 1, 3); stone(Math.round(cx - rx * 0.2), top - 8, 3);
        // lantern post (glows at night)
        S.lantern = { x: Math.round(cx + rx * A.lantern), y: top - 2 };
        const lx = S.lantern.x, ly = S.lantern.y;
        fill('#2a2238', lx - 1, ly - 22, 3, 23); fill('#6b4a3a', lx, ly - 21, 1, 21);
        fill('#2a2238', lx - 3, ly - 28, 7, 7); fill('#ffd27a', lx - 2, ly - 27, 5, 5); fill('#2a2238', lx - 2, ly - 25, 5, 1); fill('#2a2238', lx, ly - 27, 1, 5); fill('#2a2238', lx - 4, ly - 29, 9, 1);
        // fairy lights along the front rim
        S.bulbs = [];
        const cols = ['#ffd27a', '#ff8fb1', '#8fd6ff', '#b2f07a'];
        for (let xx = Math.ceil(cx - rx * 0.86); xx <= cx + rx * 0.86; xx += 9) S.bulbs.push({ x: xx, y: Math.round(front(xx)) + 4, rgb: hx(cols[S.bulbs.length % 4]), c: cols[S.bulbs.length % 4] });
        for (let i = 0; i < S.bulbs.length - 1; i++) { const a = S.bulbs[i], b = S.bulbs[i + 1]; for (let xx = a.x; xx <= b.x; xx++) { const t = (xx - a.x) / Math.max(1, b.x - a.x); fill('#2a2238', xx, Math.round(a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * 2), 1, 1); } }
        for (const b of S.bulbs) { fill('#2a2238', b.x - 1, b.y, 3, 2); fill(b.c, b.x, b.y + 1, 1, 2); }
        specks(top - ry, top + ry, Math.round(S.iw * 0.8));
      }
      return c;
    }

    /* ---- simulation ---- */
    function startRoutine() {
      if (girl.mode !== 'work' || !S || S.cofX == null) return;
      const pondX = S.pond ? S.pond.x - 26 : S.chairX + 60;
      girl.mode = 'away'; girl.gx = S.chairX; girl.dir = -1;
      girl.outing = (girl.outing || 0) + 1;
      const waveX = clamp(S.cx - 62, S.cMin + 6, S.cMax);
      girl.q = (girl.outing % 2 === 1)
        ? [{ a: 'stand', d: 0.45 }, { a: 'walk', x: waveX }, { a: 'wave', d: 3.4 }, { a: 'walk', x: S.chairX }, { a: 'sit', d: 0.4 }]
        : [{ a: 'stand', d: 0.45 }, { a: 'walk', x: pondX }, { a: 'look', d: 3.2 }, { a: 'walk', x: S.chairX }, { a: 'sit', d: 0.4 }];
      girl.act = null;
      if (!corgi.shelter && Math.random() < 0.65) corgi.follow = true;
    }
    function updateGirl(dt) {
      if (girl.mode === 'work') {
        if (st.rain < 0.3) girl.routineT -= dt;
        if (girl.routineT <= 0) startRoutine();
        return;
      }
      if (!girl.act) { girl.act = girl.q.shift(); girl.at = 0; if (!girl.act) { girl.mode = 'work'; girl.routineT = 40 + Math.random() * 35; corgi.follow = false; return; } }
      const a = girl.act; girl.at += dt;
      if (a.a === 'walk') {
        const d = a.x - girl.gx; girl.dir = d >= 0 ? 1 : -1;
        girl.gx += girl.dir * Math.min(Math.abs(d), 15 * dt * M);
        girl.wft += dt; if (girl.wft > 0.15) { girl.wft = 0; girl.wf = (girl.wf + 1) % 4; }
        if (corgi.follow && !corgi.shelter && girl.at > 0.3 && Math.abs(corgi.tx - (girl.gx - girl.dir * 24)) > 18) walkTo(girl.gx - girl.dir * 24);
        if (Math.abs(a.x - girl.gx) < 0.5) girl.act = null;
      } else {
        if (a.a === 'drink') { girl.dir = -1; girl.sip = (girl.at % 1.4) < 0.7 ? 1 : 0; st.cupT = (st.cupT || 0) - dt; if (st.cupT <= 0) { st.cupT = 0.35; addPart('steam', girl.gx - 7 + Math.random() * 2, S.Y0 - 38, { vy: -7, life: 1.4, max: 1.4 }); } }
        if (a.a === 'look') { girl.dir = 1; if (!a.fished && girl.at > 0.8) { a.fished = true; jumpFish(); } }
        if (a.a === 'wave') { if (!a.said && girl.at > 0.5) { a.said = true; fx.say = { text: WAVES[(girl.outing >> 1) % WAVES.length], t: 0 }; } }
        if (girl.at >= a.d) girl.act = null;
      }
    }
    function jumpFish() { if (!S.pond) return; fx.fish = { t: 0, x: S.pond.x - 8 + Math.random() * 16, dir: Math.random() < 0.5 ? -1 : 1 }; fx.ripples.push({ x: fx.fish.x, y: S.pond.y, t: 0 }); }
    function walkTo(x, run) { corgi.tx = clamp(x, S.cMin, S.cMax); corgi.mode = run ? 'run' : 'walk'; corgi.sleep = false; }
    function addPart(type, x, y, o) { parts.push(Object.assign({ type, x, y, vx: 0, vy: -10, life: 1.2, max: 1.2, ph: Math.random() * 6 }, o || {})); if (parts.length > 240) parts.shift(); }
    function burst(x, y, n, c) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 10 + Math.random() * 18; addPart('spark', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, life: 0.6, max: 0.6, c }); } }
    function groundY() {
      if (layout === 'island') return Math.random() < 0.45 ? S.hY - 6 + Math.random() * 14 : H + 10;
      return S.hY + 2 + Math.random() * (H - S.hY - 2);
    }
    function newDrop(any) { return { x: Math.random() * (W + 40), y: any ? Math.random() * H : -6 - Math.random() * 20, v: 190 + Math.random() * 80, len: 3 + (Math.random() * 3 | 0), gy: groundY(), mini: false }; }
    function umbTop(dx) { return S.Y0 - 65 + 16 * (1 - Math.sqrt(Math.max(0, 1 - (dx / 36) * (dx / 36)))); }

    function update(dt) {
      st.t += dt;
      if (st.auto) { st.hour = (st.hour + dt * 24 / 90) % 24; }
      else if (st.target != null) {
        const rem = (st.target - st.hour + 24) % 24, stepH = Math.min(rem, (rem * 2.2 + 0.6) * dt);
        st.hour = (st.hour + stepH) % 24;
        if (rem - stepH < 0.01) { st.hour = st.target; st.target = null; }
      }
      const wr = st.weather === 'rain' ? 1 : 0, wb = st.weather === 'rainbow' ? 1 : 0;
      st.rain += (wr - st.rain) * Math.min(1, dt * 1.2); st.rainbow += (wb - st.rainbow) * Math.min(1, dt * 0.9);
      const dk = darkness(st.hour);
      if (Music.playing) Music.want(dk > 0.5 ? 1 : 0);

      // girl
      if (girl.wave > 0) girl.wave -= dt;
      girl.burst -= dt; if (girl.burst <= 0) { girl.typing = !girl.typing; girl.burst = girl.typing ? 1.5 + Math.random() * 3 : 0.8 + Math.random() * 1.6; }
      girl.ft += dt; if (girl.ft > (Music.playing ? 0.13 : 0.17)) { girl.ft = 0; girl.frame = girl.typing ? 1 - girl.frame : 0; }
      if (girl.blink > 0) girl.blink -= dt; girl.nextBlink -= dt; if (girl.nextBlink <= 0) { girl.blink = 0.13; girl.nextBlink = 2.5 + Math.random() * 3; }

      // girl routine: stand up, fetch a coffee, stroll to the pond, come back, sit down
      if (layout === 'island' && S.cofX != null && !girl.hidden) updateGirl(dt);

      // corgi
      const c = corgi; c.ft += dt;
      if (st.rain > 0.5 && !c.shelter) { c.shelter = true; walkTo(S.deskX + 2); }
      if (st.rain < 0.3 && c.shelter) { c.shelter = false; c.timer = 1; if (c.mode === 'lie') c.timer = 0.5; }
      if (c.mode === 'walk' || c.mode === 'run') {
        const sp = c.mode === 'run' ? 46 : 18, d = c.tx - c.x;
        c.dir = d >= 0 ? 1 : -1; c.x += c.dir * Math.min(Math.abs(d), sp * dt * M);
        if (c.ft > (c.mode === 'run' ? 0.07 : 0.13)) { c.ft = 0; c.f = (c.f + 1) % 4; }
        if (Math.abs(c.tx - c.x) < 0.5) {
          if (c.shelter) { c.mode = 'lie'; c.sleep = false; c.timer = 1e9; }
          else { c.mode = Math.random() < 0.55 ? 'sit' : 'lie'; c.sleep = c.mode === 'lie' && (dk > 0.5 || Math.random() < 0.4); c.timer = 3 + Math.random() * 5; c.dir = (S.bodyX + 30 > c.x) ? 1 : -1; }
        }
      } else {
        if (c.ft > (c.mode === 'sit' ? (Music.playing ? 0.16 : 0.35) : 0.9)) { c.ft = 0; c.f = ((c.f | 0) + 1) % 2; }
        c.timer -= dt;
        if (c.timer <= 0 && !c.shelter) { if (dk > 0.7 && Math.random() < 0.6) { c.mode = 'lie'; c.sleep = true; c.timer = 6; } else walkTo(S.cMin + Math.random() * (S.cMax - S.cMin)); }
        if (c.mode === 'lie' && c.sleep) { st.zT -= dt; if (st.zT <= 0) { st.zT = 1.2; addPart('z', c.x + (c.dir > 0 ? 24 : 2), S.cY - 16, { vx: 3, vy: -6, life: 1.6, max: 1.6 }); } }
      }

      // rabbit
      const r = rab;
      if (!r.on) { r.next -= dt; if (r.next <= 0) { r.on = true; r.ltr = true; r.x = S.rMin - (layout === 'island' ? 0 : 18); r.t = 0; r.seen = false; r.jump = 0; if (opts.onEvent) opts.onEvent('rabbit-spawn'); } }
      else {
        r.t += dt; r.jump = Math.max(0, r.jump - dt);
        const p = (r.t % 0.75) / 0.75;
        if (p < 0.62) { r.x += 34 * dt * (r.jump > 0 ? 1.6 : 1); r.air = Math.sin(Math.PI * p / 0.62) * (r.jump > 0 ? 16 : 7); r.leap = true; } else { r.air = 0; r.leap = false; }
        if (r.x > S.rMax) { r.on = false; r.next = 1e9; }
        if (!c.shelter && !r.seen && Math.abs(r.x - c.x) < 70) { r.seen = true; c.dir = r.x > c.x ? 1 : -1; addPart('bang', c.x + (c.dir > 0 ? 22 : 4), S.cY - 26, { vy: -4 }); if (Math.random() < 0.7) walkTo(r.x + 30, true); }
      }

      // butterflies & fireflies
      const dayA = (1 - dk) * (1 - st.rain);
      for (const b of flies) {
        b.t += dt;
        if (b.flee > 0) { b.flee -= dt; b.x += b.vx * dt; b.y -= 20 * dt; if (b.flee <= 0) b.by = clamp(b.y, layout === 'island' ? S.hY - 14 : S.hY + 8, H - 20); }
        else { b.x += Math.sin(b.t * 0.7 + b.ph) * 12 * dt * M; b.y = b.by + Math.sin(b.t * 1.9 + b.ph) * 6; }
        if (b.x < -10) b.x = W + 5; if (b.x > W + 10) b.x = -5; b.a = dayA;
      }
      for (const f of fireflies) { f.t += dt; f.x += Math.sin(f.t * 0.6 + f.ph) * 6 * dt; f.y += Math.cos(f.t * 0.8 + f.ph) * 4 * dt; f.a = dk * (0.5 + 0.5 * Math.sin(f.t * 2.4 + f.ph)); }

      // clouds
      for (const cl of S.clouds) {
        cl.x += (cl.v + cl.puff * 30) * dt * M; cl.puff = Math.max(0, cl.puff - dt * 0.8);
        if (cl.shower > 0) { cl.shower -= dt; cl.dropT -= dt; while (cl.dropT <= 0) { cl.dropT += 0.025; drops.push({ x: cl.x + 4 + Math.random() * (cl.w - 8), y: cl.y + cl.h * 0.75, v: 170 + Math.random() * 60, len: 3, gy: groundY(), mini: true }); } }
        if (cl.x > W + 10) cl.x = -cl.w - 10;
      }
      for (const tr of S.trees) tr.shake = Math.max(0, tr.shake - dt * 0.9);
      for (const f of S.flowers) if (f.grow < 1) f.grow = Math.min(1, f.grow + dt * 0.9);

      // birds, balloon, waterfall mist, quest highlight timer
      S.birdT -= dt;
      if (S.birdT <= 0) {
        S.birdT = 9 + Math.random() * 12;
        if (!reduce && !opts.calm) { const y = 16 + Math.random() * 50, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) S.birds.push({ x: W + 10 + i * 7, y: y + (i % 2) * 4 + i * 2, v: 20 + Math.random() * 3, ph: Math.random() * 6 }); }
      }
      for (let i = S.birds.length - 1; i >= 0; i--) { const b = S.birds[i]; b.x -= b.v * dt; b.y += Math.sin(st.t * 2 + b.ph) * 2 * dt; if (b.x < -10) S.birds.splice(i, 1); }
      if (S.balloon) { S.balloon.x += 2.5 * dt * M; if (S.balloon.x > W + 20) S.balloon.x = -20; }
      if (layout === 'island') { st.mistT -= dt; if (st.mistT <= 0) { st.mistT = 0.12; addPart('mist', S.fallX - 3 + Math.random() * 6, H - 36 + Math.random() * 6, { vx: (Math.random() - 0.5) * 6, vy: -6 - Math.random() * 4, life: 1.2, max: 1.2 }); } }
      if (st.hlT != null) { st.hlT -= dt; if (st.hlT <= 0) { st.hl = null; st.hlT = null; } }

      // little effects
      for (let i = fx.ripples.length - 1; i >= 0; i--) { fx.ripples[i].t += dt; if (fx.ripples[i].t > 1.4) fx.ripples.splice(i, 1); }
      if (fx.fish) { fx.fish.t += dt; if (fx.fish.t > 1.1) { fx.ripples.push({ x: fx.fish.x + fx.fish.dir * 12, y: S.pond.y, t: 0 }); fx.fish = null; } }
      if (fx.mailUp > 0) fx.mailUp -= dt;
      if (fx.say) { fx.say.t += dt; if (fx.say.t > 3.6) fx.say = null; }
      // small islands: a nudge pushes them away, then a damped spring brings them home
      for (const m of (S.minis || [])) { if (!m.vx && !m.ox && !m.vy && !m.oy) continue; m.vx = (m.vx || 0) + (-9 * (m.ox || 0) - 3.2 * m.vx) * dt; m.vy = (m.vy || 0) + (-9 * (m.oy || 0) - 3.2 * m.vy) * dt; m.ox = (m.ox || 0) + m.vx * dt; m.oy = (m.oy || 0) + m.vy * dt; if (Math.abs(m.ox) + Math.abs(m.oy) + Math.abs(m.vx) + Math.abs(m.vy) < 0.02) { m.ox = m.oy = m.vx = m.vy = 0; } }
      if (dk > 0.6 && st.rain < 0.3 && !reduce) { fx.shootT -= dt; if (fx.shootT <= 0) { fx.shootT = 5 + Math.random() * 9; fx.shoot = { x: W * (0.2 + Math.random() * 0.7), y: 6 + Math.random() * H * 0.2, t: 0 }; } }
      if (fx.shoot) { fx.shoot.t += dt; if (fx.shoot.t > 0.9) fx.shoot = null; }
      for (const ci of (S.cirrus || [])) { ci.x += ci.v * dt * M; if (ci.x > W + 10) ci.x = -ci.img.width - 10; }

      // rain
      const want = Math.round(170 * st.rain * W / 480);
      let rainCount = 0; for (const d of drops) if (!d.mini) rainCount++;
      while (rainCount < want) { drops.push(newDrop(true)); rainCount++; }
      S.umbOpen = smooth((st.rain - 0.08) / 0.5);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.y += d.v * dt; d.x -= d.v * 0.12 * dt;
        const dx = d.x - S.umbX, under = S.umbOpen > 0.6 && Math.abs(dx) < 36 && d.y >= umbTop(dx);
        if (d.y >= d.gy || under) {
          if (Math.random() < 0.5 && d.gy < H) parts.push({ type: 'splash', x: d.x, y: under ? umbTop(dx) : d.gy, vx: 0, vy: 0, life: 0.25, max: 0.25 });
          if (d.mini || rainCount > want) { drops.splice(i, 1); if (!d.mini) rainCount--; } else Object.assign(d, newDrop(false));
        }
      }

      // particles
      st.steamT -= dt; if (st.steamT <= 0 && girl.mode === 'work') { st.steamT = 0.5 + Math.random() * 0.4; addPart('steam', S.deskX + 24 + Math.random() * 2, S.deskY + 16, { vy: -6, life: 1.8, max: 1.8 }); }
      if (Music.playing) { st.noteT -= dt; if (st.noteT <= 0) { st.noteT = 0.5; addPart('note', S.spkX + 4 + Math.random() * 6, S.spkY - 6, { vy: -14, life: 2.2, max: 2.2 }); } }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (p.type === 'leaf') { p.vy = 10; p.vx = Math.sin(p.life * 5 + p.ph) * 10; }
        if (p.type === 'note') p.vx = Math.sin(p.life * 4) * 6;
        if (p.type === 'fruit' || p.type === 'banana') { p.vy += 90 * dt; if (p.y >= p.gy && p.vy > 0) { p.y = p.gy; p.vy = p.vy > 25 ? -p.vy * 0.35 : 0; p.vx *= 0.6; } }
        if (p.type === 'mail') { p.vx = 10 + Math.sin(p.life * 3) * 8; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (st.auto) { st.autoT -= dt; if (st.autoT <= 0) { st.autoT = 0.25; notify(true); } }
      else notify(false);
    }

    function notify(force) {
      const tn = timeName(st.target != null ? st.target : st.hour);
      const key = tn + '|' + st.weather + '|' + (Music.playing ? 1 : 0) + '|' + (st.auto ? 1 : 0);
      if (!force && key === lastNotify) return;
      lastNotify = key;
      if (opts.onChange) opts.onChange({ time: tn, weather: st.weather, music: Music.playing, hour: Math.round(st.hour * 100) / 100, auto: st.auto, song: SONGS[Music.song].name });
    }
    function emit(name) { if (opts.onEvent) opts.onEvent(name); }

    /* ---- drawing ---- */
    function drawSky(ctx, pal) {
      const hz = layout === 'island' ? H : S.hY + 6, N = 26;
      const colAt = (t) => t < 0.55 ? mixc(pal.top, pal.mid, t / 0.55) : mixc(pal.mid, pal.bot, (t - 0.55) / 0.45);
      for (let i = 0; i < N; i++) {
        const y0 = Math.floor(i * hz / N), y1 = Math.floor((i + 1) * hz / N);
        ctx.fillStyle = css(colAt(i / (N - 1))); ctx.fillRect(0, y0, W, y1 - y0);
        if (i < N - 1) { ctx.fillStyle = css(colAt((i + 1) / (N - 1))); for (let x = (y1 - 1) & 1; x < W; x += 2) ctx.fillRect(x, y1 - 1, 1, 1); }
      }
      if (hz < H) { ctx.fillStyle = css(pal.bot); ctx.fillRect(0, hz, W, H - hz); }
      // (removed: three full-width light lines here read as a seam cutting across the clouds)
    }
    function arcPos(p) { const top = 34, base = (layout === 'island' ? H * 0.6 : S.hY) - 6; return [Math.round(W * (0.08 + 0.84 * p)), Math.round(base - Math.sin(Math.PI * p) * (base - top))]; }
    function ring(x, y, r0, r1, col) { g.fillStyle = col; for (let yy = -r1; yy <= r1; yy++) for (let xx = -r1; xx <= r1; xx++) { const d = xx * xx + yy * yy; if (d > r0 * r0 && d < r1 * r1 && ((xx + yy) & 1) === 0) g.fillRect(x + xx, y + yy, 1, 1); } }
    function drawSunMoon(h, dk) {
      const vis = 1 - st.rain * 0.85;
      if (h >= 5.6 && h <= 19.4) {
        const p = h <= 12.5 ? 0.5 * Math.max(0, (h - 5.6) / 6.9) : h <= 16.8 ? 0.5 + (h - 12.5) / 4.3 * 0.36 : 0.86 + (h - 16.8) / 2.6 * 0.14, pos = arcPos(p), low = h >= 15 ? 1 : 0;
        g.globalAlpha = vis; ring(pos[0], pos[1], 10.5, 14, low > 0.6 ? 'rgba(255,170,90,0.4)' : 'rgba(255,240,170,0.4)');
        g.drawImage(low > 0.6 ? SPR.sunLow : SPR.sun, pos[0] - 13, pos[1] - 13); g.globalAlpha = 1;
        hits.push({ id: 'sun', x: pos[0] - 14, y: pos[1] - 14, w: 28, h: 28 });
        S.sunPos = [pos[0], pos[1] - 13];
      }
      if (h >= 18.8 || h <= 6.2) {
        const hn = (h - 18.8 + 24) % 24, p = Math.min(0.3, hn / 2.7 * 0.14 + Math.max(0, hn - 2.7) / 8.7 * 0.16), pos = arcPos(p);
        g.globalAlpha = vis * smooth(dk * 1.4); ring(pos[0], pos[1], 8, 11, 'rgba(220,230,255,0.35)');
        g.drawImage(SPR.moon, pos[0] - 10, pos[1] - 10); g.globalAlpha = 1;
        hits.push({ id: 'moon', x: pos[0] - 12, y: pos[1] - 12, w: 24, h: 24 });
        S.moonPos = [pos[0], pos[1] - 10];
      }
    }
    // soft light around the sun, slow god-rays, aurora + shooting stars at night
    function drawSkyFx(t, h, dk) {
      const day = (1 - dk) * (1 - st.rain * 0.9);
      g.globalCompositeOperation = 'lighter';
      if (S.sunPos && day > 0.05) {
        const sx = S.sunPos[0], sy = S.sunPos[1] + 13, low = h < 9 || h > 15.5;
        const col = low ? '255,170,100' : '255,240,190';
        const gr = g.createRadialGradient(sx, sy, 6, sx, sy, 90); gr.addColorStop(0, 'rgba(' + col + ',' + (0.22 * day).toFixed(3) + ')'); gr.addColorStop(0.35, 'rgba(' + col + ',' + (0.06 * day).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.fillRect(sx - 90, sy - 90, 180, 180);
        // (sun rays removed: keep the eye on the island)
      }
      const night = dk * (1 - st.rain);
      if (night > 0.05) {
        if (!FLAT) for (let x = 0; x < W; x += 2) {
          const base = H * 0.1 + Math.sin(x * 0.017 + t * 0.22) * 10 + Math.sin(x * 0.043 - t * 0.35) * 4;
          const hue = 0.5 + 0.5 * Math.sin(x * 0.01 + t * 0.15), a = night * (0.55 + 0.45 * Math.sin(x * 0.03 + t * 0.6)) * 0.16;
          const top = hue > 0.5 ? '125,255,190' : '170,140,255';
          for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(' + top + ',' + (a * (1 - k / 6)).toFixed(3) + ')'; g.fillRect(x, Math.round(base + k * 4), 2, 4); }
        }
        if (fx.shoot) { const sh = fx.shoot, k = sh.t / 0.9, x = sh.x - k * 60, y = sh.y + k * 26; for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(255,250,220,' + ((1 - i / 9) * (1 - k) * night).toFixed(3) + ')'; g.fillRect(Math.round(x + i * 2.2), Math.round(y - i * 0.95), 1, 1); } }
      }
      g.globalCompositeOperation = 'source-over';
    }
    function drawStars(t, dk) {
      const a0 = dk * (1 - st.rain); if (a0 < 0.03) return;
      for (const s of S.stars) {
        const a = a0 * (0.45 + 0.55 * Math.sin(t * 1.8 + s.ph)); if (a <= 0.02) continue;
        g.fillStyle = 'rgba(255,248,220,' + a.toFixed(3) + ')'; g.fillRect(s.x, s.y, 1, 1);
        if (s.big) { g.fillStyle = 'rgba(255,248,220,' + (a * 0.5).toFixed(3) + ')'; g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); }
      }
    }
    function wrapX(x, span) { return ((x + 80) % span + span) % span - 80; }
    function drawTree(tr, t) {
      const img = tr.img, h = img.height, w = img.width;
      const wind = Math.sin(t * 0.9 * M + tr.ph) * tr.amp + Math.sin(t * 2.3 * M + tr.ph) * 0.4 + (tr.shake > 0 ? Math.sin(t * 28) * tr.shake * 2.5 : 0);
      let y0 = 0, cur = null;
      for (let y = 0; y <= h; y++) {
        const o = y < h ? q(wind * clamp(1 - y / (h * 0.78), 0, 1)) : null;
        if (o !== cur) { if (cur !== null) lg.drawImage(img, 0, y0, w, y - y0, tr.x + cur, tr.y + y0, w, y - y0); y0 = y; cur = o; }
      }
      hits.push({ id: 'tree', ref: tr, img, x: tr.x, y: tr.y, w, h: Math.round(h * 0.8) });
    }
    function drawTufts(t) {
      const far = S.hY + (H - S.hY) * 0.3;
      for (const q of S.tufts) {
        const o = Math.sin(t * 1.7 * M + q.ph + q.x * 0.03) > 0.35 ? 1 : 0, x = q.x, y = q.y;
        if (layout !== 'island' && y < far) { lg.fillStyle = '#4a9a3a'; lg.fillRect(x, y - 1, 1, 2); lg.fillRect(x + 2, y - 1, 1, 2); lg.fillRect(x + o, y - 2, 1, 1); }
        else { lg.fillStyle = 'rgba(40,110,50,0.35)'; lg.fillRect(x, y + 1, 4, 1); lg.fillStyle = '#2f7a34'; lg.fillRect(x, y - 1, 1, 2); lg.fillRect(x - 1 + o, y - 2, 1, 1); lg.fillRect(x + 2, y - 1, 1, 2); lg.fillRect(x + 3 + o, y - 3, 1, 2); }
      }
    }
    function drawFlowers(t) {
      const far = S.hY + (H - S.hY) * 0.28;
      for (const f of S.flowers) {
        const o = Math.round(Math.sin(t * 1.6 * M + f.ph) * 0.6), x = f.x + o, y = f.y;
        if (f.grow < 0.5) { lg.fillStyle = '#2f7a34'; lg.fillRect(f.x, y, 1, 2); lg.fillRect(f.x + 1, y, 1, 1); continue; }
        if (layout !== 'island' && y < far) { lg.fillStyle = f.c; lg.fillRect(x, y, 1, 1); continue; }
        lg.fillStyle = '#2f7a34'; lg.fillRect(f.x, y + 2, 1, 2);
        lg.fillStyle = f.c; lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x, y - 1, 1, 3);
        lg.fillStyle = f.mid; lg.fillRect(x, y, 1, 1);
      }
    }
    function drawBlades(t) {
      for (const b of S.blades) {
        const o = Math.round(Math.sin(t * 1.5 * M + b.x * 0.12) * 1.3);
        lg.fillStyle = b.c; lg.fillRect(b.x, H - b.h + 3, 1, b.h - 3); lg.fillRect(b.x + (o > 0 ? 1 : o < 0 ? -1 : 0), H - b.h, 1, 3);
      }
    }
    function drawFlies() {
      for (const b of flies) {
        if (b.a < 0.05) continue;
        const x = Math.round(b.x), y = Math.round(b.y), open = Math.sin(b.t * 16 + b.ph) > 0;
        lg.globalAlpha = b.a; lg.fillStyle = b.c;
        if (open) { lg.fillRect(x - 2, y - 1, 2, 2); lg.fillRect(x + 1, y - 1, 2, 2); lg.fillRect(x - 1, y + 1, 1, 1); lg.fillRect(x + 1, y + 1, 1, 1); }
        else { lg.fillRect(x - 1, y - 1, 1, 2); lg.fillRect(x + 1, y - 1, 1, 2); }
        lg.fillStyle = P.K; lg.fillRect(x, y - 1, 1, 3); lg.globalAlpha = 1;
        hits.push({ id: 'fly', ref: b, x: x - 5, y: y - 5, w: 11, h: 11 });
      }
    }
    function drawRiver(t) {
      for (let x = 0; x < W; x++) {
        const a = S.rTop[x], b = S.rBot[x], m = a + Math.round((b - a) * 0.45);
        lg.fillStyle = '#86c6f2'; lg.fillRect(x, a, 1, 2);
        lg.fillStyle = '#5ea6e6'; lg.fillRect(x, a + 2, 1, Math.max(0, m - a - 2));
        lg.fillStyle = '#3f86cc'; lg.fillRect(x, m, 1, b - m);
        lg.fillStyle = '#7a5c3c'; lg.fillRect(x, a - 1, 1, 1);
        lg.fillStyle = '#3f8a35'; lg.fillRect(x, b, 1, 1); if ((x * 7) % 5 === 0) lg.fillRect(x, b - 1, 1, 1);
      }
      lg.fillStyle = '#d6f0ff';
      const span = Math.max(1, S.rB - S.rT - 4);
      for (let i = 0; i < Math.round(W / 14); i++) {
        const row = S.rT + 2 + ((i * 7) % span), dir = row % 2 ? 1 : -1, len = 2 + (i % 4) * 2;
        const x = (((i * 53 + dir * t * 9 * M) % (W + 20)) + W + 20) % (W + 20) - 10;
        lg.fillRect(Math.round(x), row, len, 1);
      }
    }
    function drawRiverGlints(t) {
      const h = st.hour; let x, col;
      if (h >= 5.6 && h <= 19.4) { const p = (h - 5.6) / 13.8; x = arcPos(p)[0]; col = (1 - Math.sin(Math.PI * p)) > 0.5 ? [255, 170, 90] : [255, 250, 210]; }
      else { x = arcPos(((h - 18.8 + 24) % 24) / 11.4)[0]; col = [255, 240, 200]; }
      const a = 0.45 * (1 - st.rain * 0.8);
      for (let y = S.rT + 1; y < S.rB; y++) {
        if ((y + Math.floor(t * 5)) & 1) continue;
        const w = 2 + Math.round((y - S.rT) * 0.5 + Math.sin(t * 3 + y) * 2);
        g.fillStyle = css(col, a * (0.6 + 0.4 * Math.sin(t * 2 + y)));
        g.fillRect(Math.round(x - w / 2 + Math.sin(t * 1.7 + y * 0.8) * 2), y, Math.max(1, w), 1);
      }
    }
    function drawFall(t) {
      const x0 = S.fallX, y0 = S.fallY;
      for (let y = y0; y < H; y++) {
        const w = Math.round(3 + Math.min(4, (y - y0) / 22)), ph = Math.floor(y - t * 46 * M);
        const xl = Math.round(x0 - w / 2 + Math.sin(y * 0.15) * 0.5);
        lg.fillStyle = '#4a9ce0'; lg.fillRect(xl, y, w, 1);
        lg.fillStyle = ((ph % 9) + 9) % 9 < 2 ? '#ffffff' : '#8fd6ff'; lg.fillRect(xl + 1, y, Math.max(1, w - 2), 1);
        if (((ph % 5) + 5) % 5 === 0) { lg.fillStyle = '#e6f8ff'; lg.fillRect(((ph >> 2) & 1) ? xl : xl + w - 1, y, 1, 1); }
      }
    }
    function drawPlant(t) {
      const bx = S.deskX + 43, by = S.deskY + 29, sw = Math.sin(t * 1.3 * M + 1.7) * 1.0;
      // [dx, height, lean, petal, centre]
      const L = [[-2, 9, -0.55, '#ff8fb1', '#ffe08a'], [0, 13, -0.1, '#ffd166', '#c0703a'], [2, 11, 0.4, '#ffffff', '#ffc94a'], [1, 7, 0.9, '#ff6f91', '#ffe08a'], [-1, 6, -1.0, '#c08cff', '#fff3a0']];
      const pos = (l, i) => [Math.round(bx + l[0] + l[2] * i * 0.9 + sw * (i / l[1]) * (i / l[1])), by - i];
      lg.fillStyle = P.K; for (const l of L) for (let i = 0; i < l[1]; i++) { const p = pos(l, i); lg.fillRect(p[0] - 1, p[1], 3, 1); }
      for (const l of L) for (let i = 0; i < l[1]; i++) { const p = pos(l, i); lg.fillStyle = '#3f9440'; lg.fillRect(p[0], p[1], 1, 1); if (i === 3) { lg.fillStyle = '#6cc24a'; lg.fillRect(p[0] + (l[2] > 0 ? 1 : -1), p[1], 1, 1); } }
      for (const l of L) {
        const p = pos(l, l[1] - 1), x = p[0], y = p[1] - 1;
        lg.fillStyle = P.K; lg.fillRect(x - 2, y - 1, 5, 3); lg.fillRect(x - 1, y - 2, 3, 5);
        lg.fillStyle = l[3]; lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x, y - 1, 1, 3);
        lg.fillStyle = l[4]; lg.fillRect(x, y, 1, 1);
      }
    }
    function drawGroup(t) {
      const bx = S.bodyX, by = S.bodyY;
      lg.drawImage(SPR.chair, bx, by);
      lg.drawImage(SPR.desk, S.deskX, S.deskY);
      drawPlant(t);
      if (girl.mode === 'work' && !girl.hidden) {
        if (SPR.v2) {
          const f = girl.wave > 0 ? 2 : girl.frame, set = girl.blink > 0 ? SPR.v2.seatRB : SPR.v2.seatR;
          lg.drawImage(set[f], bx - 11, by - 18);
        } else {
          lg.drawImage(SPR.body[girl.wave > 0 ? 2 : girl.frame], bx, by);
          const bob = (Music.playing && Music.phase() < 0.5) ? 1 : 0;
          lg.drawImage(SPR.head[girl.blink > 0 ? 1 : 0], bx, by - 10 + bob);
        }
      }
      for (let i = 1; i < 10; i++) { lg.fillStyle = (i + Math.floor(t * 3)) % 5 === 0 ? '#ffffff' : '#9fe6ff'; lg.fillRect(S.deskX + 17 + Math.round(i * 0.25), S.deskY + 20 - i, 1, 1); }
      if (girl.mode === 'work' && !girl.hidden) hits.push({ id: 'girl', x: bx + 2, y: by - 9, w: 24, h: 42 });
      hits.push({ id: 'lamp', x: S.deskX + 23, y: S.deskY + 6, w: 14, h: 17 });
    }
    function drawGirlStanding() {
      if (girl.mode === 'work' || girl.hidden) return;
      const a = girl.act ? girl.act.a : 'stand', R = girl.dir > 0;
      if (SPR.v2) {
        const V = SPR.v2, x = q(girl.gx), y = S.Y0 - 47, bl = girl.blink > 0;
        let img;
        if (a === 'wave') { const t = girl.at, up = t > 0.4 && t < 3.0, wf = up ? (Math.floor(t * 4) & 1) : -1; img = wf < 0 ? (bl ? V.idle.frontB : V.idle.front) : (bl ? V.waveB : V.wave)[wf]; }
        else if (a === 'walk') img = (R ? V.walk.right : V.walk.left)[[0, 1, 2, 1][girl.wf]];
        else if (a === 'drink') img = (R ? V.drinkR : V.drinkL)[girl.sip];
        else img = R ? (bl ? V.idle.rightB : V.idle.right) : (bl ? V.idle.leftB : V.idle.left);
        lg.drawImage(img, x - 24, y);
        hits.push({ id: 'girl', x: x - 12, y: y + 4, w: 24, h: 43 });
        return;
      }
      const set = R ? SPR.stand : SPR.standL, head = R ? SPR.head : SPR.headL;
      if (a === 'wave') {
        const t = girl.at, up = t > 0.4 && t < 3.0, wf = up ? 1 + (Math.floor(t * 4) & 1) : 0, x = q(girl.gx), y = S.Y0 - 38;
        lg.drawImage(SPR.front[wf], x - 13, y);
        lg.drawImage(SPR.headF[girl.blink > 0 ? 1 : 0], x - 12, y - 10 + SPR.ch);
        hits.push({ id: 'girl', x: x - 10, y: y - 8, w: 20, h: 46 });
        return;
      }
      const img = a === 'walk' ? set.walk[girl.wf] : a === 'drink' ? set.drink[girl.sip] : set.idle;
      const ax = R ? 12 : 17, hx2 = R ? 12 : 11, x = q(girl.gx), y = S.Y0 - 38 + (a === 'walk' && (girl.wf & 1) ? -1 : 0);
      lg.drawImage(img, x - ax, y);
      lg.drawImage(head[girl.blink > 0 ? 1 : 0], x - hx2, y - 10 + SPR.ch);
      hits.push({ id: 'girl', x: x - 10, y: y - 8, w: 20, h: 46 });
    }
    function drawCoffee(t) {
      lg.drawImage(SPR.coffee, S.cofX - 11, S.Y0 - 25);
      if (Math.sin(t * 2.1) > 0.2) { lg.fillStyle = 'rgba(255,255,255,0.55)'; lg.fillRect(S.cofX + 4 + Math.round(Math.sin(t * 3)), S.Y0 - 17 - Math.round((t * 6) % 5), 1, 1); }
      hits.push({ id: 'coffee', x: S.cofX - 11, y: S.Y0 - 25, w: 22, h: 26 });
    }
    function drawMail() {
      lg.drawImage(SPR.mail[fx.mailUp > 0 ? 1 : 0], S.mailX - 7, S.Y0 - 15);
      hits.push({ id: 'mail', x: S.mailX - 7, y: S.Y0 - 15, w: 14, h: 24 });
    }
    function drawPondFx(t) {
      if (!S.pond) return;
      const p = S.pond;
      for (const r of fx.ripples) { const k = r.t / 1.4, rx = 2 + k * 12, ry = 1 + k * 3; lg.fillStyle = 'rgba(220,245,255,' + (0.9 * (1 - k)).toFixed(3) + ')'; for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2, x = Math.round(r.x + Math.cos(an) * rx), y = Math.round(r.y + Math.sin(an) * ry); if (Math.abs(x - p.x) < 15 && Math.abs(y - p.y) < 4) lg.fillRect(x, y, 1, 1); } }
      if (fx.fish) { const f = fx.fish, k = f.t / 1.1, x = Math.round(f.x + f.dir * 12 * k), y = Math.round(p.y - Math.sin(Math.PI * k) * 12); lg.fillStyle = P.K; lg.fillRect(x - 3, y - 1, 7, 3); lg.fillStyle = '#ff9a3c'; lg.fillRect(x - 2, y, 4, 1); lg.fillRect(x + (f.dir > 0 ? -3 : 2), y - 1, 1, 3); lg.fillStyle = '#ffffff'; lg.fillRect(x + (f.dir > 0 ? 1 : -2), y, 1, 1); }
      hits.push({ id: 'pond', x: p.x - 16, y: p.y - 5, w: 32, h: 10 });
      if (S.lantern) { if (!fx.lantern) { lg.fillStyle = '#6b6f88'; lg.fillRect(S.lantern.x - 2, S.lantern.y - 27, 5, 5); lg.fillStyle = P.K; lg.fillRect(S.lantern.x - 2, S.lantern.y - 25, 5, 1); lg.fillRect(S.lantern.x, S.lantern.y - 27, 1, 5); } hits.push({ id: 'lantern', x: S.lantern.x - 5, y: S.lantern.y - 30, w: 11, h: 30 }); }
    }
    function drawSpeaker() {
      const b = Music.playing && Music.phase() < 0.22 ? 1 : 0;
      lg.drawImage(SPR.speaker, S.spkX, S.spkY - b);
      // light bar near the top: glows and pulses with the beat when music plays
      const on = Music.playing, pulse = on ? 0.55 + 0.45 * Math.sin(Music.phase() * Math.PI * 2) : 0;
      lg.fillStyle = on ? 'rgba(125,240,255,' + (0.6 + pulse * 0.4).toFixed(3) + ')' : '#3b3f55'; lg.fillRect(S.spkX + 5, S.spkY + 3 - b, 6, 1);
      if (on) { lg.fillStyle = 'rgba(125,240,255,0.25)'; lg.fillRect(S.spkX + 4, S.spkY + 2 - b, 8, 3); }
      hits.push({ id: 'speaker', x: S.spkX - 3, y: S.spkY - 4, w: 22, h: 26 });
    }
    function drawCorgi() {
      const c = corgi, set = c.dir > 0 ? SPR.corgi : SPR.corgiL;
      // BUG fix: a walk frame (0-3) carried into 'sit' made 1 - f negative, the sprite was undefined and the frame crashed
      const fi = (n) => (((c.f | 0) % n) + n) % n;
      const img = (c.mode === 'walk' || c.mode === 'run') ? set.walk[fi(4)] : c.mode === 'sit' ? set.sit[fi(2)] : set.lie[c.sleep ? 1 : 0];
      const x = q(c.x), y = S.cY - 19;
      lg.drawImage(img, x, y);
      hits.push({ id: 'corgi', x: x - 2, y: y, w: 34, h: 21 });
    }
    function drawRabbit() {
      const r = rab, img = SPR.bun[r.leap ? 1 : 0], x = q(r.x), y = q(S.rY - 14 - r.air);
      lg.globalAlpha = layout === 'island' ? clamp(Math.min(r.x - S.rMin, S.rMax - r.x) / 10, 0, 1) : 1;
      lg.drawImage(img, x, y); lg.globalAlpha = 1;
      hits.push({ id: 'rabbit', x: x - 3, y: y - 3, w: 24, h: 21 });
    }
    function drawUmbPole() {
      const u = S.umbOpen; if (u <= 0.01) return;
      const full = S.Y0 - 1 - (S.Y0 - 46), hgt = Math.round(full * Math.min(1, u * 1.6));
      lg.fillStyle = P.K; lg.fillRect(S.umbX - 1, S.Y0 - 1 - hgt, 3, hgt);
      lg.fillStyle = '#e9e2d0'; lg.fillRect(S.umbX, S.Y0 - hgt, 1, Math.max(0, hgt - 1));
    }
    function drawUmbCanopy() {
      const u = S.umbOpen; if (u < 0.35) return;
      const img = SPR.umb, s = smooth((u - 0.35) / 0.65);
      const w = Math.max(6, Math.round(img.width * s)), h = Math.max(4, Math.round(img.height * (0.5 + 0.5 * s)));
      lg.drawImage(img, Math.round(S.umbX - w / 2), Math.round(S.Y0 - 46 - h + 1), w, h);
    }
    function drawSparks(set, ox, oy, t) {
      if (!set) return;
      for (const p of set) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + p.ph); if (a < 0.15) continue;
        const x = q(ox + p.x), y = oy + p.y;
        lg.globalAlpha = a; lg.fillStyle = '#ffffff';
        if (p.big) { lg.fillRect(x, y, 1, 1); lg.fillStyle = '#e2faff'; lg.fillRect(x - 2, y, 2, 1); lg.fillRect(x + 1, y, 2, 1); lg.fillRect(x, y - 2, 1, 2); lg.fillRect(x, y + 1, 1, 2); }
        else { lg.fillRect(x, y, 2, 2); }
      }
      lg.globalAlpha = 1;
    }
    function drawWorld(t) {
      if (S.cirrus) { lg.globalAlpha = 0.38; for (const ci of S.cirrus) lg.drawImage(ci.img, q(ci.x), ci.y); lg.globalAlpha = 1; }
      if (S.balloon) lg.drawImage(S.balloon.img, q(S.balloon.x), q(S.balloon.y + Math.sin(t * 0.6) * 2));
      for (const c of S.clouds) { const x = q(c.x); lg.drawImage(c.img, x, c.y); drawSparks(c.sp, c.x, c.y, t); hits.push({ id: 'cloud', ref: c, img: c.img, x, y: c.y, w: c.w, h: c.h }); }
      const off = t * 1.1 * M;
      for (const b of S.bank) { const bx = wrapX(b.x + off, S.bankSpan); lg.drawImage(b.img, q(bx), b.y); drawSparks(b.sp, bx, b.y, t); }
      if (S.minis) for (const m of S.minis) { const mx = q(m.x + Math.sin(t * 0.21 + m.ph) * 1.5 + (m.ox || 0)), my = q(m.y + Math.sin(t * 0.55 + m.ph) * 2.6 + (m.oy || 0)); lg.drawImage(m.img, mx, my); hits.push({ id: 'mini', ref: m, img: m.img, x: mx, y: my, w: m.img.width, h: m.img.height }); }
      drawBirds(t);
      if (S.sea) for (const b of S.sea) if (!b.front) lg.drawImage(b.img, q(wrapX(b.x + off * 1.4, S.seaSpan)), b.y + q(Math.sin(t * 0.5 + b.x) * 1.2));
      if (S.rocks) for (const r of S.rocks) lg.drawImage(r.img, Math.round(r.x - r.img.width / 2), Math.round(r.y + Math.sin(t * 0.7 * M + r.ph) * r.amp));
      const bob = S.bob || 0, h0 = hits.length;
      lg.save(); lg.translate(0, bob);
      try {
      lg.drawImage(S.ground, 0, 0, W, H);
      if (S.pond) { const p = S.pond; lg.fillStyle = '#d6f2ff'; lg.fillRect(Math.round(p.x - 11 + (t * 5) % 20), p.y - 1, 3, 1); lg.fillRect(Math.round(p.x - 11 + (t * 4 + 10) % 20), p.y + 1, 2, 1); }
      if (layout === 'river') drawRiver(t);
      if (layout === 'island') drawFall(t);
      for (const tr of S.trees) drawTree(tr, t);
      drawTufts(t); drawFlowers(t); drawFlies();
      if (layout === 'island') drawPondFx(t);
      const ents = [{ y: S.Y0 - 2, fn: drawUmbPole }, { y: S.Y0, fn: drawGroup }, { y: S.Y0 + 0.5, fn: drawSpeaker }, { y: S.cY, fn: drawCorgi }];
      if (S.cofX != null) ents.push({ y: S.Y0 + 0.6, fn: drawGirlStanding });   // (the coffee table was removed)
      if (rab.on) ents.push({ y: S.rY, fn: drawRabbit });
      ents.sort((a, b) => a.y - b.y);
      for (const e of ents) e.fn(t);
      drawUmbCanopy();
      if (layout !== 'island') drawBlades(t);
      } finally { lg.restore(); lg.globalAlpha = 1; }
      for (let i = h0; i < hits.length; i++) hits[i].y += bob;
      if (S.sea) for (const b of S.sea) if (b.front) lg.drawImage(b.img, q(wrapX(b.x + off * 1.8, S.seaSpan)), b.y + q(Math.sin(t * 0.6 + b.x) * 1.5));
    }
    function pcircle(cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } }
    function drawLights(t, dk) {
      g.globalCompositeOperation = 'lighter';
      if (dk > 0.05) {
        pcircle(S.deskX + 6, S.deskY + 13, 9, 'rgba(110,200,255,' + (0.1 * dk).toFixed(3) + ')');
        if (st.lamp) {
          const lx = S.deskX + 26, ly = S.deskY + 10;
          [[34, 0.035], [24, 0.05], [15, 0.07], [8, 0.1]].forEach(q => pcircle(lx, ly + 6, q[0], 'rgba(255,190,110,' + (q[1] * dk).toFixed(3) + ')'));
          g.fillStyle = 'rgba(255,214,140,' + (0.13 * dk).toFixed(3) + ')';
          for (let j = 0; j < 13; j++) { const hw = 2 + Math.round(j * 0.8); g.fillRect(lx - hw, ly + j, hw * 2 + 1, 1); }
          g.fillStyle = 'rgba(255,240,180,' + (0.8 * dk).toFixed(3) + ')'; g.fillRect(lx, ly - 1, 2, 1);
        }
        for (const f of fireflies) {
          if (f.a <= 0.02) continue; const x = Math.round(f.x), y = Math.round(f.y);
          g.fillStyle = 'rgba(255,240,140,' + f.a.toFixed(3) + ')'; g.fillRect(x, y, 1, 1);
          g.fillStyle = 'rgba(200,255,120,' + (f.a * 0.35).toFixed(3) + ')'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
        }
      }
      if (layout === 'river') drawRiverGlints(t);
      if (layout === 'island') {
        if (dk > 0.05) {
          const L = S.lantern; if (fx.lantern) {
          [[16, 0.04], [10, 0.07], [5, 0.12]].forEach(q => pcircle(L.x, L.y - 25, q[0], 'rgba(255,200,120,' + (q[1] * dk).toFixed(3) + ')'));
          g.fillStyle = 'rgba(255,230,160,' + (0.6 * dk).toFixed(3) + ')'; g.fillRect(L.x - 2, L.y - 27, 5, 5); }
          for (let i = 0; i < S.bulbs.length; i++) {
            const b = S.bulbs[i], a = dk * (0.55 + 0.45 * Math.sin(t * 2 + i * 1.7));
            g.fillStyle = css(b.rgb, a); g.fillRect(b.x, b.y + 1, 1, 2);
            g.fillStyle = css(b.rgb, a * 0.35); g.fillRect(b.x - 1, b.y, 3, 4);
          }
        }
        for (const gm of S.gems) {
          const a = Math.pow(Math.max(0, Math.sin(t * 1.1 + gm.ph)), 10); if (a < 0.15) continue;
          g.fillStyle = 'rgba(255,255,255,' + (a * (0.6 + dk * 0.4)).toFixed(3) + ')'; g.fillRect(gm.x - 1, gm.y, 3, 1); g.fillRect(gm.x, gm.y - 1, 1, 3);
        }
      }
      g.globalCompositeOperation = 'source-over';
    }
    function drawDrops() {
      if (!drops.length) return;
      g.fillStyle = 'rgba(205,228,255,0.75)';
      for (const d of drops) { const x = q(d.x), y = q(d.y); g.fillRect(x, y, 1, 2); g.fillRect(x - 1, y + 2, 1, d.len - 2); }
    }
    function drawParts() {
      for (const p of parts) {
        const a = clamp(p.life / p.max * 1.5, 0, 1), x = q(p.x), y = q(p.y);
        g.globalAlpha = a;
        switch (p.type) {
          case 'note': g.drawImage(SPR.note, x, y); break;
          case 'heart': g.drawImage(SPR.heart, x, y); break;
          case 'bang': g.drawImage(SPR.bang, x, y); break;
          case 'z': g.drawImage(SPR.z, x, y); break;
          case 'spark': g.fillStyle = p.c || '#fff6b0'; g.fillRect(x, y, 1, 1); if (p.life > p.max * 0.4) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } break;
          case 'steam': g.globalAlpha = a * 0.6; g.fillStyle = '#ffffff'; g.fillRect(x + Math.round(Math.sin(p.life * 4)), y, 1, 1); break;
          case 'splash': g.fillStyle = 'rgba(210,235,255,0.8)'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); break;
          case 'leaf': g.fillStyle = p.c || '#5fb64a'; g.fillRect(x, y, 2, 1); break;
          case 'banana': g.fillStyle = P.K; g.fillRect(x - 1, y - 1, 5, 4); g.fillStyle = '#ffd23f'; g.fillRect(x, y, 3, 1); g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 2, y + 1, 1, 1); g.fillStyle = '#fff3a0'; g.fillRect(x + 1, y, 1, 1); break;
          case 'mist': g.globalAlpha = a * 0.6; g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); break;
          case 'fruit': g.fillStyle = P.K; g.fillRect(x - 1, y - 1, 4, 4); g.fillStyle = p.c; g.fillRect(x, y, 2, 2); g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); g.fillStyle = '#3f8a35'; g.fillRect(x + 1, y - 1, 1, 1); break;
          case 'mail': g.fillStyle = P.K; g.fillRect(x - 1, y - 1, 8, 6); g.fillStyle = '#ffffff'; g.fillRect(x, y, 6, 4); g.fillStyle = '#c9ccd6'; g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + 2, y + 2, 2, 1); g.fillRect(x + 4, y + 1, 1, 1); g.fillStyle = '#e0483e'; g.fillRect(x + 2, y + 3, 2, 1); break;
        }
      }
      g.globalAlpha = 1;
    }
    // speech bubble above the character (pixel box, smooth text)
    function drawSay() {
      const sy = fx.say; if (!sy) return;
      const a = Math.min(1, sy.t / 0.12, (3.6 - sy.t) / 0.3), rise = sy.t < 0.15 ? Math.round((0.15 - sy.t) / 0.15 * 3) : 0;
      const hx3 = girl.mode === 'work' ? S.bodyX + 15 : girl.gx, hy = (girl.mode === 'work' ? S.bodyY - 12 : S.Y0 - 50) + rise;
      g.save(); g.globalAlpha = Math.max(0, a);
      g.font = '600 6px "Roboto", system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      const maxW = Math.min(W - 16, 132), words = (window.HeroI18n ? window.HeroI18n.t(sy.text) : sy.text).split(' '), lines = []; let cur = '';
      for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
      lines.push(cur);
      const tw = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))), lh = 8;
      const ref = g.measureText('Hgy'), asc = ref.actualBoundingBoxAscent || 4.6, desc = ref.actualBoundingBoxDescent || 1.4, capH = g.measureText('H').actualBoundingBoxAscent || 4.4;
      const bw = tw + 12, bh = lines.length * lh + 6;
      const bx = Math.round(clamp(hx3 - bw / 2, 4, W - bw - 4)), by = Math.round(hy - bh - 6);
      g.fillStyle = 'rgba(42,34,56,0.25)'; g.fillRect(bx + 1, by + 2, bw, bh);
      g.fillStyle = P.K; g.fillRect(bx - 1, by, bw + 2, bh); g.fillRect(bx, by - 1, bw, bh + 2);
      g.fillStyle = '#fffaf0'; g.fillRect(bx, by, bw, bh);
      const tx = Math.round(clamp(hx3, bx + 4, bx + bw - 5));
      g.fillStyle = P.K; g.fillRect(tx - 3, by + bh, 7, 1); g.fillRect(tx - 2, by + bh + 1, 5, 1); g.fillRect(tx - 1, by + bh + 2, 3, 1); g.fillRect(tx, by + bh + 3, 1, 1);
      g.fillStyle = '#fffaf0'; g.fillRect(tx - 2, by + bh, 5, 1); g.fillRect(tx - 1, by + bh + 1, 3, 1); g.fillRect(tx, by + bh + 2, 1, 1);
      g.fillStyle = '#141b33';
      // optical centre: put the cap-height band in the middle of each line slot
      lines.forEach((l, i) => g.fillText(l, bx + bw / 2, by + 3 + i * lh + lh / 2 + capH / 2));
      g.restore();
    }
    function drawHint(t) {
      // hover feedback: a small twinkle above whatever the pointer is over (no arrows, no quest list)
      const hv = st.hov; if (!hv || fx.say) return;  // no sparkle on top of the speech bubble's tail
      const x = Math.round(hv.x), y = Math.round(hv.y - 3 + Math.sin(t * 6) * 1), a = 0.75 + 0.25 * Math.sin(t * 9);
      g.globalAlpha = a; g.fillStyle = 'rgba(42,34,56,0.55)'; g.fillRect(x - 1, y - 3, 3, 7); g.fillRect(x - 3, y - 1, 7, 3);
      g.fillStyle = '#fff6c8'; g.fillRect(x, y - 2, 1, 5); g.fillRect(x - 2, y, 5, 1); g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); g.globalAlpha = 1;
    }

    // where a quest points to in the scene (internal pixels)
    function hlPos(id) {
      switch (id) {
        case 'speaker': return [S.spkX + 8, S.spkY - 4];
        case 'sky': return S.sunPos || S.moonPos || null;
        case 'cloud': { for (const c of S.clouds) if (c.x > 8 && c.x + c.w < W - 8) return [Math.round(c.x + c.w / 2), c.y + 2]; return null; }
        case 'corgi': return [Math.round(corgi.x) + 15, S.cY - 20];
        case 'flower': return S.plantSpot || null;
        case 'rabbit': return rab.on ? [Math.round(rab.x) + 9, Math.round(S.rY - 16 - rab.air)] : [Math.round(S.rMin) + 12, S.rY - 16];
        case 'girl': return [S.bodyX + 14, S.bodyY - 12];
      }
      return null;
    }
    function drawHighlight(t) {
      if (!st.hl) return;
      const p = hlPos(st.hl); if (!p) return;
      const bob = Math.round(Math.abs(Math.sin(t * 6)) * 3);
      if (st.hl === 'flower') {
        const r = 5 + Math.round((Math.sin(t * 5) + 1) * 1.5);
        g.fillStyle = '#fff6b0';
        for (let a = 0; a < 16; a += 2) { const an = a / 16 * Math.PI * 2; g.fillRect(Math.round(p[0] + Math.cos(an) * r), Math.round(p[1] + Math.sin(an) * r * 0.5), 1, 1); }
      }
      g.drawImage(SPR.arrow, p[0] - 4, p[1] - 9 - bob);
    }
    function drawBirds(t) {
      if (!S.birds.length || darkness(st.hour) > 0.6 || st.rain > 0.5) return;
      lg.fillStyle = '#3a3150';
      for (const b of S.birds) {
        const x = q(b.x), y = q(b.y), up = Math.sin(t * 10 + b.ph) > 0 ? -1 : 1;
        lg.fillRect(x - 2, y + up, 1, 1); lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x + 2, y + up, 1, 1);
      }
    }

    function render() {
      const t = st.t, h = st.hour, dk = darkness(h), pal = palette(h, st.rain, dk);
      const key = Math.round(h * 30) + '|' + Math.round(st.rain * 30);
      if (key !== skyC.key) { skyC.key = key; if (FLAT) { if (opts.onPage) opts.onPage(pageColor(h, st.rain)); } else drawSky(skyC.c.getContext('2d'), pal); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      if (FLAT) g.clearRect(0, 0, W, H); else g.drawImage(skyC.c, 0, 0);
      hits = [];
      S.sunPos = null; S.moonPos = null;
      drawStars(t, dk);
      drawSunMoon(h, dk);
      drawSkyFx(t, h, dk);
      if (st.rainbow > 0.01) { g.globalAlpha = st.rainbow * (1 - dk * 0.75) * 0.85; g.drawImage(S.rainbowC, 0, 0); g.globalAlpha = 1; }
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
      // the island rises and sinks slowly on an eased sine (about 8 s per breath)
      S.bob = (layout === 'island' && !reduce) ? q(Math.sin(t * 0.8) * 2.4 + Math.sin(t * 0.33 + 1) * 0.6) : 0;
      drawWorld(t);
      mg.clearRect(0, 0, mask.width, mask.height); mg.drawImage(layer, 0, 0);
      lg.globalCompositeOperation = 'multiply'; lg.fillStyle = css(pal.tint); lg.fillRect(0, 0, W, H);
      lg.globalCompositeOperation = 'destination-in'; lg.save(); lg.setTransform(1, 0, 0, 1, 0, 0); lg.drawImage(mask, 0, 0); lg.restore();
      lg.globalCompositeOperation = 'source-over';
      g.drawImage(layer, 0, 0, W, H);
      g.save(); g.translate(0, S.bob || 0);
      drawLights(t, dk);
      g.restore();
      drawDrops();
      g.save(); g.translate(0, S.bob || 0);
      drawParts();
      drawSay();
      g.restore();
      drawHint(t);
      const onIsland = st.hl && st.hl !== 'sky' && st.hl !== 'cloud';
      g.save(); if (onIsland) g.translate(0, S.bob || 0);
      drawHighlight(t);
      g.restore();
      if (opts.style && STYLES[opts.style]) stylize(opts.style, t);
    }

    /* ---- pixel styles: the finished frame is read back at world resolution and repainted in one look ---- */
    let sty = null;
    function stylize(name, t) {
      if (!sty || sty.c.width !== W || sty.c.height !== H) { const c = mk(W, H); sty = { c, x: c.getContext('2d', { willReadFrequently: true }) }; }
      const sx = sty.x; sx.imageSmoothingEnabled = false;
      sx.clearRect(0, 0, W, H); sx.drawImage(canvas, 0, 0, W, H);
      const im = sx.getImageData(0, 0, W, H);
      STYLES[name](im.data, W, H, t);
      sx.putImageData(im, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(sty.c, 0, 0, canvas.width, canvas.height); g.restore();
    }

    /* ---- input ---- */
    function toLocal(cx, cy) { const r = canvas.getBoundingClientRect(); return [(cx - r.left) / r.width * W, (cy - r.top) / r.height * H]; }
    function hitAt(x, y) {
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i];
        if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
        if (h.img && h.img._m) { const lx = Math.floor(x - h.x), ly = Math.floor(y - h.y); if (lx < 0 || ly < 0 || lx >= h.img.width || ly >= h.img.height || !h.img._m[ly * h.img.width + lx]) continue; }
        return h;
      }
      return null;
    }
    function setTime(name) { if (PRESET[name] == null) return; st.auto = false; st.target = PRESET[name]; notify(true); }
    function toggleMusic(force) {
      const on = force != null ? !!force : !Music.playing;
      if (on) { if (!Music.start(darkness(st.hour) > 0.5 ? 1 : 0)) return; st.hinted = true; } else Music.stop();
      emit('music'); notify(true);
    }
    function click(cxp, cyp) {
      if (!S) return;
      const p = toLocal(cxp, cyp), x = p[0], y = p[1], h = hitAt(x, y), gy = y - (S.bob || 0);
      if (!h) {
        if (canPlant(x, gy)) { const f = mkFlower(Math.round(x), Math.round(gy), (Math.random() * 5) | 0, Math.random()); f.grow = 0; S.flowers.push(f); S.flowers.sort((a, b) => a.y - b.y); burst(x, gy - 2, 6, '#fff6b0'); Music.sfx('pop'); emit('flower'); }
        return;
      }
      switch (h.id) {
        case 'speaker': toggleMusic(); break;
        case 'corgi': {
          const c = corgi;
          if (c.mode === 'walk' || c.mode === 'run') { c.mode = 'sit'; c.timer = 4; }
          else if (c.mode === 'sit') { c.mode = 'lie'; c.sleep = false; c.timer = 5; }
          else if (!c.shelter) walkTo(c.x + (Math.random() < 0.5 ? -60 : 60));
          addPart('heart', c.x + 12, S.cY - 28, { vy: -12, life: 1.4, max: 1.4 }); Music.sfx('bark'); emit('corgi'); break;
        }
        case 'girl': girl.wave = 1.6; fx.say = { text: LINES[fx.sayI % LINES.length], t: 0 }; fx.sayI++; Music.sfx('pop'); emit('girl'); break;
        case 'sun': case 'moon': { const order = ['noon', 'afternoon', 'night'], cur = timeName(st.target != null ? st.target : st.hour), ci = Math.max(0, order.indexOf(cur)); setTime(order[(ci + 1) % 3]); Music.sfx('click'); emit('sky'); break; }
        case 'cloud': h.ref.shower = 2.5; h.ref.puff = 1; Music.sfx('rain'); emit('cloud'); break;
        case 'tree': {
          const tr = h.ref, k = tr.kind; tr.shake = 1;
          for (let i = 0; i < 6; i++) addPart('leaf', tr.x + tr.img.width * (0.2 + Math.random() * 0.6), tr.y + tr.img.height * 0.35 * Math.random(), { life: 2.4, max: 2.4, c: k === 'blossom' ? (Math.random() < 0.5 ? '#ffc8dd' : '#ffffff') : k === 'pine' ? '#3f8a35' : '#5fb64a' });
          if (k === 'banana') { for (let i = 0; i < 3; i++) { const fxp = tr.x + tr.img.width * 0.55 + i * 3; addPart('banana', fxp, tr.y + tr.img.height * 0.4, { vx: (Math.random() - 0.5) * 14, vy: -6 - i * 2, life: 3.2, max: 3.2, gy: S.hY + 3 + Math.random() * 7 }); } if (!corgi.shelter && Math.random() < 0.7) walkTo(tr.x + tr.img.width * 0.5, true); }
          if (k === 'blossom') { for (let i = 0; i < 2; i++) { const fxp = tr.x + tr.img.width * (0.3 + Math.random() * 0.4); addPart('fruit', fxp, tr.y + tr.img.height * 0.45, { vx: (Math.random() - 0.5) * 10, vy: -6, life: 3, max: 3, gy: S.hY + 4 + Math.random() * 6, c: '#d7263d' }); } }
          if (k === 'fruit' || k === 'berry') { const fxp = tr.x + tr.img.width * (0.25 + Math.random() * 0.5); addPart('fruit', fxp, tr.y + tr.img.height * 0.4, { vx: (Math.random() - 0.5) * 10, vy: -8, life: 3, max: 3, gy: S.hY + 4 + Math.random() * 6, c: k === 'fruit' ? '#e8433a' : '#7a4fd0' }); if (!corgi.shelter && Math.random() < 0.6) walkTo(fxp - 12, true); }
          Music.sfx('rustle'); emit('tree'); break;
        }
        case 'rabbit': rab.jump = 1.2; addPart('heart', rab.x + 6, S.rY - 30, {}); Music.sfx('boing'); emit('rabbit'); break;
        case 'lamp': st.lamp = !st.lamp; Music.sfx('click'); emit('lamp'); break;
        case 'coffee': if (girl.mode === 'work') { girl.routineT = 0; startRoutine(); } burst(S.cofX + 4, S.Y0 - 20, 5, '#ffffff'); Music.sfx('pop'); emit('coffee'); break;
        case 'mail': fx.mailUp = 2.5; addPart('mail', S.mailX - 3, S.Y0 - 16, { vy: -16, life: 2.4, max: 2.4 }); Music.sfx('boing'); emit('mail'); break;
        case 'pond': fx.ripples.push({ x: x, y: S.pond.y, t: 0 }); if (!fx.fish) jumpFish(); Music.sfx('splash'); emit('pond'); break;
        case 'mini': { const m = h.ref, cx2 = h.x + h.w / 2, cy2 = h.y + h.h / 2; let dx = cx2 - x, dy = cy2 - y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; m.vx = (m.vx || 0) + dx * 34; m.vy = (m.vy || 0) + dy * 22 - 6; burst(x, y - (S.bob || 0), 5, '#fff6b0'); Music.sfx('boing'); emit('mini'); break; }
        case 'lantern': fx.lantern = !fx.lantern; Music.sfx('click'); emit('lantern'); break;
        case 'fly': h.ref.flee = 1.2; h.ref.vx = (Math.random() < 0.5 ? -1 : 1) * 40; emit('fly'); break;
      }
    }
    function move(cxp, cyp) {
      if (!S) return;
      const p = toLocal(cxp, cyp), h = hitAt(p[0], p[1]);
      canvas.style.cursor = h ? 'pointer' : (canPlant(p[0], p[1] - (S.bob || 0)) ? 'copy' : '');
      st.hov = h ? { x: h.x + h.w / 2, y: h.y - (h.id === 'cloud' ? 0 : 2) } : null;
    }

    /* ---- lifecycle ---- */
    function resize() {
      const cw = Math.max(120, host.clientWidth || 960), ch = Math.max(160, host.clientHeight || 540);
      k = opts.px ? opts.px : Math.max(1, Math.round(ch / 270)); while (!opts.px && k > 1 && ch / k < 220) k--;
      const nW = Math.ceil(cw / k), nH = Math.ceil(ch / k);
      canvas.style.width = (nW * k) + 'px'; canvas.style.height = (nH * k) + 'px';
      if (S && nW === W && nH === H && canvas.width === W * k) { layoutCb(); return; }
      W = nW; H = nH; canvas.width = W * k; canvas.height = H * k;
      layer = mk(W * k, H * k); lg = layer.getContext('2d'); mask = mk(W * k, H * k); mg = mask.getContext('2d'); skyC.c = mk(W, H); skyC.key = '';
      g.setTransform(k, 0, 0, k, 0, 0); lg.setTransform(k, 0, 0, k, 0, 0);
      g.imageSmoothingEnabled = false; lg.imageSmoothingEnabled = false;
      buildScene();
      layoutCb();
    }
    // tells the page where the character sits (CSS px), so a speech bubble can point at her
    function layoutCb() {
      if (!opts.onLayout || !S) return;
      opts.onLayout({ girl: { x: Math.round((S.bodyX + 14) * k), y: Math.round((S.bodyY - 10) * k) }, feet: { x: Math.round((S.bodyX + 14) * k), y: Math.round((S.Y0 - 1) * k) }, fall: S.fallX != null ? { x: Math.round((S.fallX + 0.5) * k), y: Math.round(S.fallY * k) } : null, k, vw: host.clientWidth || W * k, vh: host.clientHeight || H * k });
    }
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      update(dt); render();
    }
    resize();
    const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize);
    const io = window.IntersectionObserver ? new IntersectionObserver((es) => { visible = es[0] ? es[0].isIntersecting : true; }) : null;
    if (io) io.observe(canvas);
    raf = requestAnimationFrame(frame);
    notify(true);

    return {
      setTime,
      setHour(h) { st.auto = false; st.target = null; st.hour = ((h % 24) + 24) % 24; notify(false); },
      setWeather(w) { if (['sun', 'rain', 'rainbow'].indexOf(w) < 0) return; st.weather = w; notify(true); emit('weather'); },
      setAuto(on) { st.auto = !!on; st.target = null; notify(true); },
      // point a bouncing arrow at a scene object: speaker, sky, cloud, corgi, flower, rabbit, girl
      highlight(id, dur) { st.hl = id || null; st.hlT = id && dur ? dur : null; if (id === 'rabbit' && !rab.on) rab.next = Math.min(rab.next, 1.2); },
      celebrate(id) { const p = S && hlPos(id); if (!p) return; burst(p[0], p[1] + 6, 10, '#fff6b0'); addPart('heart', p[0] - 4, p[1] - 6, { vy: -12 }); },
      talk() { girl.wave = 1.4; },
      // change clothes / hair live (same keys as opts.outfit)
      setOutfit(o) { Object.assign(SPR, girlSprites(outfit(o))); },
      toggleMusic, click, move,
      // the page can borrow the character (e.g. she jumps down into the case studies); hidden = empty chair
      setGirlHidden(b) { girl.hidden = !!b; if (b) { girl.mode = 'work'; girl.act = null; girl.q = []; fx.say = null; } else girl.routineT = Math.max(girl.routineT, 20); },
      destroy() { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); else window.removeEventListener('resize', resize); if (io) io.disconnect(); Music.stop(); }
    };
  }

  window.PixelHero = { mount, songs: SONGS.map(s => s.name), girl: (o) => girlSprites(outfit(o)) };
})();
