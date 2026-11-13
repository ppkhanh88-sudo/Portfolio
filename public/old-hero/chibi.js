/* Khanh chibi sprite generator (48x48, per-region dark outlines).
   Chibi.sprites(opts) -> canvases for every pose the hero scene and the contact dive use.
   opts: { hair:'straight'|'wavy', hairColor:'espresso'|'choco'|'hazel'|'ash', top:'tee'|'hoodie',
           bottom:'jeans'|'jogger'|'midi'|'mini', shoes:'red'|'white',
           phones:'studio'|'gaming', phoneColor:'black'|'red'|'blue'|'green'|'gray', mic:bool, necklace:bool } */
(function () {
  'use strict';
  if (window.Chibi) return;
  const W = 48, H = 48;
  const P = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? y * W + x : -1;
  const pr = (v) => { const f = Math.floor(v), d = v - f; if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1; return Math.round(v); };   // Python round()
  const hx = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };

  /* ---------- point sets (Set of ints) ---------- */
  const S = (arr) => { const s = new Set(); for (const [x, y] of arr) { const p = P(x, y); if (p >= 0) s.add(p); } return s; };
  const U = (...sets) => { const s = new Set(); for (const a of sets) for (const p of a) s.add(p); return s; };
  const minus = (a, b) => { const s = new Set(); for (const p of a) if (!b.has(p)) s.add(p); return s; };
  const filt = (a, fn) => { const s = new Set(); for (const p of a) if (fn(p % W, (p / W) | 0)) s.add(p); return s; };
  const map = (a, fn) => { const out = []; for (const p of a) out.push(fn(p % W, (p / W) | 0)); return S(out); };
  const ell = (cx, cy, rx, ry) => { const s = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry; if (a * a + b * b <= 1) s.add(y * W + x); } return s; };
  const rect = (x0, y0, x1, y1) => { const a = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a.push([x, y]); return S(a); };
  const rows = (spec) => { const a = []; for (const y in spec) { const [x0, x1] = spec[y]; for (let x = x0; x <= x1; x++) a.push([x, +y]); } return S(a); };
  const mir = (a) => map(a, (x, y) => [47 - x, y]);
  const sym = (a) => U(a, mir(a));
  const rcup = (x0, y0, x1, y1) => minus(rect(x0, y0, x1, y1), S([[x0, y0], [x1, y0], [x0, y1], [x1, y1]]));
  const ring = (rxo, ryo, rxi, ryi, ymax, cy) => { cy = cy == null ? 17.5 : cy; return filt(minus(ell(24, cy, rxo, ryo), ell(24, cy, rxi, ryi)), (x, y) => y <= ymax); };
  const ys = (pts) => { let m = -1; for (const p of pts) m = Math.max(m, (p / W) | 0); return m; };

  /* ---------- sprite with selective outline ---------- */
  function Spr() { this.lab = new Array(W * H).fill(null); this.z = {}; this.n = 0; this.grp = {}; this.pal = {}; this.flat = new Set(); this.topsh = new Set(); this.det = new Map(); }
  Spr.prototype.reg = function (name, pal, group, flat) { if (!(name in this.z)) { this.z[name] = this.n++; this.pal[name] = pal.map(hx); this.grp[name] = group || name; if (flat) this.flat.add(name); } };
  Spr.prototype.paint = function (name, pts) { for (const p of pts) this.lab[p] = name; };
  Spr.prototype.erase = function (pts) { for (const p of pts) this.lab[p] = null; };
  Spr.prototype.dot = function (pts, col, reg) { const c = hx(col); for (const p of pts) this.det.set(p, [c, reg === undefined ? null : reg]); };
  Spr.prototype.render = function () {
    const out = new Uint8ClampedArray(W * H * 4), lab = this.lab, z = this.z, grp = this.grp;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : lab[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = lab[y * W + x]; if (r == null) continue;
      const [o, s, b, l] = this.pal[r], g = grp[r];
      const same = (nx, ny) => { const n = at(nx, ny); return n != null && grp[n] === g; };
      const edge = (nx, ny) => { const n = at(nx, ny); if (n == null) return true; if (grp[n] === g) return false; return z[n] < z[r]; };
      let c;
      if (edge(x + 1, y) || edge(x - 1, y) || edge(x, y + 1) || edge(x, y - 1)) c = o;
      else if (this.flat.has(r)) c = b;
      else if (this.topsh.has(r) && !same(x, y - 1)) c = s;
      else if (!same(x + 1, y) || !same(x, y + 1) || !same(x + 1, y + 1)) c = s;
      else if (!same(x, y - 1) || !same(x - 1, y)) c = l;
      else c = b;
      const i = (y * W + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
    }
    for (const [p, [c, reg]] of this.det) {
      if (reg == null || lab[p] === reg || (reg === '*any' && lab[p] != null)) { const i = p * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; }
    }
    return out;
  };
  function toCanvas(px, flip) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), id = g.createImageData(W, H);
    if (!flip) id.data.set(px);
    else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (y * W + x) * 4, b = (y * W + (W - 1 - x)) * 4; for (let k = 0; k < 4; k++) id.data[b + k] = px[a + k]; }
    g.putImageData(id, 0, 0); return c;
  }

  /* ---------- palettes ---------- */
  const SKIN = ['#B66E57', '#EBAA86', '#F8CFB2', '#FFE4D2'];
  const LASH = '#2A1714';
  const HAIR = {
    espresso: [['#22140F', '#3C2219', '#573226', '#764A39'], '#9C6A52'],
    choco: [['#2B1712', '#4A281D', '#6A3B2A', '#8C573F'], '#B0785A'],
    hazel: [['#4A2A16', '#7A4A28', '#A06A3C', '#C48C58'], '#E2B07A'],
    ash: [['#30261F', '#51433A', '#72625A', '#958478'], '#BBAA9C']
  };
  const TOP = { tee: ['#A08A66', '#E9DDC2', '#FFF4DC', '#FFFFFF'], hoodie: ['#A8711C', '#E0A23C', '#F4BE52', '#FFDB8A'] };
  const BOT = {
    jeans: ['#24365E', '#3E5C94', '#5277B8', '#7B9BD3'], jogger: ['#161D33', '#26304F', '#344166', '#4B5A86'],
    midi: ['#4B4636', '#6E6852', '#878067', '#A39C80'], mini: ['#2B3F6B', '#46649E', '#5A7EC0', '#86A6DC']
  };
  const SHOE = { red: [['#8A2620', '#C2382F', '#E0483E', '#F2796F'], '#FFFFFF', '#F4F1EA'], white: [['#6F7280', '#D8DAE2', '#FFFFFF', '#FFFFFF'], '#344166', '#344166'] };
  const PHONE = {
    studio: [['#8A7A62', '#D9CDB8', '#EFE6D6', '#FFFAF0'], '#C9A04A'],
    black: [['#0E1014', '#22252D', '#33373F', '#4A4F5A'], '#3FD9C6'],
    red: [['#5A1418', '#A3262C', '#C8343A', '#E25C60'], '#FFE3E3'],
    blue: [['#14244A', '#24448A', '#3062B8', '#5A8AD8'], '#BFEFFF'],
    green: [['#123C2A', '#22704E', '#2E9466', '#58BA88'], '#E2FFEF'],
    gray: [['#3A3C42', '#6A6D75', '#8A8D95', '#B0B3BA'], '#FFFFFF']
  };
  const IRIS = ['#2A1A12', '#5A3622', '#8E5E3A'];
  const GOLD = '#C9A04A', GOLD_L = '#E8C25A';

  function cfg(o) {
    o = o || {};
    const hc = HAIR[o.hairColor] || HAIR.espresso;
    const top = o.top === 'hoodie' ? 'hoodie' : 'tee', bottom = BOT[o.bottom] ? o.bottom : 'jeans';
    const sh = SHOE[o.shoes] || SHOE.red;
    const phones = o.phones === 'gaming' ? 'gaming' : 'studio';
    const ph = phones === 'studio' ? PHONE.studio : (PHONE[o.phoneColor] || PHONE.black);
    return {
      hair: o.hair === 'wavy' ? 'wavy' : 'straight', bang: o.hair === 'wavy' ? 'sweep' : 'middle', hp: hc[0], hhi: hc[1],
      top, T: TOP[top], bottom, B: BOT[bottom], pants: bottom === 'jeans' || bottom === 'jogger', skirt: bottom === 'midi' || bottom === 'mini',
      shoe: sh[0], shoeAcc: sh[1], sole: sh[2], phones, PH: ph[0], PA: ph[1], mic: phones === 'gaming' && o.mic !== false,
      necklace: !!o.necklace && top === 'tee'
    };
  }

  /* ---------- shared shapes ---------- */
  const headFront = () => ell(24, 20, 10, 9.5);
  const capFront = () => ell(24, 17.5, 12, 10.5);
  function bangY(style, x) {
    if (style === 'middle') return pr(12 + Math.abs(x - 23.5) * 0.62);
    if (style === 'sweep') return x < 19 ? 13 : pr(13 + (x - 19) * 0.6);
    return 17;
  }
  const LOCK = { middle: [30, 30], sweep: [30, 29] };
  const WAVE = [0, -1, -1, 0, 1, 1], WAVE_S = [0, 1, 1, 0, -1, -1];
  const mod6 = (v) => ((v % 6) + 6) % 6;

  function hairBackFront(c, step) {
    if (c.hair === 'straight') return U(ell(24, 18, 13, 11), rect(11, 18, 36, 40), rows({ 41: [12, 35] }));
    let m = ell(24, 18, 13, 11); const a = [];
    for (let y = 18; y < 42; y++) { const w = WAVE[mod6(y + step)]; for (let x = 11 + w; x < 37 - w; x++) a.push([x, y]); }
    return U(m, S(a), S([[12, 42], [13, 42], [14, 42], [33, 42], [34, 42], [35, 42]]));
  }
  function hairFrontMask(c) {
    const cap = capFront(), lb = LOCK[c.bang];
    const m = filt(cap, (x, y) => (x < 14 || x > 33) || y < bangY(c.bang, x));
    const a = [];
    for (let x = 12; x < 16; x++) {
      const b0 = lb[0] - (x === 15 ? 2 : 0) - (x === 12 ? 1 : 0), b1 = lb[1] - (x === 15 ? 2 : 0) - (x === 12 ? 1 : 0);
      for (let y = 13; y <= b0; y++) a.push([x, y]);
      for (let y = 13; y <= b1; y++) a.push([47 - x, y]);
    }
    return U(m, S(a));
  }
  function shine(s, c, reg, cx, x0, x1, hi0, hi1) {
    const pts = [];
    for (let x = x0; x <= x1; x++) { const t = (x + 0.5 - cx) / 9.2; if (Math.abs(t) >= 1) continue; pts.push([x, pr(17.0 - 7.2 * Math.sqrt(1 - t * t))]); }
    s.dot(S(pts.filter((p, i) => i % 4 !== 3)), c.hp[3], reg);
    s.dot(S(pts.filter((p) => p[0] >= hi0 && p[0] <= hi1)), c.hhi, reg);
  }

  /* ---------- face (front) ---------- */
  function faceFront(s, c, blink) {
    const [d, b, l] = IRIS;
    for (const ex of [16, 28]) {
      const outer = ex === 16 ? ex - 1 : ex + 4;
      if (blink) { s.dot(S([[ex, 22], [ex + 1, 22], [ex + 2, 22], [ex + 3, 22], [outer, 21]]), LASH, 'head'); continue; }
      s.dot(S([[ex, 20], [ex + 1, 20], [ex + 2, 20], [ex + 3, 20], [outer, 20]]), LASH, 'head');
      s.dot(S([[ex, 21], [ex + 2, 21], [ex + 3, 21], [ex, 22], [ex + 3, 22]]), d, 'head');
      s.dot(S([[ex + 2, 22]]), b, 'head');
      s.dot(S([[ex, 23], [ex + 1, 23], [ex + 2, 23], [ex + 3, 23]]), b, 'head');
      s.dot(S([[ex + 1, 24], [ex + 2, 24]]), l, 'head');
      s.dot(S([[ex + 1, 21], [ex + 1, 22]]), '#FFFFFF', 'head');
    }
    s.dot(S([[16, 25], [31, 25]]), '#F3B9AE', 'head');
    s.dot(S([[23, 26], [24, 26]]), '#B8556A', 'head'); s.dot(S([[22, 25], [25, 25]]), '#E39C8E', 'head');
  }

  /* ---------- headphones (front / back) ---------- */
  function phonesFront(s, c, back) {
    const P_ = c.PH, A = c.PA;
    s.reg('band', P_, 'band'); s.reg('cups', P_, 'cups');
    if (c.phones === 'gaming') {
      s.paint('band', ring(13.2, 11.7, 11.0, 9.5, 16)); s.paint('cups', sym(rcup(9, 15, 13, 24)));
      s.dot(sym(S([[10, 18], [10, 19], [10, 20], [10, 21]])), A, 'cups');
      s.dot(sym(S([[15, 9], [16, 9], [17, 9]])), A, 'band');
      if (!back && c.mic) {
        s.reg('mic', P_, 'mic'); s.paint('mic', S([[12, 25], [13, 25], [13, 26], [14, 26], [14, 27], [15, 27], [16, 27], [17, 27], [17, 28], [18, 28]]));
        s.reg('mict', [P_[0], A, A, A], 'mict'); s.paint('mict', S([[19, 27], [19, 28], [20, 27], [20, 28]]));
      }
    } else {
      s.paint('band', ring(12.9, 11.4, 11.2, 9.7, 16)); s.paint('cups', sym(rcup(9, 16, 13, 24)));
      s.dot(sym(S([[11, 18], [11, 19], [11, 20], [11, 21], [11, 22], [12, 19], [12, 20], [12, 21]])), A, 'cups');
      s.dot(sym(S([[10, 18], [10, 21]])), P_[3], 'cups');
    }
  }

  /* ---------- body, front / back ---------- */
  function shoesFront(s, c, liftL, liftR, back) {
    s.reg('shoeL', c.shoe, 'shoeL'); s.reg('shoeR', c.shoe, 'shoeR');
    const shoe = (x0, lift) => { const y = 44 - lift; return rows({ [y]: [x0 + 1, x0 + 4], [y + 1]: [x0, x0 + 5], [y + 2]: [x0, x0 + 5] }); };
    s.paint('shoeL', shoe(17, liftL ? 1 : 0)); s.paint('shoeR', mir(shoe(17, liftR ? 1 : 0)));
    for (const [rn, lift, x0] of [['shoeL', liftL, 17], ['shoeR', liftR, 25]]) {
      const y = 46 - (lift ? 1 : 0), a = [];
      for (let x = x0 + 1; x < x0 + 5; x++) a.push([x, y]);
      s.dot(S(a), c.sole, rn);
      if (!back) { s.dot(S([[x0 + 2, y - 2], [x0 + 3, y - 2]]), c.shoeAcc, rn); s.dot(S([rn === 'shoeL' ? [x0 + 1, y - 1] : [x0 + 4, y - 1]]), c.shoeAcc, rn); }
    }
  }
  function legTop(c) { return c.pants ? 40 : c.bottom === 'mini' ? 41 : 43; }
  function skirtTop(c) { return c.top === 'tee' ? 37 : 38; }
  function bodyFront(s, c, step, back) {
    const liftR = step === -1, liftL = step === 1, T = c.T, B = c.B, lt = legTop(c);
    const leg = (x0, lift) => rect(x0, lt, x0 + 3, 43 - lift);
    if (c.pants) {
      s.reg('pantL', B, 'pantL'); s.reg('pantR', B, 'pantR');
      s.paint('pantL', leg(19, liftL ? 1 : 0)); s.paint('pantR', leg(25, liftR ? 1 : 0));
    } else {
      s.reg('legL', SKIN, 'legL'); s.reg('legR', SKIN, 'legR');
      s.paint('legL', filt(leg(20, liftL ? 1 : 0), (x) => x !== 23)); s.paint('legR', filt(leg(25, liftR ? 1 : 0), (x) => x !== 28));
    }
    shoesFront(s, c, liftL, liftR, back);
    s.reg('neck', SKIN, 'neck'); s.paint('neck', rect(22, 28, 25, 30));
    // bottom (hip / skirt) goes under the top
    if (c.pants) { s.reg('pantHip', B, 'pantHip'); s.paint('pantHip', rect(18, 38, 29, 39)); }
    s.reg('top', T, 'top');
    const topEnd = (c.top === 'tee' && c.skirt) ? 36 : 37;
    const tspec = { 30: [18, 29] }; for (let y = 31; y <= topEnd; y++) tspec[y] = [17, 30];
    s.paint('top', rows(tspec));
    if (c.top === 'tee') {
      if (!back) {
        const dy = c.necklace ? 1 : 0;
        s.dot(map(S([[22, 32], [23, 32], [25, 32], [26, 32], [22, 33], [23, 33], [24, 33], [25, 33], [26, 33], [23, 34], [24, 34], [25, 34], [24, 35]]), (x, y) => [x, y + dy]), '#E0483E', 'top');
        s.dot(S([[21, 30], [22, 30], [23, 30], [24, 30], [25, 30], [26, 30]]), T[1], 'top');
      }
    } else {
      if (!back) {
        const rim = [[19, 31], [28, 31]]; for (let x = 19; x < 29; x++) rim.push([x, 30]);
        s.dot(S(rim), T[0], 'top');
        s.dot(S([[22, 31], [22, 32], [22, 33], [25, 31], [25, 32], [25, 33]]), '#FFFFFF', 'top');
        const pk = [[20, 35], [27, 35], [20, 36], [27, 36]]; for (let x = 20; x < 28; x++) pk.push([x, 34]);
        s.dot(S(pk), T[1], 'top');
      } else {
        const hd = []; for (let y = 30; y <= 32; y++) for (let x = 19; x < 29; x++) if (Math.abs(x - 23.5) < 5 - (y - 30)) hd.push([x, y]);
        s.dot(S(hd), T[1], 'top');
      }
      const hem = []; for (let x = 18; x < 30; x++) hem.push([x, 37]); s.dot(S(hem), T[1], 'top');
    }
    if (c.skirt) {
      s.reg('skirt', B, 'skirt');
      const st = skirtTop(c), sp = {};
      if (c.bottom === 'midi') { for (let y = st; y <= 42; y++) sp[y] = y <= 39 ? [17, 30] : [16, 31]; }
      else { for (let y = st; y <= 40; y++) sp[y] = y === 40 ? [15, 32] : y === st ? [17, 30] : [16, 31]; }
      s.paint('skirt', rows(sp));
      const pl = [], yEnd = c.bottom === 'midi' ? 42 : 40;
      for (const x of [19, 22, 25, 28]) for (let y = st + 1; y <= yEnd; y++) pl.push([x, y]);
      s.dot(S(pl), B[1], 'skirt');
    }
    if (c.bottom === 'jogger') {
      s.dot(S([[20, 43 - (liftL ? 1 : 0)], [21, 43 - (liftL ? 1 : 0)]]), B[3], 'pantL');
      s.dot(S([[26, 43 - (liftR ? 1 : 0)], [27, 43 - (liftR ? 1 : 0)]]), B[3], 'pantR');
    }
  }
  function armsFront(s, c, step, waveF) {
    const liftR = step === -1, liftL = step === 1, longS = c.top === 'hoodie';
    for (const side of [0, 1]) {
      if (waveF && side === 1) continue;
      const sw = ((side === 0 && liftR) || (side === 1 && liftL)) ? -1 : 0;
      const nm = 'arm' + side, sl = 'slv' + side;
      s.reg(nm, SKIN, nm);
      let arm = U(rect(15, 31 + sw, 17, 37 + sw), S([[16, 38 + sw]])); if (side) arm = mir(arm);
      s.paint(nm, arm);
      s.reg(sl, c.T, sl);
      let slv = longS ? U(rect(15, 31 + sw, 17, 37 + sw), S([[16, 30 + sw], [17, 30 + sw]])) : rows({ [31 + sw]: [14, 17], [32 + sw]: [14, 17], [33 + sw]: [14, 17], [34 + sw]: [15, 17] });
      if (side) slv = mir(slv);
      s.paint(sl, slv);
      if (longS) s.dot(S((side === 0 ? [15, 16, 17] : [30, 31, 32]).map((x) => [x, 37 + sw])), c.T[1], sl);
    }
  }
  // front wave: viewer-right arm bent up beside the head (f 0/1 = hand tilts out and back)
  function waveArm(s, c, f) {
    const upper = rect(30, 30, 35, 32), fx = 34 + f;
    const fore = U(rect(fx, 25, fx + 2, 29), rect(34, 28, 36, 29));
    const hand = U(ell(fx + 1.5, 23.5, 2.1, 2.1), S([[fx + 3, 22], [fx + 3, 23]]));
    s.reg('warm', SKIN, 'warm'); s.paint('warm', U(upper, fore, hand));
    s.reg('wslv', c.T, 'wslv');
    s.paint('wslv', c.top === 'hoodie' ? U(upper, filt(fore, (x, y) => y >= 27)) : rect(30, 30, 33, 32));
    if (c.top === 'hoodie') s.dot(S([[fx, 27], [fx + 1, 27], [fx + 2, 27]]), c.T[1], 'wslv');
  }
  function buildFront(c, step, back, blink, wave) {
    const s = new Spr(), hp = c.hp;
    s.reg('hairB', hp, 'hairB');
    if (!back) s.paint('hairB', hairBackFront(c, step));
    bodyFront(s, c, step, back);
    if (back) {
      s.reg('head', SKIN, 'head'); s.paint('head', headFront());
      let hb = U(hairBackFront(c, step), capFront(), headFront());
      hb = filt(hb, (x, y) => y < 30 || (x >= 14 && x <= 33));
      const ym = ys(hb);
      hb = minus(hb, S([[14, ym], [33, ym], [14, ym - 1], [33, ym - 1], [15, ym], [32, ym]]));
      s.paint('hairB', hb);
      const ln = [], hl = [];
      for (const x of [18, 23, 29]) for (let y = x !== 23 ? 21 : 24; y < ym - 1; y++) ln.push([x, y]);
      for (const x of [20, 26]) for (let y = 30; y < ym - 3; y++) hl.push([x, y]);
      s.dot(S(ln), hp[1], 'hairB'); s.dot(S(hl), hp[3], 'hairB');
      shine(s, c, 'hairB', 24, 16, 31, 18, 21);
      armsFront(s, c, step, false);
    } else {
      armsFront(s, c, step, wave != null);
      s.reg('head', SKIN, 'head'); s.topsh.add('head'); s.paint('head', headFront());
      s.reg('hairF', hp, 'hairF'); s.paint('hairF', hairFrontMask(c));
      shine(s, c, 'hairF', 24, 16, 31, 18, 21);
      if (c.bang === 'middle') s.dot(S([[23, 8], [23, 9], [23, 10], [23, 11], [23, 12], [24, 12]]), hp[1], 'hairF');
      faceFront(s, c, blink);
    }
    phonesFront(s, c, back);
    if (!back && c.necklace) { s.dot(S([[21, 31], [22, 32], [23, 32], [24, 32], [25, 32], [26, 31]]), GOLD, null); s.dot(S([[23, 33], [24, 33]]), GOLD_L, null); }
    if (wave != null) waveArm(s, c, wave);
    return s.render();
  }

  /* ---------- side view (facing left) ---------- */
  function hairBackSide(c, step) {
    const bot = c.hair === 'straight' ? 41 : 42, a = [];
    for (let y = 16; y <= bot; y++) {
      const w = c.hair === 'wavy' ? WAVE_S[mod6(y + step)] : 0;
      const x0 = y > 26 ? 26 : 24, x1 = 36 + w - (y > bot - 2 ? 1 : 0) + (y > 32 ? step : 0);
      for (let x = x0; x <= x1; x++) a.push([x, y]);
    }
    return S(a);
  }
  function headSide(s, c, blink) {
    const hp = c.hp;
    s.reg('head', SKIN, 'head'); s.topsh.add('head'); s.paint('head', headFront());
    const cap = ell(25, 17.5, 12, 10.5), head = headFront(), bs = c.bang === 'middle' ? 15 : 16;
    const face = filt(head, (x, y) => (x <= 23 && y >= bs + (x - 14) * 0.45) || (x <= 27 && y >= 27));
    s.reg('hairF', hp, 'hairS'); s.paint('hairF', minus(U(cap, head), face));
    const [d, b, l] = IRIS;
    if (blink) s.dot(S([[16, 22], [17, 22], [18, 22], [19, 21]]), LASH, 'head');
    else {
      // side eye = the front eye seen edge-on: round dark iris, one big catch-light, warm lower half, a soft lash on top
      s.dot(S([[16, 20], [17, 20], [18, 20], [19, 20]]), LASH, 'head');
      s.dot(S([[16, 21], [18, 21], [16, 22], [17, 22]]), d, 'head'); s.dot(S([[17, 21]]), '#FFFFFF', 'head');
      s.dot(S([[18, 22], [16, 23], [18, 23]]), b, 'head'); s.dot(S([[17, 23]]), l, 'head');
    }
    s.dot(S([[18, 25], [19, 25]]), '#F3B9AE', 'head');
    s.dot(S([[15, 26]]), '#B8556A', 'head');
    shine(s, c, 'hairF', 25, 17, 32, 19, 22);
    // headphones
    const P_ = c.PH, A = c.PA;
    s.reg('cups', P_, 'cups'); s.reg('band', P_, 'band');
    const topband = filt(ell(25, 17.5, 12.4, 10.9), (x, y) => (x === 26 || x === 27) && y <= 16);
    if (c.phones === 'gaming') {
      s.paint('band', U(topband, map(topband, (x, y) => [28, y])));
      s.paint('cups', rcup(24, 15, 30, 25));
      s.dot(S([[26, 17], [26, 18], [26, 19], [26, 20], [26, 21], [26, 22], [26, 23]]), A, 'cups');
      if (c.mic) {
        s.reg('mic', P_, 'mic'); s.paint('mic', S([[23, 24], [22, 25], [21, 25], [20, 26], [19, 26], [18, 27]]));
        s.reg('mict', [P_[0], A, A, A], 'mict'); s.paint('mict', S([[16, 27], [17, 27], [16, 28], [17, 28]]));
      }
    } else {
      s.paint('band', topband); s.paint('cups', rcup(24, 16, 29, 24));
      s.dot(S([[26, 18], [26, 19], [26, 20], [26, 21], [26, 22], [27, 19], [27, 20], [27, 21]]), A, 'cups');
    }
  }
  function topSide(s, c, seated) {
    const T = c.T; s.reg('top', T, 'top');
    if (c.top === 'tee') {
      const end = c.skirt && !seated ? 36 : 37;
      s.paint('top', U(rows({ 30: [20, 27] }), rect(18, 31, 29, end)));
    } else {
      s.paint('top', U(rows({ 30: [20, 27] }), rect(19, 31, 28, 37)));
      const hem = []; for (let x = 19; x < 29; x++) hem.push([x, 37]); s.dot(S(hem), T[1], 'top');
      const hd = []; for (let y = 30; y <= 32; y++) for (let x = 25; x < 29; x++) if (x - 25 >= y - 30) hd.push([x, y]);
      s.dot(S(hd), T[1], 'top');
      s.dot(S([[20, 31], [20, 32], [20, 33]]), '#FFFFFF', 'top');
      if (!seated) s.dot(S([[19, 34], [20, 34], [21, 34], [19, 35], [19, 36]]), T[1], 'top');
    }
    if (c.necklace) s.dot(S([[20, 30], [19, 31], [19, 32]]), GOLD, '*any');
  }
  function armSide(s, c, pts, cut) {
    s.reg('arm', SKIN, 'arm'); s.reg('slv', c.T, 'slv');
    s.paint('arm', pts);
    const longS = c.top === 'hoodie';
    const slv = longS ? cut.long(pts) : cut.short(pts);
    s.paint('slv', slv);
    if (longS) { const my = ys(slv); s.dot(filt(slv, (x, y) => y === my), c.T[1], 'slv'); }
  }
  const byY = (lim) => (pts) => filt(pts, (x, y) => y <= lim);
  function buildSide(c, step, blink, pose) {
    pose = pose || 'stand';
    const s = new Spr(), hp = c.hp, B = c.B, seated = pose === 'seat';
    s.reg('hairB', hp, 'hairS');
    s.paint('hairB', seated ? filt(hairBackSide(c, 0), (x, y) => y <= 39) : hairBackSide(c, step));
    if (!seated) {
      const lt = legTop(c), legpal = c.pants ? B : SKIN;
      s.reg('legB', legpal, 'legB'); s.reg('legA', legpal, 'legA'); s.reg('shoeB', c.shoe, 'shoeB'); s.reg('shoeA', c.shoe, 'shoeA');
      const shoe = (x0, y) => rows({ [y]: [x0 + 1, x0 + 4], [y + 1]: [x0, x0 + 5], [y + 2]: [x0, x0 + 5] });
      let shoes;
      if (step === 0) { s.paint('legA', rect(21, lt, 24, 43)); s.paint('shoeA', shoe(19, 44)); shoes = [['shoeA', 19, 44]]; }
      else {
        s.paint('legB', rect(25, lt, 28, 42)); s.paint('shoeB', shoe(24, 43));
        s.paint('legA', U(rect(18, lt, 21, 43), S([[22, lt], [22, lt + 1]]))); s.paint('shoeA', shoe(16, 44));
        shoes = [['shoeB', 24, 43], ['shoeA', 16, 44]];
      }
      for (const [rn, x0, y] of shoes) {
        const a = []; for (let x = x0 + 1; x < x0 + 6; x++) a.push([x, y + 2]);
        s.dot(S(a), c.sole, rn); s.dot(S([[x0 + 2, y + 1], [x0 + 3, y]]), c.shoeAcc, rn);
      }
      if (c.pants) {
        const cuffs = step === 0 ? [[21, 43, 24]] : [[18, 43, 21], [25, 42, 28]], a = [];
        for (const [x0, y, x1] of cuffs) for (let x = x0; x <= x1; x++) a.push([x, y]);
        s.dot(S(a), c.bottom === 'jogger' ? B[3] : B[1], '*any');
      }
    } else {
      // seated on a chair, facing left: thighs forward, shins hanging, feet just off the floor
      const lp = c.pants ? B : SKIN;
      s.reg('thigh', lp, 'thigh'); s.reg('shin', lp, 'shin'); s.reg('shoeA', c.shoe, 'shoeA');
      s.paint('thigh', rect(13, 38, 27, 40)); s.paint('shin', rect(13, 41, 16, 43));
      s.paint('shoeA', rows({ 44: [11, 15], 45: [10, 16], 46: [10, 16] }));
      s.dot(S([[11, 46], [12, 46], [13, 46], [14, 46], [15, 46]]), c.sole, 'shoeA'); s.dot(S([[12, 45], [13, 44]]), c.shoeAcc, 'shoeA');
      if (c.pants) s.dot(S([[13, 43], [14, 43], [15, 43], [16, 43]]), c.bottom === 'jogger' ? B[3] : B[1], 'shin');
    }
    s.reg('neck', SKIN, 'neck'); s.paint('neck', rect(22, 28, 25, 30));
    if (c.pants && !seated) { s.reg('hip', B, 'hip'); s.paint('hip', rect(19, c.top === 'tee' ? 37 : 38, 28, 39)); }
    topSide(s, c, seated);
    if (c.skirt) {
      s.reg('skirt', B, 'skirt');
      const st = seated ? 37 : skirtTop(c), sp = {};
      let x0f;
      if (seated) {
        if (c.bottom === 'midi') { for (let y = st; y <= 40; y++) sp[y] = [12, 29]; sp[41] = [11, 17]; sp[42] = [11, 17]; x0f = 12; }
        else { for (let y = st; y <= 40; y++) sp[y] = [16, 29]; x0f = 16; }
      } else if (c.bottom === 'midi') { for (let y = st; y <= 42; y++) sp[y] = y === st ? [18, 29] : y <= 41 ? [17, 30] : [16, 31]; }
      else { for (let y = st; y <= 40; y++) sp[y] = y < st + 2 ? [18, 29] : y < 40 ? [17, 30] : [16, 31]; }
      s.paint('skirt', rows(sp));
      const pl = [];
      if (seated) { for (const x of [16, 20, 24]) if (x >= x0f + 2) pl.push([x, 39], [x, 40]); }
      else { const yEnd = c.bottom === 'midi' ? 42 : 40; for (const x of [19, 22, 25, 28]) for (let y = st + 1; y <= yEnd; y++) pl.push([x, y]); }
      s.dot(S(pl), B[1], 'skirt');
    }
    // arm
    const shortCut = c.top === 'hoodie' ? null : 34;
    if (pose === 'stand' || pose === 'walk') {
      let arm;
      if (step === 0) arm = U(rect(22, 31, 24, 37), S([[23, 38]]));
      else if (step === -1) arm = S([[22, 31], [23, 31], [24, 31], [23, 32], [24, 32], [25, 32], [24, 33], [25, 33], [26, 33], [25, 34], [26, 34], [27, 34], [26, 35], [27, 35], [28, 35], [27, 36], [28, 36]]);
      else arm = S([[22, 31], [23, 31], [24, 31], [21, 32], [22, 32], [23, 32], [20, 33], [21, 33], [22, 33], [19, 34], [20, 34], [21, 34], [18, 35], [19, 35], [20, 35], [18, 36], [19, 36]]);
      armSide(s, c, arm, { long: byY(37), short: byY(shortCut) });
      headSide(s, c, blink);
    } else if (pose === 'seat') {
      headSide(s, c, blink);
      if (step === 2) {   // waving hello: upper arm forward under the chin, forearm up in front of the face edge
        const up = [], fo = [];
        for (let x = 12; x <= 22; x++) { const y = pr(31 - (22 - x) * 0.15); up.push([x, y], [x, y + 1]); }
        for (let y = 23; y <= 30; y++) fo.push([9, y], [10, y], [11, y]);
        s.reg('arm', SKIN, 'warm'); s.reg('slv', c.T, 'wslv');
        s.paint('arm', U(S(up), S(fo), ell(10.5, 21, 2, 2)));
        s.paint('slv', c.top === 'hoodie' ? U(S(up), filt(S(fo), (x, y) => y >= 25)) : filt(S(up), (x) => x >= 17));
      } else {
        const dy = step === 1 ? -1 : 0;
        const arm = S([[22, 31], [23, 31], [24, 31], [21, 32], [22, 32], [23, 32], [20, 33], [21, 33], [22, 33], [19, 34 + dy], [20, 34 + dy], [21, 34 + dy], [18, 34 + dy], [17, 34 + dy], [16, 34 + dy], [15, 34 + dy], [14, 34 + dy], [14, 35 + dy], [15, 35 + dy], [16, 35 + dy], [17, 35 + dy], [18, 35 + dy], [19, 35 + dy], [20, 35 + dy]]);
        s.reg('arm', SKIN, 'arm2'); s.reg('slv', c.T, 'slv2');
        s.paint('arm', arm);
        s.paint('slv', c.top === 'hoodie' ? filt(arm, (x) => x >= 16) : filt(arm, (x, y) => y <= 33));
        if (c.top === 'hoodie') s.dot(filt(arm, (x) => x === 16), c.T[1], 'slv');
      }
    } else if (pose === 'drink') {
      headSide(s, c, blink);
      const up = step === 1 ? 1 : 0;   // sip: mug a pixel higher, tilted to the mouth
      const arm = S([[22, 31], [23, 31], [24, 31], [22, 32], [23, 32], [24, 32], [22, 33], [23, 33], [24, 33], [21, 34], [22, 34], [23, 34], [20, 33 - up], [19, 32 - up], [18, 31 - up], [17, 30 - up], [18, 30 - up], [19, 31 - up], [20, 32 - up], [21, 33]]);
      s.reg('arm', SKIN, 'arm3'); s.reg('slv', c.T, 'slv3');
      s.paint('arm', arm); s.paint('slv', c.top === 'hoodie' ? filt(arm, (x, y) => !(x <= 18 && y <= 31)) : filt(arm, (x, y) => x >= 22 && y <= 33));
      s.reg('mug', ['#8A7F70', '#E4DCCF', '#F6F1E8', '#FFFFFF'], 'mug'); s.paint('mug', rect(13, 26 - up, 16, 30 - up)); s.paint('mug', S([[17, 27 - up], [17, 28 - up]]));
      s.dot(S([[13, 26 - up], [14, 26 - up], [15, 26 - up], [16, 26 - up]]), '#6B3F22', 'mug');
      s.dot(S([[14, 28 - up], [15, 28 - up]]), '#E0483E', 'mug');
    }
    return s.render();
  }

  /* ---------- public: build the full sprite set ---------- */
  const cache = new Map();
  function sprites(o) {
    const c = cfg(o), key = JSON.stringify(c);
    if (cache.has(key)) return cache.get(key);
    const F = (px) => toCanvas(px, false), R = (px) => toCanvas(px, true);
    const side = (step, blink, pose) => buildSide(c, step, blink, pose);
    const out = {
      v2: true, w: 48, h: 48,
      walk: { front: [-1, 0, 1].map((st) => F(buildFront(c, st, false, false))), back: [-1, 0, 1].map((st) => F(buildFront(c, st, true, false))),
              left: [-1, 0, 1].map((st) => F(side(st, false, 'walk'))), right: [-1, 0, 1].map((st) => R(side(st, false, 'walk'))) },
      idle: { left: F(side(0, false, 'stand')), right: R(side(0, false, 'stand')), leftB: F(side(0, true, 'stand')), rightB: R(side(0, true, 'stand')),
              front: F(buildFront(c, 0, false, false)), frontB: F(buildFront(c, 0, false, true)) },
      seatR: [0, 1, 2].map((f) => R(side(f, false, 'seat'))), seatRB: [0, 1, 2].map((f) => R(side(f, true, 'seat'))),
      drinkL: [0, 1].map((f) => F(side(f, false, 'drink'))), drinkR: [0, 1].map((f) => R(side(f, false, 'drink'))),
      wave: [0, 1].map((f) => F(buildFront(c, 0, false, false, f))), waveB: [0, 1].map((f) => F(buildFront(c, 0, false, true, f)))
    };
    cache.set(key, out);
    return out;
  }
  window.Chibi = { sprites, cfg, W, H };
})();
