'use strict';
/* Biblioteca: conversaciones y colecciones de frases. */

const libState = { tab: 'scenes', q: '', filter: '' };
function libTabs(current) {
  const tabs = [{ id: 'scenes', icon: 'messages', short: 'Conversaciones', n: SCENES.length }].concat(COLLECTIONS.map((c) => ({ id: c.id, icon: c.icon, short: c.short, n: c.items.length })));
  return `<div class="tabs" role="tablist">${tabs.map((c) => `<a class="tab${c.id === current ? ' on' : ''}" href="#library/${c.id}" role="tab">${icon(c.icon, 'sm')}<span>${c.short}</span><span class="count">${c.n}</span></a>`).join('')}</div>`;
}
function renderScenesLibrary() {
  $('#app').innerHTML = `
    ${pageHead('Biblioteca', 'Elige una conversación y apréndela como un actor: escuchar, repetir y actuar tu parte de memoria.')}
    ${libTabs('scenes')}
    <div class="card rows">
      <div class="toolbar lib">
        <div class="input-icon">${icon('search', 'sm')}<input class="input" id="lib-q" type="search" placeholder="Buscar conversación" value="${esc(libState.q)}"></div>
        <select class="select" id="lib-filter"><option value="">Todos los temas</option>${SCENE_GROUPS.map((g) => `<option value="${g.id}"${libState.filter === g.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
      </div>
      <div class="list-count" id="lib-count"></div>
      <div id="lib-list"></div>
    </div>`;
  const draw = () => {
    const q = libState.q.trim().toLowerCase();
    const rows = SCENES.filter((d) => (!libState.filter || d.group === libState.filter) && (!q || [d.title, d.context, ...d.lines.map((l) => l[1] + ' ' + l[2])].some((x) => x.toLowerCase().includes(q))));
    $('#lib-count').textContent = `${rows.length} de ${SCENES.length} · ${Store.learnedSceneIds().length} aprendidas`;
    $('#lib-list').innerHTML = rows.map((d) => {
      const [lbl, cls] = statusInfo(d);
      const g = SCENE_GROUP_BY_ID[d.group];
      return `<div class="row-item">
        <span class="icon-tile neutral">${icon(g.icon)}</span>
        <div class="grow"><div class="p-en">${esc(d.title)}</div><div class="p-es">${esc(d.context)} · ${d.lines.length} líneas</div></div>
        <span class="badge ${cls}">${lbl}</span>
        ${Store.state.cards[d.id] ? '' : `<button class="btn ghost sm" data-known="${d.id}" type="button">Ya me la sé</button>`}
        <button class="btn secondary sm" data-scene="${d.id}" type="button">${Store.state.cards[d.id] ? 'Practicar' : 'Aprender'}</button>
      </div>`;
    }).join('') || `<div class="empty">${icon('messages', 'xl')}<b>No hay conversaciones que coincidan</b></div>`;
    $$('#lib-list [data-scene]').forEach((b) => { b.onclick = () => startScene(SCENE_BY_ID[b.dataset.scene]); });
    $$('#lib-list [data-known]').forEach((b) => { b.onclick = () => { Store.markKnown(b.dataset.known); toast('Marcada como conocida'); draw(); }; });
  };
  $('#lib-q').addEventListener('input', (e) => { libState.q = e.target.value; draw(); });
  $('#lib-filter').addEventListener('input', (e) => { libState.filter = e.target.value; draw(); });
  draw();
}
function renderLibrary(sub) {
  if (sub && (COLLECTION_BY_ID[sub] || sub === 'scenes')) { if (libState.tab !== sub) { libState.filter = ''; libState.q = ''; } libState.tab = sub; }
  if (libState.tab === 'scenes') return renderScenesLibrary();
  const col = COLLECTION_BY_ID[libState.tab];
  let filterHtml = '';
  if (col.id === 'conv') filterHtml = `<select class="select" id="lib-filter"><option value="">Todos los temas</option>${TOPICS.map((t) => `<option value="${t.id}"${libState.filter === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
  else if (col.id === 'words') filterHtml = `<select class="select" id="lib-filter"><option value="">Todas las categorías</option>${uniqueBy(WORDS, (w) => w.cat).map((w) => `<option${libState.filter === w.cat ? ' selected' : ''}>${esc(w.cat)}</option>`).join('')}</select>`;
  else if (col.id === 'mine') filterHtml = `<a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar frase</a>`;
  else filterHtml = '<span></span>';

  $('#app').innerHTML = `
    ${pageHead('Biblioteca', 'Elige cualquier frase y memorízala con el método de repetición.')}
    ${libTabs(col.id)}
    <div class="card rows">
      <div class="toolbar lib">
        <div class="input-icon">${icon('search', 'sm')}<input class="input" id="lib-q" type="search" placeholder="Buscar en inglés o español" value="${esc(libState.q)}"></div>
        ${filterHtml}
      </div>
      <div class="list-count" id="lib-count"></div>
      <div id="lib-list"></div>
    </div>`;

  const draw = () => {
    const q = libState.q.trim().toLowerCase();
    const rows = col.items.filter((p) => {
      if (libState.filter && (col.id === 'conv' ? p.topic !== libState.filter : col.id === 'words' ? p.cat !== libState.filter : false)) return false;
      if (!q) return true;
      return [p.en, p.es, p.src, p.word, p.wordEs].some((x) => x && x.toLowerCase().includes(q));
    });
    $('#lib-count').textContent = `${rows.length} de ${col.items.length} · ${learnedIn(col)} memorizadas`;
    $('#lib-list').innerHTML = rows.length ? rows.map((p) => {
      const [lbl, cls] = statusInfo(p);
      const main = p.word
        ? `<div class="p-en">${esc(p.word)} <span class="muted" style="font-weight:500">· ${esc(p.wordEs)}</span></div><div class="p-es">${esc(p.en)} — ${esc(p.es)}</div>`
        : `<div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}${p.src ? ` · <i>${esc(p.src)}</i>` : ''}</div>`;
      return `<div class="row-item">
        <button class="play-btn" data-say="${esc(p.word || p.en)}" ${p.col === 'british' ? 'data-br="1"' : ''} type="button" title="Escuchar">${icon('volume')}</button>
        <div class="grow">${main}</div>
        <span class="badge ${cls}">${lbl}</span>
        ${Store.state.cards[p.id] ? '' : `<button class="btn ghost sm" data-known="${p.id}" type="button">Ya me la sé</button>`}
        <button class="btn secondary sm" data-memo="${p.id}" type="button">${Store.state.cards[p.id] ? 'Repetir' : 'Memorizar'}</button>
        ${col.id === 'mine' ? `<button class="icon-btn" data-del="${p.id}" type="button" title="Eliminar">${icon('trash', 'sm')}</button>` : ''}
      </div>`;
    }).join('') : `<div class="empty">${icon(col.icon, 'xl')}<b>${col.id === 'mine' && !col.items.length ? 'Todavía no agregaste frases' : 'No hay frases que coincidan'}</b>${col.id === 'mine' && !col.items.length ? `<span>Agrega frases de tus películas, series o canciones favoritas.</span><a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar frase</a>` : ''}</div>`;
    $$('#lib-list [data-say]').forEach((b) => { b.onclick = () => Speech.say(b.dataset.say, b.dataset.br ? { accent: 'uk' } : {}); });
    $$('#lib-list [data-memo]').forEach((b) => { b.onclick = () => startMemorize(PHRASE_BY_ID[b.dataset.memo]); });
    $$('#lib-list [data-known]').forEach((b) => { b.onclick = () => { Store.markKnown(b.dataset.known); toast('Marcada como conocida'); draw(); }; });
    $$('#lib-list [data-del]').forEach((b) => {
      b.onclick = () => {
        const p = PHRASE_BY_ID[b.dataset.del];
        if (!confirm(`¿Eliminar “${p.en}” de tus frases?`)) return;
        Store.removeCustom(p.id);
        delete PHRASE_BY_ID[p.id];
        registerCustom();
        renderLibrary();
        toast('Frase eliminada');
      };
    });
  };
  $('#lib-q').addEventListener('input', (e) => { libState.q = e.target.value; draw(); });
  const f = $('#lib-filter');
  if (f && f.tagName === 'SELECT') f.addEventListener('input', (e) => { libState.filter = e.target.value; draw(); });
  draw();
}
