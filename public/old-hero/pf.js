/* Portfolio page behaviours (no framework state needed, all delegated on document):
   [data-drag]       horizontal track you can drag with the mouse (touch scrolls natively); clicks after a drag are ignored
   [data-cursor]     hovering it shows a round cursor that follows the pointer; value = label ("View") or "expand"
   [data-scroll]     button that scrolls the track #data-target by one card: data-scroll="1" | "-1"
   [data-viewall]    toggles .is-all on the closest [data-proj] section (track <-> grid); swaps its label
   [data-you]        container where a "You" tag follows the pointer */
(function () {
  'use strict';
  if (window.PF) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let drag = null, cur = null;

  function cursorEl() {
    if (cur) return cur;
    cur = document.createElement('div');
    cur.className = 'pf-cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="pf-cursor-t"></span>';
    document.body.appendChild(cur);
    return cur;
  }
  const EXPAND = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';

  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest('[data-drag]');
    if (!t || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { el: t, x: e.clientX, s: t.scrollLeft, moved: false };
    t.classList.add('is-drag');
  }, true);
  window.addEventListener('pointermove', (e) => {
    if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; drag.el.scrollLeft = drag.s - dx; }
    const c = e.target.closest && e.target.closest('[data-cursor]');
    if (c && e.pointerType === 'mouse') {
      const el = cursorEl(), v = c.getAttribute('data-cursor');
      const t = el.firstChild;
      if (el.dataset.v !== v) { el.dataset.v = v; if (v === 'expand') t.innerHTML = EXPAND; else t.textContent = v; el.classList.toggle('is-icon', v === 'expand'); }
      el.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      el.classList.add('is-on');
    } else if (cur) cur.classList.remove('is-on');
    const y = e.target.closest && e.target.closest('[data-you]');
    document.querySelectorAll('[data-you]').forEach((box) => {
      const tag = box.querySelector('.you'); if (!tag) return;
      if (box !== y) { tag.classList.remove('is-on'); return; }
      const r = box.getBoundingClientRect();
      tag.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px)';
      tag.classList.add('is-on');
    });
  }, { passive: true });
  window.addEventListener('pointerup', () => { if (drag) { drag.el.classList.remove('is-drag'); setTimeout(() => { drag = null; }, 0); } });
  document.addEventListener('click', (e) => {
    if (drag && drag.moved && e.target.closest('[data-drag]')) { e.preventDefault(); e.stopPropagation(); return; }
    const s = e.target.closest && e.target.closest('[data-scroll]');
    if (s) {
      const tr = document.getElementById(s.getAttribute('data-target')); if (!tr) return;
      const card = tr.querySelector('[data-card]'), w = card ? card.getBoundingClientRect().width + 20 : tr.clientWidth * 0.8;
      tr.scrollBy({ left: Number(s.getAttribute('data-scroll')) * w, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    const v = e.target.closest && e.target.closest('[data-viewall]');
    if (v) {
      const sec = v.closest('[data-proj]'); if (!sec) return;
      const on = !sec.classList.contains('is-all');
      sec.classList.toggle('is-all', on);
      v.setAttribute('aria-expanded', String(on));
      const lab = v.querySelector('.lab'); if (lab) lab.textContent = on ? v.getAttribute('data-off') : v.getAttribute('data-on');
      if (!on) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, true);
  document.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest('[data-drag]')) e.preventDefault(); });
  window.PF = { reduce };
})();
