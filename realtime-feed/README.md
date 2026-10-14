# Realtime Guestbook

중앙 단일 열·흑백 라이트 디자인의 공개 방명록입니다.
2026-10-12 요청에 따라 Supabase·API·익명 인증 연동 코드를 추가했습니다.
전용 `realtime-feed` 프로젝트에 DB·익명 인증·Storage·Realtime를 연결했습니다.
실제 두 익명 세션과 브라우저로 저장·권한·그림 재편집·실시간 복구를 검증했습니다.
2026-10-14 미리보기 확인 후 Vercel 공개 운영 주소로 배포했습니다.
실기기와 전체 출시 인수 검증은 별도 작업입니다.

## 실행과 모드

Node.js 24에서 확인했습니다. PowerShell에서는 다음 명령을 사용합니다.

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

개발 주소는 기본적으로 `http://127.0.0.1:5173`입니다.
포트가 사용 중이면 터미널에 나온 주소를 확인합니다.
`.env.local`에는 아래 변수만 설정하고 실제 값은 문서·Git·로그에 넣지 않습니다.

| 변수 | 용도 |
| --- | --- |
| `VITE_GUESTBOOK_MODE` | 실제 `supabase` 또는 명시적인 로컬 `sample` 모드 |
| `VITE_SUPABASE_URL` | 방명록 전용 프로젝트의 공개 연결 주소 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 공개 키 |

실제 모드에서 설정이 없으면 안내만 보여주고 저장하지 않습니다.
연결 오류가 나도 샘플 저장 성공으로 전환하지 않습니다.
샘플 모드는 현재 탭만 사용하며 새로고침하면 합성 데이터로 돌아갑니다.
모드·환경 변수를 바꾸면 개발 서버를 다시 시작합니다.

## 인증과 저장 흐름

닉네임 창을 닫아도 공개 피드를 읽을 수 있습니다.
유효한 닉네임으로 시작하면 익명 인증 후 본인 프로필을 저장합니다.
프로필만 실패하면 같은 계정으로 재시도합니다. 소유권은 서버의 `auth.uid()`로 검사합니다.
이메일·비밀번호·소셜 로그인과 로그아웃 메뉴는 제공하지 않습니다.
사이트 데이터를 지우거나 익명 세션을 잃으면 이전 인사의 변경 권한을 복구할 수 없습니다.

미디어 업로드 → 서버 검증 → 게시물 RPC 확정 순서로 처리합니다.
저장 중 중복 제출·닫기를 막고 실패·충돌 시 초안을 유지합니다.
응답을 잃으면 ID·작성자·버전·본문·첨부·획을 비교해 결과를 확인합니다.
충돌 시 최신 내용을 확인하거나, 확인 후 초안을 버리고 다시 시작할 수 있습니다.
닉네임 변경은 새 글에 적용하며 기존 글의 작성 당시 이름은 유지합니다.

## 입력과 미디어

- 닉네임은 2~16자, 메시지는 최대 1,000 Unicode 코드 포인트입니다.
- 메시지·이미지·그림 중 하나 이상이 필요합니다.
- JPEG·PNG·WebP 원본은 최대 15 MiB, 이미지는 최대 5장입니다.
- 브라우저에서 긴 변 1,600px·장당 1 MiB 이하 WebP로 변환합니다.
- 서버는 준비된 경로, 실제 객체 용량·MIME, WebP 헤더의 크기·정적 형식을 검사합니다.
  헤더 검사는 이미지 전체 디코딩 성공을 보장하지 않습니다.
- 그림 미리보기는 900×600·최대 1 MiB, 획 JSON은 UTF-8 512 KiB 이하입니다.
- 획은 작성자 전용 DB에 저장하며 공개 조회·공개 버킷·Realtime에 넣지 않습니다.
- 교체는 새 경로를 사용합니다. 사용자의 Storage 덮어쓰기·직접 삭제는 허용하지 않습니다.

## API와 DB 책임

별도 웹 서버 없이 Supabase Data API·RPC·Edge Function을 사용합니다.
공개 테이블은 RLS·읽기 GRANT를 적용하고 직접 DML 권한을 회수합니다.
권한이 필요한 구현은 `guestbook_private` 스키마에 두고 공개 RPC는 invoker wrapper로 둡니다.
`guestbook_private`을 Data API 노출 스키마에 추가하지 않습니다.

| API | 권한과 역할 |
| --- | --- |
| `list_entries`, `read_entry` | 공개 읽기, 최대 20개 커서 페이지 |
| `set_nickname` | 본인 프로필 저장 |
| `read_entry_for_edit` | 작성자만 획 데이터 포함 조회 |
| `save_entry`, `delete_entry` | 작성자·버전 검사와 트랜잭션 |
| `reserve_media_upload`, `read_media_upload` | 본인 업로드 준비·조회 |
| `verify-media` Edge Function | 실제 JWT 확인 후 준비 파일 검증 |
| 미디어 검증·정리 RPC | 서버 전용 실행 권한 |

실시간 이벤트 뒤 최신 목록을 조회하고 재연결 시 읽은 커서까지 복구합니다.
아래를 읽는 중 새 글은 버튼으로 안내하며 열린 초안은 피드 갱신과 분리합니다.
실제 두 세션에서 생성·수정 전달과 재연결 후 삭제 복구를 확인했습니다.

## 전용 Supabase 연결

먼저 방명록 전용 대상·조직·리전·요금제를 확인합니다.
다른 앱 `calendar-app`을 연결하거나 변경하지 않습니다.
현재 프로젝트에는 마이그레이션 3개와 함수 2개를 적용했습니다.
다음은 새 환경을 준비하거나 후속 변경을 적용할 때의 절차입니다.
기존 환경에 초기 SQL을 다시 실행하지 않고 적용 이력을 먼저 대조합니다.

```powershell
$guestbookProjectRef = Read-Host "확인한 방명록 전용 프로젝트 ID"
npx.cmd supabase link --project-ref $guestbookProjectRef
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
npx.cmd supabase functions deploy verify-media `
  --project-ref $guestbookProjectRef --use-api
npx.cmd supabase functions deploy media-cleanup `
  --project-ref $guestbookProjectRef --use-api
```

Dashboard Auth에서 익명 로그인을 활성화하고 공개 연결 설정을 `.env.local`에 전달합니다.
현재 익명 로그인은 활성화했습니다. 로컬 `config.toml`만으로 자동 반영되지는 않습니다.
기본 config 전체 push는 이메일·MFA 등도 바꿀 수 있어 필요한 항목만 적용합니다.
서버 비밀을 `VITE_` 변수에 넣지 않습니다.
함수의 gateway JWT 검사는 끄고 handler에서 사용자 JWT 또는 작업자 비밀을 확인합니다.
CAPTCHA·Turnstile과 별도의 10초 생성 제한은 추가하지 않습니다.
Docker 엔진이 준비되면 `npx.cmd supabase start`로 로컬 스택을 시작할 수 있습니다.
현재 환경에서는 Docker 엔진을 확인하지 못해 전체 로컬 스택을 실행하지 않았습니다.

## 파일 정리 운영

게시물 변경·삭제와 정리 작업 등록은 같은 DB 트랜잭션입니다.
관리 도구의 게시물 삭제도 trigger가 정리를 등록합니다.
정리 완료까지 공개 파일에 잠시 접근할 수 있으며 화면 삭제와 물리 삭제는 구분합니다.
미사용 업로드는 24시간 이후 정리하고 현재 연결된 파일은 보호합니다.

작업자는 최대 20개·20초 예산·파일 요청 최대 10초, 선점 120초·최대 5회 시도를 사용합니다.
재시도 간격은 60·300·1,800·7,200초, 완료 기록 보존은 7일입니다. 모두 구현 기본값입니다.
Supabase Queues 없이 일반 DB 큐를 처리하며 Realtime 구독이 필요하지 않습니다.

파일 삭제는 처리 가능한 작업 중 먼저 등록된 작업을 고르는 FIFO 방식입니다.
작업 행의 `created_at` 순서를 사용하며, 실패한 작업의 재시도 시각은 대기 여부만 결정합니다.
앞 작업이 재시도를 기다리거나 다른 작업자가 처리 중이면 뒤 작업을 먼저 처리할 수 있습니다.
재시도 때는 원래 등록 시각을 유지합니다. 여러 작업자의 삭제 완료 순서는 달라질 수 있습니다.
예를 들어 먼저 들어온 A가 10:06까지 재시도를 기다리면 10:03에 뒤 작업 B를 처리할 수 있습니다.
A는 10:06부터 원래 등록 순서로 다시 선택 대상이 됩니다.

`CLEANUP_WORKER_SECRET`을 Git 제외 `.env.cleanup.local`에 두고 서버에 설정합니다.

```powershell
npx.cmd supabase secrets set --env-file .env.cleanup.local --project-ref $guestbookProjectRef
```

Vault에 `guestbook_cleanup_url`과 `guestbook_cleanup_secret`을 안전하게 설정합니다.
각각 작업자 함수 주소와 같은 작업자 비밀입니다. 실제 값은 문서에 적지 않습니다.
함수·비밀을 준비한 뒤 DB 관리 도구에서 예약합니다.

```sql
select cron.schedule(
  'guestbook-media-cleanup', '* * * * *',
  'select guestbook_private.invoke_media_cleanup()'
);
```

현재 매분 Cron을 등록했고 실행 성공과 함수 HTTP 200을 확인했습니다.
작업자 미인증 요청은 401, 실제 검증 파일 3개 삭제는 성공했습니다.
실패 작업은 서버 전용 `requeue_failed_media_cleanup_job`으로 재등록합니다.
파일 삭제는 Storage API만 사용하며 내부 메타데이터를 SQL로 삭제하지 않습니다.

## Vercel 배포

현재 [운영 사이트][production]는 Vercel 로그인 없이 접속할 수 있습니다.
[미리보기 사이트][preview]는 Vercel 로그인 보호를 유지합니다.
Production 공개 변수 3개를 등록하고 운영 환경으로 새로 빌드했습니다.
GitHub 저장소와 Vercel 자동 배포를 연결했습니다.
검증용 게시물·미디어는 정리했고 기존 게시물은 보존했습니다.

### GitHub 자동 배포

[GitHub의 방명록 소스][github-source]를 전용 Vercel 프로젝트에 연결했습니다.
Root Directory는 `realtime-feed`, 운영 브랜치는 `main`입니다.
Vite·Node.js 24·`npm ci`·`npm run build`·출력 `dist`를 사용합니다.
`main`에 push하면 운영 주소에 자동 배포되고, 다른 브랜치는 보호된 미리보기를 생성합니다.
실제 배포 상태와 연결된 커밋은 Vercel Dashboard 또는 CLI에서 확인합니다.

아래는 README를 수정한 경우의 예시입니다. 실제 수정한 파일만 선택합니다.

```powershell
git status --short
git add -- README.md
git diff --cached --check
git commit -m "docs: update guestbook guide"
git push origin main
```

환경 변수는 Vercel에 보관하고 `.env` 파일·토큰·빌드·브라우저 검증 산출물은 올리지 않습니다.
Git 연결은 Vercel 프런트 배포만 자동화합니다.
Supabase 마이그레이션·Edge Function·비밀 변경은 별도 확인과 적용이 필요합니다.

### 초기 CLI 배포 이력

Vercel CLI 64.0.2와 Node.js 24를 사용합니다.
`vercel.json`은 Vite·`npm ci`·`npm run build`·`dist`를 명시합니다.
아래 명령은 Git 연결 전, 현재 폴더를 프로젝트 루트로 올렸던 초기 절차입니다.
현재 연결 상태에서는 위 GitHub push 절차와 Root Directory `realtime-feed`를 사용합니다.

```powershell
$guestbookVercelScope = Read-Host "방명록을 배포할 Vercel 팀 slug"
npx.cmd --yes vercel@64.0.2 link --project realtime-feed `
  --scope $guestbookVercelScope --yes
npx.cmd --yes vercel@64.0.2 project inspect `
  --scope $guestbookVercelScope --non-interactive
npx.cmd --yes vercel@64.0.2 deploy --dry --json `
  --scope $guestbookVercelScope --non-interactive
```

배포 전에 Vercel의 Preview 환경에 `VITE_GUESTBOOK_MODE=supabase`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정합니다.
값은 전용 Supabase의 공개 설정이며 `.env.local`과 일치해야 합니다.
작업자 비밀·테스트 설정·서비스 키는 Vercel 프런트에 등록하지 않습니다.
환경 변수를 바꾸면 새 배포가 필요합니다.
운영 배포 전에는 Production 환경에도 같은 공개 변수 3개를 설정합니다.

`.vercelignore`는 모든 환경 파일·Supabase 서버 코드·테스트·메모리를 제외합니다.
연결 파일·OIDC 토큰이 저장될 수 있는 `.vercel/`과 환경 파일도 Git에서 제외합니다.
dry run의 파일 목록에서 비밀 파일이 없는지 먼저 확인합니다.

```powershell
npx.cmd --yes vercel@64.0.2 deploy --target preview --no-wait `
  --scope $guestbookVercelScope --non-interactive
```

미리보기를 확인하고 운영 배포를 요청한 경우 다음 명령을 사용합니다.

```powershell
npx.cmd --yes vercel@64.0.2 deploy --prod --no-wait `
  --scope $guestbookVercelScope --non-interactive
```

방문자에게는 배포마다 생성되는 URL 대신 위의 고정 운영 주소를 공유합니다.
배포별 생성 URL과 미리보기에는 Vercel 보호가 적용될 수 있습니다.
운영 주소는 인증 쿠키·보호 우회 헤더 없는 새 브라우저로 직접 확인합니다.

반환된 URL을 `vercel inspect`로 확인하고 실제 브라우저에서 연동을 검증합니다.
새 CLI 프로젝트는 첫 배포를 Production으로 초기화할 수 있으므로 실제 target도 확인합니다.
이번에는 Preview를 다시 생성하고 초기 Production 배포를 삭제했습니다.
미리보기 보호가 있다면 유지한 채 인증된 접근을 사용합니다.
현재 인증은 URL 리디렉션 없는 익명 방식입니다.
이메일·OAuth를 추가한다면 Supabase Site URL과 허용 리디렉션도 별도로 맞춥니다.
Git 자동 배포 연결 시 저장소·Root Directory·배포 브랜치를 확인했습니다.

[Vercel의 Vite 안내](https://vercel.com/docs/frameworks/frontend/vite)와
[환경 변수 안내](https://vercel.com/docs/environment-variables)를 참고합니다.

## 검사와 현재 검증 경계

```powershell
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:integration
npm.cmd run test:e2e:live
```

첫 E2E 실행 전 브라우저를 준비합니다.

```powershell
npx.cmd playwright install chromium --only-shell --no-remove
```

단위 검사의 내장 PostgreSQL 엔진은 테스트용 Auth·Storage 스키마를 사용합니다.
핵심 마이그레이션·권한·트랜잭션을 확인하며 Cron 확장 마이그레이션은 실행하지 않습니다.
E2E는 Chromium과 테스트 응답으로 실패 초안·재시도·충돌·반응형을 확인합니다.
`test:e2e`는 테스트 응답 검사이며 실제 서비스 검증과 구분합니다.
`test:e2e:live`는 현재 전용 프로젝트를 사용해 독립 브라우저 두 개로 검증합니다.
실제 검증의 trace는 인증 응답이 파일에 남지 않도록 끕니다.

실제 API 검사는 `.env.test.local`의 `SUPABASE_TEST_URL`,
`SUPABASE_TEST_PUBLISHABLE_KEY`, `SUPABASE_TEST_PROJECT_CONFIRMED=yes`가 필요합니다.
전용 개발 대상에서만 실행하며 없으면 `skipped`입니다.
테스트 게시물만 정리합니다. 테스트 익명 계정은 별도 운영 정리가 필요합니다.
미디어 경계 검사의 거절된 파일은 24시간 만료 정리 대상이며 기록은 Git 제외 폴더에 둡니다.
실제 Vercel URL에서 독립 두 세션의 인증·미디어·그림 재편집·Realtime을 확인했습니다.
타인 RPC·직접 쓰기 거절, 초안 유지·재방문·삭제 후 재접속 복구도 통과했습니다.
390px·320×568의 작성·키보드와 파일 3개의 실제 정리, 브라우저 런타임 오류 0개를 확인했습니다.
실기기 펜·모바일 키보드·화면 읽기 프로그램과 전체 출시 인수 검증은 남아 있습니다.

## 기준과 작업 기록

- [프로젝트 지침](AGENTS.md)
- [디자인 토큰·UI 기준](DESIGN.md)
- [전체 제품 요구사항](docs/superpowers/specs/2026-10-11-realtime-guestbook-design.md)
- [전체 구현 계획](docs/superpowers/plans/2026-10-11-realtime-guestbook.md)
- [현재 연동 계획](docs/superpowers/plans/2026-10-12-guestbook-supabase-integration.md)
- [현재 연동 카드](.memory-bank/tasks/2026-10-12-supabase-integration.md)
- [샘플 UI 이력](.memory-bank/tasks/2026-10-12-sample-guestbook-ui.md)
- [실제 검증 기록](.memory-bank/verification-log.md)

현재 공식 [익명 인증](https://supabase.com/docs/guides/auth/auth-anonymous),
[DB 함수 권한](https://supabase.com/docs/guides/database/functions),
[Storage 정책](https://supabase.com/docs/guides/storage/security/access-control)을
확인했습니다.
새 세션과 후속 기능 작업은 `guestbook-memory-bank` 스킬과 메모리를 먼저 읽습니다.

[preview]: https://realtime-feed-my97cyo7t-gukbaps-projects.vercel.app
[production]: https://realtime-feed-henna.vercel.app
[github-source]: https://github.com/TaeyoungYou/codex-vibecoding/tree/main/realtime-feed
