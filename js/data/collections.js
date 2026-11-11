'use strict';
/* Colecciones de frases sueltas e índices (no tocar los ids). */
MOVIES.forEach((m, i) => { m.id = `m-${i + 1}`; m.col = 'movies'; PHRASE_BY_ID[m.id] = m; });
WORDS.forEach((w, i) => { w.id = `w-${i + 1}`; w.col = 'words'; PHRASE_BY_ID[w.id] = w; });
BRITISH.forEach((b, i) => { b.id = `b-${i + 1}`; b.col = 'british'; PHRASE_BY_ID[b.id] = b; });
PHRASES.forEach((p) => { p.col = 'conv'; });

const COLLECTIONS = [
  { id: 'movies', name: 'Películas y series', short: 'Películas', icon: 'film', desc: 'Frases famosas para repetir hasta que salgan solas', items: MOVIES },
  { id: 'words', name: 'Palabras cotidianas', short: 'Palabras', icon: 'type', desc: 'Las palabras más usadas, siempre dentro de una frase', items: WORDS },
  { id: 'conv', name: 'Conversación', short: 'Conversación', icon: 'messages', desc: 'Frases útiles para hablar en el día a día', items: PHRASES },
  { id: 'british', name: 'Inglés británico', short: 'Británico', icon: 'globe', desc: 'Expresiones y palabras que se usan en Reino Unido', items: BRITISH },
  { id: 'mine', name: 'Mis frases', short: 'Mis frases', icon: 'bookmark', desc: 'Frases que tú agregaste de tus películas, series y canciones', items: [] },
];
const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));
