'use strict';
/* Pantalla de Ajustes: perfil, audio y respaldo. */

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
      <div class="set-row"><div><div class="s-label">Acento</div><div class="s-help" id="s-accent-help">Cambia las voces y lo que entiende el micrófono.</div></div>${accentSwitch(false)}</div>
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
  wireAccent(renderSettings);
  Speech.ready.then(() => {
    const h = $('#s-accent-help');
    if (h && (st.accent || 'us') === 'uk' && !Speech.hasBritish()) h.textContent = 'Este navegador no tiene voces británicas. Prueba en Edge o Chrome.';
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
    if (!Speech.canListen) {
      out.innerHTML = `<p class="muted small">${navigator.onLine ? 'Este navegador no admite reconocimiento de voz. Usa Microsoft Edge o Google Chrome.' : 'El micrófono necesita internet. Conéctate para probarlo.'}</p>`;
      return;
    }
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
