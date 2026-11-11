'use strict';
/*
  TRADUCTOR
  - Con internet: Google Translate y, si falla, MyMemory. Son gratis y no piden clave.
    El texto que escribes se envía a ese servicio para poder traducirlo.
  - Sin internet: el traductor que traen Edge y Chrome en la computadora.
    Se descarga una sola vez y después traduce dentro del equipo.
*/
const TranslateService = (() => {
  const TIMEOUT_MS = 6000;
  const MAX_ALTERNATIVES = 2;
  const BuiltIn = self.Translator || null;   // API del navegador (no confundir con este módulo)
  const PAIRS = {
    toEnglish: { sourceLanguage: 'es', targetLanguage: 'en' },
    toSpanish: { sourceLanguage: 'en', targetLanguage: 'es' },
  };
  const localTranslators = {};

  const isOnline = () => navigator.onLine !== false;
  const comparable = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const isSameText = (a, b) => comparable(a) === comparable(b);

  /* ---------- Con internet ---------- */
  async function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const googleUrl = (text, from, to) =>
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&dt=at&q=${encodeURIComponent(text)}`;

  const googleText = (data) => (data[0] || []).map((segment) => segment[0] || '').join('');

  async function viaGoogle(text) {
    const data = await fetchJson(googleUrl(text, 'es', 'en'));
    const en = googleText(data).trim();
    if (!en) throw new Error('Respuesta vacía');
    // Google solo da alternativas fiables cuando el texto es una sola oración
    const options = data[5] && data[5].length === 1 ? data[5][0][2] || [] : [];
    return { en, alternatives: options.map((o) => o[0]) };
  }

  const decodeEntities = (s) => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;

  async function viaMyMemory(text) {
    const data = await fetchJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es%7Cen`);
    const en = decodeEntities((data.responseData && data.responseData.translatedText) || '').trim();
    if (Number(data.responseStatus) !== 200 || !en || data.quotaFinished) throw new Error('MyMemory no disponible');
    return { en, alternatives: [] };
  }

  /* ---------- Sin internet (traductor del navegador) ---------- */
  async function availability(pair) {
    if (!BuiltIn) return 'unavailable';
    try { return await BuiltIn.availability(PAIRS[pair]); } catch (err) { return 'unavailable'; }
  }

  /* 'available' (listo), 'downloadable' / 'downloading' (falta descargar) o 'unavailable' (no existe) */
  const offlineStatus = () => availability('toEnglish');

  function localTranslator(pair, onProgress) {
    if (!localTranslators[pair]) {
      localTranslators[pair] = BuiltIn.create({
        ...PAIRS[pair],
        monitor(m) { m.addEventListener('downloadprogress', (e) => onProgress && onProgress(e.loaded)); },
      }).catch((err) => { delete localTranslators[pair]; throw err; });
    }
    return localTranslators[pair];
  }

  /* Debe llamarse desde un clic: el navegador solo permite descargar si lo pide la persona. */
  async function downloadOffline(onProgress) {
    if (!BuiltIn) throw new Error('unsupported');
    const toEnglish = localTranslator('toEnglish', onProgress);
    const toSpanish = localTranslator('toSpanish').catch(() => null);   // para el desglose; es opcional
    await toEnglish;
    await toSpanish;
  }

  async function viaBrowser(text) {
    if ((await offlineStatus()) !== 'available') {
      const err = new Error('El traductor sin internet no está descargado');
      err.code = 'offline-missing';
      throw err;
    }
    const translator = await localTranslator('toEnglish');
    const en = (await translator.translate(text)).trim();
    if (!en) throw new Error('Respuesta vacía');
    return { en, alternatives: [], offline: true };
  }

  /* Devuelve { en, alternatives, offline } o lanza un error si no se pudo traducir. */
  async function toEnglish(text) {
    const providers = isOnline() ? [viaGoogle, viaMyMemory, viaBrowser] : [viaBrowser];
    let lastError = null;
    for (const provider of providers) {
      try {
        const { en, alternatives, offline = false } = await provider(text);
        const others = uniqueBy(alternatives.filter((a) => !isSameText(a, en)), comparable);
        return { en, alternatives: others.slice(0, MAX_ALTERNATIVES), offline };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  /* ---------- Significado de cada palabra (para el desglose) ---------- */
  function toMeanings(words, translated) {
    const meanings = {};
    words.forEach((word, i) => {
      const es = (translated[i] || '').trim().toLowerCase();
      if (es && !isSameText(es, word)) meanings[word.toLowerCase()] = es;
    });
    return meanings;
  }

  async function meaningsOnline(words) {
    const data = await fetchJson(googleUrl(words.join('\n'), 'en', 'es'));
    const lines = googleText(data).split('\n');
    if (lines.length !== words.length) throw new Error('No coincide el número de palabras');
    return toMeanings(words, lines);
  }

  async function meaningsOffline(words) {
    if ((await availability('toSpanish')) !== 'available') return {};
    const translator = await localTranslator('toSpanish');
    return toMeanings(words, await Promise.all(words.map((w) => translator.translate(w).catch(() => ''))));
  }

  /* Si falla devuelve {} y el desglose queda parcial. */
  async function wordMeanings(words) {
    if (!words.length) return {};
    if (isOnline()) {
      try { return await meaningsOnline(words); } catch (err) { /* se intenta sin internet */ }
    }
    try { return await meaningsOffline(words); } catch (err) { return {}; }
  }

  return { toEnglish, wordMeanings, isSameText, offlineStatus, downloadOffline };
})();
