'use strict';
/* Prepara las sesiones: qué se memoriza, qué se repasa y qué sigue. */

function registerCustom() {
  COLLECTION_BY_ID.mine.items = Store.state.custom.map((c) => {
    const p = { ...c, col: 'mine' };
    PHRASE_BY_ID[p.id] = p;
    return p;
  });
}

function nextToMemorize(colId, skip = []) {
  const col = COLLECTION_BY_ID[colId];
  return (col && col.items.find((p) => !Store.state.cards[p.id] && !skip.includes(p.id))) || null;
}

function memoItem(p) { return { type: 'memorize', phrase: p, key: 'memorize:' + p.id }; }
function startMemorize(p) {
  Session.start([memoItem(p)], 'Memorizar', {
    onKnown: () => { const n = nextToMemorize(p.col); return n ? memoItem(n) : null; },
    again: {
      label: 'Memorizar otra frase',
      run: () => {
        const n = nextToMemorize(p.col) || nextToMemorize(Store.state.memoCol);
        if (n) startMemorize(n); else toast('Ya memorizaste todas las frases de esta colección');
      },
    },
  });
}

/* Conversaciones */
const nextScene = (group, skip = []) => SCENES.find((d) => (!group || d.group === group) && !Store.state.cards[d.id] && !skip.includes(d.id)) || null;
function sceneItem(d, review = false) { return { type: 'scene', scene: d, review, key: (review ? 'scene-review:' : 'scene:') + d.id }; }
function startScene(d) {
  Session.start([sceneItem(d)], 'Conversación', {
    onKnown: () => { const n = nextScene(d.group); return n ? sceneItem(n) : null; },
    again: {
      label: 'Otra conversación',
      run: () => { const n = nextScene(d.group) || nextScene(); if (n) startScene(n); else toast('Ya aprendiste todas las conversaciones'); },
    },
  });
}
const totalDue = () => Store.dueIds().length + Store.dueSceneIds().length;

function recallItems(ids, { free = false, mode = null } = {}) {
  return ids.map((id, i) => ({ type: 'recall', phrase: PHRASE_BY_ID[id], key: 'recall:' + id, free, mode: mode || (i % 3 === 2 ? 'write' : 'speak') }));
}
function startRecallDue() {
  const scenes = Store.dueSceneIds().slice(0, 3).map((id) => sceneItem(SCENE_BY_ID[id], true));
  Session.start(scenes.concat(recallItems(Store.dueIds().slice(0, 20))), 'Repaso de memoria');
}
function startRecallFree(mode) {
  const ids = shuffle(Store.learnedIds()).slice(0, 10);
  Session.start(recallItems(ids, { free: true, mode }), mode === 'write' ? 'Escritura de memoria' : 'Repetir de memoria');
}
