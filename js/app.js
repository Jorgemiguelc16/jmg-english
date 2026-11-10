'use strict';

/* =====================================================================
   PLANES DE SESIÓN según el tiempo disponible
   ===================================================================== */
const PLANS = {
  5:  { icon: 'zap',      name: 'Rápida',    desc: 'Mantén tu racha',          reviews: 5,  news: 2,  practice: 4,  dialogs: 0 },
  15: { icon: 'coffee',   name: 'Corta',     desc: 'Repaso y frases nuevas',   reviews: 10, news: 4,  practice: 9,  dialogs: 0 },
  30: { icon: 'book',     name: 'Estándar',  desc: 'Incluye un diálogo',       reviews: 18, news: 6,  practice: 15, dialogs: 1 },
  60: { icon: 'trending', name: 'Intensiva', desc: 'Incluye dos diálogos',     reviews: 30, news: 10, practice: 26, dialogs: 2 },
};

/* ---------- Constructores de ejercicios ---------- */
const mk = (type, phrase, extra = {}) => ({ type, phrase, key: `${type}:${phrase.id}`, ...extra });

function practiceTypes(n) {
  const base = Speech.canListen
    ? ['dictation', 'speak', 'build', 'dictation', 'choice', 'speak', 'build']
    : ['dictation', 'build', 'choice', 'dictation', 'build', 'choice', 'dictation'];
  const out = [];
  while (out.length < n) out.push(...shuffle(base));
  return out.slice(0, n);
}

// Evita que se repita el mismo tipo o la misma frase dos veces seguidas
function spread(items) {
  const a = shuffle(items);
  for (let i = 1; i < a.length; i++) {
    if (a[i].type === a[i - 1].type || a[i].phrase === a[i - 1].phrase) {
      for (let j = i + 1; j < a.length; j++) {
        if (a[j].type !== a[i - 1].type && a[j].phrase !== a[i - 1].phrase) { [a[i], a[j]] = [a[j], a[i]]; break; }
      }
    }
  }
  return a;
}

function pickNew(n) {
  const start = Store.currentTopic();
  const idx = TOPICS.indexOf(start);
  const out = [];
  for (let k = 0; k < TOPICS.length && out.length < n; k++) {
    const t = TOPICS[(idx + k) % TOPICS.length];
    for (const p of t.items) {
      if (out.length >= n) break;
      if (!Store.state.cards[p.id]) out.push(p);
    }
  }
  return out;
}

function practicePool(fallbackTopic) {
  const learned = Store.learnedIds().map((id) => PHRASE_BY_ID[id]);
  const weak = Store.weakIds().slice(0, 12).map((id) => PHRASE_BY_ID[id]);
  let pool = weak.concat(learned); // las débiles aparecen más
  if (pool.length < 6) pool = pool.concat((fallbackTopic || Store.currentTopic()).items);
  return pool;
}

function planEstimate(min) {
  const plan = PLANS[min];
  const due = Math.min(Store.dueIds().length, plan.reviews);
  return { due, total: due + plan.news + plan.practice };
}

function buildTimedSession(min) {
  const plan = PLANS[min];
  const dueAll = Store.dueIds();
  const due = dueAll.slice(0, plan.reviews).map((id) => PHRASE_BY_ID[id]);
  let nNew = plan.news;
  if (dueAll.length > plan.reviews * 2) nNew = Math.ceil(nNew / 2);          // mucho atraso: menos nuevas
  else if (due.length < plan.reviews / 2) nNew = Math.ceil(nNew * 1.5);     // poco que repasar: más nuevas
  const news = pickNew(nNew);

  // Repasos y frases nuevas intercalados (2 repasos : 1 nueva)
  const q = [];
  let ri = 0, ni = 0;
  while (ri < due.length || ni < news.length) {
    if (ri < due.length) q.push(mk('review', due[ri++]));
    if (ri < due.length) q.push(mk('review', due[ri++]));
    if (ni < news.length) q.push(mk('learn', news[ni++]));
  }

  // Práctica: cada frase nueva se practica al menos una vez; el resto sale del pool
  const types = practiceTypes(plan.practice);
  const targets = news.slice();
  const pool = shuffle(practicePool());
  let pi = 0;
  while (targets.length < plan.practice && pool.length) targets.push(pool[pi++ % pool.length]);
  const practice = uniqueBy(targets.map((p, i) => mk(types[i], p)), (x) => x.key);
  q.push(...spread(practice));

  // Diálogos
  if (plan.dialogs) {
    const topicId = Store.currentTopic().id;
    const pending = DIALOGUES.filter((d) => !Store.state.dialogs[d.id]);
    const ordered = pending.filter((d) => d.topic === topicId).concat(shuffle(pending.filter((d) => d.topic !== topicId)), shuffle(DIALOGUES));
    uniqueBy(ordered, (d) => d.id).slice(0, plan.dialogs).forEach((d) => q.push({ type: 'dialogue', dialog: d, key: 'dialogue:' + d.id }));
  }
  return q;
}

function buildModeSession(mode) {
  if (mode === 'review') return Store.dueIds().slice(0, 40).map((id) => mk('review', PHRASE_BY_ID[id]));
  const typeMap = { listen: 'dictation', speak: 'speak', build: 'build', meaning: 'choice' };
  const pool = uniqueBy(shuffle(practicePool()), (p) => p.id).slice(0, 10);
  return spread(pool.map((p) => mk(typeMap[mode], p)));
}

function buildTopicSession(topicId) {
  const t = TOPIC_BY_ID[topicId];
  const fresh = t.items.filter((p) => !Store.state.cards[p.id]).slice(0, 5);
  const q = [];
  if (fresh.length) {
    fresh.forEach((p) => q.push(mk('learn', p)));
    const types = practiceTypes(fresh.length * 2);
    const practice = fresh.flatMap((p, i) => [mk(types[i * 2], p), mk(types[i * 2 + 1] === types[i * 2] ? 'choice' : types[i * 2 + 1], p)]);
    q.push(...spread(uniqueBy(practice, (x) => x.key)));
  } else {
    const types = practiceTypes(10);
    q.push(...spread(sample(t.items, 10).map((p, i) => mk(types[i], p))));
  }
  return q;
}

/* =====================================================================
   SESIÓN (pantalla completa con los ejercicios)
   ===================================================================== */
const Session = (() => {
  let s = null;
  const root = () => $('#session');

  function start(queue, title) {
    if (!queue.length) { toast('No hay contenido para practicar aquí todavía.'); return; }
    Speech.stop();
    s = { queue, i: 0, title, xp: 0, graded: 0, correct: 0, sec: 0, lastTick: Date.now(), learned: [], requeued: new Set(), levelBefore: Store.levelInfo().level };
    const el = root();
    el.innerHTML = `
      <div class="session-top"><div class="session-top-inner">
        <button class="icon-btn" id="s-close" type="button" title="Salir de la sesión">${icon('x')}</button>
        <span class="s-title">${esc(title)}</span>
        <div class="progress"><div class="progress-bar"></div></div>
        <span class="s-count" id="s-count"></span>
        <span class="s-xp"><b id="s-xp">0</b> XP</span>
      </div></div>
      <div class="session-body"><div class="stage"></div></div>
      <div class="session-foot"><div class="foot-inner"><div class="foot-msg"></div><div class="foot-btns"></div></div></div>`;
    el.classList.remove('hidden');
    document.body.classList.add('in-session');
    $('#s-close').onclick = exit;
    next();
  }

  function foot({ msg = '', state = '', buttons = [] } = {}) {
    const f = $('.session-foot', root());
    f.className = 'session-foot' + (state ? ' is-' + state : '');
    $('.foot-msg', f).innerHTML = msg;
    const box = $('.foot-btns', f);
    box.innerHTML = '';
    const prim = buttons.find((b) => b.primary === true) || (buttons.length && buttons[buttons.length - 1].primary !== false ? buttons[buttons.length - 1] : null);
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn lg ' + (b.kind || 'primary');
      el.innerHTML = b.label;
      el.disabled = !!b.disabled;
      if (b === prim) el.dataset.primary = '';
      if (b.key) el.dataset.key = b.key;
      el.onclick = () => { if (!el.disabled) b.onClick(); };
      box.appendChild(el);
    });
  }

  function updateTop() {
    $('.progress-bar', root()).style.width = `${(s.i / s.queue.length) * 100}%`;
    $('#s-count').textContent = `${Math.min(s.i + 1, s.queue.length)} / ${s.queue.length}`;
  }

  function next() {
    Speech.stop();
    Speech.stopListening();
    if (s.i >= s.queue.length) return finish();
    const item = s.queue[s.i];
    updateTop();
    const stage = $('.stage', root());
    stage.innerHTML = '';
    stage.className = 'stage enter';
    void stage.offsetWidth;
    stage.classList.remove('enter');
    $('.session-body', root()).scrollTop = 0;
    const ctx = { stage, foot, done: (r) => done(item, r) };
    Ex[item.type].render(item, ctx);
  }

  function done(item, r = {}) {
    const now = Date.now();
    const sec = Math.min(150, (now - s.lastTick) / 1000);
    s.lastTick = now;
    s.sec += sec;
    const xp = Math.max(0, Math.round(r.xp || 0));
    s.xp += xp;
    $('#s-xp').textContent = s.xp;
    if (r.graded) { s.graded++; if (r.correct) s.correct++; }
    if (r.learned) s.learned.push(r.learned);
    if (r.requeue && !s.requeued.has(item.key)) {
      s.requeued.add(item.key);
      s.queue.push({ ...item, requeued: true });
    }
    const streak = Store.recordExercise({ xp, sec });
    if (streak) streakToast(streak);
    const lv = Store.levelInfo().level;
    if (lv > s.levelBefore) { s.levelBefore = lv; setTimeout(() => toast(`Subiste al <b>nivel ${lv}</b> · ${Store.levelInfo().title}`), streak ? 3300 : 0); }
    s.i++;
    next();
  }

  function finish() {
    const streak = Store.finishSession();
    if (streak) streakToast(streak);
    Sfx.done();
    $('.progress-bar', root()).style.width = '100%';
    $('#s-count').textContent = `${s.queue.length} / ${s.queue.length}`;
    const acc = s.graded ? Math.round((s.correct / s.graded) * 100) : null;
    const mins = Math.max(1, Math.round(s.sec / 60));
    const sv = Store.streakView();
    const line = acc === null ? 'Buen trabajo.' : acc >= 85 ? 'Excelente resultado.' : acc >= 60 ? 'Buen trabajo, vas avanzando.' : 'Cada error es una repetición más. Así se aprende.';
    $('.stage', root()).innerHTML = `
      <div class="summary">
        <div class="summary-badge">${icon('check')}</div>
        <h2>Sesión completada</h2>
        <p class="sub">${line}</p>
        <div class="summary-grid">
          <div class="sum-box"><div class="n">+${s.xp}</div><div class="l">XP ganados</div></div>
          <div class="sum-box"><div class="n">${acc === null ? '—' : acc + '%'}</div><div class="l">Precisión</div></div>
          <div class="sum-box"><div class="n">${mins}</div><div class="l">Minuto${mins === 1 ? '' : 's'}</div></div>
          <div class="sum-box"><div class="n">${sv.count}</div><div class="l">Día${sv.count === 1 ? '' : 's'} de racha</div></div>
        </div>
        ${s.learned.length ? `
          <div class="learned-wrap">
            <h3>Frases nuevas de hoy</h3>
            <div class="card rows">
              ${s.learned.map((p) => `<div class="row-item"><button class="play-btn" data-en="${esc(p.en)}" type="button" title="Escuchar">${icon('volume')}</button><div class="grow"><div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}</div></div></div>`).join('')}
            </div>
            <p class="muted small center" style="margin-top:10px">Volverán en tus próximos repasos.</p>
          </div>` : ''}
      </div>`;
    $$('[data-en]', root()).forEach((b) => { b.onclick = () => Speech.say(b.dataset.en); });
    foot({
      buttons: [
        { label: 'Otra ronda de 5 min', kind: 'secondary', primary: false, onClick: () => start(buildTimedSession(5), 'Sesión rápida') },
        { label: 'Volver al inicio', primary: true, onClick: close },
      ],
    });
    s.i = s.queue.length;
    s.finished = true;
  }

  function exit() {
    if (s && !s.finished && s.i > 0 && !confirm('¿Salir de la sesión? Lo que ya completaste queda guardado.')) return;
    close();
  }

  function close() {
    Speech.stop();
    Speech.stopListening();
    root().classList.add('hidden');
    root().innerHTML = '';
    document.body.classList.remove('in-session');
    s = null;
    App.render();
  }

  function streakToast(st) {
    let msg = `Día completado · racha de <b>${st.count} día${st.count === 1 ? '' : 's'}</b>`;
    if (st.usedFreeze) msg += ` · se usó ${st.usedFreeze} protector${st.usedFreeze > 1 ? 'es' : ''}`;
    if (st.earnedFreeze) msg += ' · ganaste un protector de racha';
    toast(msg, 4000);
  }

  return { start, get active() { return !!s; } };
})();

/* Teclado: Enter = botón principal, 1-4 = opciones */
document.addEventListener('keydown', (e) => {
  if (!Session.active) return;
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.disabled;
  if (e.key === 'Enter') {
    const b = $('#session [data-primary]');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  } else if (/^[1-4]$/.test(e.key) && !inField) {
    const b = $(`#session .session-foot [data-key="${e.key}"]`) || $(`#session .stage [data-key="${e.key}"]`);
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});

/* =====================================================================
   PANTALLAS
   ===================================================================== */
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NAV = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'practice', icon: 'target', label: 'Práctica' },
  { id: 'topics', icon: 'book', label: 'Temas' },
  { id: 'phrases', icon: 'list', label: 'Frases' },
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
    case 'pending': return `Completa una sesión hoy para mantener tu racha de ${plural(sv.count, 'día', 'días')}.`;
    case 'frozen': return `No practicaste ${plural(sv.missed, 'día', 'días')}. Si practicas hoy, un protector salvará tu racha.`;
    case 'lost': return sv.prev > 1 ? `Tu racha de ${sv.prev} días se reinició. Hoy es un buen día para empezar otra.` : 'Completa una sesión hoy para iniciar tu racha.';
    default: return 'Completa tu primera sesión para iniciar tu racha.';
  }
}

function pageHead(title, sub, eyebrow = '') {
  return `<header class="page-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`;
}

function renderSidebar(route) {
  $('#nav').innerHTML = NAV.map((n) => `<a class="nav-item${n.id === route ? ' active' : ''}" href="#${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`).join('');
  const sv = Store.streakView();
  const lv = Store.levelInfo();
  $('#side-foot').innerHTML = `
    <div class="mini-stat${sv.status === 'done' ? ' lit' : ''}">${icon('flame')}<div><b>${plural(sv.count, 'día', 'días')}</b><span>Racha actual</span></div></div>
    <div class="mini-stat">${icon('star')}<div class="grow"><b>Nivel ${lv.level}</b><span>${lv.title}</span><div class="bar" style="margin-top:6px"><div style="width:${Math.round(lv.pct * 100)}%"></div></div></div></div>`;
}

function renderWelcome() {
  $('#app').innerHTML = `
    <section class="welcome card">
      <div class="card-body">
        <div class="brand-mark" style="width:44px;height:44px;font-size:1.3rem;border-radius:11px">J</div>
        <h1>Configura tu espacio</h1>
        <p class="lead">Tu plataforma personal para aprender a conversar en inglés, con sesiones que se adaptan al tiempo que tengas cada día.</p>
        <div class="features">
          <div class="feature"><div class="icon-tile">${icon('clock')}</div><div><b>Sesiones flexibles</b><span>Elige 5, 15, 30 o 60 minutos. Con 5 minutos ya mantienes tu racha.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('repeat')}</div><div><b>Repaso espaciado</b><span>Cada frase vuelve justo antes de que la olvides.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('headphones')}</div><div><b>Escucha y habla a diario</b><span>Dictados, diálogos con voces naturales, modo lento y evaluación de pronunciación.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('messages')}</div><div><b>Inglés real de conversación</b><span>${PHRASES.length} frases en ${TOPICS.length} temas y ${DIALOGUES.length} diálogos.</span></div></div>
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
  $('#w-test').onclick = () => Speech.say('Hi! Welcome to your English platform.');
  $('#w-go').onclick = () => {
    Store.state.name = $('#w-name').value.trim();
    Store.state.onboarded = true;
    Store.save();
    location.hash = '#home';
    App.render();
  };
}

function renderHome() {
  const st = Store.state;
  const sv = Store.streakView();
  const lv = Store.levelInfo();
  const td = Store.todayRec();
  const due = Store.dueIds().length;
  const learned = Store.learnedIds().length;
  const mastered = Store.masteredCount();
  const topic = Store.currentTopic();
  const topicLearned = topic.items.filter((p) => st.cards[p.id]).length;
  const t = Store.today();
  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = Store.addDays(t, -i);
    const [y, m, d] = key.split('-').map(Number);
    const rec = st.days[key];
    const min = rec ? rec.sec / 60 : 0;
    const lvl = !Store.dayCounted(key) ? (rec && rec.ex ? 1 : 0) : min >= 25 ? 3 : 2;
    days.push({ key, letter: DAY_LETTERS[new Date(y, m - 1, d).getDay()], lvl, isToday: i === 0, title: `${d}/${m} · ${rec ? fmtMinutes(rec.sec) + ' min · ' + rec.ex + ' ejercicios' : 'sin práctica'}` });
  }
  const activeDays = days.filter((d) => d.lvl >= 2).length;

  $('#app').innerHTML = `
    ${pageHead(`${hello}${st.name ? ', ' + esc(st.name) : ''}`, esc(streakMessage(sv)), todayLong())}

    <section class="kpis">
      <div class="card kpi${sv.status === 'done' ? ' lit' : ''}">
        <div class="kpi-top"><span>Racha</span>${icon('flame')}</div>
        <div class="kpi-value">${sv.count}<small>${sv.count === 1 ? 'día' : 'días'}</small></div>
        <div class="kpi-sub">Récord ${st.streak.best} · ${plural(sv.freezes, 'protector', 'protectores')}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Nivel ${lv.level} · ${lv.title}</span>${icon('star')}</div>
        <div class="kpi-value">${st.xp}<small>XP</small></div>
        <div><div class="bar"><div style="width:${Math.round(lv.pct * 100)}%"></div></div><div class="kpi-sub" style="margin-top:6px">${lv.nxt - st.xp} XP para el nivel ${lv.level + 1}</div></div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Hoy</span>${icon('clock')}</div>
        <div class="kpi-value">${fmtMinutes(td.sec)}<small>min</small></div>
        <div class="kpi-sub">${plural(td.ex, 'ejercicio', 'ejercicios')} · ${td.xp} XP</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Repasos pendientes</span>${icon('repeat')}</div>
        <div class="kpi-value">${due}<small>${due === 1 ? 'frase' : 'frases'}</small></div>
        <div class="kpi-sub">${due ? 'Se incluyen en tu próxima sesión' : 'Estás al día'}</div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="card-head"><div><h2>Nueva sesión</h2><p>¿Cuánto tiempo tienes hoy? La sesión se arma automáticamente.</p></div></div>
      <div class="durations">
        ${Object.entries(PLANS).map(([min, p]) => {
          const est = planEstimate(Number(min));
          return `
          <button class="duration" data-min="${min}" type="button">
            <span class="d-go">${icon('arrow', 'sm')}</span>
            <span class="icon-tile">${icon(p.icon)}</span>
            <span class="d-min">${min}<small> min</small></span>
            <span class="d-name">${p.name}</span>
            <span class="d-desc">${p.desc} · ~${est.total} ejercicios</span>
          </button>`;
        }).join('')}
      </div>
      <div class="card-foot">
        <span>${icon('book', 'sm')} Tema actual: <b>${esc(topic.name)}</b> · ${topicLearned}/${topic.items.length}</span>
        <span>${icon('repeat', 'sm')} <b>${due}</b> ${due === 1 ? 'repaso pendiente' : 'repasos pendientes'}</span>
      </div>
    </section>

    <section class="grid-3">
      <div class="card">
        <div class="card-head"><div><h2>Actividad</h2><p>Últimos 14 días · ${plural(activeDays, 'día completado', 'días completados')}</p></div></div>
        <div class="card-body">
          <div class="activity">
            ${days.map((d) => `<div class="act-cell${d.isToday ? ' today' : ''}" title="${d.title}"><div class="act-box l${d.lvl}"></div><span class="act-lbl">${d.letter}</span></div>`).join('')}
          </div>
          <div class="legend">Menos <span class="act-box"></span><span class="act-box l1"></span><span class="act-box l2"></span><span class="act-box l3"></span> Más</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Progreso</h2><p>${Math.round((learned / PHRASES.length) * 100)}% del contenido aprendido</p></div></div>
        <div class="card-body">
          <div class="bar ok" style="margin-bottom:16px"><div style="width:${(learned / PHRASES.length) * 100}%"></div></div>
          <div class="stat-list">
            <div class="stat-row"><span>Frases aprendidas</span><b>${learned} / ${PHRASES.length}</b></div>
            <div class="stat-row"><span>Frases dominadas</span><b>${mastered}</b></div>
            <div class="stat-row"><span>Diálogos completados</span><b>${Object.keys(st.dialogs).length} / ${DIALOGUES.length}</b></div>
            <div class="stat-row"><span>Sesiones terminadas</span><b>${st.sessions || 0}</b></div>
          </div>
        </div>
      </div>
    </section>

    <section class="card note">${icon('bulb')}<div><b>Consejo del día</b><p>${esc(tip)}</p></div></section>`;

  $$('.duration').forEach((b) => {
    b.onclick = () => { const min = Number(b.dataset.min); Session.start(buildTimedSession(min), `Sesión ${PLANS[min].name.toLowerCase()} · ${min} min`); };
  });
}

function renderPractice() {
  const due = Store.dueIds().length;
  const modes = [
    { id: 'review', icon: 'repeat', title: 'Repaso', desc: due ? `${plural(due, 'frase pendiente', 'frases pendientes')}` : 'No hay repasos pendientes', disabled: !due },
    { id: 'listen', icon: 'headphones', title: 'Dictado', desc: 'Escucha y escribe lo que oyes' },
    { id: 'speak', icon: 'mic', title: 'Pronunciación', desc: Speech.canListen ? 'El micrófono evalúa tu pronunciación' : 'Repite en voz alta y evalúate' },
    { id: 'meaning', icon: 'ear', title: 'Comprensión auditiva', desc: 'Entiende frases solo escuchando' },
    { id: 'build', icon: 'grid', title: 'Ordenar frases', desc: 'Construye frases palabra por palabra' },
  ];
  $('#app').innerHTML = `
    ${pageHead('Práctica', 'Entrena una habilidad específica. Cada ronda tiene 10 ejercicios.')}
    <div class="tiles">
      ${modes.map((m) => `<button class="card tile-card" data-mode="${m.id}" type="button" ${m.disabled ? 'disabled' : ''}><span class="icon-tile">${icon(m.icon)}</span><span><span class="t-title">${m.title}</span><span class="t-desc" style="display:block">${m.desc}</span></span></button>`).join('')}
    </div>
    <div class="section-head"><div><h2>Diálogos</h2><p>Conversaciones con dos voces: escucha, responde preguntas y revisa la transcripción.</p></div></div>
    <div class="card rows">
      ${DIALOGUES.map((d) => {
        const r = Store.state.dialogs[d.id];
        const badge = r ? `<span class="badge ok">${icon('check', 'sm')} ${Math.round(r.best * 100)}%</span>` : '<span class="badge">Nuevo</span>';
        return `<button class="row-item clickable" data-dialog="${d.id}" type="button"><span class="icon-tile neutral">${icon(TOPIC_ICONS[d.topic] || 'messages')}</span><span class="grow"><span class="r-title" style="display:block">${esc(d.title)}</span><span class="r-desc">${esc(d.scene)}</span></span>${badge}${icon('arrow', 'sm')}</button>`;
      }).join('')}
    </div>`;
  const names = { review: 'Repaso', listen: 'Dictado', speak: 'Pronunciación', meaning: 'Comprensión auditiva', build: 'Ordenar frases' };
  $$('[data-mode]').forEach((b) => { b.onclick = () => Session.start(buildModeSession(b.dataset.mode), names[b.dataset.mode]); });
  $$('[data-dialog]').forEach((b) => { b.onclick = () => { const d = DIALOGUE_BY_ID[b.dataset.dialog]; Session.start([{ type: 'dialogue', dialog: d, key: 'dialogue:' + d.id }], 'Diálogo'); }; });
}

function renderTopics() {
  const cur = Store.currentTopic().id;
  $('#app').innerHTML = `
    ${pageHead('Temas', 'Las sesiones toman frases nuevas del tema actual. Al completarlo, se avanza automáticamente al siguiente.')}
    <div class="topic-grid">
      ${TOPICS.map((t) => {
        const n = t.items.filter((p) => Store.state.cards[p.id]).length;
        const m = t.items.filter((p) => Store.status(p.id) === 'mastered').length;
        return `
          <div class="card topic${t.id === cur ? ' current' : ''}">
            <div class="topic-head"><span class="icon-tile${t.id === cur ? '' : ' neutral'}">${icon(TOPIC_ICONS[t.id])}</span><div class="grow"><div class="topic-name">${esc(t.name)}</div><div class="muted small">${t.items.length} frases</div></div>${t.id === cur ? '<span class="badge accent">Actual</span>' : ''}</div>
            <div><div class="topic-meta"><span>${n} aprendidas${m ? ` · ${m} dominadas` : ''}</span><span>${Math.round((n / t.items.length) * 100)}%</span></div><div class="bar"><div style="width:${(n / t.items.length) * 100}%"></div></div></div>
            <div class="topic-actions">
              ${t.id === cur ? '<span></span>' : `<button class="btn ghost sm" data-set="${t.id}" type="button">Establecer como actual</button>`}
              <button class="btn secondary sm" data-study="${t.id}" type="button">${n < t.items.length ? 'Aprender 5' : 'Practicar'} ${icon('arrow', 'sm')}</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  $$('[data-set]').forEach((b) => { b.onclick = () => { Store.setTopic(b.dataset.set); renderTopics(); toast('Tema actual actualizado'); }; });
  $$('[data-study]').forEach((b) => { b.onclick = () => Session.start(buildTopicSession(b.dataset.study), TOPIC_BY_ID[b.dataset.study].name); });
}

function renderPhrases() {
  $('#app').innerHTML = `
    ${pageHead('Frases', 'Todo el contenido disponible y el estado de cada frase.')}
    <div class="card rows">
      <div class="toolbar">
        <div class="input-icon">${icon('search', 'sm')}<input class="input" id="f-q" type="search" placeholder="Buscar en inglés o español"></div>
        <select class="select" id="f-topic"><option value="">Todos los temas</option>${TOPICS.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        <select class="select" id="f-status"><option value="">Todos los estados</option><option value="new">Nuevas</option><option value="learning">En aprendizaje</option><option value="mastered">Dominadas</option></select>
      </div>
      <div class="list-count" id="f-count"></div>
      <div id="f-list"></div>
    </div>`;
  const labels = { new: ['Nueva', ''], learning: ['En aprendizaje', 'warn'], mastered: ['Dominada', 'ok'] };
  const draw = () => {
    const q = $('#f-q').value.trim().toLowerCase();
    const tp = $('#f-topic').value;
    const stt = $('#f-status').value;
    const rows = PHRASES.filter((p) => (!tp || p.topic === tp) && (!stt || Store.status(p.id) === stt) && (!q || p.en.toLowerCase().includes(q) || p.es.toLowerCase().includes(q)));
    $('#f-count').textContent = `${rows.length} de ${PHRASES.length} frases`;
    $('#f-list').innerHTML = rows.length ? rows.map((p) => {
      const [lbl, cls] = labels[Store.status(p.id)];
      return `<div class="row-item"><button class="play-btn" data-en="${esc(p.en)}" type="button" title="Escuchar">${icon('volume')}</button><div class="grow"><div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}</div></div><span class="badge ${cls}">${lbl}</span></div>`;
    }).join('') : '<p class="muted center" style="padding:28px">No hay frases que coincidan con el filtro.</p>';
    $$('#f-list [data-en]').forEach((b) => { b.onclick = () => Speech.say(b.dataset.en); });
  };
  ['#f-q', '#f-topic', '#f-status'].forEach((sel) => $(sel).addEventListener('input', draw));
  draw();
}

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
      <div class="card-head"><div><h2>Datos</h2><p>Tu progreso se guarda únicamente en este navegador.</p></div></div>
      <div class="set-row"><div><div class="s-label">Respaldo</div><div class="s-help">Descarga una copia, o cárgala para continuar en otro navegador o dispositivo.</div></div>
        <div class="row-btns"><button class="btn secondary" id="s-export" type="button">${icon('download')} Descargar</button><label class="btn secondary" for="s-import">${icon('upload')} Cargar</label><input id="s-import" type="file" accept=".json,application/json" hidden></div></div>
      <div class="set-row"><div><div class="s-label">Restablecer</div><div class="s-help">Borra la racha, el XP y todas las frases aprendidas.</div></div><div><button class="btn danger" id="s-reset" type="button">${icon('trash')} Borrar progreso</button></div></div>
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
      toast('Respaldo cargado');
      App.render();
    } catch (err) { alert('No se pudo cargar: ' + err.message); }
  };
  $('#s-reset').onclick = () => {
    if (!confirm('¿Seguro? Se borrará todo tu progreso (racha, XP y frases).')) return;
    if (!confirm('Última confirmación: ¿borrar todo?')) return;
    Store.reset();
    location.hash = '#home';
    App.render();
  };
}

/* =====================================================================
   APP
   ===================================================================== */
const App = {
  routes: { home: renderHome, practice: renderPractice, topics: renderTopics, phrases: renderPhrases, settings: renderSettings },
  render() {
    let route = (location.hash || '#home').slice(1);
    if (!App.routes[route]) route = 'home';
    const sidebar = $('#sidebar');
    if (!Store.state.onboarded) { sidebar.classList.add('hidden'); renderWelcome(); return; }
    sidebar.classList.remove('hidden');
    renderSidebar(route);
    App.routes[route]();
    window.scrollTo(0, 0);
  },
};

window.addEventListener('hashchange', () => { if (!Session.active) App.render(); });
App.render();
