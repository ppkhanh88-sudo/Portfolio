/* Hero chat — canned answers built ONLY from facts Khanh has confirmed (BRIEF.md).
   Every hero option reads this list: edit questions and answers here, once.
   A question with no confirmed answer gets "not sure" + email, never a guess. */
(function () {
  'use strict';
  if (window.HeroChat) return;
  const EMAIL = '[EMAIL – CẦN BẠN ĐIỀN]';
  const QA = [
    { id: 'now', q: 'What is Khanh working on now?', a: 'Khanh is a Product Designer at a global company, working on a design system and web-app features.', k: ['now', 'current', 'role', 'job', 'work on', 'working', 'company', 'position', 'làm gì', 'công việc', 'hiện tại'] },
    { id: 'years', q: 'How many years in design?', a: '13+ years. Khanh started in graphic design and has worked at senior level for 7 years.', k: ['year', 'long', 'experience', 'senior', 'background', 'career', 'năm', 'kinh nghiệm', 'bao lâu'] },
    { id: 'ai', q: 'How does Khanh use AI?', a: 'On the design system project, Khanh brought AI into the design process and used it to keep design-system quality in check. The case study goes into detail.', k: ['ai', 'claude', 'chatgpt', 'gpt', 'automation'], w: 2 },
    { id: 'impact', q: 'What impact has the work had?', a: 'One example: a redesigned sign-up flow that increased sign-ups by about 30%.', k: ['impact', 'result', 'proud', 'metric', 'outcome', 'sign-up', 'signup', 'conversion', 'kết quả', 'hiệu quả'] },
    { id: 'tools', q: 'Which tools does Khanh use?', a: 'Figma, Figma Make, ChatGPT and Claude Design.', k: ['tool', 'figma', 'software', 'stack', 'công cụ'] }
  ];
  const EXTRA = [
    { a: 'Khanh is based in Saigon, Vietnam.', k: ['where', 'based', 'live', 'location', 'city', 'saigon', 'vietnam', 'ở đâu', 'sống'] },
    { a: 'Khanh is strongest at logic, layout, colour and composition.', k: ['strength', 'strong', 'good at', 'skill', 'best at', 'điểm mạnh', 'giỏi'] }
  ];
  function hit(text, kw) {
    if (/[^a-z0-9\-]/.test(kw)) return text.indexOf(kw) >= 0;
    const esc = kw.replace(/-/g, '\\-');
    return new RegExp('(^|[^a-z0-9])' + esc + (kw.length <= 3 ? '($|[^a-z0-9])' : '')).test(text);
  }
  function answer(text) {
    const t = String(text || '').toLowerCase();
    let best = null, score = 0;
    QA.concat(EXTRA).forEach((it) => {
      let s = 0;
      it.k.forEach((kw) => { if (hit(t, kw)) s += (it.w || 1); });
      if (s > score) { score = s; best = it; }
    });
    return best ? best.a : "I'm not sure about that yet. I only answer from facts Khanh has confirmed, so please ask Khanh directly at " + EMAIL + '.';
  }
  window.HeroChat = {
    intro: "Hi! Ask me about Khanh's work. I only answer from facts Khanh has confirmed.",
    email: EMAIL,
    questions: QA.map((x) => ({ id: x.id, q: x.q })),
    answerId(id) { const it = QA.filter((x) => x.id === id)[0]; return it ? it.a : answer(''); },
    answer
  };
})();
