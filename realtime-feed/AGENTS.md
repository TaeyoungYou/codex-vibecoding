# AGENTS.md

## 적용 범위

이 지침은 `realtime-feed/`와 그 하위 파일에 적용한다.
사용자의 최신 요청을 우선하고, 기존 변경 사항과 관련 없는 프로젝트를 보존한다.
사용자에게는 한국어로 작업 결과와 검증 상태를 간결하게 전달한다.

## 메모리 뱅크 우선 작업 절차

새 세션·작업 재개·추가 기능 수정·구현 시 다음 순서를 따른다.
제품 코드 조사·편집이나 의존성 설치를 시작하기 전에 메모리 확인을 마친다.

1. [guestbook-memory-bank 스킬][memory-skill]을 열고 적용한다.
2. 아래 기본 문서 6개를 순서대로 먼저 읽는다.
3. [작업 카드 폴더][memory-tasks]에서 진행 중·차단된 카드와 관련 카드를 읽는다.
4. 아래 프로젝트 기준 문서에서 현재 작업에 필요한 내용을 확인한다.

기본 메모리 문서의 읽기 순서와 용도는 다음과 같다.

1. [project-brief.md][memory-brief]: 프로젝트 목적과 현재 범위
2. [active-context.md][memory-context]: 현재 초점과 중단 지점
3. [progress.md][memory-progress]: 완료·진행 중·차단·다음 작업
4. [decision-log.md][memory-decisions]: 결정과 근거, 제안·확정 구분
5. [next-actions.md][memory-next]: 다음 행동과 선행 조건
6. [verification-log.md][memory-verification]: 실제 검사 결과와 미검증 사항

누락된 노트는 스킬 지침에 따라 생성하고 기존 기록을 보존한다.
파일 변경 금지 요청이 있으면 생성·갱신하지 않고 누락 상태만 알린다.
같은 세션에서 이미 읽은 문서는 변경된 내용과 현재 작업에 관련된 부분을 재확인한다.
메모리는 맥락 복구용이며 최신 사용자 요청·기준 문서·현재 파일보다 우선하지 않는다.

작은 작업을 시작하기 전에 카드를 만들거나 갱신한다.
완료·중단 시 카드와 관련 노트에 `done`·`in progress`·`blocked`·`next` 상태를 맞추고,
실제 검증 결과와 다음 행동을 기록한다.
계획만 요청받았다면 계획을 제시하고 제품 코드 편집 전 확인한다.
이미 구현을 요청받았다면 같은 승인을 반복해서 요구하지 않는다.
메모리에는 비밀번호·API 키·토큰·Supabase URL 값·개인 계정 데이터를 저장하지 않는다.

## 작업 전에 읽을 기준 문서

1. [제품 요구사항과 기술 명세][prd]: 기능, 권한, 입력 상한, 인수 기준의 기준이다.
2. [UI 디자인 가이드][design]: 색상, 서체, 간격, 컴포넌트, 반응형, 접근성의 기준이다.
3. [구현 계획][plan]: 작업 순서, 파일 책임, 데이터 계약, 검증 절차를 확인한다.

실행 방법과 현재 동작은 [README.md][readme]를 참고한다.
스킬 작성 당시의 목적과 범위는 [메모리 스킬 작성 계획][memory-plan]을 참고한다.
현재 스킬 동작은 계획의 예정 상태가 아니라 [실제 스킬 파일][memory-skill]에서 확인한다.

`docs/superpowers/specs/`에 명세가 추가되면 작업과 관련된 문서도 읽는다.
새 명세를 만들거나 기준 문서를 옮기면 이 문서의 링크를 함께 갱신한다.

제품 정책과 인수 기준은 PRD를, 시각·상호작용의 구체적인 값은 `DESIGN.md`를 따른다.
구현 계획이 이 기준과 다르면 계획의 해당 부분을 정정한다.
미확정 제안이나 설계자 기본값을 사용자가 개별 승인한 요구사항으로 바꾸어 기록하지 않는다.
기능이나 정책 변경은 PRD에, UI 기준 변경은 `DESIGN.md`에 함께 반영한다.

## 프로젝트 개요와 범위

- 익명 닉네임으로 글·이미지·그림을 남기고, 본인 게시물을 수정·삭제하는 공개 방명록이다.
- React, TypeScript, Vite, shadcn/ui, Tailwind CSS를 사용한다.
- Supabase Auth·PostgreSQL·Realtime·Storage를 연결하고 Vercel에 배포한다.
- 글·이미지·그림 중 하나 이상이 있어야 한다. 상한과 문자·바이트 계산은 PRD를 따른다.
- 그림은 미리보기와 편집용 획 데이터를 보관하며 저장 후 다시 편집할 수 있어야 한다.
- 파일 정리 큐는 일반 PostgreSQL 테이블로 관리한다. Supabase Queues는 사용하지 않는다.
- CAPTCHA·Turnstile, 계정당 생성 간격 10초 제한, 다크 모드 전환은 이번 범위에 넣지 않는다.
- 그 밖의 제외 기능은 PRD와 `DESIGN.md`를 따른다.

2026-10-12 초기 상태는 제품 코드와 `package.json`이 없는 문서 단계였다.
현재 11-7은 합성 샘플 데이터로 UI를 구현하는 단계이며, 변경은 현재 탭에서만 유지한다.
실제 Supabase 연결은 명시 요청 전까지 제외하고 로그인·회원가입·익명 인증을 선행 조건으로 삼지 않는다.
2026-10-12 사용자가 Supabase·API·인증 연동을 명시 요청했다.
이 연동 작업은 [별도 진행 계획][integration-plan]을 따르며 익명 인증을 연결한다.
이메일·비밀번호·소셜 로그인과 Vercel 배포는 별도 요청 없이 추가하지 않는다.
작업을 시작할 때 실제 파일과 설정을 다시 확인하고, 예정된 구조를 구현된 상태로 설명하지 않는다.
문서 작성 요청만으로 앱 구현이나 외부 서비스 변경을 시작하지 않는다.

## UI와 코드 작성 규칙

- 기존 B안의 중앙 단일 열 피드, 흑백·라이트 테마, 작성·수정 모달을 유지한다.
- UI 값은 `DESIGN.md`의 YAML 토큰과 본문 명세를 함께 따른다.
  모바일 값과 최소 크기의 해석도 본문을 확인한다.
- CSS 클래스와 선택자는 `Block__Element--Modifier` 형태의 BEM을 기본으로 한다.
  shadcn/Tailwind 유틸리티도 함께 사용할 수 있다.
- 임시 `.superpowers/` 시안의 예시 데이터·체험 이벤트·접근 키를 제품에 복사하지 않는다.
- 닉네임은 표시용이다. 소유권은 서버의 인증 UUID로 판단한다.
- 업로드·저장 실패, 충돌, 결과 미확인 상태에서 열린 창의 초안을 유지한다.
  서버 확정 전에 성공으로 표시하거나 창을 닫지 않는다.
- 목록의 실시간 변경은 읽던 위치와 편집 초안을 보존해야 한다.
- 공유 타입·입력 검증·API 경계는 구현 계획의 책임 구분을 따른다.
  관련 SDK와 CLI의 현재 공식 문서·설치 버전·`--help`를 확인한다.

## 데이터와 외부 서비스

- 원격 변경 전에 방명록 전용 Supabase와 Vercel 대상이 맞는지 확인한다.
  `calendar-app`이나 다른 기존 서비스를 기본 대상으로 사용하지 않는다.
- 브라우저에는 공개 URL·공개 키만 전달한다.
  서비스 키, 서버 비밀, 계정 토큰을 프런트 빌드·문서·로그·Git에 넣지 않는다.
- 공개 스키마의 RLS와 필요한 GRANT를 함께 확인한다.
  관리자 조회 결과만으로 일반 사용자의 접근 권한을 검증했다고 판단하지 않는다.
- 게시물과 미디어 연결, 버전 검사, 파일 정리 작업 등록의 트랜잭션 계약을 지킨다.
  방문자에게 내부 정리 큐나 작업자 권한을 노출하지 않는다.
- DB 변경은 마이그레이션으로 추적한다.
  이미 적용한 마이그레이션은 삭제·재작성하지 않고 후속 마이그레이션으로 수정한다.
- 검증 데이터는 구분 가능한 별도 데이터만 사용하고 기존 사용자 데이터를 보존한다.

## 실행과 검증

Windows PowerShell에서는 `npm.cmd`와 `npx.cmd`를 사용한다.
의존성을 설치할 때는 버전을 고정하고 `package-lock.json`을 함께 관리한다.

문서 형식 검사는 다음 명령을 사용한다.

```powershell
npx.cmd --yes markdownlint-cli2 AGENTS.md DESIGN.md
npx.cmd --yes --package "@google/design.md@0.4.0" designmd lint DESIGN.md
```

PRD·계획을 편집할 때도 해당 파일의 Markdown 문법과 상대 링크를 확인한다.
`designmd` 검사는 디자인 토큰용이며 PRD 검증을 대신하지 않는다.

제품 구현 후에는 `package.json`의 실제 스크립트를 확인하고 변경에 필요한 검증을 실행한다.
구현 계획에서 예정한 명령은 다음과 같다. 스크립트 생성 전에는 실행 가능하다고 보고하지 않는다.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run test:e2e
```

- 권한·저장·충돌·파일 정리·실시간 복구처럼 데이터에 영향을 주는 로직을 의미 있게 검증한다.
- 독립 익명 세션 두 개에서 생성·수정·삭제 반영과 타인 데이터 변경 거절을 확인한다.
- 데스크톱과 390px·320px, 320×568에서 읽기·작성·그림·키보드 조작을 확인한다.
- 실제 DB·브라우저·배포 검증을 mock, 빌드 성공, HTTP 200, 구독 로그로 대체하지 않는다.
- 환경이 준비되지 않은 통합 검증과 실제 펜 입력은 미검증으로 기록한다.
- 통과한 검증은 새 변경이나 문제가 없는 한 이유 없이 반복하지 않는다.

## Git과 결과 전달

- 작업 시작·종료 시 Git 상태를 확인한다. 스테이징할 때는 관련 파일만 선택한다.
  부모 저장소의 다른 앱과 관련 없는 `.playwright-mcp/` 파일을 포함하지 않는다.
- 커밋 전에 `git diff --cached --check`로 스테이징된 변경을 확인한다.
- 완료 보고에는 변경한 파일, 실행한 검사와 결과, 남은 미검증 사항을 적는다.
  계획·설계·문서 검토를 제품 구현·보안·배포 완료로 보고하지 않는다.

[prd]: docs/superpowers/specs/2026-10-11-realtime-guestbook-design.md
[design]: DESIGN.md
[plan]: docs/superpowers/plans/2026-10-11-realtime-guestbook.md
[readme]: README.md
[memory-skill]: .agents/skills/guestbook-memory-bank/SKILL.md
[memory-plan]: docs/superpowers/plans/2026-10-12-guestbook-memory-bank-skill.md
[memory-brief]: .memory-bank/project-brief.md
[memory-context]: .memory-bank/active-context.md
[memory-progress]: .memory-bank/progress.md
[memory-decisions]: .memory-bank/decision-log.md
[memory-next]: .memory-bank/next-actions.md
[memory-verification]: .memory-bank/verification-log.md
[memory-tasks]: .memory-bank/tasks/
[integration-plan]: docs/superpowers/plans/2026-10-12-guestbook-supabase-integration.md
