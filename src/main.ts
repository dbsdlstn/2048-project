// Stage 1 placeholder: proves the core runs in the browser bundle.
// The Canvas renderer and input layer replace this in stage 2.
import { newGame, randomSeed, toValueGrid } from './core';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const { state } = newGame({ seed: randomSeed() });
  const title = document.createElement('h1');
  title.textContent = 'Neon Rift';
  const board = document.createElement('pre');
  board.textContent = toValueGrid(state)
    .map((row) => row.map((v) => String(v || '.').padStart(5)).join(''))
    .join('\n');
  const note = document.createElement('p');
  note.textContent = '준비 중입니다';
  app.append(title, board, note);
}
