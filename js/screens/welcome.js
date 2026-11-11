'use strict';
/* Pantalla de bienvenida (solo la primera vez). */

function renderWelcome() {
  const total = MOVIES.length + WORDS.length + PHRASES.length;
  $('#app').innerHTML = `
    <section class="welcome card">
      <div class="card-body">
        <div class="brand-mark" style="width:44px;height:44px;font-size:1.3rem;border-radius:11px">J</div>
        <h1>Configura tu espacio</h1>
        <p class="lead">Aprende inglés como se aprende un guion: entendiendo cada palabra y repitiendo en voz alta hasta que la frase sale sola.</p>
        <div class="features">
          <div class="feature"><div class="icon-tile">${icon('messages')}</div><div><b>1 · Conversaciones completas</b><span>${SCENES.length} escenas reales de vida diaria, amigos, trabajo y universidad.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('mic')}</div><div><b>2 · Repite y actúa tu parte</b><span>Escuchas, repites línea por línea y luego dices tu parte de memoria. El micrófono te escucha.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('check')}</div><div><b>3 · Salta lo que ya sabes</b><span>Marca “Ya me la sé” y la app no te la vuelve a enseñar.</span></div></div>
          <div class="feature"><div class="icon-tile">${icon('brain')}</div><div><b>4 · Repasa justo antes de olvidarla</b><span>${total} frases: películas, series, palabras cotidianas y conversación. Y puedes agregar las tuyas.</span></div></div>
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
  $('#w-test').onclick = () => Speech.say('May the Force be with you.');
  $('#w-go').onclick = () => {
    Store.state.name = $('#w-name').value.trim();
    Store.state.onboarded = true;
    Store.save();
    location.hash = '#home';
    App.render();
  };
}
