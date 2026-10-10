# 로컬 캘린더

React 화면에서 날짜별 일정을 조회·추가·삭제하고 Supabase Postgres에 저장하는 로컬 앱입니다. 같은 PC의 여러 브라우저가 같은 캘린더를 사용합니다. 주소는 **http://127.0.0.1:4175**로 고정됩니다.

구조: **React 19 / Vite 8 → 같은 출처의 Express API → 서버 전용 Supabase 익명 Auth / pg 전용 DB 역할 → Supabase Postgres**. Turnstile CAPTCHA를 완료하고 “익명으로 시작”을 누르면 입장합니다. 브라우저에는 DB 비밀번호·Supabase API 키·Auth 토큰·MCP 자격 증명이 전달되지 않습니다. MCP는 개발 시 조사와 migration에 사용합니다.

실제 CAPTCHA·익명 로그인·DB 저장·브라우저 간 동기화·재시작 후 재인증을 확인했습니다. 토큰 갱신과 1시간 상한은 실제 Auth에 제어한 서버 시계를 연결해 추가 검증했습니다. 새로운 작업 환경에서는 아래 초기 설정이 필요합니다. [검증 결과와 제한](docs/verification.md)을 확인하세요.

## 초기 설정 — Windows PowerShell

Node.js 24 이상이 필요합니다. 도구 준비 스크립트가 [공식 Windows 바이너리](https://www.postgresql.org/download/windows/)의 PostgreSQL 17.11 psql 클라이언트와 [Supabase Studio의 공식 공개 CA](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json)를 프로젝트 내부에 준비합니다. DB 서버·Windows 서비스·전역 PATH는 설치하지 않습니다. 최초 준비는 약 382MB를 내려받으며 이후 캐시를 재사용합니다.

    cd C:\Study\Codex\codex-vibecoding\figma-calendar
    npm.cmd ci
    npm.cmd run setup:tools
    npm.cmd run setup:db
    npm.cmd run setup:auth

setup:db는 TLS 인증서·호스트 검증을 켠 psql로 연결하고 \password calendar_runtime을 실행합니다. 첫 `Password:`에는 calendar-app 생성 때 설정한 **기존 postgres DB 관리자 비밀번호**를 입력합니다. Supabase 계정 로그인 비밀번호나 새 전용 비밀번호를 입력하는 단계가 아닙니다. 관리자 연결에 성공하면 다음 두 프롬프트에서 **전용 역할의 새 비밀번호**를 설정합니다. 모두 비표시 입력이며, 전용 비밀번호는 8자 이상 영문·숫자·_·- 조합으로 설정합니다.

이후 같은 전용 비밀번호를 한 번 더 비표시로 입력하면 .env.server.local을 저장합니다. 파일 접근은 현재 Windows 사용자·SYSTEM·Administrators로 제한하며, 관리자 비밀번호는 파일에 저장하지 않습니다. 비밀번호를 채팅·명령 인자·SQL Editor에 붙여 넣지 마세요. [psql 비밀번호 설정 안내](https://www.postgresql.org/docs/17/app-psql.html)를 따릅니다.

`FATAL: password authentication failed for user "postgres"`는 기존 관리자 DB 비밀번호의 인증 거부입니다. 기존 비밀번호를 입력해 setup:db를 다시 실행하세요. 잊었다면 [calendar-app → Database → Settings](https://supabase.com/dashboard/project/fnqefwbxqtanhnfpxrml/database/settings)에서 직접 재설정할 수 있습니다. 관리자 비밀번호를 사용하는 다른 도구의 설정도 함께 갱신해야 합니다. 재설정 직후 pooler에서 일시적으로 거부되면 새 비밀번호로 다시 연결하세요. [Supabase 비밀번호 재설정 안내](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB)

현재 작업 환경에는 DB·Auth 설정과 도구가 준비되어 있어 실행을 위해 setup:db를 다시 수행할 필요가 없습니다. 외부에 이미 설치한 psql을 사용하려면 경로를 지정할 수 있습니다.

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/provision.ps1 -PsqlPath "C:\Program Files\PostgreSQL\17\bin\psql.exe"

기본적으로 준비된 .certs/prod-ca-2021.crt를 신뢰 CA로 사용하며 지문·유효 기간을 확인합니다. 다른 확인된 공개 CA가 필요하면 -CaCertPath로 지정하세요. 검증을 끄는 옵션은 사용하지 않습니다. [Supabase psql TLS 연결 안내](https://supabase.com/docs/guides/database/psql)

이미 역할 비밀번호를 안전하게 설정했다면 npm.cmd run setup만 실행합니다. 이 스크립트는 Node의 CALENDAR_DB_CA_CERT_PATH도 준비된 공개 CA로 설정합니다. CA가 갱신되면 공식 출처와 지문을 다시 확인하며 비밀 파일의 ACL을 유지합니다.

확정된 접속 설정입니다. 호스트는 사용자가 Dashboard **Connect → Session pooler**에서 확인했습니다.

| 설정 | 값 |
| --- | --- |
| 프로젝트 | calendar-app |
| project ref | fnqefwbxqtanhnfpxrml |
| session pooler | aws-1-ca-central-1.pooler.supabase.com |
| 포트 | 5432 |
| 접속 사용자 | calendar_runtime.fnqefwbxqtanhnfpxrml |
| 데이터베이스 | postgres |
| 서버 환경 파일 | .env.server.local |

.env.server.example은 비밀이 없는 참고 파일입니다. session pooling은 LISTEN/NOTIFY용 전용 연결을 유지하는 데 필요합니다. [Supabase 연결 안내](https://supabase.com/docs/guides/database/connecting-to-postgres)

## 인증 초기 설정

calendar-app의 [Auth 설정](https://supabase.com/dashboard/project/fnqefwbxqtanhnfpxrml/auth/providers)에서 anonymous sign-in을 켜고 CAPTCHA 공급자를 Turnstile로 설정합니다. Cloudflare의 해당 위젯에는 `127.0.0.1`을 허용해야 합니다. CAPTCHA secret은 Supabase Dashboard에만 입력합니다. 실제 프로젝트에 테스트 secret을 넣거나 검증을 끄지 않습니다. [Supabase CAPTCHA 안내](https://supabase.com/docs/guides/auth/auth-captcha)

`npm.cmd run setup:auth`는 calendar-app의 modern publishable key를 비표시로 입력받습니다. 기존 DB 설정과 Windows ACL을 유지하며 다음 서버 변수만 추가/갱신합니다. 현재 작업 환경에는 이미 설정되어 있습니다.

| 변수 | 내용 |
| --- | --- |
| CALENDAR_SUPABASE_URL | https://fnqefwbxqtanhnfpxrml.supabase.co |
| CALENDAR_SUPABASE_PUBLISHABLE_KEY | Settings → API Keys의 publishable key, 서버에서만 사용 |
| CALENDAR_TURNSTILE_SITE_KEY | 승인된 공개 site key, .env.server.example 참고 |

Auth SDK는 Node 서버에서만 사용합니다. secret/service-role/admin key는 필요하지 않습니다. 이 인증은 공유 캘린더의 입장 단계이며, 사용자별 일정 분리 기능은 제공하지 않습니다.

## 실행과 검사

    # 실제 전용 계정·TLS·CRUD·권한 검사 (자격 증명 설정 후)
    npm.cmd run check:db

    # 개발 실행
    npm.cmd run dev

    # 빌드 실행: 개발 서버 종료 후 실행
    npm.cmd run build
    npm.cmd start

    # 구현/보안 검사
    npm.cmd test
    npm.cmd run lint
    npm.cmd run check:security
    npm.cmd audit

개발과 빌드 서버를 동시에 실행할 수 없습니다. 서버는 127.0.0.1:4175에만 열립니다. localhost·다른 포트·LAN 주소는 Host 검사가 거부합니다. 설정 누락·다른 프로젝트·관리자 계정·잘못된 권한·TLS 실패 시 HTTP 서버를 시작하지 않습니다. check:db의 테스트 데이터는 rollback합니다.

## 동작

- CAPTCHA 성공 후 “익명으로 시작”을 누르면 최대 1시간 인증됩니다. 같은 브라우저의 탭·새로고침에서 공유되며 서버 재시작·만료 시 다시 인증합니다. 토큰 갱신이 1시간 상한을 연장하지 않습니다.
- 인증이 중단되면 캘린더를 숨기고 날짜·기존 목록·초안을 React 메모리에 보존합니다. 재인증 후 다시 조회하고 입력 초점을 복원합니다. 새로고침하면 작성 중인 초안은 초기화됩니다.
- 현재 로컬 월과 미선택 상태로 시작하며, 날짜를 선택하면 해당 날짜의 목록과 입력 폼을 표시합니다. 월 이동은 선택·입력·오류를 초기화합니다.
- 제목은 공백 제거 후 1~200 Unicode 문자입니다. 중복 제목은 ID로 각각 삭제합니다. HTML처럼 보이는 제목도 일반 텍스트로 표시합니다.
- 저장 확인 후 입력을 비우고 갱신합니다. 실패하면 입력과 기존 목록을 유지합니다. 자동 조회가 실패해도 초안을 계속 작성할 수 있고 초점이 유지됩니다. 조회 복구 전에는 추가·삭제를 잠급니다. 같은 추가 요청 재시도는 UUID를 재사용합니다. 삭제 재시도는 이미 없는 항목과 실패를 구별합니다.
- Postgres 트리거가 내용 없는 NOTIFY를 보내면 서버 SSE를 통해 선택 날짜를 다시 조회합니다. 150ms 알림 묶음, 최초 연결·재연결·탭 복귀 재조회, 최대 30초 재연결 지연을 사용합니다. 작성 중 입력과 초점을 유지합니다.
- 기존 브라우저 일정 키 figma-calendar.events.v1만 삭제합니다. 기존 일정을 가져오거나 로컬 저장으로 대체하지 않습니다.
- 수정 UI·시간·반복·알림·이메일/소셜 로그인·공개 배포는 포함하지 않습니다.

## 보안과 DB

일정은 Data API 비노출 calendar_private.events에 저장합니다. calendar_runtime에는 schema USAGE와 테이블 SELECT/INSERT/DELETE만 부여합니다. 소유자는 postgres이고 RLS·FORCE RLS와 전용 역할 정책을 적용했습니다. PUBLIC·anon·authenticated는 접근할 수 없습니다. [Supabase 역할과 권한](https://supabase.com/docs/guides/database/postgres/roles)

HttpOnly/SameSite=Strict 로컬 세션 쿠키와 메모리 CSRF를 사용합니다. Auth access/refresh token은 서버 메모리에만 보관하고 보호 요청에서 getUser로 익명 사용자를 검증합니다. API는 같은 Origin과 Fetch Metadata를 요구하며, 쓰기는 CSRF 헤더와 JSON을 함께 검사합니다. 본문은 4KiB, 조회·세션 상태 확인은 각각 세션별 분당 120회, 쓰기는 30회입니다. 로그인은 세션 5회/분·서버 10회/분입니다. SQL은 매개변수 쿼리를 사용합니다. CSP는 공식 Turnstile script/frame만 허용하고 빌드 실행에 HMR 예외를 남기지 않습니다.

개발 서버는 클라이언트·필요한 의존성만, 빌드 서버는 dist/만 제공합니다. 서버 코드·환경 파일·migration·Git 파일은 HTTP로 제공하지 않습니다. Vite가 공개 접두사 값을 번들에 포함하므로 비밀을 VITE_*에 넣지 않습니다. [Vite 환경 변수](https://vite.dev/guide/env-and-mode), [pg TLS](https://node-postgres.com/features/ssl)

보호 범위는 외부 웹사이트·공개 API 접근과 프런트엔드·Git·로그 비밀 노출입니다. 로컬 악성코드·관리자 권한·같은 OS 사용자의 파일 접근까지 차단하지 않습니다. LAN이나 인터넷에 공개하려면 HTTPS·인증·권한 모델을 별도로 검토해야 합니다. 익명 계정 누적·사용량 확인·수동 정리는 [인증 운영 안내](docs/auth-operations.md)를 따릅니다.

유출 시 앱을 종료하고 원인을 제거한 뒤 setup:db로 전용 비밀번호를 교체합니다. 관리자 연결에서 해당 역할의 기존 DB 세션을 종료하고 새 연결로 검증합니다. 비밀 파일과 Git·빌드·로그를 재검사하며 Git 기록 정리만으로 해결됐다고 판단하지 않습니다.

## 파일과 변경 이력

| 경로 | 책임 |
| --- | --- |
| client/src/ | React 화면·API 클라이언트·순수 날짜 계산·BEM CSS |
| client/public/assets/ | 기존 로컬 글꼴·SVG·라이선스 |
| server/ | 설정·권한 검사·HTTP 방어·CRUD·LISTEN·SSE |
| scripts/ | 비표시 초기 설정·실제 DB 검사·유출 패턴 검사 |
| .tools/ · .certs/ · .cache/ | Git·HTTP 비노출 로컬 클라이언트 도구·공개 CA·캐시 |
| supabase/migrations/ | 비밀 없는 적용 SQL과 원격 적용 버전 |
| tests/ | 날짜·HTTP·React·SSE·재시도 테스트 |
| memory-bank/ | 진행·이슈·미완료 조건 |

적용 migration은 20261007215214_secure_calendar.sql과 20261007215806_allow_calendar_role_verification.sql입니다. 두 번째는 관리자의 명시적 SET ROLE 검사만 허용하며 런타임에 관리자 권한을 부여하지 않습니다. 적용 SQL은 수정하지 않고 후속 migration으로 변경합니다.

tests/fixtures/browser-server.js는 브라우저 QA 전용 메모리 저장소와 mock Auth·공식 dummy Turnstile key를 사용합니다. 실제 DB/Auth 앱과 독립적이며 자격 증명을 사용하지 않습니다. fixture와 실제 Supabase 검증 결과를 구별합니다.
