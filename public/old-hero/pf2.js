/* Scroll-driven behaviours for the portfolio options (all delegated on document, no framework state):
   [data-rv]     element gets .is-in once 15% visible (one-shot), children stagger via CSS
   [data-grow]   scales from .9 to 1 while it travels up the viewport (--grow 0..1 on the element)
   [data-stack]  container of sticky cards: a card scales down / dims as the next one slides over it (--pass 0..1)
   [data-flip]   button inside a card: toggles .is-flip on the closest [data-card]; Esc / second click flips back
   [data-world]  horizontal world: sticky stage, the track moves sideways as the section scrolls (--wx px, --wp 0..1)
   [data-tilt]   tilts a little toward the pointer (--rx/--ry deg)
   [data-count]  number counting up from 0 when it enters (text = target, keeps prefix/suffix)
   [data-pin]    tall section with a sticky stage: progress 0..1 (--pp) picks the active [data-step] (class .is-act) and
                 the matching [data-slide] inside it; [data-pin-n] shows the active step number
   [data-words]  text split into words that rise one by one when it enters */
(function () {
  'use strict';
  if (window.PF2) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); if (e.target.hasAttribute('data-count')) count(e.target); } }), { threshold: 0.15 });
  function count(el) {
    const m = (el.getAttribute('data-count') || el.textContent).match(/^([^\d]*)([\d.,]+)(.*)$/); if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now(), D = reduce ? 0 : 900;
    const tick = (t) => { const p = D ? clamp((t - t0) / D, 0, 1) : 1, v = Math.round(target * p * 10 ** dec) / 10 ** dec; el.textContent = m[1] + v.toFixed(dec) + m[3]; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function words(el) {
    if (el.dataset.split) return; el.dataset.split = '1';
    const t = el.textContent.trim().split(/\s+/); el.textContent = '';
    t.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' ')); });
  }
  function scan() {
    document.querySelectorAll('[data-words]:not([data-split])').forEach(words); document.querySelectorAll('[data-rv]:not(.is-in),[data-count]:not(.is-in),[data-words]:not(.is-in)').forEach((el) => io.observe(el)); }
  let raf = 0;
  let again = false;
  // equal case heights: measure every .ps-cards at its natural height, then give all of them the tallest one (on size / font changes)
  let eqKey = '';
  function equalCases() {
    const cols = [...document.querySelectorAll('.ps-cards')]; if (cols.length < 2) return;
    const key = innerWidth + 'x' + innerHeight + ':' + (document.fonts ? document.fonts.status : '');
    if (key === eqKey) return; eqKey = key;
    cols.forEach((c) => { c.style.minHeight = '0px'; });
    const mx = Math.max.apply(null, cols.map((c) => c.offsetHeight));
    cols.forEach((c) => { c.style.minHeight = mx + 'px'; });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { eqKey = ''; ask(); });
  function frame() {
    raf = 0; again = false;
    equalCases();
    const vh = window.innerHeight;
    document.querySelectorAll('[data-grow]').forEach((el) => {
      const r = el.getBoundingClientRect(), target = clamp(1 - (r.top - vh * 0.15) / (vh * 0.6), 0, 1);
      let p = target; if (!reduce) { const cur = el._g == null ? target : el._g; p = Math.abs(target - cur) < 0.0005 ? target : cur + (target - cur) * 0.12; el._g = p; if (p !== target) again = true; }   // eased like the pins: no jumps on wheel notches
      el.style.setProperty('--grow', reduce ? 1 : p.toFixed(4));
    });
    document.querySelectorAll('[data-fade]').forEach((el) => {
      const r = el.getBoundingClientRect(), cov = el.getAttribute('data-fade-after'), c = cov && document.querySelector(cov);
      // with a cover: share of the element no longer hidden behind it; otherwise: rises from the bottom edge to 55% of the viewport
      const target = c ? clamp((r.bottom - c.getBoundingClientRect().bottom) / Math.max(1, r.height), 0, 1) : clamp((vh - r.top) / (vh * 0.45), 0, 1);
      let p = target; if (!reduce) { const cur = el._fo == null ? target : el._fo; p = Math.abs(target - cur) < 0.001 ? target : cur + (target - cur) * 0.14; el._fo = p; if (p !== target) again = true; }
      el.style.setProperty('--fo', p.toFixed(3));
    });
    document.querySelectorAll('[data-rise]').forEach((el) => {
      // 0 when the element's top enters at the bottom of the viewport, 1 after it has travelled 60% of the viewport height; eased
      const span = parseFloat(el.getAttribute('data-rise-span')) || 0.6, r = el.getBoundingClientRect(), target = clamp((vh * 0.98 - r.top) / (vh * span), 0, 1);
      let p = target; if (!reduce) { const cur = el._rp == null ? target : el._rp; p = Math.abs(target - cur) < 0.001 ? target : cur + (target - cur) * 0.07; el._rp = p; if (p !== target) again = true; }
      el.style.setProperty('--rp', p.toFixed(3));
    });
    document.querySelectorAll('[data-stack]').forEach((st) => {
      const cards = [...st.children];
      cards.forEach((c, i) => {
        const n = cards[i + 1]; if (!n) { c.style.setProperty('--pass', 0); return; }
        const r = c.getBoundingClientRect(), nr = n.getBoundingClientRect();
        c.style.setProperty('--pass', reduce ? 0 : clamp((r.bottom - nr.top) / r.height, 0, 1).toFixed(3));
      });
    });
    document.querySelectorAll('[data-hide-down]').forEach((h) => {
      const y = window.scrollY, dy = y - (h._ly == null ? y : h._ly); h._ly = y;
      if (y < h.offsetHeight * 2) h.classList.remove('is-hidden');
      else if (dy > 4) h.classList.add('is-hidden'); else if (dy < -4) h.classList.remove('is-hidden');
    });
    document.querySelectorAll('[data-solid-scroll]').forEach((h) => { h.classList.toggle('is-scrolled', window.scrollY > (parseFloat(h.getAttribute('data-solid-scroll')) || 8)); });
    document.querySelectorAll('[data-solid-after]').forEach((h) => {
      const t = document.querySelector(h.getAttribute('data-solid-after')); if (!t) return;
      h.classList.toggle('is-scrolled', t.getBoundingClientRect().bottom < h.offsetHeight + 8);
    });
    document.querySelectorAll('[data-pin]').forEach((w) => {
      // content height of a centred pinned stage (.ps cases, .mw more-work), used by the CSS to keep every visible gap = --gap
      const cc = w.querySelector('.ps-cards'), mh = w.querySelector('.mw-h'), mm = w.querySelector('.mw-more');
      const ch = cc ? cc.offsetHeight : (mh && mm ? Math.round(mm.offsetTop + mm.offsetHeight - mh.offsetTop) : null);
      if (ch != null && w._ch !== ch) { w._ch = ch; w.style.setProperty('--ch', ch + 'px'); const nx = w.nextElementSibling; if (nx && nx.matches('[data-pin]')) nx.style.setProperty('--chp', ch + 'px'); }
      const r = w.getBoundingClientRect(), steps = w.querySelectorAll('[data-step]'), slides = w.querySelectorAll('[data-slide]');
      // data-pin-lead: start the progress earlier, while the section is still coming up (its top at lead × viewport height)
      let L = (parseFloat(w.getAttribute('data-pin-lead')) || 0) * vh, travel = r.height - vh, target = clamp((L - r.top) / Math.max(1, travel + L), 0, 1);
      const n = steps.length || slides.length || 1;
      // .ps case frames: the stage is as tall as its content (--sh); if that is taller than the viewport it pins with a negative top (--st)
      const stg = w.classList.contains('ps') && w.querySelector('.ps-stage');
      if (stg) {
        // centre the frame between the header and the bottom of the viewport; if it does not fit, keep its bottom on the viewport bottom
        const hd = document.querySelector('header'), hb = hd ? hd.getBoundingClientRect().height : 0, sh = stg.offsetHeight, free = vh - hb;
        const st = Math.round(sh <= free ? hb + (free - sh) / 2 : vh - sh);
        if (w._sh !== sh || w._st !== st) { w._sh = sh; w._st = st; w.style.setProperty('--sh', sh + 'px'); w.style.setProperty('--st', st + 'px'); }
        target = clamp((st - r.top) / Math.max(1, r.height - sh), 0, 1);
      }
      // smooth: the published progress chases the scroll progress, so wheel notches never show as jumps
      let p = target;
      if (!reduce) { const cur = w._pp == null ? target : w._pp; const ease = parseFloat(w.getAttribute('data-pin-ease')) || 0.09; p = Math.abs(target - cur) < 0.0004 ? target : cur + (target - cur) * ease; w._pp = p; if (p !== target) again = true; }
      const i = Math.min(n - 1, Math.floor(p * n));
      w.style.setProperty('--pp', p.toFixed(4)); w.style.setProperty('--pi', i);
      steps.forEach((s, k) => s.classList.toggle('is-act', k === i));
      slides.forEach((s, k) => { s.classList.toggle('is-act', k === i); s.classList.toggle('is-past', k < i); });
      w.querySelectorAll('[data-pin-n]').forEach((lab) => { if (lab.textContent !== String(i + 1)) lab.textContent = String(i + 1); });
    });
    document.querySelectorAll('[data-world]').forEach((w) => {
      const r = w.getBoundingClientRect(), track = w.querySelector('[data-track]'); if (!track) return;
      const travel = r.height - vh, p = clamp(-r.top / Math.max(1, travel), 0, 1);
      const dx = Math.max(0, track.scrollWidth - w.clientWidth);
      w.style.setProperty('--wp', p.toFixed(4)); w.style.setProperty('--wx', (-p * dx).toFixed(1) + 'px');
      const lab = w.querySelector('[data-world-n]'); if (lab) { const n = Math.min(track.children.length, Math.floor(p * track.children.length) + 1); if (lab.textContent !== String(n)) lab.textContent = String(n); }
    });
    if (again) ask();
  }
  const ask = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener('scroll', ask, { passive: true }); window.addEventListener('resize', ask);
  document.addEventListener('click', (e) => {
    const f = e.target.closest && e.target.closest('[data-flip]');
    if (f) { const card = f.closest('[data-card]'); if (card) { const on = !card.classList.contains('is-flip'); card.classList.toggle('is-flip', on); f.setAttribute('aria-expanded', String(on)); } }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const c = e.target.closest && e.target.closest('[data-card].is-flip'); if (c) { c.classList.remove('is-flip'); const b = c.querySelector('[data-flip]'); if (b) b.setAttribute('aria-expanded', 'false'); } } });
  window.addEventListener('pointermove', (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('[data-tilt]');
    document.querySelectorAll('[data-tilt].is-tilt').forEach((el) => { if (el !== t) { el.classList.remove('is-tilt'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } });
    if (!t) return;
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    t.classList.add('is-tilt'); t.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg'); t.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
  }, { passive: true });
  const mo = new MutationObserver(() => { scan(); ask(); });
  const boot = () => { scan(); ask(); mo.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.PF2 = { reduce, refresh: () => { scan(); ask(); } };
})();
