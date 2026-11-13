/* Case-study section v2 — links the hero scene to the case studies below it.
   Every option shares: reveal-on-scroll (a block gets 'is-in'), the +30% count-up, and the hero hooks
   (the character can leave her desk and appear in the page; the waterfall position is known).
   Usage: renderVals(){ return Object.assign({}, HeroUI.vals(this,{id}), CS2.vals(this,'leap')); } */
(function () {
  'use strict';
  if (window.CS2) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const S = (self) => self.state || {};

  function rel(el, wrap) {
    const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }
  function count(self) {
    if (self._counting) return; self._counting = true;
    if (reduce) { self.setState({ pct: 30 }); return; }
    const t0 = performance.now() + (self._cfg.countDelay || 600), dur = 1100;
    const step = (now) => {
      if (!self._alive) return;
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      self.setState({ pct: Math.round(30 * (1 - Math.pow(1 - k, 3))) });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function mark(self, key) {
    const seen = Object.assign({}, S(self).seen || {});
    if (seen[key]) return false;
    seen[key] = true; self.setState({ seen });
    if (key === 'c2') count(self);
    return true;
  }
  // ref that keeps observing: enter -> onEnter(el); leaving downwards (scrolled back up) -> onLeave(el)
  function watch(self, key, thr, onEnter, onLeave) {
    self._refs = self._refs || {}; self._els = self._els || {};
    if (self._refs[key]) return self._refs[key];
    self._refs[key] = (el) => {
      if (!el || el._cs2) return;
      el._cs2 = true; self._els[key] = el;
      if (reduce || !('IntersectionObserver' in window)) { setTimeout(() => { mark(self, key); if (onEnter) onEnter(el); }, 0); return; }
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { const first = mark(self, key); if (onEnter) onEnter(el, first); }
        else if (onLeave && e.boundingClientRect.top > 0) onLeave(el);
      }), { threshold: thr });
      io.observe(el);
    };
    return self._refs[key];
  }
  const keep = (self, key) => { self._refs = self._refs || {}; self._els = self._els || {}; if (!self._refs[key]) self._refs[key] = (el) => { if (el) self._els[key] = el; }; return self._refs[key]; };

  // --- the character jumps out of the hero and hops from case to case ('leap') or stands as a guide ('guide')
  function heroFeet(self) {
    const a = S(self).anc;
    return a && a.feet ? a.feet : { x: 720, y: 560 };
  }
  function leapTo(self, targetKey, line) {
    const wrap = self._els.wrap, tgt = self._els[targetKey];
    if (!wrap || !tgt) return;
    const lp = S(self).lp, t = rel(tgt, wrap);
    const from = lp ? { x: lp.tx, y: lp.ty } : heroFeet(self);
    const tx = Math.round(t.x + Math.min(72, t.w * 0.18)), ty = Math.round(t.y);
    if (self.ctrl && self.ctrl.setGirlHidden) self.ctrl.setGirlHidden(true);
    const flip = tx + 380 > wrap.getBoundingClientRect().width;   // no room on the right: speech bubble goes left
    self.setState({ lp: { n: (lp ? lp.n : 0) + 1, sx: from.x, sy: from.y, tx, ty, line, flip } });
  }
  function leapReset(self) {
    if (!S(self).lp) return;
    if (self.ctrl && self.ctrl.setGirlHidden) self.ctrl.setGirlHidden(false);
    self.setState({ lp: null });
  }
  function guideIn(self) { if (self.ctrl && self.ctrl.setGirlHidden) self.ctrl.setGirlHidden(true); self.setState({ guide: true }); }
  function guideOut(self) { if (self.ctrl && self.ctrl.setGirlHidden) self.ctrl.setGirlHidden(false); self.setState({ guide: false }); }

  // --- the waterfall keeps flowing down the page and reaches each case ('stream')
  function streamTo(self, key) {
    const wrap = self._els.sec, tgt = self._els[key];
    if (!wrap || !tgt) return;
    const t = rel(tgt, wrap), len = Math.round(t.y + Math.min(t.h * 0.35, 220));
    if ((S(self).flow || 0) < len) self.setState({ flow: len });
  }

  const LINES = {
    c1: 'Case 01: I brought AI into our design-system workflow.',
    c2: 'Case 02: the new sign-up flow got about 30% more sign-ups!',
    vid: 'Press play, there is more to see!'
  };

  function carousel(self) {
    self._refs = self._refs || {}; self._els = self._els || {};
    if (self._refs.track) return;
    let down = false, moved = false, x0 = 0, s0 = 0, raf = 0;
    self._refs.track = (el) => {
      if (!el || el._cs2t) return;
      el._cs2t = true; self._els.track = el;
      el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = el.scrollLeft; self.setState({ drag: true }); });
      window.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = s0 - dx; });
      window.addEventListener('pointerup', () => { if (!down) return; down = false; self.setState({ drag: false }); });
      el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
      el.addEventListener('dragstart', (e) => e.preventDefault());
      const upd = () => { raf = 0; const m = el.scrollWidth - el.clientWidth; self.setState({ wp: m > 0 ? el.scrollLeft / m : 0 }); };
      el.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
      setTimeout(upd, 200);
    };
    const step = (dir) => () => { const el = self._els.track; if (!el) return; const card = el.querySelector('.wk-card'); const w = card ? card.getBoundingClientRect().width + 24 : 320; el.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); };
    self._refs.wPrev = step(-1); self._refs.wNext = step(1);
  }

  function vals(self, mode, cfg) {
    self._alive = true; self._cfg = cfg || {};
    const s = S(self), seen = s.seen || {}, out = { motion: reduce ? 'no-motion' : '' };
    const IN = (k) => (seen[k] ? 'is-in' : '');
    out.pct = String(s.pct != null ? s.pct : (reduce ? 30 : 0));
    out.r_wrap = keep(self, 'wrap');
    out.r_p1 = keep(self, 'p1'); out.r_p2 = keep(self, 'p2'); out.r_p3 = keep(self, 'p3');

    if (mode === 'leap') {
      // a chain of stops: [trigger key, landing spot, line]. She hops to the next stop once its trigger is on screen.
      const STOPS = [['sec', 'p1', LINES.c1], ['c2', 'p2', LINES.c2], ['vid', 'p3', LINES.vid]];
      const advance = () => {
        if (self._hopping) return;
        const st = S(self), n = st.lp ? st.lp.n : 0, stop = STOPS[n];
        if (!stop || !(st.seen || {})[stop[0]]) return;
        self._hopping = true;
        leapTo(self, stop[1], stop[2]);
        setTimeout(() => { self._hopping = false; advance(); }, 1500);   // after landing, keep going if the next stop is already visible
      };
      out.r_sec = watch(self, 'sec', 0.12, () => setTimeout(advance, 50), () => { self._hopping = false; leapReset(self); });
      out.r_c2 = watch(self, 'c2', 0.45, () => setTimeout(advance, 50));
      out.r_vid = watch(self, 'vid', 0.35, () => setTimeout(advance, 50));
      out.r_c1 = watch(self, 'c1', 0.3);
      const lp = s.lp;
      out.lpOn = !!lp;
      out.lpCls = lp ? 'lp lp-' + (lp.n % 2 ? 'a' : 'b') + (lp.flip ? ' lp-l' : '') : 'lp';
      out.lpStyle = lp ? `--sx:${lp.sx}px;--sy:${lp.sy}px;--tx:${lp.tx}px;--ty:${lp.ty}px;` : '';
      out.lpLine = lp ? lp.line : '';
      out.lpKey = lp ? 'k' + lp.n : 'k0';
    }
    if (mode === 'guide') {
      out.r_sec = watch(self, 'sec', 0.15, () => guideIn(self), () => guideOut(self));
      out.r_c1 = watch(self, 'c1', 0.5, () => self.setState({ act: 'c1' }));
      out.r_c2 = watch(self, 'c2', 0.5, () => self.setState({ act: 'c2' }));
      out.guideCls = s.guide ? 'gd is-in' : 'gd';
      out.guideLine = LINES[s.act || 'c1'];
      out.guideKey = 'g' + (s.act || 'c1');
    }
    if (mode === 'stream') {
      const a = s.anc;
      out.r_sec = watch(self, 'sec', 0.05);
      out.r_c1 = watch(self, 'c1', 0.3, () => setTimeout(() => streamTo(self, 'c1'), 30));
      out.r_c2 = watch(self, 'c2', 0.3, () => setTimeout(() => streamTo(self, 'c2'), 30));
      out.fx = String(a && a.fall ? a.fall.x : 980);
      out.flowStyle = `height:${s.flow || 0}px;`;
    }
    if (mode === 'islands' || mode === 'balloon') {
      out.r_sec = watch(self, 'sec', 0.12);
      out.r_c1 = watch(self, 'c1', 0.3);
      out.r_c2 = watch(self, 'c2', 0.3);
    }
    if (self._cfg.extra) {
      carousel(self);
      if (mode !== 'leap') out.r_vid = watch(self, 'vid', 0.35);
      out.r_wk = watch(self, 'wk', 0.2);
      out.r_track = self._refs.track; out.wPrev = self._refs.wPrev; out.wNext = self._refs.wNext;
      const wp = s.wp || 0;
      out.wpStyle = `width:${Math.round(18 + wp * 82)}%;`;
      out.atStart = String(wp <= 0.01); out.atEnd = String(wp >= 0.99);
      out.dragCls = 'wk-track' + (s.drag ? ' is-drag' : '') + (seen.wk ? ' is-in' : '');
      out.in_vid = IN('vid'); out.in_wk = IN('wk');
    }
    out.in_sec = IN('sec'); out.in_c1 = IN('c1'); out.in_c2 = IN('c2');
    return out;
  }
  function destroy(self) { self._alive = false; }
  window.CS2 = { vals, destroy, reduce };
})();
