'use strict';
/* Pantalla de Práctica. */

function renderPractice() {
  const due = totalDue();
  const learned = Store.learnedIds().length;
  const memory = [
    { id: 'due', icon: 'brain', title: 'Repaso de memoria', desc: due ? plural(due, 'frase pendiente', 'frases pendientes') : 'No hay repasos pendientes', disabled: !due, run: startRecallDue },
    { id: 'say', icon: 'mic', title: 'Repetir de memoria', desc: learned ? '10 frases memorizadas al azar, en voz alta' : 'Primero memoriza alguna frase', disabled: !learned, run: () => startRecallFree('speak') },
    { id: 'write', icon: 'pen', title: 'Escritura de memoria', desc: learned ? 'Escribe en inglés frases que ya memorizaste' : 'Primero memoriza alguna frase', disabled: !learned, run: () => startRecallFree('write') },
  ];
  const skills = [
    { id: 'listen', icon: 'headphones', title: 'Dictado', desc: 'Escucha y escribe lo que oyes' },
    { id: 'speak', icon: 'mic', title: 'Pronunciación', desc: 'El micrófono evalúa tu pronunciación' },
    { id: 'meaning', icon: 'ear', title: 'Comprensión auditiva', desc: 'Entiende frases solo escuchando' },
    { id: 'build', icon: 'grid', title: 'Ordenar frases', desc: 'Construye frases palabra por palabra' },
  ];
  const tile = (m, attr) => `<button class="card tile-card" ${attr} type="button" ${m.disabled ? 'disabled' : ''}><span class="icon-tile">${icon(m.icon)}</span><span><span class="t-title">${m.title}</span><span class="t-desc" style="display:block">${m.desc}</span></span></button>`;
  $('#app').innerHTML = `
    ${pageHead('Práctica', 'Refuerza lo que ya memorizaste y entrena habilidades específicas.')}
    <div class="section-head" style="margin-top:0"><div><h2>Memoria</h2><p>Lo más importante: decir y escribir de memoria lo que ya aprendiste.</p></div></div>
    <div class="tiles">${memory.map((m) => tile(m, `data-mem="${m.id}"`)).join('')}</div>

    <div class="section-head"><div><h2>Sesión mixta</h2><p>Ejercicios variados con las frases de conversación: dictado, comprensión, ordenar y pronunciar.</p></div></div>
    <div class="card"><div class="durations">${Object.entries(PLANS).map(([min, p]) => `
      <button class="duration" data-min="${min}" type="button"><span class="d-go">${icon('arrow', 'sm')}</span><span class="icon-tile">${icon(p.icon)}</span><span class="d-min">${min}<small> min</small></span><span class="d-name">${p.name}</span><span class="d-desc">${p.desc}</span></button>`).join('')}</div></div>

    <div class="section-head"><div><h2>Habilidades</h2><p>Rondas de 10 ejercicios de un solo tipo.</p></div></div>
    <div class="tiles">${skills.map((m) => tile(m, `data-mode="${m.id}"`)).join('')}</div>

    <div class="section-head"><div><h2>Diálogos</h2><p>Conversaciones con dos voces: escucha, responde y revisa la transcripción.</p></div></div>
    <div class="card rows">
      ${DIALOGUES.map((d) => {
        const r = Store.state.dialogs[d.id];
        const badge = r ? `<span class="badge ok">${icon('check', 'sm')} ${Math.round(r.best * 100)}%</span>` : '<span class="badge">Nuevo</span>';
        return `<button class="row-item clickable" data-dialog="${d.id}" type="button"><span class="icon-tile neutral">${icon(TOPIC_ICONS[d.topic] || 'messages')}</span><span class="grow"><span class="r-title" style="display:block">${esc(d.title)}</span><span class="r-desc">${esc(d.scene)}</span></span>${badge}${icon('arrow', 'sm')}</button>`;
      }).join('')}
    </div>`;
  const names = { listen: 'Dictado', speak: 'Pronunciación', meaning: 'Comprensión auditiva', build: 'Ordenar frases' };
  $$('[data-mem]').forEach((b) => { b.onclick = () => memory.find((m) => m.id === b.dataset.mem).run(); });
  $$('[data-min]').forEach((b) => { b.onclick = () => { const min = Number(b.dataset.min); Session.start(buildTimedSession(min), `Sesión mixta · ${min} min`); }; });
  $$('[data-mode]').forEach((b) => { b.onclick = () => Session.start(buildModeSession(b.dataset.mode), names[b.dataset.mode]); });
  $$('[data-dialog]').forEach((b) => { b.onclick = () => { const d = DIALOGUE_BY_ID[b.dataset.dialog]; Session.start([{ type: 'dialogue', dialog: d, key: 'dialogue:' + d.id }], 'Diálogo'); }; });
}
