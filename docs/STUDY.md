# Neon Rift 학습 노트

이 문서는 이 프로젝트를 만들면서 **게임 개발을 공부하기 위한 교재**입니다.
변경 기록이 아니라, "왜 이렇게 만들었는가"를 이해하고 직접 손으로 연습해 볼 수 있도록 쓰여 있습니다.
단계가 끝날 때마다 새 장(章)이 추가되고, 앞 장의 내용도 바뀐 코드에 맞게 고쳐집니다.

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
- [4. 3a단계: 로그라이크 코어](#4-3a단계-로그라이크-코어)
  - [4.1 턴 단계(phase)와 인과 관계](#41-턴-단계phase와-인과-관계)
  - [4.2 방해 타일: 규칙을 함수와 매개변수로](#42-방해-타일-규칙을-함수와-매개변수로)
  - [4.3 상태 기계: 런과 무한 모드](#43-상태-기계-런과-무한-모드)
  - [4.4 데이터 주도 설계와 훅 시스템](#44-데이터-주도-설계와-훅-시스템)
  - [4.5 로그라이크 유물과 시너지 설계](#45-로그라이크-유물과-시너지-설계)
  - [4.6 보스 규칙과 "계산할 수 있는 정보는 보여 준다"](#46-보스-규칙과-계산할-수-있는-정보는-보여-준다)
  - [4.7 시뮬레이션으로 밸런스 잡기](#47-시뮬레이션으로-밸런스-잡기)
- [5. 3b단계: 로그라이크를 화면에](#5-3b단계-로그라이크를-화면에)
  - [5.1 상태 기계로 화면 흐름 만들기](#51-상태-기계로-화면-흐름-만들기)
  - [5.2 컨트롤러와 표시 계층 분리: 인터페이스와 가짜 객체](#52-컨트롤러와-표시-계층-분리-인터페이스와-가짜-객체)
  - [5.3 DOM 오버레이와 캔버스: 무엇을 어디에](#53-dom-오버레이와-캔버스-무엇을-어디에)
  - [5.4 대상 지정과 모달 입력 모드](#54-대상-지정과-모달-입력-모드)
  - [5.5 계산할 수 있는 정보는 화면에](#55-계산할-수-있는-정보는-화면에)
  - [5.6 실제 브라우저로 흐름 검사하기](#56-실제-브라우저로-흐름-검사하기)
- [6. 4단계: 저장, 온보딩, 오늘의 도전, 밸런스](#6-4단계-저장-온보딩-오늘의-도전-밸런스)
  - [6.1 버전 있는 저장: 스키마, 검증, 마이그레이션, 주입한 저장소](#61-버전-있는-저장-스키마-검증-마이그레이션-주입한-저장소)
  - [6.2 결정적 상태 이어 하기](#62-결정적-상태-이어-하기)
  - [6.3 온보딩: 플레이로 가르치기, 한 번에 하나씩](#63-온보딩-플레이로-가르치기-한-번에-하나씩)
  - [6.4 시드로 만드는 오늘의 도전](#64-시드로-만드는-오늘의-도전)
  - [6.5 밸런스 방법론: 이번 조정의 전후 숫자](#65-밸런스-방법론-이번-조정의-전후-숫자)
  - [6.6 화면이 서로 어긋나지 않게: 이번 단계의 UX 수정](#66-화면이-서로-어긋나지-않게-이번-단계의-ux-수정)
- [7. 5단계: 손맛(Juice)](#7-5단계-손맛juice)
  - [7.1 Juice란, 그리고 "피드백은 중요도에 비례한다"](#71-juice란-그리고-피드백은-중요도에-비례한다)
  - [7.2 파티클 시스템과 오브젝트 풀](#72-파티클-시스템과-오브젝트-풀)
  - [7.3 트라우마 기반 화면 흔들림](#73-트라우마-기반-화면-흔들림)
  - [7.4 스쿼시 & 스트레치, 예비 동작, 엇갈림](#74-스쿼시--스트레치-예비-동작-엇갈림)
  - [7.5 히트스톱: 입력을 막지 않는 멈춤](#75-히트스톱-입력을-막지-않는-멈춤)
  - [7.6 소리 합성 기초와 파라미터 배열](#76-소리-합성-기초와-파라미터-배열)
  - [7.7 음계로 올라가는 콤보 음높이](#77-음계로-올라가는-콤보-음높이)
  - [7.8 모바일 오디오 잠금 해제와 소리 관리](#78-모바일-오디오-잠금-해제와-소리-관리)
  - [7.9 진동: 지원 현실](#79-진동-지원-현실)
  - [7.10 접근성: 움직임 줄이기](#710-접근성-움직임-줄이기)
  - [7.11 프레임 시간 측정과 성능 예산](#711-프레임-시간-측정과-성능-예산)
  - [7.12 연출을 눈으로 검사하기: 고정 시드 + 시간 단계 + 밀착 인화](#712-연출을-눈으로-검사하기-고정-시드--시간-단계--밀착-인화)
- [8. 6단계: 마감 — 설치, 배포, 검증, 균형, 소개](#8-6단계-마감--설치-배포-검증-균형-소개)
  - [8.1 웹 앱 매니페스트와 코드로 그린 아이콘](#81-웹-앱-매니페스트와-코드로-그린-아이콘)
  - [8.2 서비스 워커 생명주기와 프리캐시](#82-서비스-워커-생명주기와-프리캐시)
  - [8.3 업데이트 전략: 플레이어가 고를 때만](#83-업데이트-전략-플레이어가-고를-때만)
  - [8.4 CI/CD: GitHub Actions와 Pages](#84-cicd-github-actions와-pages)
  - [8.5 e2e 테스트: 단위 테스트와 무엇이 다르고, 어떻게 결정적으로 만드나](#85-e2e-테스트-단위-테스트와-무엇이-다르고-어떻게-결정적으로-만드나)
  - [8.6 유물 밸런스 2차 조정: 전후 숫자](#86-유물-밸런스-2차-조정-전후-숫자)
  - [8.7 포트폴리오 README 쓰는 법](#87-포트폴리오-readme-쓰는-법)
- [9. A단계: 판타지 개편 시안 — 교체 가능한 테마와 코드로 그린 채색 필사본](#9-a단계-판타지-개편-시안--교체-가능한-테마와-코드로-그린-채색-필사본)
  - [9.1 테마를 전략 객체로: 색이 아니라 "화가"를 바꾼다](#91-테마를-전략-객체로-색이-아니라-화가를-바꾼다)
  - [9.2 CSS 사용자 정의 속성과 `data-theme`](#92-css-사용자-정의-속성과-data-theme)
  - [9.3 Canvas·SVG로 그리는 채색 필사본: 안료 규율, 장식 어휘, 실루엣](#93-canvassvg로-그리는-채색-필사본-안료-규율-장식-어휘-실루엣)
  - [9.4 적응형 장식 띠: 정사각형이 아닌 판](#94-적응형-장식-띠-정사각형이-아닌-판)
  - [9.5 밝은 바탕과 어두운 바탕의 연출: 가산 혼합 vs 일반 혼합](#95-밝은-바탕과-어두운-바탕의-연출-가산-혼합-vs-일반-혼합)
  - [9.6 시안(수직 슬라이스)과 미술 방향 반복](#96-시안수직-슬라이스과-미술-방향-반복)
- [10. 마무리: 전체 지도, 읽는 순서, 확장 과제](#10-마무리-전체-지도-읽는-순서-확장-과제)
  - [10.1 개념 지도: 무엇이 어디에 있나](#101-개념-지도-무엇이-어디에-있나)
  - [10.2 코드 읽는 순서](#102-코드-읽는-순서)
  - [10.3 확장 과제](#103-확장-과제)
- [11. 설계 결정 기록](#11-설계-결정-기록)
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
                                                                                    └──▶ 저장 (save/): 단계마다 런 전체를 저장
```

- **입력 계층**은 "어느 방향으로 밀었는가"만 알아내서 `Direction` 하나로 바꿉니다. 손가락 좌표나 키 코드는 코어까지 내려가지 않습니다.
- **컨트롤러**(`src/game/runController.ts`)는 현재 런 상태를 들고 있다가, 방향이 들어오면 코어에 넘기고 결과를 렌더러와 화면(DOM)에 나눠 줍니다. 규칙은 판단하지 않는 얇은 접착층이고, 지금 어떤 화면인지(메뉴·진행·대상 지정·유물 선택·결과)를 상태 기계로 관리합니다(5.1장).
- **코어**는 현재 상태와 방향을 받아 **새 상태**와 **이벤트 목록**을 돌려줍니다. 화면, 시간, 애니메이션을 전혀 모릅니다. 3a단계부터 이벤트는 **단계(phase)** 로 묶여 나옵니다(미끄러짐 → 돌 파괴 → 보스 → 생성 → 마무리, 4.1장).
- **렌더 계층**은 이벤트 목록("3번 타일이 (0,3)에서 (0,1)로 이동", "1·2번이 합쳐져 5번 생성"…)을 읽어 그대로 애니메이션으로 재생합니다. 단계는 하나씩 차례로, 한 단계 안의 이벤트는 동시에 재생합니다. **HUD**는 `score`·`gameOver` 같은 이벤트를 보고 숫자와 오버레이를 바꿉니다.
- **저장 계층**(`src/save/`)은 상태 객체를 JSON으로 저장합니다. 상태가 평범한 데이터이기 때문에 가능한 일입니다. 컨트롤러가 한 단계(이동·유물 사용·유물 선택)를 처리할 때마다 진행 중인 런을 저장하고, 다시 열면 RNG까지 그대로 이어집니다(6.1~6.2장).

이 구조의 핵심은 **"규칙을 판단하는 곳은 코어 단 한 곳"** 이라는 점입니다. 렌더러는 규칙을 다시 계산하지 않고, 코어가 알려준 사실만 보여 줍니다.

로그라이크 모드에서는 컨트롤러와 보드 사이에 **런 상태 기계**(`src/core/run.ts`)가 한 겹 더 들어갑니다. `runMove(run, 'left')`가 `{ run, phases, events }`를 돌려주고, 화면(3b단계)은 `run.status`를 보고 "유물 선택", "승리", "실패" 화면을 고릅니다. 런 상태를 화면용 모델(HUD 숫자, 보드 표시, 한국어 문구)로 바꾸는 일은 프레젠터 `src/game/runView.ts`가 맡습니다(5.2장).

```
 방향 ──▶ runMove(run, dir) ──▶ playTurn(보드, 유물, 방해 수치, 보스) ──▶ 단계별 이벤트
                │                                                          │
                └── 목표 판정·유물 제시·실패 판정(judge) ◀───────────────────┘
```

### 1.2 폴더별 역할

| 폴더          | 역할                                                                                                                            | 상태                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/core/`   | 순수 게임 로직. DOM 없음, 테스트 대상                                                                                           | 1단계 ✔, 3a단계에서 로그라이크 계층 추가        |
| `src/render/` | Canvas 보드 렌더러, 트윈/이징, 뷰 모델, 보드 표시·기본 효과, 이벤트 큐, 파티클·흔들림·히트스톱, 테마(`themes.ts`, `storybook/`) | 2단계 ✔, 3b단계 표시·큐, 5단계 연출, A단계 테마 |
| `src/input/`  | 포인터 스와이프·탭 + 키보드(방향, Esc), 진동(`haptics.ts`)                                                                      | 2단계 ✔, 3b단계 탭·Esc, 5단계 진동              |
| `src/ui/`     | DOM: 메뉴, HUD, 보스 줄, 유물 버튼·칩, 안내, 유물 선택, 일시정지, 결과, 게임 방법, 설정                                         | 3b단계 ✔, 4단계에서 도움말·설정·확인 추가       |
| `src/game/`   | 런 컨트롤러(화면 상태 기계), 프레젠터, 오늘의 도전, 디버그 훅, 연출 감독(`feedback.ts`)                                         | 3b단계 ✔, 4단계 저장·도전, 5단계 연출           |
| `src/audio/`  | WebAudio로 합성한 효과음 (직접 쓴 신시사이저, 소리 표, 재생 결정 엔진)                                                          | 5단계 ✔                                         |
| `src/save/`   | localStorage 저장(최고 기록, 본 안내, 설정, 오늘의 도전 기록, 진행 중인 런)                                                     | 4단계 ✔                                         |
| `src/pwa/`    | 서비스 워커(`sw.ts`), 캐시 결정(`cachePlan.ts`), 업데이트 흐름(`register.ts`)                                                   | 6단계 ✔                                         |
| `tests/`      | Vitest 단위 테스트                                                                                                              | 1단계 ✔, 단계마다 추가                          |
| `e2e/`        | Playwright 스모크 테스트(휴대폰 화면, 빌드 결과 대상)                                                                           | 6단계 ✔                                         |
| `tools/`      | 시뮬레이터, 아이콘·스크린샷·README 표 생성, 프리캐시 Vite 플러그인                                                              | 3a단계 ✔, 6단계 확장                            |
| `public/`     | 매니페스트, 생성된 아이콘·공유 이미지 (빌드 때 그대로 복사)                                                                     | 6단계 ✔                                         |
| `.github/`    | GitHub Actions: `ci.yml`(검사), `deploy.yml`(Pages 배포)                                                                        | 6단계 ✔                                         |
| `docs/`       | 이 문서, 외부 자료 조사, README 이미지(`media/`)                                                                                | 매 단계 갱신                                    |

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

6단계에서 만들거나 크게 바꾼 파일은 8장, A단계(판타지 시안)는 9장 첫머리의 표에 있습니다.

5단계에서 만들거나 크게 바꾼 파일:

| 파일                      | 내용                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/game/feedback.ts`    | 연출 감독 `Feedback`: 이벤트 → 파티클·흔들림·히트스톱·소리·진동 매핑 표, 콤보 계산 `comboPlan`, 렌더러 어댑터 `rendererBoard` |
| `src/render/particles.ts` | `ParticlePool`: 타입 배열(SoA) 고정 크기 풀, 모양 5종, 가산 합성, 색별 글로우 스프라이트, 시드 고정 난수                      |
| `src/render/shake.ts`     | `TraumaShake`, `shakeOffset`: trauma² × 사인 합 노이즈                                                                        |
| `src/render/budget.ts`    | `FrameBudget`: 측정한 프레임 길이(이동 평균)로 연출 밀도 조절                                                                 |
| `src/render/fx.ts`        | `BoardFx`: 칸 단위 버스트, 떠오르는 점수·콤보 글자, 잘못된 이동 밀림(nudge), 흔들림을 묶은 연출 층                            |
| `src/render/renderer.ts`  | 큐를 `hit` 시각에 발화, 히트스톱(뷰 시계 정지), 스쿼시 그리기, 움직임 줄이기, `frameStats()`                                  |
| `src/render/viewModel.ts` | 합체 팝 엇갈림, 큰 합체 예비 동작, 스쿼시·스트레치 트랙, 큐의 `hit`·`step`                                                    |
| `src/render/effects.ts`   | 테두리 섬광에서 매 프레임 `shadowBlur` 제거(두 겹 선으로 대체)                                                                |
| `src/audio/synth.ts`      | 소리 형식(레이어 = 숫자 10개 배열), 음계(`scaleStep`), 콤보 음높이(`comboPitches`)                                            |
| `src/audio/sounds.ts`     | 효과음 표 26종                                                                                                                |
| `src/audio/engine.ts`     | `AudioEngine`: 잠금 해제, 켜기/끄기·음량·숨김, 같은 소리 간격, 동시 음 수 제한·빼앗기, 늦은 큐 정책, 디버그 기록              |
| `src/audio/webaudio.ts`   | `WebAudioBackend`: 오실레이터·노이즈·필터·엔벌로프, 마스터 게인 + 컴프레서, `renderOffline`(오프라인 렌더 측정)               |
| `src/input/haptics.ts`    | `Haptics`: 기능 감지, 설정, 우선순위 있는 간격 제한                                                                           |
| `src/save/store.ts`       | 설정에 `volume`, `reduceMotion`(`auto`/`on`/`off`) 추가, `motionReduced`                                                      |
| `src/ui/screens.ts`       | 설정 시트: 효과음·음량·진동(지원 기기만)·움직임 줄이기                                                                        |
| `src/ui/style.css`        | 선택 버튼 줄, `data-motion='reduced'` 규칙, 막힘 메시지 맥박, 결과·유물 시트 지연 650ms                                       |
| `src/main.ts`             | 오디오 잠금 해제·숨김, 설정 적용, 컨트롤러와 표시 계층 사이에 연출 감독 끼우기, 잘못된 이동 감지                              |
| `src/game/debug.ts`       | `frameStats()`, `feedback.sounds()/haptics()/renderSound()/renderMix()`                                                       |

4단계에서 만들거나 크게 바꾼 파일:

| 파일                        | 내용                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/save/storage.ts`       | `KeyValueStorage` 인터페이스, `MemoryStorage`, 예외를 던지지 않는 `browserStorage()`                                        |
| `src/save/validate.ts`      | 저장된 값의 구조 검사(`isRunState` 등): 타입·범위·알려진 id·칸 수·타일 id 중복                                              |
| `src/save/schema.ts`        | `{ schema: n }` 봉투, 한 단계씩 올리는 `migrate`, 더 새 버전 데이터는 건드리지 않음                                         |
| `src/save/store.ts`         | `SaveStore`: 프로필(기록·본 안내·설정·도전 기록)과 슬롯별 런(`run`/`endless`/`daily`), 필드 단위 대체값, 쓰기 실패 흡수     |
| `src/game/daily.ts`         | `localDateKey`, `dailySeed`, `dailyLabel`                                                                                   |
| `src/game/runController.ts` | 단계마다 저장, 이어 하기·새로 시작 확인·오늘의 도전, 도움말·설정 시트, 안내 규칙(본 순간 기록, 다음 이동·탭으로 닫힘), 배너 |
| `src/game/runView.ts`       | `LESSONS`, `stepHints`, `helpSections`, 점수 예상(`scorePace`), 보스 카운터 문구, 메뉴·확인·설정 화면 모델                  |
| `src/render/renderer.ts`    | `setMarks(marks, onShown)`: 보드 표시가 바뀌는 순간 HUD도 함께 바뀜                                                         |
| `src/ui/*`                  | 메뉴 카드(이어하기/새로), 게임 방법·설정·확인 시트, 보드 아래 안내 자리, 예상 막대, 배너 즉시 퇴장                          |
| `src/core/balance.ts`       | 새 스테이지 표, 부식자·혼돈 수치, 쌍둥이 씨앗 +10%                                                                          |
| `src/core/board.ts`         | `cornerIndices`, `spawnInCorner` (점화 플러그가 빈 구석에 타일을 놓음, 6단계부터 32)                                        |
| `tools/simulate.ts`         | 실패 원인(이동 소진/막힘) 분리, 런당 이동 수, `--bots`, 거의 꽉 찼을 때 생성 위치를 평균 내는 구석 봇, 유물 없이 도는 줄    |

3b단계에서 만들거나 크게 바꾼 파일:

| 파일                        | 내용                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/game/runController.ts` | `RunController`(화면 상태 기계)와 표시 계층 인터페이스 `BoardDisplay`, `UiDisplay` (`controller.ts` 대체)                    |
| `src/game/runView.ts`       | 프레젠터: `hudModel`, `bossInfo`, `boardMarks`, 화면 모델, 안내·배너, 기록. 화면의 한국어 문구 모음                          |
| `src/game/debug.ts`         | `?mode=`, `?stage=`, `?relics=` 시작 옵션, `run/hud/screen/start/move/chooseRelic/useActive/activate/tapCell/cellPoint/load` |
| `src/render/marks.ts`       | `BoardMarks`, 보드 배경(칩 슬롯·회로선·균열), 봉쇄 줄·부식자 대상·대상 지정 그리기                                           |
| `src/render/effects.ts`     | `Effect` 인터페이스, 펄스·줄 섬광·테두리 섬광, 이벤트별 기본 효과 `cueEffect`                                                |
| `src/render/renderer.ts`    | `showStep`/`setMarks`/`clear`, 이벤트 큐 `onCue`, `cellAt`/`cellClientCenter`, 배경 캐시                                     |
| `src/render/viewModel.ts`   | `apply`가 `EventCue[]`를 돌려줌, `endTime`, `tilePosition`                                                                   |
| `src/render/tilePainter.ts` | 칩 모양 숫자 타일, 파편 돌, 스펙트럼 프리즘, 서리 판 얼음, 지그재그 저주                                                     |
| `src/render/layout.ts`      | `cellAtPoint`: 보드 좌표 → 칸                                                                                                |
| `src/input/`                | 탭 판정(`isTap`, `onTap`)과 Esc(`onBack`)                                                                                    |
| `src/ui/gameScreen.ts`      | 화면 틀과 `GameUi`(`UiDisplay` 구현): 시트 전환, 안내, 배너, 대상 지정 막대                                                  |
| `src/ui/hud.ts`             | `Hud`: 목표·이동·점수·보스 줄, 사용 유물 버튼, 유물 칩과 말풍선, "유물 +N"                                                   |
| `src/ui/screens.ts`         | 메뉴, 유물 선택, 일시정지(유물 목록), 결과 시트                                                                              |
| `src/ui/dom.ts`             | 작은 DOM 도우미(`ref`, `el`, `button`, `replayClass`)                                                                        |
| `src/ui/style.css`          | 세로·가로 레이아웃(컨테이너 쿼리), 칩 모티프, 희귀도 색, 시트                                                                |
| `src/core/run.ts`           | `restoreStep(run)`: 런의 보드를 빈 화면에 다시 그리는 단계 (저장 이어 하기·테스트용)                                         |

3a단계에서 만들거나 크게 바꾼 파일:

| 파일                        | 내용                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `src/core/types.ts`         | 타일 종류(`stone`, `prism`), 새 이벤트(파괴·상태·값 변경·섞기·봉쇄…), `TurnPhase`           |
| `src/core/board.ts`         | `slide`가 벽(봉쇄 줄)과 얼음(고정 타일)을 처리, 합체 결과를 정하는 `resolveMerge` 주입 지점 |
| `src/core/hazards.ts`       | 돌·얼음·저주: 매개변수(`HazardParams`), 돌 파괴, 얼음 녹기, 방해 굴림                       |
| `src/core/bosses.ts`        | 보스 3종(봉쇄자·부식자·혼돈), 카운트다운 상태, 다음 발동 미리보기                           |
| `src/core/stage.ts`         | 목표 3종, 스테이지 진행도, 목표 판정, 한국어 목표·방해 설명, 키워드                         |
| `src/core/relics.ts`        | 유물 16종 정의(이름·설명·희귀도·훅), 규칙 수정 합성, 제시 추첨과 "죽은 선택지" 걸러내기     |
| `src/core/turn.ts`          | 로그라이크 한 턴 엔진: 단계 순서대로 실행하고 `TurnPhase` 목록을 만듦                       |
| `src/core/run.ts`           | 런/무한 모드 상태 기계: `startRun`, `runMove`, `chooseRelic`, `useActive`와 조회 함수들     |
| `src/core/balance.ts`       | 스테이지 표, 보스 주기, 무한 모드 증가율, 유물 수치, 희귀도 가중치 — 수치는 전부 여기       |
| `src/render/viewModel.ts`   | 단계를 차례로 재생, 트윈을 "트랙"(연속 트윈 목록)으로, 파괴·상태·값 변경·섞기 표시          |
| `src/render/tilePainter.ts` | 돌·프리즘 그림, 얼음(점선 테두리 + 남은 턴)·저주(½ 배지) 오버레이                           |
| `tools/simulate.ts`         | 밸런스 봇 시뮬레이터: 무작위·탐욕·구석 봇으로 스테이지별 클리어율과 유물 효과를 표로 출력   |

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
| `src/render/tilePainter.ts` | 타일 그림. 종류별 등록표(캐시용, 지금은 `NEON_TILE_ART`) + 매 프레임 그리는 오버레이 목록  |
| `src/render/renderer.ts`    | `BoardRenderer`: 캔버스·DPR·리사이즈·스프라이트 캐시·루프·`Effect` 연결 지점               |
| `src/input/swipe.ts`        | `resolveSwipe`, `SwipeTracker` (DOM 없음, 테스트 대상)                                     |
| `src/input/keys.ts`         | 방향키/WASD → `Direction` (`event.code` 기준)                                              |
| `src/input/index.ts`        | `attachInput`: 실제 DOM 이벤트를 연결하고 해제 함수를 돌려줌                               |
| `src/ui/gameScreen.ts`      | 화면 DOM 만들기 (3b단계에서 런 화면으로 다시 씀)                                           |
| `src/ui/hud.ts`             | `Hud`: 점수, "+N" 팝업 (3b단계에서 런 HUD로 다시 씀)                                       |
| `src/ui/style.css`          | 세로 화면 레이아웃, safe-area, 스크롤/줌 방지, 네온 스타일                                 |
| `src/game/controller.ts`    | `GameController` (3b단계에서 `runController.ts`로 대체, D48)                               |
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
  if (state.over) return toTurnResult(state, false, []);

  const slid = slide(state, direction);
  if (!slid.moved) return toTurnResult(state, false, []);
  // ... 점수 반영 → 타일 생성 → 게임 오버 판정
  return toTurnResult(next, true, [
    { kind: 'slide', events: slideEvents },
    { kind: 'spawn', events: spawned.events },
    { kind: 'end', events: endEvents },
  ]);
}
```

함수 시그니처만 봐도 이 함수가 하는 일이 다 드러납니다: **(상태, 방향) → (새 상태, 움직였는가, 무슨 일이 어떤 순서로 있었나)**.
숨은 입력(전역 변수, 현재 시간)도 숨은 출력(화면 변경)도 없습니다.

규칙의 "판단"도 작게 쪼개 한 곳에 모았습니다.

```ts
// src/core/tile.ts
export function canMerge(leader: Tile, follower: Tile): boolean { ... }
export function mergedValue(leader: Tile, follower: Tile): number { ... }
export function mergeScore(value: number): number { ... }
```

3a단계에서 돌·프리즘 타일이 들어올 때 실제로 `canMerge`(돌은 합체 불가, 프리즘은 아무 숫자와 합체)와 `mergedValue`(프리즘은 상대를 2배로)만 고쳤고, 이동 알고리즘은 "벽과 얼음"이라는 새 개념이 필요할 때만 손댔습니다(4.2장).

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

순서 약속: **move/merge(한 번의 슬라이드로 동시에) → score → spawn → gameOver**. 3a단계에서 이 약속은 "단계(phase)"라는 명시적인 구조가 되었습니다. `TurnResult.phases`가 단계 목록이고, `events`는 그것을 이어 붙인 목록입니다(4.1장).

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

그래서 1단계에서는 `VALUE_MERGING_KINDS`라는 집합(Set)으로 우회했습니다. 3a단계에서 `stone`, `prism`이 실제로 생기자 비교가 더 이상 "항상 참"이 아니게 되어, 읽기 쉬운 명시적 비교(`leader.kind === 'prism' && follower.kind === 'number'` …)로 돌아갔습니다. 린트 경고가 "아직 없는 경우를 위한 코드"를 알려 준 셈입니다.

`eslint-config-prettier`는 설정 맨 마지막에 둡니다. ESLint의 "모양" 규칙을 꺼서 Prettier와 싸우지 않게 하는 역할입니다.

#### 연습 과제

1. `tsconfig.json`에서 `noUncheckedIndexedAccess`를 끄고 `npm run build`, 다시 켜고 `npm run build`. 켰을 때 코드에 어떤 처리가 필요해지는지 `src/core/board.ts`에서 찾아보세요.
2. `npm run dev`로 개발 서버를 켜고 `src/ui/screens.ts`의 메뉴 문구(`합쳐서 균열을 닫는…`)를 바꿔 저장해 보세요. 브라우저가 즉시 바뀌는 것(HMR)을 확인합니다.
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

- `src/render/viewModel.ts`의 `BoardView` — `apply(phases, now)`, `update(now)`, `frame(now)`, `finish()`, `syncTo(state)`
- 시간을 인자로 받으므로 DOM 없이 Node에서 테스트합니다: `tests/viewModel.test.ts`

#### 핵심 코드

각 이벤트가 스프라이트의 트윈으로 바뀝니다.

```ts
// src/render/viewModel.ts — schedulePhase() 중에서 (start = 이 단계의 시작 시각)
case 'move': {
  const s = this.require(e.tileId);
  s.row.push(tween(e.from.row, e.to.row, start, t.slide, easeOutCubic));
  s.col.push(tween(e.from.col, e.to.col, start, t.slide, easeOutCubic));
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

3a단계에서 한 턴이 여러 단계로 나뉘면서 두 가지가 바뀌었습니다(4.1장).

- `apply(phases, now)`는 단계를 **차례로** 예약합니다. 각 단계는 앞 단계의 보드 움직임이 끝난 뒤(+`spawnDelay`) 시작하고, 보여 줄 것이 없는 단계(점수, 유물 발동 표시만 있는 단계)는 시간을 쓰지 않습니다. 위 시간표는 "미끄러짐 단계 → 생성 단계"인 일반 턴의 모습 그대로입니다.
- 한 타일이 한 턴에 여러 번 움직일 수 있게 되었습니다(미끄러짐 → 연쇄 합체 → 보스의 섞기). 그래서 `row`/`col`/`scale`은 트윈 하나가 아니라 **트랙**(시간 순서대로 이어지는 트윈 목록)입니다. 값·상태 변화(`valueChange`, `statusChange`)는 트윈이 아니라 "이 시각부터 이 값"인 예약(`changes`)입니다. `finish()`는 여전히 모든 것을 끝 상태로 건너뜁니다.

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
- 확장 지점: 타일 종류별 그림은 `Record<TileKind, TileArt>` 등록표에 등록합니다(지금은 테마마다 하나: `NEON_TILE_ART`, `STORYBOOK_TILE_ART`, 9.1장). 3단계에서 `TileKind`에 `'stone'`을 추가하면 **그림을 등록하기 전까지 컴파일이 실패**하므로 빠뜨릴 수 없습니다. 얼음·저주 표시는 테마의 `overlays` 목록에 함수를 추가하면 모든 타일 위에 매 프레임 그려집니다.

#### 연습 과제

1. `resize()`에서 `dpr`을 1로 고정해 보고 휴대폰(또는 개발자 도구의 기기 모드, DPR 3)에서 숫자 가장자리를 비교해 보세요.
2. `numberTileArt.paint`의 `shadowBlur`에서 `pixelRatio`를 빼 보세요. DPR 1 화면과 DPR 3 화면에서 글로우 크기가 어떻게 달라지나요?
3. `NEON_OVERLAYS`에 "모든 타일 왼쪽 위에 작은 점을 찍는" 오버레이를 추가해 보세요. 3단계 얼음 표시를 미리 연습하는 것입니다.

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
- `src/game/runController.ts` — 코어 상태는 입력이 오면 **즉시** 갱신됩니다. 애니메이션을 기다리지 않습니다.

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

> 3b단계에서 `GameController`는 `RunController`(`src/game/runController.ts`)로 바뀌었습니다(D48). 아래 발췌는 2단계 당시 모습이고, 원리(상태를 들고 → 코어를 부르고 → 인터페이스로 나눠 줌)는 그대로입니다. 지금 코드는 5.1~5.2장을 보세요.

#### 어디에 쓰였나

- `src/game/controller.ts`(2단계, 지금은 `runController.ts`) — `GameController`, `BoardDisplay`, `HudDisplay`
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

1. `tests/runController.test.ts`의 `FakeBoard`처럼, 이벤트를 콘솔에 한국어로 찍는 `LoggingBoard implements BoardDisplay`를 만들어 렌더러 대신 넣어 보세요. 화면 없이도 게임이 돌아가는 것을 확인합니다.
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

1. `renderer.ts`의 `draw()`에서 캐시를 쓰지 않고 매번 `theme.tileArt[kind].paint`를 부르도록 바꿔, 개발자 도구 Performance 탭(CPU 4× 감속)으로 프레임 시간을 비교해 보세요.
2. 캐시 키에서 `emphasized`를 빼 보세요. 합체 팝 때 무엇이 달라지나요?
3. `get()`이 새 이미지를 만들 때마다 `console.count('sprite')`를 찍어 보고, 창 크기를 바꾸거나 브라우저 확대(Ctrl +)를 했을 때 다시 만들어지는지 확인하세요.

---

### 3.9 주입 가능한 시계와 디버그 훅

#### 왜 필요한가

애니메이션 코드가 `performance.now()`와 `requestAnimationFrame`을 **직접** 부르면 두 가지가 어려워집니다.

- **테스트**: "50ms 뒤 타일은 어디에 있어야 한다"를 확인하려면 진짜로 50ms를 기다려야 하고, 결과도 기기 속도에 따라 흔들립니다.
- **디버깅·자동 검사**: 브라우저 자동화로 "애니메이션 한가운데"를 캡처하려 해도 정확한 순간을 잡을 수 없습니다.

해결책은 **의존성 주입**입니다. "시간을 알려 주고 다음 프레임을 예약해 주는 것"을 인터페이스(`FrameClock`)로 만들어 바깥에서 넣어 줍니다. 실제 게임에는 브라우저 시계를, 테스트에는 **손으로 돌리는 시계**를 넣습니다. 코드는 어느 쪽인지 모릅니다.

디버그 훅은 같은 아이디어를 브라우저에서 쓰는 것입니다. 주소에 `?debug`를 붙이면 멈췄다가 한 프레임씩 넘길 수 있는 시계로 게임이 시작되고, 콘솔에서 `window.__neonRift`로 게임을 조작할 수 있습니다. `?seed=42`는 같은 판을 다시 시작합니다(1단계의 시드 RNG 덕분). 3b단계에서 런 조작용 함수가 늘었습니다(5.6장).

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
// 주소: .../2048-project/?debug&seed=42&mode=run   (mode가 없으면 메뉴에서 시작)
__neonRift.grid(); // [[0,0,0,0],[0,0,0,0],[0,2,0,0],[0,2,0,0]]
__neonRift.move('up'); // 스와이프와 똑같이 컨트롤러를 거침
__neonRift.advance(55); // 실제 시계를 멈추고 55ms만큼 진행 → 미끄러지는 중간 모습
__neonRift.settle(); // 남은 애니메이션 즉시 완료
__neonRift.state(); // 보드 상태의 복사본(평범한 데이터). 런 전체는 run()
__neonRift.resume(); // 실제 시계로 복귀
```

2단계의 브라우저 검사 스크립트는 코어를 따로 번들해서 "시드 42에서 이 순서로 밀면 보드는 이것"을 독립적으로 계산하고, 키보드·터치·마우스 입력 후의 `__neonRift.grid()`와 칸 하나까지 비교합니다. 그래서 검사가 "점수가 바뀌었다" 수준이 아니라 **정확한 결과**를 확인합니다.

보안·배포 관점: 훅은 `?debug`가 있을 때만 붙습니다. 이 게임은 점수를 서버에 보내지 않으므로 치트 걱정은 없지만, 평소 사용자에게 내부 API를 노출하지 않는 것이 기본 예의입니다.

#### 연습 과제

1. `?debug&seed=7`로 열고 콘솔에서 `__neonRift.move('left'); __neonRift.advance(30)`, `advance(30)` … 을 반복하며 미끄러짐을 한 프레임씩 관찰해 보세요.
2. `tests/clock.test.ts`에 테스트를 추가해 보세요: 합체가 있는 턴에서 `T.slide` 직후 프레임에는 합체 결과 타일만 있고 원본 두 개는 없어야 합니다.
3. 생각해 보기: 시계를 주입하지 않고 Playwright의 `page.clock`(가짜 시계)만으로 같은 일을 할 수 있을까요? 이 프로젝트에서 써 봤을 때 `requestAnimationFrame` 시각과 `performance.now()`가 어긋나 정확한 프레임을 잡기 어려웠습니다. 직접 만든 시계가 무엇을 보장해 주나요?

---

## 4. 3a단계: 로그라이크 코어

이 단계에서는 화면을 하나도 만들지 않았습니다. 방해 타일, 스테이지 목표, 보스, 유물, 런 흐름을 **전부 순수 코어 안에** 넣고, 테스트와 봇 시뮬레이션으로 검증했습니다. 화면(유물 선택, 결과 화면, HUD)은 3b단계(5장)에서 이 API 위에 올렸습니다.

이 장의 중심 질문은 하나입니다. **"규칙이 복잡해져도 코어를 순수하고, 결정적이고, 저장 가능한 상태로 유지하려면 무엇을 지켜야 하는가?"**

### 4.1 턴 단계(phase)와 인과 관계

#### 왜 필요한가

2단계까지 한 턴은 "미끄러짐 → 생성" 한 박자였습니다. 로그라이크 규칙이 들어오면 한 턴 안에서 **원인과 결과가 꼬리를 뭅니다.**

```
2와 2가 합쳐진다 → 그 옆의 돌이 부서진다 → (유물) 부서진 돌만큼 이동 +1
              → (유물) 합쳐진 4가 옆의 4와 또 합쳐진다 → 그 옆의 돌도 부서진다
→ 보스가 가장 큰 타일을 절반으로 깎는다 → 새 타일이 나오고 얼음이 붙는다 → 얼음이 한 칸 녹는다
```

이벤트를 전부 한 목록에 "동시에 일어난 일"로 넣으면, 렌더러는 돌이 합체보다 **먼저** 부서지는 그림을 그리거나, 원인을 추측해야 합니다. 그런데 원인을 아는 곳은 코어뿐입니다. 그래서 **코어가 단계의 경계를 정해서** 내보냅니다.

- 한 단계(phase) 안의 이벤트는 **동시에** 일어납니다.
- 단계와 단계는 **차례로** 일어납니다. 뒤 단계는 앞 단계의 결과를 원인으로 삼을 수 있습니다.

#### 어디에 쓰였나

- `src/core/types.ts`: `TurnPhaseKind`, `TurnPhase`, `TurnResult.phases`
- `src/core/turn.ts`의 `playTurn`: 단계를 순서대로 실행하며 각 단계의 이벤트를 모읍니다.
- `src/core/board.ts`의 `toTurnResult`: 빈 단계를 버리고 `events`(이어 붙인 목록)를 만듭니다.
- `src/render/viewModel.ts`의 `apply(phases, now)`: 단계마다 시작 시각을 밀어 가며 예약합니다.
- 테스트: `tests/run.test.ts`의 `phases` — 실제 런 600턴가량에서 단계 순서와 "이벤트는 그 순간 존재하는 타일만 가리킨다"를 검사하고, 여섯 종류의 단계가 모두 나왔는지도 확인합니다.

#### 핵심 코드

```ts
// src/core/types.ts
export type TurnPhaseKind = 'slide' | 'resolve' | 'chain' | 'boss' | 'spawn' | 'end';

export interface TurnPhase {
  readonly kind: TurnPhaseKind;
  readonly events: readonly TurnEvent[];
}
```

| 단계      | 무엇이 일어나나                                      | 대표 이벤트                                                  |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `slide`   | 미끄러짐과 합체                                      | `move`, `merge`, `trigger`(합체 유물), `score`               |
| `resolve` | 바로 앞 미끄러짐의 결과: 돌 파괴, 그에 반응하는 유물 | `destroy`, `trigger`, `bonusMoves`                           |
| `chain`   | (유물) 방금 생긴 타일의 추가 합체. 반복 가능         | `move`, `merge`, `score`                                     |
| `boss`    | 보스 규칙 발동                                       | `trigger`, `lineLock`, `valueChange`, `shuffle`, `spawn`(돌) |
| `spawn`   | 새 타일, 방해 타일, 상태 이상                        | `spawn`, `statusChange`                                      |
| `end`     | 얼음 녹기, 봉쇄 해제, 턴 끝 유물, 클리어·실패 판정   | `statusChange`, `lineUnlock`, `score`, `stageCleared`…       |

순서는 `slide → resolve → (chain → resolve)* → boss → spawn → end`이고, 비어 있는 단계는 내보내지 않습니다.

```ts
// src/core/turn.ts — playTurn() 요약
const first = b.slidePass(direction, null); // 1. slide
if (!first) return { ...input, moved: false, phases: [] };
phases.push({ kind: 'slide', events: first.events });
phases.push({ kind: 'resolve', events: b.resolve(first.sites, rules) });

let fresh = first.created; // 2. chain (유물이 있을 때만)
for (let depth = 0; depth < rules.chainDepth; depth++) {
  const pass = b.slidePass(direction, fresh);
  if (!pass) break;
  phases.push({ kind: 'chain', events: pass.events });
  phases.push({ kind: 'resolve', events: b.resolve(pass.sites, rules) });
  fresh = pass.created;
}
// 3. boss → 4. spawn → 5. end
```

뷰 모델 쪽에서는 각 단계가 "보드 움직임이 끝나는 시각"을 돌려주고, 다음 단계는 그 뒤에 시작합니다.

```ts
// src/render/viewModel.ts
for (const phase of phases) {
  const start = first ? cursor : cursor + this.timings.spawnDelay;
  const duration = this.schedulePhase(phase.events, start);
  if (duration <= 0) continue; // 점수·발동 표시뿐인 단계는 시간을 쓰지 않음
  cursor = start + duration;
  first = false;
}
```

`[2, 2, 돌, _]`을 왼쪽으로 밀면 이렇게 재생됩니다.

```
시간(ms)  0          110 130        270 290          440
slide     ├─미끄러짐─┤
resolve                  ├─돌 축소─┤
spawn                                   ├─새 타일 자라남─┤
```

**인과 검사 테스트**가 이 구조의 안전망입니다. 이전 보드에서 시작해 단계를 순서대로 적용하면서, `destroy`·`statusChange`·`shuffle` 같은 이벤트가 **그 순간 존재하는 타일만** 가리키는지, 다 적용한 결과가 코어의 새 보드와 같은지 봅니다(`tests/helpers.ts`의 `replayPhases`). 렌더러 쪽에서는 `a fully replayed view equals the core state on hazard, boss and relic turns`가 같은 일을 실제 `BoardView`로 합니다.

#### 연습 과제

1. `playTurn`에서 `boss` 단계를 `spawn` 뒤로 옮겨 보세요. 어떤 테스트가 깨지나요? 게임으로서는 어느 쪽이 공정할까요? (힌트: 혼돈의 섞기 직후 새 타일이 나오는 것과 그 반대)
2. `chain` 단계마다 콤보 숫자("×2", "×3")를 띄우려면 렌더러는 무엇만 보면 될까요? 코어를 고칠 필요가 있나요?
3. 생각해 보기: 단계를 나누지 않고 이벤트마다 `delay`(ms)를 붙이는 방식도 있습니다. 그 방식에서는 "애니메이션 속도 설정"이나 "빨리 감기"를 어디서 처리해야 할까요?

---

### 4.2 방해 타일: 규칙을 함수와 매개변수로

#### 왜 필요한가

방해 타일은 세 종류이고, 각각 성격이 다릅니다.

| 방해 | 정체                          | 규칙                                                                                        |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| 돌   | 타일 **종류** (`stone`)       | 밀리지만 합체하지 않음. 상하좌우 이웃 칸에서 합체가 일어나면 부서짐                         |
| 얼음 | 타일 **상태** (`frozenTurns`) | N번의 이동 동안 제자리 고정. 줄을 벽처럼 막음. 같은 수가 밀려 들어오면 합체하고 얼음이 깨짐 |
| 저주 | 타일 **상태** (`cursed`)      | 저주받은 타일이 끼는 합체는 결과가 절반. 한 번 쓰면 사라짐                                  |

"얼마나 자주 나오는가"는 규칙이 아니라 **밸런스**입니다. 그래서 규칙은 함수로, 빈도는 스테이지마다 다른 매개변수(`HazardParams`)로 나눴습니다. 같은 함수가 1막 2스테이지(돌만 조금)에도, 무한 모드의 후반(전부 많이)에도 쓰입니다.

#### 어디에 쓰였나

- `src/core/hazards.ts`: `HazardParams`, `rollHazards`(매 이동 방해 굴림), `breakStones`, `tickIce`, `placeStones`
- `src/core/board.ts`의 `slide`: 얼음과 봉쇄 줄을 처리하는 유일한 곳
- `src/core/board.ts`의 `defaultMergeOutcome`, `src/core/tile.ts`의 `canMerge`/`mergedValue`: 저주·돌·프리즘
- `src/core/balance.ts`의 `STAGE_TABLE[*].hazards`, `run.ts`의 `endlessHazards(turn)`
- 테스트: `tests/hazards.test.ts`

#### 핵심 코드

얼음과 봉쇄는 "줄을 구간으로 나누는" 같은 문제입니다. 차이는 경계가 합체를 받아 주느냐뿐입니다.

```ts
// src/core/board.ts — slide()의 줄 처리
for (const [k, index] of line.entries()) {
  const tile = state.cells[index] ?? null;
  if (walls?.has(index)) {
    // 봉쇄된 칸: 그대로 두고, 그 뒤에서 새 구간 시작
    flush();
    cells[index] = tile;
    segStart = k + 1;
    continue;
  }
  if (!tile) continue;
  if (isFrozen(tile)) {
    // 얼음: 이 타일이 다음 구간의 "앞 벽"이자 합체 상대
    flush();
    segStart = k;
    placements = [{ kind: 'single', tile, fromIndex: index }];
    continue;
  }
  // ... 이하 2048의 원래 압축·합체 규칙
}
```

얼음 타일을 구간의 첫 자리(`segStart = k`)에 미리 놓아 두기만 하면, 뒤에서 밀려온 같은 수는 원래 규칙대로 그 위에 합쳐지고, 다른 수는 그 뒤에 쌓입니다. 얼음 때문에 새로 쓴 코드는 이 다섯 줄이 전부입니다.

저주는 합체 결과를 정하는 함수 한 곳에 있습니다.

```ts
// src/core/board.ts
export function defaultMergeOutcome(leader: Tile, follower: Tile): MergeOutcome {
  const cursed = leader.status.cursed || follower.status.cursed;
  const base = mergedValue(leader, follower);
  const value = cursed ? Math.max(2, base / 2) : base;
  return { kind: 'number', value, score: mergeScore(value), cursed };
}
```

결과 타일은 언제나 새 id와 `NO_STATUS`로 만들어지므로 "저주가 한 번 쓰이면 사라진다"와 "얼음 타일에 합치면 얼음이 깨진다"는 따로 코드를 쓰지 않아도 저절로 성립합니다.

돌 파괴는 **결과**이므로 `resolve` 단계에서 처리합니다. 합체가 끝난 뒤의 보드에서, 합체 위치의 이웃을 봅니다.

```ts
// src/core/hazards.ts — breakStones() 요약
for (const m of merges) {
  for (const n of neighbors(m.index, state.size)) if (isStone(n)) byMerge.add(n);
}
```

`Set`을 쓰므로 두 합체가 같은 돌에 닿아도 한 번만 부서집니다.

**방해 굴림의 순서**도 정해 두었습니다: 돌 → 얼음 → 저주. 세 확률은 매 이동 **항상** 굴립니다. 그래서 "이번엔 돌이 놓일 자리가 없었다" 같은 보드 사정이 다음 굴림들을 밀어내지 않습니다(테스트 `always rolls its three chances, whatever the board`).

#### 연습 과제

1. "얼음 타일에는 합칠 수 없다"로 규칙을 바꿔 보세요. `slide`에서 어디 한 줄만 바꾸면 되나요? 이 규칙에서는 얼음이 왜 훨씬 답답한지 직접 `stateFromGrid`로 몇 판 만들어 보세요.
2. 새 방해 "자석": 매 턴 끝에 가장 작은 타일을 한 칸 가운데로 끌어당긴다. `HazardParams`에 무엇을 더하고, 어느 단계에서 어떤 이벤트로 내보내야 할까요?
3. `rollHazards`가 확률을 "항상 굴리는" 대신 "놓을 수 있을 때만 굴리게" 바꿔 보고, `tests/run.test.ts`의 결정성 테스트가 여전히 통과하는지 보세요. 통과한다면, 그래도 원래 방식이 나은 이유는 무엇일까요?

---

### 4.3 상태 기계: 런과 무한 모드

#### 왜 필요한가

런은 "스테이지를 하는 중", "유물을 고르는 중", "이겼다", "졌다" 중 하나의 **상태**에 있고, 상태마다 받을 수 있는 입력이 다릅니다. 유물을 고르는 중에 스와이프가 들어오면? 이미 진 다음에 폭탄을 쓰면? 이런 질문에 `if`를 흩어 놓고 답하면 버그가 납니다.

**상태 기계(state machine)** 는 "지금 상태 + 입력 → 다음 상태"를 한 곳에 모은 것입니다. 이 프로젝트에서는 상태가 `status` 필드 하나로 드러나고, 입력마다 함수가 하나씩 있습니다. 각 함수는 허용되지 않는 상태에서 호출되면 **아무것도 바꾸지 않고**(`changed: false`) 돌아옵니다.

```
run 모드
            ┌─────────────── runMove / useActive ───────────────┐
            ▼                                                    │
 startRun ─▶ playing ── 목표 달성 ─▶ offer ── chooseRelic ─▶ playing(다음 스테이지)
              │  └── 마지막 스테이지 달성 ─▶ victory
              └── 이동 소진 / 막힘(구조 수단 없음) ─▶ gameOver

endless 모드
 startRun ─▶ playing ── 최고 타일이 64, 128, 256…에 처음 도달 ─▶ offer ── chooseRelic ─▶ playing
              └── 막힘(구조 수단 없음) ─▶ gameOver
```

#### 어디에 쓰였나

- `src/core/run.ts`: `RunState`, `RunStatus`, `startRun`, `runMove`, `chooseRelic`, `useActive`, 조회 함수(`currentStage`, `movesLeft`, `turnsUntilBoss`, `runDirections`, `canUseActive`, `totalScore`)
- 상태가 평범한 데이터라서 JSON 저장이 그대로 됩니다(4단계 `localStorage`). 테스트 `a run saved with JSON mid-stage resumes with identical future`
- 테스트: `tests/run.test.ts`

#### 핵심 코드

```ts
// src/core/run.ts
export type RunStatus = 'playing' | 'offer' | 'victory' | 'gameOver';

export function runMove(run: RunState, direction: Direction): RunStep {
  if (run.status !== 'playing') return unchanged(run); // 상태가 입력을 거른다
  const out = playTurn({
    board: run.board,
    direction,
    relics: run.relics,
    rules: runRules(run),
    hazards: runHazards(run),
    boss: run.boss,
  });
  if (!out.moved) return unchanged(run);
  // 진행도 갱신 → 되돌리기용 스냅샷 → 판정
  const judged = judge({ ...run, board: out.board, /* ... */ undo: snapshot(run) });
  // 판정 이벤트(stageCleared, stageFailed…)는 end 단계 끝에 붙인다
}
```

모든 행동 뒤에는 같은 `judge`가 돌아 다음 상태를 정합니다. 목표 달성이 실패보다 먼저입니다(마지막 이동으로 목표를 채우면 클리어).

```ts
// src/core/run.ts — decide() 요약 (run 모드)
if (goalStatus(spec.goal, run.progress).done) → stageCleared, 마지막이면 victory, 아니면 offer
if (movesLeft(run) <= 0)                       → stageFailed('moves')
if (isStuck(run) && !hasRescue(run))           → stageFailed('stuck')
```

`RunStep`은 화면이 알아야 할 것을 모두 담습니다.

```ts
export interface RunStep {
  readonly run: RunState;
  readonly changed: boolean; // 거절됐거나 아무 일도 없으면 false
  readonly boardReplaced: boolean; // 새 스테이지·되돌리기: 뷰를 비우고 phases로 다시 쌓는다
  readonly phases: readonly TurnPhase[];
  readonly events: readonly TurnEvent[];
}
```

**되돌리기는 상태 기계의 덤**입니다. 행동할 때마다 직전 상태(되돌리기 칸만 뺀 것)를 `run.undo`에 넣어 두고, 되돌리기 유물은 그것을 꺼내 놓습니다. 보드 안에 RNG 상태가 들어 있으므로 **난수까지 함께 돌아갑니다**. 같은 방향으로 다시 밀면 똑같은 타일이 똑같은 자리에 나옵니다(테스트 `restores the board and the random stream`). 되돌리기가 "운 다시 굴리기"가 되지 않게 하는 장치입니다.

**보드는 스테이지마다 새로 시작합니다**(D25). 스테이지 목표가 "이 이동 수 안에 이것"이라는 짧은 퍼즐이 되고, 이어지는 것은 유물(빌드)과 누적 점수(`bankedScore`)뿐입니다.

#### 연습 과제

1. "유물 고르기 건너뛰기" 대신 "다시 뽑기(1회)"를 넣어 보세요. `RunState`에 무엇을 추가하고, 어떤 상태에서만 허용해야 하나요?
2. `judge`에서 "목표 달성" 검사를 "이동 소진" 검사 아래로 내려 보세요. 어떤 테스트가 깨지나요? 플레이어 입장에서 어느 쪽이 맞을까요?
3. 무한 모드에 "일시 정지" 상태를 추가한다면, 그것은 코어의 상태 기계에 들어가야 할까요, 화면 쪽에 있어야 할까요? 저장과 결정성을 기준으로 생각해 보세요.

---

### 4.4 데이터 주도 설계와 훅 시스템

#### 왜 필요한가

유물이 16개입니다. 각 유물을 `if (owns('corner')) ...`처럼 엔진 곳곳에 박아 넣으면, 유물을 하나 더할 때마다 엔진을 고치고, 어떤 유물이 어디에 영향을 주는지 한눈에 보이지 않습니다.

**데이터 주도 설계**는 "유물이 무엇인지"를 데이터(정의 목록)로 적고, 엔진은 그 데이터를 읽어 정해진 시점에 실행만 하게 하는 방식입니다. 정해진 시점을 **훅(hook)** 이라고 부릅니다. 엔진은 "지금 합체가 일어났다, 할 말 있는 유물?" 하고 물을 뿐, 어떤 유물이 있는지 모릅니다.

#### 어디에 쓰였나

- `src/core/relics.ts`의 `RelicDef`(정의 형식), `DEFS`(16종 목록), `deriveRules`, `drawOffer`
- `src/core/turn.ts`의 `TurnBuilder`: 훅을 부르고 효과를 적용하는 유일한 곳
- 테스트: `tests/relics.test.ts` (유물마다 최소 1개)

#### 핵심 코드

```ts
// src/core/relics.ts
export interface RelicDef {
  readonly id: RelicId;
  readonly name: string; // 한국어 이름
  readonly description: string; // 한 줄 설명 (수치는 balance.ts에서 끼워 넣음)
  readonly rarity: Rarity;
  readonly grants?: readonly Keyword[]; // 이 유물이 런에 더해 주는 키워드
  readonly active?: ActiveSpec; // 사용 유물: 효과, 최대 충전, 스테이지당 회복
  readonly isUseful?: (ctx: OfferContext) => boolean; // "죽은 선택지" 걸러내기
  readonly modifyRules?: (rules: TurnRules) => TurnRules;
  readonly onMerge?: (
    ctx: MergeHookContext,
    self: RelicInstance,
  ) => { mod: MergeMod; counter?: number } | null;
  readonly onStoneBreak?: (count: number, self: RelicInstance) => HookOutcome | null;
  readonly onSpawn?: (self: RelicInstance) => HookOutcome | null;
  readonly onTurnEnd?: (ctx: TurnEndContext, self: RelicInstance) => HookOutcome | null;
  readonly onStageStart?: (self: RelicInstance) => HookOutcome | null;
}
```

훅의 세 가지 약속이 이 설계의 핵심입니다.

1. **훅은 순수 함수다.** 입력(상황, 자기 인스턴스)을 받아 **데이터**를 돌려줍니다: 새 카운터 값, 효과 목록(`{ kind: 'score', amount }`, `{ kind: 'bonusMoves', amount }`, `{ kind: 'charge', amount }`, `{ kind: 'placeTile', value }`, `{ kind: 'spawnPrism' }`). 상태를 직접 바꾸지 않습니다.
2. **효과는 엔진이 적용한다.** `TurnBuilder.applyEffects`가 효과를 상태에 반영하고, 반영된 것이 있으면 `trigger` 이벤트(어느 유물이 발동했는지)를 앞에 붙입니다. 그래서 모든 유물 발동이 자동으로 화면에 보일 수 있습니다.
3. **유물의 상태는 공통 형식이다.** 모든 유물 인스턴스는 `{ id, charges, counter }` 세 칸뿐입니다. "8번째 이동마다"는 `counter`로, "스테이지의 첫 2번 합체"도 `counter`로 셉니다. 저장 형식이 유물 종류에 따라 달라지지 않습니다.

```ts
// 예: 정의 두 개
{
  id: 'cornerAnchor', name: '모서리 닻', rarity: 'common',
  description: `네 구석 칸에서 일어난 합체는 점수 ${T.cornerFactor}배`,
  isUseful: (c) => c.has('scoreGoal'),
  onMerge: (ctx) => (ctx.corner ? { mod: { scoreFactor: T.cornerFactor } } : null),
},
{
  id: 'prismCore', name: '프리즘 코어', rarity: 'rare',
  description: `${T.prismEvery}번 이동할 때마다 어떤 숫자와도 합쳐지는 프리즘 타일이 나온다`,
  onSpawn: (self) =>
    self.counter + 1 >= T.prismEvery
      ? { counter: 0, effects: [{ kind: 'spawnPrism' }] }
      : { counter: self.counter + 1 },
},
```

**규칙 수정**은 접어 가기(fold)입니다. 기본 규칙에서 시작해 가진 유물의 `modifyRules`를 차례로 통과시킵니다. 매 이동 새로 계산하므로 규칙 자체는 저장하지 않습니다.

```ts
export function deriveRules(relics: readonly RelicInstance[], base = BASE_TURN_RULES): TurnRules {
  return relics.reduce((rules, r) => RELICS[r.id].modifyRules?.(rules) ?? rules, base);
}
```

합체 훅은 `slide`에 주입되는 합체 결정 함수(`resolveMerge`) 안에서 불립니다. 이동 알고리즘(`board.ts`)은 유물을 전혀 모르고, "합체 결과는 이 함수에게 물어본다"는 것만 압니다.

#### 연습 과제

1. 새 유물 "균형추: 가장자리가 아닌 가운데 4칸의 합체는 점수 +50%"를 추가해 보세요. `relics.ts`의 정의 하나와 테스트 하나면 충분해야 합니다. 엔진을 고쳐야 했다면 무엇이 부족했던 걸까요?
2. 훅 `onStoneBreak`를 없애고 같은 일을 `onTurnEnd`(이번 턴 부순 돌 수를 받도록)로 해 보세요. 어느 쪽이 화면 연출(돌이 부서지는 바로 그 순간 "+1 이동")에 유리한가요?
3. `RelicInstance`에 `counter` 대신 유물마다 다른 필드를 넣는 설계를 상상해 보세요. 저장·불러오기와 타입 정의는 어떻게 달라질까요?

---

### 4.5 로그라이크 유물과 시너지 설계

#### 왜 필요한가

유물 16개 중 플레이어가 한 런에서 보는 것은 30개 남짓의 제시 중 11개 선택입니다. 이 작은 풀에서 **"이번 런은 이 조합이 됐다"는 경험**이 나오려면, 유물들이 서로를 모르는데도 맞물려야 합니다. 동시에 고를 가치가 없는 선택지가 섞여 있으면 3택 1이 사실상 2택 1이 됩니다.

#### 어디에 쓰였나

- `src/core/relics.ts`의 정의 목록과 `drawOffer`
- `src/core/stage.ts`의 `Keyword`와 `stageKeywords`
- `src/core/run.ts`의 `offerContext`
- 테스트: `tests/relics.test.ts`의 `offers ("no dead picks")`, `no relic refers to another relic by name`

#### 핵심 코드

설계 규칙(외부 자료 조사 노트 3장에서 가져온 원칙을 이 게임에 맞게 고친 것):

1. **설명은 한 줄.** 한 줄에 안 들어가면 규칙이 너무 복잡하다는 신호입니다. 테스트가 줄바꿈과 길이를 검사합니다.
2. **공통 숫자와 키워드만 건드린다.** 공통 숫자: 합체 값, 합체 점수, 한 이동의 합체 수, 남은 이동, 생성 확률, 충전, 보스 주기, 연쇄 깊이. 공통 키워드: 돌, 얼음, 저주, 구석, 프리즘.
3. **다른 유물을 이름으로 지목하지 않는다.** 그래도 2번 덕분에 시너지가 생깁니다. 테스트가 설명 안에 다른 유물 이름이 없는지 검사합니다.
4. **죽은 선택지 금지.** 남은 스테이지에서 쓸모가 없으면 제시하지 않습니다.

| 유물 (id)                   | 한 줄 설명                                                                  | 훅                        | 희귀도 |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------- | ------ |
| 연쇄 회로 (`chain`)         | 합체로 생긴 타일이 같은 수와 맞닿으면 이어서 합체한다 (최대 2번)            | `modifyRules`             | 희귀   |
| 공명 증폭기 (`resonance`)   | 한 이동에서 합체가 1번 더 날 때마다 그 이동의 합체 점수 +30%                | `onTurnEnd`               | 고급   |
| 균열 송곳 (`pickaxe`)       | 8 이상을 만든 합체는 대각선 이웃의 돌까지 부순다                            | `modifyRules`             | 고급   |
| 프리즘 코어 (`prismCore`)   | 12번 이동할 때마다 어떤 숫자와도 합쳐지는 프리즘 타일이 나온다              | `onSpawn`                 | 희귀   |
| 모서리 닻 (`cornerAnchor`)  | 네 구석 칸에서 일어난 합체는 점수 1.5배                                     | `onMerge`                 | 일반   |
| 여분 태엽 (`spareSpring`)   | 모든 스테이지의 이동 제한 +6                                                | `modifyRules`             | 일반   |
| 분해 펄스 (`bomb`)          | [사용] 고른 타일 하나를 없앤다 · 스테이지마다 1회                           | 사용(파괴)                | 일반   |
| 역행 코일 (`undo`)          | [사용] 직전 행동을 되돌린다 · 스테이지마다 1회                              | 사용(되돌리기)            | 희귀   |
| 정지 핀 (`freezePin`)       | [사용] 고른 타일을 3턴 동안 얼려 고정한다 · 최대 2회, 스테이지마다 1회 충전 | 사용(얼리기)              | 고급   |
| 역상 필터 (`reverseFilter`) | 얼음이나 저주가 붙은 타일이 낀 합체는 점수 3배                              | `onMerge`                 | 고급   |
| 잔해 연료 (`debrisFuel`)    | 돌을 2개 부술 때마다 이동 +1                                                | `onStoneBreak`            | 일반   |
| 쌍둥이 씨앗 (`twinSeed`)    | 새로 나오는 타일이 4일 확률 +10%                                            | `modifyRules`             | 고급   |
| 점화 플러그 (`ignition`)    | 스테이지를 시작할 때 빈 구석 칸에 32 타일 하나를 놓는다                     | `onStageStart`            | 일반   |
| 지연 장막 (`delayVeil`)     | 보스 규칙의 발동 간격 +2턴                                                  | `modifyRules`             | 고급   |
| 도약 렌즈 (`leapLens`)      | 스테이지의 첫 3번 합체는 결과가 2배가 된다                                  | `onStageStart`, `onMerge` | 고급   |
| 축전 코일 (`capacitor`)     | 합체 8번마다 사용 유물의 충전 +1                                            | `onTurnEnd`               | 고급   |

(수치는 6단계 조정(8.6장) 뒤의 값입니다. 항상 최신인 표는 README에 있습니다. 게임 데이터에서 생성되기 때문입니다.)

이름을 지목하지 않아도 생기는 조합의 예:

- **연쇄 회로 + 공명 증폭기**: 연쇄 합체도 "한 이동의 합체 수"에 들어가므로 점수 배율이 커집니다.
- **정지 핀 + 역상 필터**: 내 손으로 얼린 타일도 "얼음이 붙은 타일"입니다. 구석의 큰 타일을 얼려 두고 그 위에 합치면 3배.
- **정지 핀 + 모서리 닻**: 구석 타일을 고정해 두면 구석 합체가 잘 일어납니다.
- **분해 펄스 + 잔해 연료 + 축전 코일**: 폭탄으로 돌을 부숴도 "돌이 부서진" 것이라 이동이 늘고, 합체가 쌓이면 폭탄이 다시 찹니다.
- **균열 송곳 + 잔해 연료**: 돌을 더 많이 부술수록 이동이 늘어납니다.

**죽은 선택지 걸러내기.** 계획서의 "정화(저주 무효)"는 저주가 나오지 않는 1막에서는 아무 의미가 없고, 효과가 "나쁜 일이 안 일어난다"뿐이라 손맛도 없습니다. 그래서 같은 키워드를 **기회로 바꾸는** 역상 필터(얼음·저주가 낀 합체 점수 3배)로 다시 설계했습니다. 그래도 저주·얼음이 앞으로 없으면 쓸모가 없으므로, 각 유물이 `isUseful`로 "필요한 키워드"를 밝힙니다.

```ts
// src/core/run.ts — 남은 스테이지의 키워드 + 가진 유물이 주는 키워드
function offerContext(run: RunState, fromIndex: number): OfferContext {
  const keywords = grantedKeywords(run.relics); // 예: 정지 핀 → 'ice', 'active'
  if (run.mode === 'endless') for (const k of ENDLESS_KEYWORDS) keywords.add(k);
  else
    for (const spec of STAGES.slice(fromIndex))
      for (const k of stageKeywords(spec)) keywords.add(k);
  return { has: (k) => keywords.has(k) };
}
```

판단 기준은 이름이 아니라 키워드이므로 "정지 핀을 가지고 있으면 역상 필터가 제시될 수 있다"가 두 유물 모두 서로를 모르는 채로 성립합니다. 마지막 보스만 남았을 때 "돌" 관련 유물이 나오는 것은 혼돈 보스가 돌을 놓기 때문이고(`stageKeywords`가 `chaos`에 `stone`을 더함), 무한 모드에서는 이동 제한·보스 관련 유물이 나오지 않습니다.

제시는 희귀도 가중치(일반 3, 고급 2, 희귀 1)로 중복 없이 3개를 뽑습니다(`drawOffer`). 런 전용 난수(`run.rng`)를 쓰므로 보드의 난수 흐름과 섞이지 않습니다.

#### 연습 과제

1. "점화 플러그"의 타일이 무작위 칸이 아니라 "가장 큰 타일이 있는 구석"에 놓이게 바꿔 보세요. 4.7장의 유물 효과 표에서 이 유물의 수치가 어떻게 바뀌는지 `npm run sim`으로 확인해 보세요.
2. 키워드 `'corner'`를 새로 만들고, 어떤 유물이 그것을 `grants`로 주고 어떤 유물이 그것을 `isUseful`에서 요구하게 할지 설계해 보세요. 이름 지목 없이 시너지를 만드는 연습입니다.
3. 반대로, 일부러 나쁜 유물을 하나 만들어 보세요(예: "구석 합체 점수 2배, 단 구석이 아닌 합체는 0점"). 시뮬레이터에서 승률 차이가 크게 음수로 나오는지 확인해 봅니다.

---

### 4.6 보스 규칙과 "계산할 수 있는 정보는 보여 준다"

#### 왜 필요한가

보스는 막마다 하나씩, 일정한 주기로 판을 흔드는 규칙입니다. 이때 중요한 설계 원칙이 있습니다. **플레이어가 계산할 수 있는 정보는 숨기지 말고 보여 준다.** "부식자가 몇 턴 뒤에 무엇을 깎는가"는 플레이어가 손으로 세면 알 수 있습니다. 그걸 숨기면 메모하는 사람만 유리해지고, 보여 주면 모두가 "깎이기 전에 합쳐 버리자" 같은 판단을 할 수 있습니다(외부 자료 조사 노트 3장).

이를 위해 보스의 카운트다운은 숨은 타이머가 아니라 **상태의 일부**입니다.

| 보스                | 주기 | 효과                                                              |
| ------------------- | ---- | ----------------------------------------------------------------- |
| 봉쇄자 (`warden`)   | 5턴  | 무작위 한 줄(가로 또는 세로)을 2턴 동안 봉쇄: 드나들기·합체 불가  |
| 부식자 (`corroder`) | 4턴  | 가장 큰 타일을 절반으로 (같으면 행 우선 첫 타일). 4 미만이면 무시 |
| 혼돈 (`chaos`)      | 6턴  | 얼지 않은 타일을 전부 섞고 돌 1개를 놓음                          |

#### 어디에 쓰였나

- `src/core/bosses.ts`: `BOSSES`(한국어 이름·설명), `BossState`, `advanceBoss`, `tickLock`, `shuffleBoard`, `bossPreview`, `corroderTarget`
- `src/core/run.ts`의 `turnsUntilBoss`, 봉쇄 해제 규칙 `releaseLockIfStuck`
- 테스트: `tests/bosses.test.ts`

#### 핵심 코드

```ts
// src/core/bosses.ts
export interface BossState {
  readonly id: BossId;
  readonly period: number; // 기본 주기 + 유물 보너스
  readonly turnsUntil: number; // 이 값이 0이 되는 이동에서 발동 → HUD가 그대로 표시
  readonly lock: LockedLine | null;
}

export function advanceBoss(state: GameState, boss: BossState): BossStep {
  const turnsUntil = boss.turnsUntil - 1;
  if (turnsUntil > 0) return { state, boss: { ...boss, turnsUntil }, events: [], triggered: false };
  const fired = fireBoss(state, { ...boss, turnsUntil: boss.period });
  return { ...fired, triggered: true };
}
```

`bossPreview(boss, board)`는 다음 발동이 무엇을 할지 알려 줍니다. 부식자는 대상 타일 id까지 미리 계산되므로 3b단계 화면은 그 타일에 주황 괄호를 답니다(5.5장). 봉쇄자가 고를 줄과 혼돈의 섞임 결과는 **난수**라서 미리 알 수 없고, 그래서 미리보기도 "무엇이 일어난다"까지만 줍니다. "계산할 수 있는 것"과 "운"의 경계가 그대로 코드에 드러납니다.

봉쇄 규칙에는 안전장치가 하나 있습니다. **봉쇄 때문에만 막힌 보드라면 봉쇄가 즉시 풀립니다.** 봉쇄가 걸린 상태에서 움직일 수 없으면 턴이 흐르지 않으니 봉쇄도 영원히 안 풀리고, 플레이어는 자기 실수가 아닌 이유로 집니다. 그런 패배는 배울 것이 없어서 규칙으로 막았습니다.

```ts
// src/core/run.ts
function releaseLockIfStuck(run: RunState) {
  const lock = run.boss?.lock;
  if (!run.boss || !lock || !isStuck(run) || !hasAvailableMoves(run.board))
    return { run, events: [] };
  return {
    run: { ...run, boss: { ...run.boss, lock: null } },
    events: [{ type: 'lineUnlock', axis: lock.axis, index: lock.index }],
  };
}
```

#### 연습 과제

1. HUD를 상상하며 `bossPreview`가 돌려줘야 할 정보를 늘려 보세요. 예를 들어 혼돈은 "섞인 뒤 돌이 놓일 수 있는 칸 수"를 미리 알려 줄 수 있습니다. 이것은 계산 가능한 정보인가요?
2. 봉쇄자가 무작위 대신 "타일이 가장 많은 줄"을 고르게 바꿔 보세요. 이제 미리보기로 줄을 보여 줄 수 있습니다. 게임이 더 쉬워질까요, 어려워질까요? 시뮬레이터로 확인해 보세요.
3. 네 번째 보스를 설계해 보세요(예: "3턴마다 무작위 타일 하나를 얼린다"). 기존 이벤트만으로 표현되나요?

---

### 4.7 시뮬레이션으로 밸런스 잡기

#### 왜 필요한가

12스테이지 × (목표, 이동 제한, 방해 확률 6개) + 유물 16종의 수치를 손으로 플레이하며 맞추는 것은 불가능에 가깝습니다. 한 판에 20분이 걸리고, 운의 폭이 커서 몇 판으로는 아무것도 알 수 없습니다.

코어가 순수 함수라는 것이 여기서 큰 보상이 됩니다. **봇**(정해진 규칙으로 방향을 고르는 함수)을 만들어 수백 개의 시드로 런을 돌리면 1분 안에 "1막 보스 클리어율 91%" 같은 숫자를 얻습니다. 숫자는 사람의 감각을 대신하지는 못하지만, **어디가 이상한지**는 정확히 짚어 줍니다.

#### 어디에 쓰였나

- `tools/simulate.ts` (`npm run sim`, `npm run sim -- --runs 1000`)
- 실행기는 `tsx`(개발 의존성)입니다. 브라우저도 Vite도 없이 코어를 바로 실행합니다.
- 조정 대상: `src/core/balance.ts`의 `STAGE_TABLE`, `RELIC_TUNING`

#### 핵심 코드

봇은 세 가지입니다. 모두 **다음 무작위 생성을 엿보지 않습니다**(미끄러짐 결과만 보고 판단). 엿보면 봇이 사람보다 훨씬 잘하게 되어 숫자가 의미를 잃습니다.

| 봇       | 방식                                                                                                                                  | 대역                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `random` | 가능한 방향 중 무작위                                                                                                                 | 규칙을 모르는 사람      |
| `greedy` | 즉시 합체 점수가 가장 큰 방향                                                                                                         | 눈앞만 보는 사람        |
| `corner` | 한 수 앞을 보고 "큰 수가 한쪽으로 정렬, 빈 칸 많음, 붙은 같은 수" 점수가 높은 방향. 돌 목표면 돌 파괴 가산. 막히면 폭탄·되돌리기 사용 | 구석 전략을 아는 중급자 |

유물은 무작위로 고릅니다. 출력은 세 표입니다.

1. **런 안에서의 스테이지별 클리어율**(그 스테이지까지 온 런 중 클리어한 비율)과 클리어 때 쓴 평균 이동 수
2. **스테이지 단독, 유물 없음**: 각 스테이지를 처음부터 따로 돌린 클리어율과 실패 원인(이동 소진/막힘)
3. **유물 효과**: 각 유물이 **처음 제시된 순간**에 그것을 고른 런과 다른 것을 고른 런의 승률 차이. 고르기가 무작위라서 작은 무작위 실험이 됩니다. "한 번이라도 가진 런"으로 비교하면 오래 살아남은 런일수록 제시를 많이 받아 그 유물을 가질 확률이 높아지므로(생존 편향), 모든 유물이 좋아 보이는 착시가 생깁니다. 실제로 처음엔 그렇게 짰다가 거의 모든 유물이 +10~+28점으로 나와서 고쳤습니다.

**조정 기록**(코너 봇 기준, 목표: 1막은 거의 항상 통과, 3막 보스는 어렵지만 가능, 무작위 봇은 1막을 거의 못 넘음):

| 단계 | 바꾼 것                                                                        | 이유(시뮬레이터가 보여 준 것)                                                 |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1    | 처음 짠 구석 봇(가중치 표 + 빈 칸) → 줄 단위 휴리스틱(정렬·빈 칸·붙은 같은 수) | 첫 구석 봇이 탐욕 봇보다 못했음. 봇이 약하면 모든 수치가 틀어짐               |
| 2    | 1-1 점수 400 → 360, 1-2 돌 목표 이동 40 → 45                                   | 1막 초반에 코너 봇이 5% 안팎으로 이동 소진 실패                               |
| 3    | 봉쇄만으로 막힌 보드는 봉쇄 해제 (규칙 추가)                                   | 1막 보스 실패의 상당수가 "봉쇄 때문에 아무 방향도 안 됨"이었음                |
| 4    | 2-1 점수 1300 → 1100, 2-3 이동 105 → 135, 2보스 점수 2200 → 2000               | 단독 클리어율 0~25%. 유물 없이도 가끔은 가능하게                              |
| 5    | 3-1을 "256 / 200이동"에서 "128 / 125이동 + 방해 강화"로                        | 256 목표는 이동 200개 이상이 필요해 길기만 하고 어렵지 않음. 난이도는 방해로  |
| 6    | 쌍둥이 씨앗 +30% → +20%(고급), 프리즘 주기 8 → 10                              | 두 유물의 승률 차이가 +20점 이상으로 다른 유물을 압도                         |
| 7    | 1막 보스 이동 120 → 105, 돌 확률 0.05 → 0.1                                    | 무작위 봇의 1막 통과율을 낮추려는 시도(31% → 22%). 대신 코너 봇도 조금 내려감 |

**3a단계 당시 결과**(`npm run sim -- --runs 500`, 시드 1000~1499). 4단계에서 표를 다시 짰으므로 지금 숫자는 6.5장에 있습니다:

런 안에서의 스테이지별 클리어율 / 클리어 때 평균 이동

| 스테이지 | 목표 / 이동             | 방해(돌·얼음·저주 확률)    | random    | greedy    | corner    |
| -------- | ----------------------- | -------------------------- | --------- | --------- | --------- |
| 1-1      | 점수 360 / 60           | 없음                       | 93% · 52  | 100% · 46 | 100% · 48 |
| 1-2      | 돌 3개 / 45             | 시작 돌 2, 돌 .10          | 98% · 13  | 99% · 13  | 99% · 12  |
| 1-3      | 64 타일 / 70            | 돌 .04, 얼음 .07           | 86% · 50  | 98% · 43  | 100% · 44 |
| 1-보스   | 128 타일 / 105, 봉쇄자  | 돌 .10, 얼음 .06           | 28% · 83  | 73% · 82  | 91% · 88  |
| 2-1      | 점수 1100 / 115         | 돌 .05, 얼음 .05, 저주 .06 | 40% · 99  | 89% · 96  | 90% · 98  |
| 2-2      | 돌 7개 / 90             | 시작 돌 2, 돌 .12 …        | 95% · 42  | 97% · 46  | 99% · 45  |
| 2-3      | 128 타일 / 135          | 돌 .06, 얼음 .06, 저주 .07 | 50% · 86  | 79% · 89  | 79% · 100 |
| 2-보스   | 점수 2000 / 170, 부식자 | 돌 .05, 얼음 .05, 저주 .06 | 67% · 145 | 71% · 146 | 77% · 140 |
| 3-1      | 128 타일 / 125          | 돌 .10, 얼음 .10, 저주 .10 | 14% · 89  | 65% · 85  | 68% · 98  |
| 3-2      | 돌 12개 / 110           | 시작 돌 3, 돌 .15 …        | (n=2)     | 94% · 62  | 98% · 60  |
| 3-3      | 점수 3000 / 200         | 돌 .07, 얼음 .07, 저주 .08 | (n=1)     | 58% · 142 | 93% · 150 |
| 3-보스   | 256 타일 / 220, 혼돈    | 돌 .06, 얼음 .06, 저주 .07 | (도달 0)  | 64% · 105 | 58% · 159 |

| 봇     | 승리 | 1막 통과 | 3막 보스 도달 | 3막 보스 클리어(도달한 런 중) |
| ------ | ---- | -------- | ------------- | ----------------------------- |
| random | 0%   | 22%      | 0%            | -                             |
| greedy | 8%   | 71%      | 12%           | 64%                           |
| corner | 17%  | 89%      | 30%           | 58%                           |

유물 효과(코너 봇, 처음 제시된 순간 고른 런 vs 다른 것을 고른 런의 승률 차이, 표본 각 90~300런):
프리즘 코어 +18.2, 모서리 닻 +7.7, 쌍둥이 씨앗 +5.3, 공명 증폭기 +4.8, 도약 렌즈 +3.2, 잔해 연료 +0.9, 분해 펄스 −0.4, 여분 태엽 −0.5, 연쇄 회로 −1.4, 역상 필터 −5.2, 역행 코일 −5.3, 점화 플러그 −6.1, 축전 코일 −7.1, 지연 장막 −8.1, 균열 송곳 −9.4, 정지 핀 −11.0 (점).

**정직한 해석:**

- **목표를 다 맞추지는 못했습니다.** 코너 봇의 1막 통과율은 89%로 "거의 항상"(95% 이상)에 못 미치고, 무작위 봇의 1막 통과율 22%는 "거의 못 넘는다"고 하기엔 높습니다. 두 숫자는 서로 당깁니다: 1막 보스를 어렵게 하면 둘 다 떨어집니다. 무작위 봇은 주로 "막힘"으로, 코너 봇은 주로 "이동 소진"으로 실패하므로, 둘을 가르려면 이동 제한보다 보드 압박(방해)을 조절하는 쪽이 맞아 보이지만 이번 단계에서는 거기까지 가지 못했습니다.
- **3막 보스는 "어렵지만 가능"** 에 가깝습니다: 코너 봇 런의 30%가 도달하고 그중 58%가 이깁니다(전체 승률 17%).
- **스테이지 단독 표에서 2-보스와 3-3의 클리어율이 0%** 인 것은 의도입니다. 점수 목표는 유물(점수 배율, 4 확률) 없이는 닿지 않게 잡혀 있어, 런이 쌓은 빌드가 의미를 갖습니다. 반대로 말하면 **유물을 잘못 고르면 2막 보스에서 막히는 구조**이고, 이것이 재미인지 벽인지는 사람이 해 봐야 압니다.
- **유물 표의 차이는 대부분 통계적 잡음 범위**입니다(표본 100~300런, 승률 20% 안팎이면 표준오차가 ±5점가량). 확실히 큰 것은 프리즘 코어(+18)뿐이고, 정지 핀·축전 코일이 음수인 것은 **봇이 이 유물들을 쓰지 않기 때문**입니다(봇은 정지 핀을 쓰지 않고, 사용 유물을 막혔을 때만 씁니다). 즉 이 표는 "유물의 가치"가 아니라 "이 봇에게의 가치"입니다. 균열 송곳·점화 플러그가 음수인 이유(무작위 칸에 놓인 16이 구석 정렬을 망침 등)는 사람 플레이로 확인이 필요합니다.
- 봇의 성적은 **절대값이 아니라 비교용**입니다. 사람은 봇보다 잘하는 부분(계획)과 못하는 부분(실수, 피로)이 다릅니다.

#### 연습 과제

1. 코너 봇이 정지 핀을 쓰게 해 보세요(예: 가장 큰 타일이 구석에 있고 얼어 있지 않으면 고정). 정지 핀과 역상 필터의 승률 차이가 어떻게 바뀌나요?
2. `--runs 2000`으로 돌려 유물 표의 숫자가 300런일 때와 얼마나 달라지는지 보세요. 표준오차를 출력하는 코드를 추가해 보면 더 좋습니다.
3. 무작위 봇의 1막 통과율을 10% 아래로, 코너 봇은 95% 위로 만드는 1막 보스 설정을 찾아보세요. 이동 제한만 바꾸는 것과 방해 확률만 바꾸는 것 중 어느 쪽이 두 봇을 더 잘 가르나요?

## 5. 3b단계: 로그라이크를 화면에

3a단계의 순수 코어(`startRun / runMove / chooseRelic / useActive`) 위에 실제 화면을 올렸습니다. 메뉴, HUD, 보스 안내, 유물 선택, 결과 화면, 사용 유물의 대상 지정, 보드 위의 표시(봉쇄된 줄, 부식자의 다음 대상)가 생겼고, 2단계의 "그냥 2048" 모드는 없앴습니다. 이 장의 주제는 **화면 쪽 설계**입니다. 규칙은 하나도 새로 만들지 않았다는 점이 중요합니다(코어에 추가된 것은 저장된 런을 다시 그리는 `restoreStep` 하나뿐).

```
 [입력] 스와이프·탭·Esc ──▶ RunController ──▶ 코어(runMove …) ──▶ RunStep
                              │  화면 상태 기계                      │
                              │  (menu/playing/targeting/…)          │
                              ├──▶ BoardDisplay: showStep, setMarks ◀┘  (캔버스)
                              └──▶ UiDisplay: showScreen, updateHud, showHint … (DOM)
                                        ▲
                         runView.ts(프레젠터): RunState → 화면 모델(한국어 문자열 포함)
```

### 5.1 상태 기계로 화면 흐름 만들기

#### 왜 필요한가

게임 화면은 "지금 무엇을 받아들이는가"가 계속 바뀝니다. 메뉴에서는 모드 선택만, 게임 중에는 스와이프와 유물 버튼, 대상 지정 중에는 칸 탭과 취소만, 유물 선택 중에는 카드만 받아야 합니다. 이걸 `if (offerOpen && !paused && …)` 같은 불리언 여러 개로 관리하면 "일시정지 중인데 유물 선택 창도 열림" 같은 **불가능한 조합**이 생깁니다.

상태 기계는 "가능한 상태를 이름 붙여 나열하고, 각 상태에서 허용되는 입력과 다음 상태만 정의"합니다. 상태가 하나의 값이므로 불가능한 조합이 아예 표현되지 않습니다.

#### 어디에 쓰였나

- `src/game/runController.ts` — `RunController`: 화면 상태(`ScreenModel['kind']`)와 대상 지정 중인 유물(`targeting`)
- `src/game/runView.ts` — `ScreenModel` 유니온 타입(화면마다 필요한 데이터를 함께 담음)
- `tests/runController.test.ts` — 흐름 전체를 가짜 표시 계층으로 검증

#### 핵심 코드

화면 상태는 **두 층**입니다. 런 자체의 상태(`run.status`: playing/offer/victory/gameOver)는 코어가 정하고, 화면만의 상태(메뉴, 일시정지, 대상 지정)는 컨트롤러가 더합니다. 컨트롤러는 코어 상태를 복제하지 않고 **매번 거기서 화면을 유도**합니다.

```ts
// src/game/runController.ts
private screenFor(run: RunState): ScreenModel {
  switch (run.status) {
    case 'playing':
      return this.targeting
        ? { kind: 'targeting', relic: this.targeting, prompt: targetingPrompt(this.targeting), error: null }
        : { kind: 'playing' };
    case 'offer':
      return offerScreen(run);
    case 'victory':
    case 'gameOver':
      return resultScreen(run, this.isNewRecord(run));
  }
}
```

입력마다 "지금 상태에서 받는가"를 첫 줄에서 거릅니다. 거부된 입력은 `false`를 돌려주므로 테스트하기 쉽습니다.

```ts
handleDirection(direction: Direction): boolean {
  if (!this.state || this.screen !== 'playing') return false; // 메뉴·선택·지정·정지 중엔 무시
  const step = runMove(this.state, direction);
  if (!step.changed) return false;
  this.apply(step);
  return true;
}
```

```
 menu ──start──▶ playing ◀────────────────┐
                  │ │ │                    │
        pause ◀───┘ │ └──▶ targeting ──────┤ (칸 탭 / 취소)
                    ▼                      │
      offer (클리어·무한 단계 도달) ──────────┘ chooseRelic
                    ▼
      result (승리/실패/종료) ──retry──▶ playing,  ──menu──▶ menu
```

`ScreenModel`은 화면 종류와 **그 화면에 필요한 데이터**를 함께 담은 판별 유니온입니다. `offer`면 카드 목록이, `result`면 요약이 반드시 있습니다. 표시 쪽은 `switch (screen.kind)`만 하면 되고, TypeScript가 빠진 경우를 잡아 줍니다.

#### 연습 과제

1. "설정" 화면(소리 끄기 등)을 상태로 추가해 보세요. `ScreenModel`에 종류를 하나 더하면 컴파일러가 어디를 고쳐야 하는지 알려 줍니다.
2. 지금은 유물 선택 화면에서 Esc가 아무 일도 하지 않습니다(`back()`이 `pause()`를 시도하지만 거부됨). 의도된 동작인지, 바꿔야 한다면 어떤 상태 전이가 맞는지 생각해 보세요.
3. `tests/runController.test.ts`의 "pause blocks input" 테스트를 참고해 "대상 지정 중 일시정지하면 지정이 취소된다"를 확인하는 테스트를 써 보세요.

---

### 5.2 컨트롤러와 표시 계층 분리: 인터페이스와 가짜 객체

#### 왜 필요한가

화면 흐름은 버그가 숨기 좋은 곳입니다("스테이지를 깼는데 다음 스테이지 배너가 안 나옴", "되돌리기 후 보드가 이상함"). 하지만 브라우저를 띄워야만 확인할 수 있다면 테스트가 느리고 불안정합니다. 컨트롤러가 렌더러와 DOM을 **인터페이스로만** 알면, 테스트에서는 호출을 기록만 하는 가짜(fake)를 넣고 수백 가지 흐름을 1초 안에 확인할 수 있습니다.

#### 어디에 쓰였나

- `src/game/runController.ts` — `BoardDisplay`, `UiDisplay` 인터페이스
- 실제 구현: `src/render/renderer.ts`의 `BoardRenderer`(캔버스), `src/ui/gameScreen.ts`의 `GameUi`(DOM)
- 가짜 구현: `tests/runController.test.ts`의 `FakeBoard`, `FakeUi`; `tests/debug.test.ts`의 `ViewBoard`(진짜 뷰 모델 + 손으로 돌리는 시계)

#### 핵심 코드

```ts
// src/game/runController.ts — 컨트롤러가 아는 전부
export interface BoardDisplay {
  showStep(step: RunStep): void; // boardReplaced면 비우고 재생
  setMarks(marks: BoardMarks): void; // 봉쇄 줄, 부식자 대상, 대상 지정
  clear(): void;
}
export interface UiDisplay {
  showScreen(screen: ScreenModel): void;
  updateHud(hud: HudModel): void;
  scoreGained(amount: number): void;
  showHint(hint: Hint | null): void;
  announceStage(banner: StageBanner): void;
}
```

```ts
// tests/runController.test.ts — 가짜는 받은 것을 적어 둘 뿐
class FakeUi implements UiDisplay {
  screens: ScreenModel[] = [];
  showScreen(screen: ScreenModel): void {
    this.screens.push(screen);
  }
  // …
}

it('stage clear → offer → pick → next stage with banner, relic and stone hint', () => {
  controller.load(clearable()); // 정확한 보드를 꾸며 넣기
  controller.handleDirection('left');
  expect(ui.screen.kind).toBe('offer');
  controller.chooseRelic(pick);
  expect(ui.hud?.stageLabel).toBe('1막 2');
  expect(ui.hint?.key).toBe('hazard:stone');
});
```

테스트에 "정확한 상황"을 만들기 위해 `controller.load(run)`을 씁니다. 런 상태가 평범한 데이터라서(2.3장) 아무 보드나 꾸며 넣을 수 있고, 4단계의 "저장된 런 이어 하기"도 같은 함수를 씁니다. 다시 그리는 데 필요한 이벤트는 코어의 `restoreStep(run)`이 만듭니다.

두 인터페이스 사이에는 **프레젠터**(`src/game/runView.ts`)가 있습니다. `hudModel(run)`, `boardMarks(run, targeting)`, `offerScreen(run)` 같은 순수 함수가 런 상태를 "화면이 그대로 그리면 되는 모델"로 바꿉니다. 한국어 문구도 전부 여기 있어서 `tests/runView.test.ts`가 "1막 보스", "다음 발동: 64 → 32" 같은 문자열까지 확인합니다. DOM 코드는 받은 문자열을 `textContent`에 넣기만 합니다.

#### 연습 과제

1. `FakeUi`처럼 화면 호출을 한국어 로그로 찍는 `ConsoleUi implements UiDisplay`를 만들어 Node에서 런 하나를 끝까지 돌려 보세요. 화면 없이 게임 흐름 전체가 돌아갑니다.
2. `hudModel`의 남은 이동 경고 기준(`LOW_MOVES`)을 바꾸고, 어느 테스트가 깨지는지 보세요. 숫자 하나가 바뀌었을 때 DOM 테스트 없이 잡힌다는 점이 핵심입니다.
3. 생각해 보기: `GameUi`(DOM)는 단위 테스트가 없습니다. 무엇으로 대신 확인하고 있나요? (힌트: 5.6장의 브라우저 검사)

---

### 5.3 DOM 오버레이와 캔버스: 무엇을 어디에

#### 왜 필요한가

캔버스는 빠르고 자유롭지만 글자 줄바꿈, 버튼, 포커스, 스크린 리더, 반응형 배치를 전부 직접 해야 합니다. DOM은 그 반대입니다. 둘을 섞되 **경계 규칙**이 있어야 "이 표시는 어디서 고치지?"를 헤매지 않습니다.

이 프로젝트의 규칙: **칸에 묶인 것은 캔버스, 읽거나 누르는 것은 DOM.**

| 캔버스 (`src/render/`)                                    | DOM (`src/ui/`)                                      |
| --------------------------------------------------------- | ---------------------------------------------------- |
| 타일, 돌·프리즘 그림, 얼음·저주 표시                      | 스테이지 이름, 목표와 진행 막대, 남은 이동, 점수     |
| 봉쇄된 줄(빗금 띠 + 남은 턴 배지)                         | 보스 이름·규칙·발동까지 남은 턴·미리보기 문장        |
| 부식자의 다음 대상(모서리 괄호 + 남은 턴)                 | 사용 유물 버튼, 유물 칩과 설명 말풍선                |
| 대상 지정 중 고를 수 있는 칸(점선 테두리)과 나머지 어둡게 | 안내 한 줄, 스테이지 배너, 대상 지정 안내·취소 버튼  |
| 발동 펄스, 줄 섬광 같은 짧은 효과                         | 메뉴, 유물 선택, 일시정지, 결과 화면(전체 화면 시트) |

DOM 요소가 보드 위에 겹치는 경우도 규칙이 있습니다. 배너·안내처럼 잠깐 떴다 사라지는 것만 보드 위에 두고, **플레이어가 보드를 보며 판단해야 하는 동안 떠 있는 것**(대상 지정 막대, "움직일 수 없어요")은 보드를 가리지 않도록 유물 줄 자리에 띄웁니다. 처음에는 보드 아래쪽에 두었다가, 맨 아랫줄 타일을 폭탄으로 고를 수 없는 문제를 스크린샷에서 발견하고 옮겼습니다.

#### 어디에 쓰였나

- `src/render/marks.ts` — `BoardMarks` 타입, 보드 배경(슬롯·회로·균열), 봉쇄 줄·부식자 대상·대상 지정 그리기
- `src/render/effects.ts` — 펄스·줄 섬광·테두리 섬광과 이벤트별 기본 효과(`cueEffect`)
- `src/ui/gameScreen.ts`(틀 + `GameUi`), `src/ui/hud.ts`(HUD), `src/ui/screens.ts`(전체 화면 시트), `src/ui/style.css`

#### 핵심 코드

보드 표시는 **애니메이션이 끝난 뒤** 바뀝니다. 봉쇄가 걸린 이동을 재생하는 도중에 빗금이 먼저 나타나면 원인과 결과가 뒤집혀 보이기 때문입니다. 반대로 대상 지정 표시는 누르자마자 보여야 하므로 즉시 바꿉니다.

```ts
// src/render/renderer.ts
setMarks(marks: BoardMarks): void {
  const now = this.clock.now();
  const at = Math.max(this.view.endTime, this.pendingCues.at(-1)?.at ?? -Infinity);
  if (at <= now || marks.targeting || this.marks.targeting) {
    this.marks = marks; // 즉시
    this.pendingMarks = null;
  } else {
    this.pendingMarks = { marks, at }; // 지금 재생 중인 턴이 끝나면
  }
  this.loop.invalidate();
}
```

연출·소리를 위한 연결 지점은 **큐(cue)** 입니다. `BoardView.apply`가 이벤트마다 "이 이벤트가 화면에 닿는 시각"을 돌려주고, 렌더러는 그 시각이 되면 구독자에게 알립니다. 빨리 감기(D12)로 건너뛴 이벤트는 `late: true`로 즉시 알립니다(소리는 낼 수도, 효과는 생략할 수도 있게). 5단계에서 큐에 `hit`(합체 팝처럼 실제로 "닿는" 시각)과 `step`(어느 단계의 큐인지)이 더해졌습니다(7.1, 7.4장).

```ts
// src/render/renderer.ts
renderer.onCue((cue, late) => { … }); // cue = { event, phase, phaseIndex, at, hit, step }

// src/main.ts — 유물이 발동하면 HUD의 유물 아이콘이 같은 순간에 반짝
renderer.onCue((cue, late) => {
  if (!late && cue.event.type === 'trigger' && isRelicId(cue.event.source)) {
    screen.ui.pulseRelic(cue.event.source);
  }
});
```

보드의 기본 효과(발동 펄스, 봉쇄 줄 섬광, 파괴 고리)도 같은 훅에 붙은 구독자 하나일 뿐입니다(`cueEffect`). 5단계의 파티클·흔들림·효과음·진동도 실제로 구독자 하나(`Feedback.cue`)를 더하는 것으로 붙었습니다(7장).

레이아웃은 CSS **컨테이너 쿼리 단위**로 보드를 정사각형으로 맞춥니다. 세로 화면에서 HUD 줄들이 자기 높이를 차지하고, 남은 공간(`flex: 1`)에서 보드가 `min(가로, 세로)`가 됩니다.

```css
.board-area {
  flex: 1;
  min-height: 0;
  container-type: size;
  display: grid;
  place-items: center;
}
.board {
  width: min(100cqw, 100cqh);
  aspect-ratio: 1;
}
```

가로로 눕힌 휴대폰에서는 같은 요소들을 그리드 영역으로 재배치해 HUD를 왼쪽 열에 둡니다(HTML은 그대로).

#### 연습 과제

1. `cueEffect`에 `merge` 이벤트용 효과(값이 128 이상이면 큰 고리)를 추가해 보세요. 렌더러 본체는 고치지 않아도 됩니다.
2. `?debug&mode=run&stage=3`으로 열고 봉쇄가 걸릴 때 `__neonRift.advance(50)`을 반복해 보세요. 빗금이 언제 나타나는지(턴 애니메이션 뒤) 확인합니다.
3. 개발자 도구에서 컨테이너 쿼리를 지원하지 않는 브라우저를 흉내 낼 수는 없습니다. 대신 `100cqw`가 무시되면 어떻게 보일지 예상하고, `aspect-ratio`만으로 대체하는 규칙을 써 보세요.

---

### 5.4 대상 지정과 모달 입력 모드

#### 왜 필요한가

분해 펄스(폭탄)와 정지 핀은 "어느 타일에?"가 필요합니다. 버튼을 누르는 순간 바로 쓰는 게 아니라 **입력의 의미가 바뀌는 모드**에 들어갑니다. 이때 보드를 탭하면 "칸 고르기"이고, 스와이프는 무시되며, 취소할 길이 늘 보여야 합니다. 모드가 명시적이지 않으면 "고르려고 살짝 끌었는데 보드가 움직였다" 같은 사고가 납니다.

#### 어디에 쓰였나

- `src/game/runController.ts` — `activateRelic`, `handleCellTap`, `cancelTargeting`, `back`
- `src/input/index.ts`, `src/input/swipe.ts` — 탭 판정(`isTap`: 임계값 절반 안에서 떼고 스와이프가 없었음), Esc
- `src/render/layout.ts` — `cellAtPoint`(화면 좌표 → 칸; 칸 사이 간격은 가까운 칸 몫)
- `src/render/marks.ts` — 고를 수 있는 칸만 점선, 나머지는 어둡게

#### 핵심 코드

```ts
// src/game/runController.ts
activateRelic(id: RelicId): boolean {
  if (this.screen === 'targeting') {
    const same = this.targeting === id;
    this.cancelTargeting();
    if (same) return true; // 같은 버튼을 다시 누르면 취소
  }
  if (this.screen !== 'playing') return false;
  const active = RELICS[id].active;
  if (active?.target === 'none') return this.useActiveAt(id); // 되돌리기는 즉시
  this.targeting = id; // 폭탄·핀은 대상 지정 모드로
  this.options.board.setMarks(boardMarks(this.state, id));
  this.setScreen({ kind: 'targeting', relic: id, prompt: targetingPrompt(id), error: null });
  return true;
}

handleCellTap(pos: Position): boolean {
  if (this.screen !== 'targeting' || !this.state || !this.targeting) return false;
  if (!canUseActive(this.state, this.targeting, pos)) {
    // 모드는 유지하고 이유를 알려 준다: "빈 칸이에요…", "돌은 얼릴 수 없어요"
    …
  }
  …
}
```

판정은 코어의 `canUseActive` 하나에 맡깁니다. 화면이 고를 수 있는 칸을 표시할 때도 같은 규칙(`targetCells`)을 써서 "점선이 있는데 안 눌림"이 생기지 않습니다.

막힌 보드에서 구조 수단이 남아 있으면(D32) 코어는 상태를 `playing`으로 둡니다. 화면은 `runDirections(run)`이 비어 있는 것을 보고 "움직일 수 없어요 · 유물을 사용하세요"를 유물 줄 자리에 띄웁니다(`HudModel.stuck`).

#### 연습 과제

1. 대상 지정 중 스와이프를 "취소 + 이동"으로 바꾸면 어떤 장단점이 있을까요? `handleDirection` 한 줄을 바꿔 직접 해 보세요.
2. 정지 핀의 고를 수 있는 칸에서 "이미 얼어 있는 타일"을 빼야 할까요? `targetCells`와 코어의 `canUseActive` 중 어디를 고쳐야 둘이 어긋나지 않나요?
3. `cellAtPoint` 테스트(`tests/render-math.test.ts`)에 "보드 모서리 패딩을 누르면 가장 가까운 칸" 규칙을 추가하고 구현해 보세요.

---

### 5.5 계산할 수 있는 정보는 화면에

#### 왜 필요한가

4.6장에서 "플레이어가 계산할 수 있는 정보는 보여 준다"를 코어 쪽에서 준비했습니다(`turnsUntil`, `bossPreview`). 이 단계는 그걸 실제로 보여 주는 단계입니다. 원칙은 **숫자는 HUD에, 위치는 보드에** 입니다.

- 보스 줄: 이름 · 다음 발동 미리보기 · **발동까지 N턴**(1턴 남으면 깜빡임) · 규칙 한 줄
- 부식자: HUD에 "다음 발동: 64 → 32", 보드의 그 타일에 주황 괄호와 남은 턴. 타일이 미끄러지면 괄호도 따라갑니다(`BoardView.tilePosition`).
- 봉쇄자: 어느 줄이 걸릴지는 난수라 미리 보여 주지 않고("무작위 한 줄 봉쇄"), 걸린 뒤에는 빗금 띠와 남은 턴을 보드와 HUD 양쪽에 보여 줍니다.
- 얼음: 남은 고정 턴 배지, 저주: "½" 배지. 목표: 현재/목표 숫자와 막대, 남은 이동(적으면 빨갛게).

처음 보는 방해 타일과 보스는 **한 줄 안내**로 알려 줍니다(외부 자료 조사 노트의 "튜토리얼을 게임에 녹여라"). 한 번 본 안내는 다시 나오지 않고, 여러 개면 대기열로 하나씩, 이동을 몇 번 하면 스스로 닫힙니다.

#### 어디에 쓰였나

- `src/game/runView.ts` — `bossInfo`, `hudModel`, `boardMarks`, `stageStartHints`, `hazardsInEvents`, `stageBanner`
- `src/render/marks.ts` — 봉쇄 띠, 부식자 괄호
- `src/render/tilePainter.ts` — 얼음 판(서리 + 결정 + 턴 배지), 저주(지그재그 테두리 + ½)
- 브라우저 검사: 저장소 밖의 일회용 Playwright 스크립트 (5.6장)

#### 핵심 코드

```ts
// src/game/runView.ts
case 'halve': {
  const tile = run.board.cells.find((t) => t?.id === preview.tileId);
  text = tile ? `다음 발동: ${tile.value} → ${tile.value / 2}` : '다음 발동: 깎을 타일 없음';
  break;
}
```

```ts
// 안내: 무한 모드처럼 시간이 지나며 방해가 섞여 들어오면 이벤트에서 "처음 등장"을 찾는다
export function hazardsInEvents(events: readonly TurnEvent[]): HazardKind[] {
  …
  if (e.type === 'spawn' && e.kind === 'stone') out.add('stone');
  else if (e.type === 'statusChange' && e.cause === 'ice') out.add('ice');
  …
}
```

외형도 정보입니다. 방해 타일은 색만이 아니라 **형태**로 구분됩니다(색각 이상 대응 겸). 숫자 타일은 모서리를 깎은 "칩", 돌은 빛나지 않는 울퉁불퉁한 파편, 얼음은 서리 낀 판, 저주는 지그재그 테두리입니다. 게임 전체의 모티프는 "회로 기판 아래로 갈라진 균열"이라, 보드 바닥에는 칸 사이로 회로선과 주황색 균열이 비칩니다.

#### 연습 과제

1. 혼돈(3막 보스)의 미리보기에 "섞인 뒤 돌이 놓일 수 있는 빈 칸 수"를 더해 보세요(4.6장 연습 1의 실전판). 계산 가능한 정보인지 다시 생각해 보세요.
2. 남은 이동 경고 기준을 "남은 이동 < 목표까지 필요한 최소 이동 추정"으로 바꾸면 더 유용할까요? 점수 목표에서 그 추정을 어떻게 할 수 있을까요?
3. 안내가 이동 3번 뒤 자동으로 닫히는 것(`HINT_MOVES`)이 너무 빠른지, 직접 플레이해 보며 판단해 보세요.

---

### 5.6 실제 브라우저로 흐름 검사하기

#### 왜 필요한가

단위 테스트는 컨트롤러와 프레젠터를 확인하지만 "카드가 화면 밖으로 잘림", "버튼이 44px보다 작음", "안내가 맨 윗줄 타일을 가림"은 실제 브라우저에서만 보입니다.

#### 어디에 쓰였나

- `src/game/debug.ts` — `?mode=run|endless`, `?stage=<0부터>`, `?relics=a,b` 시작 옵션과 확장된 `window.__neonRift`
- 검사 스크립트는 저장소 밖 스크래치 폴더에 둡니다(사전 설치된 Playwright 사용, 의존성 추가 없음)

#### 핵심 코드

```js
// 주소: .../2048-project/?debug&mode=run&stage=3&relics=bomb,undo&seed=11
__neonRift.hud(); // HUD 모델: { stageLabel: '1막 보스', boss: { turnsUntil: 5, … }, … }
__neonRift.screen(); // { kind: 'playing' } / { kind: 'offer', cards: [...] } …
__neonRift.move('down');
__neonRift.activate('bomb'); // 버튼 누르기와 같음 → 대상 지정
__neonRift.cellPoint(3, 1); // 그 칸 중심의 화면 좌표 → 진짜 터치로 탭
__neonRift.useActive('bomb', { row: 3, col: 1 }); // 대상 지정을 건너뛰고 바로 사용
__neonRift.chooseRelic('chain');
__neonRift.load({ ...__neonRift.run(), board: 꾸민보드 }); // 정확한 상황 만들기
```

검사 스크립트는 각 화면에서 **배치 감사**를 합니다. 페이지 스크롤이 없는지, 보이는 모든 요소가 화면 안에 있는지, 모든 버튼이 44px 이상인지, 말줄임으로 잘린 핵심 글자가 없는지를 320×568부터 데스크톱, 가로 휴대폰까지 7개 크기에서 확인합니다. 스크린샷은 비교용이 아니라 **사람(또는 리뷰어)이 직접 보는 증거**입니다. 이번 단계에서 스크린샷을 보고 고친 것: 대상 지정 막대가 맨 아랫줄을 가림, 봉쇄 배지가 보드 밖으로 잘림, 안내와 스테이지 배너가 겹침, 유물이 많을 때 칩이 반쯤 잘려 보임(→ 한 줄만 보이고 "유물 +N").

#### 연습 과제

1. `?debug&mode=endless&relics=bomb,undo,freezePin`으로 열어 사용 유물 세 개가 한 줄에 들어가는지 320px 폭에서 확인해 보세요.
2. 배치 감사에 "글자와 배경의 명도 대비 4.5:1 이상" 검사를 추가하려면 무엇을 계산해야 할까요?
3. 에이전트 플레이테스트를 상상해 보세요: `hud()`와 `screen()`만 보고 다음 수를 고르는 봇을 브라우저에서 돌린다면, 지금 API에 무엇이 더 필요할까요?

---

## 6. 4단계: 저장, 온보딩, 오늘의 도전, 밸런스

3b단계까지 게임은 새로고침하면 모든 것이 사라졌습니다. 이번 단계는 **"다시 찾아오게 만드는 것"** 을 다룹니다: 하던 판이 그대로 남아 있고(저장), 처음 온 사람이 설명서 없이 배우고(온보딩), 매일 할 이유가 있고(오늘의 도전), 한 판이 휴대폰으로 할 만한 길이(밸런스)입니다.

```
 RunController ──apply(step)──▶ BoardDisplay / UiDisplay   (3b단계와 같음)
       │
       └──persist(run)──▶ SaveStore ──▶ KeyValueStorage (localStorage 또는 MemoryStorage)
                            │  neon-rift/profile      기록·본 안내·설정·도전 기록
                            └  neon-rift/run/<슬롯>   run · endless · daily
```

### 6.1 버전 있는 저장: 스키마, 검증, 마이그레이션, 주입한 저장소

#### 왜 필요한가

`localStorage.setItem('save', JSON.stringify(run))` 한 줄이면 저장은 됩니다. 문제는 **읽을 때** 생깁니다. 저장소에 있는 값은 프로그램 바깥에서 온 데이터입니다: 예전 버전이 쓴 모양, 다른 앱이 같은 키에 쓴 값, 쓰다가 끊긴 반쪽 JSON, 사용자가 개발자 도구로 고친 값. 이걸 그대로 코어에 넘기면 "칸이 15개인 보드" 같은 상태로 게임이 이상하게 죽습니다. 또 사생활 보호 모드나 꽉 찬 저장소에서는 `setItem`이 **예외를 던지고**, 어떤 브라우저는 `window.localStorage`를 읽기만 해도 던집니다.

그래서 저장 계층의 원칙은 넷입니다.

1. **봉투에 버전**: 모든 값은 `{ schema: n, ... }`. 모양이 바뀌면 `n`을 올리고 이전 버전에서 올리는 함수(마이그레이션)를 하나 추가합니다.
2. **읽은 값은 `unknown`**: 검증 함수가 통과시키기 전까지는 타입이 없습니다. 실패하면 기본값으로 대체하고, 망가진 필드 하나 때문에 나머지(예: 기록)를 버리지 않습니다.
3. **쓰기는 절대 예외를 내보내지 않음**: 실패하면 "이번 방문은 저장되지 않음"일 뿐, 게임은 메모리에 있는 사본으로 계속됩니다.
4. **저장소는 주입**: `SaveStore`는 `localStorage`를 직접 모릅니다. 테스트는 `MemoryStorage`나 일부러 예외를 던지는 가짜를 넣습니다.

#### 어디에 쓰였나

- `src/save/storage.ts` — `KeyValueStorage`, `MemoryStorage`, `browserStorage()`(쓰고 지워 보는 확인까지 통과해야 진짜 저장소)
- `src/save/schema.ts` — `migrate(raw, current, migrations)`
- `src/save/validate.ts` — `isRunState` 등 구조 검사
- `src/save/store.ts` — `SaveStore`, 키 배치, 필드별 대체값
- `tests/save.test.ts` — 왕복, 손상·남의 데이터, 필드 단위 대체, 마이그레이션 사슬, 더 새 버전, 쓰기/읽기 실패

#### 핵심 코드

마이그레이션은 한 단계씩 올립니다. v1 데이터를 v3으로 올릴 때 `1→2`, `2→3`을 차례로 적용하므로 각 함수는 바로 앞 버전만 알면 됩니다.

```ts
// src/save/schema.ts
export function migrate(raw: unknown, current: number, migrations): MigrateResult {
  if (!isObject(raw) || !isInt(raw.schema, 1)) return { kind: 'invalid' };
  if (raw.schema > current) return { kind: 'newer' }; // 더 새 빌드가 쓴 값: 건드리지 않음
  let data: Json = raw;
  let migrated = false;
  for (let v = raw.schema; v < current; v++) {
    const step = migrations[v];
    if (!step) return { kind: 'invalid' };
    data = { ...step(data), schema: v + 1 };
    migrated = true;
  }
  return { kind: 'ok', data, migrated };
}
```

`'newer'`는 놓치기 쉬운 경우입니다. PWA는 예전 빌드가 캐시에 남아 있다가 열릴 수 있는데, 그 예전 빌드가 새 형식의 저장을 "모르는 값"으로 보고 덮어쓰면 기록이 사라집니다. 그래서 더 새 버전 키는 **잠그고** 이번 방문 동안 메모리로만 동작합니다.

읽기는 필드 단위로 대체합니다.

```ts
// src/save/store.ts
private readProfile(): Profile {
  const data = this.read(PROFILE_KEY, PROFILE_SCHEMA, PROFILE_MIGRATIONS);
  if (!data) return emptyProfile();
  return {
    records: readRecords(data.records),      // 망가지면 EMPTY_RECORDS
    seenHints: readHints(data.seenHints),    // 문자열만 남김
    settings: readSettings(data.settings),   // 아는 불리언 키만, 나머지는 기본값
    daily: readDaily(data.daily),            // 올바른 날짜 기록만, 최신 30일
  };
}
```

런 검증은 엄격합니다. 칸 수가 `size²`인지, 타일 id가 겹치지 않고 `nextTileId`보다 작은지, 숫자 타일이 2의 거듭제곱인지, 유물 id가 실제로 있고 충전이 최대치 이하인지, 봉쇄 줄 번호가 보드 안인지, 되돌리기 스냅숏도 같은 검사를 통과하는지 봅니다. 반대로 **밸런스는 보지 않습니다**: 예전 스테이지 표로 시작한 런도 모양만 맞으면 이어집니다.

키는 관심사별로 나눴습니다. 런은 이동마다 쓰지만 프로필은 바뀔 때만 쓰고, 런 저장이 망가져도 기록은 멀쩡합니다.

#### 연습 과제

1. `Settings`에 `reducedMotion: boolean`을 추가하고 `PROFILE_SCHEMA`를 2로 올려 보세요. 마이그레이션 `1: (d) => ({ ...d, settings: { ...d.settings, reducedMotion: false } })`를 넣고, v1 프로필을 넣은 저장소로 `SaveStore`를 만드는 테스트를 쓰세요. 사실 `readSettings`의 기본값만으로도 동작하는데, 그렇다면 마이그레이션이 꼭 필요한 변경은 어떤 종류일까요? (힌트: 필드 이름 변경, 단위 변경)
2. `isRunState`에서 "타일 id가 `nextTileId`보다 작다" 검사를 빼면 어떤 손상된 저장이 통과하고, 이어 한 뒤 무엇이 깨질까요? (힌트: 새 타일이 기존 id를 재사용 → 렌더러가 타일을 혼동)
3. 개발자 도구에서 `localStorage.setItem('neon-rift/profile', '{"schema":99}')` 후 새로고침하고 기록을 하나 세워 보세요. 다시 `schema: 99` 값이 그대로 남아 있는지 확인해 보세요.

### 6.2 결정적 상태 이어 하기

#### 왜 필요한가

"이어 하기"가 진짜 이어 하기가 되려면 다시 연 판의 **미래까지** 같아야 합니다. 화면만 복원하고 난수를 새로 뽑으면, 같은 방향으로 밀어도 다른 타일이 나오고 되돌리기도 다르게 동작합니다. 이 프로젝트는 1단계부터 난수 상태를 게임 상태 안에 두었기 때문에(D5) 이 일이 거의 공짜입니다: `RunState`를 JSON으로 저장하고 그대로 읽으면, 같은 입력에 같은 결과가 나옵니다.

#### 어디에 쓰였나

- `src/game/runController.ts` — `persist(run)`: 모든 단계 뒤에 저장, 끝난 런은 슬롯에서 지움. `continueRun(slot)`: 저장된 런을 `restoreStep`으로 빈 화면에 다시 그림
- `tests/runController.test.ts` — "저장 → 새 컨트롤러로 이어 하기 → 같은 이동 20번 → 끊지 않고 한 판과 깊은 비교가 같음(되돌리기까지)"

#### 핵심 코드

```ts
// src/game/runController.ts
private persist(run: RunState): void {
  ...
  if (run.status === 'playing' || run.status === 'offer') {
    this.store.saveRun({ run, daily: session.daily });   // 유물 선택 화면에서도 저장
  } else {
    this.store.clearRun(session.slot);                    // 끝난 판은 "이어하기"에 나오지 않음
  }
}
```

저장 시점은 "프레임마다"가 아니라 **"상태가 바뀔 때마다"** 입니다. 순수 코어 덕분에 상태가 바뀌는 지점은 `apply(step)` 하나뿐이라 저장 호출도 한 곳입니다. 앱이 강제 종료돼도 잃는 것은 진행 중이던 애니메이션 하나입니다.

```ts
// tests/runController.test.ts
const b = setup(undefined, storage); // 같은 저장소, 새 앱
b.controller.continueRun('run');
expect(b.controller.run).toEqual(saved);
playMoves(a.controller, 20, 1);
playMoves(b.controller, 20, 1);
expect(b.controller.run).toEqual(a.controller.run); // 미래도 같다
```

#### 연습 과제

1. 일부러 `persist`에서 `undo`를 빼고 저장해 보세요(`{ ...run, undo: null }`). 어느 테스트가 실패하나요? 되돌리기를 저장하지 않는 것이 "치트 방지"로 의미가 있을까요?
2. 저장 횟수를 줄이고 싶다면 `visibilitychange`(앱이 가려질 때)에만 저장하는 방식과 비교해 장단점을 적어 보세요. 휴대폰에서 앱이 강제 종료되는 경우를 생각해 보세요.

### 6.3 온보딩: 플레이로 가르치기, 한 번에 하나씩

#### 왜 필요한가

외부 자료 조사 노트의 PvZ 사례처럼, 좋은 튜토리얼은 따로 있는 화면이 아니라 **게임 자체**입니다. 이 게임은 1막이 튜토리얼입니다: 1-1은 방해 없음, 1-2는 돌만, 1-3에 얼음, 보스는 봉쇄. 4단계에서 더한 것은 그 위에 얹는 **한 줄짜리 안내**와 규칙들입니다.

- 첫 판 1-1: "밀어서 합치기" — 첫 이동을 할 때까지 떠 있음
- 스테이지 시작: 배너에 목표를 크게, "이동 N번 안에"를 그 아래에. 목표·이동 칸이 잠깐 빛남
- 첫 유물 선택 화면: 유물이 무엇인지 한 줄(시트 안에)
- 사용 유물을 처음 가졌을 때: 버튼으로 쓰고 스테이지마다 충전된다는 한 줄
- 새 방해·보스가 처음 나올 때(3b단계부터)

규칙: 한 번에 하나만 보이고(대기열), **보이는 순간 본 것으로 기록**하고(저장됨), 확인 버튼·화면 아무 곳 탭·다음 이동으로 닫히며, **보드를 가리지 않습니다**(보드 아래 유물 줄 자리에 뜸). 설정의 "도움말 다시 보기"가 기록을 지웁니다.

같은 문장이 "게임 방법" 시트에도 나옵니다. 둘 다 같은 원본(`HAZARD_INFO`, `BOSSES`, `LESSONS`, 수치 표)에서 만들기 때문에, 보스 주기를 바꾸면 안내와 도움말이 함께 바뀝니다.

#### 어디에 쓰였나

- `src/game/runView.ts` — `LESSONS`, `stageStartHints`, `stepHints`, `helpSections`, `stageBanner`
- `src/game/runController.ts` — `queueHint`/`nextHint`(본 순간 `markSeen`), `takeLesson`(유물 화면 안의 한 줄), `hideBanner`(첫 입력)
- `src/ui/gameScreen.ts`, `src/ui/style.css` — 안내 자리(`.tray .hint`), 배너 즉시 퇴장(`.leave`)
- `tests/runView.test.ts` — "도움말은 안내와 같은 문장으로 만든다"

#### 핵심 코드

```ts
// src/game/runView.ts
export function helpSections(): HelpSection[] {
  return [
    ...
    { title: '방해 타일', items: (Object.keys(HAZARD_INFO) as HazardKind[]).map((k) => ({
        name: HAZARD_INFO[k].name, text: HAZARD_INFO[k].description })) },
    { title: '보스', items: (Object.keys(BOSSES) as BossId[]).map((id) => ({
        name: BOSSES[id].name, text: BOSSES[id].description })) },
    ...
  ];
}
```

```ts
// tests/runView.test.ts — 어긋날 수 없음을 테스트로 고정
for (const info of Object.values(HAZARD_INFO)) expect(texts).toContain(info.description);
for (const boss of Object.values(BOSSES)) expect(texts).toContain(boss.description);
```

"보이는 순간 기록"이 중요한 이유: 3b단계는 대기열에 넣는 순간 본 것으로 쳤습니다. 그러면 안내 두 개가 쌓인 상태에서 메뉴로 나가면 두 번째 안내는 영영 못 봅니다.

#### 연습 과제

1. 첫 "막힘"(움직일 수 없지만 구조 유물이 있는 상황)에 한 번만 뜨는 안내를 추가해 보세요. `stepHints`에 조건 하나, `LESSONS`에 문장 하나면 됩니다. 도움말에도 저절로 들어가게 하려면?
2. 안내가 다음 이동으로 닫히는 규칙은 빨리 미는 사람에게 너무 빠를 수 있습니다. "최소 1.5초는 보인다"를 넣는다면 시간을 컨트롤러가 알아야 할까요, UI가 알아야 할까요? 테스트 가능성을 기준으로 골라 보세요.

### 6.4 시드로 만드는 오늘의 도전

#### 왜 필요한가

매일 같은 판을 모두가 한다는 것은 서버 없이 "공유되는 경험"을 만드는 가장 싼 방법입니다. 필요한 것은 날짜 → 시드 함수 하나입니다(`hashSeed`는 1단계부터 있었습니다). 같은 시드면 각 스테이지의 시작 보드와 첫 유물 제시가 같습니다. 그 뒤는 플레이어의 선택으로 갈라집니다(가진 유물은 다시 제시되지 않으므로 이후 제시가 달라지고, 보드는 이동에 따라 달라짐).

#### 어디에 쓰였나

- `src/game/daily.ts` — `localDateKey(date)`, `dailySeed(key) = hashSeed('daily-' + key)`, `dailyLabel`
- `src/game/runController.ts` — `startDaily()`, 날짜는 `today()`로 주입(테스트가 날짜를 고정)
- `src/save/store.ts` — `noteDailyAttempt`, `recordDaily`(날짜별 최고, 최근 30일만), 지난 날짜의 미완료 도전은 이어 하기에 나오지 않음

#### 핵심 코드

```ts
// src/game/runController.ts
startDaily(): void {
  const date = this.today();
  this.store.noteDailyAttempt(date);
  this.begin({ slot: 'daily', daily: date, start: { mode: 'run', options: {} } },
             startRun('run', dailySeed(date)));
}
```

날짜는 **기기의 현지 날짜**입니다. 그래서 한국과 다른 시간대의 사람은 몇 시간 동안 다른 "오늘"을 봅니다. 순위표가 있다면 UTC나 KST로 고정해야 하지만, 개인 기록만 남기는 지금은 "내 하루"가 더 자연스럽다고 판단했습니다(D53). 밸런스 수치가 바뀌면 같은 날짜라도 판이 달라집니다.

#### 연습 과제

1. `today`를 `() => '2026-11-13'`로 고정한 컨트롤러 둘이 같은 런을 만드는 테스트를 읽고, 날짜 문자열에 "버전"을 섞어(`daily-v2-2026-11-13`) 밸런스가 바뀐 날 기록이 섞이지 않게 하려면 어디를 고치면 되는지 찾아보세요.
2. 결과를 공유하는 텍스트("Neon Rift 11월 13일 · 2막 3 · 1,234점")를 만드는 순수 함수를 `runView.ts`에 추가하고 테스트해 보세요.

### 6.5 밸런스 방법론: 이번 조정의 전후 숫자

#### 왜 필요한가

3b단계 플레이 노트가 지적한 문제는 숫자로도 보였습니다: 1-2(돌 3개)가 4~14이동이면 끝나 돌 부수기를 가르치지 못함, 실패는 거의 늘 "이동 소진"이라 방해 타일이 위협이 아님, 3막이 휴대폰으로 하기엔 김(3-3 200이동, 보스 220이동), 유물 없이는 2막 보스와 3-3이 0%.

목표는 이렇게 잡았습니다: 1막 30~60이동, 2막 100 이하, 3막 130 이하(보스는 조금 더), 이긴 런 15~25분, 실패 원인은 이동 소진과 막힘이 섞이게, 구석 봇 1막 95% 이상·전체 승률 15~30%, 무작위 봇 1막 통과 10% 이하, 유물 없이 0%인 스테이지 없음.

#### 어디에 쓰였나

- `src/core/balance.ts` — `STAGE_TABLE`, `BOSS_TUNING`, `RELIC_TUNING.fourChanceBonus`
- `tools/simulate.ts` — 스테이지별 실패 원인(이동/막힘), 런당 이동 수, `--bots`, 유물을 하나도 안 고르는 줄, 바뀐 구석 봇
- 조정 과정은 저장소 밖 임시 스크립트로 표를 메모리에서 바꿔 가며 돌렸습니다(`STAGES` 배열 교체 → `playIsolated`/`playRun` 호출). 한 번에 20초 안팎이라 12번쯤 반복했습니다.

#### 핵심 코드

**먼저 측정 도구를 고쳤습니다.** 숫자를 믿으려면 봇이 "평범하게 잘하는 사람"이어야 합니다. 구석 봇은 한 수만 보고 보드가 꽉 차면 자주 막혔는데, 사람은 그럴 때 "이게 저기 떨어지면?"을 따져 봅니다. 그래서 미끄러진 뒤 빈 칸이 4개 이하이면 **2가 나올 수 있는 모든 칸에 대해 다음 수의 최선값을 평균** 냅니다. 실제 생성 위치를 엿보는 것이 아니라(봇은 RNG를 읽지 않음, D35) 가능한 경우의 기댓값입니다. 또 돌을 깨면 어느 스테이지에서든 약간 가산합니다(돌은 칸을 막으므로).

```ts
// tools/simulate.ts
function spawnAware(board: GameState, walls: ReadonlySet<number>): number {
  const cells = emptyCellIndices(board, walls);
  if (cells.length === 0) return DEAD;
  let total = 0;
  for (const i of cells) total += bestNext(placeTile(board, i, 'number', 2).state, walls);
  return total / cells.length;
}
```

이것만으로 1막 보스 단독 클리어율이 89% → 94%로 올랐습니다. **봇이 바뀌면 이전 숫자와 직접 비교할 수 없다**는 점에 주의하세요. 아래 "전"은 3b단계 봇, "후"는 새 봇입니다.

**바꾼 것과 이유**

| 바꾼 것                                                                 | 이유                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1-1 점수 360/60 → 64 타일/70                                            | 점수보다 "64를 만들어라"가 처음 하는 사람에게 분명. 무작위 봇이 더 자주 떨어짐(93% → 89%)       |
| 1-2 돌 3개(시작 2, 최대 3)/45 → 돌 10개(시작 2, **최대 2**, 확률 .3)/55 | 돌이 한 번에 둘뿐이라 일부러 옆에서 합쳐야 함. 12이동 → 33이동                                  |
| 1-3, 1-보스: 돌 확률 .04~.1 → .2, 최대 5                                | 보드 압박. 무작위 봇은 막혀서 실패(1-보스 실패 139건 중 135건이 막힘), 구석 봇은 돌을 깨며 버팀 |
| 2-1·2-보스·3-3 점수 1100/2000/3000 → 700/800/1000                       | 유물 없이도 20~40%는 가능하게(전: 31%/0%/0%). 이동 수도 112·139·147 → 73·74·69                  |
| 2-3·3-1 128 타일: 이동 135/125 → 105, 돌 최대 7                         | 유물이 쌓이면 쉬워지는 스테이지라 압박을 방해로. 막힘 실패가 생김                               |
| 3-보스 256/220 → 256/170, 혼돈 6턴마다 돌 1 → **5턴마다** 돌 1          | 길이를 줄이고(159 → 147이동) 혼돈을 자주. 유물 없이는 4%                                        |
| 부식자 최소값 4 → 8                                                     | 2·4를 깎는 발동은 의미 없는 소음                                                                |
| 쌍둥이 씨앗 +20% → +10%                                                 | 새 봇에게 유물 효과 +21점으로 압도적(다른 유물은 ±10 안팎). 조정 뒤 +1점                        |
| 점화 플러그: 무작위 칸 → 빈 구석                                        | 구석 전략과 싸우던 16이 전략을 돕게 됨(효과 −5.5 → +4.5점)                                      |

**결과**(`npm run sim`, 300런/봇, 시드 1000~1299)

런 안에서의 스테이지별 클리어율 · 클리어 때 평균 이동 (구석 봇)

| 스테이지 | 전: 목표/이동         | 전 corner | 후: 목표/이동        | 후 corner | 후 실패(이동/막힘) |
| -------- | --------------------- | --------- | -------------------- | --------- | ------------------ |
| 1-1      | 점수 360/60           | 100% · 48 | 64 타일/70           | 99% · 47  | 3/0                |
| 1-2      | 돌 3/45               | 98% · 12  | 돌 10/55             | 99% · 33  | 4/0                |
| 1-3      | 64 타일/70            | 100% · 44 | 64 타일/65           | 98% · 45  | 4/1                |
| 1-보스   | 128 타일/105, 봉쇄자  | 92% · 88  | 128 타일/120, 봉쇄자 | 96% · 83  | 2/10               |
| 2-1      | 점수 1100/115         | 92% · 98  | 점수 700/90          | 96% · 73  | 9/1                |
| 2-2      | 돌 7/90               | 98% · 44  | 돌 10/60             | 100% · 28 | 0/0                |
| 2-3      | 128 타일/135          | 79% · 102 | 128 타일/105         | 79% · 89  | 44/11              |
| 2-보스   | 점수 2000/170, 부식자 | 77% · 139 | 점수 800/110, 부식자 | 100% · 74 | 0/0                |
| 3-1      | 128 타일/125          | 65% · 97  | 128 타일/105         | 85% · 93  | 25/7               |
| 3-2      | 돌 12/110             | 98% · 60  | 돌 16/80             | 99% · 43  | 0/2                |
| 3-3      | 점수 3000/200         | 94% · 147 | 점수 1000/110        | 100% · 69 | 0/0                |
| 3-보스   | 256 타일/220, 혼돈    | 61% · 159 | 256 타일/170, 혼돈   | 60% · 147 | 53/17              |

| 지표                                  | 목표    | 전                                   | 후                                           |
| ------------------------------------- | ------- | ------------------------------------ | -------------------------------------------- |
| 구석 봇 1막 통과                      | ≥ 95%   | 90%                                  | 92%                                          |
| 구석 봇 승리                          | 15~30%  | 18%                                  | **36%** (목표 초과)                          |
| 무작위 봇 1막 통과                    | ≤ 10%   | 23%                                  | 13%                                          |
| 진 런의 실패 원인(구석 봇, 이동/막힘) | 섞이게  | 측정 안 함 (단독 표: 거의 이동 소진) | 75% / 25% (단독 표에서는 막힘이 크게 늘어남) |
| 유물 없이 0%인 스테이지(구석 봇)      | 없음    | 2-보스, 3-3 (0%)                     | 없음 (최저 3-보스 4%)                        |
| 이긴 런의 이동 수                     | 15~25분 | 1,044이동                            | 825이동 (1.3초/이동이면 약 18분)             |
| 유물 없이 끝까지(구석 봇)             | —       | —                                    | 0% (2막 도달 89%, 3막 도달 4%)               |

**정직한 해석**

- **승률 36%는 목표(15~30%)보다 높습니다.** 원인은 분명합니다: 유물을 하나도 안 고르면 승률 0%, 무작위로 고르면 36%. 유물이 런 난이도의 대부분을 정합니다. 특히 점수 목표는 점수 배율 유물이 쌓이면 거의 늘 깨집니다(2-보스·3-3 100%). 점수 목표를 다시 올리면 "유물 없이 0%" 조건을 어깁니다. 두 목표가 서로 당기는 지점이고, 다음 조정은 스테이지 표가 아니라 **유물 수치**(점수 배율, 구조 유물의 충전) 쪽이어야 합니다.
- **1막 92%, 무작위 13%**: 둘 다 목표에 조금 못 미칩니다. 3a단계와 같은 줄다리기(1막 보스를 어렵게 하면 둘 다 떨어짐)지만, 방해를 늘린 덕분에 간격이 67점 → 79점으로 벌어졌습니다.
- **"막힘" 실패**: 스테이지 단독 표(유물 없음)에서는 1막 보스·2-3·3-1·3-보스에서 막힘이 실패의 주요 원인이 되었습니다(무작위 봇은 거의 전부). 런 안에서는 구조 유물(분해 펄스, 역행 코일)이 막힘을 살려 주기 때문에 구석 봇의 진 런은 여전히 이동 소진이 3/4입니다.
- **후속**: 승률과 점수 스테이지의 긴장은 6단계에서 유물 수치와 점수 목표로 다시 맞췄습니다(8.6장).
- **길이**: 1막 보스(83이동)와 3막 보스(147이동)는 막의 다른 스테이지보다 깁니다. 256 타일은 최소 120이동 가까이 필요해서, 마지막 보스를 130 아래로 만들려면 목표를 128로 낮춰야 하는데 그러면 유물이 쌓인 런에서 85% 넘게 깨져 긴장이 사라졌습니다.

#### 연습 과제

1. `npm run sim -- --bots corner`의 유물 표를 보고, 승률을 30% 아래로 낮출 유물 수치 하나를 골라 바꿔 보세요. 그 유물의 효과 점수와 전체 승률이 어떻게 바뀌나요?
2. 이 조정 당시 2-보스(점수 800, 부식자)는 런 안에서 100%였습니다(6단계에서 1050으로 올림, 8.6장). 부식자를 점수 목표가 아닌 다른 목표와 짝지을 수 있을까요? 타일 목표는 왜 안 되는지(가장 큰 타일을 깎으므로) 시뮬레이터로 확인해 보세요.
3. 봇의 `CAREFUL_EMPTY`를 4에서 6으로 바꾸면 구석 봇이 얼마나 강해지고 얼마나 느려지나요? 봇의 강도가 밸런스 결론을 얼마나 바꾸는지 생각해 보세요.

### 6.6 화면이 서로 어긋나지 않게: 이번 단계의 UX 수정

#### 왜 필요한가

3b단계 플레이 노트의 화면 문제는 모두 "두 정보가 서로 다른 말을 함" 또는 "정보가 필요한 것을 가림"이었습니다.

| 문제                                        | 고친 방법                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 돌 안내가 맨 윗줄을 가려 설명하는 돌을 숨김 | 안내를 보드 아래 유물 줄 자리로. 대상 지정 막대·"움직일 수 없어요"와 같은 자리, 같은 우선순위 규칙 |
| 봉쇄 중인데 보스 칸이 "5턴"                 | 봉쇄 중에는 큰 숫자가 "봉쇄 해제까지 N턴", 평소엔 "발동까지 N턴" (`BossInfo.count/countLabel`)     |
| 이동 직후 HUD 숫자와 보드 표시가 잠깐 다름  | `setMarks(marks, onShown)`: 표시가 바뀌는 순간 HUD와 "+N"도 함께 바뀜 (D41 대가 해소)              |
| 배너가 보드 위에 남아 대상 지정과 겹침      | 첫 입력(이동, 유물 버튼, 일시정지)에 즉시 사라짐                                                   |
| 점수 목표의 막대가 느려 지루함              | 예상 막대: 지금까지의 이동당 점수로 남은 이동을 채우면 닿는 곳까지 옅은 줄무늬(못 미치면 주황)     |
| 점화 플러그 16이 아무 데나 떨어짐           | 빈 구석에 놓음(`spawnInCorner`)                                                                    |

#### 어디에 쓰였나

- `src/render/renderer.ts` — `setMarks(marks, onShown)`
- `src/game/runView.ts` — `bossInfo`, `scorePace`
- `src/ui/hud.ts`, `src/ui/gameScreen.ts`, `src/ui/style.css`

#### 핵심 코드

```ts
// src/game/runController.ts — HUD는 보드 표시와 같은 순간에
board.showStep(step);
board.setMarks(boardMarks(run, this.targeting), () => {
  ui.updateHud(hud);
  if (gained > 0) ui.scoreGained(gained);
});
```

테스트의 가짜 보드는 `animating = true`일 때 콜백을 붙잡고 있다가 `finish()`에서 실행합니다. 그래서 "애니메이션 중에는 HUD가 그대로"를 DOM 없이 확인합니다.

예상 막대가 "지금까지의 평균"을 쓰는 이유: 2048에서 이동당 점수는 큰 타일이 생길수록 늘어나므로 이 예상은 **보수적**입니다. 빨간 예상이 초록이 되는 경험이 반대보다 낫습니다. 처음 4이동은 표본이 너무 적어 표시하지 않습니다.

#### 연습 과제

1. 돌 목표에도 예상 막대를 켜 보세요. `scorePace`를 `goalPace`로 일반화하면 무엇이 같고 무엇이 다른가요?
2. `.tray .hint`가 길어져 두 줄을 넘으면 보드가 조금 작아집니다(320×568). 안내를 한 줄로 자르고 "더 보기"를 두는 것과 비교해 보세요.

---

## 7. 5단계: 손맛(Juice)

4단계까지 게임은 규칙도 흐름도 다 있었지만, 합체가 "숫자가 바뀌는 일"에 가까웠습니다. 이번 단계는 같은 규칙을 **느끼게** 만드는 일입니다: 파티클, 화면 흔들림, 타일의 찌그러짐, 짧은 멈춤, 합성한 효과음, 진동. 코어는 한 줄도 바꾸지 않았습니다. 모든 연출은 렌더러가 이미 내보내던 이벤트 큐(5.3장)에 구독자 하나를 붙여서 만들었습니다.

```
 RunController ──showStep──▶ [main.ts의 얇은 끼움] ──▶ BoardRenderer ──onCue(cue, late)──┐
       │                         │ feedback.step(step)        │ 뷰 시계(히트스톱)           │
       └──showScreen/updateHud──▶ │ feedback.screen/hud        │ fx: 파티클·흔들림·글자      ▼
                                 ▼                            ▼                 Feedback(연출 감독, 매핑 표)
                            GameUi (DOM)                  캔버스               ├─▶ BoardFx (보이는 것)
                                                                               ├─▶ AudioEngine ─▶ WebAudioBackend
                                                                               └─▶ Haptics ─▶ navigator.vibrate
```

### 7.1 Juice란, 그리고 "피드백은 중요도에 비례한다"

#### 왜 필요한가

"Juice"는 규칙을 바꾸지 않고 입력에 대한 **반응**을 키우는 모든 것을 말합니다. 같은 합체라도 작은 불꽃, 짧은 소리, 타일이 살짝 눌렸다 튀어나오는 움직임이 붙으면 "내가 했다"는 감각이 훨씬 강해집니다.

그런데 모든 일에 같은 크기의 연출을 붙이면 금방 시끄러워지고, 정말 중요한 순간(보스 발동, 스테이지 클리어)이 묻힙니다. 그래서 이 프로젝트의 원칙은 하나입니다: **피드백은 사건의 중요도에 비례한다.** 2+2 합체는 작은 불꽃과 짧은 음 하나, 흔들림 없음. 256 합체는 더 큰 불꽃과 낮은 울림, 약한 흔들림, 진동. 보스 발동은 보드 가장자리에서 들어오는 불꽃, 강한 흔들림, 짧은 멈춤, 보스마다 다른 소리.

#### 어디에 쓰였나

- `src/game/feedback.ts` — 연출 감독 `Feedback`. 파일 머리에 사건 → 연출 매핑 표가 있고, `cue()`의 `switch`가 그 표를 그대로 구현합니다.
- `src/main.ts` — 컨트롤러가 쓰는 `BoardDisplay`/`UiDisplay`를 감싸서, 컨트롤러가 모르게 감독이 함께 듣도록 끼웁니다.

#### 핵심 코드

```ts
// src/game/feedback.ts (머리 주석의 표, 일부)
// | event                  | particles                   | shake  | hit-stop | sound            | vibration  |
// | merge < 64             | small spark burst           | –      | –        | merge, pitched   | ≥ 32 only  |
// | merge ≥ 64 / ≥ 128     | bigger burst + ring         | light  | new best | merge / mergeBig | merge(Big) |
// | 3rd+ merge in one move | stronger burst, "+N ×k"     | +      | –        | climbs the scale | –          |
// | boss acts              | sparks from the board edge  | strong | yes      | per boss         | boss       |
// | stage cleared          | fireworks                   | medium | yes      | stageClear       | stageClear |

// src/main.ts — 컨트롤러는 그대로, 표시 계층만 감싸서 감독이 같이 듣는다
const board: BoardDisplay = {
  showStep: (step) => {
    renderer.showStep(step);
    feedback.step(step); // 콤보 계획, 프리즘 id, 최고 타일
  },
  setMarks: (marks, onShown) => renderer.setMarks(marks, onShown),
  clear: () => renderer.clear(),
};
renderer.onCue((cue, late) => feedback.cue(cue, late));
```

합체 하나의 연출 크기는 타일 단계 `level = log2(value)`에서 나옵니다. 불꽃 수 `4 + level × 1.3`, 크기·속도·수명은 `weight = (level − 1) / 10`(2 → 0, 2048 → 1)에 비례, 흔들림은 64부터. 숫자 하나로 모든 크기가 함께 움직이니 강약을 한 곳에서 조정합니다.

큐는 이벤트가 화면에 **닿는 순간**(`cue.hit`)에 발화합니다. 합체는 미끄러짐이 끝나고 팝이 시작될 때, 돌은 부서지기 시작할 때. 그래서 불꽃과 소리가 타일 움직임과 정확히 맞습니다. 빨리 감기된 큐(`late`)에는 시각 연출을 하나도 붙이지 않습니다. 이미 지나간 순간이기 때문입니다.

#### 연습 과제

1. 매핑 표에 "얼음이 내려앉음"이 소리를 내는지 찾아보세요. 이 사건은 중요도 표에서 어디쯤이어야 할까요? 소리를 끄거나 키워 보고 이유를 적어 보세요.
2. `SHAKE_FROM`을 8로 내리고 한 판 해 보세요. 왜 "작은 사건에 흔들림 금지"가 규칙인지 몸으로 느껴 보는 과제입니다.
3. 감독을 `main.ts`의 감싸기 대신 컨트롤러 안에서 부르면 무엇이 나빠질까요? (힌트: `tests/runController.test.ts`의 가짜 객체)

### 7.2 파티클 시스템과 오브젝트 풀

#### 왜 필요한가

파티클은 "수명이 짧은 작은 점 수백 개"입니다. 버스트마다 `{ x, y, vx, vy … }` 객체를 새로 만들면 1초에 수백 개의 쓰레기가 생기고, 가비지 컬렉터가 돌 때 프레임이 튑니다. 저가형 휴대폰에서 특히 그렇습니다.

해결책은 **오브젝트 풀**입니다. 미리 정해 둔 개수의 자리를 만들어 두고, 죽은 파티클의 자리를 재사용합니다. 이 프로젝트는 한 걸음 더 나가 객체 대신 **속성별 타입 배열**(Struct of Arrays)을 씁니다. `x`는 `Float32Array` 하나, `y`도 하나… 파티클 i는 "모든 배열의 i번째 칸"입니다.

#### 어디에 쓰였나

- `src/render/particles.ts` — `ParticlePool`(기본 320자리), 모양 5종(`spark` 글로우 점, `bit` 회로선을 따라 달리는 전류, `shard` 돌 파편, `flake` 얼음 조각, `streak` 빛줄기)
- `src/render/fx.ts` — 칸 단위 버스트(`BoardFx.burst`)와 밀도 배율
- `tests/juice.test.ts` — 상한, 재사용, 지연, 결정성, "배열이 다시 만들어지지 않음"

#### 핵심 코드

```ts
// src/render/particles.ts — 살아 있는 파티클은 [0, n)에 빽빽이. 죽으면 마지막 것을 그 자리로
update(dt: number): void {
  let i = 0;
  while (i < this.n) {
    const age = (this.age[i] ?? 0) + dt;
    if (age >= (this.life[i] ?? 0)) {
      this.kill(i);   // 마지막 파티클을 i로 복사하고 n--
      continue;       // 옮겨 온 파티클을 바로 처리
    }
    // … 감쇠(drag), 중력, 위치 적분
    i++;
  }
}

emit(spec: BurstSpec): number {
  const count = Math.min(Math.floor(spec.count), this.free); // 가득 차면 새 것을 거절
  this.dropped += spec.count - count;
  // …
}
```

그리기는 `globalCompositeOperation = 'lighter'`(가산 합성)로 합니다. 빛이 겹치면 더 밝아지므로 블러 없이도 네온처럼 보입니다. 글로우 점은 색마다 32px 방사형 그라디언트 이미지를 **한 번만** 만들어 `drawImage`로 복사합니다(3.8장의 스프라이트 캐시와 같은 생각).

이 게임만의 모양은 `bit`입니다. 방향을 가장 가까운 축(가로/세로)에 맞춰 **보드의 회로선을 따라 달리는 전류**처럼 보이게 했습니다(`axisAligned`). 합체하면 칩 타일에서 전류가 흘러나가는 그림이 "균열 / 회로 기판" 정체성과 맞습니다.

연출이 정보를 가리지 않게 한 두 가지: 합체 불꽃은 타일 중심이 아니라 **가장자리에서 바깥으로** 시작하고(`radius: 0.45`칸), "+N" 글자는 타일 위쪽 모서리에서 떠오릅니다. 처음 만든 버전은 중심에서 흰 불꽃이 터져 새 숫자를 0.2초 동안 읽을 수 없었습니다(스크린샷 검사에서 발견).

#### 연습 과제

1. `capacity`를 40으로 줄이고 혼돈 보스 턴(7.11장의 최악의 턴)을 보세요. "새 것을 거절"과 "가장 오래된 것을 죽이고 새 것을" 중 어느 쪽이 나아 보이나요?
2. `kill`의 swap-remove 대신 `alive` 플래그를 두는 방식으로 바꾸면 `update`와 `draw`의 반복이 어떻게 달라지나요?
3. 같은 시드로 버스트를 두 번 만들면 같은 그림이 나옵니다(`makeRandom`). 스크린샷 비교 테스트에 왜 이것이 필요한지 설명해 보세요.

### 7.3 트라우마 기반 화면 흔들림

#### 왜 필요한가

흔들림을 "사건마다 몇 px 무작위로 흔든다"로 만들면 두 가지가 망가집니다. 작은 사건이 여러 번 겹치면 화면이 계속 덜덜 떨리고, 무작위 값은 프레임마다 튀어서 멀미가 납니다.

트라우마(trauma) 모델은 이렇게 다룹니다(Squirrel Eiserloh의 GDC 강연에서 널리 퍼진 방식):

1. 사건마다 trauma(0~1)를 **더하고**, 1에서 멈춥니다.
2. trauma는 시간이 지나면 일정한 속도로 **줄어듭니다**.
3. 실제 흔들림 = 최대치 × **trauma²** × **연속적인 노이즈**(시간의 함수).

제곱 덕분에 0.1짜리 사건은 최대치의 1%만 움직이고(거의 안 보임), 0.5짜리는 25%, 큰 사건만 확실히 흔들립니다.

#### 어디에 쓰였나

- `src/render/shake.ts` — `TraumaShake`, `shakeOffset`, `shakeNoise`
- `src/render/fx.ts` — 보드 크기의 2.2%를 최대치로, `offset()`이 흔들림 + 밀림을 합침
- `src/render/renderer.ts` — 타일·표시·효과를 그리기 직전에 `translate(offset)`

#### 핵심 코드

```ts
// src/render/shake.ts
export function shakeNoise(t: number, seed: number): number {
  return (
    0.5 * Math.sin(t * 1.0 + seed * 1.31) +
    0.3 * Math.sin(t * 2.17 + seed * 4.07) +
    0.2 * Math.sin(t * 3.91 + seed * 2.53)
  );
}

export function shakeOffset(trauma: number, t: number, maxOffset: number, frequency = 0.03) {
  const amp = maxOffset * trauma * trauma;
  const phase = t * frequency;
  return { x: amp * shakeNoise(phase, 1), y: amp * shakeNoise(phase, 7) };
}
```

서로 나누어떨어지지 않는 주파수의 사인 세 개를 더하면 반복이 잘 안 보이는 부드러운 흔들림이 됩니다. `seed`만 바꿔 x와 y를 독립시킵니다. 라이브러리도 난수도 필요 없고, 시간의 순수 함수라 테스트와 스크린샷이 결정적입니다.

**회전은 넣지 않았습니다.** 4×4 숫자판이 기울면 읽기 어렵습니다. 그리고 보드 판(배경 이미지)은 고정하고 그 위의 타일·표시·효과만 움직입니다. 판 전체를 옮기면 가장자리에 빈 줄이 드러나는데, 판을 고정하면 "판 위에서 타일이 덜컹거린다"로 읽힙니다.

값의 감: 64 합체 0.12, 256 합체 0.24, 돌 파괴 0.1, 폭탄 0.32, 스테이지 클리어 0.28, 보스 0.48. 보스(0.48² ≈ 0.23)가 최대치의 4분의 1쯤, 약 2~3px입니다. 작게 들리지만 휴대폰 화면에서는 충분히 "쿵"입니다.

#### 연습 과제

1. `shakeOffset`의 `trauma * trauma`를 `trauma`로 바꾸고 돌 세 개가 연달아 부서지는 턴을 보세요. 무엇이 달라지나요?
2. `shakeNoise` 대신 `Math.random() * 2 - 1`을 쓰면 `tests/juice.test.ts`의 "noise is smooth" 테스트가 왜 실패하는지 계산해 보세요.
3. 회전 흔들림(아주 작은 각도)을 추가해 보고, 숫자 가독성과 바꿔 볼 가치가 있는지 판단해 보세요.

### 7.4 스쿼시 & 스트레치, 예비 동작, 엇갈림

#### 왜 필요한가

애니메이션의 고전 원칙 세 가지를 작게 씁니다.

- **스쿼시 & 스트레치**: 움직이는 것은 진행 방향으로 살짝 늘어나고, 멈추는 순간 눌렸다가 튀어 돌아옵니다. 딱딱한 사각형에 무게와 탄성이 생깁니다.
- **예비 동작(anticipation)**: 큰 동작 직전의 작은 반대 동작. 큰 합체(128 이상)는 결과 타일이 먼저 살짝 **움츠렸다가** 크게 튀어나옵니다. "온다"는 예고가 있어 팝이 더 커 보입니다.
- **엇갈림(stagger)**: 한 이동에서 합체가 셋이면 세 팝을 동시에가 아니라 30ms 간격으로. 동시에 터지면 "한 번", 엇갈리면 "따다닥" 콤보로 읽힙니다.

#### 어디에 쓰였나

- `src/render/viewModel.ts` — 스프라이트마다 `stretch` 트랙과 축(`axis`), `slideStretch`, 합체 일정(엇갈림·예비 동작), 큐의 `hit`
- `src/render/renderer.ts` — 캐시 이미지를 `sx`, `sy`로 **비균일하게** `drawImage`(다시 그리지 않음)
- `src/render/tween.ts` — `easeOutSpring`(감쇠 스프링)

#### 핵심 코드

```ts
// src/render/viewModel.ts — 합체: i번째 팝은 i × stagger 늦게, 큰 합체는 움츠렸다가
const delay = Math.min(merges, MAX_STAGGER_STEPS) * t.stagger;
const land = slideEnd + delay;
const big = e.value >= BIG_MERGE && this.squashEnabled;
const wind = big ? t.anticipation : 0;
const pop = land + wind;
result.scale = big
  ? [
      tween(WIND_FROM, WIND_TO, land, wind, easeOutQuad), // 0.92 → 0.76 움츠림
      tween(WIND_TO, 1, pop, t.pop * 1.3, bigPopEase),
    ] // 크게 튀어나옴
  : [tween(POP_FROM, 1, land, t.pop, popEase)];
result.stretch.push(tween(-amount, 0, pop, t.squash, springEase)); // 합쳐진 방향으로 눌렸다 복원
hits.set(e, pop); // 큐는 이 순간에 발화: 불꽃·소리가 팝과 맞음

// src/render/renderer.ts — 늘이기는 그리기 단계의 크기 차이일 뿐
const w = sprite.cssSize * frame.scale * frame.sx;
const h = sprite.cssSize * frame.scale * frame.sy;
ctx.drawImage(sprite.image, c.x - w / 2, c.y - h / 2, w, h);
```

늘어남은 거리 1칸당 3.5%(최대 3칸), 벽에 닿는 눌림은 5~9%, 합체 눌림 14%(큰 합체 20%). 이보다 크면 숫자가 젤리처럼 보여 오히려 싸구려 느낌이 납니다. 늘어날 때 반대 축은 같은 만큼 줄여(`sx = 1 + k`, `sy = 1 − k`) 부피가 대략 유지됩니다.

엇갈림은 시각만이 아니라 **소리 순서**도 만듭니다. 큐가 `hit` 순으로 발화하므로 합체음이 30ms 간격으로 이어지고, 7.7장의 음계와 합쳐져 콤보가 올라가는 선율이 됩니다.

#### 연습 과제

1. `DEFAULT_TIMINGS.stagger`를 0과 80으로 바꿔 연쇄 회로 콤보를 비교해 보세요. 80이면 무엇이 불편해지나요? (힌트: 다음 단계의 시작이 그만큼 밀립니다.)
2. 예비 동작을 64 합체부터 켜면 한 판에 몇 번이나 보게 될까요? 드물어야 효과가 있는 연출과 매번 봐도 되는 연출을 구분해 보세요.
3. `easeOutSpring(6, 11)`의 두 숫자를 바꿔 그래프를 그려 보세요(`tests`에서 값을 찍어 보면 됩니다). 감쇠가 작으면 어떻게 보이나요?

### 7.5 히트스톱: 입력을 막지 않는 멈춤

#### 왜 필요한가

히트스톱은 큰 타격의 순간에 화면을 아주 잠깐(수십 ms) 멈추는 기법입니다. 멈춤이 무게를 만듭니다. 하지만 퍼즐 게임에서 이것을 잘못 만들면 최악입니다: 멈춘 동안 들어온 스와이프가 먹히지 않거나 늦게 처리되면 "버벅이는 게임"이 됩니다.

그래서 세 가지 규칙을 정했습니다.

1. **드물게**: 보스 발동(90ms), 스테이지 클리어(80ms), 이번 판 새 최고 타일 128 이상(60ms). 어떤 요청도 120ms를 넘지 못합니다.
2. **멈추는 것은 뷰 시계뿐**: 타일 애니메이션과 큐는 멈추지만 파티클과 흔들림은 계속 움직입니다. 그래서 "타일은 정지, 불꽃은 날아감"이 되어 충격이 더 커 보입니다.
3. **입력은 절대 기다리지 않음**: 새 단계가 들어오면 멈춤을 즉시 풀고, 남은 애니메이션은 평소처럼 빨리 감깁니다(D12).

#### 어디에 쓰였나

- `src/render/renderer.ts` — `hitStop(ms)`, `viewTime(now)`, `releaseHold()`; 큐·표시·뷰 모델은 뷰 시계로, 파티클·흔들림은 실제 `dt`로
- 브라우저 검사 — 보스 히트스톱 중에 이동하면 그 이동이 즉시 반영되는지 확인

#### 핵심 코드

```ts
// src/render/renderer.ts — 뷰 시계 = 실제 시계 − 지금까지 멈춘 시간
private viewTime(now: number): number {
  let t = now - this.viewOffset;
  if (this.holdStart !== null) t -= Math.max(0, Math.min(now, this.holdEnd) - this.holdStart);
  return t;
}

showStep(step: RunStep): void {
  this.releaseHold();     // 1. 멈춤 해제 (뷰 시계는 멈췄던 곳에서 이어감)
  this.flushCues(true);   // 2. 이전 단계의 남은 큐는 late로
  // 3. 새 단계를 지금부터 재생
}
```

뷰 모델은 처음부터 "시간을 인자로 받는 순수 객체"였습니다(3.3장). 그래서 히트스톱은 뷰 모델을 한 줄도 고치지 않고, 렌더러가 넘겨주는 시각을 조금 늦추는 것으로 끝났습니다. 시계를 주입 가능하게 만든 2단계 결정(D20, 3.9장)이 여기서 다시 쓸모가 있었습니다.

#### 연습 과제

1. `MAX_HIT_STOP`을 400으로 올리고 보스 턴에서 바로 다음 스와이프를 해 보세요. 입력은 여전히 즉시 반영되나요? 그런데도 왜 짧게 유지해야 할까요?
2. 히트스톱 중에도 파티클이 움직이는 이유를 `tick`의 `fx.update(dt)`와 `view.update(vt)`의 차이로 설명해 보세요.
3. "2048 첫 달성"에 히트스톱을 주려면 감독(`Feedback`)의 어디를 고치면 될까요?

### 7.6 소리 합성 기초와 파라미터 배열

#### 왜 필요한가

이 게임은 에셋 파일이 0개입니다. 효과음도 코드로 만듭니다. Web Audio API의 기본 부품 네 가지면 게임 효과음 대부분을 만들 수 있습니다.

- **오실레이터**: 일정한 파형(사인, 삼각, 사각, 톱니)을 내는 음원. 사인은 맑고 둥글고, 사각·톱니는 배음이 많아 거칠고 밝습니다.
- **노이즈**: 무작위 표본. 돌 깨짐, 폭발, 바람처럼 음높이 없는 소리의 재료입니다(1초짜리 버퍼를 한 번 만들어 반복 재생).
- **엔벌로프**: 소리의 크기가 시간에 따라 어떻게 변하는가. 여기서는 어택(0에서 최대까지) → 홀드 → 릴리스(지수적으로 0 근처까지). 짧은 어택 + 빠른 릴리스 = "톡", 긴 어택 = "후웅".
- **필터**: 특정 주파수 이상(로우패스) 또는 이하(하이패스)를 깎습니다. 노이즈에 로우패스를 걸면 "쿵", 하이패스를 걸면 "치익".

ZzFX라는 초소형 신시사이저는 "숫자 배열 하나 = 소리 하나"라는 방식을 씁니다. 이 프로젝트는 그 **방식**만 빌리고 코드는 직접 썼습니다(D65). 소리 하나는 레이어 몇 개, 레이어 하나는 숫자 10개입니다.

#### 어디에 쓰였나

- `src/audio/synth.ts` — 레이어 형식(표 주석), 길이 계산, 음계
- `src/audio/sounds.ts` — 효과음 표 26종(이동, 합체, 큰 합체, 생성, 돌, 얼음, 저주, 프리즘, 유물, 폭탄·되돌리기·정지 핀, 보스 예고, 보스 3종, 봉쇄·해제, 잘못된 이동, 버튼, 이동 부족 경고, 유물 제시·선택, 스테이지 클리어, 런 승리, 실패)
- `src/audio/webaudio.ts` — 레이어를 노드로 바꾸는 `WebAudioBackend`, 마스터 게인 → 컴프레서

#### 핵심 코드

```ts
// src/audio/synth.ts — Layer = [wave, freq, freqEnd, attack, hold, release, gain, filter, q, delay]
// src/audio/sounds.ts — 돌이 깨지는 소리: 노이즈 "탁" + 높은 노이즈 "자글" + 낮은 삼각파 "쿵"
stone: {
  layers: [
    [NOI, 1.6, 0.6, 0.001, 0.02, 0.16, 0.34, 2200, 1, 0],
    [NOI, 4, 0, 0.001, 0, 0.05, 0.16, -2500, 1, 0.012],
    [TRI, 140, 55, 0.002, 0.02, 0.14, 0.34, 0, 1, 0],
  ],
  priority: 2,
  minGap: 45,
},

// src/audio/webaudio.ts — 레이어 하나: 음원 → [필터] → 엔벌로프 → 마스터
env.gain.setValueAtTime(0, t0);
env.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.001, attack));
env.gain.setValueAtTime(peak, t0 + attack + hold);
env.gain.exponentialRampToValueAtTime(SILENT, end); // 지수 곡선은 0에 닿을 수 없어 0.0001까지
```

여러 소리가 겹치면 합이 1을 넘어 찢어지는 소리(클리핑)가 납니다. 마스터 게인 뒤에 **컴프레서**(문턱 −14dB, 비율 8:1, 어택 3ms)를 두어 큰 소리가 겹칠 때 자동으로 눌러 줍니다. 브라우저 검사에서 모든 소리를 `OfflineAudioContext`로 실제 렌더링해 최대값을 쟀습니다: 단독 소리 0.016(버튼)~0.54(혼돈 보스), 최악의 턴(합체 8개 + 돌 3개 + 혼돈 보스 + 이동음을 0.4초 안에) 0.77, 모두 1 미만이고 무음인 소리는 없습니다.

#### 연습 과제

1. `merge`의 첫 레이어를 삼각파(`TRI`)에서 사각파(`SQR`)로 바꾸고 `__neonRift.feedback.renderSound('merge')`의 RMS를 비교해 보세요. 귀로는 어떻게 다른가요?
2. "얼음이 녹는 틱" 소리를 새로 설계해 보세요. 레이어 몇 개, 어떤 파형, 어떤 필터가 맞을까요?
3. 컴프레서를 빼고 `renderMix`로 최악의 턴을 렌더링하면 최대값이 얼마가 되는지 확인해 보세요.

### 7.7 음계로 올라가는 콤보 음높이

#### 왜 필요한가

합체음의 음높이를 타일 값으로 바꾸면 큰 합체가 높게 들립니다. 그런데 한 이동의 합체가 64, 8, 4 순서로 나오면 음이 내려가 버려 "콤보"처럼 들리지 않습니다. 또 아무 반음이나 쓰면 연달아 울릴 때 불협화음이 됩니다.

두 가지로 해결했습니다.

1. **음계**: 마이너 펜타토닉(반음 0, 3, 5, 7, 10)만 씁니다. 이 다섯 음은 어떤 순서로 겹쳐도 거의 불협화음이 나지 않습니다.
2. **항상 올라감**: 콤보 안의 각 합체는 자기 값의 음계 단계에 놓이되, **바로 앞 합체보다 최소 한 단계 위**로. 그래서 연쇄 3번은 언제나 올라가는 세 음입니다.

#### 어디에 쓰였나

- `src/audio/synth.ts` — `scaleStep`, `valueStep`, `comboPitches`
- `src/game/feedback.ts` — `comboPlan(phases)`: 미끄러짐과 연쇄 단계의 합체를 순서대로 번호 매기고 음높이를 미리 계산
- `tests/audio.test.ts`, `tests/feedback.test.ts`

#### 핵심 코드

```ts
// src/audio/synth.ts
const PENTATONIC = [0, 3, 5, 7, 10] as const;

export function scaleStep(step: number): number {
  const n = Math.max(0, Math.floor(step));
  return Math.floor(n / 5) * 12 + (PENTATONIC[n % 5] ?? 0);
}

export function comboPitches(values: readonly number[]): number[] {
  let prev = -1;
  return values.map((v) => {
    const step = Math.min(MAX_MERGE_STEP, Math.max(valueStep(v), prev + 1));
    prev = step;
    return scaleStep(step);
  });
}
// comboPitches([64, 8, 4]) → 값은 내려가도 음은 7, 10, 12 반음으로 올라감
```

음높이는 소리 정의의 모든 레이어 주파수에 `2^(반음/12)`를 곱해 적용합니다. 근음은 A3(220Hz)이고, 최대 15단계(약 3옥타브)에서 멈춰 휴대폰 스피커에서 귀를 찌르지 않게 했습니다.

#### 연습 과제

1. `PENTATONIC`을 장음계 `[0, 2, 4, 5, 7, 9, 11]`로 바꾸면 무엇을 함께 고쳐야 하나요(`% 5`)? 콤보가 어떻게 들리나요?
2. 콤보 3번째부터 "+N ×3" 글자가 뜹니다. `comboPlan`의 `total`을 써서 "이번 이동의 마지막 합체"에만 특별한 소리를 붙여 보세요.

### 7.8 모바일 오디오 잠금 해제와 소리 관리

#### 왜 필요한가

브라우저는 사용자가 아무것도 하지 않았는데 소리가 나는 것을 막습니다. `AudioContext`는 **사용자 제스처(탭, 키 입력) 안에서** 만들거나 `resume()`해야 실제로 소리가 납니다. 또 탭을 다른 앱으로 넘기면 소리를 멈추는 것이 예의입니다.

그리고 "언제 소리를 내지 않을지"가 내는 것만큼 중요합니다.

- 같은 소리가 몇 ms 간격으로 겹치면 커지기만 하고 뭉개집니다 → **같은 소리·같은 음높이**는 `minGap` 안에 다시 내지 않음(돌 3개가 한 번에 깨지면 한 번)
- 동시에 울리는 소리 수 제한(10) → 넘치면 **덜 중요한 소리를 끊고** 중요한 소리를 냄(보스가 버튼 틱에 밀리지 않게)
- 빠르게 연타해 애니메이션이 빨리 감기면 지나간 큐가 한꺼번에 몰려옴 → **늦은 큐**는 시각 연출 없음, 소리는 보스·스테이지 결과처럼 `important`인 것만 짧은 창(150ms)에 하나

#### 어디에 쓰였나

- `src/audio/engine.ts` — `AudioEngine`: 결정만 하고, 출력(`SynthBackend`)과 시계는 주입. 가짜 출력으로 모든 규칙을 Node에서 테스트(`tests/audio.test.ts`)
- `src/main.ts` — 첫 `pointerdown`/`keydown`(캡처 단계)에서 `unlock()`, `visibilitychange`에서 `setHidden`

#### 핵심 코드

```ts
// src/audio/engine.ts
private decide(id: SoundId, now: number, late: boolean, pitch: number): PlayResult {
  if (!this.enabledFlag || this.hidden) return 'off';
  if (!this.backend) return 'locked';                       // 아직 제스처 없음
  const def = this.sounds[id];
  if (late && (!def.important || now - this.lastLate < LATE_WINDOW)) return 'late';
  const last = this.lastPlayed.get(`${id}:${pitch}`);
  if (last !== undefined && now - last < def.minGap) return 'throttled';
  // … 동시 음 수가 차면 우선순위가 더 낮은 소리를 끊거나, 없으면 'capped'
  return 'played';
}

// src/main.ts — 첫 터치·키가 오디오를 연다
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => audio.setHidden(document.hidden));
```

결정과 소리 생성을 나눈 덕분에, 브라우저 검사에서는 "무엇이 왜 재생/생략되었는가"를 기록(`__neonRift.feedback.sounds()`)으로 읽어 확인했습니다. 예: 혼돈 보스 턴 → `slide, merge, merge(3), merge(7), mergeBig(12), stone, stone:throttled, stone:throttled, merge(15) …, bossChaos, spawn`. 우리는 소리를 직접 들을 수 없으므로 이 기록과 오프라인 렌더링 수치가 증거입니다.

iOS에서는 Web Audio가 무음 스위치를 따릅니다. 우회 API가 있지만 초안이라 쓰지 않았고, 설정 화면에 "소리가 안 나면 기기의 무음 모드를 확인하세요"를 적었습니다.

#### 연습 과제

1. `LATE_WINDOW`를 0으로 하고 빠르게 연타하며 보스 스테이지를 지나가 보세요. 기록에서 무엇이 달라지나요?
2. `maxVoices`를 3으로 낮추고 `tests/audio.test.ts`의 빼앗기 테스트를 읽어 보세요. 우선순위가 같으면 왜 빼앗지 않을까요?
3. 첫 제스처 전에 요청된 소리를 버리지 않고 모아 두었다가 잠금 해제 때 재생하면 어떤 문제가 생길까요?

### 7.9 진동: 지원 현실

#### 왜 필요한가

`navigator.vibrate`는 안드로이드의 크롬·삼성 인터넷에서 동작하지만, **iOS의 모든 브라우저(사파리와 같은 엔진을 씀)에서는 존재하지 않습니다.** 그래서 진동은 핵심 피드백이 아니라 **덤**입니다. 진동으로만 전달되는 정보는 없고, 모든 진동 사건은 화면과 소리로도 나타납니다.

#### 어디에 쓰였나

- `src/input/haptics.ts` — `browserVibrate()` 기능 감지, `Haptics.play(kind)`, 패턴 표, 우선순위 있는 간격 제한(90ms)
- 설정 시트 — 진동을 못 하는 기기에서는 **스위치 자체를 숨김**(눌러도 아무 일 없는 스위치는 거짓말)

#### 핵심 코드

```ts
// src/input/haptics.ts
export function browserVibrate(): VibrateFn | null {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  if (!nav || typeof nav.vibrate !== 'function') return null; // iOS: null → 모든 호출이 조용한 무동작
  return (pattern) => nav.vibrate(pattern);
}

export const HAPTIC_PATTERNS = {
  merge: 8,
  mergeBig: 18,
  stone: [10, 30, 8],
  bomb: [28, 30, 14],
  boss: [30, 50, 60],
  invalid: 6,
  stageClear: [16, 60, 16, 60, 40],
  failure: [40, 80, 60],
};
```

작은 합체(32 미만, 콤보 아님)는 진동하지 않습니다. 매 합체마다 휴대폰이 떨면 1분 안에 끄게 됩니다. 간격 제한 안에서는 **더 중요한** 패턴(보스 > 돌 > 합체 > 잘못된 이동)만 끼어들 수 있습니다.

검증: 진동은 느낄 수 없으므로, 브라우저 검사에서 `navigator.vibrate`를 지운 환경(iOS 흉내)에서 스위치가 사라지고 아무것도 보내지 않으며 오류가 없음을, 있는 환경에서 요청 기록(`feedback.haptics()`)을 확인했습니다. 실제 안드로이드 기기에서의 세기는 확인하지 못했습니다.

#### 연습 과제

1. "이동 횟수 부족 경고"에 진동을 붙여야 할까요? 중요도 표(7.1장)를 기준으로 판단해 보세요.
2. 간격 제한을 없애면 혼돈 보스 턴(합체 8 + 돌 3 + 보스)에서 몇 번 진동 요청이 나갈지 기록으로 세어 보세요.

### 7.10 접근성: 움직임 줄이기

#### 왜 필요한가

화면 흔들림, 갑작스러운 확대, 깜빡이는 효과는 전정 장애가 있는 사람에게 어지러움이나 메스꺼움을 일으킵니다. 운영체제의 "동작 줄이기" 설정은 CSS `prefers-reduced-motion`으로 읽을 수 있습니다. 하지만 연출을 전부 끄면 **정보도 함께 사라집니다**(무엇이 합쳐졌고 무엇이 깨졌는지). 그래서 원칙은 "움직임은 빼고 정보는 남긴다"입니다.

| 연출                            | 보통                 | 움직임 줄이기              |
| ------------------------------- | -------------------- | -------------------------- |
| 화면 흔들림, 히트스톱           | 있음                 | 없음                       |
| 스쿼시·스트레치, 큰 합체 움츠림 | 있음                 | 없음                       |
| 파티클                          | 측정한 밀도          | 그 4분의 1                 |
| 떠오르는 "+N"                   | 떠오름               | 제자리에서 나타났다 사라짐 |
| 잘못된 이동                     | 보드가 밀렸다 돌아옴 | 짧은 빨간 테두리           |
| 고리 펄스, 줄 섬광, 봉쇄 표시   | 있음                 | 그대로 (위치 정보)         |
| CSS 맥박(이동 부족·보스 임박)   | 깜빡임               | 색만 유지                  |

#### 어디에 쓰였나

- `src/save/store.ts` — `reduceMotion: 'auto' | 'on' | 'off'`와 `motionReduced(setting, systemPrefers)`
- `src/main.ts` — `matchMedia('(prefers-reduced-motion: reduce)')`와 설정을 합쳐 `renderer.setReducedMotion()`과 `data-motion` 속성에 반영, 시스템 설정이 바뀌면 다시 적용
- `src/render/renderer.ts`, `src/render/viewModel.ts`(`squashEnabled`), `src/render/fx.ts`(`reduced`), `src/game/feedback.ts`(`rendererBoard`의 밀림 → 테두리)
- `src/ui/style.css` — `.app[data-motion='reduced']` 규칙 하나로 CSS 애니메이션 정리

#### 핵심 코드

```ts
// src/save/store.ts
export function motionReduced(setting: MotionSetting, systemPrefersReduced: boolean): boolean {
  return setting === 'on' || (setting === 'auto' && systemPrefersReduced);
}

// src/main.ts
const reduced = motionReduced(settings.reduceMotion, reducedQuery.matches);
renderer.setReducedMotion(reduced);
screen.surface.dataset.motion = reduced ? 'reduced' : 'full';
```

설정은 세 칸입니다: "기기 설정"(기본) / "켬" / "끔". 기기 설정이 켜져 있어도 연출을 보고 싶은 사람이 있고, 기기 설정은 꺼져 있지만 이 게임에서만 줄이고 싶은 사람도 있습니다. 예전에는 CSS가 `@media (prefers-reduced-motion)`만 봤는데, 그러면 "끔"을 골라도 CSS 쪽은 줄어든 채였습니다. 지금은 속성 하나(`data-motion`)를 CSS와 캔버스가 함께 따릅니다.

#### 연습 과제

1. 움직임 줄이기에서 "+N" 글자를 아예 없애면 무엇을 잃나요? 상단 점수의 "+N"과 비교해 보세요.
2. 브라우저 개발자 도구의 "Emulate CSS prefers-reduced-motion"을 켜고 "기기 설정" 상태에서 설정 시트의 "지금: 켬" 표시가 바뀌는지 확인해 보세요.

### 7.11 프레임 시간 측정과 성능 예산

#### 왜 필요한가

"저가형 폰에서도 부드럽게"는 측정하지 않으면 그냥 희망입니다. 60fps는 프레임당 16.7ms이고, 그 안에 스크립트, 스타일, 레이아웃, 래스터, 합성이 모두 들어가야 합니다. 연출을 얹기 전후를 **같은 조건, 같은 최악의 턴**으로 재야 합니다.

#### 어디에 쓰였나

- `src/render/budget.ts` — `FrameBudget`: 움직이는 프레임의 길이를 이동 평균으로 재서, 길면(22ms 초과) 파티클 밀도를 빠르게 낮추고 짧으면(18ms 미만) 천천히 되돌림. 기기 종류를 추측하지 않고 **측정값으로만** 정합니다.
- `src/render/renderer.ts` — `frameStats()`: 최근 600프레임의 간격(평균·p95·최악)과 렌더러 `tick` 자체의 비용, 현재 품질
- 측정 스크립트(저장소 밖): Chromium의 CDP `Emulation.setCPUThrottlingRate`로 CPU를 4배·6배 느리게 하고, 390×844(DPR 3)에서 최악의 턴을 10번 재생하며 `requestAnimationFrame` 간격을 기록

#### 핵심 코드

```ts
// src/render/renderer.ts — tick마다
this.budget.record(dt);
this.fx.density = this.budget.quality * (this.reducedMotion ? 0.25 : 1);

// src/render/budget.ts — 늦으면 초과 비율만큼 빠르게, 회복은 0.1씩 천천히
if (this.ema > this.slowMs && this.q > this.minQuality) {
  this.q = Math.max(this.minQuality, this.q / Math.min(2, this.ema / this.slowMs));
} else if (this.ema < this.fastMs && this.q < 1) {
  this.q = Math.min(1, this.q + 0.1);
}
```

**측정 결과** (최악의 턴: 연쇄 회로 + 균열 송곳 + 돌 3개 + 혼돈 보스 발동, 턴당 합체 8번; headless Chromium, 소프트웨어 래스터; 움직이는 동안의 프레임 간격, ms)

| CPU 스로틀 | 5단계 전 평균 / p95 / 최악 | 5단계 후 평균 / p95 / 최악 | 후: 렌더러 tick 평균 / 최악 | 후: 파티클 품질 |
| ---------- | -------------------------- | -------------------------- | --------------------------- | --------------- |
| 1×         | 17.0 / 16.8 / 33.4         | 16.7 / 16.7 / 16.8         | 0.29 / 1.8                  | 1.0             |
| 4×         | 30.0 / 83.3 / 100.1        | 23.9 / 33.4 / 50.1         | 1.53 / 17.7                 | 0.25            |
| 6×         | 53.1 / 133.4 / 166.7       | 37.2 / 50.1 / 100.1        | 3.06 / 33.1                 | 0.25            |

연출을 잔뜩 얹었는데 오히려 빨라졌습니다. 이유를 정직하게 적으면:

- **렌더러 자체의 비용은 작습니다**: 6배 느린 CPU에서도 `tick` 평균 3ms. 프레임 시간의 대부분은 브라우저의 래스터·합성(CPU 프로파일에서 "(program)")입니다.
- 전 버전의 보스 테두리 섬광은 **매 프레임 `shadowBlur`** 를 썼습니다. 소프트웨어 래스터에서 가장 비싼 연산입니다. 두 겹 선으로 바꾼 것(D72)이 큰 몫을 했을 것으로 보지만, 이것만 따로 떼어 재지는 않았습니다(추정).
- 느린 환경에서는 `FrameBudget`이 파티클을 4분의 1로 줄였습니다. 1×에서는 품질 1.0 그대로입니다.
- 헤드리스 소프트웨어 렌더링 숫자이므로 실제 휴대폰(GPU 합성)과 절대값은 다릅니다. **비교용**입니다. 실제 저가형 폰에서의 측정은 아직 못 했습니다.

입력 → 코어 → 화면 갱신 호출(`move()` 한 번)의 비용은 4×에서 평균 4.6ms(전 4.8ms)로, 연출이 입력 처리를 느리게 하지 않았습니다.

#### 연습 과제

1. `FrameBudget`의 `slowMs`를 30으로 올리고 4× 측정을 다시 해 보세요. 평균과 p95가 어떻게 바뀌나요?
2. `ParticlePool.draw`에서 `lighter` 합성을 끄면 래스터 비용이 줄어드는지 6×에서 재 보세요.
3. 측정 스크립트가 "움직이는 동안의 프레임"만 세는 이유를 설명해 보세요. 쉬는 동안의 프레임을 섞으면 평균이 어떻게 왜곡되나요?

### 7.12 연출을 눈으로 검사하기: 고정 시드 + 시간 단계 + 밀착 인화

#### 왜 필요한가

연출은 단위 테스트로 "좋아 보인다"를 확인할 수 없습니다. 하지만 사람(또는 리뷰어)이 매번 손으로 플레이할 수도 없습니다. 그래서 **같은 장면을 매번 똑같이** 만들고, 시간을 직접 넘기며 프레임을 찍어 한 장에 늘어놓습니다(밀착 인화, contact sheet).

#### 어디에 쓰였나

- 디버그 훅(`?debug`): `load()`로 정확한 보드, `advance(ms)`로 시간 단계, 파티클 난수도 시드 고정이라 결과가 매번 같음
- 검사 스크립트(저장소 밖): 큰 합체, 연쇄 콤보, 돌 깨기, 얼음·저주·프리즘, 보스 3종, 스테이지 클리어, 잘못된 이동, 움직임 줄이기 각각을 0~1300ms 사이 11프레임으로

#### 핵심 코드

```js
// 정확한 상황 → 이동 → 시간을 조금씩 넘기며 보드만 잘라 찍기
h.load({ ...run, board: { ...run.board, cells }, boss: { ...run.boss, turnsUntil: 1 } });
h.move('left');
for (const t of [0, 50, 100, 140, 180, 230, 290, 360, 450, 600, 800]) {
  h.advance(t - prev);
  await page.screenshot({ path: `boss-${t}.png`, clip: boardBox });
}
```

밀착 인화를 보고 고친 것: 합체 불꽃이 새 숫자를 덮음(→ 가장자리에서 시작), 보드 중앙의 "콤보 ×3" 알약이 다른 타일을 가림(→ 합체한 타일의 "+N ×3"으로), 같은 칸의 연쇄 글자가 겹쳐 읽을 수 없음(→ 새 글자가 옛 글자를 대신), 맨 윗줄의 글자가 캔버스 밖으로 잘림(→ 위쪽 한계), 콤보 음이 값 순서 때문에 내려감(→ 항상 올라가는 음계), 노이즈 레이어가 사실상 무음(→ 재생 속도 단위 버그, 오프라인 렌더링 최대값으로 발견).

#### 연습 과제

1. 같은 시나리오를 움직임 줄이기 켜고/끄고 찍어 나란히 놓아 보세요. "정보는 남는다"가 사실인지 칸마다 확인해 보세요.
2. 밀착 인화 한 장을 보고 "이 연출은 사건의 중요도에 비해 크다/작다"를 하나씩 판정하는 채점표를 만들어 보세요.

## 8. 6단계: 마감 — 설치, 배포, 검증, 균형, 소개

게임은 5단계에서 완성됐습니다. 6단계는 **남에게 내놓는 일**입니다: 휴대폰에 설치되고 오프라인으로도 돌아가게(PWA), 커밋하면 자동으로 검사·배포되게(CI/CD), 실제 브라우저에서 부품이 제대로 이어졌는지 자동으로 확인하게(e2e), 유물이 런을 대신 깨 주지 않게(밸런스 2차), 그리고 처음 보는 사람이 1분 안에 이해하게(README).

이번 단계에서 만들거나 크게 바꾼 파일:

| 파일                                                            | 내용                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `public/manifest.webmanifest`                                   | 웹 앱 매니페스트: 한국어 이름, `standalone`, 세로, 색, 상대 경로 `start_url`/`scope`, 아이콘        |
| `public/icons/*`, `public/favicon.svg`, `og-image`              | 코드로 그린 아이콘(192, 512, 마스커블 512, 애플 180, 파비콘)과 공유 미리보기 이미지                 |
| `src/pwa/sw.ts`                                                 | 서비스 워커: 설치 때 프리캐시, 활성화 때 옛 캐시 삭제, 캐시 우선 응답, 대기 중 "넘겨받기" 메시지    |
| `src/pwa/cachePlan.ts`                                          | 워커의 순수한 결정들(캐시 이름, 지울 캐시, 요청 → 캐시 파일). Node에서 테스트                       |
| `src/pwa/register.ts`                                           | `UpdateFlow`: 등록, 새 버전 감지, 플레이어가 누를 때만 교체·새로고침, 한 시간에 한 번 업데이트 확인 |
| `src/ui/updateToast.ts`                                         | "새 버전이 있어요 · 나중에 · 새로고침" 안내                                                         |
| `tools/vite-precache.ts`                                        | Vite 플러그인: `sw.js`를 독립 파일로 빌드하고, 빌드 파일 목록과 내용 해시를 넣음                    |
| `tools/icons.ts`, `tools/chromium.ts`                           | 아이콘·공유 이미지를 SVG로 그려 Playwright Chromium으로 PNG 변환 (`npm run icons`)                  |
| `index.html`                                                    | 제목·설명, 매니페스트, 아이콘, iOS 메타 태그, Open Graph, `theme-color`                             |
| `.github/workflows/ci.yml`, `deploy.yml`                        | 검사(린트·포맷·테스트·빌드·e2e)와 GitHub Pages 배포                                                 |
| `playwright.config.ts`, `e2e/*`                                 | 휴대폰 화면 e2e: 스와이프 → 1-1 클리어 → 유물 → 새로고침 → 이어하기, 오프라인 새로고침              |
| `src/core/balance.ts`, `src/core/relics.ts`                     | 유물 수치 조정, 잔해 연료를 "돌 2개당 이동 1"로, 2-보스·3-3 점수 목표 1050·1500                     |
| `tools/simulate.ts`                                             | 점수 스테이지를 "점수 유물 있음/없음"으로 나눈 줄, 기록에 단계별 선택과 마지막 스테이지 점수        |
| `README.md`, `tools/readme-tables.ts`, `tools/capture-media.ts` | 포트폴리오 README, 게임 데이터로 만드는 규칙 표(+ 낡으면 실패하는 테스트), 스크린샷 촬영 스크립트   |

### 8.1 웹 앱 매니페스트와 코드로 그린 아이콘

#### 왜 필요한가

브라우저가 웹 페이지를 "앱"으로 설치하게 해 주려면 **이 앱이 무엇인지**를 알려 주는 파일이 필요합니다. 이름(홈 화면에 보일 짧은 이름), 아이콘, 시작 주소, 열리는 모양(주소창 없는 `standalone`), 화면 방향, 스플래시 배경색 같은 것들입니다. 이것이 **웹 앱 매니페스트**(`manifest.webmanifest`)이고, HTML에서 `<link rel="manifest">`로 연결합니다.

iOS Safari는 매니페스트를 일부만 읽기 때문에 `apple-touch-icon`과 `apple-mobile-web-app-*` 메타 태그를 따로 둡니다. 링크를 메신저나 SNS에 붙였을 때 보이는 카드는 **Open Graph** 태그(`og:title`, `og:image` …)가 정합니다.

아이콘은 그림 파일이지만 이 프로젝트는 "에셋 0"을 지켜 왔습니다. 그래서 아이콘도 **코드로 그리고**, 결과 PNG만 저장소에 넣습니다. 다시 그릴 일이 생기면 스크립트를 한 번 돌리면 됩니다.

#### 어디에 쓰였나

- `public/manifest.webmanifest` — `public/`의 파일은 빌드할 때 그대로 `dist/`에 복사됩니다
- `index.html` — 매니페스트·아이콘 링크, iOS 메타 태그, Open Graph, `theme-color`(주소창·상태 표시줄 색)
- `tools/icons.ts` — 엠블럼(깎인 모서리 칩 + 회로선 + 그것을 가르는 주황 균열)을 SVG 문자열로 만들고, Playwright의 Chromium으로 열어 크기별로 스크린샷
- `tests/pwa.test.ts` — 매니페스트의 경로가 `/2048-project/` 안에 있는지, 적힌 아이콘 파일이 실제로 있는지, 마스커블 아이콘이 있는지

#### 핵심 코드

```json
// public/manifest.webmanifest (일부)
{
  "id": "./",
  "name": "네온 리프트 (Neon Rift)",
  "short_name": "네온 리프트",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#08080f",
  "background_color": "#08080f"
}
```

`start_url`과 `scope`가 **상대 경로**인 점이 중요합니다. 상대 경로는 "매니페스트 파일이 있는 곳" 기준으로 풀리므로, 사이트가 `https://dbsdlstn.github.io/2048-project/`에 있으면 `/2048-project/`가 되고, 로컬 미리보기(`localhost:4173/2048-project/`)에서도 맞습니다. `/`라고 쓰면 도메인 루트(다른 저장소의 페이지들)까지 범위가 넓어져 버립니다.

**마스커블 아이콘**: 안드로이드 런처는 아이콘을 원·둥근 사각형 등으로 잘라 냅니다. 잘려도 안전한 영역은 가운데 지름 80% 원입니다. 그래서 마스커블 아이콘은 배경을 끝까지 채우고 엠블럼은 0.78배로 줄여 그 원 안에 둡니다.

```ts
// tools/icons.ts — 같은 SVG를 크기별로 래스터화
const browser = await chromium.launch(chromiumOptions());
const page = await browser.newPage();
for (const out of outputs) {
  await page.setViewportSize({ width: out.width, height: out.height });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: out.width, height: out.height },
    omitBackground: out.transparent ?? false, // 둥근 아이콘·파비콘은 바깥을 투명하게
  });
  writeFileSync(join(PUBLIC, out.file), png);
}
```

#### 연습 과제

1. 크롬 개발자 도구 → Application → Manifest에서 경고를 확인하고, `start_url`을 `/`로 바꾸면 무엇이 달라지는지 보세요.
2. `tools/icons.ts`의 `rift` 좌표를 바꿔 균열 모양을 다시 그리고 `npm run icons`로 결과를 비교해 보세요. 32px 파비콘에서도 균열이 읽히나요?
3. [maskable.app](https://maskable.app)에 `maskable-512.png`를 올려 원·물방울 모양으로 잘렸을 때 엠블럼이 잘리지 않는지 확인해 보세요.

### 8.2 서비스 워커 생명주기와 프리캐시

#### 왜 필요한가

오프라인에서 게임을 열면 브라우저는 서버에 `index.html`을 요청하다 실패합니다. **서비스 워커**는 페이지와 네트워크 사이에 끼는 작은 스크립트로, 페이지의 요청(`fetch`)을 가로채 캐시에서 대답할 수 있습니다. 미리 빌드 파일 전부를 캐시에 받아 두면(**프리캐시**) 비행기 모드에서도 게임이 열립니다.

서비스 워커는 페이지와 수명이 다릅니다. 이 **생명주기**를 이해하는 것이 핵심입니다.

```
 register(sw.js)
     │
     ▼
 installing ── install 이벤트: 이번 빌드의 파일을 새 캐시에 전부 받기
     │
     ▼
 installed(waiting) ── 옛 워커가 아직 열린 페이지를 맡고 있으면 여기서 기다림
     │   (옛 워커가 없거나, skipWaiting() 하면 통과)
     ▼
 activating ── activate 이벤트: 옛 버전의 캐시 지우기, clients.claim()
     │
     ▼
 activated ── fetch 이벤트를 받아 캐시에서 대답
```

브라우저는 페이지를 열 때(그리고 우리가 `update()`를 부를 때) `sw.js`를 다시 받아 **한 바이트라도 다르면** 새 버전으로 보고 설치를 시작합니다. 그래서 "빌드가 바뀌면 `sw.js`도 반드시 바뀌어야" 합니다.

#### 어디에 쓰였나

- `src/pwa/sw.ts` — 이벤트 연결(설치·활성화·메시지·fetch)
- `src/pwa/cachePlan.ts` — 결정만 하는 순수 함수(캐시 이름, 지울 캐시, 요청에 대답할 파일)
- `tools/vite-precache.ts` — `sw.js`를 독립 파일로 빌드하고 `__PRECACHE_MANIFEST__` 자리에 `{ version, files }`를 넣음
- `vite.config.ts` — 플러그인 등록, 프리캐시에서 뺄 파일(512 아이콘, 공유 이미지)
- `tests/pwa.test.ts` — 캐시 결정 함수의 단위 테스트

#### 핵심 코드

빌드 쪽: 번들의 모든 파일과 `public/`의 파일을 모아 **내용 해시**를 만들고, 그것을 버전으로 씁니다. 어떤 파일이든 바뀌면 해시가 바뀌고 → `sw.js`가 바뀌고 → 브라우저가 새 버전을 알아챕니다.

```ts
// tools/vite-precache.ts (generateBundle, enforce: 'post'라 index.html까지 들어온 뒤)
const files = [...contents.keys()].filter((f) => !options.exclude?.(f)).sort();
const hash = createHash('sha256');
for (const f of files)
  hash
    .update(f)
    .update('\0')
    .update(contents.get(f) ?? '');
const manifest = { version: hash.digest('hex').slice(0, 12), files };
sw.code = parts.join(JSON.stringify(manifest)); // __PRECACHE_MANIFEST__ 자리에
```

워커 쪽: 설치 때 받고, 활성화 때 옛 캐시를 지우고, 요청에는 캐시로 대답합니다.

```ts
// src/pwa/sw.ts
worker.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // `reload`: HTTP 캐시를 건너뛰어 낡은 사본이 새 캐시에 들어가지 않게
      cache.addAll(manifest.files.map((f) => new Request(new URL(f, scope), { cache: 'reload' }))),
    ),
  );
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const path = cachedPathFor(new URL(request.url), scope, files, request.mode === 'navigate');
  if (path === null) return; // 모르는 요청은 손대지 않고 네트워크로
  event.respondWith(
    caches
      .open(CACHE)
      .then((c) => c.match(new URL(path, scope).href))
      .then((hit) => hit ?? fetch(request)),
  );
});
```

```ts
// src/pwa/cachePlan.ts — 페이지 이동은 전부 앱 셸(index.html)로
if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return null;
const path = url.pathname.slice(scope.pathname.length);
if (navigate || path === '') return files.has('index.html') ? 'index.html' : null;
return files.has(path) ? path : null;
```

`?debug&seed=7`처럼 쿼리가 붙은 주소도 같은 `index.html`로 대답합니다. 쿼리는 스크립트가 읽기 때문입니다.

**왜 플러그인을 안 썼나**(D73): `vite-plugin-pwa`(Workbox)는 검증된 선택입니다. 하지만 이 게임은 한 페이지, 파일 8개라 필요한 것은 "목록 받기 + 옛 캐시 지우기 + 캐시 우선" 세 가지뿐이고, 직접 쓰면 주석 포함 80줄에 **생명주기를 눈으로 볼 수 있습니다**. 대신 실수하기 쉬운 곳(캐시 무효화)은 내용 해시로 기계적으로 처리하고, 워커가 페이지와 모듈을 공유하면 빌드가 실패하게 했습니다(워커는 독립된 한 파일이어야 함).

> TypeScript 메모: 이 프로젝트의 `tsconfig`는 DOM 라이브러리를 씁니다. 워커 전용 타입(`FetchEvent` 등)은 DOM과 함께 켜면 충돌하므로, `sw.ts` 안에 필요한 몇 개만 작은 인터페이스로 선언했습니다.

#### 연습 과제

1. `npm run build && npm run preview`로 열고 개발자 도구 → Application → Service workers / Cache storage에서 캐시 이름과 파일 목록을 확인하세요. Network 탭에서 "Offline"을 켜고 새로고침해 보세요.
2. `cachedPathFor`에 "이미지는 네트워크 우선, 실패하면 캐시" 같은 다른 전략을 넣으려면 어떤 정보가 더 필요할까요? 테스트부터 써 보세요.
3. `vite.config.ts`의 `exclude`에서 512 아이콘을 빼면 프리캐시 크기가 얼마나 늘어나는지 `dist/sw.js`에서 확인해 보세요.

### 8.3 업데이트 전략: 플레이어가 고를 때만

#### 왜 필요한가

서비스 워커가 캐시에서 대답한다는 것은, 새 버전을 배포해도 **이미 설치한 사람은 옛 버전을 본다**는 뜻입니다. 방법은 두 가지입니다.

- **즉시 교체**(`skipWaiting()`을 설치 때 바로 호출): 새 워커가 곧장 넘겨받습니다. 하지만 열려 있는 페이지는 옛 JS로 돌고 있는데 캐시는 새 파일로 바뀌어, 페이지가 나중에 파일을 더 받을 때 버전이 섞일 수 있습니다. 넘겨받은 순간 자동 새로고침을 하면 **런 도중에 화면이 갑자기 다시 뜹니다**.
- **기다렸다가 묻기**(이 게임의 선택, D74): 새 워커는 `waiting`에서 기다리고, 페이지가 "새 버전이 있어요 · 새로고침"을 보여 줍니다. 플레이어가 누르면 그때 넘겨받고 새로고침합니다. 런은 매 이동마다 저장되므로 새로고침 뒤 "이어하기"로 정확히 같은 상태에서 계속합니다.

함정이 하나 있습니다. **첫 설치**도 `clients.claim()`으로 페이지를 넘겨받으며 `controllerchange` 이벤트를 냅니다. 이것을 "업데이트"로 착각해 새로고침하면 처음 방문한 사람의 화면이 한 번 깜빡입니다. 그래서 "플레이어가 새로고침을 눌렀을 때만" 새로고침합니다.

#### 어디에 쓰였나

- `src/pwa/register.ts` — `UpdateFlow`: 브라우저 객체를 작은 인터페이스(`ContainerLike`, `RegistrationLike`, `WorkerLike`)로 받음
- `src/ui/updateToast.ts` — 안내 DOM (`role="status"`, 나중에/새로고침)
- `src/main.ts` — 프로덕션 빌드에서만 등록, 화면이 다시 보일 때 업데이트 확인
- `tests/pwa.test.ts` — 가짜 컨테이너·등록·워커로 흐름 네 가지를 검사

#### 핵심 코드

```ts
// src/pwa/register.ts
container.addEventListener('controllerchange', () => {
  // 첫 설치도 clients.claim()으로 넘겨받는다: 요청했을 때만 새로고침
  if (this.applying) this.options.reload();
});
const reg = await container.register(this.options.url, { scope: this.options.scope });
// 게임을 닫아 둔 사이에 설치를 마친 버전이 이미 기다리고 있을 수 있다
if (reg.waiting && container.controller) this.options.onUpdateReady();
reg.addEventListener('updatefound', () => {
  const next = reg.installing;
  next?.addEventListener('statechange', () => {
    // controller가 없으면 첫 설치이지 업데이트가 아니다
    if (next.state === 'installed' && container.controller) this.options.onUpdateReady();
  });
});

apply(): void {
  this.applying = true;
  this.registration?.waiting?.postMessage(SKIP_WAITING_MESSAGE); // 워커가 skipWaiting()
}
```

```ts
// tests/pwa.test.ts — 브라우저 없이 흐름을 검사
it('a new version waits for the player, then takes over and reloads once', async () => {
  const { container, flow, log } = setup({}); // 이미 옛 워커가 맡고 있는 페이지
  await flow.start();
  const next = container.reg.deliver(); // 새 버전 설치 완료
  expect(log.ready).toBe(1); // 안내가 뜸
  flow.apply(); // 플레이어가 새로고침을 누름
  expect(next.messages).toEqual([SKIP_WAITING_MESSAGE]);
  expect(log.reloads).toBe(0); // 넘겨받기 전에는 아직
  container.takeOver();
  expect(log.reloads).toBe(1);
});
```

실제 브라우저에서는 회귀 검사 스크립트가 같은 흐름을 확인했습니다: 런 도중 `sw.js`만 바뀐 빌드로 서버를 바꾸고 `update()` → 안내가 뜨고 페이지는 그대로(심어 둔 표시 값이 살아 있음) → 계속 이동 가능 → "새로고침" → 캐시가 새 버전 하나만 남음 → "이어하기"가 같은 보드.

#### 연습 과제

1. 두 번째 탭을 열어 둔 채 업데이트하면 어떻게 될까요? 한쪽에서 새로고침을 누르면 다른 탭에는 무슨 일이 생기는지 생각해 보고 `controllerchange`로 확인해 보세요.
2. `UPDATE_CHECK_INTERVAL`을 1분으로 줄였을 때의 장단점(배터리, 서버 요청)을 적어 보세요.
3. 결과 화면(런이 끝난 뒤)에서는 묻지 않고 바로 새로고침해도 될까요? `UpdateFlow`에 그 규칙을 넣고 테스트를 추가해 보세요.

### 8.4 CI/CD: GitHub Actions와 Pages

#### 왜 필요한가

"내 컴퓨터에서는 됐는데"를 없애려면, 모든 커밋을 **깨끗한 기계에서 같은 명령으로** 검사해야 합니다. 이것이 CI(지속적 통합)입니다. 그리고 `main`에 들어간 코드가 사람 손을 거치지 않고 사이트에 올라가게 하는 것이 CD(지속적 배포)입니다. GitHub Actions는 저장소의 `.github/workflows/*.yml`을 읽어 GitHub의 가상 머신에서 명령을 실행합니다.

#### 어디에 쓰였나

- `.github/workflows/ci.yml` — 모든 push와 PR: 설치 → 린트 → 포맷 검사 → 단위 테스트 → 빌드(+ 번들 크기를 요약에 기록), 그리고 따로 e2e 작업
- `.github/workflows/deploy.yml` — `main`에 push될 때와 수동 실행: 테스트 → 빌드 → Pages에 올리기
- `package.json`의 `engines` — Node 22.13 이상(Vitest 5, ESLint 10의 요구 사항). 워크플로는 Node 22를 씁니다
- `vite.config.ts`의 `base: '/2048-project/'`

#### 핵심 코드

```yaml
# .github/workflows/deploy.yml (요약)
on:
  push:
    branches: [main]
  workflow_dispatch:          # Actions 탭에서 손으로 실행

permissions:                  # 이 작업에 필요한 최소 권한만
  contents: read
  pages: write                # Pages에 올리기
  id-token: write             # 배포 요청의 신원 증명(OIDC)

concurrency:
  group: pages
  cancel-in-progress: false   # 진행 중인 배포는 끝까지

jobs:
  build:
    if: github.ref == 'refs/heads/main'   # 수동 실행은 아무 브랜치에서나 가능하므로 막음
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }   # ~/.npm 캐시: 두 번째부터 설치가 빠름
      - run: npm ci                              # package-lock.json 그대로 설치
      - run: npm run test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5   # dist/를 Pages용 묶음으로
        with: { path: dist }
  deploy:
    needs: build
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

각 단계가 하는 일:

| 단계                    | 하는 일                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `checkout`              | 저장소 코드를 가상 머신에 받기                                                           |
| `setup-node` + `cache`  | Node 설치, `package-lock.json` 해시를 열쇠로 npm 캐시 복원                               |
| `npm ci`                | 잠금 파일과 정확히 같은 버전으로 설치(잠금 파일과 `package.json`이 어긋나면 실패)        |
| `configure-pages`       | Pages 설정을 읽어 둠(사이트 주소 등)                                                     |
| `upload-pages-artifact` | `dist/`를 tar로 묶어 이 실행의 산출물로 올림                                             |
| `deploy-pages`          | 그 산출물을 실제 사이트로 공개. `github-pages` 환경은 기본적으로 기본 브랜치만 배포 허용 |

**base 경로가 왜 중요한가**: GitHub Pages의 프로젝트 사이트는 `https://<사용자>.github.io/<저장소>/`에 올라갑니다. 빌드된 `index.html`이 `/assets/index.js`를 부르면 도메인 루트에서 찾다가 404가 납니다. `base: '/2048-project/'`로 빌드하면 Vite가 모든 경로 앞에 `/2048-project/`를 붙입니다. 서비스 워커의 범위, 매니페스트의 `start_url`도 같은 경로 안에 있어야 합니다(8.1, 8.2).

**정직한 메모**: 이 두 워크플로는 이 저장소에서 아직 한 번도 실행되지 않았습니다. 액션 이름·버전이 실제로 있는지, 문법은 `actionlint`로 확인했지만, 진짜 확인은 첫 실행입니다.

#### 연습 과제

1. `ci.yml`에 번들 크기 상한(예: gzip 60KB를 넘으면 실패)을 넣어 보세요. 지금 요약에 크기를 적는 단계를 고치면 됩니다.
2. e2e 작업을 `needs: check`로 바꾸면 무엇이 좋아지고 무엇이 느려지나요?
3. 배포 워크플로에서 `npm run test`를 빼면 어떤 위험이 생기나요? 반대로 CI가 이미 같은 커밋을 검사했다면 왜 다시 하는 걸까요?

### 8.5 e2e 테스트: 단위 테스트와 무엇이 다르고, 어떻게 결정적으로 만드나

#### 왜 필요한가

단위 테스트 318개는 규칙과 부품을 하나씩 검사합니다. 하지만 "스와이프가 실제로 컨트롤러에 닿는가", "저장이 새로고침을 견디는가", "서비스 워커가 정말 오프라인에서 대답하는가"는 **부품을 다 조립한 진짜 브라우저**에서만 보입니다. 이것이 e2e(end-to-end) 테스트입니다.

|             | 단위 테스트 (Vitest)  | e2e (Playwright)                             |
| ----------- | --------------------- | -------------------------------------------- |
| 대상        | 함수·클래스 하나      | 빌드된 앱 전체 + 실제 브라우저               |
| 속도        | 318개에 약 1초        | 2개에 약 3초 (+ 빌드)                        |
| 잘 잡는 것  | 규칙 오류, 경계값     | 연결 누락, 저장/복원, 서비스 워커, 실제 입력 |
| 실패했을 때 | 어느 함수인지 바로 앎 | 어디서 끊겼는지 찾아야 함(추적 파일이 도움)  |
| 흔들림      | 거의 없음             | 시간·애니메이션·네트워크 때문에 생기기 쉬움  |

그래서 e2e는 **짧게, 가장 중요한 흐름 두 개만** 둡니다.

**흔들리지 않게(결정적으로) 만드는 방법**

1. **시드 고정**: `?seed=42`면 매번 같은 타일이 같은 칸에 나옵니다.
2. **기준(oracle)은 코어**: 테스트는 Node에서 같은 시드로 순수 코어를 돌려 "이 방향들을 누르면 이 격자가 되어야 한다"를 먼저 계산하고, 브라우저가 실제 입력으로 정확히 같은 격자에 도착하는지 봅니다. 손으로 적은 기댓값이 없어 밸런스 숫자가 바뀌어도 테스트를 고칠 일이 없습니다.
3. **잠자기 없음**: `waitForTimeout` 대신 디버그 훅의 `settle()`로 애니메이션을 끝으로 보내고, 상태는 `expect.poll`로 기다립니다.
4. **실제 입력**: 처음 네 번은 진짜 포인터 스와이프, 나머지는 방향키.

#### 어디에 쓰였나

- `playwright.config.ts` — 휴대폰(Pixel 7) 화면, `webServer`가 빌드 후 `vite preview`를 띄움, 이 샌드박스에서는 미리 설치된 Chromium(`tools/chromium.ts`), CI에서는 `npx playwright install --with-deps chromium`으로 받은 브라우저
- `e2e/run.spec.ts` — 테스트 두 개
- `e2e/helpers.ts` — `open`, `settle`, `grid`, `swipe`

#### 핵심 코드

```ts
// e2e/run.spec.ts — 같은 시드를 코어로 먼저 둔다
function referencePlan(): { dirs: Direction[]; grids: number[][][] } {
  const order: Direction[] = ['down', 'left', 'right', 'up'];
  let run: RunState = startRun('run', SEED).run;
  const dirs: Direction[] = [];
  const grids: number[][][] = [];
  while (run.status === 'playing') {
    const dir = order.find((d) => runDirections(run).includes(d));
    if (!dir) break;
    run = runMove(run, dir).run;
    dirs.push(dir);
    grids.push(toValueGrid(run.board));
  }
  if (run.status !== 'offer')
    throw new Error(`seed ${SEED}: the reference plan does not clear 1-1`);
  return { dirs, grids };
}

// 브라우저: 실제 입력 → 애니메이션 끝내기 → 격자 비교
for (const [i, dir] of plan.dirs.entries()) {
  if (i < 4) await swipe(page, dir);
  else await page.keyboard.press(KEY[dir]);
  await settle(page);
  expect(await grid(page), `after move ${i + 1} (${dir})`).toEqual(plan.grids[i]);
}
```

```ts
// 오프라인: 한 번 방문 → 워커가 페이지를 맡을 때까지 → 네트워크 끊고 새로고침
await expect
  .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
  .toBe(true);
await context.setOffline(true);
await page.reload();
```

Lighthouse는 PWA 점검 항목을 없앴습니다(12.x, RESEARCH.md 참고). 그래서 설치 가능성과 오프라인 동작은 이렇게 Playwright로 직접 확인합니다(회귀 검사에서는 CDP의 `Page.getAppManifest`, `Page.getInstallabilityErrors`도 썼습니다).

**Playwright 버전 고정**(D78): `@playwright/test`는 버전마다 맞는 Chromium 빌드가 정해져 있습니다. 이 샌드박스에 미리 설치된 Chromium(빌드 1243)에 맞는 1.63.0으로 정확히 고정했습니다. CI는 같은 버전의 브라우저를 내려받습니다.

#### 연습 과제

1. `--repeat-each 10`으로 돌려 흔들림이 없는지 확인해 보세요. `settle()` 호출을 지우면 몇 번째에 실패하나요?
2. 무한 모드 게임 오버(더 움직일 수 없음 → 결과 화면 → 다시 하기)를 e2e로 추가해 보세요. `load()`로 거의 꽉 찬 보드를 만들면 짧아집니다.
3. 같은 테스트를 `devices['iPhone 13']`(WebKit)으로도 돌리려면 설정에 무엇을 추가해야 할까요?

### 8.6 유물 밸런스 2차 조정: 전후 숫자

#### 왜 필요한가

4단계의 결론(6.5장, D57)은 "다음 조정은 유물 수치 쪽이어야 한다"였습니다. 숫자가 그 이유를 보여 줬습니다: 구석 봇 승률 36%(목표 15~30%), 유물을 하나도 안 고르면 0%, 그리고 점수 스테이지(2-보스 800, 3-3 1000)는 **런 안에서 100%**. 실제 플레이에서도 점수 유물이 쌓이면 점수 목표는 긴장 없이 깨졌습니다.

#### 어디에 쓰였나

- `src/core/balance.ts` — `RELIC_TUNING`, 2-보스·3-3의 점수 목표
- `src/core/relics.ts` — 잔해 연료를 카운터 방식으로
- `tools/simulate.ts` — 점수 스테이지를 "점수 유물 있음/없음"으로 나눈 줄
- 조정 실험은 저장소 밖 임시 스크립트(수치를 메모리에서 바꿔 4프로세스로 병렬 실행, 400~500런 한 번에 약 8초)

#### 핵심 코드

**먼저 원인을 쟀습니다.** 점수 스테이지의 점수 분포를 유물 하나씩 붙여 재 보니(구석 봇, 목표를 없애고 이동 제한까지):

| 2-1 (점수 700/90)  | 평균 점수 | p10~p90  | 700 이상 |
| ------------------ | --------- | -------- | -------- |
| 유물 없음          | 705       | 644~768  | 46%      |
| 공명 증폭기 (+50%) | 981       | 855~1110 | 100%     |
| 모서리 닻 (2배)    | 910       | 818~1028 | 100%     |
| 역상 필터 (3배)    | 846       | 740~978  | 98%      |
| 여분 태엽 (+6)     | 760       | 692~878  | 86%      |

2048의 점수는 이동 수에 거의 비례해서 **분포가 좁습니다**(p10~p90이 ±10%). 그래서 +10%짜리 유물 하나만 있어도 클리어율이 46% → 90%로 뛰고, 점수 유물(+30~40%)은 확정 클리어가 됩니다. 게다가 2-보스에 도착한 런은 유물을 7개, 3-3에서는 10개 들고 있습니다. **"유물 없이도 가능한 목표"와 "유물 10개를 든 런에 긴장이 있는 목표"는 같은 숫자일 수 없습니다.**

**바꾼 것**

| 바꾼 것                                 | 이유                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| 공명 증폭기 +50% → +30%                 | 혼자 점수 +34~40%. 점수 유물 하나가 목표를 확정하지 않게                                 |
| 모서리 닻 2배 → 1.5배                   | 구석에 큰 타일을 모으는 플레이와 겹쳐 혼자 점수 +27~48%                                  |
| 프리즘 코어 10 → 12이동마다             | 유물 효과 +17점으로 가장 셈(희귀라 강한 건 괜찮지만 조금 덜)                             |
| 잔해 연료 돌 1개당 이동 1 → **2개당 1** | 돌이 많은 2-보스에서 혼자 점수 +30%(이동이 늘어서), 효과 +12점. 남는 1개는 카운터로(D80) |
| 점화 플러그 16 → 32                     | 점수 목표를 올린 중간 실험에서 효과 −8~−11점. 32는 64 목표의 절반이라 체감이 분명        |
| 도약 렌즈 첫 2번 → 3번                  | 효과 −4~−8점(조정 전과 중간 실험)                                                        |
| 축전 코일 합체 12번 → 8번               | 효과 −6점, 중간 실험 −13~−19점(봇이 사용 유물을 막혔을 때만 써서 낮게 잡히는 몫도 있음)  |
| 2-보스 점수 800 → 1050, 3-3 1000 → 1500 | 런 안의 점수 분포(p10~p25)에 맞춤. 2-1(700)은 유물 없이도 되는 첫 점수 스테이지로 둠     |

균열 송곳은 4(사실상 모든 합체)로 낮추는 안도 시험했지만 효과가 잡음 범위 안이라 8로 두었습니다. 역상 필터(3배)는 조건부라 그대로 두었습니다.

**결과**(`npm run sim -- --runs 500`, 시드 1000~1499, 같은 봇)

| 지표                                        | 목표         | 전        | 후                                  |
| ------------------------------------------- | ------------ | --------- | ----------------------------------- |
| 구석 봇 승률                                | 15~30%       | 37%       | **23%**                             |
| 구석 봇 1막 통과                            | ≥ 95%        | 92%       | 93% (미달)                          |
| 무작위 봇 1막 통과                          | ≤ 10%        | 14%       | 12% (미달)                          |
| 유물 없이 구석 봇 승률                      | 0%           | 0%        | 0%                                  |
| 2-보스 런 안 클리어(구석 봇)                | 긴장         | 99%       | 85% (점수 유물 있음 90% / 없음 43%) |
| 3-3 런 안 클리어                            | 긴장         | 100%      | 89% (있음 90%)                      |
| 2-1 런 안 클리어                            | —            | 96%       | 96% (있음 99% / 없음 89%)           |
| 유물 효과 범위(첫 제시에서 고름 vs 다른 것) | 죽은 것 없음 | −11~+17점 | −15~+14점 (아래 해석)               |

**정직한 해석**

- **승률은 목표 안으로 들어왔고, 점수 스테이지에 긴장이 생겼습니다.** 점수 유물이 없는 빌드도 2-보스를 43% 깹니다: 벽이 아니라 "어려운 판"입니다.
- **D57의 일부를 뒤집었습니다.** "유물 없이 0%인 스테이지 없음"은 이제 2-보스와 3-3에서 깨집니다(유물 0개로 그 스테이지만 단독으로 하면 0%). 하지만 유물 0개로 2-보스에 도착하는 플레이어는 없습니다(제시를 매번 건너뛰어야 함). 잣대를 "유물 0개"에서 "점수 유물이 없는 빌드"로 바꾼 것이 이번 결정입니다(D79).
- **1막 두 목표는 이번에도 못 맞췄습니다.** 유물은 1막에 거의 영향이 없고(첫 유물은 1-1 뒤에야 생김), 1막 보스에서 구석 봇이 지는 원인과 무작위 봇이 지는 원인이 둘 다 "막힘"이라 한 손잡이가 양쪽을 같이 움직입니다. 1막 보스의 이동을 130으로 늘려도 구석 봇은 그대로(실패가 이동이 아니라 막힘이므로), 돌을 늘리면 둘 다 떨어졌습니다. 1막은 튜토리얼이라 사람에게는 봇보다 쉬울 것으로 보고 표를 건드리지 않았습니다. 사람 플레이 기록으로 다시 볼 일입니다.
- **유물 효과 표는 여전히 "이 봇에게의 가치"입니다.** 표준오차가 ±5점이라 대부분은 잡음 범위이고, 실행할 때마다 ±7점쯤 오르내립니다. 꾸준히 음수인 정지 핀(−10)·축전 코일(−15)은 봇이 정지 핀을 쓰지 않고 사용 유물을 막혔을 때만 쓰기 때문입니다. 사람에게는 쓸모 있는 선택지라고 판단해 남겼습니다.

#### 연습 과제

1. `npm run sim -- --bots corner` 출력의 "score stages with / without a score relic" 줄을 읽고, 2-보스 목표를 1000과 1100으로 바꿔 두 숫자가 어떻게 움직이는지 보세요.
2. 잔해 연료를 다시 "1개당 1"로 돌리고 같은 표를 만들어 보세요. 승률이 몇 점 오르나요? 그 정도면 이 유물 하나가 런을 대신 깬다고 할 수 있을까요?
3. 봇에게 정지 핀 사용법(예: 가장 큰 타일이 구석에 있을 때 고정)을 가르쳐 정지 핀의 효과 점수가 어떻게 바뀌는지 재 보세요.

### 8.7 포트폴리오 README 쓰는 법

#### 왜 필요한가

리뷰어는 저장소를 열면 README를 먼저, 그리고 대개 그것만 읽습니다. 1분 안에 "무엇인가 → 어떻게 생겼나 → 무엇이 다른가 → 코드에서 볼 만한 것은 어디인가"가 전달되어야 합니다.

#### 어디에 쓰였나

- `README.md`
- `tools/capture-media.ts` — 빌드된 게임에서 디버그 훅으로 정확한 장면을 만들어 찍음(`npm run media`)
- `tools/readme-tables.ts` + `tests/readme.test.ts` — 규칙 표 생성과 낡음 검사

#### 핵심 코드

이 README가 따른 순서와 원칙:

1. **첫 화면에 답이 있게**: 제목, 한 줄 소개, 플레이 링크, 스크린샷 네 장. 스크롤하지 않아도 "무슨 게임인지" 보입니다.
2. **차이를 숨기지 않기**: 같은 장르가 이미 있다는 사실을 먼저 말하고, 이 게임만의 규칙(대응 가능한 방해, 예고되는 보스, 공유 숫자 유물, 오늘의 시드)을 적습니다(RESEARCH.md의 포지셔닝 메모).
3. **주장마다 코드 링크**: "결정적 코어"라고 쓰면 `src/core`로, "재생 동등성 테스트"라고 쓰면 그 테스트 파일로 갑니다. 리뷰어가 의심하면 바로 확인할 수 있게.
4. **숫자는 잰 것만, 한계와 함께**: 프레임 시간 표에는 "headless 소프트웨어 래스터, 비교용"을, 밸런스 표에는 미달인 목표를 그대로 적습니다.
5. **어긋날 수 없게 생성하기**: 유물·방해·보스·스테이지 표는 손으로 쓰지 않고 게임 데이터에서 만듭니다. 숫자를 바꾸고 `npm run readme`를 잊으면 테스트가 실패합니다.

```ts
// tools/readme-tables.ts — <!-- generated:NAME --> … <!-- /generated:NAME --> 사이를 다시 씀
for (const [name, body] of Object.entries(sections())) {
  const open = `<!-- generated:${name} -->`;
  const close = `<!-- /generated:${name} -->`;
  const start = out.indexOf(open);
  const end = out.indexOf(close);
  out = `${out.slice(0, start + open.length)}\n\n${body}\n\n${out.slice(end)}`;
}
return format(out, { ...(await resolveConfig(README)), filepath: README }); // Prettier와 싸우지 않게

// tests/readme.test.ts
expect(await updatedReadme(current)).toBe(current);
```

마지막 줄의 Prettier 포맷이 중요합니다. Prettier는 표의 열 폭을 맞추므로, 생성기가 만든 표를 Prettier가 다시 고치면 `format:check`와 README 검사가 서로 싸웁니다. 생성기가 처음부터 Prettier 결과를 내면 둘 다 통과합니다.

스크린샷은 "보기 좋은 순간을 기다려 찍는" 대신 **장면을 만들어** 찍습니다: `?mode=run&stage=6&seed=31&relics=…`로 시작해 돌·얼음·저주가 모두 보일 때까지 진행, `load()`로 연쇄 콤보 보드를 만들고 시간을 멈춘 뒤 `advance(ms)`로 프레임 여섯 장. 같은 명령이면 같은 그림이 나옵니다.

#### 연습 과제

1. README의 "무엇이 다른가"를 세 줄로 줄여 보세요. 무엇을 남기고 무엇을 뺐나요?
2. `tools/readme-tables.ts`에 "무한 모드 방해 증가율" 표를 추가해 보세요(`ENDLESS_TUNING`).
3. 친구에게 README만 보여 주고 1분 뒤 "이 게임이 그냥 2048과 무엇이 다른지" 물어보세요. 대답이 README의 의도와 같나요?

---

## 9. A단계: 판타지 개편 시안 — 교체 가능한 테마와 코드로 그린 채색 필사본

게임을 네온 회로에서 **고전 판타지**("봉화 원정대", 가칭)로 바꾸기로 했습니다. 하지만 전부 다시 그리기 전에, 그 그림이 정말 마음에 드는지를 먼저 확인해야 합니다. A단계는 그 판단을 위한 **시안(수직 슬라이스)** 입니다: 규칙·저장·밸런스는 그대로 두고, `?theme=storybook`을 붙였을 때만 새 그림이 나옵니다. 기본값인 네온은 픽셀 하나 바뀌지 않았습니다(전후 스크린샷 7장이 완전히 같음).

최종 화풍은 **채색 필사본**(illuminated manuscript)입니다: 오래된 양피지 바탕, 철담즙 잉크 선, 광낸 금박, 청금석(라피스) 파랑·주홍·녹청의 안료, 금테 두른 머리글자. 판은 양피지 페이지 위의 그림 칸이고, 그 위아래에는 화면에 여유가 있을수록 커지는 **장식 띠**가 있어 종족의 아치 회랑과 동료·군대가 그곳에 나타납니다.

시안의 범위: 숫자 타일 전 단계, 바위·서리·낙인·불씨석과 봉쇄·표적 표시, 판(장식 띠 포함), HUD와 시트 한 벌, **드워프** 한 종족(문장, 동료, 결집 장면, 유물 4종의 기본·진화 그림, 유물 카드), 여정 지도 1막, 합류·결집 연출. 종족 규칙은 아직 없으므로 URL 매개변수로 흉내 냅니다(`?mockFaction=dwarf:2`).

이번 단계에서 만들거나 크게 바꾼 파일:

| 파일                                                 | 내용                                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/render/theme.ts`                                | `Theme` = 색(`Palette`) + 화가들(타일 그림, 오버레이, 판, 파티클 방식, 판 비율과 장식 띠, 고리 효과)                                      |
| `src/render/themes.ts`                               | `NEON_THEME`, `STORYBOOK_THEME` 조립, `?theme=` 해석(`parseThemeId`)                                                                      |
| `src/render/layout.ts`                               | 세로로 긴 판: `height`, `originY`, `gridExtent`. 너비로 칸 크기를 정하고 남는 높이를 위아래 띠로                                          |
| `src/render/storybook/*`                             | 필사본 테마: 안료 팔레트, 잉크 도우미, 채색 타일·바위·불씨석·서리·낙인, 페이지와 그림 칸, 띠의 풍경, 문장·유물 그림, 잉크 고리, 합류 연출 |
| `src/render/scenery.ts`                              | 판 띠가 보여 줄 종족 단계(`none`/`companion`/`rallied`)                                                                                   |
| `src/render/renderer.ts`                             | `setTheme`, `setScenery(장면, 펼침 시간)`, 띠가 있는 테마는 CSS가 준 상자 그대로(정사각형이 아니어도) 캔버스로                            |
| `src/render/spriteCache.ts`, `fx.ts`, `particles.ts` | 테마 교체 시 캐시 비우기, 글자 외곽선·잉크 섞기, 혼합 모드·스파크 그림·크기 배율을 테마에서                                               |
| `src/render/effects.ts`, `marks.ts`                  | 테두리 섬광과 줄 표시가 격자 기준(`originY`, `gridExtent`), 네온 판 화가를 `NEON_BOARD_ART`로 묶음                                        |
| `src/game/feedback.ts`                               | 하드코딩된 색을 팔레트로, 큰 합체 고리를 테마의 `ring`으로                                                                                |
| `src/game/factionMock.ts`                            | **A단계 흉내**: 유물 → 종족 표, `?mockFaction` 해석, 종족 수·단계·고비 계산, 드워프 유물의 새 이름·문장                                   |
| `src/game/factionView.ts`                            | `FactionDirector`: 띠의 풍경, 합류·결집 연출, 유물 카드 장식, HUD 이름, 여정 지도 상태                                                    |
| `src/ui/journey.ts`                                  | 여정 지도 1막(DOM + 인라인 SVG): 바다·강·언덕·숲·길·봉화대·안개·드워프 산채, 금테 가장자리, 지도 위 합류·결집 연출                        |
| `src/ui/storybookBrand.ts`                           | 메뉴 제목 블록, 코드로 그린 종이 결 텍스처                                                                                                |
| `src/ui/style.css`                                   | 색 리터럴 전부를 사용자 정의 속성으로, `html[data-theme='storybook']` 팔레트, 카르투슈·붉은 제목·머리글자, 판 상자 크기                   |
| `src/ui/screens.ts`, `gameScreen.ts`                 | 테마별 상표(`Brand`), 유물 카드 장식(`decorateOffer`), 위에 얹는 시트(`showOverlay`)                                                      |
| `src/main.ts`, `src/game/debug.ts`                   | 테마 선택과 전달, `?mockFaction`·`?journey`, 디버그 훅 `__neonRift.storybook`                                                             |
| `tests/theme.test.ts`, `tests/factionMock.test.ts`   | 테마 해석, 화가 선택, 캐시 무효화, 세로로 긴 판의 배치·칸 찾기, CSS와 배치 숫자 일치, 숫자 대비, 흉내 계산, 지도                          |

### 9.1 테마를 전략 객체로: 색이 아니라 "화가"를 바꾼다

#### 왜 필요한가

처음 `theme.ts`는 색상표였습니다. 그런데 네온의 정체성은 색보다 **모양**에 있었습니다: 칩의 잘린 모서리(`chipPath`), 회로선과 균열, 글로우(`shadowBlur`), 가산 혼합 파티클. 색만 바꾸면 "베이지색 회로 칩"이 나올 뿐입니다. 테마가 진짜로 바뀌려면 **그리는 함수 자체**를 바꿔 끼울 수 있어야 합니다. 이것이 전략(Strategy) 패턴입니다: 렌더러는 "무엇을 그릴지"(타일 종류, 표시, 이벤트)만 알고, "어떻게 그릴지"는 테마 객체가 줍니다.

#### 어디에 쓰였나

- `src/render/theme.ts` — `Theme extends Palette`에 `tileArt`(종류별 타일 화가), `overlays`(상태 오버레이), `boardArt`(배경·표시 화가), `particles`(혼합 모드·스파크 그림·모양 변형·크기), `layout`(간격·여백·모서리, 장식 띠), `ring`(큰 합체 고리, 선택)
- `src/render/themes.ts` — 네온 조각과 필사본 조각을 각각 묶은 두 객체. `theme.ts`는 화가를 import하지 않아서(타입만) 어디서 불러도 순환 import가 생기지 않습니다.
- 렌더러·스프라이트 캐시·연출 층·연출 감독은 **`Theme` 인터페이스만** 압니다. `main.ts`가 `?theme=`를 읽어 한 번 골라 넘깁니다.
- 교체 경로: `renderer.setTheme(t)` → 캐시 비우기(`sprites.setTheme`), 파티클·글자 방식 교체(`fx.applyTheme`), 판 비율이 달라지므로 `resize()`로 배치·배경 다시 계산.

#### 핵심 코드

```ts
// src/render/theme.ts
export interface Theme extends Palette {
  readonly id: ThemeId;
  readonly tileArt: Readonly<Record<TileKind, TileArt>>; // 새 TileKind는 모든 테마에 그림이 생길 때까지 컴파일 실패
  readonly overlays: readonly StatusOverlay[];
  readonly boardArt: BoardArt; // background / marksBelow / marksAbove
  readonly particles: ParticleStyle; // blend, glowSprite, bit, streak, scale
  readonly layout: LayoutStyle; // gap, padding, boardRadius, bands?
  readonly ring?: (row, col, color, start, reach) => Effect;
}

// src/render/spriteCache.ts — 캐시된 그림은 옛 테마의 것이므로 통째로 버린다
setTheme(theme: Theme): void {
  if (theme === this.themeValue) return;
  this.themeValue = theme;
  this.entries.clear();
}
```

네온이 정말 그대로인지는 눈이 아니라 **픽셀 비교**로 확인했습니다. 리팩터링 전 빌드와 후 빌드를 같은 장면(메뉴, 봉쇄자, 방해 타일 전부, 값 2~65536, 유물 선택, 일시정지)에서 찍고 `ImageChops.difference`로 비교해 7장 모두 "identical"이 나올 때까지 고쳤습니다. CSS 애니메이션이 실제 시간으로 돌아 찍을 때마다 미세하게 달라지는 문제는, 찍기 직전에 `document.getAnimations()`를 모두 끝 상태로 보내 해결했습니다.

#### 연습 과제

1. 세 번째 테마 "흑백 목판"을 만들어 보세요. 팔레트만 바꾸고 화가는 필사본 것을 재사용하면 어디까지 되고, 어디서 막히나요?
2. `Feedback`에 아직 남은 "테마가 모르는 결정"(예: 큰 합체에 `streak` 모양을 쓴다는 것)을 찾아, 테마가 그 모양을 바꿀 수 있게 하려면 무엇이 필요할지 설계해 보세요. `ring`이 그 한 예입니다.
3. `setTheme`이 왜 `resize()`를 부르는지 설명하세요. 부르지 않으면 어떤 버그가 생기나요?

### 9.2 CSS 사용자 정의 속성과 `data-theme`

#### 왜 필요한가

HUD와 시트는 DOM이라 캔버스 테마 객체가 닿지 않습니다. `style.css`에는 색 리터럴이 약 60곳 흩어져 있었습니다(`rgba(255, 179, 71, 0.55)` 같은 "주황 55%"가 여기저기). 이것들을 사용자 정의 속성(CSS 변수)으로 모으면, 테마 전환은 `<html data-theme="storybook">` 한 줄과 변수 재정의 한 블록이 됩니다.

#### 어디에 쓰였나

- `:root` — 네온 팔레트. 반투명 색은 `--amber-rgb: 255, 179, 71`처럼 **RGB 세 숫자**로 두고 `rgba(var(--amber-rgb), 0.55)`로 씁니다. 알파가 다른 수십 군데가 변수 하나를 공유합니다.
- 모양도 변수로: 잘린 모서리 `clip-path`는 `--clip-chip-sm/lg`가 되었고, 필사본은 `none`으로 둡니다.
- `html[data-theme='storybook']` — 필사본 팔레트와, 색만으로는 안 되는 차이:
  - **카르투슈**: 잉크 테두리 → 양피지 틈 → 금테 → 가는 잉크 선을 `box-shadow`의 `inset` 여러 겹(`--plate`)으로, 네 귀퉁이의 주홍 점은 `radial-gradient` 네 개(`--corners`), 서기의 붉은 괘선은 `repeating-linear-gradient`(`--ruling`).
  - **붉은 제목(rubric)**: "점수", "남은 이동" 같은 이름표는 주홍으로. 필사본에서 제목과 표지를 붉은 잉크로 쓰던 관습입니다.
  - **채색 머리글자**: 시트 제목·메뉴 제목·유물 이름의 첫 글자를 `::first-letter`로 라피스 바탕에 금 글자, 금테로. DOM을 바꾸지 않고 CSS만으로 "1막 3 클리어"의 "1"이 채색 머리글자가 됩니다.
  - 네온 글로우 제거, 시트를 금테 두 겹의 페이지 위에, 제목은 세리프.
- `main.ts`가 테마 객체의 `id`를 `document.documentElement.dataset.theme`에 씁니다. 캔버스와 DOM이 같은 값 하나로 전환됩니다.

#### 핵심 코드

```css
html[data-theme='storybook'] {
  --amber: #8a5a10; /* 글자용: 양피지 위 4.5:1 이상 */
  --amber-rgb: 212, 165, 55; /* 테두리·틴트용 금박 */
  --plate:
    inset 0 0 0 1.5px var(--parchment-light), inset 0 0 0 3.5px var(--gold),
    inset 0 0 0 4.5px rgba(42, 26, 16, 0.55), 0 1px 2px rgba(50, 30, 10, 0.25);
}
[data-theme='storybook'] .sheet-title::first-letter {
  color: var(--gold-light);
  background: linear-gradient(135deg, var(--lapis), var(--lapis-deep));
  border: 2px solid var(--gold);
}
```

한 가지 배운 점: 네온의 "주황"은 글자색과 테두리색을 겸했지만, 밝은 바탕에서는 **같은 색이 두 역할을 못 합니다**. 금박 색(`#d4a537`)은 양피지 위 글자로는 대비가 부족해 글자용 `--amber`는 더 어두운 금갈색으로 나눴습니다. 변수 이름은 같아도 테마마다 "역할"에 맞춰 다른 값을 줄 수 있는 것이 변수의 장점입니다.

#### 연습 과제

1. `prefers-color-scheme`에 따라 테마를 고르는 규칙을 써 보세요. URL 매개변수와 충돌하면 무엇이 이겨야 하나요?
2. `::first-letter`가 적용되지 않는 요소(인라인 요소)를 찾아보세요. 유물 이름의 `<strong>`에는 왜 적용될까요? (힌트: flex 항목은 블록으로 바뀝니다)
3. 필사본 테마의 `--muted`(#6a4f34)가 `--panel`(#f8ecd0) 위에서 몇 대 1인지 계산해 보세요(WCAG 상대 휘도 공식).

### 9.3 Canvas·SVG로 그리는 채색 필사본: 안료 규율, 장식 어휘, 실루엣

#### 왜 필요한가

"이미지 에셋 0" 원칙을 지키면서 손으로 칠한 필사본처럼 보여야 합니다. 코드로 그린 그림이 "금색 선을 두른 베이지"나 "클립아트"처럼 보이지 않게 하는 규칙들이 있습니다.

#### 어디에 쓰였나

- **안료 규율** — `storybook/palette.ts`의 이름 붙은 안료만 씁니다: 양피지(바탕)와 잉크(모든 외곽선), 광낸 금박(중요한 것), 라피스·주홍·녹청(색 바탕), 드물게 자주(tyrian)와 장미. 면적의 대부분은 양피지와 금이 차지하고 짙은 안료는 금테 안의 작은 칸에만 둡니다. 그래서 짙은 파랑을 많이 써도 어둡지 않고 따뜻합니다.
- **광낸 금박** — 금은 한 색이 아니라 밝은 띠가 지나가는 그라디언트입니다(`goldLeaf`: 밝음 → 몸 → 흰빛 → 몸 → 그늘). 이것 하나로 노란 선이 "금박"으로 읽힙니다. CSS에도 같은 그라디언트(`--leaf`)를 씁니다.
- **장식 어휘(직접 설계)** — 금 격자에 점을 찍은 바탕 무늬(diaper), 금 줄기에 녹청 잎과 주홍 꽃봉오리가 번갈아 달린 덩굴 여백, 라피스 칸 안의 금 네잎(quatrefoil) 귀퉁이 장식, 펜 장식 소용돌이(penwork)와 금실(filigree), 진주·보석 박이. 기존 작품의 문양을 빌리지 않고 원·곡선·마름모 같은 기본 도형으로 만들었습니다.
- **값이 클수록 화려하게, 숫자는 늘 크게** — 타일은 세 가지가 함께 올라갑니다: 바탕(양피지 → 옅은 안료 → 짙은 안료 → 금 → 보석 박이), 테(잉크 선 → 색 띠 → 금박 → 보석 박은 금박), 숫자(잉크 → 주홍·라피스 → 잉크 외곽선을 두른 **금 머리글자**). 2048은 광낸 금 바탕에 라피스 숫자, 그 위로는 금 격자 무늬가 깔린 보석 바탕입니다. 세리프 숫자는 넓어서 3~5자리는 `measureText`로 재서 줄입니다.
- **방해 요소** — 바위는 잉크 사선 음영과 이끼, 불씨석은 숯 위의 빛나는 균열, 서리는 가장자리 결정과 파란 봉인, 저주는 **낙인**: 타일 안쪽으로 향한 쇠 가시 테두리와 그 아래 그을린 주홍 선, 검은 봉인의 ½. 숫자를 덮지 않고 둘러싸서 "무언가가 찍힌 타일"로 읽힙니다(처음 시안의 그을음은 "더러움"으로 읽혀서 바꿨습니다).
- **실루엣이 먼저 읽혀야 합니다** — 드워프: 투구, 큰 수염, 낮고 넓은 몸, 어깨의 도끼. 한 가지 진한 색으로 채우면 작은 크기에서 덩어리가 되어서, **몇 가지 평면 색**(쇠 투구, 적갈색 수염, 주홍 옷) + 잉크 선으로 그립니다.
- **같은 그림, 두 출력** — 그림은 100×100 상자 안의 `Layer[]`(바닥 → 몸 → 세부 → 빛, 층마다 잉크 외곽선)이고, 캔버스(`Path2D`)와 DOM(인라인 SVG)이 같은 데이터를 그립니다.
- **에셋 없는 질감** — 캔버스는 시드 고정 난수로 점 수천 개(양피지 결), 사선(잉크 음영)을 **한 번** 그려 캐시합니다. SVG 지도는 `feTurbulence` 필터로 종이 결, 울퉁불퉁한 가장자리, 구름 같은 안개를 만듭니다.
- **비어 있는 자리는 기다리는 모습으로** — 띠의 아치 회랑에는 종족마다 하나씩 네 개의 감실(niche)이 있고, 빈 감실에는 금색 점선 방패가, 왼쪽 받침대에는 점선 인물이 있습니다. 아무 종족도 없을 때도 비어 보이지 않고, "여기에 무언가가 올 수 있다"는 것을 가르칩니다.

#### 핵심 코드

```ts
// src/render/storybook/tiles.ts — 사다리의 한 칸
(tier('lapis, gilded', '#26479c', '#172d6b', 'gold', GOLD, 'pearls', NUM_GOLD, NUM_GOLD_DEEP),
  //    이름          바탕 밝은쪽  바탕 어두운쪽  테   테 색  장식      숫자색    숫자 그라디언트 끝

  // 금 머리글자: 잉크 외곽선을 먼저, 위에서 아래로 짙어지는 금
  (ctx.lineWidth = Math.max(2, fontPx * 0.15)));
ctx.strokeStyle = INK;
ctx.strokeText(label, cx, ty);
const g = ctx.createLinearGradient(cx, ty - fontPx / 2, cx, ty + fontPx / 2);
g.addColorStop(0, m.text);
g.addColorStop(1, m.textDeep);
ctx.fillStyle = g;
ctx.fillText(label, cx, ty);
```

#### 연습 과제

1. `DWARF_FIGURE`에서 수염 층만 빼고 24px로 그려 보세요. 무엇으로 보이나요? 실루엣에서 가장 중요한 한 부분은 무엇이었나요?
2. 엘프 문장을 `crest('elf')`의 자리표시 대신 직접 설계해 보세요. 조건: 기존 작품의 상징을 쓰지 않을 것, 18px에서도 드워프 문장과 구별될 것.
3. `goldLeaf`의 흰빛 띠(0.5 위치의 `#fff0b8`)를 빼면 금테가 어떻게 보이나요? 같은 실험을 CSS `--leaf`로도 해 보세요.

### 9.4 적응형 장식 띠: 정사각형이 아닌 판

#### 왜 필요한가

종족 그림은 작으면 매력이 없습니다. 처음 시안은 정사각형 판 안의 얇은 테두리(약 20px)에 그렸는데, 그만큼 타일이 네온보다 15% 작아졌고 그림은 여전히 작았습니다. 한편 대부분의 휴대폰에서는 판 위아래에 쓰이지 않는 높이가 있습니다. 그래서 **판을 세로로 늘려** 그 높이를 위아래 장식 띠로 씁니다. 어려운 점은 화면마다 남는 높이가 다르다는 것입니다: 320×568의 보스 스테이지(보스 칸 + 사용 유물 줄)는 거의 남지 않고, 390×844는 100px 가까이 남습니다.

#### 어디에 쓰였나

- **칸 크기는 너비에서**: 띠가 있는 테마는 옆 여백을 0.3칸으로 줄이고(풍경이 위아래로 갔으므로), 너비 = 4칸 + 간격 3개 + 여백 2개 = 4.87칸에서 칸 크기를 정합니다. 높이는 4.27칸 + 위아래 띠(각 0.56~1.35칸)입니다.
- **CSS가 상자를 정한다**(D14 그대로): `.board`의 크기를 컨테이너 단위(`cqw`, `cqh`)로 계산합니다. 칸 = `min(너비 / 4.87, 높이 / 5.39)`, 상자 너비 = 칸 × 4.87, 높이 = `min(가용 높이, 칸 × 6.97)`. 높이가 넉넉하면 띠가 최대까지 자라고, 빠듯하면 띠가 최소로 줄고, 그래도 모자랄 때만 칸이 작아집니다. 그래서 **타일은 처음 시안(정사각형 + 넓은 테두리)보다 절대 작지 않고**, 여유가 있으면 최대 11% 커집니다(4.87 대 5.39).
- **렌더러는 받은 상자를 그대로**: 띠가 있는 테마는 `clientWidth × clientHeight`를 캔버스로 씁니다(네온은 예전처럼 가장 큰 정사각형). `computeLayout(너비, 4, 비율, 높이)`가 `originY`(첫 행의 y)를 돌려주고, `cellOrigin`·`cellAtPoint`·`lineRect`·테두리 섬광·합류 연출이 모두 `padding` 대신 `originY`·`gridExtent`를 씁니다. 칸 찾기(탭)는 x·y 비율이 같으므로 그대로 맞습니다.
- **숫자는 두 곳에, 테스트가 하나로**: CSS의 `--board-w/h-min/h-max`와 `STORYBOOK_LAYOUT`은 같은 숫자여야 합니다. 테스트가 `style.css`를 읽어 비교합니다.
- **중간에 흔들리지 않게**: 판 영역의 높이가 바뀌는 것은 보스 칸·사용 유물 줄이 생길 때인데, 둘 다 스테이지가 시작될 때만 바뀝니다. 그래서 띠의 크기도 스테이지 시작 때 정해지고 스테이지 중에는 그대로입니다(예외: 여러 줄짜리 안내문이 나타나면 아래 유물 칸이 커져 띠가 조금 줄 수 있습니다. 이때도 타일은 줄지 않고 띠만 줄어듭니다).

#### 핵심 코드

```ts
// src/render/layout.ts — 띠가 있는 테마
const cell = Math.min(size / (span + 2 * style.padding), height / (span + 2 * bands.min));
const grid = span * cell;
const spare = Math.max(0, height - grid);
return { size, height, padding: (size - grid) / 2, originY: spare * bands.topShare /* … */ };
```

```css
[data-theme='storybook'] .board {
  --board-cell: min(100cqw / var(--board-w), 100cqh / var(--board-h-min));
  width: calc(var(--board-cell) * var(--board-w));
  height: min(100cqh, calc(var(--board-cell) * var(--board-h-max)));
}
```

**잰 값**(bands 시트, 드워프 결집): 320×568 일반 스테이지 칸 59px·띠 63px, 320×568 보스+사용 유물 칸 42px·띠 24px(최소, 처음 시안과 같은 칸), 360×640 일반 67px·81px, 390×844 보스 74px·99px, 가로 844×390 66px·37px, 태블릿 768×1024 107px·125px. 모든 경우에 판이 판 영역 안에 있고 페이지 스크롤은 0이었습니다.

#### 연습 과제

1. `bands.topShare`를 0.6으로 바꾸면 무엇이 좋아지고 무엇이 나빠지나요? 위 회랑과 아래 인물 중 무엇이 더 공간을 원하나요?
2. 스테이지 중에 안내문이 나타나 띠가 줄 때 판을 "얼려" 두려면 무엇이 필요할까요? CSS에 맡긴 크기 결정(D14)과 어떻게 충돌하나요?
3. 네온 테마에도 띠를 주면(같은 `bands`) 무엇이 깨지는지 찾아보세요. 네온 배경 화가가 무엇을 정사각형이라고 가정하고 있나요?

### 9.5 밝은 바탕과 어두운 바탕의 연출: 가산 혼합 vs 일반 혼합

#### 왜 필요한가

네온의 파티클은 `globalCompositeOperation = 'lighter'`(가산 혼합)로 그립니다. 빛은 더해지므로 겹칠수록 하얗게 타오르고, 어두운 바탕에서 아주 잘 보입니다. 그런데 양피지처럼 이미 밝은 바탕에 빛을 더하면 **거의 흰색으로 날아가 사라집니다**. `shadowBlur` 후광도 밝은 바탕에서는 뿌연 얼룩이 됩니다. 밝은 그림에서 효과는 빛이 아니라 **금박과 잉크**여야 합니다.

#### 어디에 쓰였나

- `ParticleStyle.blend`: 네온 `lighter`, 필사본 `source-over`(일반 혼합)
- 같은 모양 이름, 다른 그림: `spark` → **금박의 반짝임**(따뜻한 심에 가는 빛살 네 개), `bit` → 돌며 반짝이는 금가루(`fleck`), `streak` → 머리가 둥글고 꼬리가 가는 잉크 튐(`tapered`). `scale: 1.6` — 빛 없이 면적으로만 읽혀야 하므로 더 크게.
- **잉크 고리**(`storybook/inkRing.ts`, 테마의 `ring`): 64 이상 합체의 고리가 퍼지며 가늘어지는 잉크 원 + 안쪽 금선 + 바깥으로 튀는 잉크 방울이 됩니다. 라피스 판 위에서도 양피지 위에서도 읽힙니다.
- 떠오르는 점수 글자: 네온은 어두운 외곽선 + 밝은 글자, 필사본은 **양피지색 외곽선 + 잉크 쪽으로 섞은 글자**(`textInk: 0.45`).
- 합류·결집 연출(`storybook/moment.ts`): 양피지 리본이 격자 가운데에서 펼쳐지고 문장이 위에서 찍히며(오버슈트 이징), 결집이면 금빛 살이 돕니다. 띠의 새 풍경은 렌더러가 **이전 배경을 위에서 아래로 닦아 내며** 드러냅니다(`setScenery(장면, 900)`). 움직임 줄이기에서는 닦기·도장 크기 변화 없이 결과만 보입니다.

#### 핵심 코드

```ts
// src/render/particles.ts — 물리는 그대로, 그리는 방식만 테마가
ctx.globalCompositeOperation = style.blend;
const s = (this.size[i] ?? 1) * style.scale;

// src/game/feedback.ts — 고리는 테마가 고를 수 있다
const custom = renderer.currentTheme.ring;
renderer.addEffect(
  custom ? custom(row, col, color, now, reach) : new RingPulse(row, col, color, now, 420, reach),
);
```

**측정** (7.11장과 같은 최악의 턴, 390×844 DPR 3, headless Chromium 소프트웨어 래스터, 움직이는 동안의 프레임 간격 ms, 10회. 같은 시간대에 세 빌드를 연달아 잼):

| 4× CPU 스로틀                     | 평균 / p95 / 최악  | 렌더러 tick 평균 / 최악 |
| --------------------------------- | ------------------ | ----------------------- |
| 네온, A단계 전                    | 25.2 / 33.4 / 66.7 | 1.68 / 14.4             |
| 네온, A단계 후                    | 25.3 / 33.4 / 66.7 | 1.83 / 14.4             |
| 필사본(드워프 결집, 세로로 긴 판) | 28.4 / 33.4 / 66.7 | 2.24 / 27.6             |

1× 에서는 셋 다 16.7ms(60fps)입니다. 필사본은 4×에서 평균 약 12% 느립니다. 판이 세로로 길어 매 프레임 복사하는 배경 화소가 약 40% 많고, 잉크 고리·반짝임·사슬·서리·낙인 오버레이가 매 프레임 경로를 그리기 때문으로 봅니다(따로 떼어 재지는 않았습니다). 배경(양피지·덩굴·회랑·인물)과 타일은 크기·테마·풍경이 바뀔 때만 한 번 그리는 캐시라 매 프레임 비용에 들어가지 않습니다. 이 기계의 측정값은 날마다 흔들려서(같은 네온 빌드가 다른 날 22.1ms) 같은 시간대의 비교만 의미가 있습니다. 실기기 측정은 아직입니다.

번들 크기(빌드 결과): JS 134.0 → 198.2 kB(gzip 46.0 → 68.8 kB), CSS 18.2 → 34.6 kB(gzip 4.6 → 7.8 kB). 필사본 테마가 네온 사용자에게도 함께 내려갑니다. 네온을 남긴다면 D단계에서 테마를 동적 `import()`로 나누는 것이 맞습니다.

#### 연습 과제

1. 필사본 테마의 `blend`를 `lighter`로 바꿔 큰 합체 프레임을 찍어 보세요. 금빛 반짝임이 라피스 판 위와 양피지 위에서 각각 어떻게 보이나요?
2. `InkRing`의 잉크 방울 위치는 난수가 아니라 행·열에서 계산합니다. 왜 그렇게 했을까요? (힌트: 7.12장의 밀착 인화)
3. 리본 연출이 격자 가운데를 가리는 2초 동안 플레이어가 스와이프하면 어떻게 되나요? 입력을 막아야 할까요, 연출을 짧게 해야 할까요? (힌트: D12)

### 9.6 시안(수직 슬라이스)과 미술 방향 반복

#### 왜 필요한가

화풍을 바꾸는 것은 비싼 결정입니다: 네 종족, 유물 16종 × 2, 보스 3, 지도 3막, 화면 전부. 다 만든 뒤에 "생각한 느낌이 아니다"가 나오면 대부분을 버려야 합니다. 그래서 **가장 어려운 조각들을 한 줄로 관통하는 작은 완성품**을 먼저 만듭니다: 실제 게임이 돌아가는 판(가장 오래 보는 화면), 한 종족 끝까지(문장 → 동료 → 결집 → 유물 진화 → 카드 → 지도), 가장 감정적인 순간(합류·결집).

#### 어디에 쓰였나

- **실제 게임 위에 흉내를 얹기**: `src/game/factionMock.ts`가 "가진 유물 + URL로 준 가짜 보유 수"로 종족 단계를 계산합니다. 흉내가 한 파일에 갇혀 있어 B단계는 `RACE_OF`를 `RelicDef.race`로, 가짜 보유 수를 지우는 것으로 끝납니다. 그 위의 `FactionDirector`(표현 계층)는 그대로 남습니다. 실제 런에서도 드워프 유물을 두 개 고르면 합류 연출이 나옵니다.
- **증명 시트**: 사람이 판단하도록 같은 조건의 스크린샷을 나란히 놓습니다. 고정 시드 + `load()`로 정확한 판, 디버그 시계로 정확한 시각(`advance(ms)`). CSS 애니메이션(시트의 페이드인)도 같은 걸음으로 맞춥니다: 새로 생긴 애니메이션마다 처음 본 시각을 기억하고 `currentTime = t - 처음 본 시각`으로 멈춰 둡니다. 그래야 유물 선택 시트가 실제처럼 650ms 뒤에 나타나고, 프레임 띠 중간에 엉뚱하게 끼어들지 않습니다.
- **미술 방향을 시안으로 반복하기**: 첫 시안(밝은 그림책 지도, 호두나무 판)을 보고 주인은 방향은 좋지만 "더 풍부하게, 종족 그림은 더 크게"를 원했고, 제안했던 대안 중 **채색 필사본**을 골랐습니다. 이 전환은 **화가와 CSS 변수만 다시 칠하는 일**이었습니다: 테마 객체·흉내·연출 감독·지도 구조·테스트 대부분은 그대로였고, 종족 그림을 키우기 위한 판 배치(9.4)만 새로 들어갔습니다. 시안에서 배관(theme, scenery, mock)을 먼저 깨끗이 해 둔 덕분입니다. 반복할 때의 요령:
  1. 같은 장면, 같은 시트로 전후를 비교합니다(무엇이 나아졌는지 말로가 아니라 그림으로).
  2. "읽힘"은 테스트로 고정합니다(숫자 대비 4.5:1 — 보석 단계가 실제로 걸렸습니다).
  3. 판단 기준을 미리 적어 둡니다: 필사본으로 읽히는가, "금색 선을 두른 베이지"인가? 장식이 작은 화면을 풍부하게 하는가, 어지럽히는가? 인물이 휴대폰 크기에서 정말 귀여운가?
  4. 고친 것을 남깁니다: 드워프 덩어리 → 평면 색, 군대 울타리 → 적게·크게, 그을음 "더러움" → 낙인, 결집 메달이 감실을 가림 → 빼고 깃대 든 군대로, 좁은 여백의 깃발 → 아래 띠의 군기로, 아무것도 없는 띠 → 기다리는 감실과 받침대.

#### 핵심 코드

```ts
// tests/theme.test.ts — "읽힌다"를 숫자로 고정: 숫자의 양 끝 색이 바탕의 양 끝에서 모두 4.5:1 이상
for (const m of [
  ...MATERIALS,
  materialFor(4096),
  materialFor(8192),
  materialFor(16384),
  materialFor(32768),
]) {
  for (const text of [m.text, m.textDeep]) {
    expect(contrast(text, m.light), m.name).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, m.shade), m.name).toBeGreaterThanOrEqual(4.5);
  }
}
```

솔직한 한계: 코드로 그린 일러스트는 표정·붓 자국에서 손그림을 이기지 못합니다. 그래서 얼굴 없는 실루엣과 문장, 평면 색 + 잉크 선 + 금박이라는 "인쇄된 필사본" 쪽으로 방향을 잡았습니다. 또 이 컨테이너에는 한국어 명조 글꼴이 없어서 시트의 한국어 제목은 고딕으로 찍혔습니다(iOS·안드로이드에서는 `AppleMyungjo`·`Noto Serif CJK`가 있으면 명조로 나옵니다).

#### 연습 과제

1. 시안의 범위를 다시 정한다면 무엇을 빼고 무엇을 넣겠어요? "이것이 좋으면 나머지도 좋다"를 가장 잘 보여 주는 조각은 무엇인가요?
2. `?theme=storybook&mockFaction=dwarf:1&mode=run&relics=pickaxe`로 시작해서 실제 플레이로 합류 연출을 띄워 보세요. 1-1 클리어 후 드워프 유물이 안 나오면 어떻게 하나요?
3. 증명 시트를 회귀 검사로 바꾸려면 무엇이 필요할까요? 픽셀 비교가 OS·글꼴마다 흔들리는 문제(D78)를 어떻게 다루겠어요?

---

## 10. 마무리: 전체 지도, 읽는 순서, 확장 과제

### 10.1 개념 지도: 무엇이 어디에 있나

| 개념                             | 주요 파일                                                              | 장            |
| -------------------------------- | ---------------------------------------------------------------------- | ------------- |
| 시드 고정 난수, 재현성           | `src/core/rng.ts`, `src/game/daily.ts`                                 | 2.1, 6.4      |
| 순수 함수, 불변 상태             | `src/core/board.ts`, `src/core/run.ts`                                 | 2.2, 2.3      |
| 이벤트·단계 기반 턴 결과         | `src/core/types.ts`, `src/core/turn.ts`                                | 2.4, 4.1      |
| 데이터 주도 규칙(방해·보스·유물) | `src/core/hazards.ts`, `bosses.ts`, `relics.ts`, `balance.ts`          | 4.2~4.6       |
| 상태 기계(런, 화면)              | `src/core/run.ts`, `src/game/runController.ts`                         | 4.3, 5.1      |
| 게임 루프, 트윈, 뷰 모델         | `src/render/loop.ts`, `tween.ts`, `viewModel.ts`                       | 3.1~3.3       |
| Canvas, DPR, 스프라이트 캐시     | `src/render/renderer.ts`, `spriteCache.ts`, `tilePainter.ts`           | 3.4, 3.8      |
| 입력(스와이프·키보드·탭)         | `src/input/*`                                                          | 3.5, 3.6      |
| 프레젠터와 DOM UI                | `src/game/runView.ts`, `src/ui/*`                                      | 5.2, 5.3      |
| 주입 가능한 시계, 디버그 훅      | `src/render/clock.ts`, `src/game/debug.ts`                             | 3.9           |
| 저장·검증·마이그레이션           | `src/save/*`                                                           | 6.1, 6.2      |
| 온보딩                           | `src/game/runView.ts`(`LESSONS`), `runController.ts`                   | 6.3           |
| Juice: 파티클·흔들림·히트스톱    | `src/game/feedback.ts`, `src/render/particles.ts`, `shake.ts`, `fx.ts` | 7.1~7.5       |
| 소리 합성, 진동                  | `src/audio/*`, `src/input/haptics.ts`                                  | 7.6~7.9       |
| 접근성(움직임 줄이기), 성능 예산 | `src/save/store.ts`(`motionReduced`), `src/render/budget.ts`           | 7.10, 7.11    |
| 시뮬레이션 밸런스                | `tools/simulate.ts`, `src/core/balance.ts`                             | 4.7, 6.5, 8.6 |
| PWA                              | `public/manifest.webmanifest`, `src/pwa/*`, `tools/vite-precache.ts`   | 8.1~8.3       |
| CI/CD                            | `.github/workflows/*`                                                  | 8.4           |
| 테스트 전략(단위·e2e·생성 문서)  | `tests/*`, `e2e/*`, `tools/readme-tables.ts`                           | 2.5, 8.5, 8.7 |
| 교체 가능한 테마(색 + 화가)      | `src/render/theme.ts`, `themes.ts`, `src/ui/style.css`(`data-theme`)   | 9.1, 9.2      |
| 코드로 그린 일러스트·지도        | `src/render/storybook/*`, `src/ui/journey.ts`                          | 9.3, 9.5      |
| 정사각형이 아닌 판(적응형 띠)    | `src/render/layout.ts`, `src/ui/style.css`(`--board-*`)                | 9.4           |
| 시안과 흉내(mock) 경계           | `src/game/factionMock.ts`, `factionView.ts`                            | 9.6           |

### 10.2 코드 읽는 순서

처음부터 끝까지 읽기보다, 한 턴이 흐르는 길을 따라 읽는 것을 권합니다. 각 단계에서 테스트 파일을 같이 열면 "이 함수가 무엇을 약속하는지"가 먼저 보입니다.

1. **`src/core/types.ts` → `rng.ts` → `board.ts`** (+ `tests/board.test.ts`): 그냥 2048. 상태와 이벤트의 모양을 익힙니다.
2. **`src/core/turn.ts` → `hazards.ts` → `bosses.ts`** (+ `tests/hazards.test.ts`, `bosses.test.ts`): 한 턴이 단계로 나뉘는 방식.
3. **`src/core/relics.ts` → `balance.ts` → `run.ts`** (+ `tests/relics.test.ts`, `run.test.ts`): 훅과 런 상태 기계. 여기까지가 "게임 규칙 전부"입니다.
4. **`tools/simulate.ts`**: 코어만으로 게임을 돌리는 법. `npm run sim -- --runs 50 --bots corner`를 실행해 보세요.
5. **`src/render/clock.ts` → `tween.ts` → `viewModel.ts`** (+ `tests/viewModel.test.ts`): 이벤트가 애니메이션이 되는 곳. DOM 없이 테스트됩니다.
6. **`src/render/renderer.ts` → `spriteCache.ts` → `tilePainter.ts`**: 실제로 그리는 곳.
7. **`src/game/runController.ts` → `runView.ts`** (+ `tests/runController.test.ts`): 화면 상태 기계와 한국어 문구.
8. **`src/main.ts`**: 모든 부품이 조립되는 곳. 여기서 `BoardDisplay`/`UiDisplay`를 감싸 연출을 끼우는 방식을 보세요.
9. **`src/game/feedback.ts` → `src/render/fx.ts` → `particles.ts` → `src/audio/engine.ts`**: 손맛.
10. **`src/render/theme.ts` → `themes.ts` → `storybook/index.ts` → `storybook/tiles.ts`**: 같은 게임을 다른 그림으로. 마지막에 `src/game/factionMock.ts`로 흉내가 어디까지인지 확인하세요.
11. **`src/save/*` → `src/pwa/*` → `e2e/run.spec.ts`**: 오래 살아남는 앱을 위한 바깥 층.

### 10.3 확장 과제

난이도 순입니다. 각 과제에 "어디를 고치면 되는지"와 "어떻게 확인하는지"를 적었습니다.

1. **새 유물 하나**: "구석이 비어 있으면 다음 생성이 구석에" 같은 유물을 `relics.ts`의 `DEFS`에 추가하세요. 설명 한 줄, 공통 숫자·키워드만, `isUseful` 조건. 확인: `tests/relics.test.ts`의 설계 규칙 테스트, `npm run sim`의 유물 효과 표, `npm run readme`.
2. **새 방해 타일**: "자석"(인접한 같은 수를 끌어당김). `hazards.ts`의 매개변수 + `turn.ts`의 단계 + `tilePainter.ts`의 오버레이. 확인: `replayPhases` 인과 검사가 새 이벤트도 통과하는지.
3. **시드 공유 링크**: 결과 화면에 `?seed=` 링크 복사 버튼. 오늘의 도전과 같은 시드 경로를 씁니다(`daily.ts`). 확인: e2e로 링크를 열어 같은 첫 보드가 나오는지.
4. **유물 도감**: 지금까지 본 유물을 저장(`save/store.ts`에 필드 추가 → 스키마 버전 올리기 → 마이그레이션 테스트)하고 메뉴에서 보여 주기. 6.1장의 마이그레이션을 직접 써 보는 과제입니다.
5. **네 번째 보스**: 예를 들어 "6턴마다 가장 작은 타일 둘을 맞바꿈". `bosses.ts`에 정의와 미리보기(`bossPreview`)를 넣고, "계산할 수 있는 정보는 보여 준다" 원칙에 맞게 HUD에 다음 대상을 표시하세요.
6. **사람 플레이 기록으로 밸런스 보기**: 런이 끝날 때 (시드, 고른 유물, 스테이지별 이동 수)를 로컬에 남기고, 봇 표와 나란히 비교하는 도구를 `tools/`에 만드세요.
7. **실기기 성능 측정**: 디버그 훅의 `frameStats()`를 실제 휴대폰에서 읽어 7.11장의 표에 한 열을 추가하세요(원격 디버깅: 안드로이드 크롬 `chrome://inspect`).
8. **5×5 보드 변형**: `DEFAULT_RULES.boardSize`를 바꾸면 어디가 깨지는지 찾아보세요. 레이아웃·스프라이트 캐시·밸런스가 각각 무엇을 가정하고 있었나요?

---

## 11. 설계 결정 기록

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
- **결과(3a단계)**: 얼음은 `slide` 안에서 줄을 나누는 "고정점"으로 처리했고, 고정된 타일에 같은 수가 밀려 들어오면 합체됩니다(D23).

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
- **대가**: 보드 모서리 둥글기처럼 캔버스와 CSS가 같은 값을 알아야 하는 곳이 생깁니다(테마의 `layout.boardRadius` ↔ `.board { border-radius: 5% }`). 색상도 `theme.ts`와 `style.css`에 나뉘어 있어 함께 고쳐야 합니다(A단계부터는 테마 `id` 하나가 둘을 함께 전환합니다, D84).

### D15. 타일 그리기는 종류별 등록표 + 상태 오버레이 목록

- **왜**: 3단계의 돌/와일드 타일, 얼음/저주 표시를 렌더러 수정 없이 함수 등록으로 추가하기 위해서입니다. `Record<TileKind, TilePainter>`라서 종류를 추가하고 painter를 빠뜨리면 컴파일 오류가 납니다.
- **결과(3a단계)**: `merge` 이벤트에 `kind`와 `cursed`를 넣었고, 상태가 바뀌는 `statusChange` 이벤트를 정의했습니다. 돌·프리즘 그림과 얼음·저주 오버레이를 이 등록표에 추가했을 뿐 렌더러 본체는 고치지 않았습니다.

### D16. 스와이프는 화면 전체에서, 임계값을 넘는 순간 발동

- **왜**: 작은 휴대폰에서 보드 밖을 밀어도 동작해야 편합니다. 손가락을 뗄 때까지 기다리지 않으면 반응이 한 박자 빨라집니다. 버튼 위에서 시작한 포인터는 스와이프로 보지 않아 탭과 충돌하지 않습니다.
- **대가**: 나중에 보드 밖에 드래그가 필요한 UI(예: 유물 카드 끌기)가 생기면 `data-no-swipe` 속성으로 제외해야 합니다.

### D17. 키보드는 `event.code` 기준, 자동 반복 무시

- **왜**: 한글 입력 상태에서도 WASD가 동작하게(`key`는 'ㅈ', `code`는 'KeyW'). 키를 누르고 있을 때 여러 칸 밀리는 실수를 막습니다.
- **대가**: AZERTY 같은 다른 자판에서는 WASD 위치의 물리 키(ZQSD)가 매핑됩니다. 이 경우엔 오히려 바람직한 동작입니다.

### D18. 최고 기록은 아직 메모리에만

- **왜**: 저장은 4단계 범위입니다. 컨트롤러에 `initialBest`와 `onBestChange`를 미리 열어 두어, 4단계에서는 저장 모듈을 연결하기만 하면 됩니다.
- **대가**: 지금은 새로고침하면 최고 기록이 사라집니다. 3b단계에서도 같습니다(D46: `initialRecords`/`onRecordsChange`).
- **4단계**: 이제 기록·본 안내·설정·진행 중인 런은 `SaveStore`로 저장됩니다(D50).

### D19. 글로우는 타일 모습별로 미리 그려 캐시 (`TileSpriteCache`)

- **왜**: `shadowBlur`는 저가형 휴대폰에서 프레임을 떨어뜨릴 가능성이 가장 큰 연산이고, 5단계 파티클이 더해지면 여유가 더 줄어듭니다. 모습(종류·값·강조)이 같으면 결과도 같으므로 한 번만 그리고 `drawImage`로 복사합니다.
- **대가**: 메모리(DPR 3에서 이미지당 수백 KB, 상한 64개)와 무효화 규칙(크기·DPR 변경 시 비우기)을 관리해야 합니다. 상태 오버레이는 아직 매 프레임 그립니다. 팝 중 확대는 비트맵 확대라 아주 약간 부드러워집니다.

### D20. 시간과 프레임 예약은 주입한다 (`FrameClock`)

- **왜**: 렌더러·루프가 `performance.now()`/`requestAnimationFrame`을 직접 부르지 않으면, 테스트와 디버그 도구가 시간을 정확히 한 프레임씩 진행시킬 수 있습니다. 애니메이션 검증이 "기다려 보고 대충 확인"에서 "이 시각엔 정확히 이 값"이 됩니다.
- **대가**: 생성자 인자가 하나 늘고, `PausableClock`처럼 실제 시계와 수동 시계를 오가는 코드가 필요합니다. `ResizeObserver`와 `devicePixelRatio`는 아직 직접 씁니다(시간과 무관해서).

### D21. 디버그 훅은 `?debug`일 때만, 시드는 `?seed=`로

- **왜**: 자동 브라우저 검사를 결정적으로 만들고(고정 시드 + 정확한 기대 보드 + 멈춘 시계), 개발 중 버그 재현을 쉽게 하기 위해서입니다. 플래그가 없으면 `window`에 아무것도 붙지 않습니다.
- **대가**: 디버그 API(`state`, `grid`, `move`, `advance`, `settle` …)도 공개 계약이 되므로 바꿀 때 검사 스크립트를 함께 고쳐야 합니다. `?seed=`는 첫 판에만 적용되고 "새 게임"은 무작위 시드를 씁니다.

### D22. 한 턴의 결과를 단계(phase)로 나누고, 경계는 코어가 정한다

- **왜**: 돌 파괴, 연쇄 합체, 보스, 방해 생성처럼 "앞의 일이 원인인 일"이 한 턴 안에 생겼습니다. 인과를 아는 곳은 코어뿐이라 렌더러가 순서를 추측하게 두면 안 됩니다. `TurnResult.phases`(단계 목록)와 `events`(이어 붙인 목록)를 함께 주어, 단계를 모르는 쪽(HUD 점수 합산 등)은 예전처럼 `events`만 봐도 됩니다.
- **대가**: 렌더러가 단계마다 시작 시각을 계산해야 하고, 한 타일이 한 턴에 여러 번 움직일 수 있어 트윈을 "트랙"으로 바꿨습니다. 단계 종류는 6개로 고정했습니다. 새 규칙이 기존 단계에 맞지 않으면 종류를 늘려야 합니다.

### D23. 얼음 타일에도 합체할 수 있다 (얼음이 깨진다)

- **왜**: 얼음이 순수한 벽이면 4×4에서 너무 답답하고, 플레이어가 할 수 있는 일이 "기다리기"뿐입니다. 같은 수를 밀어 넣어 얼음을 깨는 선택지가 있으면 얼음은 퍼즐이 됩니다. 구현도 "얼음 타일을 구간의 첫 자리에 미리 놓기"로 끝나 원래 합체 규칙을 그대로 씁니다.
- **규칙**: 얼어 있는 타일은 움직이지 않고(다른 타일로 밀려 들어가지도 않음), 뒤에서 온 같은 수만 받아 합칩니다. 결과는 새 타일이라 얼어 있지 않습니다. 얼음 남은 턴은 "그 턴의 미끄러짐 때 이미 얼어 있던 타일"만 턴 끝에 1씩 줄어듭니다. 그래서 `iceTurns: 3`은 정확히 "다음 3번의 이동 동안 고정"입니다.
- **대가**: 얼음 위에 합체하면 그 칸에 결과가 생기므로 구석 전략을 쓰는 플레이어에게는 얼음이 오히려 기회가 될 때가 있습니다. 난이도는 얼음 빈도로 조절합니다.

### D24. 봉쇄된 줄은 벽이다: 드나들기·합체 불가, 새 타일도 안 나옴. 봉쇄만으로 막히면 즉시 풀린다

- **왜**: "봉쇄된 줄의 타일은 움직이지 않는다"를 가장 단순하게 지키는 방법이 벽입니다. 빈 봉쇄 칸에 타일이 들어갈 수 있으면 갇힌 타일이 생겨 오히려 헷갈립니다. 봉쇄 때문에만 움직일 수 없는 보드는 턴이 흐르지 않아 봉쇄가 영원히 안 풀리므로, 이런 판은 실패가 아니라 봉쇄 해제로 처리합니다.
- **대가**: 봉쇄 해제가 "행동 직후 판정"에서 일어나므로 해제 이벤트(`lineUnlock`)가 `end` 단계 끝(또는 사용 유물 직후)에 붙습니다. 화면은 이 이벤트를 따로 알아볼 필요가 없습니다.

### D25. 스테이지마다 보드를 새로 시작한다 (유물과 누적 점수만 이어짐)

- **왜**: 보드가 이어지면 1막에서 만든 큰 타일이 2막의 "128 만들기"를 공짜로 채우거나, 막힌 보드가 다음 스테이지를 시작부터 망칩니다. 목표를 "이 이동 수 안에 이것"으로 설계하려면 출발점이 일정해야 합니다. 이어지는 성장은 유물(빌드)이 맡습니다. 시뮬레이터 표의 "스테이지 단독" 숫자가 의미를 갖는 것도 이 덕분입니다.
- **대가**: "한 판을 길게 키워 가는" 2048 본래의 맛은 무한 모드가 맡습니다. 런 점수는 스테이지 점수의 합(`bankedScore + board.score`)입니다.

### D26. 저주: 결과 절반(최소 2), 한 번 쓰이면 사라짐, 둘 다 저주여도 한 번만 절반

- **왜**: 절반이면 "합쳤는데 합치기 전과 같은 값"이 되어 의미가 직관적입니다(8+8 → 8). 결과 타일은 새 타일이라 저주가 자동으로 사라집니다. 점수도 절반 값 기준이라 점수 목표에서도 손해가 보입니다.
- **대가**: 저주는 "타일 하나를 버리는" 효과와 비슷해서, 보드가 꽉 찬 상황에서는 오히려 도움이 될 때가 있습니다. 이건 기능으로 봅니다.

### D27. 돌은 합체 결과 칸의 상하좌우 이웃만 본다, 한 턴에 같은 돌은 한 번만

- **왜**: "합체가 일어난 곳"을 결과 칸 하나로 정의하면 판정이 명확하고 화면으로 설명하기 쉽습니다. 대각선은 유물(균열 송곳)의 몫으로 남겨 두어 유물이 바꿀 "공통 숫자"를 만들었습니다.
- **대가**: 미끄러지는 동안 지나간 칸은 세지 않습니다. 플레이어가 "지나가면서 부서질 것"이라고 기대할 수 있어, 3b단계에서 돌의 규칙 안내가 필요합니다.
- **결과(3b단계)**: 돌이 처음 나오는 1막 2에서 "바로 옆에서 합체가 일어나면 부서진다"는 한 줄 안내를 띄웁니다(D45).

### D28. 유물 훅은 데이터를 돌려주고, 효과는 엔진이 적용한다. 유물 상태는 `{ id, charges, counter }` 하나로

- **왜**: 훅이 상태를 직접 바꾸면 순서·불변성·저장이 모두 유물 작성자의 책임이 됩니다. 효과 목록을 돌려받아 엔진이 적용하면 모든 발동에 `trigger` 이벤트가 자동으로 붙고, 유물은 테스트하기 쉬운 순수 함수가 됩니다. 공통 상태 형식은 저장 형식을 유물 종류와 무관하게 만듭니다.
- **대가**: 효과 종류(`score`, `bonusMoves`, `charge`, `placeTile`, `spawnPrism`)가 정해져 있어, 새로운 종류의 효과는 엔진에 한 번 추가해야 합니다. 카운터가 하나뿐이라 두 가지를 세야 하는 유물은 설계를 바꿔야 합니다(지금은 없음).

### D29. 유물 제시는 키워드로 거른다 ("죽은 선택지" 금지). "정화"는 "역상 필터"로 재설계

- **왜**: 남은 스테이지에 저주·얼음이 없는데 그걸 다루는 유물이 나오면 3택 1이 2택 1이 됩니다. 판단은 이름이 아닌 키워드(남은 스테이지의 방해·보스·목표 종류 + 가진 유물이 주는 키워드)로 해서, 유물끼리 서로 몰라도 됩니다. 순수 무효화 유물은 손맛이 없어서, 같은 키워드를 기회로 바꾸는 유물로 고쳤습니다.
- **대가**: 3개를 채울 만큼 쓸 만한 유물이 없으면 제시가 3개보다 적을 수 있습니다(0개도 가능). 그래서 `chooseRelic(run, null)`로 "고르지 않고 진행"을 허용합니다.

### D30. 사용 유물의 충전: 얻을 때 0, 스테이지가 시작할 때마다 회복. 무한 모드에서는 유물을 고르는 순간이 "스테이지 시작"

- **왜**: "스테이지마다 1회"를 한 규칙(`rechargePerStage`)으로 표현하고, 얻자마자 다음 스테이지 시작에서 채워지므로 사실상 바로 쓸 수 있습니다. 무한 모드에는 스테이지가 없어서, 유물 선택이 `onStageStart` 훅(충전, 점화 플러그, 도약 렌즈 초기화)을 부르는 시점이 됩니다. 덕분에 이 유물들이 무한 모드에서도 죽은 선택지가 아닙니다.
- **대가**: 무한 모드에서 점화 플러그는 "유물을 고를 때마다 32 하나"가 되어 런 모드와 체감이 다릅니다.

### D31. 되돌리기: 한 단계, 직전 "행동"(이동 또는 유물 사용) 전체를 RNG까지 복원, 되돌리기 자신의 충전만 빼고

- **왜**: 보드 안에 RNG 상태가 있으므로 스냅샷을 되돌리면 난수도 돌아갑니다. 같은 방향으로 다시 밀면 같은 타일이 나오므로 "다시 굴려서 좋은 운 고르기"가 안 됩니다. 폭탄 사용도 되돌릴 수 있고, 그때 폭탄 충전도 돌려받습니다. 스냅샷은 되돌리기 칸을 뺀 상태(`RunSnapshot`)라 중첩되지 않습니다.
- **대가**: 저장 데이터에 직전 상태가 하나 더 들어가 크기가 약 두 배가 됩니다(4×4 보드라 수 KB 수준). 스테이지가 바뀌면 스냅샷은 버립니다.

### D32. 막힌 보드는 구조 수단(폭탄 충전, 쓸 수 있는 되돌리기)이 남아 있으면 실패로 보지 않는다

- **왜**: 폭탄을 들고 있는데 "움직일 수 없음, 실패"가 뜨면 억울합니다. 실패 판정을 미루고 상태를 `playing`으로 두면, 화면은 `runDirections(run)`이 비어 있는 것을 보고 "유물을 쓰세요"를 안내할 수 있습니다. 모든 행동 뒤에 같은 판정이 다시 돌므로, 구조 수단을 다 쓰고도 막혀 있으면 그때 실패합니다.
- **대가**: 화면이 "이동 불가지만 아직 진행 중" 상태를 처리해야 합니다.
- **결과(3b단계)**: `HudModel.stuck`이 참이면 유물 줄 자리에 "움직일 수 없어요 · 유물을 사용하세요"를 띄웁니다(5.4장).

### D33. 연쇄 반응은 "방금 생긴 타일이 낀 합체"만, 최대 2번 더

- **왜**: "합체가 없을 때까지 같은 방향으로 계속 민다"로 하면 한 번의 스와이프로 보드가 정리되어 2048의 판단이 사라집니다. 직전 패스에서 생긴 타일만 다시 합칠 수 있게 하면 연쇄가 "줄줄이 이어지는" 모양이 되고 화면으로도 따라가기 쉽습니다. 합체가 없는 정리 이동은 연쇄로 치지 않습니다.
- **대가**: 깊이 제한(2)은 밸런스 수치라 `RELIC_TUNING.chainDepth`에 있습니다. 한 번 더 고르는 같은 유물이 없으므로 깊이가 쌓이지는 않습니다.

### D34. 보스는 카운트다운이 0이 되는 이동의 `boss` 단계에서 발동한다. 봉쇄는 다음 이동부터 센다

- **왜**: "5턴마다"를 "다섯 번째 이동이 끝날 때"로 정하면 HUD의 숫자(`turnsUntil`)와 실제 발동이 정확히 맞습니다. 봉쇄가 걸린 바로 그 턴에 봉쇄 턴이 줄면 "2턴 봉쇄"가 실제로는 1턴이 되므로, 생긴 턴에는 세지 않습니다.
- **대가**: 보스 단계가 생성 단계보다 앞이라, 혼돈이 섞은 직후 새 타일이 하나 더 나옵니다. 섞인 판을 보고 다음 수를 고를 수 있도록 하는 쪽을 택했습니다.

### D35. 밸런스 봇은 미래를 엿보지 않고, 유물 효과는 "처음 제시된 순간"으로 비교한다

- **왜**: `runMove`를 방향마다 시험해 보면 다음 생성 위치까지 알게 되어 봇이 비현실적으로 강해집니다. 그래서 봇은 `slide`(생성 전)만 봅니다. 유물 효과는 "가진 런 vs 안 가진 런"으로 비교하면 오래 산 런이 제시를 더 많이 받는 생존 편향이 생깁니다. 처음 제시된 순간의 무작위 선택으로 나누면 작은 무작위 실험이 됩니다.
- **대가**: 표본이 유물당 100~300런이라 몇 점 차이는 잡음입니다. 봇이 쓰지 않는 유물(정지 핀)은 낮게 나옵니다.

### D36. 시뮬레이터는 `tsx`로 실행하고, Node 타입은 도구 파일에만

- **왜**: 시뮬레이터는 브라우저가 필요 없는 TS 스크립트라 `tsx`(개발 의존성)로 바로 실행합니다. `@types/node`는 `tools/simulate.ts` 맨 위의 `/// <reference types="node" />`로만 불러와서, 앱 코드(`src/`)에서는 여전히 `process` 같은 Node 전역을 쓸 수 없습니다. ESLint도 `tools/`에만 Node 전역을 켰습니다.
- **대가**: 개발 의존성이 두 개 늘었습니다. 런타임 의존성은 여전히 0입니다.

### D37. 고유 용어를 쓴다: 와일드 → 프리즘, 유물 이름은 이 게임의 세계관(회로·코일·필터)으로

- **왜**: 다른 게임의 용어·이름을 빌리지 않는다는 원칙(외부 자료 조사 노트) 때문입니다. "어떤 수와도 합쳐지는 타일"은 빛을 나누는 프리즘으로, 유물 이름은 네온·회로 분위기에 맞게 지었습니다. 코드 식별자(`prism`, `prismCore`)도 같은 이름을 씁니다.
- **대가**: 계획서의 가칭(와일드 타일, 구석의 왕, 여분의 시간…)과 이름이 다르므로, 이 문서의 4.5장 표가 기준입니다.

### D38. 화면 상태는 런 상태에서 유도하고, 화면만의 상태(메뉴·정지·대상 지정)만 컨트롤러가 더 가진다

- **왜**: 런의 진행(진행 중/유물 선택/승리/실패)은 이미 코어의 `run.status`에 있습니다. 컨트롤러가 그걸 따로 들고 있으면 두 값이 어긋날 수 있으므로, 매 행동 뒤 `screenFor(run)`으로 다시 계산합니다. 코어가 몰라도 되는 것(메뉴, 일시정지, 어느 유물로 대상을 고르는 중인지)만 컨트롤러 상태입니다.
- **대가**: 일시정지 같은 화면 상태는 저장되지 않습니다. 4단계에서 "진행 중인 런 저장"을 붙이면 다시 열었을 때 항상 진행 화면(또는 유물 선택)에서 시작합니다.

### D39. 프레젠터(`runView.ts`)는 순수 함수이고, 화면의 한국어 문구는 거기에 모은다

- **왜**: "1막 보스", "다음 발동: 64 → 32", "이동 횟수를 모두 썼어요" 같은 문구와 숫자 가공은 DOM 없이 테스트할 수 있어야 합니다. DOM 코드는 모델을 받아 `textContent`에 넣기만 하므로 거의 실수할 곳이 없습니다.
- **대가**: 파일이 하나 늘고, 모델 타입(`HudModel`, `ScreenModel`…)을 바꾸면 프레젠터·DOM·테스트 세 곳을 함께 고쳐야 합니다. 대신 컴파일러가 빠진 곳을 알려 줍니다.

### D40. 칸에 묶인 정보는 캔버스, 읽거나 누르는 것은 DOM. 보드를 오래 가리는 DOM은 두지 않는다

- **왜**: 봉쇄된 줄이나 부식자의 대상은 타일과 함께 움직이고 같은 좌표계를 써야 하므로 캔버스가 맞습니다. 글자·버튼·카드는 줄바꿈, 포커스, 터치 크기, 접근성을 브라우저가 해 주는 DOM이 맞습니다. 대상 지정 막대와 "움직일 수 없어요"는 처음에 보드 아래쪽에 겹쳐 두었다가 맨 아랫줄 타일을 가려서 유물 줄 자리로 옮겼고, 대상 지정 중에는 위쪽 안내도 숨깁니다.
- **대가**: 같은 정보가 두 곳에 나오기도 합니다(봉쇄 남은 턴: 보드 배지 + 보스 줄 문장). 의도된 중복입니다.

### D41. 보드 표시는 그 턴의 애니메이션이 끝난 뒤 바뀐다. 대상 지정 표시는 즉시

- **왜**: 원인(미끄러짐·보스 발동)이 화면에 나오기 전에 결과(빗금 띠)가 먼저 보이면 인과가 뒤집힙니다. HUD 숫자는 즉시 바뀌어도 어색하지 않지만 보드 위의 표시는 타일과 함께 읽히기 때문입니다.
- **대가**: 이동 직후 수백 ms 동안 HUD("1턴 남음")와 보드 배지("2")가 다를 수 있었습니다. 4단계에서 HUD도 같은 순간에 바뀌게 했습니다(D55).

### D42. 연출 연결 지점은 "이벤트 큐"(`onCue`): 이벤트 애니메이션이 시작되는 순간 알린다

- **왜**: 5단계의 파티클·흔들림·효과음은 타일 움직임과 정확히 같은 순간에 나와야 합니다. 뷰 모델이 이미 단계별 시작 시각을 계산하므로 그 시각을 이벤트와 함께 돌려주고(`EventCue`), 렌더러는 그 시각에 구독자를 부릅니다. 빨리 감기로 건너뛴 이벤트는 `late: true`로 즉시 알려, 소리는 낼지 효과는 생략할지 구독자가 고릅니다. 이번 단계의 기본 효과와 HUD 유물 아이콘 반짝임도 이 훅의 구독자입니다.
- **대가**: 알림은 프레임 단위라 최대 한 프레임(약 16ms) 늦습니다. 시각(`cue.at`)은 정확하므로 오디오는 그 값으로 예약할 수 있습니다.

### D43. 대상 지정은 명시적 모드: 스와이프는 무시, 탭만 칸 선택, 취소는 버튼·같은 유물 다시 누르기·Esc

- **왜**: 칸을 고르려고 살짝 끌다가 보드가 움직이는 사고를 막습니다. 탭은 "임계값 절반 안에서 떼고 스와이프가 없었음"으로 판정합니다. 틀린 칸을 누르면 모드를 유지하고 이유를 적어 줍니다. 고를 수 있는 칸 표시와 실제 판정이 같은 규칙(`canUseActive` ↔ `targetCells`)을 따릅니다.
- **대가**: 대상 지정 중에 마음이 바뀌어 그냥 밀고 싶으면 한 번 취소해야 합니다.

### D44. 유물 줄은 한 줄만, 넘치면 "유물 +N". 전체 목록은 일시정지 화면에

- **왜**: 런 끝에는 유물이 10개를 넘습니다. 44px 터치 칩을 320px 폭에 다 넣을 수 없고, 가로 스크롤은 화면 전체가 스와이프 면이라 충돌합니다. 첫 줄에 들어가는 칩만 보이고, 나머지 개수를 버튼에 적어 일시정지(전체 목록)로 안내합니다. 사용 유물은 따로 큰 버튼 줄을 씁니다.
- **대가**: 유물이 많으면 일부 패시브는 한 번 더 눌러야 설명을 봅니다.

### D45. 안내는 한 번씩, 대기열로 하나씩, 이동 몇 번 뒤 자동으로 닫힘. 스테이지 배너가 사라진 뒤 나타난다

- **왜**: 1막이 튜토리얼 역할(외부 자료 조사 노트)을 하므로 새 요소는 처음 나올 때 한 줄만 알려 줍니다. 플레이어가 그냥 계속 밀면 이미 읽은 것으로 보고 닫습니다. 배너와 안내가 동시에 보드 위에 뜨면 읽을 수 없어서 안내를 배너 뒤로 미룹니다.
- **대가**: (4단계에서 바뀜) 본 안내는 저장되고, 이동 몇 번 뒤가 아니라 다음 이동·탭으로 닫히며, 안내는 보드 아래에 뜹니다(D54).

### D46. 기록은 메모리에만, 첫 판은 "새 최고 기록"이라 부르지 않는다

- **왜**: 저장은 4단계 범위입니다(`initialRecords`/`onRecordsChange`로 연결 지점만 열어 둠). 기록이 0일 때는 어떤 판이든 "새 기록"이 되어 의미가 없으므로, 이전 기록이 있을 때만 축하합니다.
- **대가**: (4단계에서 해소) 기록은 `SaveStore`에 저장됩니다(D50).

### D47. 시각 정체성: 깎인 모서리의 "칩" 타일, 회로 기판 보드, 그 아래 주황 균열. 방해는 모티프를 깨는 형태로

- **왜**: 외부 자료 조사 노트에서 같은 장르의 상용작이 어두운 사이버펑크 외형이라 겹쳐 보일 위험을 지적했습니다. 그래서 둥근 네온 사각형 대신 이 게임만의 모양(모서리를 깎은 칩, 칸 사이 회로선, 보드 밑 균열)과 주황(균열)·청록(회로) 강조색을 정했습니다. 돌(빛 없는 파편), 얼음(서리 판), 저주(지그재그 테두리)는 칩 모양을 일부러 깨서 한눈에 "이상한 것"으로 읽히고, 색각 이상이어도 형태로 구분됩니다.
- **대가**: 패널·버튼 일부(`clip-path`)와 타일 그림이 같은 모서리 깎기 값을 공유해야 해서, 모티프를 바꾸면 CSS와 `tilePainter.ts`를 함께 고쳐야 합니다.

### D48. 2단계의 "그냥 2048" 모드와 `GameController`는 없앴다

- **왜**: 무한 모드가 "큰 판을 키우는" 역할을 맡고, 같은 화면에 두 종류의 컨트롤러를 유지할 이유가 없었습니다. `RunController`가 같은 원리(상태를 들고, 코어를 부르고, 인터페이스로 나눠 줌)를 이어받았습니다.
- **대가**: 3.7장의 코드 발췌는 2단계 당시 모습으로 남겨 두고, 지금 코드는 5.1~5.2장에서 설명합니다.

### D49. 코어에 추가한 것은 `restoreStep(run)` 하나

- **왜**: 저장된 런 이어 하기(4단계)와 테스트의 "정확한 보드 꾸미기"(`controller.load`)는 "아무것도 바꾸지 않고 이 런의 보드를 빈 화면에 다시 그리는 단계"가 필요했습니다. 되돌리기가 이미 쓰던 내부 함수(`rebuildEvents`)를 공개 함수로 감쌌을 뿐이라 규칙은 늘지 않았습니다.
- **대가**: 없음. 테스트(`restoreStep` 재생 결과 == 코어 보드)가 하나 늘었습니다.

### D50. 저장은 관심사별 키 + 버전 봉투 + 필드 단위 대체값. 저장소는 주입한다

- **왜**: 런은 이동마다, 프로필은 바뀔 때만 씁니다. 한 키가 망가져도 다른 키는 살아남고, 한 필드가 망가져도 그 필드만 기본값이 됩니다. `KeyValueStorage`를 주입해서 DOM 없이 테스트하고, 브라우저에서 저장소가 없으면 `MemoryStorage`로 그냥 계속합니다.
- **대가**: 실제 마이그레이션 함수는 아직 하나도 없습니다(스키마 v1이 첫 버전). 사슬은 테스트에서 가짜 표로만 검증했습니다.

### D51. 더 새 버전이 쓴 값은 읽지도 덮어쓰지도 않는다

- **왜**: 캐시된 예전 PWA가 새 형식을 "모르는 값"으로 보고 덮어쓰면 기록이 사라집니다. 잠그고 이번 방문 동안 메모리로만 동작합니다.
- **대가**: 그런 방문에서 세운 기록은 남지 않습니다.

### D52. 저장은 모든 단계 뒤에, 끝난 런은 지운다. 유물 선택 화면도 저장한다

- **왜**: 상태가 바뀌는 곳이 `apply` 하나라 저장도 한 곳이면 됩니다. 앱이 죽어도 잃는 것은 애니메이션 하나. 결과 화면의 런은 이어 할 것이 없으므로 지웁니다.
- **대가**: 이동마다 3~5KB JSON을 씁니다. 휴대폰에서도 문제없는 크기지만, 런 상태가 커지면 다시 봐야 합니다.

### D53. 오늘의 도전은 기기의 현지 날짜, 기록은 날짜별 최고만 최근 30일. 지난 날의 미완료 도전은 버린다

- **왜**: 순위표가 없으니 "내 하루"가 자연스럽습니다. 기록은 진행 중에도 갱신되므로 버려지는 것은 판 자체뿐입니다. 도전은 일반 런 기록에 섞지 않습니다(같은 판을 여러 번 해서 세운 기록이므로).
- **대가**: 시간대가 다른 사람끼리는 "오늘"이 몇 시간 어긋나고, 밸런스가 바뀐 날은 같은 날짜라도 판이 다릅니다.

### D54. 안내는 보드 밖(유물 줄 자리)에, 보이는 순간 본 것으로, 탭·다음 이동으로 닫힘. 유물 선택 안내는 시트 안에

- **왜**: 보드 위 안내는 설명하는 바로 그 타일을 가렸습니다. 대기열에 넣는 순간 본 것으로 치면 못 본 안내가 사라집니다. 유물 선택 화면은 전체를 덮는 시트라 그 안에 한 줄로 둡니다.
- **대가**: 안내가 떠 있는 동안 유물 칩이 가려지고, 작은 화면에서는 보드가 몇 px 작아집니다.

### D55. HUD는 보드 표시와 같은 순간에 바뀐다 (`setMarks(marks, onShown)`)

- **왜**: 두 곳이 다른 숫자를 말하면 플레이어는 어느 쪽도 믿지 않습니다. 렌더러가 이미 "표시를 언제 바꿀지"를 알고 있으므로 같은 순간에 콜백을 부르게 했습니다. 새 단계가 오면 기다리던 콜백은 먼저 실행되어 갱신이 빠지지 않습니다.
- **대가**: 숫자가 스와이프보다 이동 애니메이션 길이만큼 늦게 바뀝니다. 대상 지정 표시는 여전히 즉시.

### D56. 점화 플러그는 빈 구석에

- **왜**: 무작위 칸의 16은 구석 정렬을 망쳐 이 유물을 고르면 손해였습니다(시뮬레이터 −5.5점). 빈 구석이 없으면 아무 빈 칸.
- **대가**: 무작위성이 줄어 "운 좋게 좋은 자리"도 사라집니다.

### D57. 밸런스는 "유물 없이도 가능, 유물이 있으면 할 만함"을 우선, 전체 승률 목표는 이번엔 못 맞춤

- **왜**: 유물 없이 0%인 스테이지는 나쁜 빌드를 벽으로 만듭니다. 점수 목표를 유물 없이 20~40%로 낮추자 유물이 쌓인 런에서는 거의 늘 깨집니다. 승률을 낮추는 다음 손잡이는 스테이지 표가 아니라 유물 수치입니다(6.5장).
- **대가**: 구석 봇 승률 36%(목표 15~30%), 2-보스·3-3은 런 안에서 긴장이 없습니다.

### D58. 사건 → 연출 매핑은 한 파일(`feedback.ts`)에. 코어와 컨트롤러는 연출을 모른다

- **왜**: 강약 조절은 표 전체를 보면서 해야 합니다. 감독은 렌더러의 큐 구독자이고, 화면·HUD 변화는 `main.ts`에서 `BoardDisplay`/`UiDisplay`를 감싸 듣습니다. 컨트롤러와 그 테스트는 하나도 바뀌지 않았습니다.
- **대가**: 잘못된 이동·유물 선택·되돌리기처럼 이벤트가 없는 일은 `main.ts`가 직접 감독을 부릅니다(디버그 `move()`로는 잘못된 이동 연출이 나지 않음).

### D59. 큐는 이벤트가 "닿는" 시각(`hit`)에 발화한다. `at`은 그대로 둔다

- **왜**: 합체 팝이 엇갈려 시작하므로 불꽃·소리는 팝 순간에 맞아야 합니다. 시작 시각 `at`을 바꾸면 기존 의미와 테스트가 깨지므로 필드를 더했습니다. 렌더러는 `hit` 순으로 정렬해 발화합니다.
- **대가**: 큐 구독자는 "애니메이션 시작"이 아니라 "닿는 순간"에 불립니다. 큐 하나에 시각이 둘이라 헷갈릴 수 있어 타입 주석에 적었습니다.

### D60. 파티클은 타입 배열 고정 풀(320), 가득 차면 새 것을 거절, 난수는 시드 고정

- **왜**: 프레임 중 할당 0, 가비지 컬렉션 멈춤 없음. 거절하면 이미 보이는 연출이 갑자기 사라지지 않습니다. 시드 고정이라 스크린샷이 매번 같습니다.
- **대가**: 최악의 경우 새 사건의 파티클이 적게 나옵니다(측정한 최악의 턴에서는 거절 0).

### D61. 연출 밀도는 측정한 프레임 길이로 정한다 (`FrameBudget`)

- **왜**: "저가형 기기"를 사용자 에이전트나 코어 수로 추측하면 틀립니다. 프레임이 실제로 길어질 때만 줄이고, 빨리 줄이고 천천히 회복해 출렁이지 않게 했습니다.
- **대가**: 배터리 절약 모드(30Hz 화면)에서도 프레임이 길게 재져 파티클이 줄어듭니다. 그 상황에서는 오히려 괜찮은 쪽이라 두었습니다.

### D62. 흔들림은 trauma² × 사인 합 노이즈, 평행 이동만. 보드 판은 고정하고 위의 것만 흔든다

- **왜**: 작은 사건은 거의 안 보이고 큰 사건만 확실합니다. 결정적인 시간 함수라 테스트 가능. 회전은 숫자 가독성을 해칩니다. 판까지 옮기면 가장자리에 빈 줄이 드러납니다.
- **대가**: "카메라 전체가 흔들린다"보다 "판 위에서 덜컹인다"에 가깝습니다.

### D63. 히트스톱은 뷰 시계만 멈춘다. 최대 120ms, 드문 사건 세 가지만, 새 단계가 즉시 해제

- **왜**: 무게감은 주되 입력은 절대 기다리지 않습니다. 파티클·흔들림은 실제 시간으로 계속 움직여 충격이 커 보입니다.
- **대가**: 멈춤 동안 밀린 큐는 해제 직후 한 프레임에 몰려 발화할 수 있습니다(같은 소리·같은 음높이면 하나로 합쳐짐).

### D64. 연출은 정보를 가리지 않는다: 불꽃은 타일 가장자리에서, 글자는 타일 위쪽에서, 콤보는 합체한 칸의 "+N ×k"로

- **왜**: 처음 버전은 흰 불꽃이 새 숫자를 덮고, 보드 중앙의 콤보 알약이 다른 타일을 가렸습니다. 같은 칸의 새 글자는 옛 글자를 대신하고, 새 콤보 글자가 뜨면 옛 콤보 글자는 빨리 사라집니다.
- **대가**: 최악의 연쇄 턴에서는 여전히 글자 서너 개가 동시에 보입니다(가장 시끄러운 순간, 7.12장).

### D65. 신시사이저는 직접 썼다. ZzFX의 "숫자 배열 하나 = 소리" 방식만 빌림

- **왜**: 런타임 의존성 0과 "제3자 코드 반입 없음" 원칙. 레이어 = 숫자 10개, 소리 = 레이어 몇 개로 충분히 다양했고, 형식을 우리 필요(노이즈 레이어, 지연으로 아르페지오, 하이·로우패스)에 맞출 수 있었습니다.
- **대가**: ZzFX의 웹 사운드 디자이너를 그대로 쓸 수 없어 소리는 손으로 숫자를 고쳐 다듬어야 합니다.

### D66. "소리를 낼지"(엔진)와 "소리를 만드는 법"(백엔드)을 나눴다. 늦은 큐는 중요한 소리만 하나

- **왜**: 잠금, 켜기/끄기, 간격, 동시 음 수, 늦은 큐 규칙을 가짜 출력과 가짜 시계로 Node에서 전부 테스트합니다. 엔진 시계는 렌더러 시계라 디버그 단계 실행에서도 결정적입니다.
- **대가**: 실제로 들리는지는 단위 테스트가 아니라 브라우저의 오프라인 렌더링 수치(최대값·RMS)로만 확인합니다.

### D67. 콤보 음높이는 마이너 펜타토닉 위에서 항상 한 단계 이상 올라간다

- **왜**: 값 순서대로 음을 내면 콤보가 내려가기도 하고, 반음 아무거나는 불협화음이 됩니다.
- **대가**: 큰 타일 합체가 콤보 중간에 오면 자기 값보다 높은 음으로 들립니다.

### D68. 진동은 안드로이드용 덤. 못 하는 기기에서는 스위치를 숨기고, 작은 합체는 진동하지 않는다

- **왜**: iOS의 모든 브라우저에는 진동 API가 없습니다. 진동으로만 전달되는 정보를 두지 않습니다. 매 합체 진동은 금방 귀찮아집니다. 비공식 iOS 우회는 쓰지 않았습니다.
- **대가**: 아이폰 사용자는 촉각 피드백이 없습니다. 실제 기기에서 세기를 확인하지 못했습니다.

### D69. 움직임 줄이기는 "기기 설정/켬/끔" 세 칸, CSS와 캔버스가 `data-motion` 하나를 따른다. 정보 연출은 남긴다

- **왜**: 시스템 설정과 이 게임의 선택이 다를 수 있습니다. 예전 CSS는 미디어 쿼리만 봐서 "끔"을 무시했습니다. 흔들림·멈춤·찌그러짐은 빼되 고리 펄스·줄 섬광·봉쇄 표시·빨간 테두리(잘못된 이동)는 남깁니다.
- **대가**: 설정 값 하나(`reduceMotion`)가 저장 형식에 늘었습니다(필드 단위 대체값이라 예전 저장도 그대로 읽힘).

### D70. 유물 선택·결과 시트는 650ms 뒤에 나타난다 (전 380ms)

- **왜**: 스테이지 클리어 불꽃이 시트에 바로 덮였습니다. 유물 제시음도 같은 지연(`OFFER_SOUND_DELAY`)으로 시트와 함께 납니다.
- **대가**: 마지막 합체 뒤 시트까지 0.27초 더 기다립니다.

### D71. 생성형 배경음(막별 패드)은 넣지 않았다

- **왜**: 계획서에서도 "맞으면" 넣을 선택 사항이었고, 직접 들어 볼 수 없는 상태에서 오래 울리는 소리는 거슬리기 쉽습니다. 짧은 효과음만으로 이번 단계를 마쳤습니다.
- **대가**: 조용한 순간에는 정말 조용합니다.

### D72. 보드 테두리 섬광에서 매 프레임 `shadowBlur`를 뺐다

- **왜**: 3.8장의 원칙(블러는 캐시 안에서만)을 이 효과만 어기고 있었습니다. 넓고 옅은 선 + 좁고 밝은 선 두 겹으로 거의 같은 모습입니다. 측정에서 보스 턴이 빨라진 데 기여한 것으로 보입니다(따로 떼어 재지는 않음).
- **대가**: 번짐이 완전히 부드럽지는 않습니다.

### D73. PWA는 플러그인 없이: 직접 쓴 서비스 워커 + 작은 Vite 플러그인

- **왜**: 한 페이지, 파일 여덟 개짜리 게임에 필요한 것은 "목록 받기, 옛 캐시 지우기, 캐시 우선" 셋뿐입니다. 직접 쓰면 주석 포함 80줄이고 생명주기가 코드에 그대로 보여 공부 자료가 됩니다. 개발 의존성도 늘지 않습니다(Workbox 계열은 의존성이 많아 `npm audit` 소음도 늘어남). 가장 위험한 캐시 무효화는 내용 해시로 기계적으로 처리합니다.
- **대가**: 런타임 캐싱 전략, 백그라운드 동기화 같은 기능이 필요해지면 직접 짜야 합니다. 워커는 페이지와 모듈을 공유할 수 없어 메시지 문자열을 두 곳에 두고 테스트로 묶었습니다.

### D74. 업데이트는 "기다렸다가 묻기". 새로고침은 플레이어가 누를 때만

- **왜**: 런 도중 자동 새로고침은 최악의 경험이고, 설치 즉시 넘겨받기(`skipWaiting`)는 열린 페이지와 캐시의 버전이 섞일 수 있습니다. 런은 매 이동 저장되므로 플레이어가 고른 순간에 새로고침해도 잃는 것이 없습니다. 첫 설치의 `controllerchange`는 무시합니다.
- **대가**: 안내를 계속 "나중에"로 넘기면 옛 버전을 오래 씁니다(탭을 모두 닫고 다시 열면 새 버전이 적용됨).

### D75. 범위 안의 모든 페이지 이동은 앱 셸로, 캐시 우선. 큰 아이콘과 공유 이미지는 프리캐시에서 뺌

- **왜**: 게임은 한 페이지이고 `?seed=`·`?debug`는 스크립트가 읽으므로 쿼리를 무시하고 `index.html`로 대답해야 오프라인에서도 링크가 열립니다. 512 아이콘과 1200×630 공유 이미지는 설치 화면과 링크 미리보기만 쓰므로, 빼면 프리캐시가 약 212 KB로 줄어듭니다.
- **대가**: 범위 안에 다른 HTML 페이지가 생기면 규칙을 바꿔야 합니다.

### D76. 매니페스트의 `start_url`·`scope`·`id`는 상대 경로 `./`

- **왜**: 매니페스트 위치를 기준으로 풀리므로 `base: '/2048-project/'`와 함께 움직입니다. 로컬 미리보기와 Pages에서 같은 파일이 맞고, 테스트가 `/2048-project/`로 풀리는지 확인합니다.
- **대가**: 매니페스트를 다른 폴더로 옮기면 의미가 바뀝니다.

### D77. 아이콘과 공유 이미지는 SVG로 그려 Playwright Chromium으로 래스터화하고, 결과 PNG를 커밋

- **왜**: "에셋 0"을 지키면서 이미지 편집기 없이 다시 만들 수 있습니다. 이미 있는 브라우저를 쓰므로 이미지 라이브러리가 필요 없습니다. 빌드 때마다 만들지 않고 커밋하는 이유는 빌드를 빠르고 결정적으로 두기 위해서입니다(폰트·브라우저가 다른 CI에서 미세하게 다른 PNG가 나오는 것을 피함).
- **대가**: 그림을 바꾸면 `npm run icons`를 손으로 돌려야 합니다. 공유 이미지의 한국어 글꼴은 그것을 만든 기계의 글꼴을 따릅니다.

### D78. e2e는 같은 시드의 코어를 기준으로 상태를 비교하고, 시간은 `settle()`로. Playwright는 1.63.0으로 정확히 고정

- **왜**: 손으로 적은 기댓값은 밸런스 숫자가 바뀔 때마다 깨집니다. 코어가 기준이면 e2e는 "입력·화면·저장이 코어와 같은 결과를 내는가"만 묻습니다. 잠자기 대신 애니메이션을 끝으로 보내면 빠르고 흔들리지 않습니다(`--repeat-each 5`로 확인). Playwright 버전은 미리 설치된 Chromium 빌드(1243)와 짝이 맞아야 해서 범위가 아닌 정확한 버전으로 둡니다.
- **대가**: 픽셀이 맞는지는 e2e가 보지 않습니다(스크린샷 비교는 OS마다 달라 두지 않음). 연출은 7.12장의 밀착 인화로 사람이 봅니다.

### D79. 점수 보스(2-보스, 3-3)는 빌드를 전제로 한다. 잣대는 "유물 0개"가 아니라 "점수 유물이 없는 빌드" (D57 일부 뒤집음)

- **왜**: 2048의 점수는 분포가 좁아서(±10%) "유물 0개로도 가능한 목표"는 유물 7~10개를 든 런에게 늘 100%입니다. 유물 0개로 그 스테이지에 도착하는 사람은 없으므로, 현실적인 약한 빌드(점수 유물 없음)가 40%대로 깰 수 있는 선에 맞췄습니다(8.6장).
- **대가**: 스테이지 단독 표(유물 없음)에서 2-보스와 3-3은 0%입니다. 2-1(700)은 유물 없이도 되는 첫 점수 스테이지로 남겼습니다.

### D80. 잔해 연료는 "돌 2개당 이동 1". 남는 개수는 유물 카운터에 두고 스테이지마다 0으로

- **왜**: 돌이 많은 막에서 이동을 지나치게 늘려 가장 강한 일반 유물이었습니다. 수치(1개당 1)를 더 낮출 수 없어 "몇 개당"으로 바꿨고, 이미 있는 `counter` 칸(D28)을 써서 새 상태가 생기지 않았습니다.
- **대가**: 돌 하나를 깼을 때는 아무 일도 일어나지 않아 피드백이 한 번 걸러 옵니다.

### D81. README의 규칙 표는 게임 데이터로 만들고, 낡으면 테스트가 실패한다

- **왜**: 손으로 쓴 표는 수치를 바꾸는 순간 거짓말이 됩니다(실제로 4.5장의 표가 그랬습니다). 생성기가 Prettier 결과까지 만들어 `format:check`와 충돌하지 않습니다.
- **대가**: 표의 모양을 바꾸려면 README가 아니라 `tools/readme-tables.ts`를 고쳐야 합니다.

### D82. CI(모든 push·PR)와 배포(main만)를 나누고, 배포 전에도 테스트한다

- **왜**: 배포 워크플로는 Pages 쓰기 권한과 신원 토큰을 가지므로 실행 범위를 `main`으로 좁힙니다. 수동 실행은 아무 브랜치에서나 시작할 수 있어 작업에 `if: github.ref == 'refs/heads/main'`을 둡니다. 배포가 CI 결과에 기대지 않고 직접 테스트하면, 검사를 건너뛴 커밋이 올라갈 일이 없습니다.
- **대가**: `main`에 push하면 테스트가 두 번(CI, 배포) 돕니다(1초 남짓이라 무시할 만함). 워크플로는 아직 실제로 실행해 보지 않았습니다.

### D83. 테마는 색상표가 아니라 화가까지 담은 전략 객체

- **왜**: 네온의 정체성은 모양(칩, 회로, 글로우, 가산 혼합)에 있어서 색만 바꾸면 "베이지 회로"가 됩니다. 타일·오버레이·판·파티클·비율을 테마가 주면, 렌더러는 테마를 몰라도 되고 새 테마는 파일 몇 개를 더하는 일입니다(9.1장).
- **대가**: `Theme` 인터페이스가 커졌고, 새 `TileKind`는 모든 테마에 그림을 받아야 컴파일됩니다. 연출 감독의 "어떤 모양을 쓸지" 같은 결정은 아직 테마 밖에 있습니다.

### D84. 페이지 색은 CSS 사용자 정의 속성으로, 전환은 `html[data-theme]` 하나로

- **왜**: DOM에는 캔버스 테마 객체가 닿지 않습니다. 색 리터럴을 변수로 모으고 테마 `id`를 `data-theme`에 쓰면 캔버스와 DOM이 같은 값 하나로 전환됩니다. 반투명 색은 RGB 세 숫자 변수로 두어 알파만 바꿔 씁니다(9.2장).
- **대가**: 글로우 제거, 카드 모양 같은 "색이 아닌 차이"는 테마 범위의 선택자로 덮어써서 CSS가 길어졌습니다(약 +12 kB). 리팩터링 전후 네온은 픽셀 비교로 같음을 확인했습니다.

### D85. 시안은 `?theme=storybook` 뒤에, 종족 상태는 `factionMock.ts` 한 파일의 흉내로

- **왜**: 승인 전까지 배포판을 건드리지 않고(기본 네온), 승인 판단에는 실제로 돌아가는 판이 필요했습니다. 종족 규칙은 B단계 일이므로 "가진 유물 + `?mockFaction` 가짜 보유 수"로 단계를 계산하고, 흉내는 한 파일에 가둬 B단계에서 갈아 끼우기 쉽게 했습니다(9.6장).
- **대가**: 시안의 유물 효과 문구와 HUD 이름은 드워프 4종만 새 말로 바뀌었고, 안내 문구(돌, 균열 등)는 아직 옛말입니다(D단계).

### D86. 종족 풍경은 판 캔버스 안에, 화면 높이가 남으면 판을 세로로 늘린 위아래 띠에 그린다

- **왜**: 360×640 폰에서는 판 바깥 여백이 0px일 때가 있어(보스 스테이지) DOM으로 바깥에 그리면 사라집니다. 처음에는 정사각형 판 안의 넓은 테두리에 그렸는데 타일이 네온보다 15% 작아지고 그림도 작았습니다. 판을 세로로 늘리면 남는 높이를 띠로 쓰면서 옆 여백은 줄일 수 있어, 타일은 처음 시안보다 절대 작지 않고 여유가 있으면 11% 커집니다(9.4장).
- **대가**: CSS(`--board-*`)와 `STORYBOOK_LAYOUT`이 같은 숫자를 알아야 해서 테스트로 묶었습니다. 높이가 빠듯한 보스 스테이지에서는 띠가 최소(0.56칸)라 인물이 작습니다. 여러 줄 안내문이 스테이지 중에 나타나면 띠가 조금 줄 수 있습니다(타일은 그대로).

### D87. 밝은 바탕의 연출은 일반 혼합, 금박 반짝임·금가루·잉크 튐·잉크 고리, 1.6배 크기

- **왜**: 가산 혼합은 밝은 바탕에서 흰색으로 날아갑니다. 같은 파티클 풀과 물리를 쓰고 "그리는 방식"만 테마가 바꿉니다. 큰 합체의 고리는 테마의 `ring`으로 잉크 고리가 됩니다(9.5장).
- **대가**: 네온만큼 "번쩍"이지는 않습니다. 큰 순간의 무게는 리본·문장 도장 같은 그래픽 연출이 맡습니다. 4× 스로틀에서 평균 프레임이 네온보다 약 12% 깁니다.

### D88. 그림은 SVG 경로 데이터 한 벌을 캔버스(`Path2D`)와 DOM(인라인 SVG)이 함께 쓴다

- **왜**: 판 테두리의 문장과 카드의 문장이 어긋날 수 없고, 손으로 다듬기 쉬운 형식(100×100 상자의 경로)입니다. 지도 같은 큰 정적 그림은 SVG 필터(`feTurbulence`)로 종이 결과 안개를 얻습니다.
- **대가**: 경로를 손으로 쓰는 일은 느리고, 결과는 "인쇄된 필사본"에 머뭅니다(표정·붓 자국 없음).

### D89. 그림의 "읽힘"은 테스트로 고정한다

- **왜**: 타일 숫자(그라디언트 양 끝)가 모든 단계의 바탕 양 끝에서 4.5:1 이상인지 테스트가 검사합니다. 첫 시안에서는 보석 단계가 3.8:1로 걸려서 고쳤고, 필사본 사다리를 짤 때는 짙은 바탕의 밝은 쪽 끝을 이 테스트에 맞춰 골랐습니다.
- **대가**: 대비는 글자색과 면 색만 봅니다. 서리·낙인 오버레이가 덮은 뒤의 대비는 눈으로만 확인했습니다(서리 위 금 숫자는 잉크 외곽선 덕에 읽히지만 대비가 가장 낮은 경우입니다).

### D90. 화풍은 채색 필사본으로: 시안을 보고 주인이 고른 대안

- **왜**: 첫 시안(밝은 그림책 지도)은 방향은 좋았지만 "깨끗하지만 밋밋하다"는 평이었습니다. 제안한 대안 셋(목판, 채색 필사본, 등불 밤 지도) 중 주인이 필사본을 골랐습니다. 금박·라피스·주홍은 값이 커질수록 화려해지는 타일 사다리, 붉은 제목과 채색 머리글자는 HUD에 "성격"을 줍니다. 테마 배관이 이미 있어 화가와 CSS 변수만 다시 칠했습니다(9.6장).
- **대가**: 장식이 많아 작은 화면에서 어지러울 위험이 있어, 작은 상자(남은 이동, 버튼)에는 귀퉁이 점을 빼는 식으로 덜어 냈습니다. 짙은 라피스 판이 넓어 "밝고 따뜻한" 느낌을 지키려면 양피지와 금이 면적의 대부분을 차지해야 합니다.

### D91. 빈 자리는 "기다리는" 모습으로 그린다

- **왜**: 아무 종족도 없을 때 띠가 비어 보이지 않게, 그리고 무언가가 나타날 수 있다는 것을 가르치기 위해 빈 감실에는 점선 방패를, 받침대에는 점선 인물을 둡니다. 동료가 오면 그 자리가 채워집니다.
- **대가**: 그림 요소가 하나 더 늘어 작은 화면에서는 점선이 가늘게 보입니다.

---

## 부록: 자주 쓰는 명령어

| 명령                 | 하는 일                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm ci`             | 잠금 파일 그대로 의존성 설치 (`npm install`은 잠금 파일을 갱신할 수 있음)                                          |
| `npm run dev`        | 개발 서버 (저장하면 즉시 반영)                                                                                     |
| `npm run test`       | 테스트 한 번 실행                                                                                                  |
| `npm run test:watch` | 파일이 바뀔 때마다 테스트 다시 실행                                                                                |
| `npm run lint`       | ESLint 검사                                                                                                        |
| `npm run format`     | Prettier로 전체 코드 정리                                                                                          |
| `npm run build`      | 타입 검사 + 배포용 빌드 (`dist/`)                                                                                  |
| `npm run preview`    | 빌드 결과를 로컬에서 미리 보기 (`http://localhost:4173/2048-project/`, 디버그는 `?debug&seed=42&mode=run`)         |
| `npm run sim`        | 밸런스 봇 시뮬레이터 (기본 300런/봇, `-- --runs 1000`으로 늘리기, `-- --bots corner,random`으로 고르기)            |
| `npm run e2e`        | 빌드 후 `vite preview`를 띄워 Playwright e2e 실행 (처음엔 `npx playwright install chromium`)                       |
| `npm run readme`     | README의 규칙 표를 게임 데이터로 다시 만들기 (`-- --check`는 낡았는지만 검사)                                      |
| `npm run icons`      | 아이콘·공유 이미지를 다시 그리기 (`public/`)                                                                       |
| `npm run media`      | README 스크린샷 다시 찍기 (`docs/media/`, 먼저 `npm run build`)                                                    |
| `?theme=storybook`   | 판타지 시안으로 보기 (`&mockFaction=dwarf:2` 종족 흉내, `&journey=2` 여정 지도, `?debug`면 `__neonRift.storybook`) |
