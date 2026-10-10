# figma-calendar 작업 지침

이 파일은 figma-calendar/ 하위 작업에 적용한다. 사용자 지시와 상위 지침을 우선한다. 작업 전 [README](README.md), [진행 기록](memory-bank/progress.md), [이슈](memory-bank/issue.md)를 확인한다. 작업 후 진행·이슈·실제로 수행한 검증과 미검증 항목을 갱신한다.

## 승인된 구조와 범위

**React 19 / Vite 8 → 같은 출처의 Express API → 서버 전용 Supabase 익명 Auth / pg 최소 권한 계정 → Supabase Postgres**

- 대상은 calendar-app, ref fnqefwbxqtanhnfpxrml이다. 사용자가 Dashboard Connect에서 확인한 session pooler Host는 aws-1-ca-central-1.pooler.supabase.com, 포트는 5432다. 다른 프로젝트·지역·transaction pooler를 추측하지 않는다.
- 로컬 개발과 빌드 실행은 http://127.0.0.1:4175 에만 바인딩한다. 사용자가 승인한 Vercel 공개 배포는 https://codex-vibecoding-seven.vercel.app 이다. 두 환경 모두 Turnstile CAPTCHA와 Supabase 익명 인증을 요구한다. LAN·이메일/소셜 로그인·사용자별 소유 모델은 범위 밖이다.
- 인증한 브라우저들은 하나의 캘린더를 공유한다. 제목 목록·추가·삭제만 제공한다. 수정 UI·시간·반복·알림을 임의로 추가하지 않는다.
- 기존 figma-calendar.events.v1 키 삭제는 사용자가 승인했다. 이 키만 삭제한다. localStorage/IndexedDB에 일정·CSRF·DB 설정을 저장하거나 네트워크 실패 시 로컬 저장으로 대체하지 않는다.
- 과거 vanilla/localStorage 설계 문서는 역사 기록이다. 현재 요구사항은 이 파일과 README를 따른다.

## 화면과 날짜

- JavaScript/JSX, 기존 CSS 변수·BEM(Block__Element--Modifier)·Inter·SVG를 재사용한다. 외부 CDN 없이 로컬 자산을 쓴다.
- 현재 로컬 월과 날짜 미선택으로 시작한다. 월요일 시작 7열, 실제 월에 따른 4·5·6주, 앞뒤 월 날짜 선택 불가를 유지한다.
- 월 이동 시 날짜 선택·입력·오류를 초기화한다. 날짜만 있는 값을 UTC 시각으로 변환하지 않는다. client/src/dates.js의 순수 함수를 사용한다.
- 제목은 앞뒤 공백 제거 후 Unicode 코드 포인트 1~200자다. 중복 제목을 허용하고 UUID로 구별한다. 일반 React 텍스트 렌더링만 사용한다. dangerouslySetInnerHTML을 사용하지 않는다.
- 읽기 진행·빈 목록·조회 실패·쓰기 진행·쓰기 실패·동기화 단절을 구별한다. 실패 시 입력과 기존 목록을 유지한다.
- 자동 조회 실패 중 작성 입력란을 비활성화해 초점을 잃게 하지 않는다. 조회가 복구될 때까지 추가·삭제 동작은 잠그되 초안은 계속 작성할 수 있게 한다.
- 날짜 변경 후 이전 응답을 무시한다. 추가 UUID는 동일 요청 재시도에 재사용하며, 쓰기는 시작 당시 날짜와 ID에 연결한다.
- SSE 알림을 150ms 모아 재조회한다. 최초 연결·재연결·DB LISTEN 복구·탭 복귀 시 재조회한다. 선택·입력·초점을 유지한다.
- StrictMode에서도 요청 취소와 구독 정리를 보장한다. API 인스턴스당 로컬 SSE 연결 또는 Vercel 5초 주기 재조회 타이머 하나를 공유한다.

## DB와 MCP

- MCP는 조사·migration 적용·Advisor 확인용이며 런타임에서 사용하지 않는다. 서버의 Supabase SDK와 publishable key는 Auth에만 사용한다. 일정 저장은 기존 pg 전용 계정으로 처리하며 브라우저에 SDK·API 키·Auth 토큰을 전달하지 않는다.
- 데이터는 Data API 비노출 calendar_private.events의 id, event_date, title, created_at에 저장한다. private schema를 exposed schemas에 추가하지 않는다.
- calendar_runtime은 테이블 소유자가 아니며 LOGIN/NOINHERIT/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS, 연결 한도 4를 유지한다. 다른 역할의 멤버가 되게 하지 않는다.
- events는 schema USAGE와 SELECT·INSERT·DELETE만 허용한다. Vercel 전용 web_sessions·web_limits에는 세션 갱신용 UPDATE도 허용한다. 모든 테이블의 RLS·FORCE RLS·역할 전용 정책을 유지하고 PUBLIC·anon·authenticated에 접근을 부여하지 않는다.
- (event_date, created_at, id) 인덱스와 생성 순 정렬을 유지한다. 모든 SQL 값은 매개변수로 전달한다.
- 트리거는 INSERT·UPDATE·DELETE 시 내용 없는 changed만 NOTIFY한다. 함수는 SECURITY INVOKER, 고정 search_path, 제한된 EXECUTE를 유지한다.
- 로컬은 pg Pool 최대 2와 session pooler 전용 LISTEN 연결 하나를 사용한다. reconnect는 최대 30초로 제한하고 종료 시 DB/SSE 연결을 정리한다. Vercel은 요청마다 짧은 연결을 열고 응답 전에 닫는다. LISTEN·장기 SSE·인스턴스 메모리 세션을 사용하지 않는다.
- SQL migration에는 비밀이 없어야 한다. CLI migration new로 파일을 만들고 MCP apply_migration으로 적용한다. MCP의 적용 버전·SQL을 로컬 파일과 대조한다. 이미 적용된 SQL을 수정·삭제하지 않고 새 migration으로 보정한다.
- postgres의 기존 관리 멤버십에 SET ROLE만 허용한 후속 migration이 있다. 런타임이 postgres의 권한을 얻는 반대 방향의 멤버십을 만들지 않는다.
- 실제 런타임 로그인 검사와 관리자 연결의 SET ROLE 검사를 구별한다. 공개 Data API 요청 검사와 anon/authenticated 역할 검사도 구별한다. 확인하지 않은 경로를 통과했다고 보고하지 않는다.

## 비밀 관리

- .env.server.local은 서버 전용이며 Git에서 제외한다. Windows ACL은 현재 사용자·SYSTEM·Administrators만 허용한다. npm run setup이 쓰기 전에 ACL을 설정하고 시작 시 다시 검사한다.
- 비밀번호는 psql \password calendar_runtime 비표시 프롬프트로 설정한다. SQL·migration·채팅·명령 인자·로그에 넣지 않는다. 관리자 자격 증명은 초기 설정에만 사용하고 앱 설정에 저장하지 않는다.
- 사용자가 전용 비밀번호의 최소 길이를 8자로 지정했다. 설정 검증·프롬프트·문서에 이 조건을 유지한다.
- VITE_*·클라이언트 import·HTML·빌드에 DB 설정, API 키, MCP 토큰을 넣지 않는다. 환경 파일을 프런트엔드 root로 이동하지 않는다.
- TLS 인증서·호스트 검증은 항상 켠다. rejectUnauthorized=false, NODE_TLS_REJECT_UNAUTHORIZED=0, 검증 없는 sslmode로 우회하지 않는다.
- setup:tools는 공식 EDB 17.11 아카이브의 SHA256과 공식 Supabase 공개 CA 지문·유효 기간을 확인한다. .tools/·.certs/·.cache/는 Git·HTTP에서 제외하며 클라이언트 도구만 추출한다. CA 교체 시 공식 출처를 다시 확인한다.
- 누락 설정·다른 프로젝트·관리자 역할·잘못된 grants/RLS·TLS 오류에서 HTTP 서비스를 열지 않는다. 오류에는 조치와 설정 변수 이름만 표시한다.
- 비밀 노출 시 원인 제거, 전용 비밀번호 교체, 기존 DB 연결 종료와 재검사를 수행한다. Git 기록 정리만으로 해결됐다고 간주하지 않는다.

## 익명 인증과 CAPTCHA

- 사용자 승인 구조는 Turnstile → 서버 Node의 signInAnonymously(captchaToken)다. CAPTCHA secret은 Supabase Dashboard에만 둔다. 앱에 secret/service-role/admin key나 별도 Siteverify 우회 경로를 추가하지 않는다.
- CALENDAR_SUPABASE_URL·CALENDAR_SUPABASE_PUBLISHABLE_KEY·CALENDAR_TURNSTILE_SITE_KEY는 서버 환경 파일에서 읽는다. setup:auth는 기존 DB 설정과 ACL을 보존한다. site key만 공개 응답에 포함한다.
- 독립 SDK client와 storageKey를 사용하고 persistSession·autoRefreshToken·detectSessionInUrl을 끈다. 로컬 Auth 토큰은 서버 메모리에 유지한다. Vercel은 CALENDAR_SESSION_SECRET으로 AES-256-GCM 암호화해 비노출 web_sessions에 보관한다. 쿠키 원문은 저장하지 않고 SHA-256 해시로 조회한다. 갱신은 행 잠금으로 직렬화한다. 암호화 키는 서버 환경에만 둔다.
- 보호 요청과 SSE heartbeat는 getUser(accessToken), is_anonymous=true, 로컬 만료를 검사한다. getSession이나 user_metadata만으로 인가하지 않는다. 만료 60초 전 갱신을 합치되 성공 이후 최대 1시간을 연장하지 않는다.
- 인증 성공 시 cookie/CSRF를 교체한다. 같은 브라우저 탭·새로고침에서 공유한다. 로컬 서버 재시작 또는 최대 1시간 만료 후 재인증한다. Vercel 인스턴스 교체는 인증을 유지하며 암호화 키 교체 시 재인증한다. 이전 상태의 늦은 실패가 새 인증을 지우지 않도록 검사한다. 종료/폐기 시 Auth fetch도 취소한다.
- 인증 중단 시 캘린더를 숨겨 날짜·목록·초안을 보존하고 요청/구독을 정리한다. 중단 중 끝난 쓰기도 busy를 해제한다. 재인증 후 조회·초점을 복원한다. BroadcastChannel에는 auth-changed 신호만 전달한다.
- CAPTCHA 스크립트·위젯은 StrictMode 정리, 실패/만료/재시도, 화면 폭에 따른 재생성 및 이전 토큰 폐기를 보장한다.
- 로그인 한도는 세션 5회/분·서버 10회/분이다. SESSION_REQUIRED 401 및 CSRF_REQUIRED 403은 CAPTCHA 소비 이전 거부이므로 세션 재확인 후 같은 CAPTCHA를 1회만 재시도한다. 다른 미인증 401에서 일정 쓰기/로그인을 자동 재시도하지 않는다.
- 실제 CAPTCHA·Auth 검증, 공식 dummy key/mock 검증, 실제 Auth와 제어한 시계 검증을 각각 구별한다. 실제 프로젝트의 CAPTCHA 비활성화나 테스트 secret 교체는 금지한다. 익명 계정 자동 삭제는 추가하지 않으며 [수동 관리](docs/auth-operations.md)를 따른다.

## 요청 방어와 공개 파일

- 로컬은 정확한 Host 127.0.0.1:4175, Vercel은 CALENDAR_ORIGIN의 Host를 검사한다. 같은 Origin과 API의 Sec-Fetch-Site=same-origin을 요구한다. CORS 전체 허용을 추가하지 않는다.
- GET /api/session의 HttpOnly/SameSite=Strict 쿠키와 클라이언트 메모리 CSRF를 사용한다. 쓰기는 세션·Origin·CSRF 헤더·JSON을 모두 요구한다. Vercel HTTPS 쿠키에는 Secure를 추가한다. 로컬 HTTP loopback 쿠키만 Secure를 생략한다.
- JSON 본문 4KiB, 실제 날짜, UUID v4, 제목 길이·공백·제어 문자, 정확한 허용 필드를 검사한다. 조회 120회/분·쓰기 30회/분·세션/SSE 개수 한도를 유지한다.
- API는 session GET, auth/anonymous POST, 날짜별 events GET/POST/DELETE, changes만 제공한다. changes는 로컬 SSE이며 Vercel에서는 인증된 상태 JSON이다. Vercel 클라이언트는 5초 주기 재조회한다. 임의 SQL·schema·role·테이블·관리 엔드포인트를 만들지 않는다.
- 개발 서버 fs 접근은 client와 필요한 node_modules로 제한한다. /@fs는 개발 의존성 경로만 허용하며 비밀·서버·migration은 차단한다. 빌드 서버는 dist만 제공한다.
- CSP·클릭재킹 방지·MIME 추측 방지·no-store·no-referrer를 유지한다. HMR/inline 개발 예외는 빌드 실행에 남기지 않는다.
- 비밀번호·연결 문자열·토큰·일정 제목·원본 SQL 오류를 로그에 기록하지 않는다. HTTP 오류는 고정 안내만 반환한다.

## 실행과 완료 검증

Node 24 이상에서 npm ci, npm run dev, npm run build, npm start, npm test, npm run lint를 사용한다. Windows PowerShell은 npm.cmd, npx.cmd를 쓴다. 버전과 lockfile을 함께 고정한다. 의존성 설치 스크립트를 검토하고 High/Critical 취약점을 해결한다.

- 날짜·윤년·연도 경계·중복 제목·멱등 재시도·이전 응답 무시·StrictMode·실패 상태 테스트를 실행한다.
- HTTP 방어·본문 크기·SQL 삽입·요청 한도·비밀/서버 파일 차단을 검증한다.
- 실제 자격 증명 설정 후 npm run check:db로 런타임 CRUD 및 UPDATE/DDL/권한 위임/다른 데이터 접근 거부를 확인한다.
- 실제 Supabase 변경→LISTEN→SSE→브라우저 재조회, 두 브라우저, 직접 INSERT/UPDATE/DELETE, 재연결 복구를 검증한다. 테스트 fixture는 실제 DB 검증으로 보고하지 않는다.
- 320px·390px·데스크톱, 키보드·초점·한국어 오류·브라우저 콘솔/네트워크를 확인한다.
- npm run check:security, npm audit, Git diff 검사, 변경 후 Supabase Advisor를 실행한다. 실제 비밀번호 값 대조와 파일 ACL 검사가 미실행이면 명시한다.
- [검증 기록](docs/verification.md)에 실행 환경과 결과·미완료 조건을 기록한다. 테스트 서버는 점검 후 종료한다. 서버 실행·빌드·SUBSCRIBED만으로 DB 앱 완성을 선언하지 않는다.
