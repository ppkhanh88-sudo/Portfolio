/* Khanh page logic (Phantom-style layout): island hero + chat with follow-ups + pinned case-study heading.
   Usage in an artboard: renderVals(){ return window.KP ? KP.vals(this) : {}; }  componentDidUpdate(){ KP && KP.after(this); } */
(function () {
  'use strict';
  if (window.KP) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // follow-up questions shown after each answer (ids from hero-chat.js)
  const NEXT = { now: ['impact', 'ai'], years: ['now', 'tools'], ai: ['tools', 'impact'], impact: ['ai', 'now'], tools: ['ai', 'years'] };
  const S = (self) => self.state || {};

  function mountScene(self) {
    const go = () => {
      if (!self._cv || self.ctrl || !self._alive) return;
      if (!window.PixelHero) { self._t = setTimeout(go, 80); return; }
      self.ctrl = window.PixelHero.mount(self._cv, Object.assign({
        layout: 'island', hour: 12.5, seed: 41, outfit: self._outfit,
        onChange: (s) => self.setState({ time: s.time, weather: s.weather, music: s.music })
      }, typeof self.heroOpts === 'function' ? self.heroOpts() : {}));
    };
    go();
  }
  function scroll(self) {
    if (self._sc) return; self._sc = true;
    // a very tall window means the canvas is showing the whole page at once: lay it out flat (no pin)
    const flat = window.innerHeight >= 1600;
    self.setState({ flat });
    if (flat || reduce) { self.setState({ k: 1, o: 1 }); return; }
    let raf = 0;
    const upd = () => {
      raf = 0; const el = self._hero; if (!el) return;
      // 0 when the hero's bottom edge is at the fold, 1 once it has risen to 35% of the viewport (the heading is then fully in view)
      const p = Math.max(0, Math.min(1, (1 - el.getBoundingClientRect().bottom / window.innerHeight) / 0.65));
      self.setState({ k: +(0.88 + 0.12 * p).toFixed(3), o: +(0.15 + 0.85 * p).toFixed(3) });
    };
    self._onScroll = () => { if (!raf) raf = requestAnimationFrame(upd); };
    window.addEventListener('scroll', self._onScroll, { passive: true });
    window.addEventListener('resize', self._onScroll);
    upd();
  }
  function reveal(self, key) {
    self._rv = self._rv || {};
    if (self._rv[key]) return self._rv[key];
    self._rv[key] = (el) => {
      if (!el || el._kp) return; el._kp = true;
      const on = () => { const seen = Object.assign({}, S(self).seen || {}); seen[key] = true; self.setState({ seen }); };
      if (reduce || !('IntersectionObserver' in window)) { setTimeout(on, 0); return; }
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { on(); io.disconnect(); } }), { threshold: 0.12 });
      io.observe(el);
    };
    return self._rv[key];
  }
  function questions() { return window.HeroChat ? window.HeroChat.questions : []; }
  function matches(s) {
    const d = String(s.draft || '').trim().toLowerCase(), T = (x) => (window.HeroI18n ? window.HeroI18n.t(x) : x).toLowerCase();
    return d ? questions().filter((q) => q.q.toLowerCase().indexOf(d) >= 0 || T(q.q).indexOf(d) >= 0) : questions();
  }
  function ask(self, text, id) {
    const HC = window.HeroChat, t = String(text || '').trim(), s = S(self);
    if (!HC || !t || s.busy) return;
    const asked = Object.assign({}, s.asked || {}); if (id) asked[id] = true;
    const thread = (s.thread || []).concat([{ me: true, text: t }, { me: false, text: 'Thinking…', typing: true }]);
    self.setState({ thread, next: [], busy: true, draft: '', open: false, active: -1, showAns: true, asked, scrollThread: true });
    if (self._in) self._in.blur();
    clearTimeout(self._ct);
    self._ct = setTimeout(() => {
      const ans = id ? HC.answerId(id) : HC.answer(t);
      const th = S(self).thread.slice(0, -1).concat([{ me: false, text: ans }]);
      const all = questions().map((q) => q.id);
      let ids = ((id && NEXT[id]) || []).concat(all).filter((x, i, a) => a.indexOf(x) === i && x !== id && !asked[x]).slice(0, 2);
      if (!ids.length) ids = (id && NEXT[id]) || ['now', 'ai'];
      self.setState({ thread: th, next: ids, busy: false, scrollThread: true });
      if (self.ctrl) self.ctrl.talk();
    }, 650);
  }
  function handlers(self) {
    if (self._h) return self._h;
    const st = () => S(self);
    const h = {
      setCanvas: (el) => { if (el && el !== self._cv) { self._cv = el; mountScene(self); } },
      setHero: (el) => { if (el) { self._hero = el; scroll(self); } },
      setInput: (el) => { self._in = el; },
      setThread: (el) => { self._th = el; },
      onClick: (e) => { if (self.ctrl) self.ctrl.click(e.clientX, e.clientY); },
      onMove: (e) => { if (self.ctrl) self.ctrl.move(e.clientX, e.clientY); },
      onLeave: () => { if (self.ctrl) self.ctrl.move(-9999, -9999); },
      onDraft: (e) => self.setState({ draft: e.target.value, open: true, active: -1 }),
      onFocus: () => { clearTimeout(self._bt); self.setState({ open: true }); },
      onBlur: () => { self._bt = setTimeout(() => self.setState({ open: false, active: -1 }), 150); },
      onKey: (e) => {
        const s = st(), list = matches(s), n = list.length, a = s.active == null ? -1 : s.active;
        if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ open: true, active: n ? (a + 1) % n : -1 }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ open: true, active: n ? (a - 1 + n) % n : -1 }); }
        else if (e.key === 'Enter' && s.open && a >= 0 && list[a]) { e.preventDefault(); ask(self, list[a].q, list[a].id); }
        else if (e.key === 'Escape') self.setState({ open: false, active: -1, showAns: false });
      },
      onSubmit: (e) => { if (e && e.preventDefault) e.preventDefault(); ask(self, st().draft); },
      hideAns: () => self.setState({ showAns: false }),
      toggleMenu: () => self.setState({ menu: !st().menu }),
      musicToggle: () => { if (self.ctrl) self.ctrl.toggleMusic(); },
      down: (e) => e.preventDefault()
    };
    ['noon', 'afternoon', 'night'].forEach((t) => { h['t_' + t] = () => { if (self.ctrl) self.ctrl.setTime(t); self.setState({ time: t }); }; });
    ['sun', 'rain', 'rainbow'].forEach((w) => { h['w_' + w] = () => { if (self.ctrl) self.ctrl.setWeather(w); self.setState({ weather: w }); }; });
    self._h = h; return h;
  }
  // character outfit from the Tweaks props: 5 presets + Custom (headphones stay pink)
  const PINK = '#ff8fa3', WHITE = '#ffffff';
  const PRESETS = {
    '1': { hair: 'pony', hairC: '#4a2c2a', dress: true, top: '#f7a1b7', shoe: WHITE, bow: WHITE },
    '2': { hair: 'down', hairC: '#4a2c2a', dress: true, top: '#aba0ee', shoe: WHITE, bow: PINK },
    '3': { hair: 'bun', hairC: '#4a2c2a', dress: true, top: '#fff1d6', shoe: PINK, bow: PINK },
    '4': { hair: 'pony', hairC: '#4a2c2a', dress: true, top: '#2a2440', shoe: WHITE, bow: null },
    '5': { hair: 'down', hairC: '#73453a', dress: true, top: '#f3c34f', shoe: PINK, bow: WHITE }
  };
  function outfitOf(pr) {
    const k = String(pr.outfit || '1')[0];
    if (PRESETS[k]) return PRESETS[k];
    const bow = { pink: PINK, white: WHITE, red: '#e0483e', lavender: '#aba0ee' }[pr.charBow] || null;
    return { hair: pr.charHair || 'pony', hairC: pr.charHairColor || '#4a2c2a', dress: pr.charDress !== false, top: pr.charTop || '#f7a1b7', bottom: pr.charBottom || '#3f4f80', shoe: pr.charShoe === 'pink' ? PINK : WHITE, bow };
  }
  // v2 main character (48px chibi, chibi.js): Tweaks labels -> generator options
  function pick(v, table, def) { const s = String(v == null ? '' : v); for (const k in table) if (s.indexOf(k) === 0) return table[k]; return def; }
  function chibiOf(pr) {
    return {
      hair: pick(pr.chHair, { 'Sóng': 'wavy', 'Thẳng': 'straight' }, 'straight'),
      hairColor: pick(pr.chHairColor, { 'Espresso': 'espresso', 'Socola': 'choco', 'Hạt dẻ': 'hazel', 'Nâu tro': 'ash' }, 'espresso'),
      top: pick(pr.chTop, { 'Hoodie': 'hoodie', 'Áo thun': 'tee' }, 'tee'),
      bottom: pick(pr.chBottom, { 'Quần jeans': 'jeans', 'Quần jogger': 'jogger', 'Váy midi': 'midi', 'Váy ngắn': 'mini' }, 'jeans'),
      shoes: pick(pr.chShoes, { 'Trắng': 'white', 'Đỏ': 'red' }, 'red'),
      phones: pick(pr.chPhones, { 'Gaming': 'gaming', 'Kem': 'studio' }, 'studio'),
      phoneColor: pick(pr.chPhones, { 'Gaming đỏ': 'red', 'Gaming xanh dương': 'blue', 'Gaming xanh lá': 'green', 'Gaming xám': 'gray', 'Gaming đen': 'black' }, 'black'),
      mic: pr.chMic !== false, necklace: pr.chNecklace === true
    };
  }
  function outfitOf2(pr) {   // outfit + body / face / eyes (these three apply to presets too)
    const k = String(pr.outfit || '1')[0];
    const base = k === '0' ? { hair: 'down', hairC: '#4a2c2a', dress: false, top: '#f3c34f', bottom: '#3f4f80', shoe: '#6b4a3a', bow: null } : outfitOf(pr);
    return Object.assign({}, base, { body: pr.charBody === 'normal' ? 'normal' : 'chibi', face: pr.charFace === 'smile' ? 'smile' : 'grin', eyes: pr.charEyes === 'happy' ? 'happy' : 'dots', v2: chibiOf(pr) });
  }
  function syncOutfit(self) {
    const o = outfitOf2(self.props || {}), key = JSON.stringify(o);
    if (key === self._outfitKey) return;
    self._outfitKey = key; self._outfit = o; window.KP.current = o;
    if (self.ctrl && self.ctrl.setOutfit) self.ctrl.setOutfit(o);
  }
  function vals(self) {
    self._alive = true;
    syncOutfit(self);
    const s = Object.assign({ time: 'noon', weather: 'sun', music: false, draft: '', open: false, active: -1, thread: [], next: [], showAns: false, menu: false, k: 0.88, o: 0.15, flat: false, seen: {} }, S(self));
    const h = handlers(self), P = (b) => String(!!b);
    self._pick = self._pick || {};
    const pick = (q) => self._pick[q.id] || (self._pick[q.id] = () => ask(self, q.q, q.id));
    const list = matches(s);
    const sugg = list.map((q, i) => ({ id: 'kp-sg-' + q.id, label: q.q, sel: String(i === s.active), pick: pick(q), down: h.down }));
    const byId = (id) => questions().filter((q) => q.id === id)[0];
    const next = (s.next || []).map(byId).filter(Boolean).map((q) => ({ label: q.q, pick: pick(q) }));
    const thread = (s.thread || []).map((m) => ({ text: m.text, ai: !m.me, cls: 'a-msg ' + (m.me ? 'me' : 'ai'), pcls: m.typing ? 'hu-typing' : '' }));
    const open = !!(s.open && sugg.length);
    const IN = (key) => (s.flat || s.seen[key] ? ' in' : '');
    return Object.assign({}, h, {
      sugg, open, openStr: P(open), activeId: open && s.active >= 0 && sugg[s.active] ? sugg[s.active].id : undefined,
      draft: s.draft, thread, next, hasNext: next.length > 0, showAns: !!(s.showAns && thread.length),
      pNoon: P(s.time === 'noon'), pAfternoon: P(s.time === 'afternoon'), pNight: P(s.time === 'night'),
      pSun: P(s.weather === 'sun'), pRain: P(s.weather === 'rain'), pRainbow: P(s.weather === 'rainbow'),
      pMusic: P(s.music), musicLabel: s.music ? 'Music on' : 'Music off',
      menu: !!s.menu, menuStr: P(s.menu),
      csCls: 'cs' + (s.flat ? ' flat' : ''), pinStyle: '--k:' + s.k + ';--o:' + s.o + ';',
      r_bar: reveal(self, 'bar'), r_c1: reveal(self, 'c1'), r_c2: reveal(self, 'c2'),
      rvBar: 'cs-bar rv' + IN('bar'), rvC1: 'rv' + IN('c1'), rvC2: 'rv' + IN('c2')
    });
  }
  function after(self) {
    if (S(self).scrollThread && self._th) { self._th.scrollTop = self._th.scrollHeight; self.setState({ scrollThread: false }); }
  }
  function destroy(self) {
    self._alive = false; clearTimeout(self._t); clearTimeout(self._ct); clearTimeout(self._bt);
    if (self._onScroll) { window.removeEventListener('scroll', self._onScroll); window.removeEventListener('resize', self._onScroll); }
    if (self.ctrl) self.ctrl.destroy(); self.ctrl = null;
  }
  window.KP = { vals, after, destroy };
})();
