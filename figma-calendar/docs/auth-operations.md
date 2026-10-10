# 익명 인증 운영 안내

이 앱은 CAPTCHA를 통과할 때 Supabase 익명 계정을 생성한다. 토큰은 로컬 서버 메모리 또는 Vercel의 암호화된 private 세션 테이블에 보관한다. 같은 브라우저의 유효 세션은 재사용한다. 로컬 서버 재시작·최대 1시간 만료 이후 새로 입장하면 새 계정이 생길 수 있다. Vercel 인스턴스 교체는 세션을 유지한다. 앱 종료와 세션 만료는 Supabase 계정을 삭제하지 않는다.

[Supabase 공식 안내](https://supabase.com/docs/guides/auth/auth-anonymous)에 따르면 익명 사용자 자동 정리는 제공되지 않는다. 이 프로젝트에도 자동 삭제·관리 API·관리 키를 추가하지 않았다.

## 사용량 확인

calendar-app의 [Authentication → Users](https://supabase.com/dashboard/project/fnqefwbxqtanhnfpxrml/auth/users)에서 익명 사용자 누적을 확인한다. 조직 Dashboard의 Usage와 Database 보고서에서 Auth 사용량과 DB 크기를 함께 확인한다. 누적 계정 수와 청구 대상 사용량은 같은 지표가 아니므로 현재 요금제의 Dashboard 값을 기준으로 판단한다.

SQL Editor에서 아래 읽기 전용 쿼리로 정리 후보 수를 확인할 수 있다. 앱의 calendar_runtime에는 auth.users 조회·삭제 권한이 없다.

```sql
select count(*) as anonymous_users,
       count(*) filter (
         where created_at < now() - interval '30 days'
           and coalesce(last_sign_in_at, created_at) < now() - interval '30 days'
       ) as inactive_candidates
from auth.users
where is_anonymous is true;
```

2026-10-09 검증에서는 기존 익명 계정 0개에서 실제 CAPTCHA 로그인·재인증 검증으로 계정이 생성됐다. 현재 수와 기존 일정 보존 결과는 [검증 기록](verification.md)에 적었다. 검증이 생성한 계정도 임의 삭제하지 않았다.

## 수동 정리

1. 로컬은 앱 서버를 종료해 메모리 토큰·인증 세션을 폐기한다. Vercel 세션을 일괄 폐기하려면 Production의 CALENDAR_SESSION_SECRET을 새 무작위 키로 교체하고 재배포한다. 필요한 다른 앱이 이 프로젝트의 Auth를 공유하는지 먼저 확인한다.
2. SQL Editor 또는 Users 화면에서 `is_anonymous=true`이고 생성·마지막 로그인 모두 30일보다 오래된 후보를 확인한다. 다른 사용자로 전환됐거나 사용 중인 계정은 제외한다. 필요한 백업과 사용자 참조 관계를 확인한다.
3. 관리자 화면의 사용자 삭제 기능으로 검토한 계정만 삭제한다. SQL을 사용할 경우 아래처럼 **검토한 UUID를 직접 지정**하고 transaction에서 반환된 UUID를 확인한 뒤 COMMIT 또는 ROLLBACK한다. 아래 placeholder는 실제 UUID로 바꾸기 전에는 실행하지 않는다.

```sql
begin;
delete from auth.users
where id in ('검토한-실제-UUID'::uuid)
  and is_anonymous is true
  and created_at < now() - interval '30 days'
  and coalesce(last_sign_in_at, created_at) < now() - interval '30 days'
returning id;
-- 반환된 ID를 확인한 다음 COMMIT; 또는 ROLLBACK; 중 하나를 실행한다.
```

4. 남은 계정 수를 다시 확인하고 앱을 시작한다. 실제 CAPTCHA 재입장과 공유 일정 보존을 확인한다. calendar_private.events는 사용자별 소유 모델이나 auth.users 외래 키가 없으므로 정리를 위해 일정 테이블을 삭제/변경할 필요가 없다.

사용자 삭제가 이미 발급된 JWT의 즉시 무효화를 뜻하지는 않는다. [공식 사용자 관리 안내](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users)를 따른다. 이 앱은 서버 재시작 후 이전 로컬 세션을 받아들이지 않고, 보호 요청마다 getUser로 사용자를 검증한다. 다른 서비스가 토큰을 사용한다면 해당 서비스의 세션 폐기와 토큰 만료도 별도로 처리해야 한다.

## 검증과 설정 변경

실제 CAPTCHA secret은 Supabase Dashboard에만 둔다. 앱의 setup:auth는 publishable key만 비표시로 받아 서버 설정에 기록한다. 설정 후 로컬 서버를 재시작하거나 Vercel을 재배포한다. 관리자 키·secret·Auth 토큰을 채팅·명령 인자·로그·Git에 복사하지 않는다.

자동 브라우저가 실제 Turnstile에 차단되면 사용자가 정상 브라우저에서 직접 완료한다. [Cloudflare 공식 테스트 안내](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)의 dummy key는 격리 fixture에만 사용하며, 그 결과를 실제 Supabase 인증 성공으로 간주하지 않는다.
