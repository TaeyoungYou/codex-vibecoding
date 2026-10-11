# 오늘의 코딩 퀘스트 — Context Card

근거: [docs-read.md](./docs-read.md), [build.md](./build.md), 앞선 Context7/공식 React 문서 조회 및 2026-10-04 사용자의 목적 설명.
상태: 구현 단계. 최신 [build.md](./build.md)의 즉시 구현 지시에 따라 학습 카드/코드/동작 예제 범위를 구현한다.

## 1. Project Goal

- `오늘의 코딩 퀘스트` 웹앱을 구현한다.
- Motion for React를 공부하며 프로젝트를 만드는 사용자가 API와 사용법을 참고할 수 있게 한다.
- 구체적인 성공 지표: **미정**.
- Motion for React의 현재 공식 API를 구현 기준으로 참고한다.

## 2. Target User

- Motion for React를 공부하며 React 프로젝트를 만드는 사용자.
- 코딩 숙련도, 개인용/공개 서비스 여부: **미정**.

## 3. Problem

- 학습과 프로젝트 제작 중 Motion for React의 API와 적용 방법을 확인할 참고 도구가 필요하다.
- 프로젝트명만으로 학습 습관 형성, 추천, 진도 관리 등을 목표로 확정하지 않는다.

## 4. Core Features

- 기본 애니메이션, 등장/퇴장, 버튼 제스처, 스크롤, 드래그의 5개 고정 학습 카드.
- 카드별 목표, 설명, 핵심 API, 실제 예제 JSX, 동작 미리보기, 공식 문서 링크.
- 코드 복사, 예제 재시작 및 주제별 초기화 조작.
- 선택한 카드만 URL의 `quest` 값으로 유지. 완료 기록이나 영구 저장 기능은 포함하지 않음.

## 5. User Flow

- 학습 주제 선택 → 설명/API 확인 → 예제 조작과 코드 비교 → 공식 문서를 참고해 자신의 프로젝트에 적용.
- 새로고침/뒤로/앞으로 이동 시 선택한 카드 유지. 잘못된 카드 ID는 기본 주제로 처리.
- 주제 변경/새로고침 시 예제의 임시 상태는 초기화.

## 6. Tech Stack

| 항목 | 기준 / 상태 |
|---|---|
| UI | React 19.3.0 |
| 애니메이션 | `motion` 패키지, React API는 `motion/react`에서 import |
| Motion 버전 | 2026-10-04 npm `latest`: `14.0.0`. 설치 시 재확인하고 lockfile에 기록 |
| 빌드 도구 / 프레임워크 | Vite 8.3.2, React plugin 6.1.1 |
| JavaScript / TypeScript | JavaScript |
| 스타일링 / 상태 관리 | 일반 CSS(BEM), React 로컬 상태 및 URL 선택 상태 |
| 저장소 / 백엔드 | 사용하지 않음. 서버 저장/외부 데이터 없음 |

설치 및 React 요구 조건: [공식 설치 문서](https://motion.dev/docs/react-installation).

## 7. UI / UX Direction

- 한국어 학습 화면, 밝은 배경과 주황색 강조, 데스크톱 목록/상세 분할 및 모바일 세로 배치.
- 구현 기본 방향: 내용을 읽고 조작하기 쉬운 화면, 명확한 상태 피드백.
- 애니메이션은 확정된 사용자 동작과 상태 변화를 설명하는 데 필요한 만큼 사용한다.
- hover에만 의존하지 않고 키보드와 터치에서도 주요 조작을 제공한다.
- 스크롤/드래그 효과는 실제 사용자 흐름에 필요할 때만 도입한다.

## 8. Constraints

- 사용자 요구와 원문을 우선하고, 미정 항목을 사실이나 구현 승인으로 취급하지 않는다.
- deprecated/제거된 API와 Motion 내부 API를 사용하지 않는다.
- React와 Vue 예제, 과거 `framer-motion` 예제와 현재 `motion/react` 예제를 구분한다.
- CSS 클래스와 선택자는 기존 사용자 선호인 BEM(`Block__Element--Modifier`)을 따른다.
- 예시 퀘스트를 사용한다면 샘플임을 표시한다. 실제 일일 데이터나 저장 기능이 있는 것처럼 표현하지 않는다.
- 기능·데이터·화면 흐름에 영향을 주는 미정 사항은 결정 후 구현한다.

## 9. In Scope

- **현재 요청**: [build.md](./build.md)에 따라 학습용 웹앱 구현 및 검증.
- 위 5개 주제의 학습 카드/코드/동작 예제/선택 유지, 로컬 실행 및 브라우저 검증.

## 10. Out of Scope

- 원래 컨텍스트 카드 작성 요청에서는 문서만 작성했다. 현재 구현 요청은 그 이후의 별도 작업이다.
- 외부 배포는 현재 요청에 포함되지 않음.
- 로그인, DB 연동, AI 퀘스트 생성, 자동 채점, 랭킹 등 문서에 없는 기능을 자동으로 추가하지 않는다.
- 위 기능의 향후 도입 여부는 미정이며, 영구 제외로 확정된 것은 아니다.

## 11. Relevant Documentation / APIs

- **설치/import**: `npm install motion`; Windows PowerShell에서는 `npm.cmd install motion`. 일반 React는 `import { motion, AnimatePresence } from "motion/react"`. [설치](https://motion.dev/docs/react-installation)
- **컴포넌트**: `motion.div`, `motion.button` 등. `initial`은 최초 상태, `animate`는 목표 상태, `exit`는 제거 시 상태. `initial={false}`는 최초 등장 효과를 생략한다. 커스텀 컴포넌트는 `motion.create(Component)`로 감싼다. [컴포넌트 API](https://motion.dev/docs/react-motion-component)
- **transition**: `tween`은 시간/이징, `spring`은 탄성 움직임에 사용. `duration`/`delay`는 초 단위. 물리 기반 spring의 `stiffness`/`damping`/`mass`와 시간 기반 설정의 우선순위를 확인한다. [Transitions](https://motion.dev/docs/react-transitions)
- **AnimatePresence**: 제거 대상은 고유하고 안정적인 `key` 사용. 표시 조건은 유지되는 `AnimatePresence` 안에 둔다. `sync`는 동시 등장/퇴장, `wait`는 순차 전환이며 한 번에 자식 하나, `popLayout`은 퇴장 요소를 레이아웃에서 제외한다. [AnimatePresence](https://motion.dev/docs/react-animate-presence)
- **스크롤**: 진입 효과는 `whileInView` + `viewport={{ once: true }}`. 진행률 연동은 `useScroll`의 MotionValue를 `style`에 연결하고 `useTransform`으로 변환한다. 특정 요소는 `target`/`offset`으로 추적한다. [스크롤](https://motion.dev/docs/react-scroll-animations), [useScroll](https://motion.dev/docs/react-use-scroll), [useTransform](https://motion.dev/docs/react-use-transform)
- **제스처**: `whileHover`, `whileTap`, `whileFocus`, `drag`, `whileDrag`. 드래그 도입 시 `dragConstraints`, `dragElastic`, `dragMomentum`과 터치 스크롤 동작을 확인한다. [제스처](https://motion.dev/docs/react-gestures), [드래그](https://motion.dev/docs/react-drag)
- **이전 API**: `exitBeforeEnter` 대신 `mode="wait"`; 공유 요소 전환은 `layoutId`, 관련 레이아웃 그룹은 `LayoutGroup`. 기존 `framer-motion`에서 이전 시 패키지/import 경로를 변경한다. [업그레이드](https://motion.dev/docs/react-upgrade-guide)
- **최근 변경**: 14.0은 React 공개 API의 breaking change가 없으며 일부 내부 API 폐기와 내부 의존성 버전 관리 변경이 있다. 13.0부터 Styled Components/Emotion 사용 시 prop 필터링 설정을 확인해야 한다. [업그레이드](https://motion.dev/docs/react-upgrade-guide)
- **프레임워크 조건부**: Next.js App Router 선택 시 hooks/이벤트가 있는 파일은 Client Component로 구성한다. `motion/react-client`는 motion 컴포넌트 import의 대안이며 hooks 사용을 대체하지 않는다. [설치](https://motion.dev/docs/react-installation)

## 12. Decision Rules

1. 사용자의 최신 명시적 요구 → 확정된 프로젝트 요구사항 → 원문/현재 공식 React 문서 → 기존 프로젝트 규칙 순으로 따른다.
2. 문서 예제를 제품 기능으로 승격하지 않는다. 모든 API를 사용해야 하는 것도 아니다.
3. 기술적 세부 선택은 가장 단순한 방법을 택하되, 미정 기능이나 데이터 정책을 추가하는 결정은 사용자에게 확인한다.
4. 출처가 충돌하거나 최신성 차이가 있으면 출처와 확인 날짜를 기록하고, 해당 버전의 공식 문서로 검증한다. 해결되지 않은 차이는 미정으로 유지한다.
5. 결정이 확정되면 이 카드의 관련 항목과 Open Questions를 함께 갱신한다.

## 13. Definition of Done

- **이번 문서**: 요청한 14개 항목 포함, 미정/예시/확정 구분, 공식 API 링크와 미해결 질문 기록.
- **후속 구현**: 합의된 핵심 기능과 사용자 흐름이 실제 브라우저에서 동작한다.
- 선택한 프로젝트의 빌드 및 설정된 lint/type 검사 통과; 주요 흐름의 런타임 오류 없음.
- 데스크톱/모바일에서 콘텐츠 잘림이나 불필요한 가로 스크롤 없음; 주요 조작의 키보드/터치 동작 확인.
- 도입한 애니메이션의 등장/변경/퇴장 및 제스처 상태 확인; 사용하지 않는 효과는 검증 대상으로 추가하지 않음.
- 실제 검증한 내용과 미검증 사항을 구분해 보고. 기능별 상세 수용 기준은 범위 확정 후 보완.

## 14. Open Questions

- 대상과 목적은 확정됨: Motion for React를 공부하며 프로젝트를 만드는 사용자를 위한 참고 도구.
- 첫 구현 범위와 기술 구성은 위 항목에 기록. “오늘”은 제목이며 데이터는 고정 학습 예제.
- 공개 서비스 여부와 향후 배포 대상: **미정**. 이번 작업은 로컬 실행까지.
- **요구사항 간 충돌**: 현재 확인된 충돌 없음. 기능 명세의 부재는 미정 사항으로 유지.
- **출처 최신성 차이**: 앞선 Context7 결과 일부는 12.x 업그레이드 정보와 Vue 예제를 포함했다. 공식 React 업그레이드 문서는 14.0을 다루며 npm `latest`는 14.0.0으로 재확인했다. Context7 결과만으로 최신성을 단정하지 않는다.
