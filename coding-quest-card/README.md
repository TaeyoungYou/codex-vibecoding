# 오늘의 코딩 퀘스트 · Motion Lab

Motion for React를 공부하며 프로젝트를 만드는 사용자를 위한 학습 참고 앱입니다.

## 실행

Node.js 22.12 이상이 필요합니다. 이 프로젝트는 Node.js 24.12에서 확인했습니다.

```powershell
npm.cmd install
npm.cmd run dev
```

터미널에 출력된 로컬 주소를 엽니다. 포트를 지정하려면 `npm.cmd run dev -- --port 5177`을 사용합니다.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

## 기능

- 기본 애니메이션, 등장/퇴장, 버튼 제스처, 스크롤, 드래그의 5개 학습 카드.
- 설명, 핵심 API, 동작 예제, 실행 중인 예제의 JSX 원문, 코드 복사, 공식 문서 링크.
- 선택한 카드는 URL의 `quest` 값으로 유지합니다. 새로고침 및 뒤로/앞으로 이동을 지원합니다.
- 예제의 임시 상태는 주제 변경 또는 새로고침 시 초기화합니다. `다시 실행`으로 예제를 재시작할 수 있습니다.
- 키보드 조작, 드래그의 방향키 이동, 시스템 동작 축소 설정, 모바일 레이아웃.

모든 퀘스트는 고정된 학습 예제입니다. “오늘”은 앱 이름이며 날짜별 자동 갱신이나 서버 저장을 제공하지 않습니다.

## 코드 구조

- `src/App.jsx`: 화면과 URL 선택 상태.
- `src/data/quests.js`: 학습 설명 및 공식 문서 주소. 예제 JSX를 Vite의 `?raw`로 읽어 실행 코드와 표시 코드를 일치시킵니다.
- `src/demos/`: 실제 Motion 예제. 각 파일은 React/Motion을 직접 import하며, 꾸밈에 사용한 `.demo` CSS는 공통 스타일에 있습니다.
- `src/styles.css`: BEM 스타일과 반응형 레이아웃.

React 19.3.0, Motion 14.0.0, Vite 8.3.2를 사용합니다. React API는 `motion/react`에서 import합니다.

공식 문서: [Motion for React](https://motion.dev/docs/react), [설치](https://motion.dev/docs/react-installation).
