'use strict';
/*
  Speech: voz en inglés (lo que escuchas) y reconocimiento de voz (lo que dices).
  Funciona mejor en Microsoft Edge (voces "Natural" muy realistas) o Google Chrome.
  Sin internet: las voces "Natural" y el micrófono no funcionan. Se usan las voces
  instaladas en la computadora y los ejercicios pasan a modo manual (marcas tú mismo).
*/
const Speech = (() => {
  const synth = window.speechSynthesis || null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voices = [];
  let seq = 0;          // para cortar reproducciones en curso
  let current = null;   // evita que Chrome "pierda" el audio
  let activeRec = null;
  let itemAccent = null; // algunas frases siempre se escuchan en británico

  const accent = (over) => over || itemAccent || Store.state.settings.accent || 'us';
  const isGB = (v) => /^en[-_]GB/i.test(v.lang);
  const isOnline = () => navigator.onLine !== false;
  const isEnglish = (v) => /^en([-_]|$)/i.test(v.lang);
  // Sin internet solo suenan las voces instaladas en el equipo
  const usable = (v) => isOnline() || v.localService;

  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  function loadVoices() {
    voices = synth ? synth.getVoices() : [];
    if (voices.length) readyResolve();
  }
  if (synth) {
    loadVoices();
    synth.addEventListener ? synth.addEventListener('voiceschanged', loadVoices) : (synth.onvoiceschanged = loadVoices);
    setTimeout(readyResolve, 2000);
  } else readyResolve();

  function voiceScore(v, ac) {
    let s = ac === 'uk' && isGB(v) ? 40 : 0;
    if (/natural/i.test(v.name)) s += 20;
    if (/online/i.test(v.name)) s += 4;
    if (/google/i.test(v.name)) s += 6;
    if (/en[-_]US/i.test(v.lang)) s += 8;
    else if (/en[-_](GB|CA|AU)/i.test(v.lang)) s += 4;
    return s;
  }
  function englishVoices(over) {
    const ac = accent(over);
    return voices.filter((v) => isEnglish(v) && usable(v)).sort((a, b) => voiceScore(b, ac) - voiceScore(a, ac));
  }
  function mainVoice(over) {
    const list = englishVoices(over);
    const settings = Store.state.settings;
    // La voz elegida en Ajustes solo aplica si estamos en el acento elegido en Ajustes
    const chosen = accent(over) === (settings.accent || 'us') ? list.find((v) => v.name === settings.voice) : null;
    return chosen || list[0] || null;
  }
  function altVoice(over) {
    const main = mainVoice(over);
    const list = englishVoices(over).filter((v) => v !== main);
    if (!list.length) return null;
    const sameRegion = list.filter((v) => main && v.lang === main.lang);
    if (accent(over) === 'uk') return sameRegion[0] || null;   // nunca mezclar con una voz americana
    return (sameRegion[0] || list[0]);
  }
  const hasBritish = () => voices.some(isGB);
  const hasOfflineEnglish = () => voices.some((v) => v.localService && isEnglish(v));

  let warnedNoVoice = false;
  window.addEventListener('online', () => { warnedNoVoice = false; });
  function warnNoOfflineVoice() {
    if (warnedNoVoice) return;
    warnedNoVoice = true;
    toast('Sin internet no hay voz en inglés en esta computadora. Puedes instalar una en Configuración de Windows → Hora e idioma → Voz.', 6000);
  }

  function say(text, opts = {}) {
    if (!opts.keepSeq) seq++;
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      const start = () => {
        const u = new SpeechSynthesisUtterance(text);
        const v = (opts.voice && usable(opts.voice) ? opts.voice : null) || mainVoice(opts.accent);
        if (!v && !isOnline()) { warnNoOfflineVoice(); resolve(); return; }
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = accent(opts.accent) === 'uk' ? 'en-GB' : 'en-US';
        const base = Number(Store.state.settings.rate) || 1;
        u.rate = opts.slow ? Math.max(0.45, base * 0.62) : base;
        u.pitch = opts.pitch || 1;
        let finished = false;
        const fin = () => { if (!finished) { finished = true; clearTimeout(guard); resolve(); } };
        u.onend = fin;
        u.onerror = fin;
        const guard = setTimeout(fin, 2500 + (text.length * 130) / u.rate);
        current = u;
        synth.speak(u);
      };
      if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(start, 60); }
      else start();
    });
  }

  // Reproduce un diálogo línea por línea. Devuelve false si se interrumpió.
  async function playLines(lines, { onLine, slow } = {}) {
    const my = ++seq;
    for (let i = 0; i < lines.length; i++) {
      if (my !== seq) return false;
      onLine && onLine(i);
      await say(lines[i].text, { voice: lines[i].voice, pitch: lines[i].pitch, slow, keepSeq: true });
      if (my !== seq) return false;
      await wait(420);
    }
    onLine && onLine(-1);
    return true;
  }

  function stop() {
    seq++;
    if (synth) synth.cancel();
  }

  /* ---------- Micrófono ---------- */
  function listen({ onInterim } = {}) {
    return new Promise((resolve, reject) => {
      if (!SR) { reject('unsupported'); return; }
      stop();
      const r = new SR();
      r.lang = accent() === 'uk' ? 'en-GB' : 'en-US';
      r.interimResults = true;
      r.maxAlternatives = 4;
      r.continuous = false;
      let alts = null;
      let err = null;
      r.onresult = (e) => {
        let prefix = '';
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (i < e.results.length - 1) { prefix += res[0].transcript + ' '; continue; }
          if (res.isFinal) alts = Array.from(res).map((a) => (prefix + a.transcript).trim());
          else if (onInterim) onInterim((prefix + res[0].transcript).trim());
        }
      };
      r.onerror = (e) => { err = e.error || 'error'; };
      r.onend = () => {
        activeRec = null;
        clearTimeout(guard);
        if (alts && alts.length) resolve(alts);
        else if (err && err !== 'no-speech' && err !== 'aborted') reject(err);
        else resolve([]);
      };
      const guard = setTimeout(() => { try { r.stop(); } catch (e) { /* */ } }, 12000);
      activeRec = r;
      try { r.start(); } catch (e) { clearTimeout(guard); activeRec = null; reject('start-failed'); }
    });
  }
  function stopListening() { if (activeRec) { try { activeRec.stop(); } catch (e) { /* */ } } }

  return {
    ready, say, playLines, stop, englishVoices, mainVoice, altVoice, accent, hasBritish, hasOfflineEnglish,
    setItemAccent: (a) => { itemAccent = a || null; },
    listen, stopListening,
    get canSpeak() { return !!synth; },
    get canListen() { return !!SR && isOnline(); },   // el reconocimiento de voz necesita internet
  };
})();
