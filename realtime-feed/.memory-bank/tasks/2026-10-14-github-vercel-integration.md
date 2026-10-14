# GitHub push와 Vercel 자동 배포 연결

최종 갱신일: 2026-10-14
상태: `in progress`
적용 범위: 방명록 완료 작업의 GitHub 동기화와 전용 Vercel Git 연결

## 목표와 근거

사용자가 GitHub push와 Vercel 연동을 명시 요청했다.
[PRD][prd]·[구현 계획][plan]의 전용 대상·부모 저장소 배포 기준을 따른다.
이 요청은 방명록 관련 파일의 commit·push와 전용 프로젝트 자동 배포 연결을 포함한다.

## 할 일과 완료 조건

- 관련 완료 작업 전체를 선택하고 환경·비밀·브라우저 산출물을 제외한다.
- 원격 브랜치와 인덱스를 확인하고 값 검사·staged diff 검사를 통과한다.
- GitHub에 push하고 원격 main과 로컬 HEAD가 같은지 확인한다.
- 전용 Vercel의 Root Directory·빌드 설정·Git 저장소·main 브랜치를 맞춘다.
- 실제 push로 자동 생성된 배포의 커밋·Ready·공개 화면을 확인한다.
- README와 작업 기록에 결과·미검증을 정리하고 기록 변경도 동기화한다.

다른 앱·DB 구조·비밀 파일은 변경하거나 포함하지 않는다.
기존 통과한 기능 검사는 반복하지 않고 Git 기반 새 배포 결과를 확인한다.

## 실제 결과와 다음 행동

완료된 운영 배포와 최신 메모리를 확인했다.
현재 main은 원격보다 기존 방명록 문서 커밋 4개가 앞서 있으며 분기 차이는 없다.
방명록 구현·설정·메모리는 아직 대부분 untracked다.
관련 파일 88개를 선택해 실제 연결 값·작업자 비밀·OIDC 값과 경로 경계를 검사했다.
값 발견 0개이며 기존 메모리 스킬 계획의 줄 끝 공백 한 곳만 정리했다.
staged diff 검사를 통과한 `1011005`로 첫 push를 완료했고 원격 main과 일치한다.
전용 Vercel의 Root Directory·Vite·Node.js 24·빌드·출력을 설정했다.
GitHub 저장소 연결과 운영 브랜치 main을 실제 조회로 확인했다.
README에 자동 배포 사용 방법과 기존 CLI 절차의 적용 시점을 구분했다.
다음은 기록 변경을 push해 자동 배포의 커밋·Ready·공개 화면을 확인하는 것이다.

[prd]: ../../docs/superpowers/specs/2026-10-11-realtime-guestbook-design.md
[plan]: ../../docs/superpowers/plans/2026-10-11-realtime-guestbook.md
