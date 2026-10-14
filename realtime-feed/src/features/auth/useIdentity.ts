import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/domain/guestbook";
import { createIdentityApi } from "./api";

export function useIdentity(client: SupabaseClient | null) {
  const api = useMemo(
    () => (client ? createIdentityApi(client) : null),
    [client],
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!client);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const restore = useCallback(async () => {
    if (!api) return;
    const version = ++generation.current;
    setLoading(true);
    const result = await api.restore();
    if (version !== generation.current) return;
    if (result.ok) {
      setProfile(result.value);
      const previousIdentity =
        localStorage.getItem("guestbook-had-identity") === "yes";
      setError(
        !result.value && previousIdentity
          ? "이전 작성자 인증을 복구하지 못했어요. 다시 시작하면 이전 인사의 변경 권한은 돌아오지 않아요."
          : "",
      );
    } else {
      setProfile(null);
      setError(result.error.message);
    }
    setLoading(false);
  }, [api]);
  useEffect(() => {
    if (!client) return;
    void restore();
    let timer: ReturnType<typeof setTimeout>;
    const { data } = client.auth.onAuthStateChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void restore();
      }, 0);
    });
    return () => {
      generation.current++;
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [client, restore]);
  const begin = useCallback(
    async (name: string): Promise<string | null> => {
      if (!api) return "Supabase 연결 설정이 필요해요.";
      const result = await api.begin(name);
      if (!result.ok) return result.error.message;
      generation.current++;
      setProfile(result.value);
      setLoading(false);
      setError("");
      localStorage.setItem("guestbook-had-identity", "yes");
      return null;
    },
    [api],
  );
  return { profile, loading, error, begin, restore };
}
