# 구현 및 검증 기록 — 2026-10-09

## 최신: Vercel 수정 배포

2026-10-09 사용자 승인으로 API 함수·공개 HTTPS 검사·암호화된 공유 세션·5초 재조회를 구현해 Production에 배포했다. 최초 수정 배포 dpl_6c3z7y6gSNmCGttsRcJE85aN9D8w는 MCP READY다. 사용자가 일반 브라우저에서 실제 CAPTCHA 이후 캘린더 열림을 확인했다. CLI 요청 로그에서 실제 인증된 events GET 200을 확인했다.

| 검사 | 결과 |
| --- | --- |
| 자동 테스트·린트·빌드 | 8개 파일/66개 통과, lint/build 통과 |
| 실제 runtime DB + mock Auth | 두 서버 세션 공유, 동시 갱신 1회, 토큰 암호화, CSRF, CRUD/멱등성, 날짜 충돌, Auth 장애 복구, 만료 차단 통과 |
| check:db | 실제 runtime 권한·TLS·CRUD·UPDATE/DDL/auth.users 접근 거부, 테스트 데이터 rollback |
| check:security·audit | 실제 비밀번호/publishable key/세션 키 유출 대조·파일 ACL·Git 제외 통과, 취약점 0건 |
| 공개 HTTP | session 200, 미인증 events 401, 잘못된 CAPTCHA 400, env/server/Git 경로 404 |
| 공개 헤더·쿠키 | 정적 CSP/nosniff, API no-store, Secure/HttpOnly/SameSite=Strict |
| DB | 기존 일정 4개와 fingerprint 6af5130e07d8243566d0fff35289b96b 보존, 새 두 테이블 FORCE RLS·anon/authenticated 접근 거부 |
| Advisor | Performance 0건, 기존 password protection WARN 1건 유지 |

자동화 Chromium은 Turnstile 600010으로 실제 로그인 검증을 완료하지 못했다. 사용자가 일반 브라우저 로그인 성공을 확인했으며, 공개 배포 실제 일정 추가·삭제·독립 브라우저 동기화는 아직 미검증이다. 5초 재조회와 기존 연결 한도 4를 사용하며 대규모 부하 검사는 하지 않았다. [수정 상세와 최초 점검](vercel-deployment-review.md)을 참고한다.

## 이전: 공개 Vercel 배포 최초 점검

기존 로컬 통합 검증과 별도로 공개 배포를 검사했다. https://codex-vibecoding-seven.vercel.app/ 의 화면은 200이지만 session/events/changes API는 모두 404다. Chromium에서도 인증 연결 오류를 확인했다. 로컬 테스트 61개·린트·빌드·보안 검사는 다시 통과했다. 앱/DB/배포 설정을 변경하지 않았으며 공개 배포의 인증·CRUD·SSE는 통과하지 못했다. [발견 사항과 미검증 범위](vercel-deployment-review.md)를 참고한다. 아래 내용은 기존 로컬 앱 검증 기록이다.

Turnstile와 Supabase 익명 인증의 실제 통합 검증을 완료했다. 아래 최신 결과는 2026-10-09 America/Toronto 기준이다. 뒤의 2026-10-07 결과는 인증 도입 이전 기록으로 유지한다.

## 2026-10-09 인증 구현과 수정

- 서버 전용 SDK로 signInAnonymously(captchaToken), getUser, 토큰 갱신을 처리한다. 로컬 세션별 SDK를 격리하고 토큰은 서버 메모리에만 둔다. 성공 시 로컬 cookie/CSRF를 교체하고 최대 1시간을 적용한다.
- 일정 API·SSE를 인증으로 보호한다. 미인증과 Auth 장애를 구별하고 서버 재시작·만료 시 재인증한다. React는 날짜·목록·초안을 메모리에 보존한다.
- 이전 인증의 늦은 401이 새 인증을 폐기하는 race를 회귀 테스트로 재현·수정했다.
- 인증 중단 중 쓰기가 끝나도 busy를 해제하도록 수정했다. 같은 UUID 재시도·초안 보존을 검사했다.
- 창을 320px로 줄일 때 normal CAPTCHA가 넘치는 현상을 실제 브라우저에서 재현했다. 폭 변경 시 위젯을 다시 만들고 이전 토큰/callback을 폐기한다.
- 실제 서버 재시작 후 첫 로그인에서 SESSION_REQUIRED가 발생하는 문제를 발견했다. CAPTCHA 소비 이전 거부에 한해 새 로컬 세션으로 1회 재시도한다. 다른 401의 CAPTCHA 재제출과 미인증 일정 쓰기 자동 재시도는 하지 않는다.
- 세션 폐기 시 SDK dispose와 함께 진행 중 Auth fetch도 취소한다.

### 자동 검사

| 검사 | 결과 |
| --- | --- |
| 환경 | Windows PowerShell, Node 24.12.0, npm 11.10.1 |
| npm.cmd test | 7개 파일, 61개 통과 |
| npm.cmd run lint / build | 통과, 공개 source map 없음 |
| npm.cmd run check:db | 실제 runtime 로그인·TLS·CRUD·멱등 재시도·UPDATE/DDL/권한 위임/auth.users 접근 거부, fixture 데이터 rollback |
| npm.cmd run check:security | 실제 DB 비밀번호·publishable key 값 대조, Windows ACL·Git 제외·소스/번들/Git diff 검사 통과 |
| npm.cmd audit --json | 취약점 0건 |
| PowerShell parser | setup.ps1·setup-auth.ps1 구문 오류 0개, 기존 BOM 유지 |
| git diff --check | 오류 없음, README의 일반 LF/CRLF 안내만 있음 |

### 실제 앱·실제 Supabase 검증

`node server/index.js`/`npm start`의 빌드 실행과 실제 설정을 사용했다. CAPTCHA secret·Supabase 설정·migration은 변경하지 않았다. 실제 Turnstile이 자동으로 검증을 완료한 후 입장 버튼을 눌렀으며, 챌린지 우회나 dummy key 교체는 없었다.

| 검사 | 결과 |
| --- | --- |
| 실제 CAPTCHA → 익명 Auth | 두 독립 Chromium 컨텍스트 모두 로그인 200, 인증 상태 authenticated |
| 브라우저 응답 | session은 csrfToken/authStatus/turnstileSiteKey만 포함, Auth 토큰 없음, document.cookie로 로컬 세션 쿠키 읽기 불가 |
| 실제 CRUD·SSE | 한 브라우저의 POST 201/DELETE 200이 다른 브라우저에 자동 반영 |
| 새로고침·같은 브라우저의 다른 탭 | CAPTCHA 재입장 없이 세션 공유, DB 일정 재조회 |
| MCP 직접 INSERT/UPDATE/DELETE | 실제 화면에 자동 반영, 작성 초안·선택·초점 보존 |
| 실제 LISTEN backend 종료 | 종료 대상 하나 확인 후 종료, 연결 복구 및 검사 일정 표시, 초안·초점 유지 |
| 실제 서버 재시작 | 재인증 화면으로 전환, 버튼 한 번으로 SESSION_REQUIRED 401 → session 200 → login 200 복구 |
| 서버 중단 중 DB 변경 | 재인증 후 재조회해 반영, 초안·선택·초점 유지 |
| 앱 JavaScript 오류 | 독립 정상 로그인/CRUD 컨텍스트 pageerror 0개 |
| 기존 일정 보존 | 시작·종료 모두 4개, id/date/title/created_at의 정렬된 집계 fingerprint 동일 |
| 검사 데이터 | 브라우저 추가 UUID와 직접 변경 UUID 3개만 삭제, 잔여 0개 |
| 익명 계정 | 시작 0개 → 종료 5개, 30일 초과 0개. 실제 로그인/재인증 검증으로 생성했으며 임의 삭제하지 않음 |

Cloudflare iframe의 PAT 요청·개발자 경고와 의도적인 서버 중단/401의 콘솔·네트워크 오류가 있었다. 전체 콘솔 오류가 0개라고 보고하지 않는다. 애플리케이션 pageerror와 외부 CAPTCHA 진단을 구별한다.

### 실제 Auth + 제어한 서버 시계

Git 제외 artifacts/auth-live-clock.mjs에서 기존 Auth service·Express·pg와 실제 환경 설정을 사용했다. HTTP 관리 엔드포인트는 만들지 않고 로컬 stdin 명령만으로 Auth service에 주입한 시계를 이동했다. SDK 요청과 Supabase 토큰은 실제이며, runtime 코드나 실제 프로젝트 설정을 변경하지 않았다.

- 실제 CAPTCHA로 로그인한 다음 토큰 만료 55초 전을 가리키게 했다. 실제 refreshSession 성공과 갱신 후 getUser·authenticated 응답을 확인했다.
- 이어 로컬 1시간 상한을 넘겼을 때 입장 화면·SSE 종료(live 0)·초안·선택 보존을 확인했다.
- 이는 **실제 Auth 요청과 제어한 시계의 검증**이다. 실제로 1시간 대기한 장시간 검사가 아니다. 시계와 실제 Auth 토큰 만료 시간의 차이 때문에 refresh 호출 횟수를 자연 시간 운영 결과로 해석하지 않는다. 동시 갱신 single-flight는 별도 자동 테스트로 확인했다.

### 격리 fixture 브라우저 검증

tests/fixtures/browser-server.js의 메모리 repository·mock Auth·공식 Cloudflare dummy site key를 사용했다. 실제 DB/Auth 성공 결과와 구별한다.

- 인증 만료·장애 시 SSE 0개, 재인증/연결 확인 후 초안·선택·입력 초점 복원.
- 두 탭의 추가/삭제 자동 반영, 새로고침 후 인증 유지, localStorage에 일정/토큰 미저장.
- CAPTCHA script 요청 차단 시 한국어 오류·입장 버튼 잠금, 차단 해제와 재시도로 복구.
- 320/390/1280px 및 창 너비 변경에서 가로 넘침 없음, 키보드 Enter로 월 이동.
- 개발 StrictMode에서 SSE live/maximum 1개, 인증 중단 중 0개. 캡처는 Git 제외 artifacts/auth-320.png·auth-390.png·auth-1280.png에 보관.

### Advisor와 남은 검증 범위

마지막 Performance Advisor는 0건이다. Security Advisor는 최초 0건이었으나 실제 Auth 사용 후 `auth_leaked_password_protection` WARN 1건을 반환했다. [유출된 비밀번호 차단 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)에 관한 프로젝트 설정이다. 현재 앱은 비밀번호를 받지 않는 익명 인증만 사용하므로 이 흐름에는 적용되지 않는다. 프로젝트의 다른 로그인 설정을 임의 변경하지 않았다. 이메일/비밀번호 로그인을 추가할 경우 해당 보호 설정을 검토해야 한다.

setup:auth의 실제 비표시 입력 대화 전체는 재실행하지 않았다. 기존 설정·ACL·실제 Auth 성공은 확인했다. setup:db를 검증 목적으로 다시 실행하거나 비밀번호를 변경하지 않았다. Firefox/Safari와 실제 1시간 대기는 미검증이다. [수동 운영 안내](auth-operations.md)에 익명 계정 누적과 정리 절차를 적었다. 사용자의 기존 일정·적용 migration·서버 환경 값은 유지했으며 검사 프로세스는 모두 종료했다. 커밋/stage는 수행하지 않았다.

## 2026-10-07 인증 도입 이전 기록

React·로컬 API·DB migration·비표시 초기 설정을 구현했다. 사용자의 setup:db 완료 이후 실제 runtime 계정·TLS·파일 ACL·DB→서버→브라우저 통합 검증을 수행했다. 다음 내용은 당시 버전의 기록이다.

## 코드·설치

| 항목 | 실제 결과 |
| --- | --- |
| 환경 | Windows PowerShell, Node 24.12.0, npm 11.10.1 |
| 재현 설치 | npm ci 성공, 정확한 버전과 package-lock.json 사용 |
| 자동 테스트 | 5개 파일, 38개 통과: 날짜·HTTP·React·API 재시도·LISTEN/SSE 정리·조회 실패와 복구 중 초점 유지 |
| 린트·빌드 | npm run lint / npm run build 통과 |
| 의존성 audit | 알려진 취약점 0건, High/Critical 0건 |
| 설치 스크립트 | lockfile의 hasInstallScript는 macOS용 선택 의존성 fsevents 2.3.3뿐. Windows 설치에는 포함되지 않음 |
| Git 검사 | 프로젝트 범위 diff --check 통과. unrelated 파일은 변경·stage하지 않음. 커밋은 실행하지 않음 |

테스트는 월요일 시작 4·5·6주, 윤년·연도 경계, 실제 날짜 검증, 중복 제목, HTML 형태 제목의 텍스트 렌더링, UUID 재시도, 다른 날짜 삭제 충돌, 이전 날짜의 늦은 응답 무시, 읽기/쓰기 실패 시 입력·목록 보존, StrictMode 정리, SSE 공유·재연결·알림 합침을 포함한다.

## 실제 Supabase DB 권한

calendar-app / fnqefwbxqtanhnfpxrml의 PostgreSQL 17.11에서 최초 MCP 관리 연결의 SET LOCAL ROLE 검사와 후속 실제 calendar_runtime 네트워크 로그인을 각각 확인했다. 후속 npm run check:db는 저장된 전용 자격 증명·검증된 공개 CA로 성공했으며 CRUD·재시도·UPDATE/DDL/권한 위임/auth.users 접근 거부를 검사했다. 권한 검사 데이터는 rollback했고 브라우저 QA 데이터는 해당 UUID만 삭제했다. 검증용 레코드 잔여 수는 0개다.

| 검사 | 결과 |
| --- | --- |
| calendar_runtime SELECT·INSERT·DELETE | 실제 성공 |
| calendar_runtime UPDATE | insufficient_privilege로 거부 |
| 테이블 DROP·private 테이블 CREATE·schema CREATE | 실제 거부, 테스트 transaction rollback |
| auth.users 조회 | 실제 거부 |
| 권한 위임 | SELECT/INSERT/DELETE WITH GRANT OPTION 모두 없음 |
| 관리자·역할/DB 생성·RLS 우회·복제 권한 | 모두 false |
| 다른 역할 멤버십 | 0개 |
| 테이블 소유/RLS | postgres 소유, RLS 및 FORCE RLS 활성화 |
| anon / authenticated 조회·추가·삭제 | SET LOCAL ROLE로 모두 실제 거부 |
| Unicode 공백 제목 | non-breaking space만 있는 제목 DB CHECK 거부 |

Postgres의 기존 PUBLIC 권한에서 TEMPORARY 권한을 받기 때문에 런타임은 세션 전용 임시 테이블을 만들 수 있다. 지속적인 테이블/스키마 생성과 앱 테이블 DDL은 거부된다. 다른 Supabase 역할에 영향을 주는 PUBLIC 전체 권한 변경은 하지 않았다.

공개 publishable 키만 개발용 Node 메모리에서 사용해 실제 Data API GET/POST/DELETE를 호출했다. calendar_private schema를 지정한 세 요청 모두 HTTP 406 / PGRST106으로 거부되어 private schema가 Data API에 노출되지 않음을 확인했다. 이 HTTP 결과는 RLS 검사와 구별하며, anon/authenticated의 schema 및 SELECT/INSERT/DELETE grants 없음도 별도로 재확인했다. 키를 앱·파일·브라우저 클라이언트·로그에 넣지 않았다.

두 적용 migration의 원격 버전·이름과 SQL 전체를 로컬 파일과 대조했다. 줄바꿈과 끝 공백을 제외한 SQL이 일치한다.

- 20261007215214_secure_calendar.sql
- 20261007215806_allow_calendar_role_verification.sql

후속 migration은 postgres 관리 멤버십의 SET ROLE만 허용했다. runtime에 관리자 멤버십을 부여하지 않았다. 적용된 SQL은 수정하지 않았다.

최종 Security Advisor·Performance Advisor 모두 지적 0건이다. 초기 unused_index INFO는 실제 날짜별 조회 후 사라졌으며 필요한 인덱스는 유지했다.

## 브라우저 검증

### 실제 Supabase 연결 후 검증

Playwright Chromium의 두 독립 컨텍스트와 실제 전용 계정·Express·Supabase Postgres를 사용했다. 메모리 fixture가 아닌 실제 앱 실행 경로로 검사했다.

| 항목 | 실제 결과 |
| --- | --- |
| 브라우저 일정 추가·삭제 | 두 브라우저에 자동 반영, POST 201 / DELETE 200 |
| 새로고침 | DB에 저장된 일정 유지 |
| MCP의 직접 INSERT·UPDATE·DELETE | 두 화면 모두 자동 재조회·반영 |
| 실제 빌드 서버 종료·재시작 | 단절 안내, 중단 중 DB INSERT가 재연결 후 두 화면에 복구됨 |
| 개발 모드 LISTEN 연결 종료 | 해당 runtime LISTEN backend 하나를 종료, 연결 상태 복구와 중간 변경 재조회 확인 |
| 입력·선택·초점 | 정상 변경 및 조회 실패·서버 재시작 후 모두 유지 |
| StrictMode·날짜 변경 | 실제 개발 모드에서 SSE live/maximum 1개, 연결 누적 없음 |
| 320px / 390px / 1280px | 실제 DB 화면 가로 넘침 없음 |
| 콘솔 | 정상 빌드/개발 흐름 오류 0건. 의도적인 서버 중단의 연결 거부 오류는 별도 기록 |
| 공개 파일 방어 | 빌드/개발 모두 env·server·script·migration·CA·도구·외부 /@fs 요청 404 |
| 최종 정리 | 검사 UUID 잔여 0개, 검증 서버 종료 |

실제 재연결 검사에서 자동 조회 실패가 입력란을 disabled로 만들어 초점을 잃는 문제를 발견했다. 입력란은 계속 작성 가능하게 유지하고 추가·삭제는 조회 복구 전까지 잠그도록 수정했다. 수정 전 회귀 테스트의 실패를 확인한 뒤 38개 전체 테스트와 실제 빌드/개발 재연결 검사에서 입력·선택·초점 유지를 확인했다.

### 초기 메모리 fixture 검증

초기 검사에서는 실제 React와 Express 요청 방어·SSE에 QA 전용 메모리 repository를 연결했다. 아래 결과는 실제 DB 연결 이후의 표와 구별한다. fixture는 앱 실행 경로에 포함되지 않으며 검사 후 종료했다.

| 항목 | 결과 |
| --- | --- |
| 빌드 화면 두 독립 브라우저 컨텍스트 | 일정 추가·삭제 자동 반영 |
| 테스트 저장소의 외부 직접 변경 | 두 화면 재조회·내용 변경 반영 |
| SSE 차단 중 변경 → 차단 해제 | 단절 표시, 재연결 후 놓친 변경 복구 |
| 자동 갱신 | 작성 중 입력·선택 날짜·초점 유지 |
| HTML 형태 제목 | Schedule 제목 내부 img 요소 0개 |
| 320px / 390px / 1280px | 카드 288 / 358 / 502px, 가로 넘침 없음 |
| 키보드 | 월 이동 버튼 Enter 작동, 일정 카드 초기화 |
| 개발 모드 | 화면·추가·로컬 글꼴/SVG·Vite WebSocket 정상, 정상 흐름 콘솔 오류 0건 |
| 빌드 모드 네트워크 | 정적 자산·session/events/changes 정상, 추가 201·삭제 200 |

개발 모드에서 env·server·migration·script·외부 /@fs·경로 이동·인코딩 경로를 직접 요청해 모두 차단됐다. 의도적인 404/SSE 차단 실험의 콘솔 오류는 정상 흐름 오류와 구별했다. 캡처는 artifacts/react-desktop.png와 react-mobile-320.png에 있으며 Git에서 제외한다.

## 요청·비밀·TLS

- 실제 HTTP 테스트에서 외부 Origin·DNS rebinding Host·cross-site/누락 Fetch Metadata·세션/CSRF/Origin 누락·잘못된 Content-Type·잘못된 날짜/UUID/허용 필드·과대 JSON·SQL 삽입 형태 입력·요청 한도 초과를 거부했다.
- 빌드 CSP에 unsafe-inline/개발 WebSocket 예외가 없고, API는 no-store, 쿠키는 HttpOnly/SameSite=Strict이다.
- 소스·빌드·migration·문서·Git diff·검사 대상 로그에서 자격 증명/키 패턴, 공개 서버 변수, 소스맵이 발견되지 않았다. 설정 후 실제 비밀번호 값 대조·Windows env 파일 ACL·Git 제외 검사가 통과했다. 실제 재연결 QA에서 캡처한 서버 stdout/stderr에도 전용 비밀번호 값이 없음을 확인했고 원본 로그나 비밀번호를 출력하지 않았다.
- .env.server.local·.tools·.certs·.cache의 Git 제외를 확인했다. 서버 코드와 migration은 공개 root 밖에 있다.
- 초기 설정 전 npm start/check:db는 누락 변수의 이름과 조치만 출력하고 실패했다. 설정 후 실제 연결 검사는 통과했다.
- 잘못된 CA와 의도적으로 잘못된 자격 증명으로 실제 서버 프로세스를 실행했을 때 exit 1, HTTP 서비스 미개방, 고정 오류 안내였다. 내부 오류·비밀번호를 출력하지 않았다.
- 기본 Node trust만 사용한 연결은 SELF_SIGNED_CERT_IN_CHAIN으로 거부됐다. 검증을 끄지 않고 공식 Supabase Studio가 지정한 공개 CA를 HTTPS로 확보했다. CA 지문·유효 기간 검사 후 실제 runtime 연결의 TLS authorized=true를 확인했다. pooler→DB 구간의 pg_stat_ssl 결과를 로컬 클라이언트→pooler TLS 검증 결과로 사용하지 않았다.
- psql 도구를 준비하고 npm run setup:db의 **한글 안내 및 비표시 관리자 비밀번호 프롬프트 진입**을 확인했다. 의도적인 잘못된 관리자 비밀번호는 접속 거부됐고 역할 비밀번호 변경과 파일 저장은 실행되지 않았다.
- 후속 사용자 오류는 `password authentication failed for user "postgres"`였다. 입력 순서와 실패 안내를 수정한 뒤 실제 psql의 잘못된 비밀번호 경로를 다시 검증했다. 비표시 입력·실패 종료·env 미생성을 확인했다. 이후 사용자가 setup:db 완료를 알렸고 실제 runtime 인증과 파일 ACL 검사가 통과했다. 관리자 비밀번호는 읽거나 저장하지 않았다.

## 제한과 검증 범위

- 실제 브라우저 검사는 Chromium 기준이며 Firefox/Safari는 실행하지 않았다.
- SSE/DB 종료 정리는 자동 테스트로 확인했다. Windows 실제 서버 중단 검사는 프로세스 종료 방식이며, 네이티브 터미널 Ctrl+C의 정상 종료 경로는 이 자동화 환경에서 검증하지 못했다.
- 로컬 PC 관리자·악성코드 방어는 현재 보호 범위 밖이다. PUBLIC에서 상속되는 세션 TEMPORARY 권한은 유지한다.

외부 공개·LAN·이메일/소셜 로그인·수정 UI·시간·반복·알림은 승인 범위에 포함되지 않는다. 익명 인증은 2026-10-09 최신 결과에 포함한다.
