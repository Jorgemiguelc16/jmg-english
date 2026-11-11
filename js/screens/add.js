'use strict';
/* Agregar una frase propia a "Mis frases". */

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
