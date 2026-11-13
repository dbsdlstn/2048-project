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
- [3. 2단계: 플레이 가능한 기본판](#3-2단계-플레이-가능한-기본판)
  - [3.1 게임 루프: requestAnimationFrame과 델타 타임](#31-게임-루프-requestanimationframe과-델타-타임)
  - [3.2 트윈과 이징](#32-트윈과-이징)
  - [3.3 뷰 모델과 게임 상태, 이벤트를 애니메이션으로 재생하기](#33-뷰-모델과-게임-상태-이벤트를-애니메이션으로-재생하기)
  - [3.4 Canvas 2D 기초와 devicePixelRatio](#34-canvas-2d-기초와-devicepixelratio)
  - [3.5 포인터 이벤트와 스와이프 판정](#35-포인터-이벤트와-스와이프-판정)
  - [3.6 애니메이션 중에 들어온 입력 처리](#36-애니메이션-중에-들어온-입력-처리)
  - [3.7 컨트롤러와 HUD: 얇은 접착층](#37-컨트롤러와-hud-얇은-접착층)
  - [3.8 글로우 스프라이트 캐시](#38-글로우-스프라이트-캐시)
  - [3.9 주입 가능한 시계와 디버그 훅](#39-주입-가능한-시계와-디버그-훅)
- [4. 설계 결정 기록](#4-설계-결정-기록)
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
 [입력]              [컨트롤러]             [코어]                       [표현]
 스와이프/키보드 ──▶ handleDirection ──▶ move(state, 'left') ──▶ { state, events } ──┬──▶ 렌더러: 애니메이션 재생 (render/)
  (input/)          (game/)              (core/, 순수 함수)     새 상태 + 이벤트     ├──▶ HUD: 점수·게임 오버 (ui/)
                                                                                    └──▶ 저장 (save/, 4단계)
```

- **입력 계층**은 "어느 방향으로 밀었는가"만 알아내서 `Direction` 하나로 바꿉니다. 손가락 좌표나 키 코드는 코어까지 내려가지 않습니다.
- **컨트롤러**(`src/game/controller.ts`)는 현재 게임 상태를 들고 있다가, 방향이 들어오면 코어에 넘기고 결과를 렌더러와 HUD에 나눠 줍니다. 규칙은 판단하지 않는 얇은 접착층입니다.
- **코어**는 현재 상태와 방향을 받아 **새 상태**와 **이벤트 목록**을 돌려줍니다. 화면, 시간, 애니메이션을 전혀 모릅니다.
- **렌더 계층**은 이벤트 목록("3번 타일이 (0,3)에서 (0,1)로 이동", "1·2번이 합쳐져 5번 생성"…)을 읽어 그대로 애니메이션으로 재생합니다. **HUD**는 `score`·`gameOver` 같은 이벤트를 보고 숫자와 오버레이를 바꿉니다.
- **저장 계층**은 상태 객체를 JSON으로 저장합니다. 상태가 평범한 데이터이기 때문에 가능한 일입니다.

이 구조의 핵심은 **"규칙을 판단하는 곳은 코어 단 한 곳"** 이라는 점입니다. 렌더러는 규칙을 다시 계산하지 않고, 코어가 알려준 사실만 보여 줍니다.

### 1.2 폴더별 역할

| 폴더          | 역할                                                                 | 상태                                       |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `src/core/`   | 순수 게임 로직. DOM 없음, 테스트 대상                                | 1단계 ✔                                    |
| `src/render/` | Canvas 보드 렌더러, 트윈/이징, 뷰 모델 (파티클·화면 흔들림은 5단계)  | 2단계 ✔                                    |
| `src/input/`  | 포인터 스와이프 + 키보드 → `Direction`                               | 2단계 ✔                                    |
| `src/ui/`     | DOM 오버레이: HUD, 게임 오버 화면 (메뉴·유물 선택은 3~4단계)         | 2단계 ✔ (일부)                             |
| `src/game/`   | 게임 컨트롤러: 입력 → 코어 → 렌더/HUD 연결 (모드는 3~4단계에서 확장) | 2단계 ✔                                    |
| `src/audio/`  | WebAudio로 합성한 효과음                                             | 5단계 예정                                 |
| `src/save/`   | localStorage 저장(최고 기록, 진행 중인 런, 설정)                     | 4단계 예정                                 |
| `tests/`      | Vitest 단위 테스트 (나중에 Playwright 스모크 테스트)                 | 1단계 ✔, 2단계에서 렌더·입력·컨트롤러 추가 |
| `docs/`       | 이 문서                                                              | 매 단계 갱신                               |

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

2단계에서 만든 파일:

| 파일                        | 내용                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `src/render/tween.ts`       | 이징 함수, `lerp`/`clamp`/`progress`, 절대 시간 기반 `Tween`                               |
| `src/render/clock.ts`       | `FrameClock`(시간 + 프레임 예약) 인터페이스, 브라우저 시계, `ManualClock`, `PausableClock` |
| `src/render/loop.ts`        | `AnimationLoop`: 필요할 때만 프레임을 요청하는 루프 (DOM 없음)                             |
| `src/render/spriteCache.ts` | `TileSpriteCache`: 글로우까지 그린 타일 이미지를 한 번만 만들어 재사용                     |
| `src/render/layout.ts`      | 보드 크기 → 칸 크기·간격·좌표 계산 (소수 좌표 지원)                                        |
| `src/render/viewModel.ts`   | `BoardView`: 타일 id별 스프라이트, 이벤트를 애니메이션 일정으로 바꿈 (DOM 없음)            |
| `src/render/theme.ts`       | 네온 색상표, 값별 타일 색 계산                                                             |
| `src/render/tilePainter.ts` | 타일 그림. 종류별 `TILE_ART` 등록표(캐시용) + 매 프레임 그리는 상태 오버레이 목록          |
| `src/render/renderer.ts`    | `BoardRenderer`: 캔버스·DPR·리사이즈·스프라이트 캐시·루프·`Effect` 연결 지점               |
| `src/input/swipe.ts`        | `resolveSwipe`, `SwipeTracker` (DOM 없음, 테스트 대상)                                     |
| `src/input/keys.ts`         | 방향키/WASD → `Direction` (`event.code` 기준)                                              |
| `src/input/index.ts`        | `attachInput`: 실제 DOM 이벤트를 연결하고 해제 함수를 돌려줌                               |
| `src/ui/gameScreen.ts`      | 화면 DOM 만들기 (HUD, 보드 캔버스, 안내 문구)                                              |
| `src/ui/hud.ts`             | `Hud`: 점수, 최고 기록, "+N" 팝업, 게임 오버 오버레이                                      |
| `src/ui/style.css`          | 세로 화면 레이아웃, safe-area, 스크롤/줌 방지, 네온 스타일                                 |
| `src/game/controller.ts`    | `GameController`와 표시 계층 인터페이스(`BoardDisplay`, `HudDisplay`)                      |
| `src/game/debug.ts`         | URL 옵션(`?seed=`, `?debug`) 읽기, `window.__neonRift` 디버그 API                          |
| `src/main.ts`               | 위 부품을 조립하는 진입점                                                                  |

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
- DOM은 `src/render/`, `src/input/`, `src/ui/`, `src/main.ts`만 만지고, 이들은 코어를 `src/core/index.ts`를 통해서만 가져다 씁니다.
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
2. `npm run dev`로 개발 서버를 켜고 `src/ui/gameScreen.ts`의 안내 문구(`화면을 밀거나…`)를 바꿔 저장해 보세요. 브라우저가 즉시 바뀌는 것(HMR)을 확인합니다.
3. `npm run build` 후 `dist/index.html`을 열어 보세요. 스크립트 경로가 `/2048-project/assets/...`로 시작하는 것이 `base` 설정의 효과입니다.

---

## 3. 2단계: 플레이 가능한 기본판

2단계의 목표는 "코어가 돌려준 이벤트를 화면에서 손맛 있게 보여 주고, 손가락·키보드로 조작할 수 있게 하기"입니다.
코어는 한 줄도 바꾸지 않았습니다. 1단계에서 만든 **이벤트 목록**만으로 애니메이션을 전부 만들 수 있다는 것이 이 단계에서 확인됩니다.

### 3.1 게임 루프: requestAnimationFrame과 델타 타임

#### 왜 필요한가

화면을 움직이려면 "조금 바꾸고 다시 그리기"를 1초에 수십 번 반복해야 합니다. 이 반복을 **게임 루프**라고 합니다.

- `setInterval(draw, 16)`으로 만들면 화면 주사율과 어긋나서 끊기거나(tearing), 탭이 뒤로 가도 계속 돌아 배터리를 낭비합니다.
- `requestAnimationFrame(callback)`은 브라우저가 **다음 화면을 그리기 직전에** 딱 한 번 콜백을 불러 줍니다. 주사율(60Hz, 120Hz)에 자동으로 맞고, 탭이 숨으면 멈춥니다.

또 하나 중요한 것이 **델타 타임(dt)**, 즉 "지난 프레임 이후 흐른 시간"입니다. 프레임마다 `x += 5`처럼 움직이면 120Hz 화면에서는 60Hz보다 두 배 빨라집니다. 움직임은 **시간에 비례**해야 기기와 상관없이 같은 속도가 됩니다.

#### 어디에 쓰였나

- `src/render/loop.ts`의 `AnimationLoop` — 루프 본체 (DOM 없음, `tests/clock.test.ts`에서 테스트)
- `src/render/renderer.ts`의 `tick` — 매 프레임 할 일(뷰 모델 갱신, 효과 갱신, 그리기)
- 타일 애니메이션은 "시작 시각 + 길이"로 정의된 **절대 시간** 트윈을 씁니다(3.2). 그래서 dt를 누적할 필요가 없습니다.
- 5단계의 파티클처럼 "매 프레임 조금씩 적분하는" 효과는 `Effect.update(dt, now)`로 dt를 받습니다.

#### 핵심 코드

이 프로젝트의 루프는 **필요할 때만** 돕니다. 아무것도 움직이지 않는 보드에서는 프레임 요청을 아예 하지 않으므로 휴대폰 배터리를 쓰지 않습니다.

```ts
// src/render/loop.ts
invalidate(): void {
  this.handle ??= this.clock.requestFrame(this.frame); // 이미 예약됐으면 또 예약하지 않음
}

private readonly frame = (now: number): void => {
  this.handle = null;
  const dt = this.lastTime === null ? 0 : Math.min(MAX_DT, Math.max(0, now - this.lastTime));
  this.lastTime = now;
  if (this.tick(now, dt)) this.invalidate(); // 아직 움직이는 중이면 다음 프레임도
  else this.lastTime = null;                 // 쉬는 상태: 다음엔 dt를 새로 시작
};
```

```ts
// src/render/renderer.ts — 매 프레임 할 일
private readonly tick = (now: number, dt: number): boolean => {
  const viewBusy = this.view.update(now);
  // ... 효과 갱신(dt)
  this.draw(now);
  return viewBusy || this.effects.length > 0;
};
```

`requestAnimationFrame`을 직접 부르지 않고 `this.clock.requestFrame`을 부르는 이유는 3.9에서 설명합니다.

- `MAX_DT`(50ms)로 dt 상한을 둡니다. 탭을 오래 숨겼다 돌아오면 dt가 몇 초가 되어 파티클이 순간이동하는 것을 막습니다.
- `frame`을 화살표 함수 **필드**로 만든 이유: `requestAnimationFrame(this.frame)`처럼 메서드를 그대로 넘기면 `this`가 사라집니다. 화살표 함수는 `this`를 묶어 둡니다.
- rAF 콜백의 `now`와 `performance.now()`는 같은 기준 시계입니다. 그래서 입력 순간에 `clock.now()`(= `performance.now()`)로 애니메이션 시작 시각을 정하고, 프레임에서는 rAF의 `now`로 샘플링해도 맞아떨어집니다.

#### 연습 과제

1. `AnimationLoop`의 `frame` 안에 `console.log(dt)`를 넣고 플레이해 보세요. 움직임이 없을 때 로그가 멈추는 것(on-demand 루프)을 확인하세요.
2. 개발자 도구의 Rendering 탭에서 "Frame Rendering Stats"를 켜고, 루프를 "항상 도는" 방식(`invalidate()`를 무조건 호출)으로 바꿨을 때와 비교해 보세요.
3. `MAX_DT`를 없애면 어떤 상황에서 문제가 될지 설명해 보세요. (힌트: 5단계 파티클이 `x += vx * dt`로 움직인다면?)

---

### 3.2 트윈과 이징

#### 왜 필요한가

**트윈(tween, in-between)** 은 "A에서 B까지 일정 시간 동안 값을 바꾸는 것"입니다. 타일의 위치, 크기, 투명도는 모두 트윈입니다.

그런데 일정한 속도로(linear) 움직이면 기계적으로 보입니다. 현실의 물체는 가속하고 감속하기 때문입니다.
**이징(easing)** 은 진행률 `t`(0→1)를 다른 곡선으로 바꿔 "느낌"을 만드는 함수입니다.

| 이징             | 느낌                                 | 쓰인 곳             |
| ---------------- | ------------------------------------ | ------------------- |
| `easeOutCubic`   | 빠르게 출발해서 부드럽게 멈춤        | 타일 미끄러짐, 생성 |
| `easeOutBack`    | 목표를 살짝 지나쳤다가 돌아옴 (튕김) | 합체 "팡"           |
| `easeInOutCubic` | 천천히 출발, 빠르게, 천천히 도착     | (예비)              |

애니메이션 라이브러리를 쓰지 않고 직접 만든 이유: 필요한 것이 함수 몇 개뿐이고, 직접 만들면 원리를 이해할 수 있으며, 시간을 **인자로 받는 순수 함수**로 만들어 테스트할 수 있기 때문입니다.

#### 어디에 쓰였나

- `src/render/tween.ts` — 이징 함수와 `Tween`, `sample`
- `src/render/viewModel.ts` — 미끄러짐(110ms), 합체 팝(170ms), 생성(150ms) 시간표 `DEFAULT_TIMINGS`
- `tests/render-math.test.ts` — 곡선의 시작/끝 값, 튕김 정도, 범위 고정 검사

#### 핵심 코드

```ts
// src/render/tween.ts
export type Easing = (t: number) => number;
export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;

export function easeOutBack(overshoot = 1.70158): Easing {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export interface Tween {
  from;
  to;
  start;
  duration;
  ease;
}

export function sample(tw: Tween, now: number): number {
  const t = progress(now, tw.start, tw.duration); // 0~1로 고정
  if (t >= 1) return tw.to; // 끝값은 정확히 (부동소수 오차 없음)
  return lerp(tw.from, tw.to, tw.ease(t));
}
```

트윈은 "프레임마다 조금씩 더하는" 방식이 아니라 **시작 시각과 길이로 정의**됩니다. 그래서 어떤 시각을 넣어도 그때의 값을 바로 계산할 수 있고, `sample(tw, Infinity)`는 언제나 끝값입니다. 이 성질이 3.6의 "빨리 감기"를 한 줄로 만들어 줍니다.

합체 팝은 크기를 0.75에서 1로 키우되 `easeOutBack(2.4)`를 써서 중간에 약 1.1배까지 커졌다가 돌아옵니다. 이 작은 튕김이 "합쳐졌다"는 손맛을 줍니다.

#### 연습 과제

1. `DEFAULT_TIMINGS.slide`를 110에서 400으로 바꿔 보세요. 느리게 보면 이징 곡선의 모양이 눈에 보입니다. 그다음 `easeOutCubic`을 `linear`로 바꿔 차이를 느껴 보세요.
2. `easeOutBounce`(공이 바닥에 튀듯 여러 번 튀는 곡선)를 만들고, 0과 1에서의 값을 확인하는 테스트를 추가해 보세요.
3. https://easings.net 의 곡선 그래프와 `tween.ts`의 식을 비교해 보세요. `easeOutBack`의 `overshoot`를 키우면 그래프가 어떻게 바뀌나요?

---

### 3.3 뷰 모델과 게임 상태, 이벤트를 애니메이션으로 재생하기

#### 왜 필요한가

코어의 `GameState`는 **한 턴 단위로 순간 이동**합니다. 이동 전 상태와 이동 후 상태만 있고 "중간"이 없습니다.
하지만 화면에는 0.3초 동안 타일이 미끄러지고, 합쳐지고, 새로 자라나는 **중간 과정**이 보여야 합니다.

이 중간 과정을 담는 것이 **뷰 모델(view model)** 입니다.

| 게임 상태 (`GameState`)   | 뷰 모델 (`BoardView`)                                |
| ------------------------- | ---------------------------------------------------- |
| 규칙의 진실. 저장 대상    | 화면에 그리기 위한 사본. 저장하지 않음               |
| 칸 배열, 정수 좌표        | 타일 id별 스프라이트, **소수 좌표**(1.5행 = 이동 중) |
| 턴마다 즉시 바뀜          | 시간에 따라 서서히 바뀜                              |
| 합체된 타일은 즉시 사라짐 | 합체된 타일은 목적지까지 미끄러진 **뒤에** 사라짐    |

중요한 원칙: **뷰 모델은 규칙을 다시 계산하지 않습니다.** 이벤트에 적힌 사실(누가 어디서 어디로, 누가 누구와 합쳐져 무엇이 됐나)만 일정표로 바꿉니다.

#### 어디에 쓰였나

- `src/render/viewModel.ts`의 `BoardView` — `apply(events, now)`, `update(now)`, `frame(now)`, `finish()`, `syncTo(state)`
- 시간을 인자로 받으므로 DOM 없이 Node에서 테스트합니다: `tests/viewModel.test.ts`

#### 핵심 코드

각 이벤트가 스프라이트의 트윈으로 바뀝니다.

```ts
// src/render/viewModel.ts — apply() 중에서
case 'move': {
  const s = this.require(e.tileId);
  s.row = tween(e.from.row, e.to.row, now, t.slide, easeOutCubic);
  s.col = tween(e.from.col, e.to.col, now, t.slide, easeOutCubic);
  break;
}
case 'merge': {
  for (const [i, id] of e.sourceIds.entries()) {   // 두 원본: 목적지로 미끄러진 뒤 제거
    const s = this.require(id);
    // ... row/col 트윈
    s.removeAt = slideEnd;
    s.z = Z_VANISHING;                              // 아래에 그림
  }
  this.sprites.set(e.resultId, {                    // 결과 타일: 미끄러짐이 끝나면 등장해서 "팡"
    // ...
    scale: tween(POP_FROM, 1, slideEnd, t.pop, popEase),
    appearAt: slideEnd,
    z: Z_MERGED,                                    // 맨 위에 그림
  });
  break;
}
case 'spawn': // 미끄러짐이 끝난 뒤 크기 0 → 1
```

한 턴의 시간표를 그림으로 보면:

```
시간(ms)  0          110   130            280
이동      ├─미끄러짐─┤
합체 원본 ├─미끄러짐─┤✕ (제거)
합체 결과            ├───팡(0.75→1.1→1)───┤
새 타일                    ├──자라남(0→1)──┤
```

그리기는 `frame(now)`가 돌려준 "그 순간의 값"만 보면 됩니다. 페인터는 애니메이션을 몰라도 됩니다.

테스트 `stays in sync with the core over a long game, even when turns interrupt animation`은 400턴 동안, 애니메이션이 끝나기 전에 다음 턴을 끼워 넣기도 하면서, 매 턴 "뷰 모델이 다 재생된 모습 == 코어 상태"인지 확인합니다. 1단계의 `replaying events…` 테스트가 흉내 냈던 일을 이제 진짜 렌더러 코드가 통과하는 것입니다.

#### 연습 과제

1. 합체 원본의 `removeAt`을 `now`(미끄러짐 시작)로 바꿔 보세요. 화면에서 무엇이 어색해지나요? 어떤 테스트가 깨지나요?
2. 새 타일이 미끄러짐과 **동시에** 자라나게 바꿔 보고(`spawnDelay`와 시작 시각 조정), 어느 쪽이 더 읽기 쉬운지 비교해 보세요.
3. `frame()`이 돌려준 값을 `console.table`로 찍어 보는 디버그 단축키를 만들어 보세요.

---

### 3.4 Canvas 2D 기초와 devicePixelRatio

#### 왜 필요한가

타일 16개쯤은 DOM(`div`)으로도 그릴 수 있지만, 이 게임은 5단계에서 파티클 수백 개와 화면 흔들림, 네온 글로우를 얹습니다. 이런 "매 프레임 전부 다시 그리는" 화면은 **Canvas**가 맞습니다.

Canvas 2D의 기본 모델은 단순합니다: **지우고 → 순서대로 그린다(뒤에 그린 것이 위)**. 상태(색, 그림자, 변환)는 `save()`/`restore()`로 묶어 다른 그림에 새지 않게 합니다.

**devicePixelRatio(DPR)** 문제: 요즘 휴대폰은 CSS 1px에 실제 화소가 2~3개입니다. 캔버스의 화소 크기(`canvas.width`)를 CSS 크기와 같게 두면 화면이 늘어나 **흐릿**해집니다.

#### 어디에 쓰였나

- `src/render/renderer.ts`의 `resize()`, `draw()`, `drawBoard()`
- `src/render/tilePainter.ts` — 둥근 사각형 경로, 글로우(`shadowBlur`), 숫자 크기 조절 (실제로는 캐시 이미지를 만들 때 한 번만 실행됨, 3.8)
- `src/render/layout.ts` — 보드 크기에서 칸·간격 좌표 계산 (순수 함수)
- `src/render/theme.ts` — 값별 네온 색 (2: 시안, 4: 파랑, 8: 보라 …)

#### 핵심 코드

```ts
// src/render/renderer.ts — resize()
const cssSize = Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
const dpr = window.devicePixelRatio || 1;
const pixels = Math.round(cssSize * dpr);
this.canvas.width = pixels; // 실제 화소 수 = CSS 크기 × DPR
this.canvas.height = pixels;
this.pixelRatio = pixels / cssSize;

// draw()
ctx.setTransform(pr, 0, 0, pr, 0, 0); // 이후로는 CSS 픽셀 단위로 그리면 됨
```

- 크기는 CSS가 정하고(`.board { aspect-ratio: 1 }`), 렌더러는 `ResizeObserver`로 그 크기를 따라갑니다. 레이아웃 계산을 JS와 CSS 두 군데서 하지 않기 위해서입니다.
- `canvas.width`를 바꾸면 캔버스가 **지워집니다.** 그래서 `resize()` 안에서 바로 다시 그립니다(한 프레임 깜빡임 방지).
- 함정: `shadowBlur`는 변환(`setTransform`)의 영향을 **받지 않습니다**. 그래서 글로우 크기에는 직접 `pixelRatio`를 곱합니다.

```ts
// src/render/tilePainter.ts — numberTileArt.paint
ctx.shadowBlur = colors.glow * (look.emphasized ? EMPHASIS_GLOW : 1) * pixelRatio;
```

- `ctx.roundRect`는 오래된 Safari에 없어서 `arcTo`로 둥근 사각형을 직접 만듭니다(`roundRectPath`).
- 확장 지점: 타일 종류별 그림은 `TILE_ART: Record<TileKind, TileArt>`에 등록합니다. 3단계에서 `TileKind`에 `'stone'`을 추가하면 **그림을 등록하기 전까지 컴파일이 실패**하므로 빠뜨릴 수 없습니다. 얼음·저주 표시는 `STATUS_OVERLAYS`에 함수를 추가하면 모든 타일 위에 매 프레임 그려집니다.

#### 연습 과제

1. `resize()`에서 `dpr`을 1로 고정해 보고 휴대폰(또는 개발자 도구의 기기 모드, DPR 3)에서 숫자 가장자리를 비교해 보세요.
2. `numberTileArt.paint`의 `shadowBlur`에서 `pixelRatio`를 빼 보세요. DPR 1 화면과 DPR 3 화면에서 글로우 크기가 어떻게 달라지나요?
3. `STATUS_OVERLAYS`에 "모든 타일 왼쪽 위에 작은 점을 찍는" 오버레이를 추가해 보세요. 3단계 얼음 표시를 미리 연습하는 것입니다.

---

### 3.5 포인터 이벤트와 스와이프 판정

#### 왜 필요한가

예전에는 마우스(`mousedown`)와 터치(`touchstart`)를 따로 처리해야 했습니다. **포인터 이벤트**(`pointerdown/move/up/cancel`)는 마우스·손가락·펜을 하나의 API로 다룹니다.

스와이프 판정에서 신경 쓸 점:

- **거리 임계값**: 살짝 닿은 것(탭)과 미는 것을 구분해야 합니다. 여기서는 24 CSS px.
- **주축(dominant axis)**: 사람은 정확히 수평으로 밀지 않습니다. x·y 중 더 많이 움직인 축을 택합니다. 정확한 대각선은 무시합니다.
- **즉시 발동**: 손가락을 뗄 때까지 기다리지 않고, 임계값을 넘는 순간 바로 방향을 확정합니다. 체감 반응 속도가 확 좋아집니다. 한 제스처에서 한 번만 발동합니다.
- **브라우저 기본 동작 막기**: 밀면 페이지가 스크롤되거나, 당겨서 새로고침되거나, 두 번 탭하면 확대되면 게임이 안 됩니다.

#### 어디에 쓰였나

- `src/input/swipe.ts` — `resolveSwipe(dx, dy, threshold)`, `SwipeTracker` (DOM 없음 → `tests/input.test.ts`)
- `src/input/keys.ts` — 방향키·WASD
- `src/input/index.ts` — `attachInput`: 실제 이벤트 연결, 해제 함수 반환
- `src/ui/style.css` — `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, `body { position: fixed }`

#### 핵심 코드

```ts
// src/input/swipe.ts
export function resolveSwipe(dx: number, dy: number, threshold: number): Direction | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold || ax === ay) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up'; // 화면 좌표는 y가 아래로 증가
}
```

DOM 쪽은 이 순수 로직에 좌표만 넘겨 줍니다.

```ts
// src/input/index.ts
const onPointerDown = (e: PointerEvent): void => {
  if (!e.isPrimary) return; // 두 번째 손가락 무시
  if (e.pointerType === 'mouse' && e.button !== 0) return; // 왼쪽 버튼만
  if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return; // 버튼 탭은 스와이프 아님
  tracker.begin(e.pointerId, e.clientX, e.clientY);
  surface.setPointerCapture(e.pointerId); // 손가락이 영역 밖으로 나가도 계속 추적
  e.preventDefault();
};
```

- **스와이프 영역은 화면 전체**(`main.game`)입니다. 작은 휴대폰에서 보드 밖을 밀어도 동작합니다.
- 스크롤·줌 방지는 CSS `touch-action: none`이 주역이고, 이를 일부만 지키는 브라우저(iOS Safari의 당겨서 새로고침, 핀치 줌)를 위해 `touchmove`(passive: false)와 `gesturestart`에서도 `preventDefault`합니다.
- 키보드는 `event.key`가 아니라 **`event.code`**(물리 키 위치)를 씁니다. 한글 입력 상태에서 W를 누르면 `key`는 `'ㅈ'`이지만 `code`는 `'KeyW'`입니다. 한국어 사용자에게 꼭 필요한 처리입니다.
- 키를 누르고 있을 때의 자동 반복(`e.repeat`)은 무시합니다. 실수로 여러 번 미는 것을 막습니다.

#### 연습 과제

1. 임계값을 보드 크기에 비례하게(예: 보드 너비의 7%) 바꿔 보세요. 태블릿과 작은 휴대폰에서 느낌이 어떻게 달라지나요?
2. "주축이 부축보다 최소 1.5배 커야 인정"하는 규칙을 `resolveSwipe`에 넣고 테스트를 추가해 보세요. 대각선에 가까운 스와이프를 어떻게 다룰지 정하는 게임 디자인 결정입니다.
3. `.game`의 `touch-action: none`을 지우고 휴대폰(또는 기기 모드)에서 아래로 밀어 보세요. 무슨 일이 생기나요?

---

### 3.6 애니메이션 중에 들어온 입력 처리

#### 왜 필요한가

빠른 플레이어는 애니메이션(약 0.3초)이 끝나기 전에 다음 스와이프를 합니다. 선택지는 셋입니다.

| 방식                          | 장점                   | 단점                                                 |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| 애니메이션 중 입력 **무시**   | 구현 쉬움              | 입력이 씹힘. 가장 나쁜 손맛                          |
| 입력 **버퍼**(하나 저장)      | 애니메이션을 끝까지 봄 | 연속 입력 시 반응이 한 박자씩 밀림, 대기열 관리 필요 |
| 현재 애니메이션 **빨리 감기** | 즉시 반응, 상태 단순   | 연타 시 중간 애니메이션이 생략됨                     |

이 프로젝트는 **빨리 감기**를 골랐습니다. 2048은 빠른 연타가 흔한 게임이고, 입력이 들어온 순간 반응하는 것이 가장 중요합니다.

#### 어디에 쓰였나

- `src/render/viewModel.ts`의 `apply()` 첫 줄이 `this.finish()`
- `src/game/controller.ts` — 코어 상태는 입력이 오면 **즉시** 갱신됩니다. 애니메이션을 기다리지 않습니다.

#### 핵심 코드

```ts
// src/render/viewModel.ts
apply(events: readonly TurnEvent[], now: number): void {
  this.finish();   // 이전 턴이 덜 끝났으면 끝 상태로 즉시 이동
  // ... 새 턴 일정 짜기
}

finish(): void {
  const end = Number.POSITIVE_INFINITY;
  for (const [id, s] of this.sprites) {
    if (Number.isFinite(s.removeAt)) { this.sprites.delete(id); continue; } // 사라질 예정이던 것 제거
    s.row = still(sample(s.row, end));   // 트윈이 절대 시간 기반이라 "무한대 시각의 값" = 끝값
    s.col = still(sample(s.col, end));
    s.scale = still(sample(s.scale, end));
  }
}
```

**왜 화면이 어긋나지(desync) 않는가**: 진실은 언제나 코어 상태 하나이고, 뷰 모델은 "이전 턴을 끝까지 적용한 상태"에서 다음 이벤트를 받습니다. 이벤트는 그 상태를 기준으로 만들어졌으므로 항상 맞아떨어집니다. 테스트가 400턴 동안 15ms 간격 연타를 섞어 이것을 확인합니다.

> 개발 중 실제로 겪은 버그: 처음에는 `finish()`가 `update(Infinity)`를 불러 "`removeAt <= now`인 스프라이트 제거"를 재사용했습니다.
> 그런데 "사라지지 않음"을 `removeAt = Infinity`로 표현했기 때문에 `Infinity <= Infinity`가 참이 되어 **모든 타일이 지워졌습니다.**
> 뷰 모델 테스트가 즉시 잡아냈고, 무한대를 "특별한 값"으로 쓸 때는 비교 연산을 조심해야 한다는 교훈을 남겼습니다.

만약의 경우(뷰 모델이 모르는 타일 id를 받는 등)에도 게임이 멈추지 않도록 렌더러는 예외를 잡아 `syncTo(state)`로 화면을 코어 상태에 맞춥니다(`BoardRenderer.playTurn`).

#### 연습 과제

1. 빨리 감기 대신 **입력 버퍼**를 구현해 보세요: 애니메이션 중이면 방향 하나를 저장했다가 끝나면 실행. (`renderer.isAnimating()`과 `setTimeout` 또는 프레임 콜백 활용) 두 방식을 연타로 비교해 보세요.
2. 생각해 보기: 빨리 감기를 쓰면 5단계의 "합체 파티클"은 언제 만들어야 할까요? 이벤트를 받은 순간? 미끄러짐이 끝난 순간? 빨리 감기될 때는?

---

### 3.7 컨트롤러와 HUD: 얇은 접착층

#### 왜 필요한가

입력, 코어, 렌더러, HUD를 `main.ts`에서 직접 엮으면 금방 스파게티가 됩니다. 그렇다고 큰 "게임 매니저" 클래스를 만들면 테스트하기 어렵습니다.
컨트롤러는 **상태를 들고, 코어를 부르고, 결과를 나눠 주는 일만** 합니다. 표시 계층은 **인터페이스**로만 알기 때문에 테스트에서는 가짜(fake) 객체를 넣을 수 있습니다.

#### 어디에 쓰였나

- `src/game/controller.ts` — `GameController`, `BoardDisplay`, `HudDisplay`
- `src/ui/hud.ts` — `HudDisplay`의 실제 구현 (DOM)
- `src/ui/gameScreen.ts`, `src/ui/style.css` — 화면 구성과 반응형 레이아웃
- `tests/controller.test.ts` — 가짜 보드/HUD로 점수, 최고 기록, 게임 오버, 새 게임 확인

#### 핵심 코드

```ts
// src/game/controller.ts
export interface BoardDisplay {
  startGame(result: TurnResult): void;
  playTurn(result: TurnResult): void;
}

handleDirection(direction: Direction): boolean {
  if (!this.state || this.state.over) return false;
  const result = move(this.state, direction, this.rules);
  if (!result.moved) return false;
  this.state = result.state;          // 진실은 즉시 갱신
  board.playTurn(result);             // 화면은 이벤트를 재생
  // score/gameOver 이벤트를 보고 HUD 갱신, 최고 기록 비교
}
```

```ts
// src/main.ts — 조립만 한다
const renderer = new BoardRenderer(screen.canvas, DEFAULT_RULES.boardSize);
const controller = new GameController({ board: renderer, hud: screen.hud });
attachInput({
  surface: screen.surface,
  onDirection: (d) => {
    controller.handleDirection(d);
  },
});
controller.newGame();
```

레이아웃 요점 (`src/ui/style.css`):

- 보드 폭 = `min(화면 폭, 520px, 화면 높이 - HUD 높이)`. 360×640 휴대폰에서는 폭에 맞고, 데스크톱에서는 520px로 가운데 정렬됩니다.
- `100dvh`(동적 뷰포트 높이: 모바일 주소창을 뺀 실제 높이)를 쓰고, 지원하지 않는 브라우저를 위해 바로 앞 줄에 `100vh`를 둡니다. 모르는 단위가 든 선언은 무시되므로 자연스러운 대체가 됩니다.
- `env(safe-area-inset-*)`로 노치·홈 바 영역을 피합니다(`viewport-fit=cover`와 짝).
- 가로로 눕힌 휴대폰에서는 HUD를 보드 옆으로 옮깁니다(미디어 쿼리).
- 게임 오버 오버레이는 CSS `animation-delay`로 마지막 이동 애니메이션이 끝난 뒤 나타납니다.

#### 연습 과제

1. `tests/controller.test.ts`의 `FakeHud`처럼, 이벤트를 콘솔에 한국어로 찍는 `LoggingBoard implements BoardDisplay`를 만들어 렌더러 대신 넣어 보세요. 화면 없이도 게임이 돌아가는 것을 확인합니다.
2. 4단계를 미리 연습: `onBestChange`에서 `localStorage`에 최고 기록을 저장하고, `initialBest`로 불러오게 해 보세요.
3. 개발자 도구 기기 모드에서 320×568, 360×640, 768×1024, 가로 640×360을 차례로 확인하고, 보드가 잘리지 않는지 보세요.

---

### 3.8 글로우 스프라이트 캐시

#### 왜 필요한가

네온 느낌의 핵심인 글로우는 Canvas의 `shadowBlur`로 그립니다. 그런데 `shadowBlur`는 **가장 비싼 2D 연산 중 하나**입니다. 도형을 그릴 때마다 그 주변을 가우시안 블러로 번지게 계산해야 하기 때문입니다.
타일 16개 × (몸통 + 글자) × 초당 60프레임이면 블러를 초당 약 2,000번 계산합니다. 고성능 기기에서는 괜찮아도 저가형 휴대폰에서는 프레임이 떨어지고, 5단계에서 파티클 수백 개가 더해지면 더 심해집니다.

해결책은 고전적인 **스프라이트 캐시**입니다. 같은 모습(값 2인 숫자 타일, 글로우 강조 없음 …)은 몇 번을 그려도 결과가 같으므로,

1. 처음 필요할 때 **화면 밖 캔버스(offscreen canvas)** 에 글로우까지 한 번 그려 두고,
2. 매 프레임에는 그 이미지를 `drawImage`로 **복사**만 합니다. 복사는 블러보다 훨씬 쌉니다.

크기 변화(생성·합체 팝)는 이미지를 다시 그리지 않고 `drawImage`의 대상 크기로 처리합니다.

#### 어디에 쓰였나

- `src/render/spriteCache.ts` — `TileSpriteCache`: `configure(cell, radius, pixelRatio)`, `get(look)`
- `src/render/tilePainter.ts` — `TileArt.paint`(이미지 만들기), `TileArt.margin`(글로우가 칸 밖으로 번지는 거리)
- `src/render/renderer.ts` — `resize()`에서 `configure`, `draw()`에서 `drawImage`
- `tests/spriteCache.test.ts` — 같은 모습은 한 번만 그림, 크기·DPR이 바뀌면 무효화, 이미지 크기 계산, 개수 상한

#### 핵심 코드

```ts
// src/render/spriteCache.ts
get(look: TileLook): CachedTile {
  const key = `${look.kind}|${look.value}|${look.emphasized ? 1 : 0}`; // 모습을 결정하는 것만 키로
  let entry = this.entries.get(key);
  if (!entry) {
    entry = this.render(look);   // 여기서만 shadowBlur가 실행됨
    this.entries.set(key, entry);
  }
  return entry;
}

private render(look: TileLook): CachedTile {
  const margin = art.margin(look, this.theme);   // 글로우가 잘리지 않게 여백
  const cssSize = this.cell + margin * 2;
  const pixels = Math.ceil(cssSize * this.pixelRatio); // 화면과 같은 해상도로 → 흐릿하지 않음
  const canvas = this.createCanvas(pixels, pixels);
  // ... setTransform(scale) 후 art.paint(...)
}
```

```ts
// src/render/renderer.ts — draw()
const sprite = this.sprites.get({
  kind: frame.kind,
  value: frame.value,
  emphasized: frame.popping,
});
const size = sprite.cssSize * frame.scale;
ctx.drawImage(sprite.image, c.x - size / 2, c.y - size / 2, size, size);
```

**캐시 무효화**는 캐시 설계에서 가장 중요한 부분입니다. 이미지는 "칸 크기 × DPR"에 맞춰 만들었으므로, 화면 크기나 DPR이 바뀌면 전부 버려야 합니다. 그래서 `resize()`가 매번 `configure`를 부르고, 값이 같으면 아무것도 하지 않고, 다르면 비웁니다.

```ts
configure(cell: number, radius: number, pixelRatio: number): void {
  if (cell === this.cell && radius === this.radius && pixelRatio === this.pixelRatio) return;
  // ...
  this.entries.clear();
}
```

브라우저 검사에서 `shadowBlur` 대입 횟수를 세어 보면, 이미 본 모습들로만 이뤄진 턴 하나(약 18프레임)를 재생하는 동안 **0번**입니다. 캐시 전에는 프레임마다 타일 수 × 2번이었습니다.

주의할 점:

- **무엇을 키에 넣는가**: 모습을 바꾸는 것은 전부 넣어야 하고, 매 프레임 바뀌는 것(위치, 크기)은 넣으면 안 됩니다. 크기까지 키에 넣으면 팝 애니메이션 동안 프레임마다 새 이미지를 만들게 되어 캐시가 의미 없어집니다.
- **메모리**: DPR 3에서 이미지 하나가 수백 KB입니다. 그래서 개수 상한(`maxEntries`, 64)을 넘으면 비웁니다. 이 게임에서 동시에 쓰는 모습은 보통 10여 개라 충분합니다.
- **얼음·저주처럼 상태 표시**는 지금은 매 프레임 그리는 오버레이입니다. 이것도 비싸지면 `TileLook`에 상태를 넣어 함께 캐시하면 됩니다.
- 확대 중(팝, 최대 약 1.1배)에는 비트맵을 살짝 늘려 그리므로 아주 약간 부드러워지지만, 170ms 동안이라 눈에 띄지 않습니다.

#### 연습 과제

1. `renderer.ts`의 `draw()`에서 캐시를 쓰지 않고 매번 `TILE_ART[kind].paint`를 부르도록 바꿔, 개발자 도구 Performance 탭(CPU 4× 감속)으로 프레임 시간을 비교해 보세요.
2. 캐시 키에서 `emphasized`를 빼 보세요. 합체 팝 때 무엇이 달라지나요?
3. `get()`이 새 이미지를 만들 때마다 `console.count('sprite')`를 찍어 보고, 창 크기를 바꾸거나 브라우저 확대(Ctrl +)를 했을 때 다시 만들어지는지 확인하세요.

---

### 3.9 주입 가능한 시계와 디버그 훅

#### 왜 필요한가

애니메이션 코드가 `performance.now()`와 `requestAnimationFrame`을 **직접** 부르면 두 가지가 어려워집니다.

- **테스트**: "50ms 뒤 타일은 어디에 있어야 한다"를 확인하려면 진짜로 50ms를 기다려야 하고, 결과도 기기 속도에 따라 흔들립니다.
- **디버깅·자동 검사**: 브라우저 자동화로 "애니메이션 한가운데"를 캡처하려 해도 정확한 순간을 잡을 수 없습니다.

해결책은 **의존성 주입**입니다. "시간을 알려 주고 다음 프레임을 예약해 주는 것"을 인터페이스(`FrameClock`)로 만들어 바깥에서 넣어 줍니다. 실제 게임에는 브라우저 시계를, 테스트에는 **손으로 돌리는 시계**를 넣습니다. 코드는 어느 쪽인지 모릅니다.

디버그 훅은 같은 아이디어를 브라우저에서 쓰는 것입니다. 주소에 `?debug`를 붙이면 멈췄다가 한 프레임씩 넘길 수 있는 시계로 게임이 시작되고, 콘솔에서 `window.__neonRift`로 게임을 조작할 수 있습니다. `?seed=42`는 같은 판을 다시 시작합니다(1단계의 시드 RNG 덕분).

#### 어디에 쓰였나

- `src/render/clock.ts` — `FrameClock`, `browserClock`, `ManualClock`(테스트용), `PausableClock`(디버그용: 평소엔 실제 시계, 멈추면 손으로)
- `src/render/loop.ts`, `src/render/renderer.ts` — 시계를 생성자 인자로 받음 (`options.clock`, 기본값은 `browserClock`)
- `src/game/debug.ts` — `readLaunchParams`, `createDebugApi`
- `src/main.ts` — `?debug`일 때만 `PausableClock`을 쓰고 `window.__neonRift`를 연결. 플래그가 없으면 아무것도 노출하지 않음
- `tests/clock.test.ts`, `tests/debug.test.ts` — 손으로 돌리는 시계로 애니메이션을 정확히 재생

#### 핵심 코드

```ts
// src/render/clock.ts
export interface FrameClock {
  now(): number;
  requestFrame(callback: FrameCallback): number;
  cancelFrame(handle: number): void;
}

export const browserClock: FrameClock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => {
    cancelAnimationFrame(handle);
  },
};

export class ManualClock implements FrameClock {
  // ...
  advance(ms: number, frameMs = FRAME_MS): void {
    const end = this.time + Math.max(0, ms);
    do {
      this.time = Math.min(end, this.time + frameMs);
      this.flush(); // 예약된 프레임 콜백 실행
    } while (this.time < end);
  }
}
```

테스트에서는 실제로 기다리지 않고 시간을 "건너뜁니다".

```ts
// tests/clock.test.ts
const clock = new ManualClock(5000);
const loop = new AnimationLoop(clock, (now) => {
  /* view.update + 기록 */
});
view.apply(move(state, 'left').events, clock.now());
loop.invalidate();
clock.advance(T.slide / 2, T.slide / 2); // 정확히 미끄러짐 절반 시점
expect(frames.at(-1)).toEqual({ now: 5000 + T.slide / 2, tiles: 2 });
```

브라우저에서는:

```js
// 주소: .../2048-project/?debug&seed=42
__neonRift.grid(); // [[0,0,0,0],[0,0,0,0],[0,2,0,0],[0,2,0,0]]
__neonRift.move('up'); // 스와이프와 똑같이 컨트롤러를 거침
__neonRift.advance(55); // 실제 시계를 멈추고 55ms만큼 진행 → 미끄러지는 중간 모습
__neonRift.settle(); // 남은 애니메이션 즉시 완료
__neonRift.state(); // 코어 상태의 복사본(평범한 데이터)
__neonRift.resume(); // 실제 시계로 복귀
```

브라우저 검사 스크립트는 코어를 따로 번들해서 "시드 42에서 이 순서로 밀면 보드는 이것"을 독립적으로 계산하고, 키보드·터치·마우스 입력 후의 `__neonRift.grid()`와 칸 하나까지 비교합니다. 그래서 검사가 "점수가 바뀌었다" 수준이 아니라 **정확한 결과**를 확인합니다.

보안·배포 관점: 훅은 `?debug`가 있을 때만 붙습니다. 이 게임은 점수를 서버에 보내지 않으므로 치트 걱정은 없지만, 평소 사용자에게 내부 API를 노출하지 않는 것이 기본 예의입니다.

#### 연습 과제

1. `?debug&seed=7`로 열고 콘솔에서 `__neonRift.move('left'); __neonRift.advance(30)`, `advance(30)` … 을 반복하며 미끄러짐을 한 프레임씩 관찰해 보세요.
2. `tests/clock.test.ts`에 테스트를 추가해 보세요: 합체가 있는 턴에서 `T.slide` 직후 프레임에는 합체 결과 타일만 있고 원본 두 개는 없어야 합니다.
3. 생각해 보기: 시계를 주입하지 않고 Playwright의 `page.clock`(가짜 시계)만으로 같은 일을 할 수 있을까요? 이 프로젝트에서 써 봤을 때 `requestAnimationFrame` 시각과 `performance.now()`가 어긋나 정확한 프레임을 잡기 어려웠습니다. 직접 만든 시계가 무엇을 보장해 주나요?

---

## 4. 설계 결정 기록

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

### D10. 애니메이션은 뷰 모델(`BoardView`)이 이벤트를 재생해서 만든다

- **왜**: 코어 상태는 턴 단위로 순간 이동하므로, 중간 과정은 렌더러 쪽의 별도 모델이 맡습니다. 규칙을 다시 계산하지 않고 이벤트만 일정표로 바꾸므로 규칙이 바뀌어도(3단계) 렌더러는 새 이벤트 종류만 배우면 됩니다. 시간을 인자로 받는 순수 클래스라 Node에서 테스트합니다.
- **대가**: 상태가 두 벌(코어, 뷰)이 됩니다. 어긋남은 "다 재생된 뷰 == 코어 상태" 테스트로 막고, 실행 중 어긋나면 `syncTo`로 복구합니다.

### D11. 트윈은 절대 시간(시작 시각 + 길이)으로 정의

- **왜**: 아무 시각의 값이나 바로 계산할 수 있어 테스트가 쉽고, 빨리 감기가 "무한대 시각의 값"으로 끝납니다. 프레임이 빠지거나 탭이 숨었다 돌아와도 애니메이션이 늦어지지 않습니다.
- **대가**: 매 프레임 적분하는 물리(파티클)에는 맞지 않아, 그런 효과는 `Effect.update(dt)`로 따로 받습니다.

### D12. 애니메이션 중 입력은 "빨리 감기"

- **왜**: 연타가 잦은 게임이라 즉시 반응이 가장 중요합니다. 코어는 즉시 갱신되고, 뷰는 이전 턴을 끝 상태로 건너뛴 뒤 새 턴을 재생합니다. 대기열이 없어 상태가 단순합니다.
- **대가**: 아주 빠르게 연타하면 중간 애니메이션 일부가 생략됩니다. 5단계에서 연출을 얹을 때 "빨리 감기된 턴의 효과를 어떻게 처리할지"를 정해야 합니다.

### D13. 렌더 루프는 필요할 때만 돈다 (on-demand rAF)

- **왜**: 퍼즐 게임은 대부분의 시간 동안 화면이 멈춰 있습니다. 움직이는 것이 있을 때만 프레임을 요청하면 휴대폰 배터리와 발열을 아낍니다.
- **대가**: "무언가 바뀌면 `invalidate()`를 부른다"는 규칙을 지켜야 합니다. 효과(`addEffect`)와 턴 재생(`playTurn`), `settle()`은 스스로 부르고, 리사이즈는 즉시 다시 그립니다.

### D14. 화면 크기는 CSS가 정하고 캔버스는 따라간다

- **왜**: 반응형 레이아웃(safe-area, `dvh`, 가로 모드)은 CSS가 훨씬 잘합니다. 렌더러는 `ResizeObserver`로 실제 크기를 받아 화소 수(×DPR)만 맞춥니다. HUD를 DOM으로 둔 것도 같은 이유입니다: 글자 렌더링, 접근성(버튼 포커스), 레이아웃을 브라우저에 맡깁니다.
- **대가**: 보드 모서리 둥글기처럼 캔버스와 CSS가 같은 값을 알아야 하는 곳이 생깁니다(`BOARD_RADIUS_RATIO` ↔ `.board { border-radius: 5% }`). 색상도 `theme.ts`와 `style.css`에 나뉘어 있어 함께 고쳐야 합니다.

### D15. 타일 그리기는 종류별 등록표 + 상태 오버레이 목록

- **왜**: 3단계의 돌/와일드 타일, 얼음/저주 표시를 렌더러 수정 없이 함수 등록으로 추가하기 위해서입니다. `Record<TileKind, TilePainter>`라서 종류를 추가하고 painter를 빠뜨리면 컴파일 오류가 납니다.
- **열린 문제**: `merge` 이벤트에는 결과 타일의 `kind`가 없어 뷰 모델이 `'number'`로 가정합니다. 3단계에서 와일드 합체 등이 생기면 이벤트에 `kind`를 추가해야 합니다. 상태(얼음·저주)가 바뀌는 이벤트도 3단계에서 정의합니다.

### D16. 스와이프는 화면 전체에서, 임계값을 넘는 순간 발동

- **왜**: 작은 휴대폰에서 보드 밖을 밀어도 동작해야 편합니다. 손가락을 뗄 때까지 기다리지 않으면 반응이 한 박자 빨라집니다. 버튼 위에서 시작한 포인터는 스와이프로 보지 않아 탭과 충돌하지 않습니다.
- **대가**: 나중에 보드 밖에 드래그가 필요한 UI(예: 유물 카드 끌기)가 생기면 `data-no-swipe` 속성으로 제외해야 합니다.

### D17. 키보드는 `event.code` 기준, 자동 반복 무시

- **왜**: 한글 입력 상태에서도 WASD가 동작하게(`key`는 'ㅈ', `code`는 'KeyW'). 키를 누르고 있을 때 여러 칸 밀리는 실수를 막습니다.
- **대가**: AZERTY 같은 다른 자판에서는 WASD 위치의 물리 키(ZQSD)가 매핑됩니다. 이 경우엔 오히려 바람직한 동작입니다.

### D18. 최고 기록은 아직 메모리에만

- **왜**: 저장은 4단계 범위입니다. 컨트롤러에 `initialBest`와 `onBestChange`를 미리 열어 두어, 4단계에서는 저장 모듈을 연결하기만 하면 됩니다.
- **대가**: 지금은 새로고침하면 최고 기록이 사라집니다.

### D19. 글로우는 타일 모습별로 미리 그려 캐시 (`TileSpriteCache`)

- **왜**: `shadowBlur`는 저가형 휴대폰에서 프레임을 떨어뜨릴 가능성이 가장 큰 연산이고, 5단계 파티클이 더해지면 여유가 더 줄어듭니다. 모습(종류·값·강조)이 같으면 결과도 같으므로 한 번만 그리고 `drawImage`로 복사합니다.
- **대가**: 메모리(DPR 3에서 이미지당 수백 KB, 상한 64개)와 무효화 규칙(크기·DPR 변경 시 비우기)을 관리해야 합니다. 상태 오버레이는 아직 매 프레임 그립니다. 팝 중 확대는 비트맵 확대라 아주 약간 부드러워집니다.

### D20. 시간과 프레임 예약은 주입한다 (`FrameClock`)

- **왜**: 렌더러·루프가 `performance.now()`/`requestAnimationFrame`을 직접 부르지 않으면, 테스트와 디버그 도구가 시간을 정확히 한 프레임씩 진행시킬 수 있습니다. 애니메이션 검증이 "기다려 보고 대충 확인"에서 "이 시각엔 정확히 이 값"이 됩니다.
- **대가**: 생성자 인자가 하나 늘고, `PausableClock`처럼 실제 시계와 수동 시계를 오가는 코드가 필요합니다. `ResizeObserver`와 `devicePixelRatio`는 아직 직접 씁니다(시간과 무관해서).

### D21. 디버그 훅은 `?debug`일 때만, 시드는 `?seed=`로

- **왜**: 자동 브라우저 검사를 결정적으로 만들고(고정 시드 + 정확한 기대 보드 + 멈춘 시계), 개발 중 버그 재현을 쉽게 하기 위해서입니다. 플래그가 없으면 `window`에 아무것도 붙지 않습니다.
- **대가**: 디버그 API(`state`, `grid`, `move`, `advance`, `settle` …)도 공개 계약이 되므로 바꿀 때 검사 스크립트를 함께 고쳐야 합니다. `?seed=`는 첫 판에만 적용되고 "새 게임"은 무작위 시드를 씁니다.

---

## 부록: 자주 쓰는 명령어

| 명령                 | 하는 일                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `npm install`        | 의존성 설치                                                                                       |
| `npm run dev`        | 개발 서버 (저장하면 즉시 반영)                                                                    |
| `npm run test`       | 테스트 한 번 실행                                                                                 |
| `npm run test:watch` | 파일이 바뀔 때마다 테스트 다시 실행                                                               |
| `npm run lint`       | ESLint 검사                                                                                       |
| `npm run format`     | Prettier로 전체 코드 정리                                                                         |
| `npm run build`      | 타입 검사 + 배포용 빌드 (`dist/`)                                                                 |
| `npm run preview`    | 빌드 결과를 로컬에서 미리 보기 (`http://localhost:4173/2048-project/`, 디버그는 `?debug&seed=42`) |
