import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/domain/guestbook";
import { nicknameError } from "@/domain/validation";
import { parseProfile } from "@/features/entries/contracts";
import { apiError, failure, success, type Result } from "@/lib/errors";

export function createIdentityApi(client: SupabaseClient) {
  let beginning: Promise<Result<Profile>> | null = null;
  return {
    async restore(): Promise<Result<Profile | null>> {
      try {
        const session = await client.auth.getSession();
        if (session.error) return { ok: false, error: apiError(session.error) };
        if (!session.data.session) return success(null);
        const user = await client.auth.getUser();
        if (user.error?.status === 401 || user.error?.status === 403)
          await client.auth.signOut({ scope: "local" });
        if (user.error || !user.data.user)
          return { ok: false, error: apiError(user.error) };
        const profile = await client
          .from("profiles")
          .select("id,nickname")
          .eq("id", user.data.user.id)
          .maybeSingle();
        if (profile.error) return { ok: false, error: apiError(profile.error) };
        return success(profile.data ? parseProfile(profile.data) : null);
      } catch (error) {
        return { ok: false, error: apiError(error) };
      }
    },
    begin(nickname: string): Promise<Result<Profile>> {
      if (beginning) return beginning;
      beginning = (async () => {
        const problem = nicknameError(nickname);
        if (problem) return failure<Profile>("invalid", problem);
        try {
          const existing = await client.auth.getSession();
          if (existing.error)
            return { ok: false as const, error: apiError(existing.error) };
          if (!existing.data.session) {
            const signed = await client.auth.signInAnonymously();
            if (signed.error)
              return { ok: false as const, error: apiError(signed.error) };
          } else {
            const verified = await client.auth.getUser();
            if (verified.error)
              return { ok: false as const, error: apiError(verified.error) };
          }
          const result = await client.rpc("set_nickname", {
            p_nickname: nickname.trim(),
          });
          if (result.error)
            return { ok: false as const, error: apiError(result.error) };
          return success(parseProfile(result.data));
        } catch (error) {
          return { ok: false as const, error: apiError(error) };
        }
      })().finally(() => {
        beginning = null;
      });
      return beginning;
    },
  };
}
