/*
  dc-runtime.js — chạy file .dc.html (định dạng Claude Design) ngay trong trình duyệt, không cần Claude.

  File .dc.html gồm:
    <head> <script src> / <link>      → tải trước khi dựng (engine, i18n…)
    <x-dc>
      <helmet> <style>/<link> </helmet> → đưa vào <head>
      ...markup...                      → template, có {{path}}, <sc-if>, <sc-for>
    </x-dc>
    <script type="text/x-dc" data-dc-script data-props='{...}'>
      class Component extends DCLogic { renderVals() { return {...} } }
    </script>

  Runtime dựng template thành cây Preact mỗi lần render, nên state / setState / lifecycle
  (componentDidMount, componentDidUpdate, componentWillUnmount) hoạt động như trong Claude Design.
*/
import { h, render, Component, Fragment } from 'preact';

// ---------- tải script / style trong <head> của file, mỗi URL chỉ tải 1 lần ----------
const loaded = new Map();
function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((ok) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = () => { console.warn('[dc] không tải được', src); ok(); };
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}
function addHeadNode(node) {
  if (node.nodeType !== 1) return;
  const tag = node.localName;
  if (tag === 'link') {
    const href = node.getAttribute('href');
    if (document.head.querySelector(`link[href="${CSS.escape(href || '')}"]`)) return;
  }
  if (tag === 'script') return;               // script trong helmet không dùng
  document.head.appendChild(document.importNode(node, true));
}

// ---------- tra {{path}} ----------
const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
const WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
function lookup(scope, path) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  if (path === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
  if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
  let v = scope;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
function interp(str, scope) {
  return str.replace(HOLE, (_, p) => { const v = lookup(scope, p); return v == null ? '' : String(v); });
}
function value(str, scope) {
  const m = WHOLE.exec(str);
  return m ? lookup(scope, m[1]) : (str.indexOf('{{') >= 0 ? interp(str, scope) : str);
}

// ---------- template DOM → vnode ----------
function build(node, scope) {
  if (node.nodeType === 3) {
    const t = node.nodeValue;
    return t.indexOf('{{') >= 0 ? interp(t, scope) : t;
  }
  if (node.nodeType !== 1) return null;
  const tag = node.localName;
  if (tag === 'sc-if') {
    return lookup(scope, (WHOLE.exec(node.getAttribute('value') || '') || [, 'false'])[1])
      ? kids(node, scope) : null;
  }
  if (tag === 'sc-for') {
    const list = value(node.getAttribute('list') || '', scope) || [];
    const as = node.getAttribute('as') || 'item';
    return h(Fragment, null, Array.from(list).map((it, i) =>
      h(Fragment, { key: i }, kids(node, Object.assign(Object.create(scope), { [as]: it, $index: i })))));
  }
  const props = {};
  for (const a of node.attributes) {
    let name = a.name;
    if (name.startsWith('hint-')) continue;
    const v = value(a.value, scope);
    if (v === undefined) continue;
    if (name.startsWith('on') && name.length > 2) {
      if (typeof v !== 'function') continue;
      // React: onChange trên ô nhập = mỗi lần gõ
      if (name === 'onchange' && (tag === 'input' || tag === 'textarea')) name = 'oninput';
    } else if (name === 'ref') {
      if (typeof v !== 'function') continue;
    }
    props[name] = v;
  }
  return h(tag, props, kids(node, scope));
}
function kids(node, scope) {
  const out = [];
  for (const c of node.childNodes) { const v = build(c, scope); if (v !== null && v !== '') out.push(v); }
  return out;
}

// ---------- DCLogic ----------
export class DCLogic extends Component {
  renderVals() { return {}; }
  render() {
    const vals = this.renderVals() || {};
    return h(Fragment, null, kids(this.constructor.__tpl, vals));
  }
}

// ---------- mount 1 file .dc.html vào 1 phần tử ----------
export async function mountDC(source, host) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  if (doc.title && !document.title) document.title = doc.title;

  // 1) script / css trong <head> của file
  for (const el of doc.head.querySelectorAll('script[src], link[rel="stylesheet"]')) {
    if (el.localName === 'script') await loadScript(el.getAttribute('src'));
    else addHeadNode(el);
  }
  const root = doc.querySelector('x-dc');
  const helmet = root.querySelector(':scope > helmet');
  if (helmet) for (const n of Array.from(helmet.childNodes)) addHeadNode(n);
  if (helmet) helmet.remove();

  // 2) logic
  const tag = doc.querySelector('script[data-dc-script]');
  let props = {};
  try {
    const decl = JSON.parse(tag.getAttribute('data-props') || '{}');
    for (const [k, d] of Object.entries(decl)) if (k[0] !== '$' && d && 'default' in d) props[k] = d.default;
  } catch (e) { console.warn('[dc] data-props lỗi', e); }
  const Cls = new Function('DCLogic', tag.textContent + '\n;return Component;')(DCLogic);
  Cls.__tpl = root;

  render(h(Cls, props), host);
}
