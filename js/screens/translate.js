'use strict';
/* Traducir: escribes una frase en español y ves cómo se dice en inglés. */

// Se conserva al volver de una sesión de memorizar
const translation = { input: '', result: null, error: '', loading: false, request: 0, downloading: null };

const findSavedPhrase = (en) => Store.state.custom.find((c) => TranslateService.isSameText(c.en, en));
const translationWords = (en) => chunksFor({ en }).map((c) => c.en);

function glossaryChunks(en) {
  return translationWords(en).map((word) => [word, gloss(word)]);
}

/* Completa las palabras que el glosario de la app no conoce. */
async function fillWordMeanings(result) {
  const en = result.en;
  const words = translationWords(en);
  const unknown = uniqueBy(words.filter((w) => !gloss(w)), (w) => w.toLowerCase());
  const meanings = await TranslateService.wordMeanings(unknown);
  if (result.en !== en) return;   // mientras tanto eligió otra forma de decirlo
  result.chunks = words.map((w) => [w, gloss(w) || meanings[w.toLowerCase()] || (/^[A-Z]/.test(w) ? '(nombre)' : '')]);
  const saved = findSavedPhrase(en);
  if (saved) { saved.chunks = result.chunks; Store.save(); registerCustom(); }
  drawTranslation();
}

async function runTranslation() {
  const text = translation.input.trim().replace(/\s+/g, ' ');
  if (!/\p{L}/u.test(text)) {
    translation.error = 'Escribe una frase en español.';
    drawTranslation();
    return;
  }
  const request = ++translation.request;
  Object.assign(translation, { loading: true, error: '', result: null });
  drawTranslation();
  try {
    const { en, alternatives, offline } = await TranslateService.toEnglish(text);
    if (request !== translation.request) return;
    const result = { es: text, en, alternatives, offline, chunks: glossaryChunks(en) };
    Object.assign(translation, { loading: false, result });
    drawTranslation();
    if (Store.state.settings.autoplay) Speech.say(en);
    fillWordMeanings(result);
  } catch (err) {
    if (request !== translation.request) return;
    const error = !navigator.onLine
      ? (err && err.code === 'offline-missing'
        ? 'Estás sin internet y el traductor sin internet no está descargado. Descárgalo abajo la próxima vez que tengas conexión.'
        : 'Estás sin internet y este navegador no puede traducir sin conexión.')
      : 'No pude traducir tu frase. Revisa tu conexión a internet e inténtalo otra vez.';
    Object.assign(translation, { loading: false, error });
    drawTranslation();
  }
}

function useAlternative(index) {
  const r = translation.result;
  [r.en, r.alternatives[index]] = [r.alternatives[index], r.en];
  r.chunks = glossaryChunks(r.en);
  drawTranslation();
  Speech.say(r.en);
  fillWordMeanings(r);
}

function saveTranslation(thenMemorize) {
  const r = translation.result;
  const item = findSavedPhrase(r.en) || Store.addCustom({ en: r.en, es: r.es, src: 'Traductor', chunks: r.chunks });
  registerCustom();
  if (thenMemorize) { startMemorize(PHRASE_BY_ID[item.id]); return; }
  toast('Frase guardada en “Mis frases”');
  drawTranslation();
}

function translationCard(r) {
  const saved = findSavedPhrase(r.en);
  const phrase = { en: r.en, chunks: r.chunks };
  const alternatives = r.alternatives.length ? `
    <div class="tr-alts">
      <div class="section-label">Otra forma de decirlo</div>
      ${r.alternatives.map((alt, i) => `
        <div class="tr-alt">
          <button class="play-btn" data-alt-say="${i}" type="button" title="Escuchar">${icon('volume')}</button>
          <span class="grow">${esc(alt)}</span>
          <button class="btn ghost sm" data-alt-use="${i}" type="button">Usar esta</button>
        </div>`).join('')}
    </div>` : '';
  return `
    <section class="card form-card tr-result">
      <div class="card-body">
        <p class="eyebrow">Así se dice en inglés</p>
        <p class="tr-en">${esc(r.en)}</p>
        <p class="tr-es">${esc(r.es)}</p>
        <div class="row-btns">
          <button class="btn secondary" id="tr-play" type="button">${icon('volume', 'sm')} Escuchar</button>
          <button class="btn secondary" id="tr-slow" type="button">${icon('gauge', 'sm')} Lento</button>
        </div>
        ${TranslateService.isSameText(r.en, r.es) ? '<p class="tr-note">La traducción salió igual que tu frase. Revisa si está bien escrita en español.</p>' : ''}
        ${alternatives}
        <div class="section-label">Palabra por palabra · toca cada bloque para escucharlo</div>
        ${breakdownHtml(phrase)}
        <p class="help">${r.offline ? 'Traducido sin internet, dentro de tu computadora. ' : ''}Es una traducción automática. Casi siempre es correcta, pero revisa las frases con modismos.</p>
        <div class="row-btns tr-save">
          <button class="btn secondary" id="tr-save" type="button" ${saved ? 'disabled' : ''}>${icon(saved ? 'check' : 'bookmark', 'sm')} ${saved ? 'Guardada' : 'Guardar'}</button>
          <button class="btn primary" id="tr-memo" type="button">${icon('mic', 'sm')} ${saved ? 'Memorizar' : 'Guardar y memorizar'}</button>
        </div>
      </div>
    </section>`;
}

function drawTranslation() {
  const box = $('#tr-result');
  if (!box) return;   // ya salió de esta pantalla
  const { result, error, loading } = translation;
  $('#tr-err').textContent = error;
  const go = $('#tr-go');
  go.disabled = loading;
  go.innerHTML = loading ? 'Traduciendo…' : `${icon('languages', 'sm')} Traducir`;
  box.innerHTML = result ? translationCard(result) : '';
  if (!result) return;

  const phrase = { en: result.en, chunks: result.chunks };
  wireChunks(box, phrase);
  $('#tr-play').onclick = () => Speech.say(result.en);
  $('#tr-slow').onclick = () => Speech.say(result.en, { slow: true });
  $('#tr-save').onclick = () => saveTranslation(false);
  $('#tr-memo').onclick = () => saveTranslation(true);
  $$('[data-alt-say]', box).forEach((b) => { b.onclick = () => Speech.say(result.alternatives[Number(b.dataset.altSay)]); });
  $$('[data-alt-use]', box).forEach((b) => { b.onclick = () => useAlternative(Number(b.dataset.altUse)); });
}

/* Estado del traductor sin internet (se descarga una sola vez) */
async function drawOfflineStatus() {
  const box = $('#tr-offline');
  if (!box) return;
  const status = translation.downloading !== null ? 'downloading-now' : await TranslateService.offlineStatus();
  if (!$('#tr-offline')) return;
  const row = (iconName, title, text, button = '') =>
    `<div class="tr-off-row"><span class="icon-tile">${icon(iconName)}</span><div class="grow"><b>${title}</b><p class="muted small">${text}</p></div>${button}</div>`;
  if (status === 'available') {
    box.innerHTML = row('check', 'Traductor sin internet listo', 'Si no tienes conexión, Traducir funciona igual dentro de tu computadora.');
  } else if (status === 'downloading-now') {
    box.innerHTML = row('download', 'Descargando el traductor sin internet…', `${Math.round(translation.downloading * 100)}%. No cierres esta pestaña.`);
  } else if (status === 'unavailable') {
    box.innerHTML = row('wifiOff', 'Sin traductor sin internet', 'Este navegador no puede traducir sin conexión. En la computadora, Edge y Chrome sí pueden.');
  } else {
    const online = navigator.onLine;
    box.innerHTML = row('download', 'Usa Traducir sin internet',
      online ? 'Descarga el traductor una sola vez y luego funcionará aunque no tengas conexión.' : 'Conéctate a internet para descargarlo. Solo se hace una vez.',
      `<button class="btn secondary" id="tr-download" type="button" ${online ? '' : 'disabled'}>${icon('download', 'sm')} Descargar</button>`);
    $('#tr-download').onclick = downloadOfflineTranslator;
  }
}

function downloadOfflineTranslator() {
  translation.downloading = 0;
  const job = TranslateService.downloadOffline((loaded) => { translation.downloading = loaded; drawOfflineStatus(); });
  drawOfflineStatus();
  job.then(() => { translation.downloading = null; toast('Listo: ya puedes traducir sin internet'); drawOfflineStatus(); })
    .catch(() => { translation.downloading = null; toast('No se pudo descargar el traductor. Inténtalo otra vez con internet.', 4500); drawOfflineStatus(); });
}

function renderTranslate() {
  $('#app').innerHTML = `
    ${pageHead('Traducir', 'Escribe lo que quieres decir en español y descubre cómo se dice en inglés.')}
    <section class="card form-card">
      <div class="card-body">
        <label class="field-label" for="tr-input">Tu frase en español</label>
        <textarea class="input textarea" id="tr-input" rows="3" maxlength="300" placeholder="Ej.: Se me hizo tarde y perdí el bus.">${esc(translation.input)}</textarea>
        <p class="help">Con internet, tu frase se envía a un servicio de traducción, así que evita escribir datos privados. Sin internet se traduce dentro de tu computadora.</p>
        <div class="form-error" id="tr-err"></div>
        <div class="row-btns" style="justify-content:flex-end">
          <button class="btn primary" id="tr-go" type="button"></button>
        </div>
      </div>
    </section>
    <div id="tr-result"></div>
    <div class="card form-card tr-offline" id="tr-offline"></div>`;

  const input = $('#tr-input');
  input.oninput = () => { translation.input = input.value; };
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); runTranslation(); }
  };
  $('#tr-go').onclick = runTranslation;
  drawTranslation();
  drawOfflineStatus();
  if (!translation.result) input.focus();
}
