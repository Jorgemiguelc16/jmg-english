'use strict';
/*
  Speech: voz en inglés (lo que escuchas) y reconocimiento de voz (lo que dices).
  Funciona mejor en Microsoft Edge (voces "Natural" muy realistas) o Google Chrome.
*/
const Speech = (() => {
  const synth = window.speechSynthesis || null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voices = [];
  let seq = 0;          // para cortar reproducciones en curso
  let current = null;   // evita que Chrome "pierda" el audio
  let activeRec = null;

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

  function voiceScore(v) {
    let s = 0;
    if (/natural/i.test(v.name)) s += 20;
    if (/online/i.test(v.name)) s += 4;
    if (/google/i.test(v.name)) s += 6;
    if (/en[-_]US/i.test(v.lang)) s += 8;
    else if (/en[-_](GB|CA|AU)/i.test(v.lang)) s += 4;
    return s;
  }
  function englishVoices() {
    return voices.filter((v) => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
  }
  function mainVoice() {
    const list = englishVoices();
    const name = Store.state.settings.voice;
    return list.find((v) => v.name === name) || list[0] || null;
  }
  function altVoice() {
    const main = mainVoice();
    const list = englishVoices().filter((v) => v !== main);
    if (!list.length) return null;
    const sameRegion = list.filter((v) => main && v.lang === main.lang);
    return (sameRegion[0] || list[0]);
  }

  function say(text, opts = {}) {
    if (!opts.keepSeq) seq++;
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      const start = () => {
        const u = new SpeechSynthesisUtterance(text);
        const v = opts.voice || mainVoice();
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
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
      r.lang = 'en-US';
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
    ready, say, playLines, stop, englishVoices, mainVoice, altVoice,
    listen, stopListening,
    get canSpeak() { return !!synth; },
    get canListen() { return !!SR; },
  };
})();
