# 현재 맥락

최종 갱신일: 2026-10-15

[FAQ 스크린샷·PR](tasks/2026-10-15-faq-screenshots-pr.md)은 `in progress`다.
사용자가 완료 결과의 원격 push와 실제 화면 스크린샷을 포함한 PR을 요청했다.

[FAQ 병렬 워크트리 작업](tasks/2026-10-15-parallel-faq-worktrees.md)은 `done`이다.
A는 내용 보강, B는 카테고리 필터를 같은 파일에서 독립 구현·커밋했다.
같은 데이터 영역의 충돌을 해결해 보강 문답 6개와 필터를 통합했다.
통합 브랜치는 demo/faq-parallel이며 원래 두 워크트리와 브랜치를 보존했다.
빌드·단위 22개·관련 실제 Chrome E2E 6개를 통과했다. push·운영 배포는 하지 않았다.
과정과 커밋 비교는 [실행 예제](../docs/faq-worktree-example.md)에 있다.

[저장소 전체 Git 동기화](tasks/2026-10-15-sync-repository.md)는 `done`이다.
원격 main의 랜딩페이지와 로컬 이미지·영상 기록을 모두 보존해 통합했다.
110개 파일의 소스 커밋 `4fabd1a`를 push하고 실제 원격 main과 해시 일치를 확인했다.
임시 브라우저 기록과 실행 로그만 로컬에 남겼다. 다음은 필요한 수정과 인수 검증이다.

[랜딩페이지](tasks/2026-10-14-landing-page.md)는 `done`이다.
`/`에 소개·표현 미리보기·이용 방법·FAQ를 추가하고 `/guestbook`으로 연결했다.
소개용 예시는 실제 피드와 분리하며 소개에서는 인증·API 요청을 시작하지 않는다.
빌드·단위 22개·E2E 4개, 8개 화면 폭과 키보드·경로 이동을 확인했다.
Vercel 직접 진입 rewrite를 추가했다. 후속 요청으로
[PR #2](https://github.com/TaeyoungYou/codex-vibecoding/pull/2)를 생성했다.
[PR 작업](tasks/2026-10-14-landing-pr.md)은 `done`이다.
2026-10-15 fetch에서 PR #2가 원격 main에 병합된 것을 확인했다.
실제 운영 경로 검증과 기존 인수 공백은 남아 있다.

[홍보영상 제작](tasks/2026-10-14-produce-promo-video.md)은 `done`이다.
사용자의 계획 기반 제작 요청으로 이미지 3종·Remotion·음악과 효과음을 연결했다.
30초·1920×1080·30fps·900프레임 MP4와 포스터를 output/video/에 저장했다.
타입·형식·실제 재생·전체 디코드·18개 프레임과 자산·신호 검사를 통과했다.
영상 소스는 video/realtime-guestbook-promo/에 있고 Studio는 로컬 5188에서 실행 중이다.
스피커 청취·실기기·배포는 미검증이며 다음은 필요할 때 영상 피드백 반영이다.
아래는 이전 이미지·연동·배포 작업의 완료 이력이다.

[이미지 1·2 수정](tasks/2026-10-14-revise-guestbook-images.md)은 `done`이다.
사용자가 종이 배경·종이 메모 장면의 웹앱 관련성이 약하다고 지적했다.
실제 카드 3종의 히어로와 실제 작성 모달의 입력 장면을 내장 image_gen으로 만들었다.
현재 선택은 hero-background-v2.png·leaving-a-note-v2.png이며 시각 검수했다.
생성 문서를 갱신하고 이전 PNG·프롬프트 기록을 보존했다.
포트폴리오는 기존 실제 앱 샘플 화면 참조 이미지를 사용한다.
운영 데이터·앱 코드는 변경하지 않았으며 앱에 이미지 적용은 별도 작업이다.
아래는 이전 연동·배포·Git 작업의 완료 이력이다.

[GitHub push와 Vercel 자동 배포][git-integration]는 `done`이다.
관련 완료 작업을 GitHub에 올리고 전용 Git 저장소·Root Directory·main을 연결했다.
main push의 GitHub commit status success와 해당 Git 소스 자동 배포 Ready를 확인했다.
고정 운영 주소의 공개 방명록 화면도 확인했다. 자세한 사용 방법은 README에 있다.
다음은 필요한 기능 수정·운영 점검과 남은 출시 인수·실기기 검증이다.

[공개 운영 배포][production]는 `done`이다.
사용자의 미리보기 확인 후 같은 앱을 Production 환경으로 배포했다.
Vercel 인증 없는 운영 주소와 실제 두 익명 세션의 주요 연동·파일 정리를 통과했다.
운영 URL과 배포 안내는 README에 있다. 미리보기 보호와 기존 데이터를 보존했다.
다음은 주소 공유·필요한 운영 점검과 남은 출시 인수·실기기 검증이다.
운영 배포 완료 당시에는 Git 자동 배포 연결·commit·push를 진행하지 않았다.

사용자가 요청한 [Vercel 미리보기 배포][deployment]는 `done`이다.
Preview Ready와 실제 두 익명 세션·미디어·실시간·파일 정리 검증을 통과했다.
미리보기 URL과 접근 안내는 README에 있다. Vercel 로그인 보호를 유지한다.
새 프로젝트의 초기 Production 배포는 제거했고 최종 Preview 1개만 남겼다.
미리보기 완료 당시 공개 운영 배포·Git 자동 배포 연결·push는 진행하지 않았다.
다음은 사용자 화면 확인과 기존 전체 인수·실기기 검증 공백의 보완이다.

사용자 요청의 [Supabase 연동 점검](tasks/2026-10-14-supabase-audit.md): `done`.
실제 API 2개·독립 브라우저 1개·파일 4개 정리와 기존 데이터 보존을 재확인했다.
주요 연동은 통과했으며 일부 인수 검사가 빠져 있다.
큐 선점 정렬 차이는 사용자가 등록 순서 FIFO를 선택해 문서 기준 변경으로 해소했다.
[FIFO 설명 작업](tasks/2026-10-14-cleanup-fifo-docs.md)은 `done`이다.
제품 코드와 DB 구조는 수정하지 않았다. 다음은 남은 검증 공백의 보완이다.
아래 연동 완료 기록은 주요 구현 범위이며 전체 출시 인수를 뜻하지 않는다.

Supabase·API·익명 인증 연동 상태: `done`.
[연동 카드](tasks/2026-10-12-supabase-integration.md)에 구현과 검증을 정리했다.
전용 realtime-feed에 DB 3개·함수 2개·익명 인증·Storage·Realtime·Cron을 적용했다.
공개 연결 설정과 작업자 비밀은 Git 제외 환경 파일에만 있다.
실제 두 세션의 저장·권한·그림 재편집·실시간 복구와 파일 삭제를 확인했다.
다음은 사용자 화면 확인과 필요한 작은 보완이다. 차단된 작업은 없다.
아래 지침·샘플 UI 내용은 완료된 이전 작업 이력이다.

이전 요청은 `AGENTS.md`의 문서 참조와 기능 수정·구현 전 메모리 우선 절차였다.
상태: `done`. [지침 작업 카드](tasks/2026-10-12-memory-first-project-guidance.md)
프로젝트 지침과 스킬의 읽기 순서를 맞추고 문서 검사를 통과했다.
앞으로 기능 수정·구현 전 스킬 → 메모리 6개 → 관련 카드 → 기준 문서 순서로 읽는다.

직전 작업에서 사용자가 `guestbook-memory-bank`를 호출하며 UI 구현을 요청했다.
승인된 B안의 중앙 단일 열·흑백 라이트 테마를 기준으로 샘플 UI를 구현한다.
React·TypeScript·Vite·Tailwind·shadcn/Radix 기반 샘플 UI를 구현했다.
글·이미지·그림 작성과 수정·삭제, 첨부 확대, 미저장 변경 확인이 현재 탭에서 동작한다.

샘플 UI 상태: `done`. [작업 카드](tasks/2026-10-12-sample-guestbook-ui.md)
개발 화면은 `http://127.0.0.1:5173`이다. 서버가 종료됐으면 `npm.cmd run dev`로 실행한다.
당시에는 Vercel도 미검증이었으나 이번 미리보기의 주요 검증은 통과했다.
실기기 펜·모바일 키보드·화면 읽기 프로그램은 여전히 미검증이다.

[deployment]: tasks/2026-10-14-vercel-preview-deployment.md
[production]: tasks/2026-10-14-vercel-production-deployment.md
[git-integration]: tasks/2026-10-14-github-vercel-integration.md
