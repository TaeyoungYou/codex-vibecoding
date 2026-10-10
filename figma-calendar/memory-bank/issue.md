# 이슈 — 2026-10-09

## 해결: Vercel 공개 배포 API 404·세션 공유·공개 Host

사용자 승인으로 Node API 함수·정확한 HTTPS Origin·Secure 쿠키·암호화된 DB 공유 세션·요청 한도·5초 재조회·정적 보안 헤더를 추가해 배포했다. session 200, 미인증 events 401, 잘못된 CAPTCHA 400을 확인했고 사용자 일반 브라우저에서 실제 CAPTCHA 후 캘린더가 열린다. 실제 인증된 events GET 200도 CLI 로그에서 확인했다. 기존 일정 4개와 내용 보존, 자동 테스트 66개 및 실제 runtime DB/mock Auth 교차 서버 검사 통과.

후속 실제 검사: 사용자가 추가 성공·삭제 실패를 확인했고 CLI에도 POST 201·DELETE 400이다. Vercel 경로 id가 쿼리에도 추가되는 경우를 재현해 같은 단일 id만 허용하도록 보정했다(c39bfac). 재배포 후 사용자가 정상 삭제를 확인했다. 자동화 브라우저는 Turnstile 600010으로 막히며 공식 dummy key는 격리 환경에서만 사용한다. 공개 독립 브라우저 동기화와 대규모 부하 검사는 별도 미검증이다. 세션 128개·DB 연결 4개를 유지한다. 상세 MCP 로그 403은 동일 팀/프로젝트 공식 CLI로 대체했다. [수정 상세](../docs/vercel-deployment-review.md)를 참고한다.

## 이전: Vercel API 404 최초 점검 기록

https://codex-vibecoding-seven.vercel.app/ 는 화면만 열리고 /api/session, /api/events, /api/changes가 Vercel NOT_FOUND 404를 반환한다. 브라우저에서도 인증 연결 오류를 확인했다. 현재 로컬 전용 서버의 Host/Origin 고정, 메모리 세션, 상주 LISTEN/SSE와 DB 연결 한도도 공개 배포 전환 시 해결해야 한다. Vercel 상세 MCP는 팀 권한 403이었으나 공식 CLI로 Root Directory/Node 설정 정상, Vite 빌드와 환경 변수 목록 0개를 확인했다. Cloudflare 허용 도메인은 미확인이다. [점검 상세와 검증 범위](../docs/vercel-deployment-review.md)를 참고한다. 아래 해결 기록은 기존 로컬 앱 범위다.

## 해결: 익명 인증·Turnstile 실제 통합 검증

실제 CAPTCHA·Supabase 익명 로그인, 두 브라우저 CRUD/SSE, 탭·새로고침, 직접 DB 변경, LISTEN 복구, 서버 재시작 재인증을 확인했다. 실제 Auth 토큰 갱신·1시간 상한은 제어한 시계로 확인했으며 실제 1시간 대기와 구별한다. 격리 fixture의 오류·만료·반응형·StrictMode 검사도 완료했다. 자동 테스트는 61개다. [상세 검증](../docs/verification.md)을 참고한다.

재개 중 수정한 사항:

- 늦은 이전 Auth 401이 새 세션을 지우던 race: 상태 참조 검사로 방지, 수정 전 테스트 실패·수정 후 통과.
- 인증 중단 중 쓰기가 끝난 후 busy가 남을 가능성: mounted 상태와 활성 조회 상태를 구별해 해제, 같은 UUID 재시도 검사.
- 데스크톱에서 320px로 줄일 때 CAPTCHA overflow: 화면 폭 변경 시 위젯 재생성·이전 토큰 폐기, 실제 브라우저 재검사.
- 서버 재시작 후 첫 로그인 SESSION_REQUIRED: CAPTCHA 소비 전 거부에 한해 새 세션/CSRF로 1회 재시도, 실제 재시작에서 버튼 한 번으로 성공.
- SDK dispose가 fetch를 중단하지 않는 동작: 세션 AbortController로 진행 중 fetch도 취소.

문서와 운영 안내를 갱신했다. 기존 일정 4개와 내용 fingerprint를 보존했고 테스트 일정 잔여 0개다. 실제 인증 검증으로 익명 사용자 5개가 생성됐으며 삭제하지 않았다. 완료된 임시 인계 문서의 내용을 현재 문서로 반영하고 파일과 참조 링크를 정리했다.

## 참고: 최신 Security Advisor WARN 1건

실제 Auth 사용 이후 마지막 Advisor가 `auth_leaked_password_protection` WARN을 반환했다. [공식 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)의 비밀번호 보호 설정이며 현재 앱은 비밀번호 없는 익명 인증만 사용한다. 다른 로그인 기능/프로젝트 설정은 변경하지 않았다. 이메일/비밀번호 로그인 도입 시 검토한다. Performance Advisor는 0건이다.

## 남은 검증 범위

실제 1시간 대기, Firefox/Safari, setup:auth의 비표시 입력 대화 전체는 실행하지 않았다. 실제 설정·ACL·Auth 연결은 확인했다. 승인 기능을 막는 이슈는 없다. 익명 계정 자동 삭제는 추가하지 않았으며 [수동 관리 안내](../docs/auth-operations.md)를 따른다.

## 해결: 실제 DB 자격 증명 설정

사용자가 로컬 터미널에서 setup:db를 완료했다. 실제 전용 계정으로 check:db가 통과했고 .env.server.local의 ACL·Git 제외·실제 비밀번호 값 대조를 확인했다. 실제 Supabase→서버→브라우저 통합 검증을 완료했다. 관리자 비밀번호를 읽거나 저장하지 않았고 MCP에 비밀번호를 보내지 않았다.

### 후속 확인: 기존 관리자 비밀번호 인증 거부

사용자가 보내 준 실제 오류는 `FATAL: password authentication failed for user "postgres"`였다. 첫 `Password:`는 calendar-app의 기존 postgres DB 관리자 비밀번호이며, 새 8자 runtime 비밀번호 설정은 관리자 인증 이후다. 현재 프로젝트는 ACTIVE_HEALTHY, runtime LOGIN 가능·관리 권한 없음·비밀번호 유효기간 제한 없음이다. 기존 비밀번호를 입력해 재시도해야 한다. 잊었다면 사용자가 Dashboard Database > Settings에서 직접 재설정한다. 최근 재설정 직후의 pooler 캐시도 인증 거부 원인이 될 수 있으므로 비밀번호 불일치로 단정하지 않는다. [공식 안내](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB)

provision.ps1의 입력 안내와 실패 출력은 수정했다. 잘못된 비밀번호로 동일 오류·psql 종료 코드 2 안내·npm 종료 코드 1·env 미생성을 재현했고 긴 공통 PowerShell 예외는 제거했다. 이후 사용자 설정 완료와 실제 runtime 정상 인증을 확인했다. 앱은 서버에서만 자격 증명을 읽으며 비밀번호를 출력하지 않는다.

## 해결: setup:db 실패 / psql 없음 / 한글 깨짐

사용자 오류 보고를 재현했다. psql이 설치되어 있지 않았다. setup:tools로 공식 EDB의 17.11 클라이언트만 프로젝트 내부에 추출하고 SHA256을 확인했다. 전역 설치/DB 서비스 없이 psql --version과 비표시 프롬프트 진입을 확인했다. PowerShell 5.1에 맞춰 ps1을 UTF-8 BOM으로 저장했다.

## 해결: SELF_SIGNED_CERT_IN_CHAIN

Node 기본 trust로 실제 pooler TLS 검증이 실패했다. 공식 Supabase Studio의 CA 다운로드 URL을 확인하고 공개 CA를 확보했다. 지문/유효 기간을 검증해 실제 runtime 연결 TLS authorized=true와 정상 인증을 확인했다. 검증 비활성화 우회는 하지 않았다.

## 해결: 자동 조회 실패 후 입력 초점 유실

실제 서버 연결 중단 시 자동 조회 실패가 입력란을 disabled로 만들고 초점을 잃게 했다. 입력란의 조회 오류에 따른 disabled 조건을 제거해 초안을 계속 작성할 수 있게 했다. 추가·삭제는 조회 복구 전까지 잠근다. 회귀 테스트의 수정 전 실패와 수정 후 전체 38개 통과를 확인했다. 실제 빌드 서버 재시작·개발 LISTEN 재연결에서 초안·선택·초점을 유지했다.

## 해결: 개발 의존성 파일 404

Vite React 의존성이 /@fs 경로를 사용해 일괄 차단에 걸렸다. 개발에서만 node_modules 내부 경로를 허용하고 fs strict/deny를 유지했다. 다른 /@fs·env·server·migration 요청 차단과 개발 화면 동작을 함께 확인했다. Vite 8의 server.ws 옵션을 사용한다.

## 참고: Performance Advisor INFO / TEMP 권한

초기 비어 있는 테이블의 날짜별 인덱스에 [unused_index INFO](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)가 있었으나 실제 조회 후 사라졌다. 필요한 인덱스는 유지한다. 최신 Security·Performance Advisor 모두 0건이다.

Postgres PUBLIC에서 세션 전용 TEMPORARY 권한을 받는다. 지속적인 스키마/테이블 DDL과 앱 테이블 변경은 거부됨을 실제 확인했다. 다른 Supabase 역할까지 바꾸는 PUBLIC 전체 권한 변경은 하지 않았다.
