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
