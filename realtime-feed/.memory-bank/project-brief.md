# 프로젝트 요약

최종 갱신일: 2026-10-14

글·이미지·직접 그린 그림으로 인사를 남기는 실시간 방명록이다.
11-7의 샘플 UI를 먼저 완료한 뒤 사용자의 명시 요청으로 실제 연동을 진행했다.
전용 `realtime-feed`에 익명 인증·API·미디어·실시간·파일 정리를 연결했다.
2026-10-14 실제 두 익명 세션과 브라우저 검증을 통과했다.
이메일·비밀번호·소셜 로그인은 제외했다.
2026-10-14 별도 사용자 요청으로 Vercel 미리보기 배포와 주요 실제 연동 검증을 완료했다.
사용자의 미리보기 확인 후 공개 운영 배포와 인증 없는 주요 연동 검증도 완료했다.
별도 사용자 요청으로 GitHub push와 main 기반 Vercel 자동 운영 배포도 연결했다.
전체 출시 인수와 실기기 검증은 남아 있다.

- [프로젝트 지침](../AGENTS.md)
- [UI 기준](../DESIGN.md)
- [제품 요구사항](../docs/superpowers/specs/2026-10-11-realtime-guestbook-design.md)
- [전체 구현 계획](../docs/superpowers/plans/2026-10-11-realtime-guestbook.md)
- [현재 UI 작업](tasks/2026-10-12-sample-guestbook-ui.md)
- [현재 연동 작업](tasks/2026-10-12-supabase-integration.md)
- [Vercel 미리보기 배포](tasks/2026-10-14-vercel-preview-deployment.md)
- [Vercel 공개 운영 배포](tasks/2026-10-14-vercel-production-deployment.md)
- [GitHub push와 Vercel 자동 배포](tasks/2026-10-14-github-vercel-integration.md)
