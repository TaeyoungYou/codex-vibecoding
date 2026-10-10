# Vercel 배포 점검 — 2026-10-09

대상: https://codex-vibecoding-seven.vercel.app/ (America/Toronto 기준).

## 수정 배포 — 2026-10-09

사용자가 서버 환경 변수와 Turnstile 허용 도메인을 등록한 뒤 나머지 수정을 승인했다. 아래 최초 점검의 API 404·공개 Host 거부·메모리 세션 문제를 수정해 Production에 배포했다. 최초 수정 배포 ID는 dpl_6c3z7y6gSNmCGttsRcJE85aN9D8w이며 Vercel MCP에서 READY/production/alias를 확인했다.

- api/의 Node 함수로 Express API를 연결했다. 정적 화면은 Vercel CDN에서 제공하며 CSP·nosniff·프레임 차단 헤더를 적용한다.
- 정확한 HTTPS Origin·Host, Fetch Metadata, CSRF, 4KiB JSON 검사를 유지한다. 세션 쿠키는 Secure/HttpOnly/SameSite=Strict다.
- private web_sessions·web_limits를 추가해 인스턴스 간 인증과 요청 한도를 공유한다. 쿠키 원문은 SHA-256 해시로 조회하며 Auth 토큰은 AES-256-GCM으로 암호화한다. 서버 전용 CALENDAR_SESSION_SECRET과 CALENDAR_ORIGIN을 Production에 추가했다. 기존 사용자 환경 값은 덮어쓰지 않았다.
- 요청마다 DB 연결을 닫고 기존 role 연결 한도 4를 유지한다. Vercel에서는 5초 주기 재조회하며 로컬 LISTEN/SSE는 유지한다.
- 새 migration 20261010013230_vercel_shared_sessions.sql만 적용했다. 기존 events·데이터·최소 권한과 이전 migration을 보존했다.

실제 공개 HTTP 검사에서 /api/session 200, 미인증 events 401, 잘못된 CAPTCHA 400/CAPTCHA_REJECTED, 서버/env/Git 파일 404를 확인했다. 사용자가 일반 브라우저에서 CAPTCHA 후 캘린더가 열림을 확인했고, Vercel 요청 로그에도 인증된 events GET 200이 반복된다. 자동화 Chromium은 Turnstile 600010에 막혔다. 공개 배포의 실제 일정 추가·삭제와 독립 브라우저 간 반영은 아직 별도 확인하지 못했다.

자동 테스트 66개, lint/build/check:db/check:security, audit(취약점 0건)을 통과했다. 실제 runtime DB와 mock Auth를 연결한 두 서버 검사에서 세션 공유·동시 refresh 1회·암호화·CSRF·CRUD/멱등성·잘못된 날짜 삭제 거부·인증 장애 복구·만료 차단을 확인했다. 실제 CAPTCHA 통합 성공과 mock Auth 검사는 구별한다. 기존 일정은 4개이며 내용 fingerprint가 같다.

현재 상한은 세션 128개·신규 세션 전체 30회/분·로그인 전체 10회/분·DB 연결 4개다. 대규모 동시 접속 부하 검사는 하지 않았다. Performance Advisor는 0건이며 Security Advisor의 기존 leaked-password-protection WARN 1건은 비밀번호 로그인을 사용하지 않는 현재 익명 Auth 범위에서 설정을 변경하지 않았다. 상세 로그 MCP는 팀 권한 403이므로 오류가 안내한 동일 프로젝트 CLI로 요청 상태를 확인했다.

## 최초 점검 기록

## 결론과 실제 응답

배포는 READY지만 인증·일정 API가 제공되지 않아 앱을 사용할 수 없다. Chromium에서 “인증 서비스에 연결하지 못했습니다. 작성 중인 내용은 유지됩니다.”를 확인했다. 인증이나 일정 쓰기는 실행하지 않았다.

| 요청 | 실제 결과 |
| --- | --- |
| GET / | 200, 캘린더 HTML |
| GET /api/session | 404, Vercel NOT_FOUND 텍스트 |
| GET /api/events?date=2026-10-09 | 404, Vercel NOT_FOUND 텍스트 |
| GET /api/changes | 404, Vercel NOT_FOUND 텍스트 |

브라우저 네트워크에서도 /api/session 404와 콘솔의 리소스 로드 오류를 확인했다. Vercel 메타데이터의 프레임워크는 vite, Node는 24.x, 배포 커밋은 d47e582961b19125934143a5168a81b718e8c00c다. 로컬의 최신 캘린더 구현 커밋과 일치한다. 오래된 코드 배포로 단정할 근거는 없다.

MCP의 get_deployment와 기본 get_project 조회로 배포/프로젝트를 식별했다. 팀을 명시한 상세 MCP 조회는 403으로 거부되어, 오류가 제공한 공식 CLI 대체 명령을 같은 팀/프로젝트 범위로 실행했다. CLI로 Root Directory=figma-calendar, framework=vite, Node=24.x, 사용자 지정 buildCommand/outputDirectory=null(기본값 사용), 프로젝트 환경 변수 목록 0개, 프로젝트 라우팅 규칙 0개를 확인했다. build 로그에는 npm run build → vite build → dist 산출물 배포가 나타난다. 공개 JS/CSS의 SHA256은 이번 로컬 빌드와 각각 일치했다.

## 발견 사항

1. **P1 — 화면은 제공되지만 API 경로가 없다.** package.json의 build는 vite build이며 vite.config.js는 client를 dist로 빌드한다. server/index.js를 실행하는 start와 별개다. 현재 소스에는 Vercel API 엔트리나 API 라우팅 구성이 없다. 실제 API 404와 함께 보면 Vite 화면 배포만으로 Express 서버까지 실행되지 않는 문제가 확인된다. vercel.json 파일의 부재 자체가 오류라는 의미는 아니다. [Express 배포 공식 문서](https://vercel.com/docs/frameworks/backend/express)는 인식되는 엔트리 경로와 default export 또는 port listener를 안내한다. 현재 server/index.js는 안내된 자동 인식 경로에 포함되지 않는다.

2. **P1 — API를 연결해도 공개 도메인은 거부된다.** server/config.js의 ORIGIN은 http://127.0.0.1:4175로 고정되고 server/app.js는 Host와 Origin을 이에 대조한다. DB/Auth 없는 격리 앱에 Host=codex-vibecoding-seven.vercel.app을 보내 403/FORBIDDEN_ORIGIN을 재현했다. 공개 HTTPS 주소를 명시적으로 설정하고 Host/Origin/CSRF 검증을 유지해야 한다. 현재 루프백 listen 설정과 공개 환경의 Secure cookie도 함께 검토해야 한다.

3. **P1 — 메모리 세션은 함수 인스턴스 간 공유되지 않는다.** server/app.js의 sessions Map에 cookie·CSRF·Auth 상태를 보관하고 server/auth.js의 SDK client·토큰도 메모리에 둔다. 격리된 앱 두 개에서 첫 앱의 쿠키를 두 번째 앱에 전달하자 다른 cookie와 CSRF가 발급됐다. 함수의 인스턴스 변경/재생성 시 세션이 끊길 수 있다는 것은 이 재현과 [Vercel 함수 생명주기](https://vercel.com/docs/functions)에 근거한 추론이며, 실제 배포에서 로그인 이후 인스턴스 이동을 시험한 결과는 아니다. Vercel Functions로 옮기려면 세션 저장·갱신 동시성·요청 제한을 공유 가능한 구조로 설계해야 한다.

4. **P2 — 상주 LISTEN/SSE와 DB 연결 한도를 검토해야 한다.** server/index.js는 Pool(max=2)과 전용 LISTEN 연결 하나를 만들며 적용 migration의 runtime 역할 연결 한도는 4다. 인스턴스가 늘면 역할 한도를 초과할 수 있다. SSE 자체는 Vercel에서 금지된 기능이 아니지만 [함수 실행 시간 제한](https://vercel.com/docs/functions/limitations#max-duration)은 스트리밍 응답에도 적용된다. 현재 재연결 구현을 활용하더라도 LISTEN 수명·연결 회수·최대 실행 시간·비용을 별도로 검증해야 한다. 이번에는 실제 DB 부하나 SSE 시간 초과를 재현하지 않았다.

5. **P2 — 정적 응답에 Express의 보안 헤더가 적용되지 않는다.** 실제 / 응답에 Content-Security-Policy와 X-Content-Type-Options가 없었다. 이 헤더들은 server/app.js의 Helmet에서 설정된다. 프런트엔드를 Vercel CDN으로 계속 제공하면 별도의 헤더 설정이 필요하다.

6. **P1 — 앱 서버에 필요한 환경 변수가 등록되지 않았다.** CLI의 프로젝트 환경 변수 목록은 비어 있다. server/config.js가 요구하는 CALENDAR_DB_HOST/PORT/USER/PASSWORD와 CALENDAR_SUPABASE_URL/PUBLISHABLE_KEY 및 CALENDAR_TURNSTILE_SITE_KEY가 없다. 현재 .env.server.local은 Git 제외 대상이며 공개 배포에 자동 전달되지 않는다. 서버를 배포한 뒤 이 설정을 서버 환경 변수로 제공하고 TLS CA가 필요하면 인증서 배포도 준비해야 한다. 비밀을 VITE_*에 넣거나 .env.server.local을 Git에 추가하는 방식은 사용하지 않는다. 이 항목은 현재 API 404의 직접 원인이 아니라 API 연결 이후의 시작 차단 조건이다.

## 검증과 제한

- Node 24.12.0, Windows PowerShell에서 npm.cmd test: 7개 파일·61개 통과.
- npm.cmd run lint, npm.cmd run build, npm.cmd run check:security 통과.
- 공개 주소를 Node HTTP 요청과 실제 Chromium으로 각각 확인했다.
- Host 거부와 인스턴스별 세션 분리는 실제 DB·Supabase Auth 없는 격리 재현이다.
- Vercel MCP의 상세 프로젝트/로그/환경 변수/파일/라우팅 조회는 팀 권한 403이었다. 공식 CLI 대체로 프로젝트 설정·빌드 로그·환경 변수 목록·라우팅 목록은 확인했다. CLI 배포 파일 트리는 File tree not found 404여서 파일 트리 기반 함수 목록 검증은 하지 못했다. 이 404를 함수가 없다는 직접 증거로 사용하지 않는다. 환경 변수 값은 복호화하거나 출력하지 않았다.
- 공개 /.env.server.local, /server/config.js, /.git/config, /supabase/migrations/20261007215214_secure_calendar.sql은 모두 404였다. 모든 경로나 모든 종류의 비밀 노출을 포괄 검증한 것은 아니다.
- Cloudflare 위젯의 실제 허용 도메인은 조회하지 않았다. 공개 배포 시 해당 hostname 등록이 필요하며, API 404가 해결되기 전에는 Turnstile의 정상 동작도 검증할 수 없다. [Cloudflare 공식 문서](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
- Supabase DB·Auth 설정·migration·앱 소스·Vercel 설정은 변경하지 않았다. 검사 결과만 문서에 추가했다.

## 수정 방향

Vercel을 유지하려면 프런트엔드와 API 배포 경로, 공개 HTTPS Origin, 공유 세션, DB 연결 및 동기화 수명을 함께 변경해야 한다. rewrite 하나를 추가하거나 환경 변수만 입력해 해결되는 상태가 아니다. 현재 구조를 유지하려면 상주 Node 서버를 운영할 수 있는 환경에 Express를 배치하는 방법도 있다. 어느 방식이든 기존 private schema·최소 권한·CAPTCHA·CSRF와 서버 데이터 보존을 유지해야 한다. 배포 변경은 이번 점검에서 수행하지 않았다.
