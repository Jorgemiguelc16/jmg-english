'use strict';

/* =====================================================================
   MÉTODO DE MEMORIA: registro y constructores de sesión
   ===================================================================== */
function registerCustom() {
  COLLECTION_BY_ID.mine.items = Store.state.custom.map((c) => {
    const p = { ...c, col: 'mine' };
    PHRASE_BY_ID[p.id] = p;
    return p;
  });
}

const learnedIn = (col) => col.items.filter((p) => Store.state.cards[p.id]).length;

function nextToMemorize(colId, skip = []) {
  const col = COLLECTION_BY_ID[colId];
  return (col && col.items.find((p) => !Store.state.cards[p.id] && !skip.includes(p.id))) || null;
}

function startMemorize(p) {
  Session.start([{ type: 'memorize', phrase: p, key: 'memorize:' + p.id }], 'Memorizar', {
    again: {
      label: 'Memorizar otra frase',
      run: () => {
        const n = nextToMemorize(p.col) || nextToMemorize(Store.state.memoCol);
        if (n) startMemorize(n); else toast('Ya memorizaste todas las frases de esta colección');
      },
    },
  });
}

function recallItems(ids, { free = false, mode = null } = {}) {
  return ids.map((id, i) => ({ type: 'recall', phrase: PHRASE_BY_ID[id], key: 'recall:' + id, free, mode: mode || (i % 3 === 2 ? 'write' : 'speak') }));
}
function startRecallDue() { Session.start(recallItems(Store.dueIds().slice(0, 20)), 'Repaso de memoria'); }
function startRecallFree(mode) {
  const ids = shuffle(Store.learnedIds()).slice(0, 10);
  Session.start(recallItems(ids, { free: true, mode }), mode === 'write' ? 'Escritura de memoria' : 'Repetir de memoria');
}

/* =====================================================================
   PANTALLAS
   ===================================================================== */
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NAV = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'library', icon: 'book', label: 'Biblioteca' },
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
function streakMessage(sv) {
  switch (sv.status) {
    case 'done': return 'Objetivo de hoy cumplido. Todo lo que hagas ahora suma extra.';
    case 'pending': return `Memoriza o repasa una frase hoy para mantener tu racha de ${plural(sv.count, 'día', 'días')}.`;
    case 'frozen': return `No practicaste ${plural(sv.missed, 'día', 'días')}. Si practicas hoy, un protector salvará tu racha.`;
    case 'lost': return sv.prev > 1 ? `Tu racha de ${sv.prev} días se reinició. Hoy es un buen día para empezar otra.` : 'Memoriza tu primera frase de hoy para iniciar tu racha.';
    default: return 'Memoriza tu primera frase para iniciar tu racha.';
  }
}
function pageHead(title, sub, eyebrow = '') {
  return `<header class="page-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`;
}
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

/* ---------- Bienvenida ---------- */
function renderWelcome() {
  const total = MOVIES.length + WORDS.length + PHRASES.length;
  $('#app').innerHTML = `
    <section class="welcome card">
      <div class="card-body">
        <div class="brand-mark" style="width:44px;height:44px;font-size:1.3rem;border-radius:11px">J</div>
        <h1>Configura tu espacio</h1>
        <p class="lead">Aprende inglés como se aprende un guion: entendiendo cada palabra y repitiendo en voz alta hasta que la frase sale sola.</p>
        <div class="features">
          <div class="feature"><div class="icon-tile">${icon('eye')}</div><div><b>1 · Entiende cada palabra</b><span>Desglose palabra por palabra y cómo suena, escrito para hispanohablantes.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('mic')}</div><div><b>2 · Repite 10 veces en voz alta</b><span>Con texto, con pistas y de memoria. El micrófono cuenta tus repeticiones.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('pen')}</div><div><b>3 · Escríbela</b><span>Termina escribiéndola de memoria para fijarla.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('brain')}</div><div><b>4 · Repasa justo antes de olvidarla</b><span>${total} frases: películas, series, palabras cotidianas y conversación. Y puedes agregar las tuyas.</span></div></div>
        </div>
        <label class="field-label" for="w-name">Tu nombre</label>
        <input class="input" id="w-name" type="text" maxlength="30" placeholder="¿Cómo te llamamos?" value="${esc(Store.state.name)}">
        <div class="row-btns" style="margin-top:20px;justify-content:space-between">
          <button class="btn secondary" id="w-test" type="button">${icon('volume')} Probar audio</button>
          <button class="btn primary" id="w-go" type="button">Comenzar ${icon('arrow', 'sm')}</button>
        </div>
        <p class="muted small" style="margin-top:18px">Recomendado: Microsoft Edge o Google Chrome. Tu progreso se guarda solo en este navegador.</p>
      </div>
    </section>`;
  $('#w-test').onclick = () => Speech.say('May the Force be with you.');
  $('#w-go').onclick = () => {
    Store.state.name = $('#w-name').value.trim();
    Store.state.onboarded = true;
    Store.save();
    location.hash = '#home';
    App.render();
  };
}

/* ---------- Inicio ---------- */
let homeSkip = [];
function renderHome() {
  const st = Store.state;
  const sv = Store.streakView();
  const td = Store.todayRec();
  const due = Store.dueIds().length;
  const memorized = Store.learnedIds().length;
  const total = COLLECTIONS.reduce((n, c) => n + c.items.length, 0);
  const colId = COLLECTION_BY_ID[st.memoCol] ? st.memoCol : 'movies';
  let next = nextToMemorize(colId, homeSkip);
  if (!next && homeSkip.length) { homeSkip = []; next = nextToMemorize(colId); }
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

  const t = Store.today();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = Store.addDays(t, -i);
    const [y, m, d] = key.split('-').map(Number);
    const rec = st.days[key];
    const lvl = !Store.dayCounted(key) ? (rec && rec.ex ? 1 : 0) : (rec.reps || 0) >= 25 || rec.sec >= 1500 ? 3 : 2;
    days.push({ letter: DAY_LETTERS[new Date(y, m - 1, d).getDay()], lvl, isToday: i === 0, title: `${d}/${m} · ${rec ? `${rec.reps || 0} repeticiones · ${fmtMinutes(rec.sec)} min` : 'sin práctica'}` });
  }

  const col = COLLECTION_BY_ID[colId];
  let memoBody;
  if (next) {
    memoBody = `
      <div class="next-phrase">
        <div class="memo-source">${sourceBadge(next)}</div>
        ${next.word ? `<div class="np-word">${esc(next.word)}<span>${esc(next.wordEs)}</span></div>` : ''}
        <div class="np-en">${esc(next.en)}</div>
        <div class="np-es">${esc(next.es)}</div>
        <div class="row-btns">
          <button class="btn primary lg" id="go-memo" type="button">${icon('mic')} Memorizar esta frase</button>
          <button class="btn secondary lg" id="np-play" type="button">${icon('volume')} Escuchar</button>
          <button class="btn ghost lg" id="np-skip" type="button">${icon('shuffle')} Otra</button>
        </div>
      </div>`;
  } else if (colId === 'mine') {
    memoBody = `<div class="empty">${icon('bookmark', 'xl')}<b>Aún no tienes frases propias</b><span>Cuando escuches una frase que te guste en una película o serie, guárdala aquí.</span><a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar mi primera frase</a></div>`;
  } else {
    memoBody = `<div class="empty">${icon('award', 'xl')}<b>¡Memorizaste toda la colección “${esc(col.name)}”!</b><span>Elige otra colección o sigue repasando de memoria.</span></div>`;
  }

  $('#app').innerHTML = `
    ${pageHead(`${hello}${st.name ? ', ' + esc(st.name) : ''}`, esc(streakMessage(sv)), todayLong())}

    <section class="kpis">
      <div class="card kpi${sv.status === 'done' ? ' lit' : ''}">
        <div class="kpi-top"><span>Racha</span>${icon('flame')}</div>
        <div class="kpi-value">${sv.count}<small>${sv.count === 1 ? 'día' : 'días'}</small></div>
        <div class="kpi-sub">Récord ${st.streak.best} · ${plural(sv.freezes, 'protector', 'protectores')}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Frases memorizadas</span>${icon('brain')}</div>
        <div class="kpi-value">${memorized}<small>de ${total}</small></div>
        <div class="bar"><div style="width:${(memorized / total) * 100}%"></div></div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Repeticiones hoy</span>${icon('mic')}</div>
        <div class="kpi-value">${td.reps || 0}<small>en voz alta</small></div>
        <div class="kpi-sub">${st.totalReps || 0} en total</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Por repasar</span>${icon('repeat')}</div>
        <div class="kpi-value">${due}<small>${due === 1 ? 'frase' : 'frases'}</small></div>
        <div class="kpi-sub">${due ? 'Te están esperando' : 'Estás al día'}</div>
      </div>
    </section>

    <section class="card step-card">
      <span class="step-num">1</span>
      <div class="grow"><h2>Repaso de memoria</h2><p class="muted">Ves el español y dices la frase en inglés sin ayuda. Así no se te olvidan las que ya aprendiste.</p></div>
      <button class="btn ${due ? 'primary' : 'secondary'} lg" id="go-recall" type="button" ${due ? '' : 'disabled'}>${due ? `Repasar ${due}` : 'Al día'} ${due ? icon('arrow', 'sm') : icon('check', 'sm')}</button>
    </section>

    <section class="card memo-card">
      <div class="memo-head">
        <span class="step-num">2</span>
        <div class="grow"><h2>Memoriza una frase nueva</h2><p class="muted">Entiéndela palabra por palabra, repítela 10 veces en voz alta y escríbela de memoria.</p></div>
      </div>
      <div class="col-chips">${COLLECTIONS.map((c) => `<button class="chip-btn${c.id === colId ? ' on' : ''}" data-col="${c.id}" type="button">${icon(c.icon, 'sm')}<span>${c.short}</span><span class="count">${learnedIn(c)}/${c.items.length}</span></button>`).join('')}</div>
      ${memoBody}
    </section>

    <section class="card add-cta">
      <span class="icon-tile">${icon('film')}</span>
      <div class="grow"><b>¿Escuchaste una frase que te gustó?</b><p class="muted small">Guárdala en “Mis frases” y memorízala con el mismo método.</p></div>
      <a class="btn secondary" href="#add">${icon('plus', 'sm')} Agregar frase</a>
    </section>

    <section class="grid-3">
      <div class="card">
        <div class="card-head"><div><h2>Actividad</h2><p>Últimos 14 días</p></div></div>
        <div class="card-body">
          <div class="activity">${days.map((d) => `<div class="act-cell${d.isToday ? ' today' : ''}" title="${d.title}"><div class="act-box l${d.lvl}"></div><span class="act-lbl">${d.letter}</span></div>`).join('')}</div>
          <div class="legend">Menos <span class="act-box"></span><span class="act-box l1"></span><span class="act-box l2"></span><span class="act-box l3"></span> Más</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Colecciones</h2><p>Frases memorizadas por colección</p></div></div>
        <div class="card-body stat-list">
          ${COLLECTIONS.map((c) => { const n = learnedIn(c); const pct = c.items.length ? (n / c.items.length) * 100 : 0; return `<a class="col-progress" href="#library/${c.id}"><div class="stat-row"><span>${icon(c.icon, 'sm')} ${c.name}</span><b>${n} / ${c.items.length}</b></div><div class="bar"><div style="width:${pct}%"></div></div></a>`; }).join('')}
        </div>
      </div>
    </section>

    <section class="card note">${icon('bulb')}<div><b>Consejo del día</b><p>${esc(tip)}</p></div></section>`;

  $('#go-recall').onclick = startRecallDue;
  $$('[data-col]').forEach((b) => { b.onclick = () => { st.memoCol = b.dataset.col; Store.save(); homeSkip = []; renderHome(); }; });
  if (next) {
    $('#go-memo').onclick = () => startMemorize(next);
    $('#np-play').onclick = () => Speech.say(next.en);
    $('#np-skip').onclick = () => { homeSkip.push(next.id); renderHome(); };
  }
}

/* ---------- Biblioteca ---------- */
const libState = { tab: 'movies', q: '', filter: '' };
function renderLibrary(sub) {
  if (sub && COLLECTION_BY_ID[sub]) { if (libState.tab !== sub) libState.filter = ''; libState.tab = sub; }
  const col = COLLECTION_BY_ID[libState.tab];
  let filterHtml = '';
  if (col.id === 'conv') filterHtml = `<select class="select" id="lib-filter"><option value="">Todos los temas</option>${TOPICS.map((t) => `<option value="${t.id}"${libState.filter === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
  else if (col.id === 'words') filterHtml = `<select class="select" id="lib-filter"><option value="">Todas las categorías</option>${uniqueBy(WORDS, (w) => w.cat).map((w) => `<option${libState.filter === w.cat ? ' selected' : ''}>${esc(w.cat)}</option>`).join('')}</select>`;
  else if (col.id === 'mine') filterHtml = `<a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar frase</a>`;
  else filterHtml = '<span></span>';

  $('#app').innerHTML = `
    ${pageHead('Biblioteca', 'Elige cualquier frase y memorízala con el método de repetición.')}
    <div class="tabs" role="tablist">${COLLECTIONS.map((c) => `<a class="tab${c.id === col.id ? ' on' : ''}" href="#library/${c.id}" role="tab">${icon(c.icon, 'sm')}<span>${c.short}</span><span class="count">${c.items.length}</span></a>`).join('')}</div>
    <div class="card rows">
      <div class="toolbar lib">
        <div class="input-icon">${icon('search', 'sm')}<input class="input" id="lib-q" type="search" placeholder="Buscar en inglés o español" value="${esc(libState.q)}"></div>
        ${filterHtml}
      </div>
      <div class="list-count" id="lib-count"></div>
      <div id="lib-list"></div>
    </div>`;

  const draw = () => {
    const q = libState.q.trim().toLowerCase();
    const rows = col.items.filter((p) => {
      if (libState.filter && (col.id === 'conv' ? p.topic !== libState.filter : col.id === 'words' ? p.cat !== libState.filter : false)) return false;
      if (!q) return true;
      return [p.en, p.es, p.src, p.word, p.wordEs].some((x) => x && x.toLowerCase().includes(q));
    });
    $('#lib-count').textContent = `${rows.length} de ${col.items.length} · ${learnedIn(col)} memorizadas`;
    $('#lib-list').innerHTML = rows.length ? rows.map((p) => {
      const [lbl, cls] = statusInfo(p);
      const main = p.word
        ? `<div class="p-en">${esc(p.word)} <span class="muted" style="font-weight:500">· ${esc(p.wordEs)}</span></div><div class="p-es">${esc(p.en)} — ${esc(p.es)}</div>`
        : `<div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}${p.src ? ` · <i>${esc(p.src)}</i>` : ''}</div>`;
      return `<div class="row-item">
        <button class="play-btn" data-say="${esc(p.word || p.en)}" type="button" title="Escuchar">${icon('volume')}</button>
        <div class="grow">${main}</div>
        <span class="badge ${cls}">${lbl}</span>
        <button class="btn secondary sm" data-memo="${p.id}" type="button">${Store.state.cards[p.id] ? 'Repetir' : 'Memorizar'}</button>
        ${col.id === 'mine' ? `<button class="icon-btn" data-del="${p.id}" type="button" title="Eliminar">${icon('trash', 'sm')}</button>` : ''}
      </div>`;
    }).join('') : `<div class="empty">${icon(col.icon, 'xl')}<b>${col.id === 'mine' && !col.items.length ? 'Todavía no agregaste frases' : 'No hay frases que coincidan'}</b>${col.id === 'mine' && !col.items.length ? `<span>Agrega frases de tus películas, series o canciones favoritas.</span><a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar frase</a>` : ''}</div>`;
    $$('#lib-list [data-say]').forEach((b) => { b.onclick = () => Speech.say(b.dataset.say); });
    $$('#lib-list [data-memo]').forEach((b) => { b.onclick = () => startMemorize(PHRASE_BY_ID[b.dataset.memo]); });
    $$('#lib-list [data-del]').forEach((b) => {
      b.onclick = () => {
        const p = PHRASE_BY_ID[b.dataset.del];
        if (!confirm(`¿Eliminar “${p.en}” de tus frases?`)) return;
        Store.removeCustom(p.id);
        delete PHRASE_BY_ID[p.id];
        registerCustom();
        renderLibrary();
        toast('Frase eliminada');
      };
    });
  };
  $('#lib-q').addEventListener('input', (e) => { libState.q = e.target.value; draw(); });
  const f = $('#lib-filter');
  if (f && f.tagName === 'SELECT') f.addEventListener('input', (e) => { libState.filter = e.target.value; draw(); });
  draw();
}

/* ---------- Agregar frase propia ---------- */
function renderAdd() {
  $('#app').innerHTML = `
    ${pageHead('Agregar frase', 'Guarda una frase que escuchaste en una película, serie, video o canción, y memorízala con tu método.')}
    <section class="card form-card">
      <div class="card-body">
        <label class="field-label" for="a-en">Frase en inglés</label>
        <div class="input-row"><input class="input" id="a-en" type="text" maxlength="200" placeholder="Ej.: With great power comes great responsibility."><button class="btn secondary" id="a-play" type="button" title="Escuchar">${icon('volume')}</button></div>
        <p class="help">Toca el botón de audio para confirmar que está bien escrita.</p>

        <label class="field-label" for="a-es">Qué significa en español</label>
        <input class="input" id="a-es" type="text" maxlength="200" placeholder="Ej.: Un gran poder conlleva una gran responsabilidad.">

        <label class="field-label" for="a-src">¿De dónde la sacaste? <span class="opt">Opcional</span></label>
        <input class="input" id="a-src" type="text" maxlength="80" placeholder="Ej.: Spider-Man, Friends, una canción…">

        <label class="field-label" for="a-chunks">Desglose palabra por palabra <span class="opt">Opcional</span></label>
        <textarea class="input textarea" id="a-chunks" rows="4" placeholder="With great power = con un gran poder&#10;comes = viene&#10;great responsibility = una gran responsabilidad"></textarea>
        <p class="help">Una línea por bloque, con el formato <code>inglés = español</code>. Si lo dejas vacío, se usa el diccionario de la app.</p>

        <div class="form-error" id="a-err"></div>
        <div class="row-btns" style="justify-content:flex-end;margin-top:8px">
          <button class="btn secondary" id="a-save" type="button">Guardar</button>
          <button class="btn primary" id="a-save-go" type="button">${icon('mic', 'sm')} Guardar y memorizar</button>
        </div>
      </div>
    </section>`;
  $('#a-play').onclick = () => { const v = $('#a-en').value.trim(); if (v) Speech.say(v); };
  const save = (go) => {
    const en = $('#a-en').value.trim().replace(/\s+/g, ' ');
    const es = $('#a-es').value.trim();
    const err = $('#a-err');
    if (!en || !es) { err.textContent = 'Escribe la frase en inglés y su significado en español.'; return; }
    if (!/[a-z]/i.test(en)) { err.textContent = 'La frase en inglés debe tener letras.'; return; }
    const chunks = $('#a-chunks').value.split('\n').map((l) => l.split('=').map((x) => x.trim())).filter((x) => x.length >= 2 && x[0] && x[1]).map((x) => [x[0], x.slice(1).join(' = ')]);
    const item = Store.addCustom({ en, es, src: $('#a-src').value.trim(), chunks });
    registerCustom();
    toast('Frase guardada en “Mis frases”');
    if (go) startMemorize(PHRASE_BY_ID[item.id]);
    else { location.hash = '#library/mine'; }
  };
  $('#a-save').onclick = () => save(false);
  $('#a-save-go').onclick = () => save(true);
}

/* ---------- Práctica ---------- */
function renderPractice() {
  const due = Store.dueIds().length;
  const learned = Store.learnedIds().length;
  const memory = [
    { id: 'due', icon: 'brain', title: 'Repaso de memoria', desc: due ? plural(due, 'frase pendiente', 'frases pendientes') : 'No hay repasos pendientes', disabled: !due, run: startRecallDue },
    { id: 'say', icon: 'mic', title: 'Repetir de memoria', desc: learned ? '10 frases memorizadas al azar, en voz alta' : 'Primero memoriza alguna frase', disabled: !learned, run: () => startRecallFree('speak') },
    { id: 'write', icon: 'pen', title: 'Escritura de memoria', desc: learned ? 'Escribe en inglés frases que ya memorizaste' : 'Primero memoriza alguna frase', disabled: !learned, run: () => startRecallFree('write') },
  ];
  const skills = [
    { id: 'listen', icon: 'headphones', title: 'Dictado', desc: 'Escucha y escribe lo que oyes' },
    { id: 'speak', icon: 'mic', title: 'Pronunciación', desc: 'El micrófono evalúa tu pronunciación' },
    { id: 'meaning', icon: 'ear', title: 'Comprensión auditiva', desc: 'Entiende frases solo escuchando' },
    { id: 'build', icon: 'grid', title: 'Ordenar frases', desc: 'Construye frases palabra por palabra' },
  ];
  const tile = (m, attr) => `<button class="card tile-card" ${attr} type="button" ${m.disabled ? 'disabled' : ''}><span class="icon-tile">${icon(m.icon)}</span><span><span class="t-title">${m.title}</span><span class="t-desc" style="display:block">${m.desc}</span></span></button>`;
  $('#app').innerHTML = `
    ${pageHead('Práctica', 'Refuerza lo que ya memorizaste y entrena habilidades específicas.')}
    <div class="section-head" style="margin-top:0"><div><h2>Memoria</h2><p>Lo más importante: decir y escribir de memoria lo que ya aprendiste.</p></div></div>
    <div class="tiles">${memory.map((m) => tile(m, `data-mem="${m.id}"`)).join('')}</div>

    <div class="section-head"><div><h2>Sesión mixta</h2><p>Ejercicios variados con las frases de conversación: dictado, comprensión, ordenar y pronunciar.</p></div></div>
    <div class="card"><div class="durations">${Object.entries(PLANS).map(([min, p]) => `
      <button class="duration" data-min="${min}" type="button"><span class="d-go">${icon('arrow', 'sm')}</span><span class="icon-tile">${icon(p.icon)}</span><span class="d-min">${min}<small> min</small></span><span class="d-name">${p.name}</span><span class="d-desc">${p.desc}</span></button>`).join('')}</div></div>

    <div class="section-head"><div><h2>Habilidades</h2><p>Rondas de 10 ejercicios de un solo tipo.</p></div></div>
    <div class="tiles">${skills.map((m) => tile(m, `data-mode="${m.id}"`)).join('')}</div>

    <div class="section-head"><div><h2>Diálogos</h2><p>Conversaciones con dos voces: escucha, responde y revisa la transcripción.</p></div></div>
    <div class="card rows">
      ${DIALOGUES.map((d) => {
        const r = Store.state.dialogs[d.id];
        const badge = r ? `<span class="badge ok">${icon('check', 'sm')} ${Math.round(r.best * 100)}%</span>` : '<span class="badge">Nuevo</span>';
        return `<button class="row-item clickable" data-dialog="${d.id}" type="button"><span class="icon-tile neutral">${icon(TOPIC_ICONS[d.topic] || 'messages')}</span><span class="grow"><span class="r-title" style="display:block">${esc(d.title)}</span><span class="r-desc">${esc(d.scene)}</span></span>${badge}${icon('arrow', 'sm')}</button>`;
      }).join('')}
    </div>`;
  const names = { listen: 'Dictado', speak: 'Pronunciación', meaning: 'Comprensión auditiva', build: 'Ordenar frases' };
  $$('[data-mem]').forEach((b) => { b.onclick = () => memory.find((m) => m.id === b.dataset.mem).run(); });
  $$('[data-min]').forEach((b) => { b.onclick = () => { const min = Number(b.dataset.min); Session.start(buildTimedSession(min), `Sesión mixta · ${min} min`); }; });
  $$('[data-mode]').forEach((b) => { b.onclick = () => Session.start(buildModeSession(b.dataset.mode), names[b.dataset.mode]); });
  $$('[data-dialog]').forEach((b) => { b.onclick = () => { const d = DIALOGUE_BY_ID[b.dataset.dialog]; Session.start([{ type: 'dialogue', dialog: d, key: 'dialogue:' + d.id }], 'Diálogo'); }; });
}

/* ---------- Ajustes ---------- */
function renderSettings() {
  const st = Store.state.settings;
  const sw = (id, on) => `<label class="switch"><input id="${id}" type="checkbox" ${on ? 'checked' : ''}><span></span></label>`;
  $('#app').innerHTML = `
    ${pageHead('Ajustes', 'Personaliza la voz, el audio y administra tu progreso.')}
    <section class="card settings-group">
      <div class="card-head"><div><h2>Perfil</h2></div></div>
      <div class="set-row"><div><div class="s-label">Nombre</div><div class="s-help">Se usa en el saludo de inicio.</div></div><input class="input" id="s-name" type="text" maxlength="30" value="${esc(Store.state.name)}"></div>
    </section>
    <section class="card settings-group">
      <div class="card-head"><div><h2>Audio y voz</h2></div></div>
      <div class="set-row"><div><div class="s-label">Voz en inglés</div><div class="s-help">Las voces “Natural” de Edge son las más realistas.</div></div><select class="select" id="s-voice"><option value="">Automática (recomendada)</option></select></div>
      <div class="set-row"><div><div class="s-label">Velocidad de reproducción</div><div class="s-help">El botón “Lento” reproduce a ~60% de esta velocidad.</div></div><div class="range-wrap"><input id="s-rate" type="range" min="0.6" max="1.2" step="0.05" value="${st.rate}"><output id="s-rate-v">${st.rate}×</output></div></div>
      <div class="set-row"><div><div class="s-label">Reproducción automática</div><div class="s-help">Reproduce el audio al mostrar cada ejercicio.</div></div>${sw('s-auto', st.autoplay)}</div>
      <div class="set-row"><div><div class="s-label">Sonidos de respuesta</div><div class="s-help">Tonos breves al acertar o fallar.</div></div>${sw('s-sounds', st.sounds)}</div>
      <div class="set-row"><div><div class="s-label">Prueba de audio y micrófono</div><div class="s-help">Verifica que todo funcione antes de empezar.</div></div><div class="row-btns"><button class="btn secondary" id="s-test" type="button">${icon('volume')} Probar voz</button><button class="btn secondary" id="s-mic" type="button">${icon('mic')} Probar micrófono</button></div></div>
      <div class="mic-test" id="s-mic-out"></div>
    </section>
    <section class="card settings-group">
      <div class="card-head"><div><h2>Datos</h2><p>Tu progreso (incluidas tus frases propias) se guarda únicamente en este navegador.</p></div></div>
      <div class="set-row"><div><div class="s-label">Respaldo</div><div class="s-help">Descarga una copia, o cárgala para continuar en otro navegador o dispositivo.</div></div>
        <div class="row-btns"><button class="btn secondary" id="s-export" type="button">${icon('download')} Descargar</button><label class="btn secondary" for="s-import">${icon('upload')} Cargar</label><input id="s-import" type="file" accept=".json,application/json" hidden></div></div>
      <div class="set-row"><div><div class="s-label">Restablecer</div><div class="s-help">Borra la racha, el XP, tus frases propias y todo lo memorizado.</div></div><div><button class="btn danger" id="s-reset" type="button">${icon('trash')} Borrar progreso</button></div></div>
    </section>`;

  Speech.ready.then(() => {
    const sel = $('#s-voice');
    if (!sel) return;
    Speech.englishVoices().forEach((v) => {
      const o = document.createElement('option');
      o.value = v.name; o.textContent = `${v.name} (${v.lang})`;
      if (v.name === st.voice) o.selected = true;
      sel.appendChild(o);
    });
  });
  $('#s-name').onchange = (e) => { Store.state.name = e.target.value.trim(); Store.save(); toast('Cambios guardados'); };
  $('#s-voice').onchange = (e) => { st.voice = e.target.value; Store.save(); Speech.say('This is my voice. How do I sound?'); };
  $('#s-rate').oninput = (e) => { st.rate = Number(e.target.value); $('#s-rate-v').textContent = st.rate + '×'; Store.save(); };
  $('#s-rate').onchange = () => Speech.say('I usually wake up at seven.');
  $('#s-test').onclick = () => Speech.say('Hi! How are you doing? Nice to meet you.');
  $('#s-auto').onchange = (e) => { st.autoplay = e.target.checked; Store.save(); };
  $('#s-sounds').onchange = (e) => { st.sounds = e.target.checked; Store.save(); if (st.sounds) Sfx.ok(); };
  $('#s-mic').onclick = () => {
    const out = $('#s-mic-out');
    if (!Speech.canListen) { out.innerHTML = '<p class="muted small">Este navegador no admite reconocimiento de voz. Usa Microsoft Edge o Google Chrome.</p>'; return; }
    out.innerHTML = '';
    out.appendChild(micWidget('Hello, how are you doing?', { label: 'Toca el micrófono y di: “Hello, how are you doing?”' }));
  };
  $('#s-export').onclick = () => {
    const blob = new Blob([Store.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jmg-english-respaldo-${Store.today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#s-import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!confirm('Esto reemplazará tu progreso actual con el del respaldo. ¿Continuar?')) return;
      Store.importData(text);
      registerCustom();
      toast('Respaldo cargado');
      App.render();
    } catch (err) { alert('No se pudo cargar: ' + err.message); }
  };
  $('#s-reset').onclick = () => {
    if (!confirm('¿Seguro? Se borrará todo tu progreso (racha, XP, frases propias y memorizadas).')) return;
    if (!confirm('Última confirmación: ¿borrar todo?')) return;
    Store.reset();
    registerCustom();
    location.hash = '#home';
    App.render();
  };
}

/* =====================================================================
   APP
   ===================================================================== */
const App = {
  routes: { home: renderHome, library: renderLibrary, add: renderAdd, practice: renderPractice, settings: renderSettings },
  render() {
    let [route, sub] = (location.hash || '#home').slice(1).split('/');
    if (!App.routes[route]) route = 'home';
    const sidebar = $('#sidebar');
    if (!Store.state.onboarded) { sidebar.classList.add('hidden'); renderWelcome(); return; }
    sidebar.classList.remove('hidden');
    renderSidebar(route);
    App.routes[route](sub);
    window.scrollTo(0, 0);
  },
};

registerCustom();
window.addEventListener('hashchange', () => { if (!Session.active) App.render(); });
App.render();
