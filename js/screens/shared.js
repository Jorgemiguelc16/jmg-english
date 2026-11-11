'use strict';
/* Piezas que comparten varias pantallas: menú, encabezados y selector de acento. */

const learnedIn = (col) => col.items.filter((p) => Store.state.cards[p.id]).length;

const NAV = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'library', icon: 'book', label: 'Biblioteca' },
  { id: 'translate', icon: 'languages', label: 'Traducir' },
  { id: 'add', icon: 'plus', label: 'Agregar' },
  { id: 'practice', icon: 'target', label: 'Práctica' },
  { id: 'settings', icon: 'sliders', label: 'Ajustes' },
];

function fmtMinutes(sec) { const m = Math.round(sec / 60); return m < 1 && sec > 0 ? '<1' : String(m); }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
function todayLong() {
  const s = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function pageHead(title, sub, eyebrow = '', actions = '') {
  return `<header class="page-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions}</header>`;
}
function accentSwitch(label = true) {
  const cur = Store.state.settings.accent || 'us';
  return `<div class="accent-switch" role="group" aria-label="Acento">${label ? '<span>Acento</span>' : ''}${[['us', 'Americano'], ['uk', 'Británico']].map(([k, l]) => `<button type="button" class="${cur === k ? 'on' : ''}" data-accent="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;
}
function wireAccent(after) {
  $$('[data-accent]').forEach((b) => {
    b.onclick = () => {
      const st = Store.state.settings;
      if ((st.accent || 'us') === b.dataset.accent) return;
      st.accent = b.dataset.accent;
      st.voice = '';            // la voz elegida era del otro acento
      Store.save();
      after();
      Speech.ready.then(() => {
        if (st.accent === 'uk' && !Speech.hasBritish()) toast('Este navegador no tiene voces británicas. Prueba en Edge o Chrome.', 5000);
        else Speech.say(st.accent === 'uk' ? 'Hello, lovely to meet you.' : 'Hi, nice to meet you.');
      });
    };
  });
}
const sayOpts = (p) => (p.col === 'british' ? { accent: 'uk' } : {});
function statusInfo(p) {
  const c = Store.state.cards[p.id];
  if (!c) return ['Nueva', ''];
  if (c.due <= Store.today()) return ['Por repasar', 'warn'];
  return Store.status(p.id) === 'mastered' ? ['Dominada', 'ok'] : ['Memorizada', 'accent'];
}

function renderSidebar(route) {
  $('#nav').innerHTML = NAV.map((n) => `<a class="nav-item${n.id === route ? ' active' : ''}" href="#${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`).join('');
  const sv = Store.streakView();
  const lv = Store.levelInfo();
  $('#side-foot').innerHTML = `
    <div class="mini-stat${sv.status === 'done' ? ' lit' : ''}">${icon('flame')}<div><b>${plural(sv.count, 'día', 'días')}</b><span>Racha actual</span></div></div>
    <div class="mini-stat">${icon('star')}<div class="grow"><b>Nivel ${lv.level}</b><span>${lv.title}</span><div class="bar" style="margin-top:6px"><div style="width:${Math.round(lv.pct * 100)}%"></div></div></div></div>`;
}
