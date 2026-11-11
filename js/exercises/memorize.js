'use strict';
/*
  MÉTODO DE MEMORIZACIÓN POR REPETICIÓN
  1. Entender   -> desglose palabra por palabra + cómo suena
  2. Repetir    -> 4 veces en voz alta viendo el texto (después del modelo)
  3. Con pistas -> 3 veces viendo solo la primera letra de cada palabra
  4. De memoria -> 3 veces viendo solo el español
  5. Escribir   -> escribirla de memoria
  Después entra al "Repaso de memoria" (repaso espaciado): ves el español y la dices sin ayuda.
*/

// Las pistas "así suena" de las frases normales son de acento americano
function soundFor(p) { return p.col === 'british' || Speech.accent() !== 'uk' ? (p.sound || '') : ''; }

function sourceBadge(p) {
  if (p.col === 'british') return `<span class="badge accent">${icon('globe', 'sm')} Inglés británico</span>`;
  if (p.col === 'movies') return `<span class="badge accent">${icon('film', 'sm')} ${esc(p.kind || 'Película')} · ${esc(p.src)}</span>`;
  if (p.col === 'words') return `<span class="badge accent">${icon('type', 'sm')} Palabra · ${esc(p.word)}</span>`;
  if (p.col === 'mine') return `<span class="badge accent">${icon('bookmark', 'sm')} Mis frases${p.src ? ' · ' + esc(p.src) : ''}</span>`;
  return `<span class="badge">${icon('messages', 'sm')} ${esc(topicName(p))}</span>`;
}

function gloss(w) {
  const k = w.toLowerCase().replace(/[’‘]/g, "'");
  return GLOSSARY[k] || GLOSSARY[k.replace(/'s$/, '')] || '';
}

function chunksFor(p) {
  if (p.chunks && p.chunks.length) return p.chunks.map(([en, es]) => ({ en, es }));
  return p.en.split(/\s+/)
    .map((w) => w.replace(/^[¿¡"(]+/, '').replace(/[.,!?…")]+$/, ''))
    .filter(Boolean)
    .map((w) => ({ en: w, es: gloss(w) || (/^[A-Z]/.test(w) ? '(nombre)' : '') }));
}

function breakdownHtml(p) {
  const focus = p.word ? p.word.toLowerCase() : null;
  return `<div class="breakdown">${chunksFor(p).map((c, i) => `
    <button class="chunk${focus && c.en.toLowerCase().replace(/[.,!?]/g, '') === focus ? ' focus' : ''}" data-chunk="${i}" type="button">
      <span class="c-en">${esc(c.en)}</span><span class="c-es">${esc(c.es || '·')}</span>
    </button>`).join('')}</div>`;
}
function wireChunks(root, p) {
  const cs = chunksFor(p);
  $$('[data-chunk]', root).forEach((b) => {
    b.onclick = () => {
      $$('[data-chunk]', root).forEach((x) => x.classList.remove('playing'));
      b.classList.add('playing');
      Speech.say(cs[Number(b.dataset.chunk)].en, { slow: true }).then(() => b.classList.remove('playing'));
    };
  });
}

// "May the Force be with you." -> "M__ t__ F____ b_ w___ y__."
function maskText(en) {
  return en.split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok) || !/[A-Za-z]/.test(tok)) return esc(tok);
    let seen = false;
    const masked = tok.replace(/[A-Za-z0-9]/g, (ch) => { if (seen) return '_'; seen = true; return ch; });
    return `<span class="mask">${esc(masked)}</span>`;
  }).join('');
}

// Para memorizar se exige más precisión en frases cortas (una palabra mal = no cuenta)
function passMark(en) { return Text.words(en).length <= 5 ? 0.9 : 0.8; }

async function listenScore(target, onInterim) {
  const alts = await Speech.listen({ onInterim });
  if (!alts.length) return null;
  let best = null;
  alts.forEach((a) => { const c = Text.compare(target, a, { mode: 'speak' }); if (!best || c.score > best.score) best = { ...c, heard: a }; });
  return best;
}

const MIC_ERRORS = {
  'not-allowed': 'El micrófono está bloqueado. Habilítalo desde el ícono de candado en la barra de direcciones.',
  'service-not-allowed': 'El micrófono está bloqueado. Habilítalo desde el ícono de candado en la barra de direcciones.',
  network: 'El micrófono necesita internet.',
  'audio-capture': 'No se encontró un micrófono conectado.',
};
// Errores que obligan a seguir en modo manual (sin micrófono)
const isBlocked = (err) => ['not-allowed', 'service-not-allowed', 'audio-capture', 'unsupported', 'network'].includes(err);

/* ===================== Memorizar (método completo) ===================== */
Ex.memorize = {
  render(item, ctx) {
    const p = item.phrase;
    const STAGES = [
      { name: 'Entender' },
      { name: 'Repetir', reps: 4, show: 'full', model: true, help: 'Escucha el modelo y repítelo igual. Copia el ritmo y la entonación.' },
      { name: 'Con pistas', reps: 3, show: 'hint', model: true, help: 'Ahora solo ves la primera letra de cada palabra.' },
      { name: 'De memoria', reps: 3, show: 'none', model: false, help: 'Sin texto: dila de memoria. Después escucharás el modelo.' },
      { name: 'Escribir' },
    ];
    const isNew = !Store.state.cards[p.id];
    let si = 0, count = 0, totalReps = 0, busy = false, manual = !Speech.canListen, writeScore = 0, writeTries = 0;

    function stepper() {
      return `<ol class="stepper">${STAGES.map((s, i) => `<li class="${i < si ? 'done' : i === si ? 'on' : ''}"><span class="st-n">${i < si ? icon('check', 'sm') : i + 1}</span><span class="st-l">${s.name}</span></li>`).join('')}</ol>`;
    }
    function draw() {
      Speech.stop();
      if (si === 0) return understand();
      if (si === STAGES.length - 1) return writeStage();
      return repStage();
    }
    function nextStage() { si++; count = 0; draw(); }

    /* 1. Entender */
    function understand() {
      ctx.stage.innerHTML = `
        ${stepper()}
        <div class="memo-source">${sourceBadge(p)}</div>
        ${p.word ? `<div class="word-head"><span class="wh-word">${esc(p.word)}</span><span class="wh-es">${esc(p.wordEs)}</span>${soundFor(p) ? `<span class="wh-sound">suena “${esc(soundFor(p))}”</span>` : ''}</div>` : ''}
        <div class="phrase-en">${esc(p.en)}</div>
        <div class="phrase-es">${esc(p.es)}</div>
        ${audioRow(true)}
        <div class="section-label">Palabra por palabra · toca cada bloque para escucharlo</div>
        ${breakdownHtml(p)}
        ${soundFor(p) && !p.word ? `<div class="sound-line">${icon('volume', 'sm')}<span>Así suena (aprox.): <b>${esc(soundFor(p))}</b></span></div>` : ''}
        ${tipBox(p)}`;
      wireAudio(ctx.stage, p.en);
      wireChunks(ctx.stage, p);
      autoSay(p.en);
      const buttons = [];
      if (isNew) buttons.push({ label: `${icon('check', 'sm')} Ya me la sé`, kind: 'ghost', primary: false, onClick: () => { Speech.stop(); Store.markKnown(p.id); toast('Marcada como conocida'); ctx.done({ known: true }); } });
      buttons.push({ label: `Empezar a repetir ${icon('arrow', 'sm')}`, primary: true, onClick: nextStage });
      ctx.foot({ msg: '<span class="muted">Cuando entiendas cada palabra, empieza a repetir.</span>', buttons });
    }

    /* 2-4. Repeticiones */
    function repStage() {
      const st = STAGES[si];
      const text = st.show === 'full'
        ? `<div class="phrase-en">${esc(p.en)}</div><div class="phrase-es">${esc(p.es)}</div>`
        : st.show === 'hint'
          ? `<div class="phrase-en masked">${maskText(p.en)}</div><div class="phrase-es">${esc(p.es)}</div>`
          : `<div class="memory-card"><span class="label">Dilo en inglés</span><div class="phrase-en sm">${esc(p.es)}</div></div>`;
      ctx.stage.innerHTML = `
        ${stepper()}
        <p class="prompt">${st.help}</p>
        <div class="rep-text">${text}</div>
        <div class="rep-zone">
          <div class="rep-dots">${Array.from({ length: st.reps }, (_, i) => `<span class="${i < count ? 'on' : ''}"></span>`).join('')}</div>
          <div class="rep-label">Repetición <b>${Math.min(count + 1, st.reps)}</b> de ${st.reps}</div>
          <button class="rep-btn" data-space type="button" aria-label="Repetir">${icon(manual ? 'check' : 'mic')}</button>
          <div class="rep-status">${manual ? (st.model ? 'Escucha y luego toca el botón cuando la hayas dicho en voz alta' : 'Dila en voz alta y toca el botón') : 'Toca el botón o presiona la barra espaciadora'}</div>
          <div class="rep-result"></div>
        </div>`;
      $('.rep-btn', ctx.stage).onclick = () => (manual ? manualRep() : doRep());
      ctx.foot({
        buttons: [
          { label: `${icon('volume', 'sm')} Escuchar modelo`, kind: 'secondary', primary: false, onClick: () => Speech.say(p.en) },
          { label: 'Saltar etapa', kind: 'ghost', primary: false, onClick: nextStage },
        ],
      });
      if (manual && st.model) setTimeout(() => Speech.say(p.en), 300);
    }

    function setStatus(html, cls = '') {
      const el = $('.rep-status', ctx.stage);
      if (el) { el.className = 'rep-status ' + cls; el.innerHTML = html; }
    }
    function countRep() {
      count++; totalReps++;
      Store.addReps(1);
      Sfx.ok();
      const dots = $$('.rep-dots span', ctx.stage);
      if (dots[count - 1]) dots[count - 1].classList.add('on', 'pop');
      const lbl = $('.rep-label', ctx.stage);
      const st = STAGES[si];
      if (lbl) lbl.innerHTML = count >= st.reps ? '<b>¡Etapa completada!</b>' : `Repetición <b>${count + 1}</b> de ${st.reps}`;
      if (count >= st.reps) {
        $('.rep-btn', ctx.stage).disabled = true;
        setTimeout(nextStage, 1100);
      }
    }
    function manualRep() {
      if (busy) return;
      countRep();
      if (count < STAGES[si].reps && STAGES[si].model) setTimeout(() => Speech.say(p.en), 500);
    }

    async function doRep() {
      if (busy) return;
      busy = true;
      const st = STAGES[si];
      const btn = $('.rep-btn', ctx.stage);
      const out = $('.rep-result', ctx.stage);
      out.innerHTML = '';
      if (st.model) {
        setStatus(`${icon('volume', 'sm')} Escucha el modelo…`);
        btn.classList.add('model');
        await Speech.say(p.en);
        btn.classList.remove('model');
        await wait(150);
      }
      btn.classList.add('on');
      setStatus('Tu turno: habla ahora', 'live');
      let res = null;
      try {
        res = await listenScore(p.en, (t) => { out.innerHTML = `<div class="heard">${esc(t)}</div>`; });
      } catch (err) {
        btn.classList.remove('on');
        busy = false;
        if (isBlocked(err)) {
          manual = true;
          setStatus(`${esc(MIC_ERRORS[err] || 'Sin micrófono.')} Puedes seguir en modo manual: dila en voz alta y toca el botón.`, 'warn');
          btn.innerHTML = icon('check');
        } else setStatus(esc(MIC_ERRORS[err] || `No se pudo usar el micrófono (${err}).`), 'warn');
        return;
      }
      btn.classList.remove('on');
      if (!res) { setStatus('No se detectó tu voz. Toca el botón e inténtalo otra vez.', 'warn'); out.innerHTML = ''; busy = false; return; }
      const pct = Math.round(res.score * 100);
      const ok = res.score >= passMark(p.en);
      out.innerHTML = `
        <div class="answer-card compact">
          <div class="score-line"><span class="score ${scoreClass(res.score)}">${pct}%</span><span class="muted small">${ok ? 'cuenta como repetición' : 'casi, otra vez'}</span></div>
          <div class="aligned">${res.html}</div>
          <div class="heard">Se escuchó: “${esc(res.heard)}”</div>
          ${ok ? '' : '<button class="link-btn" id="force-count" type="button">La dije bien, contarla</button>'}
        </div>`;
      if (!st.model) Speech.say(p.en); // de memoria: escucha el modelo como corrección
      busy = false;
      if (ok) { setStatus(pct >= 85 ? '¡Excelente! Otra vez' : '¡Bien! Otra vez', 'ok'); countRep(); }
      else {
        Sfx.bad();
        setStatus('Escucha el modelo con atención e inténtalo otra vez', 'bad');
        const f = $('#force-count', ctx.stage);
        if (f) f.onclick = () => { f.remove(); setStatus('Contada', 'ok'); countRep(); };
      }
    }

    /* 5. Escribir */
    function writeStage() {
      ctx.stage.innerHTML = `
        ${stepper()}
        <p class="prompt">Último paso: escríbela de memoria.</p>
        <div class="memory-card"><span class="label">Escríbelo en inglés</span><div class="phrase-en sm">${esc(p.es)}</div></div>
        <input class="dict-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Escribe la frase en inglés…">
        <div class="result"></div>`;
      const input = $('.dict-input', ctx.stage);
      setTimeout(() => input.focus(), 50);
      ctx.foot({ buttons: [
        { label: 'Ver respuesta', kind: 'ghost', onClick: () => check(true) },
        { label: 'Comprobar', primary: true, onClick: () => check(false) },
      ] });
      function check(giveUp) {
        writeTries++;
        const val = giveUp ? '' : input.value.trim();
        input.disabled = true;
        const c = Text.compare(p.en, val, { mode: 'write' });
        const score = val ? c.score : 0;
        writeScore = Math.max(writeScore, score);
        const ok = score >= 0.85;
        $('.result', ctx.stage).innerHTML = `
          <div class="answer-card">
            <div class="label">Frase correcta</div>
            <div class="aligned big">${c.html}</div>
            ${val ? `<div class="you-wrote">Tu respuesta: ${esc(val)}</div>` : ''}
          </div>`;
        ok ? Sfx.ok() : Sfx.bad();
        Speech.say(p.en);
        const buttons = [];
        if (!ok && writeTries < 3) buttons.push({ label: 'Intentar otra vez', kind: 'secondary', primary: false, onClick: () => { input.disabled = false; input.value = ''; $('.result', ctx.stage).innerHTML = ''; input.focus(); ctx.foot({ buttons: [{ label: 'Comprobar', onClick: () => check(false) }] }); } });
        buttons.push({ label: `Terminar ${icon('check', 'sm')}`, primary: true, onClick: finish });
        ctx.foot({ state: ok ? 'ok' : 'bad', msg: (ok ? icon('check') : icon('x')) + `<span>${ok ? (score === 1 ? '¡Perfecta! Ya es tuya.' : `Muy bien · ${Math.round(score * 100)}%`) : `${Math.round(score * 100)}% · mira las palabras en rojo`}</span>`, buttons });
      }
    }

    function finish() {
      if (isNew) Store.learn(p.id);
      else Store.rate(p.id, writeScore >= 0.85 ? 2 : 1);
      ctx.done({ xp: 10 + totalReps * 2 + Math.round(writeScore * 10), learned: p, graded: true, correct: writeScore >= 0.85, reps: totalReps });
    }

    draw();
  },
};

/* ===================== Repaso de memoria ===================== */
Ex.recall = {
  render(item, ctx) {
    const p = item.phrase;
    const write = item.mode === 'write';
    let revealed = false;
    ctx.stage.innerHTML = `
      ${exLabel(write ? 'pen' : 'brain', write ? 'Repaso de memoria · Escribir' : 'Repaso de memoria · Decir')}
      <div class="memo-source">${sourceBadge(p)}</div>
      <div class="memory-card"><span class="label">${write ? 'Escríbelo en inglés' : 'Dilo en inglés, de memoria'}</span><div class="phrase-en">${esc(p.es)}</div></div>
      ${write
        ? '<input class="dict-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Escribe la frase en inglés…">'
        : `<div class="rep-zone"><button class="rep-btn" data-space type="button" aria-label="Decir">${icon(Speech.canListen ? 'mic' : 'eye')}</button><div class="rep-status">${Speech.canListen ? 'Toca el micrófono o presiona la barra espaciadora' : 'Dila en voz alta y luego toca para ver la respuesta'}</div><div class="rep-result"></div></div>`}
      <div class="result"></div>`;

    if (write) {
      const input = $('.dict-input', ctx.stage);
      setTimeout(() => input.focus(), 50);
      ctx.foot({ buttons: [
        { label: 'No me acuerdo', kind: 'ghost', onClick: () => reveal(0, '') },
        { label: 'Comprobar', primary: true, onClick: () => { input.disabled = true; const v = input.value.trim(); reveal(v ? Text.compare(p.en, v, { mode: 'write' }).score : 0, v); } },
      ] });
    } else {
      const btn = $('.rep-btn', ctx.stage);
      btn.onclick = async () => {
        if (revealed || btn.classList.contains('on')) return;
        if (!Speech.canListen) return reveal(null, '');
        btn.classList.add('on');
        const st = $('.rep-status', ctx.stage);
        st.textContent = 'Te escucho… dila ahora';
        try {
          const res = await listenScore(p.en, (t) => { $('.rep-result', ctx.stage).innerHTML = `<div class="heard">${esc(t)}</div>`; });
          btn.classList.remove('on');
          if (!res) { st.textContent = 'No se detectó tu voz. Toca e inténtalo otra vez.'; return; }
          reveal(res.score, res.heard, res.html);
        } catch (err) {
          btn.classList.remove('on');
          st.textContent = MIC_ERRORS[err] || `No se pudo usar el micrófono (${err}).`;
          if (isBlocked(err)) setTimeout(() => reveal(null, ''), 1200);
        }
      };
      ctx.foot({ buttons: [{ label: 'No me acuerdo', kind: 'ghost', primary: false, onClick: () => reveal(0, '') }] });
    }

    function reveal(score, attempt, spokenHtml) {
      if (revealed) return;
      revealed = true;
      const zone = $('.rep-zone', ctx.stage);
      if (zone) zone.style.display = 'none';
      const c = attempt ? Text.compare(p.en, attempt, { mode: write ? 'write' : 'speak' }) : null;
      $('.result', ctx.stage).innerHTML = `
        <div class="answer-card">
          <div class="label">Respuesta</div>
          ${c ? `<div class="aligned big">${spokenHtml || c.html}</div><div class="you-wrote">${write ? 'Escribiste' : 'Se escuchó'}: “${esc(attempt)}”</div>` : `<div class="phrase-en sm">${esc(p.en)}</div>`}
          ${audioRow()}
        </div>
        ${soundFor(p) && !p.word ? `<div class="sound-line">${icon('volume', 'sm')}<span>Así suena: <b>${esc(soundFor(p))}</b></span></div>` : ''}`;
      wireAudio($('.result', ctx.stage), p.en);
      Speech.say(p.en);
      const pass = passMark(p.en);
      const good = score !== null && score >= pass;
      const suggested = score === null ? 2 : score >= 0.97 ? 3 : good ? 2 : 0;
      if (score !== null) (good ? Sfx.ok : Sfx.bad)();
      const msg = score === null ? '¿La recordaste?' : `${good ? icon('check') : icon('x')}<span>${Math.round(score * 100)}% · ¿qué tan bien la recordaste?</span>`;
      ctx.foot({
        state: score === null ? '' : good ? 'ok' : 'bad',
        msg,
        buttons: [
          { label: 'Otra vez<small>1</small>', kind: 'rate r-bad', key: '1', primary: suggested === 0, onClick: () => rate(0) },
          { label: 'Bien<small>2</small>', kind: 'rate r-ok', key: '2', primary: suggested === 2, onClick: () => rate(2) },
          { label: 'Fácil<small>3</small>', kind: 'rate r-easy', key: '3', primary: suggested === 3, onClick: () => rate(3) },
        ],
      });
    }
    function rate(r) {
      if (item.free) { if (r === 0) Store.practice(p.id, 0.3); }  // práctica libre: no adelanta el repaso
      else if (!item.requeued) Store.rate(p.id, r);
      ctx.done({ xp: r === 0 ? 2 : 6, graded: true, correct: r >= 2, requeue: r === 0 });
    }
  },
};
