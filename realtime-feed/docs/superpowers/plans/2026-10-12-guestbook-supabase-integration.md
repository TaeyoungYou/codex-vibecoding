# Supabase·API·익명 인증 연동 계획

작성일: 2026-10-12
최종 갱신일: 2026-10-14
상태: done. 실제 연동과 요청 범위 검증 완료.

## 목표와 범위

사용자가 Supabase·API·인증 연동의 계획과 진행을 요청했다.
기존 승인된 [PRD][prd]와 [전체 계획][plan]을 현재 샘플 UI에 적용한다.
이메일·비밀번호·소셜 로그인은 추가하지 않고 닉네임 입력 시 익명 인증을 사용한다.
API는 Supabase Data API와 트랜잭션 RPC로 구성한다. 별도 웹 서버는 만들지 않는다.
기존 B안과 그림 편집기를 유지하고 샘플 모드는 명시적으로 구분한다.

## 진행 순서와 파일 책임

1. 전용 Supabase 대상을 확인한다. 사용자 선택과 월 $0 확인 후
   `realtime-feed`를 캐나다 중부 리전에 생성했다. 다른 앱은 사용하지 않는다.
2. `supabase/migrations/`에 프로필·게시물·미디어·획·정리 큐와 RPC를 만든다.
   공개 조회와 작성자 변경을 분리하고 RLS·GRANT·버전 검사·롤백을 검증한다.
3. `src/lib/`, `src/features/auth/`, `src/features/entries/api.ts`에
   SDK·오류·API를 둔다.
   닉네임 실패 시 같은 익명 계정으로 재시도하고 세션 소실을 안내한다.
4. `src/features/media/`에서 준비된 경로로 업로드하고 실제 객체 메타데이터를 확인한다.
   그림 획은 공개 조회·Storage·Realtime payload에 포함하지 않는다.
5. `src/App.tsx`와 작성·닉네임·삭제 창을 비동기 API에 연결한다.
   중복 제출·저장 중 닫기를 막고 실패·충돌·결과 미확인 시 초안을 유지한다.
6. `src/features/realtime/`에 구독·동기화·복구를 둔다.
   읽은 범위와 스크롤 위치를 보존하고 아래에서 읽을 때 새 글 버튼을 제공한다.
7. `supabase/functions/media-cleanup/`에 인증된 정리 작업자를 둔다.
   일반 DB 큐를 선점하고 Storage API 삭제·재시도·만료 처리를 수행한다.
8. `.env.example`, `README.md`, 작업 기록에 설정·운영·실제 검증 결과를 남긴다.

## 검증과 완료 조건

- 타입·빌드·단위 검사와 PostgreSQL 엔진에서 마이그레이션·트랜잭션을 검사한다.
- 실제 Supabase에서는 별도 익명 세션 두 개로 CRUD·타인 변경 거절·Storage·Realtime를 검사한다.
- 동일 ID 재시도·오래된 버전·빈 저장·미디어 검증 실패에서 기존 데이터를 보존한다.
- 파일 정리 큐의 토큰·선점 만료·실패 재시도와 실제 Storage 삭제를 구분해 확인한다.
- 브라우저에서 실패 초안·재방문·편집용 획 복원·반응형과 키보드를 확인한다.
- 전용 원격 환경이 없으면 원격 연동을 완료로 표시하지 않는다.
  내장 PostgreSQL 검사는 실제 Auth·Storage·Realtime·배포 검증을 대신하지 않는다.

## 경계와 결정

Supabase 실제 연동 제외 규칙은 이번 명시 요청의 연동 범위에서 해제한다.
다른 앱의 DB, 유료 요금제, Vercel 배포, 계정 로그인 기능은 이 요청으로 승인되지 않는다.
비밀과 실제 Supabase URL 값은 메모리·문서·로그·Git에 넣지 않는다.
공개 연결 설정은 Git 제외 환경 파일로만 전달한다.
기존 문서·샘플 UI 작업 기록과 사용자 변경은 보존한다.

## 실제 적용 상태

- 전용 DB에 마이그레이션 3개를 적용했다. 파일명만 원격의 실제 버전에 맞췄다.
  이미 적용한 SQL 내용과 원격 이력은 재작성하지 않았다.
- 익명 로그인 한 항목만 활성화하고 공개 환경 설정은 Git 제외 파일에 연결했다.
- verify-media와 media-cleanup 함수, 작업자 비밀·Vault·매분 Cron을 준비했다.
- 실제 API의 UUID 권한·충돌과 두 브라우저의 이미지·그림 재편집·실시간 복구를 통과했다.
- 정리 함수의 배포 파일 누락을 수정했다. 실제 파일 3개 삭제·Cron HTTP 200을 확인했다.
- 세부 결과와 남은 실기기·배포 검증은 [검증 기록][verification]에 둔다.

[prd]: ../specs/2026-10-11-realtime-guestbook-design.md
[plan]: 2026-10-11-realtime-guestbook.md
[verification]: ../../../.memory-bank/verification-log.md
