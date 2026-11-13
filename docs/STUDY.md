# Neon Rift 학습 노트

이 문서는 이 프로젝트를 만들면서 **게임 개발을 공부하기 위한 교재**입니다.
변경 기록이 아니라, "왜 이렇게 만들었는가"를 이해하고 직접 손으로 연습해 볼 수 있도록 쓰여 있습니다.
단계가 끝날 때마다 새 장(章)이 추가됩니다.

## 목차

- [0. 읽는 법](#0-읽는-법)
- [1. 전체 구조](#1-전체-구조)
  - [1.1 데이터 흐름: 입력 → 코어 → 이벤트 → 렌더](#11-데이터-흐름-입력--코어--이벤트--렌더)
  - [1.2 폴더별 역할](#12-폴더별-역할)
- [2. 1단계: 뼈대와 코어 로직](#2-1단계-뼈대와-코어-로직)
  - [2.1 시드 고정 난수(Seeded RNG)](#21-시드-고정-난수seeded-rng)
  - [2.2 순수 함수와 로직/표현 분리](#22-순수-함수와-로직표현-분리)
  - [2.3 불변(immutable) 상태](#23-불변immutable-상태)
  - [2.4 이벤트 기반 턴 결과](#24-이벤트-기반-턴-결과)
  - [2.5 Vitest로 단위 테스트하기](#25-vitest로-단위-테스트하기)
  - [2.6 도구 체인: Vite, TypeScript strict, ESLint, Prettier](#26-도구-체인-vite-typescript-strict-eslint-prettier)
- [3. 설계 결정 기록](#3-설계-결정-기록)
- [부록: 자주 쓰는 명령어](#부록-자주-쓰는-명령어)

---

## 0. 읽는 법

각 개념은 같은 순서로 설명합니다.

1. **왜 필요한가** — 이 개념이 없으면 어떤 문제가 생기는지
2. **어디에 쓰였나** — 이 저장소의 실제 파일 경로
3. **핵심 코드** — 실제 코드에서 발췌 (전체는 파일에서 확인)
4. **연습 과제** — 직접 고쳐 보고 `npm run test`로 확인해 볼 것

연습 과제는 별도 브랜치에서 해 보고, 끝나면 되돌려도 됩니다(`git stash` 또는 `git checkout .`).

---

## 1. 전체 구조

### 1.1 데이터 흐름: 입력 → 코어 → 이벤트 → 렌더

게임 한 턴은 항상 같은 길을 따라 흐릅니다.

```
 [입력]                 [코어]                          [렌더]
 스와이프/키보드  ──▶  move(state, 'left')  ──▶  { state, events }  ──▶  애니메이션 재생
  (input/)            (core/, 순수 함수)        새 상태 + 이벤트 목록     (render/, ui/)
                                                        │
                                                        └──▶ 저장 (save/)
```

- **입력 계층**은 "어느 방향으로 밀었는가"만 알아내서 `Direction` 하나로 바꿉니다. 손가락 좌표나 키 코드는 코어까지 내려가지 않습니다.
- **코어**는 현재 상태와 방향을 받아 **새 상태**와 **이벤트 목록**을 돌려줍니다. 화면, 시간, 애니메이션을 전혀 모릅니다.
- **렌더 계층**은 이벤트 목록("3번 타일이 (0,3)에서 (0,1)로 이동", "1·2번이 합쳐져 5번 생성"…)을 읽어 그대로 애니메이션으로 재생합니다.
- **저장 계층**은 상태 객체를 JSON으로 저장합니다. 상태가 평범한 데이터이기 때문에 가능한 일입니다.

이 구조의 핵심은 **"규칙을 판단하는 곳은 코어 단 한 곳"** 이라는 점입니다. 렌더러는 규칙을 다시 계산하지 않고, 코어가 알려준 사실만 보여 줍니다.

### 1.2 폴더별 역할

| 폴더          | 역할                                                 | 상태         |
| ------------- | ---------------------------------------------------- | ------------ |
| `src/core/`   | 순수 게임 로직. DOM 없음, 테스트 대상                | 1단계 ✔      |
| `src/render/` | Canvas 보드 렌더러, 트윈, 파티클, 화면 흔들림        | 2단계 예정   |
| `src/input/`  | 포인터 스와이프 + 키보드 → `Direction`               | 2단계 예정   |
| `src/ui/`     | DOM 오버레이: 메뉴, HUD, 유물 선택, 결과 화면        | 3~4단계 예정 |
| `src/audio/`  | WebAudio로 합성한 효과음                             | 5단계 예정   |
| `src/save/`   | localStorage 저장(최고 기록, 진행 중인 런, 설정)     | 4단계 예정   |
| `tests/`      | Vitest 단위 테스트 (나중에 Playwright 스모크 테스트) | 1단계 ✔      |
| `docs/`       | 이 문서                                              | 매 단계 갱신 |

1단계에서 만든 `src/core/` 파일:

| 파일                  | 내용                                                          |
| --------------------- | ------------------------------------------------------------- |
| `src/core/balance.ts` | 조정 가능한 수치 모음(보드 크기, 시작 타일 수, 4가 나올 확률) |
| `src/core/rng.ts`     | 시드 고정 난수 생성기 (mulberry32)                            |
| `src/core/types.ts`   | 타일, 상태, 이벤트 등 모든 핵심 타입                          |
| `src/core/grid.ts`    | 좌표 ↔ 인덱스 변환, 방향별 줄(line) 계산, 이웃 칸             |
| `src/core/tile.ts`    | 타일 생성과 "합체 규칙"(합쳐지는가? 무엇이 되는가?)           |
| `src/core/board.ts`   | 새 게임, 이동·합체, 타일 생성, 게임 오버 판정                 |
| `src/core/index.ts`   | 코어의 공개 입구. 바깥에서는 여기서만 import                  |

---

## 2. 1단계: 뼈대와 코어 로직

### 2.1 시드 고정 난수(Seeded RNG)

#### 왜 필요한가

2048에는 "빈 칸 중 어디에 새 타일이 나오는가", "2인가 4인가"라는 무작위 요소가 있습니다.
`Math.random()`을 쓰면 다음 문제가 생깁니다.

- **재현 불가**: "이 판에서 버그가 났어요"라는 제보를 받아도 같은 판을 다시 만들 수 없습니다.
- **저장/불러오기 불완전**: 게임을 저장했다가 불러오면 그 뒤에 나올 타일이 달라집니다. 플레이어가 "불러오기 → 마음에 안 드는 타일이면 다시 불러오기"로 운을 조작(save scumming)할 수 있게 됩니다.
- **테스트 불가**: 결과가 매번 달라서 "이 입력이면 이 결과"를 검증할 수 없습니다.

**시드(seed) 고정 RNG**는 같은 시드로 시작하면 항상 같은 난수 수열을 내놓는 생성기입니다.
진짜 무작위가 아니라 "무작위처럼 보이는 결정적(deterministic) 수열"이라서 _의사 난수(pseudo random)_ 라고 부릅니다.

#### 어디에 쓰였나

- `src/core/rng.ts` — 생성기 본체
- `src/core/board.ts`의 `spawnRandomTile` — 빈 칸 선택과 2/4 결정
- `GameState.rng` — 상태 안에 난수 생성기 상태가 함께 들어 있음

#### 핵심 코드

이 프로젝트의 RNG는 **상태를 숨기지 않습니다**. 흔한 구현은 클로저 안에 상태를 숨기지만,
여기서는 상태를 평범한 객체로 꺼내 놓고, 뽑을 때마다 "값 + 다음 상태"를 돌려줍니다.

```ts
// src/core/rng.ts
export interface RngState {
  readonly seed: number; // 처음 시드 (공유·표시용)
  readonly state: number; // 현재 내부 상태 (32비트 정수)
}

export function nextFloat(rng: RngState): RngStep<number> {
  const state = (rng.state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rng: { seed: rng.seed, state: state >>> 0 } };
}
```

사용하는 쪽은 받은 `rng`를 다음 호출에 넘겨 줍니다.

```ts
// src/core/board.ts — spawnRandomTile 중에서
let rng: RngState = state.rng;
const cellRoll = nextInt(rng, empty.length); // 어느 빈 칸?
rng = cellRoll.rng;
const fourRoll = chance(rng, rules.fourChance); // 4가 나올까?
rng = fourRoll.rng;
// ...
return { state: { ...state, cells, rng, nextTileId: state.nextTileId + 1 }, ... };
```

이렇게 하면 `RngState`가 숫자 두 개짜리 객체이므로 `JSON.stringify`로 그대로 저장되고,
불러온 뒤에도 **정확히 같은 미래**가 펼쳐집니다. 테스트 `a saved (JSON) state resumes with identical future rolls`(`tests/board.test.ts`)가 이것을 검증합니다.

> 알아 두기: mulberry32는 빠르고 짧고 게임용으로 충분히 고른 분포를 갖지만, 암호용으로는 쓰면 안 됩니다.
> 문자열 시드("neon")는 `hashSeed`로 32비트 정수로 바꿔서 씁니다. 그래서 "오늘의 시드" 같은 기능을 쉽게 만들 수 있습니다.

`randomSeed()`만 유일하게 `Math.random()`을 씁니다. 새 런을 _시작할 때_ 바깥(UI)에서 한 번 부르는 용도이고, 규칙 안에서는 절대 쓰지 않습니다.

#### 연습 과제

1. `tests/rng.test.ts`에 테스트를 하나 추가해 보세요: `nextInt(rng, 6)`을 6만 번 뽑았을 때 0~5가 각각 대략 1만 번(±5%) 나오는지.
2. `pick`처럼 생긴 `shuffle<T>(rng, items): RngStep<T[]>`를 만들어 보세요(Fisher–Yates 셔플). 3막 보스 "혼돈"이 보드를 섞을 때 쓰게 됩니다. 입력 배열을 바꾸지 않아야 합니다.
3. 일부러 `spawnRandomTile` 안에서 `Math.random()`을 쓰도록 바꾸고 `npm run test`를 돌려 보세요. 어떤 테스트가 깨지는지, 왜 깨지는지 설명해 보세요. (확인 후 되돌리기)

---

### 2.2 순수 함수와 로직/표현 분리

#### 왜 필요한가

**순수 함수(pure function)** 는 두 가지 약속을 지키는 함수입니다.

1. 같은 입력이면 항상 같은 출력을 낸다.
2. 바깥 세계를 바꾸지 않는다(부수 효과 없음: 전역 변수 변경, DOM 조작, 저장, 네트워크 등).

게임 규칙을 순수 함수로 만들면:

- 브라우저 없이 Node에서 바로 **테스트**할 수 있습니다(이 프로젝트의 테스트는 0.3초 안에 끝납니다).
- 렌더러를 Canvas에서 WebGL로, 혹은 터미널 출력으로 바꿔도 **규칙 코드는 그대로**입니다.
- 버그가 났을 때 "규칙 문제인가, 화면 문제인가"를 쉽게 가를 수 있습니다.
- 나중에 AI 플레이어, 리플레이, 힌트 기능을 붙이기 쉽습니다. 상태를 넣고 결과를 받아 보기만 하면 되니까요.

흔히 하는 실수는 "타일 객체가 자기 `div`를 들고 있고, 이동할 때 직접 CSS를 바꾸는" 구조입니다. 그러면 규칙과 화면이 엉켜서 둘 다 고치기 어려워집니다.

#### 어디에 쓰였나

- `src/core/` 전체에는 `document`, `window`, `setTimeout`, `Date.now()`가 하나도 없습니다.
- `src/main.ts`(지금은 임시 화면)만 DOM을 만지고, 코어는 `src/core/index.ts`를 통해서만 가져다 씁니다.
- `vite.config.ts`의 테스트 환경이 `environment: 'node'`인 것도 같은 이유입니다. 코어가 DOM을 쓰는 순간 테스트가 실패하므로 경계가 자동으로 지켜집니다.

#### 핵심 코드

```ts
// src/core/board.ts
export function move(
  state: GameState,
  direction: Direction,
  rules: CoreRules = DEFAULT_RULES,
): TurnResult {
  if (state.over) return { state, moved: false, events: [] };

  const slid = slide(state, direction);
  if (!slid.moved) return { state, moved: false, events: [] };
  // ... 점수 반영 → 타일 생성 → 게임 오버 판정
  return { state: next, moved: true, events };
}
```

함수 시그니처만 봐도 이 함수가 하는 일이 다 드러납니다: **(상태, 방향) → (새 상태, 움직였는가, 무슨 일이 있었나)**.
숨은 입력(전역 변수, 현재 시간)도 숨은 출력(화면 변경)도 없습니다.

규칙의 "판단"도 작게 쪼개 한 곳에 모았습니다.

```ts
// src/core/tile.ts
export function canMerge(leader: Tile, follower: Tile): boolean { ... }
export function mergedValue(leader: Tile, follower: Tile): number { ... }
export function mergeScore(value: number): number { ... }
```

3단계에서 돌 타일, 와일드 타일, 저주 상태가 들어오면 **이 세 함수만 고치면** 이동 알고리즘은 그대로 둘 수 있습니다.

#### 연습 과제

1. 터미널에서 게임을 해 보는 작은 스크립트를 만들어 보세요. `newGame`, `move`, `toValueGrid`만 쓰고, 방향을 무작위로 골라 게임 오버까지 진행한 뒤 최종 점수를 출력합니다. 렌더러가 없어도 게임이 "돌아간다"는 것을 확인하는 것이 목적입니다.
   (힌트: `tests/` 아래에 `play.test.ts`를 만들고 `console.log`로 출력해 보면 별도 설정 없이 실행됩니다.)
2. `mergeScore`를 "합체 값의 2배"로 바꿔 보세요. 어떤 테스트가 깨지나요? 바꿀 곳이 정말 한 군데뿐이었나요?

---

### 2.3 불변(immutable) 상태

#### 왜 필요한가

**불변 상태**란 "한 번 만든 상태 객체는 절대 고치지 않고, 바뀐 부분만 반영한 새 객체를 만든다"는 규칙입니다.

- **이전 상태가 그대로 남습니다.** 렌더러는 "이전 보드"와 "새 보드"를 동시에 들고 애니메이션을 그릴 수 있습니다. 나중에 만들 _되돌리기_ 유물은 이전 상태를 보관해 두기만 하면 됩니다.
- **"바뀌었는가?"를 싸게 알 수 있습니다.** 아무것도 움직이지 않은 이동은 *같은 객체*를 그대로 돌려주므로 `result.state === state`로 확인됩니다.
- **버그가 국소화됩니다.** 누군가 어딘가에서 몰래 상태를 고치는 일이 없으니, 상태가 바뀌는 곳은 `move` 같은 함수의 반환값뿐입니다.

#### 어디에 쓰였나

- `src/core/types.ts` — 모든 필드가 `readonly`, 배열은 `readonly (Tile | null)[]`
- `src/core/board.ts` — 새 상태는 항상 전개 연산자(`{ ...state, ... }`)와 `slice()`로 복사해서 만듦
- `tests/board.test.ts`의 `never mutates the input state` — 상태를 `Object.freeze`로 깊게 얼린 뒤 네 방향으로 움직여 봅니다. 코어가 어딘가에서 상태를 고치려 하면 예외가 납니다.

#### 핵심 코드

```ts
// src/core/types.ts
export interface GameState {
  readonly size: number;
  readonly cells: readonly (Tile | null)[]; // 행 우선: index = row * size + col
  readonly score: number;
  readonly turn: number;
  readonly nextTileId: TileId;
  readonly rng: RngState;
  readonly over: boolean;
}
```

```ts
// src/core/board.ts — spawnRandomTile 중에서
const cells = state.cells.slice(); // 복사본을 만들고
cells[index] = tile;               // 복사본만 고친다
return { state: { ...state, cells, rng, nextTileId: state.nextTileId + 1 }, ... };
```

`readonly`는 **타입 검사 단계의 약속**일 뿐 실행 중에 막아 주지는 않습니다. 그래서 테스트에서 `Object.freeze`로 실제로도 확인합니다.

> 성능이 걱정될 수 있지만 4×4 보드(칸 16개)를 복사하는 비용은 무시할 수준입니다.
> 상태가 훨씬 커지는 게임이라면 Immer 같은 라이브러리나 구조 공유(structural sharing)를 고려합니다.

#### 연습 과제

1. `slide` 함수 안에서 `const cells = new Array(...)` 대신 `state.cells`를 직접 고치도록 바꿔 보세요(`as (Tile | null)[]`로 타입을 속여야 할 겁니다). 어떤 테스트가 깨지는지 확인하고, 그 테스트가 무엇을 지켜 주고 있었는지 적어 보세요.
2. "되돌리기"를 설계해 보세요: `history: GameState[]`를 들고 있는 작은 함수 `undo(history)`를 만들고 테스트를 써 보세요. 불변 상태라서 얼마나 쉬운지 느껴 보는 것이 목적입니다.

---

### 2.4 이벤트 기반 턴 결과

#### 왜 필요한가

새 상태만 돌려주면 렌더러는 "무엇이 어디서 어디로 갔는지"를 알 수 없습니다.
이전 보드와 새 보드를 비교해서 추측할 수도 있지만, 합체가 끼면 금방 모호해집니다.
(`[2, 2, 2, 0]` → `[4, 2, 0, 0]`에서 남은 2는 원래 어느 2였을까요?)

그래서 코어는 **"무슨 일이 있었는지"를 순서대로 적은 목록(이벤트)** 을 함께 돌려줍니다. 렌더러는 이 목록을 그대로 재생하면 됩니다.
규칙 판단은 코어가 끝냈으니 렌더러는 추측하지 않습니다.

이 방식은 이후 단계에서 더 빛납니다. 돌 파괴, 얼음 녹음, 보스 효과, 유물 발동도 전부 "이벤트 종류 하나 추가"로 표현되고, 효과음·진동·파티클도 이벤트를 보고 결정하면 됩니다.

#### 어디에 쓰였나

- `src/core/types.ts`의 `TurnEvent`, `TurnResult`
- `src/core/board.ts`의 `slide`(move/merge 이벤트), `move`(score/gameOver), `spawnRandomTile`(spawn)
- 타일마다 **고유 id**(`Tile.id`)가 있어서 렌더러는 "id 3번 그림을 옮겨라"처럼 화면 요소와 연결합니다.

#### 핵심 코드

```ts
// src/core/types.ts
export type TurnEvent =
  | { type: 'move'; tileId; from: Position; to: Position }
  | {
      type: 'merge';
      sourceIds: [TileId, TileId];
      from: [Position, Position];
      to: Position;
      resultId: TileId;
      value: number;
      scoreGained: number;
    }
  | { type: 'score'; gained: number; total: number }
  | { type: 'spawn'; tileId; kind; value: number; at: Position }
  | { type: 'gameOver' };
```

순서 약속: **move/merge(한 번의 슬라이드로 동시에) → score → spawn → gameOver**.

예: `[2, 2, _, 4]`를 왼쪽으로 밀면 (id: 왼쪽 2=1, 오른쪽 2=2, 4=3)

```
merge  sourceIds [1,2]  from (0,0),(0,1) → to (0,0)   새 타일 id 5, 값 4, +4점
move   tile 3           from (0,3)       → to (0,1)
score  +4 (총 4)
spawn  tile 6, 값 2, 위치 (?,?)
```

합체할 때는 두 타일이 사라지고 **새 id의 타일**이 생깁니다. 렌더러는 "두 타일을 `to`로 미끄러뜨린 뒤 지우고, 새 타일을 '팡' 하고 키운다"로 그리면 됩니다.

이벤트 목록이 정말 충분한지는 테스트 `replaying events on the old board reproduces the new board`가 확인합니다. 이전 보드에 이벤트만 적용해서 새 보드와 똑같아지는지 300턴 동안 검사합니다. **렌더러가 할 일을 테스트가 미리 흉내 내 보는 것**입니다.

이 타입은 `type` 필드로 구분되는 **판별 유니온(discriminated union)** 입니다. `if (e.type === 'merge')` 안에서는 TypeScript가 `e.resultId`가 있다는 것을 압니다.

#### 연습 과제

1. 이벤트 목록을 사람이 읽을 수 있는 한국어 문장으로 바꾸는 `describeEvents(events): string[]`를 만들어 보세요. ("3번 타일이 (0,3)에서 (0,1)로 이동") 2단계에서 디버그 로그로 쓸 수 있습니다.
2. "한 번의 이동에서 일어난 합체 수"를 이벤트만 보고 세어 보세요. 5단계 "콤보 연출"이 바로 이 정보를 씁니다.
3. 생각해 보기: 이벤트에 `from` 위치를 넣지 않고 `tileId`만 넣는다면 렌더러는 무엇을 더 알아야 할까요? 그게 왜 불편할까요?

---

### 2.5 Vitest로 단위 테스트하기

#### 왜 필요한가

2048 규칙에는 헷갈리기 쉬운 경계 사례가 많습니다. 대표적인 것이 **"한 번의 이동에서 타일은 한 번만 합쳐진다"** 입니다.

- `[2, 2, 2, 2]` → `[4, 4, _, _]` (8이 아님)
- `[2, 2, 2, _]` → `[4, 2, _, _]` (밀리는 방향 쪽부터 짝을 지음)
- `[2, 2, 4, _]` → `[4, 4, _, _]` (방금 생긴 4와 원래 4는 합쳐지지 않음)

손으로 매번 플레이해서 확인할 수는 없습니다. 3단계에서 방해 타일과 유물이 들어오면 규칙이 훨씬 복잡해지는데,
그때 **기존 규칙이 깨지지 않았다는 안전망**이 테스트입니다.

Vitest는 Vite와 같은 설정을 공유하는 테스트 도구라서 TypeScript를 따로 설정 없이 바로 돌릴 수 있고, 매우 빠릅니다.

#### 어디에 쓰였나

- `tests/rng.test.ts` — 같은 시드면 같은 수열, JSON 왕복 후 재개, 범위, 확률(10%가 실제로 약 10%인지)
- `tests/board.test.ts` — 네 방향 이동, 한 번만 합체, 무효 이동(타일 생성 없음), 점수, 게임 오버, 이벤트 정확성, 시드 재현성
- `vite.config.ts`의 `test` 항목 — 테스트 파일 위치와 실행 환경(node)

#### 핵심 코드

보드를 숫자 격자로 적을 수 있는 도우미 덕분에 테스트가 "그림처럼" 읽힙니다.

```ts
// tests/board.test.ts
it.each<[number[], Direction, number[]]>([
  [[2, 2, 2, 2], 'left', [4, 4, E, E]],
  [[2, 2, 2, 0], 'left', [4, 2, E, E]],
  [[2, 2, 2, 0], 'right', [E, E, 2, 4]],
  [[2, 2, 4, 0], 'left', [4, 4, E, E]],
  // ...
])('merges each tile at most once: %j %s -> %j', (row, dir, expected) => {
  const grid = [row, [E, E, E, E], [E, E, E, E], [E, E, E, E]];
  expect(slideGrid(grid, dir)[0]).toEqual(expected);
});
```

- `it.each`: 같은 검사를 여러 입력에 반복합니다. 경계 사례를 표처럼 나열하기 좋습니다.
- `slideGrid`: `move`를 실행한 뒤 **새로 생성된 타일을 지워서**, 무작위 요소 없이 슬라이드 결과만 비교하게 해 주는 도우미입니다. 무작위가 섞인 코드를 테스트할 때 자주 쓰는 요령입니다.
- `stateFromGrid` / `toValueGrid`(`src/core/board.ts`): 테스트뿐 아니라 튜토리얼 보드나 디버깅에도 쓸 수 있게 코어에 넣었습니다.

좋은 단위 테스트의 기준:

- **하나의 규칙**만 확인하고, 이름만 읽어도 무엇을 확인하는지 알 수 있다.
- **결정적**이다(시드 고정 RNG 덕분에 가능).
- 구현 방법이 아니라 **관찰 가능한 결과**를 확인한다. (`slide` 내부 구조가 바뀌어도 결과가 같으면 테스트는 통과해야 함)

#### 연습 과제

1. `npm run test:watch`를 켜 둔 채로 `src/core/tile.ts`의 `canMerge`를 `leader.value === follower.value * 2`처럼 틀리게 바꿔 보세요. 몇 개의 테스트가 즉시 빨간색이 되나요? (확인 후 되돌리기)
2. 5×5 보드에서도 규칙이 맞는지 확인하는 테스트를 추가해 보세요. (`stateFromGrid`에 5×5 격자를 넘기면 됩니다.)
3. 테스트를 **먼저** 써 보세요: "2048 타일이 만들어지면 `reached2048` 이벤트가 나온다"는 테스트를 작성하고, 실패하는 것을 확인한 뒤 구현해서 통과시켜 보세요. 이것이 TDD(테스트 주도 개발)의 기본 리듬입니다.

---

### 2.6 도구 체인: Vite, TypeScript strict, ESLint, Prettier

#### 왜 필요한가

| 도구                    | 하는 일                                         | 없으면 생기는 일                                                    |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| **Vite**                | 개발 서버(저장 즉시 새로고침), 배포용 번들 생성 | 파일 수십 개를 브라우저가 따로 불러오거나, 번들 설정을 직접 해야 함 |
| **TypeScript (strict)** | 타입 검사                                       | `undefined` 접근, 오타 난 필드명 같은 버그를 실행해 봐야 알게 됨    |
| **ESLint**              | 버그 가능성이 높은 코드 패턴 경고               | 처리 안 한 Promise, 불필요한 조건문 같은 실수가 남음                |
| **Prettier**            | 코드 모양 자동 정리                             | 들여쓰기·따옴표 논쟁, 의미 없는 diff                                |
| **Vitest**              | 테스트 실행                                     | 2.5 참고                                                            |

#### 어디에 쓰였나

- `package.json` — 스크립트: `dev`, `build`(= `tsc --noEmit && vite build`), `test`, `lint`, `format`
- `tsconfig.json` — `strict`에 더해 더 엄격한 옵션들
- `vite.config.ts` — `base: '/2048-project/'`(GitHub Pages 주소 하위 경로), 테스트 설정
- `eslint.config.js` — flat config 형식, `typescript-eslint`의 타입 기반 strict 규칙
- `.prettierrc.json`, `.editorconfig`

#### 핵심 설정

```jsonc
// tsconfig.json (일부)
"strict": true,
"noUncheckedIndexedAccess": true,     // arr[i]의 타입이 T | undefined가 됨
"exactOptionalPropertyTypes": true,   // 선택 필드에 undefined를 "명시적으로" 넣는 것 금지
"verbatimModuleSyntax": true,         // 타입만 가져올 때 import type을 쓰도록 강제
```

`noUncheckedIndexedAccess`는 게임 코드에서 특히 유용합니다. 보드 밖 칸(`cells[16]`)을 읽으면 `undefined`인데,
이 옵션을 켜면 TypeScript가 "여기 `undefined`일 수 있어요"라고 알려 줍니다.
그래서 코드에 `line[slot] as number`처럼 "여기는 범위 안이 확실하다"고 밝히는 곳이 몇 군데 있습니다.

`build`가 `tsc --noEmit`을 먼저 돌리는 이유: Vite는 빠르게 만들기 위해 **타입 검사 없이** TS를 JS로 바꾸기만 합니다. 그래서 타입 오류가 있어도 빌드가 성공해 버릴 수 있습니다. 타입 검사를 따로 돌려 막는 것입니다.

ESLint의 `strictTypeChecked`는 타입 정보까지 보고 판단합니다. 예를 들어 1단계 작업 중에 다음을 잡아냈습니다.

```ts
// TileKind가 아직 'number' 하나뿐이라 "항상 참인 비교"라는 경고
return leader.kind === 'number' && follower.kind === 'number' && ...
```

그래서 `VALUE_MERGING_KINDS`라는 집합(Set)을 두는 데이터 주도 방식으로 바꿨습니다. 3단계에서 종류가 늘어나면 집합에 넣기만 하면 됩니다.

`eslint-config-prettier`는 설정 맨 마지막에 둡니다. ESLint의 "모양" 규칙을 꺼서 Prettier와 싸우지 않게 하는 역할입니다.

#### 연습 과제

1. `tsconfig.json`에서 `noUncheckedIndexedAccess`를 끄고 `npm run build`, 다시 켜고 `npm run build`. 켰을 때 코드에 어떤 처리가 필요해지는지 `src/core/board.ts`에서 찾아보세요.
2. `npm run dev`로 개발 서버를 켜고 `src/main.ts`의 `'준비 중입니다'`를 바꿔 저장해 보세요. 브라우저가 즉시 바뀌는 것(HMR)을 확인합니다.
3. `npm run build` 후 `dist/index.html`을 열어 보세요. 스크립트 경로가 `/2048-project/assets/...`로 시작하는 것이 `base` 설정의 효과입니다.

---

## 3. 설계 결정 기록

각 결정은 "무엇을 / 왜 / 대가(포기한 것)" 순서로 적습니다.

### D1. 보드는 행 우선 1차원 배열 `cells: (Tile | null)[]`

- **왜**: 위치가 곧 인덱스라서 "칸이 비었는가"를 바로 알 수 있고, 저장(JSON)도 단순합니다. 타일 객체에 좌표를 넣지 않으니 "타일의 좌표"와 "배열 위치"가 어긋나는 버그가 원천적으로 없습니다.
- **대가**: 렌더러는 "타일 목록 + 좌표"가 필요하므로 `listTiles(state)`로 변환해서 씁니다.

### D2. 타일마다 고유 id, 합체하면 새 id

- **왜**: 렌더러가 화면 요소를 id로 추적해야 애니메이션이 가능합니다. 합체 결과에 새 id를 주면 "두 타일 사라짐 + 새 타일 등장"이 명확해지고, 합체 팝 연출을 새 id에 걸면 됩니다.
- **대가**: id는 계속 증가만 합니다(`nextTileId`). 재사용하지 않으니 오래 플레이해도 겹치지 않고, 테스트 `tile ids are unique and never reused`가 이를 지킵니다.

### D3. 타일에 `kind`와 `status`를 1단계부터 둠

- **왜**: 3단계의 돌/와일드 타일, 얼음(고정)/저주 상태를 "기존 타입 고치기" 없이 넣기 위해서입니다. 1단계에서는 `kind: 'number'`, `status: { frozenTurns: 0, cursed: false }`만 씁니다.
- **대가**: 지금은 쓰지 않는 필드가 있습니다. 대신 저장 형식이 3단계에서 바뀌지 않습니다.

### D4. 합체 판단은 `tile.ts`의 작은 함수들(`canMerge`, `mergedValue`, `mergeScore`)

- **왜**: 이동 알고리즘(`slide`)과 "무엇이 합쳐지는가"를 분리했습니다. 와일드 타일, 저주(결과 절반), 구석의 왕(점수 2배) 같은 규칙은 이 함수들만 바꾸거나 감싸면 됩니다.
- **열린 문제**: 얼음(제자리 고정)은 줄을 "벽"으로 나누는 처리가 `slide` 안에 필요합니다. 고정된 타일에 다른 타일이 합쳐질 수 있는지는 게임 디자인 결정이라 3단계에서 정합니다.

### D5. RNG 상태를 게임 상태 안에 넣음

- **왜**: 저장하면 난수 상태까지 함께 저장되므로 불러온 뒤의 미래가 같습니다(운 조작 방지, 버그 재현).
- **대가**: 모든 무작위 사용 함수가 `rng`를 받아서 새 `rng`를 돌려줘야 해서 코드가 약간 길어집니다.

### D6. 무효 이동은 같은 상태 객체를 그대로 반환

- **왜**: 2048 규칙상 아무것도 움직이지 않으면 타일이 생기지 않아야 하고, 턴(이동 횟수 제한)도 소모되지 않아야 합니다. 같은 객체를 돌려주면 호출하는 쪽에서 `moved`만 보고 "흔들림 피드백"을 줄 수 있습니다.

### D7. 수치는 `balance.ts` 한 곳에, 규칙 함수에는 인자로 전달

- **왜**: 밸런스 조정 시 로직을 건드리지 않게 하기 위해서입니다. `move(state, dir, rules)`처럼 규칙 묶음을 인자로 받으므로 테스트에서 `fourChance: 1` 같은 극단값을 넣어 볼 수 있고, 나중에 유물이 확률을 바꾸는 것도 "다른 rules를 넘기기"로 표현할 수 있습니다.

### D8. 이벤트에 위치 정보를 중복해서라도 담음

- **왜**: `merge` 이벤트에 두 원본의 `from`과 목적지 `to`를 모두 담아서, 렌더러가 이전 상태를 뒤지지 않고 이벤트 하나만으로 애니메이션을 만들 수 있게 했습니다. 이벤트는 "그 자체로 완결된 기록"이어야 리플레이·디버그 로그에도 쓰기 좋습니다.
- **대가**: `merge` 이벤트의 `scoreGained`와 `score` 이벤트의 `gained`가 겹칩니다. 앞의 것은 "합체 위치에 +8 띄우기", 뒤의 것은 "HUD 점수 갱신"용입니다.

### D9. 엄격한 도구 설정 (TS strict + 추가 옵션, typescript-eslint strictTypeChecked)

- **왜**: 포트폴리오 프로젝트로서 코드 품질이 강조점입니다. 초반에 엄격하게 시작하는 것이 나중에 켜는 것보다 훨씬 쉽습니다.
- **대가**: `strictTypeChecked`의 `no-non-null-assertion`과 `stylisticTypeChecked`의 `non-nullable-type-assertion-style`이 서로 반대를 요구해서 뒤의 규칙은 껐습니다(`eslint.config.js`).

---

## 부록: 자주 쓰는 명령어

| 명령                 | 하는 일                             |
| -------------------- | ----------------------------------- |
| `npm install`        | 의존성 설치                         |
| `npm run dev`        | 개발 서버 (저장하면 즉시 반영)      |
| `npm run test`       | 테스트 한 번 실행                   |
| `npm run test:watch` | 파일이 바뀔 때마다 테스트 다시 실행 |
| `npm run lint`       | ESLint 검사                         |
| `npm run format`     | Prettier로 전체 코드 정리           |
| `npm run build`      | 타입 검사 + 배포용 빌드 (`dist/`)   |
| `npm run preview`    | 빌드 결과를 로컬에서 미리 보기      |
