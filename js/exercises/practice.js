'use strict';
/*
  Ejercicios. Cada uno tiene render(item, ctx):
    ctx.stage  -> elemento donde se dibuja
    ctx.foot() -> barra inferior (mensaje + botones)
    ctx.done() -> termina el ejercicio con { xp, graded, correct, requeue, learned }
*/
const Ex = {};

function exLabel(iconName, text) { return `<div class="ex-label">${icon(iconName)}<span>${text}</span></div>`; }

function audioRow(big = false) {
  return `<div class="audio-row${big ? ' big' : ''}">
    <button class="audio-btn solid" data-say="n" type="button">${icon('volume')}<span>Escuchar</span></button>
    <button class="audio-btn" data-say="s" type="button">${icon('gauge')}<span>Lento</span></button>
  </div>`;
}
function wireAudio(root, text) {
  $$('[data-say]', root).forEach((b) => { b.onclick = () => Speech.say(text, { slow: b.dataset.say === 's' }); });
}
function autoSay(text) { if (Store.state.settings.autoplay) setTimeout(() => Speech.say(text), 300); }
function topicName(p) { return TOPIC_BY_ID[p.topic] ? TOPIC_BY_ID[p.topic].name : (p.src || (COLLECTION_BY_ID[p.col] || {}).name || ''); }
function siblings(p) { return TOPIC_BY_ID[p.topic] ? TOPIC_BY_ID[p.topic].items : ((COLLECTION_BY_ID[p.col] || {}).items || []); }
function scoreClass(s) { return s >= 0.85 ? 'good' : s >= 0.6 ? 'mid' : 'low'; }
// En modo británico se quitan las oraciones que describen la T "suave" americana
const US_ONLY_TIP = /wha-da-ya|didja|gedda|geda|i-dout|whadai/;
function tipText(p) {
  if (!p.tip || Speech.accent() !== 'uk' || p.col === 'british') return p.tip || '';
  return p.tip.split(/(?<=[.!?])\s+/).filter((x) => !US_ONLY_TIP.test(x)).join(' ');
}
function tipBox(p) { const t = tipText(p); return t ? `<div class="callout">${icon('bulb')}<span>${esc(t)}</span></div>` : ''; }
function optionsHtml(opts) {
  return `<div class="options">${opts.map((o, i) => `<button class="option" data-key="${i + 1}" data-i="${i}" type="button"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
}
const okIcon = () => icon('check');
const badIcon = () => icon('x');

function spanishDistractors(p, n) {
  const same = shuffle(siblings(p).filter((x) => x.id !== p.id));
  const rest = shuffle(PHRASES.filter((x) => x.topic !== p.topic));
  return uniqueBy(same.concat(rest), (x) => x.es).filter((x) => x.es !== p.es).slice(0, n).map((x) => x.es);
}

/* Botón de micrófono reutilizable */
function micWidget(target, { label = 'Toca el micrófono y repite la frase', onResult, onError } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'mic-wrap';
  wrap.innerHTML = `
    <button class="mic-btn" type="button" aria-label="Hablar">${icon('mic')}</button>
    <div class="mic-label">${esc(label)}</div>
    <div class="mic-result"></div>`;
  const btn = $('.mic-btn', wrap), lbl = $('.mic-label', wrap), out = $('.mic-result', wrap);
  let listening = false;
  btn.onclick = async () => {
    if (listening) { Speech.stopListening(); return; }
    listening = true;
    btn.classList.add('on');
    lbl.textContent = 'Escuchando… habla ahora';
    out.innerHTML = '';
    try {
      const alts = await Speech.listen({ onInterim: (t) => { out.innerHTML = `<div class="heard">${esc(t)}</div>`; } });
      if (!alts.length) {
        lbl.textContent = 'No se detectó tu voz. Toca el micrófono e inténtalo otra vez.';
        out.innerHTML = '';
      } else {
        let best = null;
        alts.forEach((a) => { const c = Text.compare(target, a, { mode: 'speak' }); if (!best || c.score > best.score) best = { ...c, heard: a }; });
        const pct = Math.round(best.score * 100);
        out.innerHTML = `
          <div class="answer-card">
            <div class="score-line"><span class="score ${scoreClass(best.score)}">${pct}%</span><span class="muted small">de precisión</span></div>
            <div class="aligned">${best.html}</div>
            <div class="heard">Se escuchó: “${esc(best.heard)}”</div>
          </div>`;
        lbl.textContent = pct >= 85 ? 'Excelente pronunciación.' : pct >= 60 ? 'Bien. Puedes intentarlo de nuevo para mejorar.' : 'Escúchala en lento y vuelve a intentarlo.';
        onResult && onResult(best.score);
      }
    } catch (err) {
      const msg = {
        'not-allowed': 'El micrófono está bloqueado. Habilítalo desde el ícono de candado en la barra de direcciones.',
        'service-not-allowed': 'El micrófono está bloqueado. Habilítalo desde el ícono de candado en la barra de direcciones.',
        network: 'El reconocimiento de voz necesita conexión a internet.',
        'audio-capture': 'No se encontró un micrófono conectado.',
      }[err] || `No se pudo usar el micrófono (${err}).`;
      lbl.textContent = msg;
      onError && onError(err);
    } finally {
      listening = false;
      btn.classList.remove('on');
    }
  };
  return wrap;
}

/* ===================== 1. Frase nueva ===================== */
Ex.learn = {
  render(item, ctx) {
    const p = item.phrase;
    let bonus = 0;
    ctx.stage.innerHTML = `
      ${exLabel('sparkles', 'Frase nueva · ' + esc(topicName(p)))}
      <div class="phrase-en">${esc(p.en)}</div>
      <div class="phrase-es">${esc(p.es)}</div>
      ${tipBox(p)}
      ${audioRow(true)}
      <div class="mic-slot"></div>`;
    wireAudio(ctx.stage, p.en);
    autoSay(p.en);
    const slot = $('.mic-slot', ctx.stage);
    if (Speech.canListen) {
      slot.appendChild(micWidget(p.en, { label: 'Opcional: dila en voz alta (+3 XP)', onResult: (s) => { if (s >= 0.8) bonus = 3; } }));
    } else {
      slot.innerHTML = '<p class="prompt">Repítela en voz alta dos o tres veces.</p>';
    }
    ctx.foot({ buttons: [{ label: `Entendido ${icon('arrow', 'sm')}`, onClick: () => { Store.learn(p.id); ctx.done({ xp: 5 + bonus, learned: p }); } }] });
  },
};

/* ===================== 2. Repaso (tarjeta) ===================== */
Ex.review = {
  render(item, ctx) {
    const p = item.phrase;
    const mode = item.mode || (item.mode = Math.random() < 0.55 ? 'es2en' : 'audio');
    if (mode === 'es2en') {
      ctx.stage.innerHTML = `
        ${exLabel('repeat', 'Repaso · Traduce al inglés')}
        <div class="phrase-en">${esc(p.es)}</div>
        <p class="prompt">Dila en voz alta antes de ver la respuesta.</p>
        <div class="reveal"></div>`;
    } else {
      ctx.stage.innerHTML = `
        ${exLabel('repeat', 'Repaso · Comprensión auditiva')}
        <p class="prompt">Escucha la frase e intenta entenderla sin leer.</p>
        ${audioRow(true)}
        <div class="reveal"></div>`;
      wireAudio(ctx.stage, p.en);
      autoSay(p.en);
    }
    ctx.foot({ buttons: [{ label: 'Mostrar respuesta', onClick: reveal }] });

    function reveal() {
      const box = $('.reveal', ctx.stage);
      box.innerHTML = `
        <div class="answer-card">
          <div class="label">Respuesta</div>
          <div class="phrase-en sm">${esc(p.en)}</div>
          <div class="phrase-es">${esc(p.es)}</div>
          ${mode === 'es2en' ? audioRow() : ''}
        </div>
        ${tipBox(p)}`;
      if (mode === 'es2en') { wireAudio(box, p.en); Speech.say(p.en); }
      ctx.foot({
        msg: '¿Qué tan bien la recordaste?',
        buttons: [
          { label: 'Otra vez<small>1</small>', kind: 'rate r-bad', key: '1', onClick: () => rate(0) },
          { label: 'Difícil<small>2</small>', kind: 'rate r-warn', key: '2', onClick: () => rate(1) },
          { label: 'Bien<small>3 · Enter</small>', kind: 'rate r-ok', key: '3', primary: true, onClick: () => rate(2) },
          { label: 'Fácil<small>4</small>', kind: 'rate r-easy', key: '4', onClick: () => rate(3) },
        ],
      });
    }
    function rate(r) {
      if (!item.requeued) Store.rate(p.id, r);
      ctx.done({ xp: r === 0 ? 2 : 5, graded: true, correct: r >= 2, requeue: r === 0 });
    }
  },
};

/* ===================== 3. Dictado ===================== */
Ex.dictation = {
  render(item, ctx) {
    const p = item.phrase;
    const count = p.en.split(/\s+/).filter(Boolean).length;
    ctx.stage.innerHTML = `
      ${exLabel('headphones', 'Dictado')}
      <p class="prompt">Escucha y escribe exactamente lo que oyes · ${count} palabra${count === 1 ? '' : 's'}</p>
      ${audioRow(true)}
      <input class="dict-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Escribe aquí…">
      <div class="result"></div>`;
    wireAudio(ctx.stage, p.en);
    autoSay(p.en);
    const input = $('.dict-input', ctx.stage);
    setTimeout(() => input.focus(), 50);
    ctx.foot({
      buttons: [
        { label: 'No la entendí', kind: 'ghost', onClick: () => check(true) },
        { label: 'Comprobar', primary: true, onClick: () => check(false) },
      ],
    });

    function check(giveUp) {
      const val = giveUp ? '' : input.value.trim();
      input.disabled = true;
      const c = Text.compare(p.en, val, { mode: 'write' });
      const score = val ? c.score : 0;
      const ok = score >= 0.85;
      if (score < 0.6) Store.practice(p.id, score);
      $('.result', ctx.stage).innerHTML = `
        <div class="answer-card">
          <div class="label">Frase correcta</div>
          <div class="aligned big">${c.html}</div>
          ${val ? `<div class="you-wrote">Tu respuesta: ${esc(val)}</div>` : ''}
          <div class="divider"></div>
          <div class="phrase-es">${esc(p.es)}</div>
        </div>
        ${tipBox(p)}`;
      const msg = !val ? 'Escúchala de nuevo mientras lees el texto.'
        : score === 1 ? 'Perfecto.'
        : ok ? `Muy bien · ${Math.round(score * 100)}%`
        : score >= 0.5 ? `Casi · ${Math.round(score * 100)}%. Escúchala otra vez leyendo el texto.`
        : `${Math.round(score * 100)}%. Escúchala en lento mientras lees.`;
      ok ? Sfx.ok() : Sfx.bad();
      setTimeout(() => Speech.say(p.en), 350);
      ctx.foot({ state: ok ? 'ok' : 'bad', msg: (ok ? okIcon() : badIcon()) + `<span>${msg}</span>`, buttons: [{ label: 'Continuar', onClick: () => ctx.done({ xp: Math.round(10 * score), graded: true, correct: ok }) }] });
    }
  },
};

/* ===================== 4. Pronunciación ===================== */
Ex.speak = {
  render(item, ctx) {
    const p = item.phrase;
    let best = -1;
    ctx.stage.innerHTML = `
      ${exLabel('mic', 'Pronunciación')}
      <div class="phrase-en">${esc(p.en)}</div>
      <div class="phrase-es">${esc(p.es)}</div>
      ${audioRow()}
      <div class="mic-slot"></div>`;
    wireAudio(ctx.stage, p.en);
    autoSay(p.en);

    if (!Speech.canListen) return selfCheck();

    $('.mic-slot', ctx.stage).appendChild(micWidget(p.en, {
      label: 'Escucha el modelo y luego toca el micrófono para repetir',
      onResult: (s) => {
        best = Math.max(best, s);
        const ok = best >= 0.7;
        if (ok) Sfx.ok();
        ctx.foot({
          state: ok ? 'ok' : '',
          msg: ok ? `${okIcon()}<span>Mejor intento: ${Math.round(best * 100)}%</span>` : 'Puedes intentarlo las veces que quieras.',
          buttons: [{ label: 'Continuar', onClick: finish }],
        });
      },
      onError: (err) => { if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') selfCheck(); },
    }));
    ctx.foot({ buttons: [{ label: 'Omitir', kind: 'ghost', primary: false, onClick: () => ctx.done({ xp: 0 }) }] });

    function finish() {
      if (best < 0.6) Store.practice(p.id, best);
      ctx.done({ xp: Math.round(10 * Math.max(0, best)), graded: true, correct: best >= 0.7 });
    }
    function selfCheck() {
      ctx.foot({
        msg: 'Repítela en voz alta y evalúate.',
        buttons: [
          { label: 'Me costó', kind: 'secondary', key: '1', onClick: () => { Store.practice(p.id, 0.5); ctx.done({ xp: 3, graded: true, correct: false }); } },
          { label: 'Me salió bien', key: '2', primary: true, onClick: () => ctx.done({ xp: 6, graded: true, correct: true }) },
        ],
      });
    }
  },
};

/* ===================== 5. Comprensión (solo audio) ===================== */
Ex.choice = {
  render(item, ctx) {
    const p = item.phrase;
    const opts = item.opts || (item.opts = shuffle([p.es, ...spanishDistractors(p, 3)]));
    ctx.stage.innerHTML = `
      ${exLabel('ear', 'Comprensión auditiva')}
      <p class="prompt">¿Qué significa lo que escuchas?</p>
      ${audioRow(true)}
      ${optionsHtml(opts)}
      <div class="reveal"></div>`;
    wireAudio(ctx.stage, p.en);
    autoSay(p.en);
    ctx.foot({ msg: '<span class="muted">Elige una opción · teclas 1–4</span>', buttons: [] });
    let answered = false;
    $$('.option', ctx.stage).forEach((b) => {
      b.onclick = () => {
        if (answered) return;
        answered = true;
        const ok = opts[Number(b.dataset.i)] === p.es;
        $$('.option', ctx.stage).forEach((x) => {
          x.disabled = true;
          if (opts[Number(x.dataset.i)] === p.es) x.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        $('.reveal', ctx.stage).innerHTML = `<div class="answer-card"><div class="label">Lo que escuchaste</div><div class="phrase-en sm">${esc(p.en)}</div></div>`;
        ok ? Sfx.ok() : Sfx.bad();
        if (!ok) Store.practice(p.id, 0.4);
        ctx.foot({ state: ok ? 'ok' : 'bad', msg: ok ? `${okIcon()}<span>Correcto</span>` : `${badIcon()}<span>Incorrecto. Mira cómo se escribe y escúchala otra vez.</span>`, buttons: [{ label: 'Continuar', onClick: () => ctx.done({ xp: ok ? 5 : 1, graded: true, correct: ok }) }] });
      };
    });
  },
};

/* ===================== 6. Ordenar la frase ===================== */
Ex.build = {
  render(item, ctx) {
    const p = item.phrase;
    const target = Text.tiles(p.en);
    if (!item.bank) {
      const targetLower = new Set(target.map((w) => w.toLowerCase()));
      let extra = [];
      if (target.length <= 7) {
        const pool = uniqueBy(shuffle(PHRASES.filter((x) => x.id !== p.id)).flatMap((x) => Text.tiles(x.en).map((w) => w.toLowerCase())), (w) => w)
          .filter((w) => !targetLower.has(w) && w !== 'i' && !/^i'/.test(w));
        extra = pool.slice(0, 2);
      }
      item.bank = shuffle(target.concat(extra)).map((w, i) => ({ w, i }));
    }
    const bank = item.bank;
    const answer = [];
    let checked = false;

    ctx.stage.innerHTML = `
      ${exLabel('grid', 'Ordena la frase')}
      <p class="prompt">Construye en inglés:</p>
      <div class="phrase-en sm">${esc(p.es)}</div>
      <div class="answer-zone"></div>
      <div class="bank"></div>
      <div class="reveal"></div>`;
    const zone = $('.answer-zone', ctx.stage), bankEl = $('.bank', ctx.stage);

    function draw() {
      zone.innerHTML = answer.length ? '' : '<span class="placeholder">Toca las palabras en orden</span>';
      answer.forEach((t, k) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tile'; b.textContent = t.w;
        b.onclick = () => { if (checked) return; answer.splice(k, 1); draw(); };
        zone.appendChild(b);
      });
      bankEl.innerHTML = '';
      bank.forEach((t) => {
        const used = answer.includes(t);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tile' + (used ? ' used' : ''); b.textContent = t.w; b.disabled = used || checked;
        b.onclick = () => { answer.push(t); draw(); };
        bankEl.appendChild(b);
      });
      if (!checked) ctx.foot({ buttons: [{ label: 'Comprobar', disabled: !answer.length, onClick: check }] });
    }
    function check() {
      checked = true;
      const built = answer.map((t) => t.w.toLowerCase()).join(' ');
      const ok = built === target.map((w) => w.toLowerCase()).join(' ');
      draw();
      zone.classList.add(ok ? 'is-ok' : 'is-bad');
      if (!ok) Store.practice(p.id, 0.5);
      $('.reveal', ctx.stage).innerHTML = `<div class="answer-card"><div class="label">Frase correcta</div><div class="phrase-en sm">${esc(p.en)}</div>${audioRow()}</div>`;
      wireAudio($('.reveal', ctx.stage), p.en);
      ok ? Sfx.ok() : Sfx.bad();
      setTimeout(() => Speech.say(p.en), 300);
      ctx.foot({ state: ok ? 'ok' : 'bad', msg: ok ? `${okIcon()}<span>Correcto</span>` : `${badIcon()}<span>Ese es el orden correcto.</span>`, buttons: [{ label: 'Continuar', onClick: () => ctx.done({ xp: ok ? 8 : 2, graded: true, correct: ok }) }] });
    }
    draw();
  },
};

/* ===================== 7. Diálogo ===================== */
Ex.dialogue = {
  render(item, ctx) {
    const d = item.dialog;
    const vA = Speech.mainVoice();
    const vB = Speech.altVoice();
    const lineAudio = d.lines.map(([sp, en]) => (sp === 'A' ? { text: en, voice: vA } : vB ? { text: en, voice: vB } : { text: en, voice: vA, pitch: 0.7 }));
    const questions = d.questions.map((q) => ({ q: q.q, right: q.options[0], opts: shuffle(q.options) }));
    const initials = (sp) => esc(d.speakers[sp].slice(0, 1).toUpperCase());
    let okCount = 0;
    let slow = false;

    function play(onLine) { return Speech.playLines(lineAudio, { slow, onLine }); }

    /* Paso 1: escuchar */
    function listenStep() {
      ctx.stage.innerHTML = `
        ${exLabel('messages', 'Diálogo · Paso 1 de 3')}
        <div class="dialog-hero">
          <div class="icon-tile lg">${icon(TOPIC_ICONS[d.topic] || 'messages', 'lg')}</div>
          <h2>${esc(d.title)}</h2>
          <p class="muted">${esc(d.scene)}<br>Escucha la conversación completa <b>sin leer</b>. Después responderás ${questions.length} preguntas.</p>
          <div class="audio-row big">
            <button class="audio-btn solid" id="dlg-play" type="button">${icon('play')}<span>Reproducir</span></button>
            <button class="audio-btn" id="dlg-slow" type="button">${icon('gauge')}<span>Lento</span></button>
          </div>
          <div class="dialog-status"></div>
        </div>`;
      const status = $('.dialog-status', ctx.stage);
      const run = (isSlow) => {
        slow = isSlow;
        play((i) => {
          status.textContent = i >= 0 ? `${d.speakers[d.lines[i][0]]} está hablando · ${i + 1} de ${d.lines.length}` : 'Puedes escucharla otra vez o continuar.';
        });
      };
      $('#dlg-play', ctx.stage).onclick = () => run(false);
      $('#dlg-slow', ctx.stage).onclick = () => run(true);
      if (Store.state.settings.autoplay) setTimeout(() => run(false), 400);
      ctx.foot({ buttons: [{ label: `Ir a las preguntas ${icon('arrow', 'sm')}`, onClick: () => { Speech.stop(); askQ(0); } }] });
    }

    /* Paso 2: preguntas */
    function askQ(qi) {
      if (qi >= questions.length) return transcript();
      const q = questions[qi];
      ctx.stage.innerHTML = `
        ${exLabel('messages', `Diálogo · Pregunta ${qi + 1} de ${questions.length}`)}
        <div class="phrase-en sm">${esc(q.q)}</div>
        ${optionsHtml(q.opts)}
        <div class="audio-row"><button class="audio-btn" id="dlg-again" type="button">${icon('repeat')}<span>Escuchar el diálogo otra vez</span></button></div>`;
      $('#dlg-again', ctx.stage).onclick = () => play();
      ctx.foot({ msg: '<span class="muted">Elige una opción · teclas 1–3</span>', buttons: [] });
      let answered = false;
      $$('.option', ctx.stage).forEach((b) => {
        b.onclick = () => {
          if (answered) return;
          answered = true;
          Speech.stop();
          const ok = q.opts[Number(b.dataset.i)] === q.right;
          if (ok) okCount++;
          $$('.option', ctx.stage).forEach((x) => { x.disabled = true; if (q.opts[Number(x.dataset.i)] === q.right) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          ok ? Sfx.ok() : Sfx.bad();
          ctx.foot({ state: ok ? 'ok' : 'bad', msg: ok ? `${okIcon()}<span>Correcto</span>` : `${badIcon()}<span>Incorrecto. Lo verás en la transcripción.</span>`, buttons: [{ label: 'Continuar', onClick: () => askQ(qi + 1) }] });
        };
      });
    }

    /* Paso 3: transcripción */
    function transcript() {
      ctx.stage.innerHTML = `
        ${exLabel('file', `Diálogo · Transcripción · ${okCount}/${questions.length} correctas`)}
        <p class="prompt">Toca una línea para ver la traducción. Usa el botón de audio para repetir cada línea imitando la voz.</p>
        <div class="transcript">
          ${d.lines.map(([sp, en, es], i) => `
            <div class="t-line ${sp === 'A' ? 'a' : 'b'}">
              <div class="avatar">${initials(sp)}</div>
              <div class="t-bubble" data-i="${i}">
                <div class="t-who">${esc(d.speakers[sp])}</div>
                <div class="t-en">${esc(en)}</div>
                <div class="t-es">${esc(es)}</div>
              </div>
              <button class="play-btn" data-line="${i}" type="button" title="Escuchar">${icon('volume')}</button>
            </div>`).join('')}
        </div>
        <div class="audio-row"><button class="audio-btn" id="dlg-all" type="button">${icon('play')}<span>Escuchar todo leyendo</span></button></div>`;
      $$('.t-bubble', ctx.stage).forEach((b) => { b.onclick = () => b.classList.toggle('show'); });
      $$('[data-line]', ctx.stage).forEach((b) => { b.onclick = () => { const l = lineAudio[Number(b.dataset.line)]; Speech.say(l.text, { voice: l.voice, pitch: l.pitch }); }; });
      $('#dlg-all', ctx.stage).onclick = () => {
        slow = false;
        play((i) => { $$('.t-line', ctx.stage).forEach((x, k) => x.classList.toggle('playing', k === i)); });
      };
      ctx.foot({
        buttons: [{
          label: 'Terminar diálogo',
          onClick: () => {
            Speech.stop();
            const score = okCount / questions.length;
            Store.dialogDone(d.id, score);
            ctx.done({ xp: 5 * okCount + 5, graded: true, correct: score >= 0.67, score });
          },
        }],
      });
    }

    listenStep();
  },
};
