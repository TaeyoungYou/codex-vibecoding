# Supabase 연동 점검

최종 갱신일: 2026-10-14
상태: `done`
적용 범위: 현재 코드·원격 설정·실제 API와 브라우저의 연동 정상 여부

## 목표와 근거

사용자가 Supabase 관련 스킬로 기존 구현과 연동을 점검하도록 요청했다.
[연동 계획][plan]과 [이전 검증 기록][verification]을 현재 상태와 대조한다.

## 할 일과 완료 조건

- 코드·마이그레이션·권한·함수·예약 작업을 읽고 원격 상태와 대조한다.
- 실제 스크립트의 타입·빌드·단위·API·독립 브라우저 검사를 실행한다.
- 검증 데이터만 생성·정리하며 기존 데이터와 다른 프로젝트를 보존한다.
- 실패·주의·미검증 항목과 근거를 기록하면 점검을 완료한다.

제품 정책 변경·DB 구조 변경·배포·관련 없는 파일 수정은 이번 점검에서 제외한다.
예상 변경 파일은 이 카드와 관련 프로젝트 메모리 기록이다.

## 실제 결과

Supabase와 Postgres best practices 스킬을 적용했다.
현재 공식 Changelog·RLS·익명 인증·Storage·Advisor 문서도 확인했다.
전용 realtime-feed는 정상 상태이며 앱·테스트 대상이 일치한다.
로컬 마이그레이션 3개의 버전이 원격 이력과 같고,
DB 함수 본문 34개와 배포 함수의 소스 4개도 로컬과 일치했다.

| 검사 | 결과 |
| --- | --- |
| production 빌드와 TypeScript 검사 | 통과 |
| 단위 검사 | 22개 통과, 내장 PostgreSQL 포함 |
| 실제 API | 2개 통과, skipped 없음 |
| 테스트 응답 기반 Chromium | 2개 통과 |
| 실제 독립 Chromium 세션 | 1개 통과, 390px 세션 포함 |
| npm audit | 취약점 0개 |
| 공개 조회·비공개 획·UUID 소유권·RPC 권한 | 통과 |
| 미인증 정리 함수 호출 | HTTP 401 |
| Cron·pg_net·실제 Storage 삭제 | HTTP 200, 파일 3개와 만료 파일 1개 삭제 |
| Git 대상 값 패턴·환경 파일 제외 | 83개 검사, 발견 0개 |
| 점검 문서·상대 링크 | Markdown 5개 오류 0개, 링크 17개 통과 |

익명 인증과 재방문, 이미지·그림 저장과 재편집, 타인 변경 거절을 확인했다.
열린 초안을 보존했고 오프라인 중 삭제도 재연결 후 반영됐다.
이번 미디어 경계 검사 파일 1개만 25시간으로 조정해 정상 만료 흐름을 검증했다.
검사 종료 시 기존 게시물 1개는 보존됐고 객체·준비 파일·미완료 작업은 0개였다.
테스트 익명 계정과 프로필은 남으며 운영 정리는 별도다.
점검 구간의 제한된 오류 패턴 조회에서 중대한 런타임 이벤트는 발견하지 않았다.
제품 코드·DB 구조·배포 설정은 변경하지 않았다.

## 발견한 차이와 주의 사항

- 낮은 우선순위: [큐 선점 코드][claim]는 생성 시각만 정렬한다.
  점검 당시 PRD는 다음 시도 시각·생성 시각·ID 순서를 요구했다.
  이후 사용자가 등록 순서 FIFO와 문서 반영을 선택해 이 차이는 해소됐다.
  [FIFO 설명 작업](2026-10-14-cleanup-fifo-docs.md)에 후속 결정을 기록했다.
  제품 코드·기존 마이그레이션·원격 DB는 변경하지 않았다.
- 보안 Advisor: 익명 접근 경고 3개, 유출 비밀번호 보호 비활성 경고 1개.
  본인 프로필은 UUID 정책이고 Cron 스키마는 방문자 USAGE 권한이 없다.
  실제 방문자의 Cron·정리 RPC·비공개 획 접근 거절도 통과했다.
  비공개 테이블의 정책 없음 INFO 3개는 직접 접근 차단 설계와 일치한다.
  [익명 접근 경고 안내][anonymous]와 [비밀번호 보호 안내][password]를 참고한다.
- 성능 Advisor: 미사용 작성자 인덱스 INFO 1개.
  이번 조회만으로 인덱스 삭제 필요성을 판단하지 않았다. [안내][index]
- production JS 약 617 kB의 기존 chunk 경고가 남는다.
- PRD 도입부의 제품 코드 없음 설명과 일부 메모리는 초기 상태의 표현이 남아 있다.
  최신 README·현재 파일·연동 기록이 실제 구현 상태를 보여준다.

## 미검증과 다음 행동

현재 자동 검사에는 7가지 콘텐츠 조합 전체의 실제 저장,
20개 초과 조회 범위의 실제 브라우저 재접속,
독립 DB 연결의 동시 선점·삭제 후 완료 기록 실패 재처리가 모두 포함되지는 않는다.
배포·실제 펜·모바일 키보드·화면 읽기 프로그램·장시간 장애·부하는 미검증이다.
따라서 주요 연동 통과와 전체 PRD 출시 인수 완료는 구분한다.
큐 정렬 차이는 후속 FIFO 문서 결정으로 해소됐다.
다음은 빠진 검증 보강과 초기 상태 문구 정리다.

[plan]: ../../docs/superpowers/plans/2026-10-12-guestbook-supabase-integration.md
[verification]: ../verification-log.md
[claim]: ../../supabase/migrations/20261013165404_guestbook_media_cleanup.sql
[anonymous]: https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins
[password]: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
[index]: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
