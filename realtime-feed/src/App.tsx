import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronDown,
  ImagePlus,
  MessageSquare,
  NotebookPen,
  Pencil,
  PenLine,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog, Modal } from "@/components/Modal";
import type { Draft, EditEntry, MediaAsset } from "@/domain/guestbook";
import EntryCard from "@/features/entries/EntryCard";
import EntryComposer, {
  type ComposerIntent,
} from "@/features/entries/EntryComposer";
import NicknameDialog from "@/features/identity/NicknameDialog";
import { sampleEntries } from "@/features/entries/sampleEntries";
import { guestbookClient, sampleMode } from "@/lib/supabase";
import { useIdentity } from "@/features/auth/useIdentity";
import { createEntriesApi } from "@/features/entries/api";
import { useGuestbookFeed } from "@/features/realtime/useGuestbookFeed";

const localVisitorId = "local-preview-visitor";
const entriesApi = guestbookClient ? createEntriesApi(guestbookClient) : null;

export default function App() {
  const [localEntries, setEntries] = useState(sampleEntries);
  const [localNickname, setNickname] = useState<string | null>(null);
  const identity = useIdentity(guestbookClient);
  const feed = useGuestbookFeed(guestbookClient, entriesApi);
  const entries: EditEntry[] = sampleMode
    ? localEntries
    : feed.entries.map((entry) => ({ ...entry, drawingDocument: null }));
  const nickname = sampleMode
    ? localNickname
    : (identity.profile?.nickname ?? null);
  const visitorId = sampleMode ? localVisitorId : identity.profile?.id;
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<ComposerIntent | null>(
    null,
  );
  const [composer, setComposer] = useState<{
    entry: EditEntry | null;
    intent: ComposerIntent;
    id: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<EditEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const [viewing, setViewing] = useState<MediaAsset | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (
      !sampleMode &&
      guestbookClient &&
      !identity.loading &&
      !identity.profile &&
      !greeted.current
    ) {
      greeted.current = true;
      setNicknameOpen(true);
    }
  }, [identity.loading, identity.profile]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function start(intent: ComposerIntent) {
    if (!sampleMode && !guestbookClient) {
      setNotice("Supabase 연결 설정이 필요해요.");
      return;
    }
    if (!sampleMode && identity.loading) {
      setNotice("작성자 인증을 확인 중이에요.");
      return;
    }
    opener.current = document.activeElement as HTMLElement;
    if (!nickname) {
      setPendingIntent(intent);
      setNicknameOpen(true);
      return;
    }
    setComposer({ entry: null, intent, id: crypto.randomUUID() });
  }
  async function save(draft: Draft): Promise<string | null> {
    if (!nickname || !composer) return "표시할 닉네임을 먼저 정해주세요.";
    if (!sampleMode) {
      if (!entriesApi || !visitorId) return "작성자 인증을 먼저 확인해주세요.";
      const result = await entriesApi.saveDraft(
        composer.id,
        composer.entry?.version ?? null,
        draft,
        visitorId,
      );
      if (!result.ok) return result.error.message;
      setComposer(null);
      feed.refresh();
      setNotice(composer.entry ? "인사를 수정했어요." : "인사를 남겼어요.");
      return null;
    }
    const original = composer.entry;
    const existing = original
      ? entries.find((entry) => entry.id === original.id)
      : null;
    if (original && (!existing || existing.authorId !== localVisitorId))
      return "이 인사는 더 이상 수정할 수 없어요. 작성 중인 내용은 유지돼요.";
    if (original && existing?.version !== original.version)
      return "다른 내용으로 수정된 인사예요. 현재 초안을 유지했어요.";
    const now = new Date().toISOString();
    const entry: EditEntry = {
      ...draft,
      id: original?.id ?? crypto.randomUUID(),
      authorId: localVisitorId,
      nickname: original?.nickname ?? nickname,
      version: (original?.version ?? 0) + 1,
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    };
    setEntries((previous) =>
      original
        ? previous.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...previous],
    );
    setComposer(null);
    setNotice(
      original ? "이 탭의 인사를 수정했어요." : "이 탭에 인사를 남겼어요.",
    );
    if (!original) window.scrollTo({ top: 0, behavior: "instant" });
    return null;
  }

  async function removeEntry() {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      if (sampleMode) {
        if (deleting.authorId !== localVisitorId) return;
        setEntries((previous) =>
          previous.filter((entry) => entry.id !== deleting.id),
        );
      } else {
        if (!entriesApi) return;
        const result = await entriesApi.delete(deleting.id, deleting.version);
        if (!result.ok) {
          setDeleteError(result.error.message);
          return;
        }
        feed.refresh();
      }
      setDeleting(null);
      setNotice(
        sampleMode
          ? "이 탭의 인사를 삭제했어요."
          : "인사를 삭제했어요. 첨부 파일은 이후 정리돼요.",
      );
    } finally {
      deleteLock.current = false;
      setDeleteBusy(false);
    }
  }

  return (
    <div className="Guestbook">
      <a className="SkipLink" href="#guestbook-feed">
        인사 목록으로 건너뛰기
      </a>
      <header className="Guestbook__Header">
        <div className="Guestbook__HeaderInner">
          <a href="/" className="Guestbook__Brand" aria-label="방명록 소개로">
            <span className="Guestbook__BrandMark">
              <NotebookPen size={20} aria-hidden="true" />
            </span>
            방명록
          </a>
          <div className="Guestbook__HeaderActions">
            <span className="Guestbook__Mode">
              <span aria-hidden="true" />
              {sampleMode
                ? "샘플 모드"
                : guestbookClient
                  ? feed.status
                  : "연결 설정 필요"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="Guestbook__IdentityMenu"
                  id="identity-menu"
                >
                  <span className="Avatar Avatar--Small" aria-hidden="true">
                    {nickname ? Array.from(nickname)[0] : "?"}
                  </span>
                  <span>{nickname ?? "방문자"}</span>
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    window.setTimeout(() => {
                      opener.current = document.getElementById("identity-menu");
                      setPendingIntent(null);
                      setNicknameOpen(true);
                    }, 0)
                  }
                >
                  <Pencil />
                  {nickname ? "닉네임 바꾸기" : "닉네임 정하기"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="Guestbook__Main">
        {!sampleMode && feed.status === "연결 끊김" && (
          <p className="EntryFeed__Status" role="status">
            연결이 끊겼어요. 화면이 최신 상태가 아닐 수 있어요.
          </p>
        )}
        {!sampleMode && !guestbookClient && (
          <div className="EntryFeed__Status" role="status">
            Supabase 연결 설정이 필요해요. 실행 환경을 설정한 뒤 다시
            시작해주세요.
          </div>
        )}
        {!sampleMode && identity.error && (
          <div className="EntryFeed__Status" role="status">
            {identity.error}
            <Button
              variant="outline"
              onClick={() => {
                void identity.restore();
              }}
            >
              인증 다시 확인
            </Button>
          </div>
        )}
        <section className="Guestbook__Intro" aria-labelledby="page-title">
          <div>
            <p className="Guestbook__Eyebrow">
              <span />
              작은 인사가 모이는 곳
            </p>
            <h1 id="page-title">
              잠깐 들렀다면,
              <br />
              인사 한 줄 남겨주세요.
            </h1>
            <p className="Guestbook__Description">
              스쳐 지나가는 생각도, 서툰 그림도 좋아요.
              <br />
              오늘의 작은 흔적을 이곳에 남겨보세요.
            </p>
          </div>
          <svg
            className="Guestbook__Doodle"
            viewBox="0 0 150 130"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M25 42q-8-18 5-20 14-3 20 24 7-31 19-22 12 7-1 30 25-13 30 0 3 13-27 20 27 11 17 23-9 10-29-12 4 28-10 29-13-1-10-32-19 20-28 9-9-13 17-27-28-4-24-17 3-11 28-5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="m108 17 3 9 10 1-9 4-1 10-4-9-10-2 10-4Zm12 75q18 1 13-14-4-9-12-1-7 7-11 23"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle
              cx="48"
              cy="62"
              r="10"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </section>
        <section
          className="Guestbook__ComposerTrigger"
          aria-label="인사 작성 시작"
        >
          <div className="Guestbook__PromptRow">
            <span className="Avatar Avatar--Composer" aria-hidden="true">
              {nickname ? Array.from(nickname)[0] : <PenLine size={20} />}
            </span>
            <button className="Guestbook__Prompt" onClick={() => start("text")}>
              무슨 이야기를 남길까요?
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="Guestbook__ComposerActions">
            <div>
              <Button variant="ghost" onClick={() => start("image")}>
                <ImagePlus />
                이미지
              </Button>
              <Button variant="ghost" onClick={() => start("drawing")}>
                <Pencil />
                그림
              </Button>
            </div>
            <Button ref={primary} onClick={() => start("text")}>
              <Plus />
              인사 남기기
            </Button>
          </div>
        </section>
        <section
          id="guestbook-feed"
          className="EntryFeed"
          aria-labelledby="feed-title"
          tabIndex={-1}
        >
          <div className="EntryFeed__Heading">
            <h2 id="feed-title">
              남겨진 인사 <span>{entries.length}</span>
            </h2>
            <span>최신순</span>
          </div>
          <div className="EntryFeed__Cards">
            {!sampleMode && feed.loading && (
              <p className="EntryFeed__Status" role="status">
                인사를 불러오는 중이에요.
              </p>
            )}
            {!sampleMode && feed.error && (
              <div className="EntryFeed__Status" role="alert">
                {feed.error}
                <Button variant="outline" onClick={feed.refresh}>
                  다시 시도
                </Button>
              </div>
            )}
            {!sampleMode && feed.newCount > 0 && (
              <Button
                className="EntryFeed__NewEntries"
                variant="outline"
                onClick={feed.showNew}
              >
                새 인사 {feed.newCount}개 보기
              </Button>
            )}
            {(sampleMode ? entries.slice(0, visibleCount) : entries).map(
              (entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  own={entry.authorId === visitorId}
                  onEdit={(item) => {
                    opener.current = document.getElementById(
                      `entry-menu-${item.id}`,
                    );
                    window.setTimeout(async () => {
                      if (sampleMode)
                        setComposer({
                          entry: item,
                          intent: "text",
                          id: item.id,
                        });
                      else if (entriesApi) {
                        const result = await entriesApi.forEdit(item.id);
                        if (result.ok)
                          setComposer({
                            entry: result.value,
                            intent: "text",
                            id: item.id,
                          });
                        else setNotice(result.error.message);
                      }
                    }, 0);
                  }}
                  onDelete={(item) => {
                    opener.current = document.getElementById(
                      `entry-menu-${item.id}`,
                    );
                    window.setTimeout(() => {
                      setDeleteError("");
                      setDeleting(item);
                    }, 0);
                  }}
                  onView={(media) => {
                    opener.current = document.activeElement as HTMLElement;
                    setViewing(media);
                  }}
                />
              ),
            )}
          </div>
          {!entries.length &&
            (sampleMode ||
              (guestbookClient && !feed.loading && !feed.error)) && (
              <div className="EntryFeed__Empty">
                <MessageSquare size={32} aria-hidden="true" />
                <h3>아직 남겨진 인사가 없어요.</h3>
                <p>이 공간의 첫 번째 이야기를 들려주세요.</p>
                <Button onClick={() => start("text")}>첫 인사 남기기</Button>
              </div>
            )}
          {(sampleMode ? entries.length > visibleCount : !!feed.cursor) && (
            <Button
              variant="outline"
              className="EntryFeed__More"
              disabled={feed.moreLoading}
              onClick={() => {
                if (sampleMode) setVisibleCount(visibleCount + 20);
                else void feed.loadMore();
              }}
            >
              {feed.moreLoading ? "불러오는 중…" : "인사 더 보기"}
              <ArrowDown />
            </Button>
          )}
        </section>
        <footer className="Guestbook__Footer">
          <span className="Guestbook__FooterMark" aria-hidden="true">
            <NotebookPen size={16} />
          </span>
          <p>가볍게 남긴 인사, 오래 머무는 마음.</p>
          <span>
            {sampleMode
              ? "샘플 인사와 이 탭의 변경만 보여요."
              : "누구나 인사와 첨부를 볼 수 있어요."}
            <br />
            {sampleMode
              ? "새로고침하면 처음으로 돌아가요."
              : "작성한 인사는 이 브라우저의 익명 계정으로 관리해요."}
          </span>
        </footer>
      </main>
      {nicknameOpen && (
        <NicknameDialog
          initial={nickname}
          remote={!sampleMode}
          identityNotice={!sampleMode ? identity.error : undefined}
          returnFocus={opener.current}
          onCancel={() => {
            setNicknameOpen(false);
            setPendingIntent(null);
          }}
          onDone={async (name) => {
            if (sampleMode) setNickname(name);
            else {
              const error = await identity.begin(name);
              if (error) return error;
            }
            setNicknameOpen(false);
            if (pendingIntent) {
              const intent = pendingIntent;
              setPendingIntent(null);
              window.setTimeout(
                () =>
                  setComposer({ entry: null, intent, id: crypto.randomUUID() }),
                0,
              );
            } else setNotice("표시할 닉네임을 바꿨어요.");
            return null;
          }}
        />
      )}
      {composer && (
        <EntryComposer
          key={`${composer.id}:${composer.entry?.version ?? 0}`}
          initial={composer.entry}
          remote={!sampleMode}
          onReadLatest={
            composer.entry && entriesApi
              ? async () => {
                  const result = await entriesApi.forEdit(composer.id);
                  return result.ok ? result.value : result.error.message;
                }
              : undefined
          }
          onReload={(entry) =>
            setComposer({ entry, id: entry.id, intent: "text" })
          }
          returnFocus={opener.current}
          nickname={composer.entry?.nickname ?? nickname ?? "방문자"}
          intent={composer.intent}
          onSave={save}
          onClose={() => setComposer(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        busy={deleteBusy}
        error={deleteError}
        returnFocus={opener.current}
        fallbackFocus={primary.current}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="이 인사를 삭제할까요?"
        description={
          sampleMode
            ? "이 탭에서 삭제한 인사는 되돌릴 수 없어요."
            : "삭제한 인사는 되돌릴 수 없어요. 첨부 파일은 이후 정리돼요."
        }
        action="삭제하기"
        onConfirm={() => {
          void removeEntry();
        }}
      />
      <Modal
        open={!!viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        title="첨부 크게 보기"
        returnFocus={opener.current}
        description="이미지 전체를 비율에 맞게 보여드려요."
        wide
        className="MediaViewer"
      >
        <div className="Modal__Body">
          {viewing && (
            <img
              src={viewing.url}
              width={viewing.width}
              height={viewing.height}
              alt="확대한 첨부 이미지"
            />
          )}
        </div>
      </Modal>
      <div
        className="ToastRegion"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice && <p className="ToastRegion__Message">{notice}</p>}
      </div>
    </div>
  );
}
