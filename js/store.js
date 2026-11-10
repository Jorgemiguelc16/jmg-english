'use strict';
/*
  Store: todo tu progreso se guarda en este navegador (localStorage).
  Puedes descargar un respaldo desde Ajustes.
*/
const Store = (() => {
  const KEY = 'jmg-english-v1';
  const MIN_EX_FOR_DAY = 5;      // ejercicios mínimos para que el día cuente en la racha
  const MAX_FREEZES = 2;
  const TITLES = ['Starter', 'Beginner', 'Explorer', 'Learner', 'Talker', 'Speaker', 'Storyteller', 'Conversationalist', 'Fluent-ish', 'Native-like'];

  function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }
  const today = () => dateKey();
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + n));
  }
  function diffDays(a, b) { // b - a
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }

  function defaults() {
    return {
      v: 1,
      name: '',
      onboarded: false,
      created: today(),
      xp: 0,
      sessions: 0,
      topic: 't1',
      streak: { current: 0, best: 0, last: null, freezes: 0 },
      days: {},     // 'YYYY-MM-DD' -> { sec, ex, xp }
      cards: {},    // phraseId -> { iv, ef, due, reps, lapses, added, last }
      dialogs: {},  // dialogId -> { best, date }
      custom: [],   // frases propias: { id, en, es, src, chunks }
      memoCol: 'movies',
      totalReps: 0,
      settings: { voice: '', rate: 0.95, autoplay: true, sounds: true },
    };
  }

  function normalize(raw) {
    const d = defaults();
    const s = Object.assign(d, raw || {});
    s.settings = Object.assign(defaults().settings, (raw && raw.settings) || {});
    s.streak = Object.assign(defaults().streak, (raw && raw.streak) || {});
    s.days = s.days || {};
    s.cards = s.cards || {};
    s.dialogs = s.dialogs || {};
    s.custom = Array.isArray(s.custom) ? s.custom : [];
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.warn('No se pudo leer el progreso', e);
      return defaults();
    }
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
  }

  /* ---------- Días y racha ---------- */
  function dayRec(key = today()) {
    if (!state.days[key]) state.days[key] = { sec: 0, ex: 0, xp: 0 };
    return state.days[key];
  }
  function todayRec() { return state.days[today()] || { sec: 0, ex: 0, xp: 0 }; }
  function dayCounted(key) { const r = state.days[key]; return !!(r && (r.ex >= MIN_EX_FOR_DAY || r.done)); }

  /* Marca hoy como practicado. Devuelve null si ya contaba, o info de la racha. */
  function markPracticed() {
    const t = today();
    const s = state.streak;
    dayRec().done = true;
    if (s.last === t) return null;
    let usedFreeze = 0;
    if (!s.last) s.current = 1;
    else {
      const gap = diffDays(s.last, t);
      if (gap === 1) s.current += 1;
      else if (gap > 1 && gap - 1 <= s.freezes) { usedFreeze = gap - 1; s.freezes -= usedFreeze; s.current += 1; }
      else s.current = 1;
    }
    s.last = t;
    s.best = Math.max(s.best, s.current);
    let earnedFreeze = false;
    if (s.current % 7 === 0 && s.freezes < MAX_FREEZES) { s.freezes += 1; earnedFreeze = true; }
    return { count: s.current, usedFreeze, earnedFreeze };
  }

  function streakView() {
    const s = state.streak;
    if (!s.last) return { count: 0, status: 'none', freezes: s.freezes };
    const gap = diffDays(s.last, today());
    if (gap <= 0) return { count: s.current, status: 'done', freezes: s.freezes };
    if (gap === 1) return { count: s.current, status: 'pending', freezes: s.freezes };
    if (gap - 1 <= s.freezes) return { count: s.current, status: 'frozen', missed: gap - 1, freezes: s.freezes };
    return { count: 0, status: 'lost', prev: s.current, freezes: s.freezes };
  }

  /* Registra un ejercicio terminado */
  function recordExercise({ xp = 0, sec = 0 } = {}) {
    const d = dayRec();
    d.ex += 1;
    d.xp += xp;
    d.sec += sec;
    state.xp += xp;
    let streak = null;
    if (d.ex >= MIN_EX_FOR_DAY) streak = markPracticed();
    save();
    return streak;
  }

  /* Repeticiones en voz alta */
  function addReps(n = 1) {
    const d = dayRec();
    d.reps = (d.reps || 0) + n;
    state.totalReps = (state.totalReps || 0) + n;
    save();
  }

  /* Frases propias */
  function addCustom({ en, es, src = '', chunks = [] }) {
    const item = { id: 'c-' + Date.now().toString(36), en, es, src, chunks, added: today() };
    state.custom.push(item);
    save();
    return item;
  }
  function removeCustom(id) {
    state.custom = state.custom.filter((c) => c.id !== id);
    delete state.cards[id];
    save();
  }

  function finishSession() {
    state.sessions = (state.sessions || 0) + 1;
    const r = markPracticed();
    save();
    return r;
  }

  /* ---------- Repaso espaciado (tipo SM-2 simplificado) ---------- */
  function learn(id) {
    if (!state.cards[id]) {
      state.cards[id] = { iv: 0, ef: 2.5, due: addDays(today(), 1), reps: 0, lapses: 0, added: today(), last: today() };
      save();
    }
  }

  // r: 0 = otra vez, 1 = difícil, 2 = bien, 3 = fácil
  function rate(id, r) {
    learn(id);
    const c = state.cards[id];
    if (r === 0) { c.lapses += 1; c.ef = Math.max(1.3, c.ef - 0.2); c.iv = 1; }
    else if (r === 1) { c.ef = Math.max(1.3, c.ef - 0.15); c.iv = Math.max(1, Math.round(c.iv * 1.2)); }
    else if (r === 2) { c.iv = c.iv < 1 ? 1 : c.iv < 2 ? 3 : Math.round(c.iv * c.ef); }
    else { c.ef += 0.15; c.iv = c.iv < 1 ? 3 : Math.round(Math.max(c.iv, 1) * c.ef * 1.3); }
    c.iv = Math.min(c.iv, 365);
    c.reps += 1;
    c.due = addDays(today(), c.iv);
    c.last = today();
    save();
  }

  // Resultado de práctica (dictado, pronunciación...). Si te fue mal, la frase vuelve pronto.
  function practice(id, score) {
    const c = state.cards[id];
    if (!c) return;
    if (score < 0.6) {
      const tomorrow = addDays(today(), 1);
      if (c.due > tomorrow) c.due = tomorrow;
      c.ef = Math.max(1.3, c.ef - 0.1);
      save();
    }
  }

  function status(id) {
    const c = state.cards[id];
    if (!c) return 'new';
    return c.iv >= 21 ? 'mastered' : 'learning';
  }

  function dueIds() {
    const t = today();
    return Object.entries(state.cards)
      .filter(([id, c]) => c.due <= t && PHRASE_BY_ID[id])
      .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : b[1].lapses - a[1].lapses))
      .map(([id]) => id);
  }
  function learnedIds() { return Object.keys(state.cards).filter((id) => PHRASE_BY_ID[id]); }
  function weakIds() {
    return learnedIds()
      .map((id) => [id, state.cards[id]])
      .sort((a, b) => (b[1].lapses - a[1].lapses) || (a[1].iv - b[1].iv))
      .map(([id]) => id);
  }
  function masteredCount() { return learnedIds().filter((id) => status(id) === 'mastered').length; }

  /* ---------- Nivel ---------- */
  function levelInfo(xp = state.xp) {
    const L = Math.floor((1 + Math.sqrt(1 + (xp * 4) / 25)) / 2);
    const cur = 25 * L * (L - 1);
    const nxt = 25 * (L + 1) * L;
    return { level: L, title: TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 2))], cur, nxt, pct: (xp - cur) / (nxt - cur) };
  }

  /* ---------- Tema actual ---------- */
  function currentTopic() {
    let idx = TOPICS.findIndex((t) => t.id === state.topic);
    if (idx < 0) idx = 0;
    for (let k = 0; k < TOPICS.length; k++) {
      const t = TOPICS[(idx + k) % TOPICS.length];
      if (t.items.some((p) => !state.cards[p.id])) {
        if (t.id !== state.topic) { state.topic = t.id; save(); }
        return t;
      }
    }
    return TOPICS[idx];
  }
  function setTopic(id) { state.topic = id; save(); }

  function dialogDone(id, score) {
    const prev = state.dialogs[id];
    state.dialogs[id] = { best: Math.max(score, prev ? prev.best : 0), date: today() };
    save();
  }

  /* ---------- Respaldo ---------- */
  function exportData() { return JSON.stringify(state, null, 2); }
  function importData(json) {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !data.cards || !data.streak) throw new Error('El archivo no parece un respaldo de JMG English.');
    state = normalize(data);
    save();
  }
  function reset() { state = defaults(); save(); }

  return {
    get state() { return state; },
    save, today, addDays, diffDays, dateKey, addReps, addCustom, removeCustom,
    todayRec, dayCounted, streakView, recordExercise, finishSession,
    learn, rate, practice, status, dueIds, learnedIds, weakIds, masteredCount,
    levelInfo, currentTopic, setTopic, dialogDone,
    exportData, importData, reset,
    MIN_EX_FOR_DAY,
  };
})();
