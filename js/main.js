'use strict';
/* Punto de entrada: rutas de la app y arranque. */

const App = {
  routes: { home: renderHome, library: renderLibrary, translate: renderTranslate, add: renderAdd, practice: renderPractice, settings: renderSettings },
  render() {
    let [route, sub] = (location.hash || '#home').slice(1).split('/');
    if (!App.routes[route]) route = 'home';
    const sidebar = $('#sidebar');
    if (!Store.state.onboarded) { sidebar.classList.add('hidden'); renderWelcome(); return; }
    sidebar.classList.remove('hidden');
    renderSidebar(route);
    App.routes[route](sub);
    $('#app').insertAdjacentHTML('afterbegin', offlineNotice());
    window.scrollTo(0, 0);
  },
};

/* Aviso cuando no hay internet: qué sigue funcionando y qué no */
function offlineNotice() {
  if (navigator.onLine !== false) return '';
  const voice = Speech.hasOfflineEnglish()
    ? 'La voz será la que trae tu computadora (suena más robótica).'
    : 'Esta computadora no tiene voz en inglés sin internet: puedes instalar una en Configuración de Windows → Hora e idioma → Voz.';
  return `<div class="offline-note">${icon('wifiOff')}<div><b>Estás sin internet.</b> Puedes seguir estudiando: en vez del micrófono, tú marcas cada repetición. ${voice} Traducir funciona si descargaste el traductor sin internet.</div></div>`;
}

function onConnectionChange() {
  if (Session.active) toast(navigator.onLine ? 'Volvió el internet' : 'Sin internet: ahora tú marcas cada repetición', 4000);
  else App.render();
}

/* Guarda la app en el navegador para poder abrirla sin internet */
if ('serviceWorker' in navigator && /^(https:|http:\/\/localhost)/.test(location.href)) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('No se pudo activar el modo sin internet', err));
}

registerCustom();
window.addEventListener('hashchange', () => { if (!Session.active) App.render(); });
window.addEventListener('online', onConnectionChange);
window.addEventListener('offline', onConnectionChange);
Speech.ready.then(() => { if (!navigator.onLine && !Session.active) App.render(); });
App.render();
