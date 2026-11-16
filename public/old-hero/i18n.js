/* EN / VI language switch for the whole portfolio.
   The page is written in English; when Vietnamese is on, every known English string on screen
   (text, placeholders, aria-labels, tooltips, chat answers, the character's speech) is swapped
   for its Vietnamese line from DICT below. Switching back restores the original English.
   The choice is remembered in this browser and shared by every board of the canvas.
   Buttons: any element with data-lang-set="en" | "vi". Canvas text: window.HeroI18n.t(str). */
(function () {
  'use strict';
  if (window.HeroI18n) return;
  const KEY = 'kp-lang';
  const DICT = {
    // header + hero
    'Case studies': 'Case study', 'Artwork': 'Tác phẩm', 'About': 'Giới thiệu', 'CV': 'CV', 'Contact': 'Liên hệ',
    'Main': 'Điều hướng chính', 'Intro': 'Phần mở đầu', 'Language': 'Ngôn ngữ',
    'I build design systems and AI-assisted workflows for global web apps.': 'Tôi xây dựng design system và quy trình thiết kế có AI hỗ trợ cho các web app toàn cầu.',
    'Ask anything about Khanh': 'Hỏi bất cứ điều gì về Khanh', 'Ask anything about Khanh…': 'Hỏi bất cứ điều gì về Khanh…',
    'Suggested questions': 'Câu hỏi gợi ý', 'Send question': 'Gửi câu hỏi', 'Hide': 'Ẩn', 'Hide answer': 'Ẩn câu trả lời', 'Answer': 'Câu trả lời', 'Thinking…': 'Đang trả lời…',
    'Scene controls': 'Điều khiển cảnh', 'Morning': 'Sáng', 'Noon': 'Trưa', 'Sunset': 'Hoàng hôn', 'Night': 'Đêm',
    'Clear sky': 'Trời quang', 'Clear': 'Trời quang', 'Rain': 'Mưa', 'Rainbow': 'Cầu vồng', 'Music': 'Nhạc',
    'Music on': 'Nhạc: bật', 'Music off': 'Nhạc: tắt',
    'A floating grass island above a sea of clouds, with small islands drifting nearby. Khanh works at a desk with headphones on, beside a corgi, a speaker, a lantern and a pond whose waterfall pours off the edge. Things you can click show a pointer.':
      'Một hòn đảo cỏ nổi trên biển mây, xung quanh có vài đảo nhỏ trôi. Khanh đeo tai nghe làm việc bên bàn, cạnh chú corgi, chiếc loa, cây đèn và một hồ nước có thác đổ xuống mép đảo. Những thứ bấm được sẽ hiện con trỏ.',
    // chat
    "Hi! Ask me about Khanh's work. I only answer from facts Khanh has confirmed.": 'Chào bạn! Hãy hỏi mình về công việc của Khanh. Mình chỉ trả lời dựa trên những thông tin Khanh đã xác nhận.',
    'What is Khanh working on now?': 'Khanh đang làm gì?',
    'How many years in design?': 'Khanh có bao nhiêu năm làm thiết kế?',
    'How does Khanh use AI?': 'Khanh dùng AI như thế nào?',
    'What impact has the work had?': 'Công việc của Khanh đã mang lại kết quả gì?',
    'Which tools does Khanh use?': 'Khanh dùng những công cụ nào?',
    'Khanh is a Product Designer at a global company, working on a design system and web-app features.': 'Khanh là Product Designer tại một công ty toàn cầu, làm design system và các tính năng cho web app.',
    '13+ years. Khanh started in graphic design and has worked at senior level for 7 years.': 'Hơn 13 năm. Khanh bắt đầu từ thiết kế đồ họa và đã làm ở cấp senior 7 năm.',
    'On the design system project, Khanh brought AI into the design process and used it to keep design-system quality in check. The case study goes into detail.': 'Trong dự án design system, Khanh đưa AI vào quy trình thiết kế và dùng AI để kiểm soát chất lượng design system. Case study có trình bày chi tiết.',
    'One example: a redesigned sign-up flow that increased sign-ups by about 30%.': 'Một ví dụ: luồng đăng ký được thiết kế lại giúp lượt đăng ký tăng khoảng 30%.',
    'Figma, Figma Make, ChatGPT and Claude Design.': 'Figma, Figma Make, ChatGPT và Claude Design.',
    'Khanh is based in Saigon, Vietnam.': 'Khanh sống và làm việc tại Sài Gòn, Việt Nam.',
    'Khanh is strongest at logic, layout, colour and composition.': 'Điểm mạnh nhất của Khanh là tư duy logic, layout, màu sắc và bố cục.',
    // character speech (drawn on the canvas)
    'Product Designer · Saigon · 13+ years': 'Product Designer · Sài Gòn · 13+ năm',
    'Hi there! Welcome to my little island.': 'Chào bạn! Chào mừng đến hòn đảo nhỏ của mình.',
    'Hope your day is going well!': 'Chúc bạn một ngày thật vui!',
    'Want a coffee? I just made one.': 'Uống cà phê không? Mình vừa pha xong.',
    'Psst… try clicking the clouds.': 'Psst… thử bấm vào mây xem.',
    'Thanks for stopping by!': 'Cảm ơn bạn đã ghé chơi!',
    // case studies
    'Selected work': 'Dự án chọn lọc',
    'Two projects: the problem, what I did, and what changed.': 'Hai dự án: vấn đề, những gì tôi đã làm và điều đã thay đổi.',
    'Add project image': 'Thêm ảnh dự án',
    'Design system': 'Design system',
    'An AI-assisted design system for a global web app': 'Design system có AI hỗ trợ cho một web app toàn cầu',
    'Brought AI into the design process and used it to keep design-system quality in check across a global web app.': 'Đưa AI vào quy trình thiết kế và dùng AI để kiểm soát chất lượng design system trên một web app toàn cầu.',
    'Key result': 'Kết quả chính', 'Role': 'Vai trò', 'Team': 'Nhóm', 'Timeline': 'Thời gian',
    'Read the design system case': 'Xem case study design system',
    'Sign-in & sign-up': 'Đăng nhập & đăng ký',
    'A sign-up flow that brought in 30% more users': 'Luồng đăng ký giúp tăng 30% người dùng mới',
    'Redesigned the sign-in and sign-up experience of the web app so more new users finish creating an account.': 'Thiết kế lại trải nghiệm đăng nhập và đăng ký của web app để nhiều người dùng mới hoàn tất việc tạo tài khoản hơn.',
    'more sign-ups': 'lượt đăng ký', 'after the redesign': 'sau khi thiết kế lại',
    'Result: about 30% more sign-ups after the redesign.': 'Kết quả: lượt đăng ký tăng khoảng 30% sau khi thiết kế lại.',
    'Read the sign-up case': 'Xem case study đăng ký',
    // video
    'Video': 'Video', 'A closer look at my work': 'Cận cảnh công việc của tôi', 'Add your video': 'Thêm video của bạn',
    'Play video (video not added yet)': 'Phát video (chưa có video)',
    // artwork
    'More work': 'Thêm tác phẩm', 'Artwork & side projects': 'Tác phẩm & dự án cá nhân',
    'Drag, swipe or use the arrows to browse.': 'Kéo, vuốt hoặc dùng mũi tên để xem.',
    'Add artwork': 'Thêm tác phẩm', '[Category]': '[Danh mục]', '[Artwork title]': '[Tên tác phẩm]', 'View': 'Xem',
    'Previous artwork': 'Tác phẩm trước', 'Next artwork': 'Tác phẩm tiếp theo', 'Artwork, scrolls sideways': 'Tác phẩm, cuộn ngang',
    // portfolio layout options
    'View case studies': 'Xem case study', 'Download CV': 'Tải CV', 'Get in touch': 'Liên hệ với tôi', "Let’s work together": 'Cùng làm việc nhé',
    '13+ years': '13+ năm', 'in design, 7 at senior level': 'làm thiết kế, 7 năm ở cấp senior', 'Saigon': 'Sài Gòn', 'Vietnam': 'Việt Nam',
    'Design systems': 'Design system', 'for global web apps': 'cho các web app toàn cầu', 'AI workflows': 'Quy trình có AI', 'in the design process': 'trong quy trình thiết kế',
    'Featured product image': 'Ảnh sản phẩm nổi bật', 'Featured: AI-assisted design system': 'Nổi bật: design system có AI hỗ trợ',
    'Add product image': 'Thêm ảnh sản phẩm', 'Product image': 'Ảnh sản phẩm', 'sign-ups': 'lượt đăng ký', '+30% sign-ups': '+30% lượt đăng ký',
    'more sign-ups after the redesign': 'lượt đăng ký tăng thêm sau khi thiết kế lại',
    'Personal work beyond the day job.': 'Các dự án cá nhân ngoài công việc chính.',
    'From graphic design to product design: 13+ years, 7 at senior level.': 'Từ thiết kế đồ họa đến thiết kế sản phẩm: hơn 13 năm, 7 năm ở cấp senior.',
    'Strongest at logic, layout, colour and composition. Today I work on a design system and web-app features at a global company.': 'Điểm mạnh nhất của tôi là tư duy logic, layout, màu sắc và bố cục. Hiện tôi làm design system và các tính năng web app tại một công ty toàn cầu.',
    'Tools': 'Công cụ', 'Email': 'Email', 'Khanh Pham, home': 'Khanh Pham, trang chủ', 'Sections': 'Các phần',
    'Khanh Pham: I build': 'Khanh Pham: tôi xây dựng', 'design systems': 'design system', 'and': 'và', 'AI-assisted workflows': 'quy trình thiết kế có AI hỗ trợ', 'for global web apps.': 'cho các web app toàn cầu.',
    'Hover or tab into the stack to spread the cards.': 'Rê chuột hoặc dùng phím Tab vào chồng thẻ để xoè các thẻ ra.',
    'Artwork': 'Tác phẩm'
  };
  const ATTRS = ['placeholder', 'aria-label', 'title', 'data-tip'];
  const SKIP = 'script,style,textarea,[data-no-i18n]';

  let lang = 'en';
  try { const v = localStorage.getItem(KEY); if (v === 'vi' || v === 'en') lang = v; } catch (e) {}

  function chatExtras() {
    // the "not sure" answer carries the email placeholder, so it is built from hero-chat.js at runtime
    const HC = window.HeroChat;
    if (!HC || DICT.__chat) return;
    DICT.__chat = true;
    DICT["I'm not sure about that yet. I only answer from facts Khanh has confirmed, so please ask Khanh directly at " + HC.email + '.'] =
      'Mình chưa chắc về điều này. Mình chỉ trả lời dựa trên thông tin Khanh đã xác nhận, bạn hãy hỏi trực tiếp Khanh qua ' + HC.email + '.';
  }
  function lookup(s) {
    const k = s.trim();
    if (!k) return null;
    let v = DICT[k];
    if (v == null && k.indexOf(' · ') > 0) {   // "Morning · Clear", "01 · [Category]", "Add artwork · 4:3"
      const parts = k.split(' · '), m = parts.map((p) => DICT[p] != null ? DICT[p] : (/^[\d:+%.\s]+$/.test(p) || /^\d+[A-Z]$/.test(p) ? p : null));
      if (m.every((x) => x != null)) v = m.join(' · ');
    }
    return v == null ? null : s.replace(k, v);
  }
  function t(s) { if (lang !== 'vi' || !s) return s; chatExtras(); const v = lookup(String(s)); return v == null ? s : v; }

  // each node remembers its English source and what we last wrote, so a re-render with new English is picked up
  const TXT = new WeakMap(), ATT = new WeakMap();
  function doText(n) {
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    const r = TXT.get(n), src = r && n.data === r.out ? r.src : n.data, out = lang === 'vi' ? t(src) : src;
    TXT.set(n, { src, out });
    if (n.data !== out) n.data = out;
  }
  function doAttr(el, a) {
    if (!el.hasAttribute(a) || el.closest(SKIP)) return;
    let m = ATT.get(el); if (!m) { m = {}; ATT.set(el, m); }
    const cur = el.getAttribute(a), r = m[a], src = r && cur === r.out ? r.src : cur, out = lang === 'vi' ? t(src) : src;
    m[a] = { src, out };
    if (cur !== out) el.setAttribute(a, out);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.matches(SKIP)) return;
    ATTRS.forEach((a) => doAttr(root, a));
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else ATTRS.forEach((a) => doAttr(n, a)); }
  }
  function marks() {
    document.documentElement.lang = lang; document.documentElement.setAttribute('data-lang', lang);
    document.querySelectorAll('[data-lang-set]').forEach((b) => { const on = String(b.getAttribute('data-lang-set') === lang); if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on); });
  }
  function apply() { marks(); if (document.body) walk(document.body); }
  function set(l) {
    if (l !== 'en' && l !== 'vi' || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
  }

  function start() {
    apply();
    new MutationObserver((ms) => {
      let btn = false;
      for (const m of ms) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') { if (ATTRS.indexOf(m.attributeName) >= 0) doAttr(m.target, m.attributeName); }
        else m.addedNodes.forEach((n) => { walk(n); if (n.nodeType === 1 && (n.matches('[data-lang-set]') || n.querySelector('[data-lang-set]'))) btn = true; });
      }
      if (btn) marks();
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // capture phase: the switch must not also count as a click on the hero scene underneath
    document.addEventListener('click', (e) => {
      const b = e.target && e.target.closest && e.target.closest('[data-lang-set]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      set(b.getAttribute('data-lang-set'));
    }, true);
    // other boards of the canvas (same origin) follow the switch
    window.addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'en' || e.newValue === 'vi') && e.newValue !== lang) { lang = e.newValue; apply(); } });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // pages can add their own lines: HeroI18n.add({ 'English': 'Tiếng Việt' })
  function add(o) { Object.assign(DICT, o || {}); if (lang === 'vi' && document.body) apply(); }
  window.HeroI18n = { t, set, add, lang: () => lang };
})();
