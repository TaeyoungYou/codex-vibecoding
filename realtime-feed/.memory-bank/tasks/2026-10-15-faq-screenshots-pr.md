# FAQ 결과 스크린샷과 원격 PR

최종 갱신일: 2026-10-15
상태: `done`
적용 범위: 완료된 FAQ의 실제 화면 캡처·원격 브랜치 push·main 대상 PR 생성

## 목표와 근거

사용자가 원격 push·결과 스크린샷·PR 생성을 명시 요청했다.
[병렬 구현 카드](2026-10-15-parallel-faq-worktrees.md)의 완료 결과를 제출한다.

## 할 일과 완료 조건

- 실제 Chrome에서 데스크톱 전체·첨부 필터·모바일 FAQ를 캡처하고 이미지를 확인한다.
- 스크린샷을 커밋하고 PR 본문에서 이미지를 볼 수 있게 연결한다.
- 통합 브랜치와 A·B 브랜치를 원격에 올려 예제의 비교 경로를 유지한다.
- 실제 원격 해시·PR의 base/head·열린 상태·이미지 링크를 확인한다.
- 코드 변경이 없으면 이미 통과한 앱 검사를 반복하지 않는다.
- PR merge·운영 배포·DB 변경은 수행하지 않는다.

## 실제 결과와 다음 행동

최신 원격 main과 기준 일치·GitHub CLI 연결·기존 미리보기 서버를 확인했다.
실제 Chrome으로 1440px 전체·첨부 답변 펼침과 390px 전체 FAQ를 캡처했다.
[스크린샷 3종](../../docs/screenshots/faq-parallel/README.md)을 직접 확인했다.
글자 잘림·겹침·가로 넘침이 없고 런타임 오류·백엔드 요청은 0개다.
통합 demo/faq-parallel과 A·B 브랜치를 원격에 atomic push했다.
스크린샷 커밋 `e39ba6c`와 실제 원격 해시가 일치했다.
[PR #3](https://github.com/TaeyoungYou/codex-vibecoding/pull/3)을
main 대상으로 생성하고 본문에 PNG 3종을 포함했다.
원격 이미지 3개 모두 HTTP 200·image/png를 확인했다.
문서 7개 Markdown·스테이징 공백 검사도 통과했다.
PR merge·운영 배포는 하지 않았다. 다음은 PR 검토·자동 검사 확인이다.
