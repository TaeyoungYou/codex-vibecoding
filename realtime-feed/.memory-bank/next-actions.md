# 다음 행동

최종 갱신일: 2026-10-15

[FAQ 스크린샷·PR](tasks/2026-10-15-faq-screenshots-pr.md)을 진행 중이다.
실제 화면을 확인하고 통합 브랜치·A·B를 push한 뒤 main 대상 PR을 제출한다.

[FAQ 병렬 워크트리 작업](tasks/2026-10-15-parallel-faq-worktrees.md)은 `done`이다.
두 브랜치의 커밋을 통합해 보강 질문·필터·반응형을 함께 검증했다.
`next`: [실행 예제](../docs/faq-worktree-example.md)의 비교 명령으로 변경·충돌 해결을 확인한다.
원격 push·PR·운영 반영은 필요할 때 별도 요청으로 진행한다.

[저장소 Git 동기화](tasks/2026-10-15-sync-repository.md)는 `done`이다.
원격 랜딩페이지를 보존해 통합한 main의 push와 원격 해시 일치를 확인했다.

[랜딩페이지](tasks/2026-10-14-landing-page.md) 구현과 로컬 검증은 `done`이다.
2026-10-15 fetch에서 [PR #2](https://github.com/TaeyoungYou/codex-vibecoding/pull/2)의
원격 main 병합을 확인했다. [PR 작업](tasks/2026-10-14-landing-pr.md)은 완료했다.
실제 운영 경로 검증은 남아 있다.

영상 제작은 `done`이다. [제작 계획][video-plan]에서 실제 납품·검수 결과로 연결한다.
영상 관련 `next` 후보는 사용자 피드백 수정·실기기와 실제 스피커 확인이다.

이미지 [1·2 수정](tasks/2026-10-14-revise-guestbook-images.md)은 `done`이다.
히어로와 입력 장면은 실제 웹앱 중심의 v2를 현재 선택으로 사용한다.
[생성 문서](../docs/image-generation-prompts.md)에 최종 파일·검수 결과를 기록했다.
이미지 관련 `next` 후보: 사용자 요청 시 최종 자산의 앱 적용을 검토한다.
기존 운영·출시 인수의 다음 행동은 아래에 보존한다.

1. `next`: 실제 7가지 조합·20개 초과 복구·독립 연결의 큐 동시 선점 검증을 보강한다.
   삭제 후 완료 기록 실패 재처리도 구분해 확인한다.
   재시도 대기 작업 건너뛰기와 원래 등록 순서 복귀도 함께 검증한다.
2. `next`: PRD·기존 메모리의 초기 상태 설명을 과거 시점으로 명확히 정리한다.
3. `next`: 실기기 펜·모바일 키보드·화면 읽기 프로그램을 별도 검증한다.
4. `next`: 공개 운영 주소를 공유하고 필요하면 운영 점검을 진행한다.
5. `next`: 다음 변경부터 실제 수정 파일만 선택해 commit·push하고 자동 배포 결과를 확인한다.

[샘플 UI 작업](tasks/2026-10-12-sample-guestbook-ui.md)은 완료했다.
[메모리 우선 지침](tasks/2026-10-12-memory-first-project-guidance.md)도 완료했다.
현재 [연동 작업](tasks/2026-10-12-supabase-integration.md)은 `done`이다.
진행 중·차단 작업은 없다. 새 DB 변경이 필요하면 후속 마이그레이션으로 추가한다.
[Vercel 미리보기 배포](tasks/2026-10-14-vercel-preview-deployment.md)는 완료했다.
Preview와 주요 실제 연동을 확인했고 전체 출시 인수 완료와는 구분한다.
[공개 운영 배포](tasks/2026-10-14-vercel-production-deployment.md)도 완료했다.
Vercel 인증 없이 접속되는 주소와 실제 주요 연동을 검증했다.
[GitHub push와 Vercel 자동 배포](tasks/2026-10-14-github-vercel-integration.md)도 완료했다.
main의 실제 Git 자동 운영 배포와 성공한 commit status를 확인했다.
[연동 점검](tasks/2026-10-14-supabase-audit.md)은 완료했고 추가 인수 검증은 미착수다.
[FIFO 설명](tasks/2026-10-14-cleanup-fifo-docs.md)도 완료했다.
등록 순서 FIFO로 기준을 맞췄으며 정렬 변경 마이그레이션은 필요하지 않다.

[video-plan]: ../docs/superpowers/plans/2026-10-14-realtime-guestbook-promo-video.md
