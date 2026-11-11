'use strict';
/*
  CONVERSACIONES (memorizar una escena como un actor)
  1. Escuchar y entender  -> escena completa con dos voces, traducción y palabra por palabra
  2. Repetir              -> línea por línea, las veces que quieras (tus líneas 3, las otras 1)
  3. Actúa tu parte       -> la otra persona habla; tú dices tus líneas de memoria
  4. Cambia de papel      -> ahora eres la otra persona
  Repaso (días después): vuelves a actuar tu parte de memoria.
*/

function sceneLines(d) {
  const n = Store.state.name || 'Alex';
  return d.lines.map(([sp, en, es, note]) => ({ sp, en: en.replace(/\{name\}/g, n), es: es.replace(/\{name\}/g, n), note: note || '' }));
}
function sceneVoices(d) {
  const ac = d && d.group === 'british' ? 'uk' : undefined;
  const you = Speech.mainVoice(ac);
  const other = Speech.altVoice(ac);
  return { B: { voice: you }, A: other ? { voice: other } : { voice: you, pitch: 0.75 } };
}
function sceneGroupBadge(d) {
  const g = SCENE_GROUP_BY_ID[d.group];
  return `<span class="badge accent">${icon(g.icon, 'sm')} ${esc(g.name)}</span>`;
}
const whoName = (d, sp) => (sp === 'B' ? 'Tú' : d.speakers.A);

function bubbleHtml(d, l, i, { en = true, es = true, extra = '', cls = '' } = {}) {
  return `
    <div class="t-line ${l.sp === 'B' ? 'b' : 'a'} ${cls}" data-li="${i}">
      <div class="avatar">${esc(whoName(d, l.sp).slice(0, 1).toUpperCase())}</div>
      <div class="t-bubble">
        <div class="t-who">${esc(whoName(d, l.sp))}</div>
        ${en ? `<div class="t-en">${esc(l.en)}</div>` : ''}
        ${es ? `<div class="t-es">${esc(l.es)}</div>` : ''}
        ${extra}
      </div>
      <button class="play-btn" data-play="${i}" type="button" title="Escuchar">${icon('volume')}</button>
    </div>`;
}

/* Habla el modelo (opcional) y escucha al usuario. Devuelve {score, html, heard} o null; lanza error de micrófono. */
async function modelAndListen(target, { model = true, voiceOpts = {}, onModel, onListen, onInterim } = {}) {
  if (model) { onModel && onModel(); await Speech.say(target, voiceOpts); await wait(150); }
  onListen && onListen();
  return listenScore(target, onInterim);
}

Ex.scene = {
  render(item, ctx) {
    const d = item.scene;
    const review = !!item.review;
    const lines = sceneLines(d);
    const V = sceneVoices(d);
    const isNew = !Store.state.cards[d.id];
    const STEPS = ['Escuchar', 'Repetir', 'Tu parte', 'Cambia de papel'];
    let step = review ? 2 : 0;
    let tok = 0;                 // invalida bucles de audio al cambiar de paso
    let totalReps = 0;
    const results = {};          // role -> { ok, total }
    const alive = (t) => t === tok && ctx.stage.isConnected;
    const playLine = (i, slow = false) => Speech.say(lines[i].en, { ...V[lines[i].sp], slow });

    function stepper() {
      if (review) return '';
      return `<ol class="stepper">${STEPS.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"><span class="st-n">${i < step ? icon('check', 'sm') : i + 1}</span><span class="st-l">${s}</span></li>`).join('')}</ol>`;
    }
    function head() {
      return `<div class="scene-head">${sceneGroupBadge(d)}<h2>${esc(d.title)}</h2><p class="muted">${esc(d.context)}</p></div>`;
    }
    function wirePlay(root) {
      $$('[data-play]', root).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); playLine(Number(b.dataset.play)); }; });
    }
    function go(n) { tok++; Speech.stop(); step = n; draw(); }
    function draw() { [stepListen, stepRepeat, () => stepAct('B'), () => stepAct('A')][step](); $('.session-body').scrollTop = 0; }

    /* ---------- 1. Escuchar y entender ---------- */
    function stepListen() {
      ctx.stage.innerHTML = `
        ${stepper()}${head()}
        <div class="audio-row">
          <button class="audio-btn solid" id="sc-play" type="button">${icon('play')}<span>Escuchar la conversación</span></button>
          <button class="audio-btn" id="sc-slow" type="button">${icon('gauge')}<span>Lento</span></button>
          <button class="audio-btn" id="sc-es" type="button">${icon('eye')}<span>Ocultar traducción</span></button>
        </div>
        <p class="prompt">Tus líneas están a la derecha. Toca cualquier línea para verla palabra por palabra.</p>
        <div class="scene-chat show-es">
          ${lines.map((l, i) => bubbleHtml(d, l, i, { extra: `${l.note ? `<div class="t-note">${icon('bulb', 'sm')}<span>${esc(l.note)}</span></div>` : ''}<div class="t-words"></div>` })).join('')}
        </div>`;
      const chat = $('.scene-chat', ctx.stage);
      wirePlay(ctx.stage);
      $$('.t-bubble', chat).forEach((b) => {
        b.onclick = () => {
          const i = Number(b.closest('.t-line').dataset.li);
          const box = $('.t-words', b);
          if (box.innerHTML) { box.innerHTML = ''; return; }
          box.innerHTML = breakdownHtml({ en: lines[i].en });
          wireChunks(box, { en: lines[i].en });
          playLine(i);
        };
      });
      const playAll = async (slow) => {
        const t = ++tok;
        for (let i = 0; i < lines.length; i++) {
          if (!alive(t)) return;
          $$('.t-line', chat).forEach((x, k) => x.classList.toggle('playing', k === i));
          await playLine(i, slow);
          if (!alive(t)) return;
          await wait(350);
        }
        $$('.t-line', chat).forEach((x) => x.classList.remove('playing'));
      };
      $('#sc-play', ctx.stage).onclick = () => playAll(false);
      $('#sc-slow', ctx.stage).onclick = () => playAll(true);
      $('#sc-es', ctx.stage).onclick = (e) => {
        const on = chat.classList.toggle('show-es');
        e.currentTarget.querySelector('span').textContent = on ? 'Ocultar traducción' : 'Mostrar traducción';
      };
      if (Store.state.settings.autoplay) setTimeout(() => playAll(false), 400);
      const buttons = [];
      if (isNew) buttons.push({ label: `${icon('check', 'sm')} Ya me la sé`, kind: 'ghost', primary: false, onClick: () => { tok++; Speech.stop(); Store.markKnown(d.id); toast('Conversación marcada como conocida'); ctx.done({ known: true }); } });
      buttons.push({ label: `Empezar a repetir ${icon('arrow', 'sm')}`, primary: true, onClick: () => go(1) });
      ctx.foot({ buttons });
    }

    /* ---------- 2. Repetir línea por línea ---------- */
    let li = 0;
    function stepRepeat() {
      const l = lines[li];
      const need = l.sp === 'B' ? 3 : 1;
      let count = 0, busy = false, manual = !Speech.canListen;
      const prev = li > 0 ? bubbleHtml(d, lines[li - 1], li - 1, { es: false, cls: 'faded' }) : '';
      ctx.stage.innerHTML = `
        ${stepper()}
        <p class="prompt">Línea <b>${li + 1}</b> de ${lines.length} · ${l.sp === 'B' ? 'tu línea: repítela 3 veces' : `línea de ${esc(d.speakers.A)}: repítela 1 vez`}. Puedes repetir más si quieres.</p>
        <div class="scene-chat compact">${prev}</div>
        <div class="line-card ${l.sp === 'B' ? 'mine' : ''}">
          <div class="t-who">${esc(whoName(d, l.sp))}</div>
          <div class="phrase-en">${esc(l.en)}</div>
          <div class="phrase-es">${esc(l.es)}</div>
          ${l.note ? `<div class="callout">${icon('bulb')}<span>${esc(l.note)}</span></div>` : ''}
        </div>
        <div class="rep-zone">
          <div class="rep-dots">${Array.from({ length: need }, () => '<span></span>').join('')}</div>
          <div class="rep-label">Repeticiones: <b class="rep-n">0</b></div>
          <button class="rep-btn" data-space type="button" aria-label="Repetir">${icon(manual ? 'check' : 'mic')}</button>
          <div class="rep-status">${manual ? 'Escucha y repítela en voz alta; luego toca el botón' : 'Toca el botón o presiona la barra espaciadora'}</div>
          <div class="rep-result"></div>
        </div>`;
      wirePlay(ctx.stage);
      const btn = $('.rep-btn', ctx.stage);
      const status = (h, c = '') => { const s = $('.rep-status', ctx.stage); if (s) { s.className = 'rep-status ' + c; s.innerHTML = h; } };
      const isLast = li === lines.length - 1;
      const nextLine = () => { if (isLast) { li = 0; go(2); } else { li++; tok++; Speech.stop(); stepRepeat(); } };
      const foot = () => ctx.foot({
        msg: count >= need ? `${icon('check')}<span>Listo. Repite más si quieres, o sigue.</span>` : '',
        state: count >= need ? 'ok' : '',
        buttons: [
          { label: `${icon('volume', 'sm')} Escuchar`, kind: 'secondary', primary: false, onClick: () => playLine(li) },
          count >= need
            ? { label: `${isLast ? 'Actuar mi parte' : 'Siguiente línea'} ${icon('arrow', 'sm')}`, primary: true, onClick: nextLine }
            : { label: 'Saltar', kind: 'ghost', primary: false, onClick: nextLine },
        ],
      });
      const counted = () => {
        count++; totalReps++;
        Store.addReps(1);
        Sfx.ok();
        $('.rep-n', ctx.stage).textContent = count;
        const dots = $$('.rep-dots span', ctx.stage);
        if (dots[count - 1]) dots[count - 1].classList.add('on', 'pop');
        if (count === need) foot();
      };
      btn.onclick = async () => {
        if (busy) return;
        if (manual) { counted(); playLine(li); return; }
        busy = true;
        const t = tok;
        const out = $('.rep-result', ctx.stage);
        out.innerHTML = '';
        let res;
        try {
          res = await modelAndListen(l.en, {
            voiceOpts: V[l.sp],
            onModel: () => { btn.classList.add('model'); status(`${icon('volume', 'sm')} Escucha…`); },
            onListen: () => { btn.classList.remove('model'); btn.classList.add('on'); status('Tu turno: habla ahora', 'live'); },
            onInterim: (x) => { out.innerHTML = `<div class="heard">${esc(x)}</div>`; },
          });
        } catch (err) {
          btn.classList.remove('on', 'model'); busy = false;
          if (isBlocked(err)) { manual = true; btn.innerHTML = icon('check'); status(`${esc(MIC_ERRORS[err] || 'Sin micrófono.')} Sigue en modo manual: repítela y toca el botón.`, 'warn'); }
          else status(esc(MIC_ERRORS[err] || `No se pudo usar el micrófono (${err}).`), 'warn');
          return;
        }
        if (!alive(t)) return;
        btn.classList.remove('on', 'model'); busy = false;
        if (!res) { status('No se detectó tu voz. Inténtalo otra vez.', 'warn'); out.innerHTML = ''; return; }
        const ok = res.score >= passMark(l.en);
        out.innerHTML = `<div class="answer-card compact"><div class="score-line"><span class="score ${scoreClass(res.score)}">${Math.round(res.score * 100)}%</span><span class="muted small">${ok ? 'cuenta' : 'casi, otra vez'}</span></div><div class="aligned">${res.html}</div><div class="heard">Se escuchó: “${esc(res.heard)}”</div>${ok ? '' : '<button class="link-btn" id="force" type="button">La dije bien, contarla</button>'}</div>`;
        if (ok) { status('¡Bien!', 'ok'); counted(); }
        else {
          Sfx.bad(); status('Escucha otra vez e inténtalo', 'bad');
          const f = $('#force', ctx.stage); if (f) f.onclick = () => { f.remove(); counted(); };
        }
      };
      foot();
      if (Store.state.settings.autoplay) setTimeout(() => { if (ctx.stage.isConnected) playLine(li); }, 350);
    }

    /* ---------- 3/4. Actuar un papel de memoria ---------- */
    function stepAct(role) {
      const t = ++tok;
      const otherName = role === 'B' ? d.speakers.A : 'tú';
      const res = results[role] = { ok: 0, total: lines.filter((l) => l.sp === role).length };
      const roleLabel = role === 'B' ? 'Tú' : d.speakers.A;
      ctx.stage.innerHTML = `
        ${stepper()}
        ${review ? `${exLabel('brain', 'Repaso de conversación')}${head()}` : ''}
        <p class="prompt">${role === 'B'
          ? `${esc(d.speakers.A)} habla. Cuando sea tu turno, verás tu línea en español: <b>dila en inglés de memoria</b>.`
          : `Ahora eres <b>${esc(d.speakers.A)}</b>. Di sus líneas de memoria; la app hace tu papel.`}</p>
        <div class="scene-chat act"></div>
        <div class="turn-zone"></div>`;
      const chat = $('.scene-chat', ctx.stage);
      const zone = $('.turn-zone', ctx.stage);
      const scrollDown = () => { const b = $('.session-body'); if (b) b.scrollTop = b.scrollHeight; };
      ctx.foot({ msg: `<span class="muted">Actuando como <b>${esc(roleLabel)}</b></span>`, buttons: [] });
      let i = 0;

      async function advance() {
        while (i < lines.length && alive(t)) {
          const l = lines[i];
          if (l.sp !== role) {
            chat.insertAdjacentHTML('beforeend', bubbleHtml(d, l, i, { es: false }));
            wirePlay(chat);
            scrollDown();
            await playLine(i);
            if (!alive(t)) return;
            await wait(300);
            i++;
          } else {
            await myTurn(l, i);
            if (!alive(t)) return;
            i++;
          }
        }
        if (alive(t)) finishAct();
      }

      function myTurn(l, idx) {
        return new Promise((resolve) => {
          chat.insertAdjacentHTML('beforeend', bubbleHtml(d, l, idx, { en: false, cls: 'my-turn' }));
          const bubble = chat.lastElementChild;
          $('.play-btn', bubble).style.visibility = 'hidden';
          let tries = 0, hint = false, done = false, manual = !Speech.canListen;
          const drawZone = (msg = '', cls = '', result = '') => {
            zone.innerHTML = `
              <div class="turn-card">
                <div class="label">Tu turno · dilo en inglés</div>
                <div class="phrase-en sm">${esc(l.es)}</div>
                ${hint ? `<div class="hint-line masked">${maskText(l.en)}</div>` : ''}
                <button class="rep-btn" data-space type="button" aria-label="Hablar">${icon(manual ? 'eye' : 'mic')}</button>
                <div class="rep-status ${cls}">${msg || (manual ? 'Dila en voz alta y toca para ver si acertaste' : 'Toca el micrófono o presiona la barra espaciadora')}</div>
                ${result}
              </div>`;
            $('.rep-btn', zone).onclick = manual ? reveal : attempt;
            scrollDown();
            ctx.foot({
              msg: `<span class="muted">Actuando como <b>${esc(roleLabel)}</b></span>`,
              buttons: [
                ...(hint ? [] : [{ label: 'Pista', kind: 'ghost', primary: false, onClick: () => { hint = true; drawZone(); } }]),
                { label: 'No me acuerdo', kind: 'secondary', primary: false, onClick: () => reveal(true) },
              ],
            });
          };
          const fill = (good) => {
            bubble.classList.remove('my-turn');
            bubble.classList.add(good ? 'said-ok' : 'said-miss');
            $('.t-bubble', bubble).insertAdjacentHTML('beforeend', `<div class="t-en">${esc(l.en)}</div>`);
            $('.play-btn', bubble).style.visibility = '';
            wirePlay(bubble);
          };
          const complete = async (good) => {
            if (done) return;
            done = true;
            if (good && tries === 1 && !hint) res.ok++;
            fill(good);
            zone.innerHTML = '';
            await playLine(idx);
            resolve();
          };
          async function attempt() {
            const btn = $('.rep-btn', zone);
            if (btn.classList.contains('on')) return;
            btn.classList.add('on');
            const s = $('.rep-status', zone); s.className = 'rep-status live'; s.textContent = 'Te escucho…';
            let r;
            try { r = await listenScore(l.en); }
            catch (err) {
              if (isBlocked(err)) { manual = true; drawZone(esc(MIC_ERRORS[err] || 'Sin micrófono.'), 'warn'); }
              else drawZone(esc(MIC_ERRORS[err] || `Error de micrófono (${err}).`), 'warn');
              return;
            }
            if (!alive(t)) return;
            if (!r) { drawZone('No se detectó tu voz. Inténtalo otra vez.', 'warn'); return; }
            tries++;
            totalReps++;
            Store.addReps(1);
            if (r.score >= passMark(l.en)) { Sfx.ok(); complete(true); return; }
            Sfx.bad();
            const pct = Math.round(r.score * 100);
            drawZone(pct >= 50 ? `Casi (${pct}%). Inténtalo otra vez o pide una pista.` : `No coincide (${pct}%). Inténtalo otra vez o pide una pista.`, 'bad',
              `<div class="answer-card compact"><div class="heard">Se escuchó: “${esc(r.heard)}”</div><button class="link-btn" id="force" type="button">La dije bien, contarla</button></div>`);
            const f = $('#force', zone); if (f) f.onclick = () => { tries = Math.max(tries, 1); complete(true); };
          }
          function reveal(gaveUp) {
            if (manual && gaveUp !== true) {
              // modo manual: mostrar y autoevaluarse
              zone.innerHTML = `<div class="turn-card"><div class="label">Respuesta</div><div class="phrase-en sm">${esc(l.en)}</div></div>`;
              playLine(idx);
              ctx.foot({ msg: '¿Te salió?', buttons: [
                { label: 'No me salió', kind: 'secondary', key: '1', onClick: () => { tries = 2; complete(false); } },
                { label: 'Me salió', key: '2', primary: true, onClick: () => { tries = 1; complete(true); } },
              ] });
              return;
            }
            tries = 2;
            Sfx.bad();
            complete(false);
          }
          drawZone();
        });
      }

      function finishAct() {
        zone.innerHTML = '';
        const pct = res.total ? Math.round((res.ok / res.total) * 100) : 100;
        chat.insertAdjacentHTML('beforeend', `<div class="act-summary"><div class="score ${scoreClass(res.ok / (res.total || 1))}">${res.ok} / ${res.total}</div><span>líneas dichas de memoria a la primera (${pct}%)</span></div>`);
        scrollDown();
        if (review) {
          const sug = pct >= 90 ? 3 : pct >= 60 ? 2 : 0;
          ctx.foot({ msg: '¿Qué tan bien la recordaste?', buttons: [
            { label: 'Otra vez<small>1</small>', kind: 'rate r-bad', key: '1', primary: sug === 0, onClick: () => endReview(0) },
            { label: 'Bien<small>2</small>', kind: 'rate r-ok', key: '2', primary: sug === 2, onClick: () => endReview(2) },
            { label: 'Fácil<small>3</small>', kind: 'rate r-easy', key: '3', primary: sug === 3, onClick: () => endReview(3) },
          ] });
          return;
        }
        if (role === 'B') {
          ctx.foot({ state: pct >= 60 ? 'ok' : '', msg: pct >= 60 ? `${icon('check')}<span>¡Muy bien! Ahora haz el otro papel.</span>` : 'Puedes repetirla o seguir al otro papel.', buttons: [
            { label: 'Repetir mi parte', kind: 'secondary', primary: false, onClick: () => go(2) },
            { label: 'Terminar aquí', kind: 'ghost', primary: false, onClick: finish },
            { label: `Cambiar de papel ${icon('arrow', 'sm')}`, primary: true, onClick: () => go(3) },
          ] });
        } else {
          ctx.foot({ state: 'ok', msg: `${icon('check')}<span>¡Conversación completa!</span>`, buttons: [
            { label: 'Repetir este papel', kind: 'secondary', primary: false, onClick: () => go(3) },
            { label: `Terminar ${icon('check', 'sm')}`, primary: true, onClick: finish },
          ] });
        }
      }
      advance();
    }

    function myScore() { const r = results.B; return r && r.total ? r.ok / r.total : 0; }
    function finish() {
      tok++; Speech.stop();
      const sc = myScore();
      if (isNew) Store.learn(d.id); else Store.rate(d.id, sc >= 0.6 ? 2 : 1);
      ctx.done({ xp: 20 + totalReps * 2, graded: true, correct: sc >= 0.6, reps: totalReps, scene: d });
    }
    function endReview(r) {
      tok++; Speech.stop();
      Store.rate(d.id, r);
      ctx.done({ xp: r === 0 ? 5 : 12, graded: true, correct: r >= 2, reps: totalReps, scene: d });
    }

    draw();
  },
};
