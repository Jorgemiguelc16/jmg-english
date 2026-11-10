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

  function start(queue, title, opts = {}) {
    if (!queue.length) { toast('No hay contenido para practicar aquí todavía.'); return; }
    Speech.stop();
    s = { queue, i: 0, title, opts, reps: 0, xp: 0, graded: 0, correct: 0, sec: 0, lastTick: Date.now(), learned: [], requeued: new Set(), levelBefore: Store.levelInfo().level };
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
    if (r.reps) s.reps += r.reps;
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
          ${s.reps ? `<div class="sum-box"><div class="n">${s.reps}</div><div class="l">Repeticiones</div></div>` : `<div class="sum-box"><div class="n">${acc === null ? '—' : acc + '%'}</div><div class="l">Precisión</div></div>`}
          <div class="sum-box"><div class="n">${mins}</div><div class="l">Minuto${mins === 1 ? '' : 's'}</div></div>
          <div class="sum-box"><div class="n">${sv.count}</div><div class="l">Día${sv.count === 1 ? '' : 's'} de racha</div></div>
        </div>
        ${s.learned.length ? `
          <div class="learned-wrap">
            <h3>${s.reps ? 'Frases que memorizaste' : 'Frases nuevas de hoy'}</h3>
            <div class="card rows">
              ${s.learned.map((p) => `<div class="row-item"><button class="play-btn" data-en="${esc(p.en)}" type="button" title="Escuchar">${icon('volume')}</button><div class="grow"><div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}</div></div></div>`).join('')}
            </div>
            <p class="muted small center" style="margin-top:10px">Volverán en tus próximos repasos.</p>
          </div>` : ''}
      </div>`;
    $$('[data-en]', root()).forEach((b) => { b.onclick = () => Speech.say(b.dataset.en); });
    foot({
      buttons: [
        s.opts.again
          ? { label: s.opts.again.label, kind: 'secondary', primary: false, onClick: s.opts.again.run }
          : { label: 'Otra ronda de 5 min', kind: 'secondary', primary: false, onClick: () => start(buildTimedSession(5), 'Sesión rápida') },
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
  } else if (e.code === 'Space' && !inField) {
    const b = $('#session [data-space]');
    if (b && !b.disabled) { e.preventDefault(); if (document.activeElement) document.activeElement.blur(); b.click(); }
  } else if (/^[1-4]$/.test(e.key) && !inField) {
    const b = $(`#session .session-foot [data-key="${e.key}"]`) || $(`#session .stage [data-key="${e.key}"]`);
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});

