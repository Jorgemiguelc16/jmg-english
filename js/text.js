'use strict';
/*
  Text: compara lo que escribiste o dijiste con la frase correcta,
  palabra por palabra, perdonando mayúsculas, puntuación, contracciones y pequeños errores.
*/
const Text = (() => {
  const CONTR = {
    "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
    "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is', "what's": 'what is',
    "where's": 'where is', "there's": 'there is', "here's": 'here is', "who's": 'who is', "how's": 'how is',
    "let's": 'let us', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "can't": 'can not', cannot: 'can not', "won't": 'will not', "wouldn't": 'would not',
    "couldn't": 'could not', "shouldn't": 'should not', "haven't": 'have not', "hasn't": 'has not',
    "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "it'll": 'it will',
    "he'll": 'he will', "she'll": 'she will', "i'd": 'i would', "you'd": 'you would', "we'd": 'we would',
    "they'd": 'they would', "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
    ok: 'okay', 'o.k.': 'okay', tv: 'tv', mom: 'mom', mum: 'mom',
  };
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function numToWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) { const u = n % 10; return TENS[Math.floor(n / 10)] + (u ? ' ' + ONES[u] : ''); }
    return String(n);
  }

  function words(s) {
    let t = String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[-–—]/g, ' ');
    t = t.replace(/[^a-z0-9' ]+/g, ' ');
    const out = [];
    for (let w of t.split(/\s+/)) {
      w = w.replace(/^'+|'+$/g, '');
      if (!w) continue;
      if (/^\d+$/.test(w)) { out.push(...numToWords(Number(w)).split(' ')); continue; }
      if (CONTR[w]) { out.push(...CONTR[w].split(' ')); continue; }
      out.push(w);
    }
    return out;
  }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function sim(t, a) {
    if (t === a) return 1;
    const tol = t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0;
    return tol && lev(t, a) <= tol ? 0.7 : 0;
  }

  // Alineación de máximo parecido entre la frase correcta (T) y tu intento (A)
  function align(T, A) {
    const n = T.length, m = A.length;
    const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const s = sim(T[i - 1], A[j - 1]);
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], s > 0 ? dp[i - 1][j - 1] + s : -1);
      }
    }
    const status = new Array(n).fill('miss');
    let i = n, j = m, matched = 0;
    while (i > 0 && j > 0) {
      const s = sim(T[i - 1], A[j - 1]);
      if (s > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-9) {
        status[i - 1] = s === 1 ? 'ok' : 'near';
        matched++; i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
      else j--;
    }
    return { status, total: dp[n][m], extras: m - matched };
  }

  /*
    mode 'write': penaliza palabras de más (dictado)
    mode 'speak': más tolerante (el micrófono a veces agrega cosas)
  */
  function compare(target, attempt, { mode = 'write' } = {}) {
    const orig = target.split(/\s+/).filter(Boolean);
    const T = [], map = [];
    orig.forEach((tok, oi) => words(tok).forEach((w) => { T.push(w); map.push(oi); }));
    const A = words(attempt);
    const { status, total } = align(T, A);
    const tokStatus = orig.map((_, oi) => {
      const st = status.filter((_, k) => map[k] === oi);
      if (!st.length || st.every((s) => s === 'ok')) return 'ok';
      if (st.every((s) => s === 'miss')) return 'miss';
      return 'near';
    });
    const denom = mode === 'write' ? Math.max(T.length, A.length) : T.length;
    const score = T.length ? Math.max(0, Math.min(1, total / denom)) : 1;
    const html = orig.map((tok, oi) => `<span class="w ${tokStatus[oi]}">${esc(tok)}</span>`).join(' ');
    return { score, html, tokStatus };
  }

  // Fichas para "Arma la frase"
  function tiles(en) {
    const t = en.split(/\s+/)
      .map((w) => w.replace(/^[¿¡"(]+/, '').replace(/[.,!?…")]+$/, ''))
      .filter(Boolean);
    if (t.length && !/^I('|$)/.test(t[0])) t[0] = t[0].charAt(0).toLowerCase() + t[0].slice(1);
    return t;
  }

  return { words, compare, tiles, lev };
})();
