# 진행 — 2026-10-09

## 문서: 설계·구현·배포 학습 가이드

사용자 요청으로 [프로젝트 학습 가이드](../docs/project-learning-guide.md)를 작성했다. 초기 계획과 현재 구조의 차이, 플랫폼별 연결, API 진입점과 Vercel 함수 패키징, 인증·세션·CRUD, 환경 설정, 개발·배포·검증 순서를 실제 코드와 기존 기록을 바탕으로 설명한다. README에 진입 링크를 추가했다. 문서 링크·코드 블록·인코딩·공백, 보안 검사와 Git diff 검사를 통과했다. 이번 작업은 문서 변경이며 앱·DB·운영 설정은 변경하지 않았다. [검증 기록](../docs/verification.md)에 이번 문서 검사와 기존 런타임 검증을 구분했다.

## 현재: Vercel API 수정 배포 및 실제 로그인 확인

사용자의 환경 변수·도메인 등록 이후 나머지 수정 승인을 받아 API Node 함수, HTTPS Origin/Host 검사, Secure 쿠키, DB 공유 세션/요청 한도, AES-256-GCM Auth 토큰 암호화, Vercel 5초 재조회, 공개 CSP를 구현해 Production에 배포했다. 기존 로컬 SSE와 events 권한·데이터는 유지한다. CALENDAR_ORIGIN과 무작위 CALENDAR_SESSION_SECRET만 Production에 추가하고 기존 7개 환경 값은 보존했다.

새 migration 20261010013230_vercel_shared_sessions.sql을 적용하고 원격 버전·SQL을 대조했다. 자동 테스트 66개·린트·빌드·check:db·check:security·audit 0건 통과. 실제 runtime DB와 mock Auth의 두 서버 세션/동시 갱신/CRUD/만료/장애 복구 검사 통과. 기존 일정 4개와 fingerprint 동일, Performance Advisor 0건과 기존 비밀번호 보호 WARN 1건 확인.

첫 수정 배포 dpl_6c3z7y6gSNmCGttsRcJE85aN9D8w READY, session 200·보호 API 401·잘못된 CAPTCHA 400·비밀 경로 404를 확인했다. 사용자 일반 브라우저의 실제 로그인·추가와 CLI events GET 200/POST 201을 확인했다. 삭제 400을 발견해 Vercel 동적 경로의 같은 단일 id 쿼리만 허용하도록 보정했다. GitHub main c39bfac와 자동 배포 dpl_C8TebDwjhzu6Ja3tqtq5kQ1mj1NM READY를 확인했고 사용자가 정상 삭제를 확인했다. 실제 공개 JS/CSS와 보안 검사한 로컬 빌드의 SHA256도 동일하다. 자동화 Chromium은 Cloudflare 600010으로 막혔다. 공개 독립 브라우저 동기화와 대규모 부하 검사는 별도 미검증이다. [최신 검증](../docs/verification.md)을 참고한다.

## 이전: Vercel 공개 배포 최초 점검

추가 MCP 상세 조회는 팀 권한 403으로 거부됐으나 공식 CLI 대체로 빌드 로그·설정·환경 목록을 확인했다. Root Directory=figma-calendar와 Node=24.x는 올바르고, 환경 변수 목록은 비어 있다. 빌드는 Vite 클라이언트만 생성하며 공개 JS/CSS는 로컬 빌드와 동일하다. 앱 서버 배포와 서버 환경 변수 설정, 공개 환경에 맞는 인증/동기화 구조 변경이 필요하다.

사용자가 제공한 https://codex-vibecoding-seven.vercel.app/ 를 실제 Chromium과 HTTP로 확인했다. 화면은 200이지만 session/events/changes API가 모두 404여서 인증 화면에서 진입하지 못한다. 배포는 vite/READY, 커밋은 현재 구현 d47e582다. 공개 Host 거부와 인스턴스별 메모리 세션 분리를 격리 재현했다. 로컬 61개 테스트·린트·빌드·보안 검사는 통과했다. 앱 소스·DB·배포 설정은 변경하지 않았으며 공개 배포 수정은 미완료다. [점검 상세](../docs/vercel-deployment-review.md)를 참고한다. 아래 완료 기록은 기존 로컬 앱 범위다.

## 현재: 익명 인증·Turnstile 구현 및 통합 검증 완료

2026-10-07 인계에서 재개했다. 실제 Turnstile → Supabase 익명 인증, 두 독립 Chromium 브라우저의 CRUD/SSE·탭/새로고침 세션 공유, 직접 DB INSERT/UPDATE/DELETE, 실제 LISTEN 종료·복구, 서버 재시작 후 재인증·누락 변경 복구를 확인했다. 실제 Auth와 제어한 서버 시계로 refreshSession 성공과 1시간 상한 이후 차단도 확인했다. 실제 1시간 대기 검사는 아니다.

이전 인증의 늦은 실패가 새 인증을 폐기하는 race, 인증 중 쓰기 실패 후 busy 잠금, 창을 줄일 때 CAPTCHA 넘침, 서버 재시작 직후 첫 로그인 실패를 수정했다. 세션 폐기 시 Auth fetch를 취소한다. 자동 테스트 61개·린트·빌드·check:db·check:security·audit(0건)·PowerShell parser를 통과했다. 보안 검사에 docs 폴더도 포함했다.

격리 fixture에서는 CAPTCHA script 실패/재시도, 만료·장애에서 초안/날짜/초점 복원, 320/390/1280px, 키보드·StrictMode SSE 최대 1개를 확인했다. 실제 검증 결과와 구별해 기록했다.

기존 일정은 시작·종료 4개, 내용 집계 fingerprint도 동일하다. 테스트 일정 잔여 0개이며 migration·기존 환경 값은 변경하지 않았다. 실제 인증 검증으로 익명 계정 5개가 생겼고 임의 삭제하지 않았다. 기존 PID 18948은 재개 시 존재하지 않았으며, 이번 검증 프로세스는 모두 종료했다.

AGENTS·README·[검증 기록](../docs/verification.md)을 갱신하고 [익명 계정 수동 운영](../docs/auth-operations.md)을 추가했다. Performance Advisor는 0건이다. 마지막 Security Advisor는 유출된 비밀번호 차단 비활성 WARN 1건으로, 현재 비밀번호 없는 익명 인증 흐름에는 적용되지 않는다. 프로젝트 설정은 임의 변경하지 않았다.

미검증 범위는 실제 1시간 장시간 대기, Firefox/Safari, setup:auth의 실제 비표시 프롬프트 전체다. 현재 승인 기능의 구현·통합 검증에서 막힌 항목은 없다. 검증 완료 후 사용자 요청에 따라 프로젝트 변경을 커밋하고 origin/main에 반영한다. 아래 기록은 인증 도입 이전의 역사 기록이다.

완료된 임시 인계 문서는 삭제하고 관련 참조 링크를 정리했다. 필요한 승인 사항·결과·미검증 범위는 AGENTS·README·진행·이슈·검증 문서에 유지한다.

## 기존 공유 캘린더 완료 기록

React 19·Vite 8·Express·pg 구조로 전환했다. 서버 주소는 127.0.0.1:4175로 고정했다. 기존 디자인/BEM/글꼴/SVG를 재사용하고 legacy localStorage 키만 삭제한다.

Supabase calendar-app(fnqefwbxqtanhnfpxrml)에 private events 테이블·runtime 역할·RLS/정책·인덱스·NOTIFY 트리거 migration 2개를 적용했다. 원격 버전과 SQL을 로컬 파일과 대조했다. 실제 SET ROLE 권한 테스트에서 CRUD 허용, UPDATE/지속적인 DDL/auth.users 접근 거부, anon/authenticated 접근 거부를 확인했다.

세션·CSRF·Host/Origin/Fetch Metadata·4KiB JSON·입력 검증·rate limit·CSP·비밀 파일 차단을 구현했다. Postgres LISTEN→SSE→React 재조회, 150ms 알림 합침, 재연결·탭 복귀 복구, 요청/구독 정리를 구현했다.

자동 테스트 38개·린트·빌드·npm ci·audit·비밀 패턴 검사 통과. 초기 QA 메모리 저장소 검사와 실제 Supabase 브라우저 검사를 구별해 기록했다.

setup:db 실패를 재현하고 psql 미설치를 해결했다. 공식 EDB psql 17.11 클라이언트와 공식 Supabase 공개 CA를 프로젝트 내부에 준비했고 한글/BOM·비표시 입력·TLS 검증을 확인했다. npm run setup:db는 이제 프롬프트까지 정상 진입한다.

사용자의 추가 요청에 따라 전용 비밀번호 최소 길이를 32자에서 8자로 변경했고 설정 검증·프롬프트·README·AGENTS에 반영했다.

후속 오류의 실제 psql 메시지는 postgres 관리자 비밀번호 인증 거부였다. 기존 관리자 DB 비밀번호 → 새 runtime 비밀번호 → 로컬 저장 순서를 명확히 표시하고 공통 PowerShell 예외 대신 psql 원본 오류와 재설정 안내·종료 코드를 유지하도록 수정했다. 의도적인 잘못된 비밀번호로 psql 종료 코드 2 안내, npm 종료 코드 1, 로컬 설정 미생성을 확인했다. 비표시 입력·TLS verify-full·최소 8자 조건은 유지한다. PowerShell 구문/BOM·린트·보안 검사 통과. 이후 사용자 설정 완료 후 아래 실제 접속 검증을 진행했다.

사용자의 setup:db 완료 후 실제 runtime 로그인·TLS·CRUD/재시도·권한 거부 검사와 Windows 파일 ACL·Git 제외·실제 비밀번호 값 유출 대조를 통과했다. 비밀번호·관리자 자격 증명은 출력하거나 로그에 기록하지 않았다.

실제 Supabase를 사용해 두 독립 브라우저의 추가·삭제·새로고침 후 유지, MCP 직접 INSERT/UPDATE/DELETE의 자동 갱신, 빌드 서버 재시작 후 중간 변경 복구를 확인했다. 개발 모드에서도 실제 LISTEN 연결 종료·복구와 StrictMode의 SSE 최대 1개를 확인했다. 320/390/1280px 가로 넘침 없음, 정상 콘솔 오류 0건이다.

실제 연결 중단 검사에서 자동 조회 실패가 입력란을 disabled로 만들어 초점을 잃는 문제를 발견·수정했다. 조회 실패 중 초안을 계속 작성할 수 있고 추가·삭제는 잠근다. 수정 전 회귀 테스트 실패와 수정 후 38개 테스트·실제 빌드/개발 재연결에서 입력·선택·초점 유지를 확인했다.

공개 publishable 키로 실제 private schema의 Data API 조회·추가·삭제를 요청해 모두 406/PGRST106 거부를 확인했다. 최신 보안·성능 Advisor 모두 0건이다. 검증용 UUID 잔여 수는 0개이며 테스트 서버를 종료했다.

승인 범위의 앱 구현과 실제 DB 통합 검증을 완료했다. Chromium 이외 브라우저와 네이티브 Windows Ctrl+C 종료는 미검증이며, 로컬 PC 관리자/악성코드와 PUBLIC TEMP 권한 등 보호 범위 제한은 상세 기록에 명시했다.

[상세 검증](../docs/verification.md), [이슈](issue.md), [실행 안내](../README.md)를 참고한다.
