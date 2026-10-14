import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry, EntryCursor } from "@/domain/guestbook";
import type { createEntriesApi } from "@/features/entries/api";

const micros = (value: string) =>
  BigInt(Date.parse(value)) * 1000n +
  BigInt((value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
const compare = (a: EntryCursor, b: EntryCursor) => {
  const delta = micros(b.createdAt) - micros(a.createdAt);
  return delta > 0n ? 1 : delta < 0n ? -1 : b.id.localeCompare(a.id);
};
export function mergeEntries(previous: Entry[], incoming: Entry[]): Entry[] {
  const current = new Map(previous.map((e) => [e.id, e]));
  return incoming
    .map((e) =>
      (current.get(e.id)?.version ?? 0) > e.version ? current.get(e.id)! : e,
    )
    .sort(compare);
}
export function boundReadWindow(
  entries: Entry[],
  oldestRead: EntryCursor | null,
  nextCursor: EntryCursor | null,
): { entries: Entry[]; nextCursor: EntryCursor | null } {
  if (!oldestRead) return { entries, nextCursor };
  const within = entries.filter((entry) => compare(entry, oldestRead) <= 0);
  // A new row can push the old boundary into the next page. Do not treat the
  // extra older rows fetched with that page as new unread greetings.
  return {
    entries: within,
    nextCursor:
      within.length < entries.length
        ? (within.at(-1) ?? oldestRead)
        : nextCursor,
  };
}
function applyWithAnchor(action: () => void) {
  const anchors = Array.from(
    document.querySelectorAll<HTMLElement>("[data-entry-id]"),
  )
    .filter((el) => el.getBoundingClientRect().bottom > 80)
    .map((el) => ({
      id: el.dataset.entryId,
      top: el.getBoundingClientRect().top,
    }));
  action();
  requestAnimationFrame(() => {
    if (window.scrollY < 100) return;
    for (const anchor of anchors) {
      const el = document.querySelector<HTMLElement>(
        `[data-entry-id="${anchor.id}"]`,
      );
      if (el) {
        window.scrollBy(0, el.getBoundingClientRect().top - anchor.top);
        break;
      }
    }
  });
}
export function useGuestbookFeed(
  client: SupabaseClient | null,
  api: ReturnType<typeof createEntriesApi> | null,
) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(!!client);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("연결 중");
  const [cursor, setCursor] = useState<EntryCursor | null>(null);
  const cursorRef = useRef<EntryCursor | null>(null);
  const oldest = useRef<EntryCursor | null>(null);
  const allLoaded = useRef<Entry[]>([]);
  const sequence = useRef(0);
  const connected = useRef(false);
  const connectionPhase = useRef("connecting");
  const scheduled = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const loadingMore = useRef(false);
  const syncing = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!api || syncing.current) return;
    syncing.current = true;
    try {
      let again = true;
      while (again && mounted.current) {
        const version = sequence.current;
        const target = oldest.current;
        const collected: Entry[] = [];
        let next: EntryCursor | null = null;
        let failed = false;
        do {
          const page = await api.list(next);
          if (!mounted.current) return;
          if (!page.ok) {
            setError(page.error.message);
            setStatus("최신 내용 확인 실패");
            failed = true;
            break;
          }
          collected.push(...page.value.entries);
          next = page.value.nextCursor;
          const last = collected.at(-1);
          if (!target || !last || compare(last, target) >= 0) break;
        } while (next);
        again = version !== sequence.current;
        if (failed) break;
        if (again) continue; // An event arrived during a read; discard that snapshot.
        const previous = allLoaded.current;
        const bounded = boundReadWindow(collected, target, next);
        next = bounded.nextCursor;
        const merged = mergeEntries(previous, bounded.entries);
        allLoaded.current = merged;
        cursorRef.current = next;
        setCursor(next);
        if (!target && merged.length) oldest.current = merged.at(-1)!;
        const previousIds = new Set(previous.map((e) => e.id));
        applyWithAnchor(() => {
          if (previous.length && window.scrollY > 160) {
            const waiting = merged.filter((e) => !previousIds.has(e.id));
            setPending((prev) => {
              const ids = new Set([...prev, ...waiting].map((e) => e.id));
              return merged.filter((e) => ids.has(e.id));
            });
            setEntries((prev) => {
              const shown = new Set(prev.map((e) => e.id));
              return merged.filter((e) => shown.has(e.id));
            });
          } else {
            setEntries(merged);
            setPending([]);
          }
        });
        setError("");
        setLoading(false);
        setStatus(
          connected.current
            ? "실시간 연결됨"
            : connectionPhase.current === "connecting"
              ? "연결 중"
              : "연결 끊김",
        );
      }
    } finally {
      syncing.current = false;
      setLoading(false);
    }
  }, [api]);
  const schedule = useCallback(() => {
    sequence.current++;
    clearTimeout(scheduled.current);
    scheduled.current = setTimeout(() => {
      void refresh();
    }, 100);
  }, [refresh]);
  useEffect(() => {
    if (!client || !api) return;
    mounted.current = true;
    void refresh();
    const channel = client
      .channel("guestbook-entries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entries" },
        schedule,
      )
      .subscribe((state) => {
        connected.current = state === "SUBSCRIBED";
        connectionPhase.current = connected.current ? "connected" : "offline";
        if (connected.current) {
          setStatus("최신 내용 확인 중");
          schedule();
        } else setStatus("연결 끊김");
      });
    const resume = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", schedule);
    return () => {
      mounted.current = false;
      sequence.current++;
      clearTimeout(scheduled.current);
      void client.removeChannel(channel);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", schedule);
    };
  }, [client, api, refresh, schedule]);
  const loadMore = async () => {
    if (!api || !cursorRef.current || loadingMore.current || syncing.current)
      return;
    loadingMore.current = true;
    setMoreLoading(true);
    const version = sequence.current;
    const page = await api.list(cursorRef.current);
    if (page.ok && mounted.current && version === sequence.current) {
      const combined = new Map(allLoaded.current.map((e) => [e.id, e]));
      for (const e of page.value.entries)
        if (!combined.has(e.id) || combined.get(e.id)!.version < e.version)
          combined.set(e.id, e);
      allLoaded.current = [...combined.values()].sort(compare);
      oldest.current = allLoaded.current.at(-1) ?? null;
      cursorRef.current = page.value.nextCursor;
      setCursor(page.value.nextCursor);
      setEntries((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        page.value.entries.forEach((e) => ids.add(e.id));
        return allLoaded.current.filter((e) => ids.has(e.id));
      });
      setError("");
    } else if (!page.ok) setError(page.error.message);
    loadingMore.current = false;
    setMoreLoading(false);
  };
  const showNew = () => {
    setEntries(allLoaded.current);
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return {
    entries,
    loading,
    moreLoading,
    error,
    status,
    cursor,
    newCount: pending.length,
    refresh: schedule,
    loadMore,
    showNew,
  };
}
