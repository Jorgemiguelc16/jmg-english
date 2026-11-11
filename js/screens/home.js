'use strict';
/* Pantalla de Inicio. */

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function streakMessage(sv) {
  switch (sv.status) {
    case 'done': return 'Objetivo de hoy cumplido. Todo lo que hagas ahora suma extra.';
    case 'pending': return `Practica una conversación hoy para mantener tu racha de ${plural(sv.count, 'día', 'días')}.`;
    case 'frozen': return `No practicaste ${plural(sv.missed, 'día', 'días')}. Si practicas hoy, un protector salvará tu racha.`;
    case 'lost': return sv.prev > 1 ? `Tu racha de ${sv.prev} días se reinició. Hoy es un buen día para empezar otra.` : 'Aprende una conversación hoy para iniciar tu racha.';
    default: return 'Aprende tu primera conversación para iniciar tu racha.';
  }
}

let homeSkip = [];
let sceneSkip = [];
function renderHome() {
  const st = Store.state;
  const sv = Store.streakView();
  const td = Store.todayRec();
  const due = totalDue();
  const scenesLearned = Store.learnedSceneIds().length;
  const memorized = Store.learnedIds().length;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

  // Conversación siguiente
  const grp = SCENE_GROUP_BY_ID[st.sceneGroup] ? st.sceneGroup : '';
  let scene = nextScene(grp, sceneSkip);
  if (!scene && sceneSkip.length) { sceneSkip = []; scene = nextScene(grp); }
  const sceneBody = scene ? (() => {
    const ls = sceneLines(scene).slice(0, 3);
    return `
      <div class="next-phrase">
        <div class="memo-source">${sceneGroupBadge(scene)}</div>
        <div class="np-title">${esc(scene.title)}</div>
        <p class="muted small" style="margin-bottom:12px">${esc(scene.context)} · ${scene.lines.length} líneas</p>
        <div class="scene-chat preview show-es">${ls.map((l, i) => bubbleHtml(scene, l, i)).join('')}<div class="preview-more">…</div></div>
        <div class="row-btns" style="margin-top:16px">
          <button class="btn primary lg" id="go-scene" type="button">${icon('play')} Aprender esta conversación</button>
          <button class="btn secondary lg" id="sc-known" type="button">${icon('check')} Ya me la sé</button>
          <button class="btn ghost lg" id="sc-skip" type="button">${icon('shuffle')} Otra</button>
        </div>
      </div>`;
  })() : `<div class="empty">${icon('award', 'xl')}<b>¡Aprendiste todas las conversaciones${grp ? ' de este tema' : ''}!</b><span>Sigue repasándolas de memoria para que no se te olviden.</span></div>`;

  // Frase suelta siguiente
  const colId = COLLECTION_BY_ID[st.memoCol] ? st.memoCol : 'movies';
  let next = nextToMemorize(colId, homeSkip);
  if (!next && homeSkip.length) { homeSkip = []; next = nextToMemorize(colId); }
  const col = COLLECTION_BY_ID[colId];
  let memoBody;
  if (next) {
    memoBody = `
      <div class="next-phrase">
        <div class="memo-source">${sourceBadge(next)}</div>
        ${next.word ? `<div class="np-word">${esc(next.word)}<span>${esc(next.wordEs)}</span></div>` : ''}
        <div class="np-en">${esc(next.en)}</div>
        <div class="np-es">${esc(next.es)}</div>
        <div class="row-btns">
          <button class="btn primary" id="go-memo" type="button">${icon('mic', 'sm')} Memorizar</button>
          <button class="btn secondary" id="np-play" type="button">${icon('volume', 'sm')} Escuchar</button>
          <button class="btn secondary" id="np-known" type="button">${icon('check', 'sm')} Ya me la sé</button>
          <button class="btn ghost" id="np-skip" type="button">${icon('shuffle', 'sm')} Otra</button>
        </div>
      </div>`;
  } else if (colId === 'mine') {
    memoBody = `<div class="empty">${icon('bookmark', 'xl')}<b>Aún no tienes frases propias</b><span>Cuando escuches una frase que te guste en una película o serie, guárdala aquí.</span><a class="btn primary" href="#add">${icon('plus', 'sm')} Agregar mi primera frase</a></div>`;
  } else {
    memoBody = `<div class="empty">${icon('award', 'xl')}<b>¡Terminaste la colección “${esc(col.name)}”!</b><span>Elige otra colección.</span></div>`;
  }

  const t = Store.today();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = Store.addDays(t, -i);
    const [y, m, d] = key.split('-').map(Number);
    const rec = st.days[key];
    const lvl = !Store.dayCounted(key) ? (rec && rec.ex ? 1 : 0) : (rec.reps || 0) >= 25 || rec.sec >= 1500 ? 3 : 2;
    days.push({ letter: DAY_LETTERS[new Date(y, m - 1, d).getDay()], lvl, isToday: i === 0, title: `${d}/${m} · ${rec ? `${rec.reps || 0} repeticiones · ${fmtMinutes(rec.sec)} min` : 'sin práctica'}` });
  }

  $('#app').innerHTML = `
    ${pageHead(`${hello}${st.name ? ', ' + esc(st.name) : ''}`, esc(streakMessage(sv)), todayLong(), accentSwitch())}

    <section class="kpis">
      <div class="card kpi${sv.status === 'done' ? ' lit' : ''}">
        <div class="kpi-top"><span>Racha</span>${icon('flame')}</div>
        <div class="kpi-value">${sv.count}<small>${sv.count === 1 ? 'día' : 'días'}</small></div>
        <div class="kpi-sub">Récord ${st.streak.best} · ${plural(sv.freezes, 'protector', 'protectores')}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Conversaciones</span>${icon('messages')}</div>
        <div class="kpi-value">${scenesLearned}<small>de ${SCENES.length}</small></div>
        <div class="kpi-sub">${plural(memorized, 'frase suelta', 'frases sueltas')}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Repeticiones hoy</span>${icon('mic')}</div>
        <div class="kpi-value">${td.reps || 0}<small>en voz alta</small></div>
        <div class="kpi-sub">${st.totalReps || 0} en total</div>
      </div>
      <div class="card kpi">
        <div class="kpi-top"><span>Por repasar</span>${icon('repeat')}</div>
        <div class="kpi-value">${due}</div>
        <div class="kpi-sub">${due ? 'Conversaciones y frases' : 'Estás al día'}</div>
      </div>
    </section>

    <section class="card step-card">
      <span class="step-num">1</span>
      <div class="grow"><h2>Repaso de memoria</h2><p class="muted">Actúa de memoria las conversaciones y frases que ya aprendiste, justo antes de que se te olviden.</p></div>
      <button class="btn ${due ? 'primary' : 'secondary'} lg" id="go-recall" type="button" ${due ? '' : 'disabled'}>${due ? `Repasar ${due}` : 'Al día'} ${due ? icon('arrow', 'sm') : icon('check', 'sm')}</button>
    </section>

    <section class="card memo-card">
      <div class="memo-head">
        <span class="step-num">2</span>
        <div class="grow"><h2>Aprende una conversación</h2><p class="muted">Escúchala, repítela línea por línea y luego actúa tu parte de memoria, como un actor.</p></div>
      </div>
      <div class="col-chips">
        <button class="chip-btn${!grp ? ' on' : ''}" data-grp="" type="button">${icon('messages', 'sm')}<span>Todas</span><span class="count">${scenesLearned}/${SCENES.length}</span></button>
        ${SCENE_GROUPS.map((g) => { const n = SCENES.filter((d) => d.group === g.id); return `<button class="chip-btn${g.id === grp ? ' on' : ''}" data-grp="${g.id}" type="button">${icon(g.icon, 'sm')}<span>${g.short}</span><span class="count">${n.filter((d) => st.cards[d.id]).length}/${n.length}</span></button>`; }).join('')}
      </div>
      ${sceneBody}
    </section>

    <section class="card memo-card secondary">
      <div class="memo-head">
        <span class="step-num">3</span>
        <div class="grow"><h2>Frases sueltas <span class="opt">Opcional</span></h2><p class="muted">Películas, palabras cotidianas y tus propias frases.</p></div>
      </div>
      <div class="col-chips">${COLLECTIONS.map((c) => `<button class="chip-btn${c.id === colId ? ' on' : ''}" data-col="${c.id}" type="button">${icon(c.icon, 'sm')}<span>${c.short}</span><span class="count">${learnedIn(c)}/${c.items.length}</span></button>`).join('')}</div>
      ${memoBody}
    </section>

    <section class="card add-cta">
      <span class="icon-tile">${icon('film')}</span>
      <div class="grow"><b>¿Escuchaste una frase que te gustó?</b><p class="muted small">Guárdala en “Mis frases” y memorízala.</p></div>
      <a class="btn secondary" href="#add">${icon('plus', 'sm')} Agregar frase</a>
    </section>

    <section class="grid-3">
      <div class="card">
        <div class="card-head"><div><h2>Actividad</h2><p>Últimos 14 días</p></div></div>
        <div class="card-body">
          <div class="activity">${days.map((d) => `<div class="act-cell${d.isToday ? ' today' : ''}" title="${d.title}"><div class="act-box l${d.lvl}"></div><span class="act-lbl">${d.letter}</span></div>`).join('')}</div>
          <div class="legend">Menos <span class="act-box"></span><span class="act-box l1"></span><span class="act-box l2"></span><span class="act-box l3"></span> Más</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Progreso</h2><p>Lo que ya tienes en la memoria</p></div></div>
        <div class="card-body stat-list">
          ${SCENE_GROUPS.map((g) => { const all = SCENES.filter((d) => d.group === g.id); const n = all.filter((d) => st.cards[d.id]).length; return `<a class="col-progress" href="#library/scenes"><div class="stat-row"><span>${icon(g.icon, 'sm')} ${g.name}</span><b>${n} / ${all.length}</b></div><div class="bar"><div style="width:${(n / all.length) * 100}%"></div></div></a>`; }).join('')}
          ${COLLECTIONS.filter((c) => c.items.length).map((c) => { const n = learnedIn(c); return `<a class="col-progress" href="#library/${c.id}"><div class="stat-row"><span>${icon(c.icon, 'sm')} ${c.name}</span><b>${n} / ${c.items.length}</b></div><div class="bar"><div style="width:${(n / c.items.length) * 100}%"></div></div></a>`; }).join('')}
        </div>
      </div>
    </section>

    <section class="card note">${icon('bulb')}<div><b>Consejo del día</b><p>${esc(tip)}</p></div></section>`;

  wireAccent(renderHome);
  $('#go-recall').onclick = startRecallDue;
  $$('[data-grp]').forEach((b) => { b.onclick = () => { st.sceneGroup = b.dataset.grp; Store.save(); sceneSkip = []; renderHome(); }; });
  $$('[data-col]').forEach((b) => { b.onclick = () => { st.memoCol = b.dataset.col; Store.save(); homeSkip = []; renderHome(); }; });
  if (scene) {
    wireScenePreview(scene);
    $('#go-scene').onclick = () => startScene(scene);
    $('#sc-known').onclick = () => { Store.markKnown(scene.id); toast('Conversación marcada como conocida'); renderHome(); };
    $('#sc-skip').onclick = () => { sceneSkip.push(scene.id); renderHome(); };
  }
  if (next) {
    $('#go-memo').onclick = () => startMemorize(next);
    $('#np-play').onclick = () => Speech.say(next.en, sayOpts(next));
    $('#np-known').onclick = () => { Store.markKnown(next.id); toast('Marcada como conocida'); renderHome(); };
    $('#np-skip').onclick = () => { homeSkip.push(next.id); renderHome(); };
  }
}
function wireScenePreview(scene) {
  const ls = sceneLines(scene);
  const V = sceneVoices(scene);
  $$('.preview [data-play]').forEach((b) => { b.onclick = () => { const l = ls[Number(b.dataset.play)]; Speech.say(l.en, V[l.sp]); }; });
}
