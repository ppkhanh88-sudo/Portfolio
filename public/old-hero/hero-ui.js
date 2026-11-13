/* Hero UI logic — shared by every layout option on this canvas.
   Each artboard only differs in markup/layout; state, chat and scene controls live here once.
   Usage in an artboard:  renderVals() { return window.HeroUI ? HeroUI.vals(this, { id: 'a' }) : {}; } */
(function () {
  'use strict';
  if (window.HeroUI) return;
  const TIMES = ['noon', 'afternoon', 'night'];
  const WX = ['sun', 'rain', 'rainbow'];

  function boot(self) {
    const go = () => {
      if (!self._cv || self.ctrl) return;
      if (!window.PixelHero) { self._t = setTimeout(go, 80); return; }
      const o = self._opt || {};
      self.ctrl = window.PixelHero.mount(self._cv, Object.assign({
        layout: 'island', hour: 12.5, seed: 41, focusX: o.focusX,
        onChange: (s) => self.setState({ time: s.time, weather: s.weather, music: s.music }),
        onLayout: (a) => self.setState({ anc: a })
      }, o.engine || {}));
    };
    go();
  }
  function sugg(s) {
    const HC = window.HeroChat; if (!HC) return [];
    const d = String(s.draft || '').trim().toLowerCase();
    const T = (x) => (window.HeroI18n ? window.HeroI18n.t(x) : x).toLowerCase();
    return d ? HC.questions.filter((q) => q.q.toLowerCase().indexOf(d) >= 0 || T(q.q).indexOf(d) >= 0) : HC.questions;
  }
  function ask(self, text, id) {
    const HC = window.HeroChat, t = String(text || '').trim();
    if (!HC || !t) return;
    clearTimeout(self._ct);
    self.setState({ bubble: { q: t, a: null }, draft: '', open: false, active: -1 });
    if (self._in) self._in.blur();
    self._ct = setTimeout(() => {
      self.setState({ bubble: { q: t, a: id ? HC.answerId(id) : HC.answer(t) } });
      if (self.ctrl) self.ctrl.talk();
    }, 650);
  }
  function key(self, e) {
    const s = self.state || {}, list = sugg(s), n = list.length, a = s.active == null ? -1 : s.active;
    if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ open: true, active: n ? (a + 1) % n : -1 }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ open: true, active: n ? (a - 1 + n) % n : -1 }); }
    else if (e.key === 'Enter') { if (s.open && a >= 0 && list[a]) { e.preventDefault(); ask(self, list[a].q, list[a].id); } }
    else if (e.key === 'Escape') { self.setState({ open: false, active: -1, panel: false, bubble: null }); }
  }
  function handlers(self) {
    if (self._h) return self._h;
    const st = () => self.state || {};
    const h = {
      setCanvas: (el) => { if (el && el !== self._cv) { self._cv = el; boot(self); } },
      setInput: (el) => { self._in = el; },
      // clicking the scene also tucks the answer away, so it never stays on top of the character
      onClick: (e) => { if (st().bubble && st().bubble.a) self.setState({ bubble: null }); if (self.ctrl) self.ctrl.click(e.clientX, e.clientY); },
      onMove: (e) => { if (self.ctrl) self.ctrl.move(e.clientX, e.clientY); },
      onLeave: () => { if (self.ctrl) self.ctrl.move(-9999, -9999); },
      onDraft: (e) => self.setState({ draft: e.target.value, open: true, active: -1 }),
      onFocus: () => { clearTimeout(self._bt); self.setState({ open: true }); },
      onBlur: () => { self._bt = setTimeout(() => self.setState({ open: false, active: -1 }), 150); },
      onKey: (e) => key(self, e),
      onSubmit: (e) => { if (e && e.preventDefault) e.preventDefault(); ask(self, st().draft); },
      closeBubble: () => self.setState({ bubble: null }),
      togglePanel: () => self.setState({ panel: !st().panel }),
      closePanel: () => self.setState({ panel: false }),
      panelKey: (e) => { if (e.key === 'Escape') self.setState({ panel: false }); },
      toggleChat: () => self.setState({ chat: !st().chat }),
      musicToggle: () => { if (self.ctrl) self.ctrl.toggleMusic(); },
      down: (e) => e.preventDefault()
    };
    TIMES.forEach((t) => { h['t_' + t] = () => { if (self.ctrl) self.ctrl.setTime(t); self.setState({ time: t }); }; });
    WX.forEach((w) => { h['w_' + w] = () => { if (self.ctrl) self.ctrl.setWeather(w); self.setState({ weather: w }); }; });
    self._h = h;
    return h;
  }
  function destroy(self) {
    clearTimeout(self._t); clearTimeout(self._ct); clearTimeout(self._bt);
    if (self.ctrl) self.ctrl.destroy(); self.ctrl = null;
  }
  const LABEL = { morning: 'Morning', noon: 'Noon', afternoon: 'Sunset', night: 'Night', sun: 'Clear', rain: 'Rain', rainbow: 'Rainbow' };

  function vals(self, opt) {
    opt = opt || {};
    self._opt = opt;
    const id = opt.id || 'x';
    const s = Object.assign({ time: 'noon', weather: 'sun', music: false, draft: '', open: false, active: -1, bubble: null, panel: false, chat: false }, self.state || {});
    const night = s.time === 'night';
    const h = handlers(self);
    if (!self._pick) self._pick = {};
    const list = sugg(s);
    const items = list.map((q, i) => ({
      id: 'sugg-' + id + '-' + q.id, label: q.q, sel: String(i === s.active), down: h.down,
      pick: self._pick[q.id] || (self._pick[q.id] = () => ask(self, q.q, q.id))
    }));
    const HC = window.HeroChat;
    const chips = (HC ? HC.questions : []).slice(0, opt.chips || 3).map((q) => ({ label: q.q, pick: self._pick[q.id] || (self._pick[q.id] = () => ask(self, q.q, q.id)) }));
    const open = !!(s.open && items.length);
    const anc = s.anc || { girl: { x: 720, y: 460 }, vw: 1440 };
    const P = (b) => String(!!b);
    return Object.assign({}, h, {
      night, themeCls: night ? 'is-night' : '', intro: HC ? HC.intro : '',
      // text placed straight on the sky flips colour at night; panels keep their own light surface
      ink: night ? '#f5f7ff' : '#141b33',
      inkSoft: night ? 'rgba(245,247,255,.82)' : 'rgba(20,27,51,.78)',
      skyShadow: night ? '0 1px 2px rgba(0,0,0,.55)' : '0 1px 0 rgba(255,255,255,.55)',
      draft: s.draft, open, openStr: P(open), sugg: items, chips,
      activeId: open && s.active >= 0 && items[s.active] ? items[s.active].id : undefined,
      inputId: 'ask-' + id, listId: 'sugg-' + id, panelId: 'panel-' + id,
      showBubble: !!s.bubble, noBubble: !s.bubble, bubbleQ: s.bubble ? s.bubble.q : '', bubbleA: s.bubble ? (s.bubble.a || 'Thinking…') : '',
      ansClass: s.bubble && !s.bubble.a ? 'hu-typing' : '',
      bx: Math.round(Math.max(190, Math.min(anc.vw - 190, anc.girl.x))), by: Math.round(anc.girl.y - 10),
      panel: !!s.panel, panelStr: P(s.panel), chat: !!s.chat, chatStr: P(s.chat),
      pNoon: P(s.time === 'noon'), pAfternoon: P(s.time === 'afternoon'), pNight: P(night),
      pSun: P(s.weather === 'sun'), pRain: P(s.weather === 'rain'), pRainbow: P(s.weather === 'rainbow'),
      pMusic: P(s.music), musicLabel: s.music ? 'Music on' : 'Music off',
      sceneLabel: LABEL[s.time] + ' · ' + LABEL[s.weather]
    });
  }
  window.HeroUI = { vals, destroy };
})();
