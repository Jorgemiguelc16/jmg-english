'use strict';

/* =====================================================================
   SESIÓN (pantalla completa con los ejercicios)
   ===================================================================== */
const Session = (() => {
  let s = null;
  const root = () => $('#session');

  function start(queue, title, opts = {}) {
    if (!queue.length) { toast('No hay contenido para practicar aquí todavía.'); return; }
    Speech.stop();
    s = { queue, i: 0, title, opts, reps: 0, xp: 0, graded: 0, correct: 0, sec: 0, lastTick: Date.now(), learned: [], requeued: new Set(), levelBefore: Store.levelInfo().level };
    const el = root();
    el.innerHTML = `
      <div class="session-top"><div class="session-top-inner">
        <button class="icon-btn" id="s-close" type="button" title="Salir de la sesión">${icon('x')}</button>
        <span class="s-title">${esc(title)}</span>
        <div class="progress"><div class="progress-bar"></div></div>
        <span class="s-count" id="s-count"></span>
        <span class="s-xp"><b id="s-xp">0</b> XP</span>
      </div></div>
      <div class="session-body"><div class="stage"></div></div>
      <div class="session-foot"><div class="foot-inner"><div class="foot-msg"></div><div class="foot-btns"></div></div></div>`;
    el.classList.remove('hidden');
    document.body.classList.add('in-session');
    $('#s-close').onclick = exit;
    next();
  }

  function foot({ msg = '', state = '', buttons = [] } = {}) {
    const f = $('.session-foot', root());
    f.className = 'session-foot' + (state ? ' is-' + state : '');
    $('.foot-msg', f).innerHTML = msg;
    const box = $('.foot-btns', f);
    box.innerHTML = '';
    const prim = buttons.find((b) => b.primary === true) || (buttons.length && buttons[buttons.length - 1].primary !== false ? buttons[buttons.length - 1] : null);
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn lg ' + (b.kind || 'primary');
      el.innerHTML = b.label;
      el.disabled = !!b.disabled;
      if (b === prim) el.dataset.primary = '';
      if (b.key) el.dataset.key = b.key;
      el.onclick = () => { if (!el.disabled) b.onClick(); };
      box.appendChild(el);
    });
  }

  function updateTop() {
    $('.progress-bar', root()).style.width = `${(s.i / s.queue.length) * 100}%`;
    $('#s-count').textContent = `${Math.min(s.i + 1, s.queue.length)} / ${s.queue.length}`;
  }

  function next() {
    Speech.stop();
    Speech.stopListening();
    if (s.i >= s.queue.length) return finish();
    const item = s.queue[s.i];
    const src = item.scene || item.phrase;
    Speech.setItemAccent(src && (src.group === 'british' || src.col === 'british') ? 'uk' : null);
    updateTop();
    const stage = $('.stage', root());
    stage.innerHTML = '';
    stage.className = 'stage enter';
    void stage.offsetWidth;
    stage.classList.remove('enter');
    $('.session-body', root()).scrollTop = 0;
    const ctx = { stage, foot, done: (r) => done(item, r) };
    Ex[item.type].render(item, ctx);
  }

  function done(item, r = {}) {
    const now = Date.now();
    const sec = Math.min(150, (now - s.lastTick) / 1000);
    s.lastTick = now;
    s.sec += sec;
    const xp = Math.max(0, Math.round(r.xp || 0));
    s.xp += xp;
    $('#s-xp').textContent = s.xp;
    if (r.graded) { s.graded++; if (r.correct) s.correct++; }
    if (r.learned) s.learned.push(r.learned);
    if (r.reps) s.reps += r.reps;
    if (r.requeue && !s.requeued.has(item.key)) {
      s.requeued.add(item.key);
      s.queue.push({ ...item, requeued: true });
    }
    if (r.known && s.opts.onKnown) { const nx = s.opts.onKnown(); if (nx) s.queue.push(nx); }
    if (!r.known) s.realDone = (s.realDone || 0) + 1;
    const streak = r.known ? null : Store.recordExercise({ xp, sec });
    if (streak) streakToast(streak);
    const lv = Store.levelInfo().level;
    if (lv > s.levelBefore) { s.levelBefore = lv; setTimeout(() => toast(`Subiste al <b>nivel ${lv}</b> · ${Store.levelInfo().title}`), streak ? 3300 : 0); }
    s.i++;
    next();
  }

  function finish() {
    if (!s.realDone) { close(); return; }   // solo se marcaron cosas como conocidas
    const streak = Store.finishSession();
    if (streak) streakToast(streak);
    Sfx.done();
    $('.progress-bar', root()).style.width = '100%';
    $('#s-count').textContent = `${s.queue.length} / ${s.queue.length}`;
    const acc = s.graded ? Math.round((s.correct / s.graded) * 100) : null;
    const mins = Math.max(1, Math.round(s.sec / 60));
    const sv = Store.streakView();
    const line = acc === null ? 'Buen trabajo.' : acc >= 85 ? 'Excelente resultado.' : acc >= 60 ? 'Buen trabajo, vas avanzando.' : 'Cada error es una repetición más. Así se aprende.';
    $('.stage', root()).innerHTML = `
      <div class="summary">
        <div class="summary-badge">${icon('check')}</div>
        <h2>Sesión completada</h2>
        <p class="sub">${line}</p>
        <div class="summary-grid">
          <div class="sum-box"><div class="n">+${s.xp}</div><div class="l">XP ganados</div></div>
          ${s.reps ? `<div class="sum-box"><div class="n">${s.reps}</div><div class="l">Repeticiones</div></div>` : `<div class="sum-box"><div class="n">${acc === null ? '—' : acc + '%'}</div><div class="l">Precisión</div></div>`}
          <div class="sum-box"><div class="n">${mins}</div><div class="l">Minuto${mins === 1 ? '' : 's'}</div></div>
          <div class="sum-box"><div class="n">${sv.count}</div><div class="l">Día${sv.count === 1 ? '' : 's'} de racha</div></div>
        </div>
        ${s.learned.length ? `
          <div class="learned-wrap">
            <h3>${s.reps ? 'Frases que memorizaste' : 'Frases nuevas de hoy'}</h3>
            <div class="card rows">
              ${s.learned.map((p) => `<div class="row-item"><button class="play-btn" data-en="${esc(p.en)}" type="button" title="Escuchar">${icon('volume')}</button><div class="grow"><div class="p-en">${esc(p.en)}</div><div class="p-es">${esc(p.es)}</div></div></div>`).join('')}
            </div>
            <p class="muted small center" style="margin-top:10px">Volverán en tus próximos repasos.</p>
          </div>` : ''}
      </div>`;
    $$('[data-en]', root()).forEach((b) => { b.onclick = () => Speech.say(b.dataset.en); });
    foot({
      buttons: [
        s.opts.again
          ? { label: s.opts.again.label, kind: 'secondary', primary: false, onClick: s.opts.again.run }
          : { label: 'Otra ronda de 5 min', kind: 'secondary', primary: false, onClick: () => start(buildTimedSession(5), 'Sesión rápida') },
        { label: 'Volver al inicio', primary: true, onClick: close },
      ],
    });
    s.i = s.queue.length;
    s.finished = true;
  }

  function exit() {
    if (s && !s.finished && s.realDone && !confirm('¿Salir de la sesión? Lo que ya completaste queda guardado.')) return;
    close();
  }

  function close() {
    Speech.stop();
    Speech.stopListening();
    Speech.setItemAccent(null);
    root().classList.add('hidden');
    root().innerHTML = '';
    document.body.classList.remove('in-session');
    s = null;
    App.render();
  }

  function streakToast(st) {
    let msg = `Día completado · racha de <b>${st.count} día${st.count === 1 ? '' : 's'}</b>`;
    if (st.usedFreeze) msg += ` · se usó ${st.usedFreeze} protector${st.usedFreeze > 1 ? 'es' : ''}`;
    if (st.earnedFreeze) msg += ' · ganaste un protector de racha';
    toast(msg, 4000);
  }

  return { start, get active() { return !!s; } };
})();

/* Teclado: Enter = botón principal, 1-4 = opciones */
document.addEventListener('keydown', (e) => {
  if (!Session.active) return;
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.disabled;
  if (e.key === 'Enter') {
    const b = $('#session [data-primary]');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  } else if (e.code === 'Space' && !inField) {
    const b = $('#session [data-space]');
    if (b && !b.disabled) { e.preventDefault(); if (document.activeElement) document.activeElement.blur(); b.click(); }
  } else if (/^[1-4]$/.test(e.key) && !inField) {
    const b = $(`#session .session-foot [data-key="${e.key}"]`) || $(`#session .stage [data-key="${e.key}"]`);
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});
