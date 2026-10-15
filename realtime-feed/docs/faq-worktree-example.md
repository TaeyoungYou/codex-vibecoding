# FAQ 두 워크트리 병렬 작업 예제

상태: 두 브랜치 구현·실제 충돌 해결·통합 검증 완료, 2026-10-15.

## 목표와 역할

같은 기준 커밋에서 두 워크트리를 만들고 두 서브 에이전트가 같은 파일을 수정한다.
각 브랜치의 변경을 커밋한 뒤 통합 브랜치에서 충돌을 해결한다.

| 역할 | 저장소 루트 기준 경로 | 브랜치 | 변경 |
| --- | --- | --- | --- |
| 통합 | 현재 저장소 | `demo/faq-parallel` | 기준 문서·충돌 해결·통합 검증 |
| A | `.worktrees/faq-content/` | `feature/faq-content` | FAQ 답변 보강·질문 추가 |
| B | `.worktrees/faq-category/` | `feature/faq-category` | FAQ 객체 구조·카테고리 필터 |

각 워크트리의 프로젝트는 해당 폴더 아래 `realtime-feed/`다.
작업 파일은 각자의 `realtime-feed/src/features/landing/LandingPage.tsx`다.
서로 다른 실제 파일이지만 Git에서는 동일한 저장소 상대 경로의 변경으로 비교한다.
의존성은 기존 설치 폴더를 가리키는 로컬 junction으로 재사용하며 설치 파일은 변경하지 않는다.
`.worktrees/`는 루트 `.gitignore`에 포함한다.

## 공통 기준과 실행 순서

공통 기준은 준비 커밋 `44677f9ef7657d08d1a4f6f1c8adb710e6e37356`이다.
아래는 이번 실행에서 사용한 생성 순서다. 이미 생성된 폴더에 중복 실행하지 않는다.

```powershell
git worktree add -b feature/faq-content .worktrees/faq-content 44677f9
git worktree add -b feature/faq-category .worktrees/faq-category 44677f9
git worktree list
```

A는 기존 `[question, answer]` 튜플을 유지하며 답변을 보강하고 질문을 추가한다.
B는 기존 질문을 `{ id, category, question, answer }` 객체로 바꾸고 필터를 구현한다.
같은 기준의 `questions` 영역을 서로 다르게 수정하므로 통합 시 해당 영역을 확인한다.
같은 파일의 떨어진 부분을 수정한 경우에는 Git이 자동으로 합칠 수도 있다.

통합 담당자는 각 작업의 관련 파일만 각 브랜치에 커밋하고 다음 순서로 병합한다.

```powershell
git switch demo/faq-parallel
git merge --no-ff feature/faq-content
git merge --no-ff feature/faq-category
```

## 충돌 해결 기준

FAQ 데이터에서 양쪽 변경이 겹치면 다음 내용을 함께 보존한다.

1. A가 다듬은 기존 답변과 새로 추가한 질문을 남긴다.
2. B의 id·category·question·answer 객체 구조를 사용한다.
3. A의 새 이미지·그림 질문에도 첨부 카테고리와 고유 id를 지정한다.
4. B의 필터 버튼·상태 안내·기본 details 동작을 유지한다.
5. 내용 검사와 필터 검사를 통합 결과에서 함께 실행한다.

충돌 표시를 제거한 뒤 실제 해결 파일을 스테이징하고 병합 커밋을 만든다.
`ours` 또는 `theirs` 한쪽만 통째로 택하면 다른 기능이 빠질 수 있다.

## 결과 비교

저장소 루트에서 각 브랜치가 같은 파일에 남긴 변경을 확인할 수 있다.

```powershell
git diff 44677f9 feature/faq-content -- realtime-feed/src/features/landing/LandingPage.tsx
git diff 44677f9 feature/faq-category -- realtime-feed/src/features/landing/LandingPage.tsx
git log --graph --oneline demo/faq-parallel `
  feature/faq-content feature/faq-category -8
```

## 실제 결과와 검증

| 단계 | 커밋 | 실제 결과 |
| --- | --- | --- |
| 공통 준비 | `44677f9` | 같은 기준에서 A·B 시작 |
| A 독립 작업 | `0b7e711` | 기존 답변 개선·사진/그림 질문 추가, 총 6개 |
| B 독립 작업 | `f77ba42` | 원래 4개 질문의 객체 구조와 필터 |
| A 병합 | `51ba737` | 통합 브랜치에 A 결과 반영 |
| B 병합·해결 | `f1b5312` | 실제 데이터 충돌 해결, 문답 6개와 필터 보존 |

실제 충돌 파일은 `src/features/landing/LandingPage.tsx` 하나였다.
A의 튜플 배열과 B의 객체 배열이 같은 questions 영역에서 겹쳤다.
보강한 답변을 객체 구조에 옮기고 사진·그림 질문에 고유 id와 첨부 카테고리를 부여했다.
통합 결과는 전체 6개, 작성 1개·첨부 3개·권한 2개다.

```powershell
git show --cc f1b5312 -- realtime-feed/src/features/landing/LandingPage.tsx
```

- A·B 독립 워크트리의 전용 실제 Chrome E2E: 각각 2개 통과.
- 통합 빌드·타입 검사·단위 테스트 22개·관련 실제 Chrome E2E 6개: 통과.
- 필터 분류·전체 복귀·내용 펼침·키보드·320px·44px 조작 영역·API 요청 없음: 통과.
- [로컬 샘플 미리보기](http://127.0.0.1:5185/#questions)를 실행해 두었다.
  서버가 종료됐다면 프로젝트 폴더에서 아래 명령으로 다시 연다.

```powershell
$env:VITE_GUESTBOOK_MODE = 'sample'
npm.cmd run dev -- --port 5185 --strictPort
```

초기 통합 때는 도구 승인 정책으로 직접 화면 캡처와 시각 검수를 하지 못했다.
이후 사용자가 원격 push·스크린샷·PR 생성을 별도로 요청했다.
새 권한 환경에서 실제 Chrome의 [데스크톱·모바일 3종 캡처](screenshots/faq-parallel/README.md)를
확인했고 글자 잘림·겹침·가로 넘침이 보이지 않았다.
원격 제출 상태는
[스크린샷·PR 카드](../.memory-bank/tasks/2026-10-15-faq-screenshots-pr.md)에 기록한다.
PR merge·운영 배포·DB 변경은 수행하지 않는다.

- [통합 카드](../.memory-bank/tasks/2026-10-15-parallel-faq-worktrees.md)
- [워크트리 A 카드](../.memory-bank/tasks/2026-10-15-faq-content-worktree.md)
- [워크트리 B 카드](../.memory-bank/tasks/2026-10-15-faq-category-worktree.md)
