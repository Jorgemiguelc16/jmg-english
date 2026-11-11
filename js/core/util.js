'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((x) => { const k = keyFn(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let toastTimer = null;
function toast(html, ms = 3200) {
  html = `<span class="toast-dot"></span>${html}`;
  const el = $('#toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* Efectos de sonido cortos (sin archivos, generados con Web Audio) */
const Sfx = (() => {
  let ctx = null;
  function play(notes) {
    if (!Store.state.settings.sounds) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      notes.forEach(([freq, dt, dur]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + dt);
        g.gain.exponentialRampToValueAtTime(0.08, now + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dt + dur);
        o.connect(g).connect(ctx.destination);
        o.start(now + dt);
        o.stop(now + dt + dur + 0.05);
      });
    } catch (e) { /* sin sonido, no pasa nada */ }
  }
  return {
    ok: () => play([[660, 0, 0.12], [880, 0.1, 0.2]]),
    bad: () => play([[311, 0, 0.18], [262, 0.14, 0.25]]),
    done: () => play([[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.35]]),
  };
})();
