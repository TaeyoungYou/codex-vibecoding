# Realtime Guestbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 사용자가 익명 닉네임으로 글·이미지·그림을 작성하고, 다른 브라우저에서도 변경을 실시간으로 확인하는 방명록을 배포한다.

**Architecture:** React SPA가 Supabase Auth와 공개 조회 API, 본인 게시물 변경 RPC를 사용한다. 게시물 변경과 파일 정리 작업 등록은 DB 트랜잭션으로 묶고, 일반 PostgreSQL 작업 테이블을 Edge Function이 Cron으로 처리한다. 화면의 실시간 동기화는 별도의 Postgres Changes 구독으로 처리한다.

**Tech Stack:** React, TypeScript, Vite, shadcn/ui, Tailwind CSS, supabase-js, PostgreSQL, Supabase Edge Functions·Cron·Storage, Canvas·Pointer Events, Vercel. 검증에는 Vitest, Testing Library, Playwright와 실제 Supabase API를 사용한다.

**Spec:** [승인된 설계](../specs/2026-10-11-realtime-guestbook-design.md). 구현자는 이 계획과 설계를 함께 읽는다. 계획의 함수명·작업자 설정값은 설계에서 구현자에게 맡긴 결정을 구체화한 것이다.

## Global Constraints

- 처음부터 새 앱으로 작성한다. `.superpowers`의 임시 시안·예시 데이터·서버 접근 키를 제품으로 복사하지 않는다.
- 첫 방문 닉네임, 익명 인증, 같은 브라우저의 세션 유지. 닉네임은 2~16 Unicode 코드 포인트, 글은 최대 1,000자다.
- 글·이미지·그림 각각 선택 사항이며, 요소가 하나 이상 있어야 한다. 이미지 최대 5장과 별도의 그림 1개를 지원한다.
- 입력 이미지는 JPEG·PNG·WebP, 원본 최대 15 MiB. 긴 변 최대 1,600px, 저장 WebP 최대 1 MiB, 이미지 합계 최대 5 MiB다.
- 그림은 900×600 기준, 미리보기 최대 1 MiB, 편집 JSON 최대 512 KiB다. 마우스·터치·펜과 저장 후 재편집을 지원한다.
- 중앙 피드 폭 약 720px, 기본 라이트·흑백 테마. 작성·수정은 모달, 모바일 320px에서도 사용 가능해야 한다.
- 직접 작성하는 CSS 클래스는 BEM을 기본으로 한다. shadcn/Tailwind 유틸리티도 사용할 수 있다.
- 본인 게시물만 변경 가능하다. auth.uid()로 검증하며 닉네임이나 사용자 수정 가능 JWT 메타데이터로 권한을 판단하지 않는다.
- 공개 스키마 테이블에는 RLS와 필요한 GRANT를 함께 적용한다. 서비스 키와 Cron 인증 비밀은 브라우저에 넣지 않는다.
- 모든 게시물 변경은 서버 검증을 통과한다. 직접 테이블 변경으로 검증을 우회하지 못하게 한다.
- 파일 정리 큐는 일반 DB 테이블로 구현한다. Supabase Queues를 사용하지 않으며 큐 실행에 Realtime 구독을 요구하지 않는다.
- CAPTCHA·Turnstile과 게시물 생성 간격 10초 제한은 구현하지 않는다.
- 피드는 최신순 20개씩 조회한다. 아래를 읽는 중 새 글이 오면 위치를 유지하고 새 글 보기 버튼을 제공한다.
- 업로드·저장 실패 시 열린 작성 창의 초안을 유지한다. 저장 성공 전에는 창을 닫거나 성공으로 표시하지 않는다.
- Windows PowerShell에서는 npm.cmd/npx.cmd를 사용한다. 의존성 버전을 고정하고 package-lock.json을 커밋한다.
- 기존 calendar-app 및 다른 프로젝트를 변경하지 않는다. 저장소의 관련 없는 `.playwright-mcp` 파일을 스테이징하지 않는다.

## Review Focus

1. 사이트 데이터 삭제·갱신 불가능 세션: 이전 작성 권한이 유지되는 것처럼 보이지 않아야 한다. Task 3의 세션 복구 테스트가 담당한다.
2. 저장 중 모달 닫기·네트워크 실패·재시도: 초안을 잃거나 게시물을 중복 생성하지 않아야 한다. Task 3·4의 재시도 테스트가 담당한다.
3. 업로드 완료 직후 창 종료: 게시물에 연결되지 않은 파일을 24시간 이후 정리해야 한다. Task 6의 미사용 파일 테스트가 담당한다.
4. 파일 삭제 성공 직후 작업자 중단: 다시 실행해도 현재 사용 중인 파일을 지우거나 오래된 결과로 새 선점을 덮어쓰지 않아야 한다. Task 6의 장애 복구 테스트가 담당한다.
5. 삭제 이벤트보다 늦게 도착한 이전 조회 응답: 삭제된 카드가 다시 나타나거나 같은 카드가 두 개 생기지 않아야 한다. Task 7의 이벤트·조회 순서 테스트가 담당한다.

## 실행 전 확인할 외부 설정

현재 제품 코드는 없고, 설계 문서만 있다. node·npm.cmd·git은 확인했으나 Docker·Supabase CLI·psql은 PATH에서 찾지 못했다. 이는 설치 여부 전체를 증명하지는 않는다.

실행 시작 시 Supabase 대상 프로젝트와 Vercel 배포 계정·프로젝트를 확인한다. 방명록 전용 Supabase 프로젝트를 사용하며, 기존 calendar-app을 기본 대상으로 선택하지 않는다. 사용자가 대상을 지정하지 않았다면 원격 변경 전에 한 번에 필요한 설정을 묻는다. 유료 요금제를 임의 선택하지 않는다. 그 답과 무관한 프런트 작성·단위 검증은 진행할 수 있다.

로컬 DB 통합 검증은 Supabase CLI와 실행 가능한 Docker 엔진이 필요하다. 로컬 실행이 불가능하면 사용자와 선택한 방명록 전용 개발 프로젝트에서 UUID로 구분한 테스트 데이터만 사용한다. 환경이 준비되지 않은 통합 검증을 mock 결과로 대체해 통과했다고 보고하지 않는다.

## 파일 구성과 공통 계약

| 위치 | 책임 |
| --- | --- |
| `src/domain/guestbook.ts`, `src/domain/validation.ts` | 공유 타입, 입력 상한·빈 게시물 검증 |
| `src/lib/supabase.ts`, `src/lib/errors.ts` | 환경 변수, SDK 클라이언트, 사용자에게 표시할 오류 |
| `src/features/auth/` | 세션·프로필 상태, 닉네임 입력·변경 |
| `src/features/entries/` | API, 피드 카드, 작성·수정 모달, 삭제 확인 |
| `src/features/media/` | 이미지 압축, 업로드 준비·전송, 이미지 목록 편집 |
| `src/features/drawing/` | 획 모델·직렬화·재생, Pointer Events 편집기 |
| `src/features/realtime/` | 구독, 재연결·조회 조율, 피드 반영 |
| `src/components/ui/`, `src/App.tsx`, `src/index.css` | shadcn 구성 요소, 앱 조립, 테마·반응형 스타일 |
| `supabase/migrations/`, `supabase/config.toml` | DB·Storage 정책·RPC·publication·Cron 설정 |
| `supabase/functions/media-cleanup/` | 서버 인증, 작업자 실행, Storage 삭제 |
| `tests/unit/`, `tests/integration/`, `tests/e2e/` | 순수 로직·컴포넌트, 실제 DB/API, 독립 브라우저 검증 |
| `.env.example`, `README.md` | 환경 변수 이름, 실행·배포·운영 절차 |

공유 타입은 `guestbook.ts`에서 한 번만 정의한다. UUID와 ISO 날짜는 string, 버전은 number다. 공개 Entry는 `id, authorId, nickname, text, version, createdAt, updatedAt, images, drawing`을 가진다. MediaAsset은 `id, url, width, height, bytes`를 가진다. images는 표시 순서의 MediaAsset 배열, drawing은 MediaAsset 또는 null이다. EditEntry는 Entry에 본인만 읽는 `drawingDocument: StrokeDocument | null`을 더한다.

StrokeDocument는 `{formatVersion: 1, width: 900, height: 600, strokes: Stroke[]}`다. Stroke는 `{tool: 'pen' | 'eraser', color: string, widthPx: number, points: {x: number, y: number}[]}`다. 좌표는 0~1, 굵기는 기준 캔버스의 px다. 편집 JSON은 UTF-8 문자열로 보관하여 클라이언트와 DB가 같은 바이트 수를 검증한다.

SaveEntryInput은 `{id, expectedVersion: number | null, text, imageAssetIds: string[], drawing: {previewAssetId: string, strokesJson: string} | null}`이다. 새 글은 expectedVersion=null, 수정은 읽은 버전을 보낸다. 공개 조회 결과에는 획 JSON을 넣지 않는다. 모든 API는 `Promise<Result<T>>`를 반환하며 Result는 `{ok: true, value: T}` 또는 `{ok: false, error: AppError}`다. AppError.code는 `invalid | not_authenticated | forbidden | conflict | network | server`다.

DB의 공개 RPC 반환 JSON도 위 camelCase 필드명을 사용한다. SQL 내부 열은 snake_case로 두어도 된다. 클라이언트 API 경계에서 응답 형태를 검사하며, 원시 DB 오류·비밀을 UI나 로그에 노출하지 않는다.

### Task 1: 실행 가능한 앱 기반과 입력 계약

**Files:** Create `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vitest.config.ts`, `playwright.config.ts`, `components.json`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/domain/guestbook.ts`, `src/domain/validation.ts`, `src/lib/supabase.ts`, `src/lib/errors.ts`, 필요한 `src/components/ui/` 파일. Test `tests/unit/validation.test.ts`.

**Interfaces:** Produces 공유 타입, `validateNickname(value: string): Result<string>`, `validateText(value: string): Result<string>`, `validateEntry(input: SaveEntryInput): Result<SaveEntryInput>`, `createGuestbookClient(): SupabaseClient | null`. 환경 미설정이면 null을 반환하고 설정 안내를 표시한다. 실제 서버 대신 성공하는 가짜 작성 기능을 두지 않는다.

- [ ] Step 1: 공식 Vite React TS 구성을 기준으로 파일을 작성한다. 비어 있지 않은 작업 폴더를 초기화 명령으로 덮어쓰지 않는다. package scripts는 `dev`, `typecheck`(`tsc -b --pretty false`), `build`(`npm run typecheck && vite build`), `test:unit`(`vitest run tests/unit`), `test:integration`(`vitest run tests/integration`), `test:e2e`(`playwright test`)로 정한다.
- [ ] Step 2: npm.cmd install의 `--save-exact`로 React·react-dom·@supabase/supabase-js와 Vite·TypeScript·Tailwind Vite 플러그인·타입·검증 도구를 설치한다. shadcn CLI의 `--help`와 Vite 설치 문서를 확인하고 기존 앱을 대상으로 init한다. 기본 neutral 라이트 색상, CSS 변수, `@/` 별칭을 사용하고 dialog·alert-dialog·button·input·textarea·dropdown-menu를 추가한다. CLI가 추가한 의존성도 정확한 버전으로 고정한다.
- [ ] Step 3: `validation.test.ts`에 다음 경계 검증을 먼저 작성하고 `npm.cmd run test:unit -- tests/unit/validation.test.ts`로 누락된 구현 때문에 실패하는지 확인한다.

```ts
it('validates_unicode_nickname_and_text_limits', () => {
  expect(validateNickname(' 가 ').ok).toBe(false)
  expect(validateNickname(' 🙂🙂 ')).toEqual({ok: true, value: '🙂🙂'})
  expect(validateNickname('가'.repeat(17)).ok).toBe(false)
  expect(validateText('a'.repeat(1000)).ok).toBe(true)
  expect(validateText('a'.repeat(1001)).ok).toBe(false)
})
it('requires_content_and_limits_image_count', () => {
  const empty: SaveEntryInput = {id: crypto.randomUUID(), expectedVersion: null,
    text: ' ', imageAssetIds: [], drawing: null}
  const imageAssetIds = Array.from({length: 5}, () => crypto.randomUUID())
  expect(validateEntry(empty).ok).toBe(false)
  expect(validateEntry({...empty, text: '안녕'}).ok).toBe(true)
  expect(validateEntry({...empty, imageAssetIds}).ok).toBe(true)
  expect(validateEntry({...empty, imageAssetIds: [...imageAssetIds, crypto.randomUUID()]}).ok).toBe(false)
})
```

- [ ] Step 4: 공유 타입과 검증을 구현한다. 환경 변수는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`만 브라우저에서 읽는다. env 파일·테스트 비밀·빌드·브라우저 산출물을 Git에서 제외한다.
- [ ] Step 5: 단위 검증·typecheck·build를 실행한다. 각각 테스트 통과·종료 코드 0·dist 생성이 성공 기준이다. 브라우저에서 시스템 다크 모드에도 흰 배경이고, 환경 미설정 안내가 보이는지 확인한다.
- [ ] Step 6: 이 작업의 파일만 스테이징하고 `git diff --cached --check` 후 `feat: initialize guestbook app and validation`으로 커밋한다.

### Task 2: DB 모델·소유권·저장 트랜잭션

**Files:** Create CLI가 생성하는 `supabase/config.toml`, 이름 `guestbook_core`인 migration, `tests/integration/database.test.ts`, `tests/integration/support.ts`, `README.md`. Modify `package.json`, `vitest.config.ts`, `.env.example`, `.gitignore`.

**Interfaces:** Produces 공개 RPC `set_nickname(p_nickname text) → Profile`, `read_entry(p_id uuid) → Entry | null`, `read_entry_for_edit(p_id uuid) → EditEntry`, `list_entries(p_before_created_at timestamptz, p_before_id uuid) → EntryPage`, `save_entry(p_id uuid, p_expected_version integer, p_text text, p_image_asset_ids uuid[], p_drawing jsonb) → Entry`, `delete_entry(p_id uuid, p_expected_version integer) → void`. Profile은 `{id: string, nickname: string}`, EntryCursor는 `{createdAt: string, id: string}`, EntryPage는 `{entries: Entry[], nextCursor: EntryCursor | null}`이다. 목록은 최대 20개이며 p_drawing은 SaveEntryInput.drawing과 같은 키를 사용한다.

- [ ] Step 1: 적용할 Supabase 기능의 현재 공식 문서·changelog를 확인하고 CLI를 버전 고정한 로컬 dev dependency로 설치한다. `npx.cmd supabase --help`와 init·migration new·start의 help를 확인한다. 로컬 익명 로그인을 활성화하고 CAPTCHA는 추가하지 않는다. `npx.cmd supabase migration new guestbook_core`로 migration을 생성한다.
- [ ] Step 2: 실제 DB 테스트 환경을 준비한다. 비밀은 `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, `SUPABASE_TEST_SECRET_KEY`, `SUPABASE_TEST_DATABASE_URL`의 테스트 환경으로만 전달한다. `vitest.config.ts`에서 `.env.test.local`을 테스트 프로세스에만 로드하며 브라우저 설정에 병합하지 않는다. 마지막 값은 내부 큐 검사용 SQL 연결이며 버전 고정한 pg·@types/pg dev dependency로 사용한다. 로컬 또는 명시적으로 선택한 전용 개발 프로젝트에서만 실행하고, 신규 UUID의 테스트 데이터만 정리한다.
- [ ] Step 3: `database.test.ts`에 `owner_can_create_edit_delete_text_entry`, `other_user_cannot_mutate_entry_or_relations`, `invalid_content_rolls_back_all_changes`, `same_id_create_retry_does_not_duplicate`, `stale_version_preserves_saved_entry`를 작성한다. 두 사용자는 실제로 다른 익명 세션이다. 생성·수정 결과의 id·text·version을 확인하고, 타인의 변경 오류 후 원본이 같은지 검증한다. 같은 ID를 두 번 생성해도 DB 행은 1개여야 한다. `npm.cmd run test:integration -- tests/integration/database.test.ts`로 함수 구현 전 실패를 확인한다.

```ts
// owner_can_create_edit_delete_text_entry: 실제 RPC 응답을 검사한다.
expect(created.data).toMatchObject({id: entryId, text: '첫 글', version: 1})
expect(edited.data).toMatchObject({id: entryId, text: '수정', version: 2})
// other_user_cannot_mutate_entry_or_relations
expect(otherUserUpdate.error).not.toBeNull()
expect(afterDeniedUpdate.data).toEqual(beforeDeniedUpdate.data)
// same_id_create_retry_does_not_duplicate / stale_version_preserves_saved_entry
expect(rowsForEntry).toHaveLength(1)
expect(afterConflict.data).toEqual(beforeConflict.data)
```
- [ ] Step 4: 공개 profiles·entries·entry_images·entry_drawings, 내부 drawing_strokes·media_assets·media_cleanup_jobs를 만든다. 획 JSON은 text로 저장해 JSON 유효성과 512 KiB를 검증한다. 예약된 새 entry UUID는 게시물 확정 전에도 보관 가능해야 한다. 큐 행은 게시물 삭제와 함께 cascade되지 않는다.
- [ ] Step 5: RPC·RLS·GRANT·소유권 검증을 구현한다. 직접 DML로 서버 검증을 우회하지 못하게 한다. 필요한 권한 상승 함수에는 고정 search_path, auth.uid() 검사, PUBLIC 실행 권한 회수를 적용한다. 공개 조회와 본인만 가능한 프로필·편집용 조회를 분리한다. 작성 당시 이름은 서버가 프로필에서 가져온다.
- [ ] Step 6: save_entry에서 소유권·version·이미지 5장·합계 5 MiB·그림·빈 게시물을 검증하고 관련 데이터와 version을 함께 확정한다. 실제 Storage 객체와 예약 레코드를 확인한 asset만 연결한다. 동일 ID의 신규 생성 재시도는 기존 글을 덮어쓰지 않고 conflict를 반환한다. 이미지 분리·게시물 삭제와 delete_pending 전환·삭제 작업 등록은 같은 트랜잭션에 넣는다.
- [ ] Step 7: 통합 검증을 다시 실행해 사용자 A의 CRUD 성공, B의 변경 거부, 실패 시 전체 롤백, 충돌 시 기존 내용 보존을 확인한다. 관리 권한의 MCP 조회로 브라우저 권한 검증을 대신하지 않는다.
- [ ] Step 8: advisors로 노출·권한을 확인하고 해당 파일만 `feat: enforce guestbook database ownership and transactions`으로 커밋한다.

### Task 3: 닉네임과 글 CRUD를 화면에 연결

**Files:** Create `src/features/auth/api.ts`, `src/features/auth/useIdentity.ts`, `src/features/auth/NicknameDialog.tsx`, `src/features/entries/api.ts`, `src/features/entries/EntryFeed.tsx`, `src/features/entries/EntryCard.tsx`, `src/features/entries/EntryComposer.tsx`, `src/features/entries/DeleteEntryDialog.tsx`, `tests/unit/identity.test.tsx`, `tests/unit/composer.test.tsx`. Modify `src/App.tsx`, `src/index.css`.

**Interfaces:** Produces `readOwnProfile(): Promise<Result<Profile | null>>`, `beginAnonymousIdentity(nickname: string): Promise<Result<Profile>>`, `changeNickname(nickname: string): Promise<Result<Profile>>`, `readEntry(id: string): Promise<Result<Entry | null>>`, `readEntryForEdit(id: string): Promise<Result<EditEntry>>`, `saveEntry(input: SaveEntryInput): Promise<Result<Entry>>`, `deleteEntry(id: string, expectedVersion: number): Promise<Result<void>>`, `listEntries(cursor: EntryCursor | null): Promise<Result<EntryPage>>`. Task 2의 RPC와 공유 타입을 사용한다. readOwnProfile은 본인 SELECT 정책이 있는 profiles를 조회한다.

- [ ] Step 1: `identity.test.tsx`에 `profile_failure_retries_same_anonymous_user`, `expired_session_requires_new_identity_notice`를, `composer.test.tsx`에 `failed_save_keeps_open_draft`, `close_dirty_draft_requires_confirmation`, `stale_edit_keeps_current_draft`를 작성한다. 저장 실패 후 textarea 값이 같고 dialog가 열려 있으며, 저장 중 재클릭해도 saveEntry 호출은 1회여야 한다. 프로필 재시도에서 signInAnonymously 호출도 1회여야 한다. 단위 검증으로 구현 전 실패를 확인한다.

```ts
// profile_failure_retries_same_anonymous_user: 프로필 실패 후 재시도한 결과
expect(signInAnonymously).toHaveBeenCalledTimes(1)
// failed_save_keeps_open_draft: 저장 실패 및 대기 중 재클릭 결과
expect(screen.getByRole('dialog')).toBeVisible()
expect(screen.getByRole('textbox', {name: '내용'})).toHaveValue('남겨 둔 초안')
expect(saveEntry).toHaveBeenCalledTimes(1)
```
- [ ] Step 2: SDK 세션 유지와 Auth 변경 구독을 연결한다. 닉네임 검증 후 익명 로그인하며, 프로필만 실패하면 같은 계정으로 재시도한다. 복구 불가능한 세션에서 새 계정으로 무언중에 전환하지 않는다. 첫 닉네임 창을 닫고 공개 피드를 읽을 수 있게 한다.
- [ ] Step 3: API와 중앙 피드·작성 모달·본인 메뉴를 연결한다. 빈 게시물 차단, 닉네임 변경, 삭제 확인, 조회 중·빈 피드·실패 상태를 포함한다. UUID는 제출 전에 생성하고 재시도에도 유지한다. 응답을 못 받은 경우 readEntry로 그 ID의 저장 결과를 확인한 후 재전송한다.
- [ ] Step 4: 저장 중 닫기와 중복 제출을 막고, 성공한 뒤 창을 닫는다. 충돌 시 입력을 유지하고 최신 내용을 확인·다시 읽는 선택을 제공한다. 입력 중 창을 닫으면 버릴지 확인한다.
- [ ] Step 5: 단위 검증·typecheck를 통과시킨다. 브라우저에서 글만 있는 게시물의 CRUD와 재방문 닉네임 유지를 확인한다. 아직 구현하지 않은 Realtime 동작을 완료했다고 보고하지 않는다.
- [ ] Step 6: 해당 파일만 `feat: connect anonymous identity and guestbook editor`로 커밋한다.

### Task 4: 이미지 압축·업로드·개별 편집

**Files:** Create `src/features/media/compressImage.ts`, `src/features/media/uploadMedia.ts`, `src/features/media/ImageAttachments.tsx`, 이름 `guestbook_storage`인 migration, `tests/unit/imageCompression.test.ts`, `tests/integration/storage.test.ts`. Modify `src/features/entries/EntryComposer.tsx`, `src/domain/guestbook.ts`, `README.md`.

**Interfaces:** Produces `compressImage(file: File): Promise<Result<File>>`, `uploadMedia(entryId: string, kind: 'image' | 'drawing_preview', file: File): Promise<Result<MediaAsset>>`, DB RPC `reserve_media_upload(p_entry_id uuid, p_kind text) → {assetId, bucket, objectPath}`. 작성 상태는 기존 asset과 새 File을 구분하고, 저장 시 imageAssetIds로 변환한다.

- [ ] Step 1: `imageCompression.test.ts`에 `rejects_original_over_15_mib`, `rejects_non_image_or_unsupported_type`를 작성한다. `storage.test.ts`에는 `reserved_owner_can_upload_but_other_user_cannot`, `unreserved_path_is_rejected`, `missing_uploaded_object_cannot_be_attached`, `six_images_or_oversize_metadata_rolls_back`를 작성한다. 15*1024*1024+1 원본 거절, 타인·미예약 업로드 거절, 6장 저장 실패 후 기존 이미지 배열 유지가 기대 결과다.

```ts
// rejects_original_over_15_mib
expect((await compressImage(new File([new Uint8Array(15 * 1024 * 1024 + 1)],
  'large.jpg', {type: 'image/jpeg'}))).ok).toBe(false)
// reserved_owner_can_upload_but_other_user_cannot / six_images_or_oversize_metadata_rolls_back
expect(ownerUpload.error).toBeNull()
expect(otherUserUpload.error).not.toBeNull()
expect(afterRejectedSave.data.images).toEqual(beforeRejectedSave.data.images)
```
- [ ] Step 2: `npx.cmd supabase migration new guestbook_storage`로 migration을 생성한다. guestbook-media 버킷은 공개 조회·WebP·1 MiB로 설정한다. 예약된 본인 경로에 INSERT만 허용하며 덮어쓰기·직접 DELETE는 거절한다. 업로드 확인은 실제 Storage 메타데이터를 사용한다.
- [ ] Step 3: 이미지 방향을 보존해 긴 변 1,600px 이하로 줄이고 WebP 품질을 단계적으로 낮춰 1 MiB에 맞춘다. 변환 불가·디코드 실패·목표 초과는 오류로 반환하고 원본을 서버에 보관하지 않는다. 불필요해진 Object URL을 해제한다.
- [ ] Step 4: 이미지 추가·제거·교체·순서 변경을 연결한다. 새 파일들을 먼저 올린 후 한 번의 save_entry로 확정한다. 실패하면 기존 글을 유지하고 이미 올라간 asset은 초안에 보관해 재사용한다. 업로드 후 창 종료로 남은 asset은 24시간 이후 정리 대상이다.
- [ ] Step 5: 단위·Storage 통합 검증을 실행한다. 브라우저에서 이미지 단독 게시물, 5장 저장, 6장 차단, 이미지 방향, 최대 변 1,600px, WebP 1 MiB를 확인한다. 업로드 일부 실패 후에도 본문·선택 파일이 남고 불완전한 글이 DB에 확정되지 않아야 한다.
- [ ] Step 6: 해당 파일만 `feat: add bounded image uploads and attachment editing`으로 커밋한다.

### Task 5: 저장 후 재편집하는 Canvas

**Files:** Create `src/features/drawing/document.ts`, `src/features/drawing/render.ts`, `src/features/drawing/DrawingEditor.tsx`, `tests/unit/drawingDocument.test.ts`, `tests/e2e/drawing.spec.ts`. Modify `src/features/entries/EntryComposer.tsx`, `src/domain/guestbook.ts`, `src/index.css`.

**Interfaces:** Produces `serializeDrawing(document: StrokeDocument): Result<string>`, `parseDrawing(json: string): Result<StrokeDocument>`, `renderDrawing(ctx: CanvasRenderingContext2D, document: StrokeDocument, width: number, height: number): void`. DrawingEditor의 완료 값은 `{document: StrokeDocument, preview: File}`이고, 취소는 초안을 바꾸지 않는다. 미리보기 업로드는 Task 4의 drawing_preview를 사용한다.

- [ ] Step 1: `drawingDocument.test.ts`에 `round_trip_preserves_strokes`, `rejects_json_over_512_kib`, `rejects_non_finite_or_out_of_bounds_points`를 작성한다. 직렬화 후 읽은 문서가 원본과 같고, 524288바이트 초과·좌표 1.1·Infinity는 실패해야 한다. `drawing.spec.ts`의 `clear_can_be_undone`에서는 전체 지우기를 취소하면 직전 그림으로 돌아오는지 확인한다.

```ts
// round_trip_preserves_strokes: 유효한 pen·eraser 획이 있는 원본 document
const encoded = serializeDrawing(document)
expect(encoded.ok).toBe(true)
if (!encoded.ok) throw new Error('valid drawing rejected')
expect(parseDrawing(encoded.value)).toEqual({ok: true, value: document})
// rejects_json_over_512_kib: 유효한 문서 형태에서 획만 늘려 바이트 상한 초과
const oversized = {...document, strokes: [{...document.strokes[0],
  points: Array.from({length: 40000}, () => ({x: 0.5, y: 0.5}))}]}
const oversizedJson = JSON.stringify(oversized)
expect(new TextEncoder().encode(oversizedJson).byteLength).toBeGreaterThan(524288)
expect(parseDrawing(oversizedJson).ok).toBe(false)
```
- [ ] Step 2: 정규화 좌표·재생·실행 취소 이력을 구현한다. 비정상 좌표나 너무 큰 JSON은 재생 전에 거절한다. 압력·레이어·redo는 추가하지 않는다.
- [ ] Step 3: Pointer Events와 pointer capture로 마우스·터치·펜을 받는다. 한 번 찍은 점도 그리고 pointercancel을 처리한다. 캔버스에만 touch-action을 제한한다. 흰 배경, 색·굵기·지우개·취소·전체 지우기, 900×600 비율, 1 MiB 이하 WebP 미리보기를 구현한다.
- [ ] Step 4: 본인 편집용 JSON에서 획을 복원한다. 완료는 초안에만 반영하고 게시물 저장 시 JSON과 미리보기를 함께 확정한다. 용량 초과로 그림을 지우지 않는다.
- [ ] Step 5: 단위 검증과 `npm.cmd run test:e2e -- tests/e2e/drawing.spec.ts`를 통과시킨다. 점·드래그·터치·지우개·취소·전체 지우기 취소·저장 후 재편집·그림만 있는 글을 확인한다. 320×568에서도 완료 버튼이 조작 가능해야 한다.
- [ ] Step 6: 해당 파일만 `feat: add persistent editable canvas drawings`로 커밋한다.

### Task 6: DB 큐 선점·재시도·Cron 작업자

**Files:** Create 이름 `media_cleanup_queue`인 migration, `supabase/functions/media-cleanup/index.ts`, `supabase/functions/media-cleanup/worker.ts`, `supabase/functions/media-cleanup/deno.json`, `supabase/functions/.env.example`, `tests/unit/cleanupWorker.test.ts`, `tests/integration/cleanupQueue.test.ts`. Modify `package.json`, `supabase/config.toml`, `README.md`.

**Interfaces:** Produces 서버 전용 RPC `claim_media_cleanup_job(p_lease_seconds integer, p_max_attempts integer) → CleanupClaim | null`, `complete_media_cleanup_job(p_id uuid, p_claim_token uuid) → boolean`, `retry_media_cleanup_job(p_id uuid, p_claim_token uuid, p_error text, p_delay_seconds integer, p_max_attempts integer) → boolean`, `enqueue_expired_media(p_before timestamptz) → integer`, `purge_completed_media_cleanup_jobs(p_before timestamptz) → integer`, `requeue_failed_media_cleanup_job(p_id uuid) → boolean`. CleanupClaim은 `{id: string, bucket: string, objectPath: string, claimToken: string, attempts: number, leaseUntil: string}`이다.

작업자 함수는 `runCleanup(queue: CleanupQueuePort, storage: StorageDeletePort, now: () => number, settings: CleanupSettings): Promise<CleanupSummary>`이다. CleanupQueuePort는 `claim(): Promise<CleanupClaim | null>`, `complete(claim: CleanupClaim): Promise<boolean>`, `retry(claim: CleanupClaim, error: string, delaySeconds: number): Promise<boolean>`, `enqueueExpired(before: string): Promise<number>`, `purgeCompleted(before: string): Promise<number>`를 제공한다. StorageDeletePort는 `remove(bucket: string, path: string, signal: AbortSignal): Promise<'deleted' | 'absent'>`를 제공하고 그 외 오류는 throw한다. CleanupSummary의 processed·succeeded·retried·failed는 number다. succeeded는 완료 RPC가 true를 반환했을 때만 증가한다.

CleanupSettings의 기본값은 `maxJobs=20`, `budgetMs=20000`, `leaseSeconds=120`, `maxAttempts=5`, `retryDelaySeconds=[60,300,1800,7200]`, `unusedAgeHours=24`, `completedRetentionDays=7`이다. Cron은 매분, 파일 API 타임아웃은 10초다. 모두 설계에서 구현자에게 맡긴 운영값이며 사용자 지정값은 아니다.

- [ ] Step 1: `cleanupWorker.test.ts`에 `empty_queue_exits`, `failed_delete_schedules_retry`, `absent_file_completes`, `stale_claim_cannot_complete`를 작성한다. 빈 큐는 remove 0회, 첫 실패는 60초 재시도, absent는 완료 호출, 오래된 토큰 완료는 false가 기대 결과다. `cleanupQueue.test.ts`에는 동시 선점·롤백·선점 만료·삭제 직후 중단·시도 소진·24시간 미사용·현재 참조 보호를 각각 검증하는 테스트를 작성한다.

```ts
// empty_queue_exits / failed_delete_schedules_retry: 각각 별도 테스트의 관찰값
expect(emptySummary.processed).toBe(0)
expect(storage.remove).not.toHaveBeenCalled()
expect(queue.retry).toHaveBeenCalledWith(claim, expect.any(String), 60)
// cleanupQueue.test.ts: 두 연결에서 동시 선점 후, 만료된 첫 토큰으로 완료 시도
expect(firstClaim.id).not.toBe(secondClaim.id)
expect(staleCompletion.data).toBe(false)
expect(afterExhaustion.status).toBe('failed')
```
- [ ] Step 2: 짧은 트랜잭션과 `FOR UPDATE SKIP LOCKED`로 대기 또는 선점 만료 작업을 가져온다. 시도 상한에 도달한 만료 작업도 failed로 옮긴다. 결과 반영에는 processing·claim_token·유효 기간 일치를 요구한다. pending의 next_attempt_at과 processing의 lease_until에 상태별 부분 인덱스를 둔다.
- [ ] Step 3: DB 잠금이 끝난 뒤 Storage HTTP 삭제를 호출한다. 각 삭제 요청은 AbortSignal로 남은 실행 예산과 10초 중 짧은 시간 안에 중단하고, 예산이 소진되면 추가 선점을 멈춘다. 재첨부를 막는 delete_pending 상태와 참조 검증을 적용하고 경로를 재사용하지 않는다. 이미 없음과 권한·통신 오류를 구분하며 후자를 성공 처리하지 않는다. 선점이 끝난 작업자의 늦은 결과도 새로운 선점을 변경하지 못하게 한다.
- [ ] Step 4: Edge Function은 `x-cleanup-secret`을 검증하고 누락·오류면 DB 호출 전에 401을 반환한다. 사용자 정의 비밀은 `CLEANUP_WORKER_SECRET`으로 둔다. 서버 SDK는 기본 제공 `SUPABASE_URL`과 `JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)["default"]`를 사용하며, 누락 시 비밀 값을 출력하지 않고 설정 오류로 종료한다. 로컬 CLI가 제공하는 변수도 실제 확인하고 배포 환경과 맞춘다. 사용자 정의 변수에 예약 접두사 `SUPABASE_`를 붙이지 않는다. [현재 공식 환경 변수 문서](https://supabase.com/docs/guides/functions/secrets)를 따른다. 독립 인증을 쓰는 이 함수에만 verify_jwt=false를 적용한다. 작업자 RPC의 EXECUTE는 서버 역할에만 허용한다.
- [ ] Step 5: Vault에 호출 비밀을 보관하고 Cron→pg_net→Edge Function을 연결한다. HTTP 호출 제한은 25초로 설정한다. 값이 로그나 SQL 결과에 나오지 않게 한다. 같은 설정 재적용 시 같은 이름의 Cron은 1개만 남긴다. 작업자가 24시간 지난 미사용 asset 등록과 완료 이력 정리도 수행하게 한다.
- [ ] Step 6: 단위 검증과 `npm.cmd run test:integration -- tests/integration/cleanupQueue.test.ts`를 통과시킨다. Deno와 함수 SDK 의존성도 버전을 고정하고, npm dev dependency의 Deno CLI로 `npx.cmd deno check --config supabase/functions/media-cleanup/deno.json supabase/functions/media-cleanup/index.ts`를 실행한다. 두 독립 DB/RPC 연결의 동시 claim은 서로 다른 ID여야 한다. 테스트에서만 선점 기간을 짧게 설정해 만료 후 새 토큰을 받고, 이전 토큰 완료가 false인지 확인한다. 실제 파일 삭제 후 완료만 실패시키고 재시도로 완료할 수 있어야 한다. 익명 역할의 큐 RPC 호출은 거절, 비인증 HTTP는 401이어야 한다.
- [ ] Step 7: README에 Cron 이력, 상태별 건수·최고 대기 시간, failed 원인 확인과 재등록 절차를 기록한다. 별도 관리자 화면은 만들지 않는다. 해당 파일을 `feat: process media cleanup with a database queue`로 커밋한다.

### Task 7: Realtime 동기화와 읽던 위치 유지

**Files:** Create `src/features/realtime/feedState.ts`, `src/features/realtime/subscribeEntries.ts`, `src/features/realtime/useRealtimeFeed.ts`, `tests/unit/feedState.test.ts`, `tests/e2e/realtime.spec.ts`, 이름 `guestbook_realtime`인 migration. Modify `src/features/entries/EntryFeed.tsx`, `src/features/entries/EntryCard.tsx`, `src/features/entries/EntryComposer.tsx`, `src/App.tsx`.

**Interfaces:** Produces `subscribeEntries(onEvent: (event: EntryEvent) => void, onStatus: (status: ConnectionStatus) => void): () => void`. EntryEvent는 `{type: 'INSERT' | 'UPDATE' | 'DELETE', id: string}`, ConnectionStatus는 `connecting | connected | disconnected`다. `useRealtimeFeed()`는 entries·pendingNewCount·connectionStatus·error·loading·hasMore와 `loadMore(): Promise<void>`, `revealNew(): void`, `acceptSaved(entry: Entry): void`, `acceptDeleted(id: string): void`를 제공한다. 공개 조회는 Task 3 API를 사용한다.

- [ ] Step 1: `feedState.test.ts`에 `save_response_and_insert_event_deduplicate`, `older_version_does_not_replace_newer`, `late_fetch_does_not_resurrect_deleted_entry`, `below_top_buffers_new_entries`, `same_timestamp_cursor_is_stable`를 작성한다. 같은 ID는 1개, version 2 뒤 도착한 version 1은 무시, 삭제 후 늦은 조회는 표시 0개가 기대 결과다. `realtime.spec.ts`에는 `two_contexts_receive_create_edit_delete`, `reconnect_reconciles_deleted_and_updated_entries`를 작성한다.

```ts
// save_response_and_insert_event_deduplicate: 같은 저장 응답과 이벤트 적용 후
expect(afterDuplicate.entries.filter(entry => entry.id === entryId)).toHaveLength(1)
// older_version_does_not_replace_newer / late_fetch_does_not_resurrect_deleted_entry
expect(afterOlderResponse.entries.find(entry => entry.id === entryId)?.version).toBe(2)
expect(afterLateResponse.entries.some(entry => entry.id === deletedId)).toBe(false)
// below_top_buffers_new_entries: 기존 표시 목록은 유지하고 대기 목록에 추가
expect(buffered.entries).toEqual(previous.entries)
expect(buffered.pendingNewCount).toBe(1)
```
- [ ] Step 2: entries를 publication에 추가하고 미디어만 바꿔도 entries의 version·updated_at이 갱신되는지 확인한다. 실제 익명 세션으로 공개 SELECT RLS·GRANT를 확인한다. 획 JSON과 내부 큐는 publication에 넣지 않는다.
- [ ] Step 3: 최초 구독 시작 후 조회와 SUBSCRIBED 후 재동기화를 조율하고 그 사이 이벤트를 버퍼한다. INSERT/UPDATE는 ID로 전체 카드를 조회하며 DELETE는 old.id로 제거한다. ID별 요청 세대와 version을 사용해 늦은 응답을 버리고, 저장 성공 응답도 같은 반영 경로를 통과시킨다.
- [ ] Step 4: 재연결·탭 복귀 시 현재 읽은 가장 오래된 커서까지 다시 조회해 삭제·수정을 맞춘다. 첫 20개만 동기화하고 아래쪽을 방치하지 않는다. 열려 있는 편집 초안은 유지한다. 끊김을 표시하고 재연결 시 자동 제출하지 않는다.
- [ ] Step 5: 상단에서는 새 글을 표시하고 아래에서는 새 글 보기 버튼으로 대기 목록을 펼친 뒤 상단으로 이동한다. 생성 시간순을 유지하고 수정한 오래된 글을 선두로 옮기지 않는다. 더 보기는 createdAt과 id를 함께 사용한다.
- [ ] Step 6: 단위 검증과 `npm.cmd run test:e2e -- tests/e2e/realtime.spec.ts`를 통과시킨다. 독립 브라우저 2개에서 글·이미지·그림 CRUD가 재조회 버튼 없이 반영되고, 끊긴 사이의 변경도 복구되는지 확인한다. SUBSCRIBED 로그만으로 성공 판정하지 않는다.
- [ ] Step 7: 해당 파일을 `feat: synchronize guestbook changes in realtime`으로 커밋한다.

### Task 8: 반응형 마무리와 실제 배포 검증

**Files:** Create `tests/e2e/guestbook.spec.ts`. Modify `README.md`, `.env.example`, 필요한 `src/features/` 파일과 `src/index.css`. Vercel 설정이 필요한 경우에만 `vercel.json`을 만든다.

**Interfaces:** Consumes 앞선 모든 작업. Produces 실제 배포 URL, 개발·배포·운영 README, 검증 결과와 미검증 항목.

- [ ] Step 1: `guestbook.spec.ts`에 `text_image_drawing_and_mixed_crud`, `same_nickname_does_not_grant_ownership`, `mobile_editor_preserves_draft`, `clear_site_data_loses_old_identity`를 작성한다. 네 가지 콘텐츠 조합의 저장·재편집·삭제, 같은 닉네임 타인의 변경 거절, 실패 후 초안 유지, 사이트 데이터 삭제 후 기존 소유권 상실을 확인한다. 테스트 예시 데이터를 실제 서비스 초기 데이터로 넣지 않는다.

```ts
// text_image_drawing_and_mixed_crud: 다른 익명 세션의 pageB에 실제 변경 도착
const cardB = pageB.getByTestId(`entry-${entryId}`)
await expect(cardB).toBeVisible()
await expect(cardB).toContainText('수정한 내용')
// 작성자의 삭제를 실행한 뒤
await expect(cardB).toHaveCount(0)
// mobile_editor_preserves_draft: 네트워크 실패를 표시한 뒤
await expect(pageA.getByRole('textbox', {name: '내용'})).toHaveValue('보존할 내용')
```
- [ ] Step 2: 1440px·390×844·320×568에서 피드, 이미지 확대, 모달 스크롤, 키보드 초점, 레이블, 그리는 동안의 스크롤을 확인한다. 시스템 다크 설정에서도 라이트를 유지한다.
- [ ] Step 3: `npm.cmd run test:unit`, `npm.cmd run test:integration`, `npm.cmd run test:e2e`, `npm.cmd run build`를 실행한다. 실패를 고치고 성공한 검증을 이유 없이 반복하지 않는다. 실제 기기 펜 입력을 못 했다면 미검증으로 기록한다.
- [ ] Step 4: 선택한 전용 Supabase에 migration·Storage·익명 Auth·Edge Function·Vault·Cron을 적용하고 advisors를 확인한다. 적용 전에 현재 changelog와 CLI help를 읽는다. 실제 대상 ID를 확인하고 calendar-app을 변경하지 않는다.
- [ ] Step 5: Vercel 대상을 확인하고 배포한다. 부모 Git 저장소를 사용한다면 Root Directory는 realtime-feed, 출력은 dist, build는 npm run build다. 프런트 환경에는 공개 URL·공개 키만 넣고 실제 URL과 Supabase Auth 허용 URL을 맞춘다.
- [ ] Step 6: 배포 URL에서 독립 익명 세션 2개의 CRUD·Realtime·그림 재편집·Storage 삭제를 확인한다. 타인의 DB·연관 행·Storage·큐 변경이 거절되고 Cron이 실제 파일을 지우는지 확인한다. 검증용으로 만든 게시물만 정리한다.
- [ ] Step 7: README에 실행, 환경 변수 이름, migration, 배포, 큐 운영, 공개 이미지, 익명 계정 복구 제한을 적는다. 빌드나 HTTP 200만으로 실제 서비스 완성으로 보고하지 않는다. 관련 파일만 커밋하고 URL·검증 결과·남은 제약을 사용자에게 전달한다.

## 자체 검토와 실행 인계

설계 1~4절은 Task 1·3~5·8, 5절은 Task 2, 6절은 Task 2·4·6, 7절은 Task 7, 8절은 Task 6·8, 9~10절은 Global Constraints와 각 구현 경계, 11절은 각 검증과 Task 8에서 다룬다. Review Focus 5개에도 담당 테스트를 배정했다. 타입·JSON 필드명·RPC 이름·ID 재사용·바이트 상한·DB와 Storage의 트랜잭션 경계를 검토했다.

이 문서는 구현 계획이며, 적힌 테스트·DB 변경·배포를 실행했다는 보고가 아니다. 현재 완료한 것은 설계 승인 반영과 계획 문서 작성이다.

실행 방식은 아직 선택하지 않았다. Native는 이 세션에서 순서대로 구현하고 끝에 별도 검토를 진행한다. Subagent-driven은 각 작업의 구현·검토를 별도 에이전트에 맡긴다. 저장 트랜잭션·미디어 상태·그림·Realtime의 인터페이스가 밀접하게 연결되므로 Native를 추천한다.

계획은 로컬에 없던 superpowers:writing-plans를 [공식 배포처의 SKILL.md](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md)에서 읽고 적용해 작성했다. 설치나 전역 설정 변경은 하지 않았다. 계획 검토와 실행 방식 선택 후 구현을 시작한다.
