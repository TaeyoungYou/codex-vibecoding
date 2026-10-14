import { useState } from "react";
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EditEntry, MediaAsset } from "@/domain/guestbook";

function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60000),
  );
  if (minutes === 0) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function MediaImage({
  media,
  alt,
  onView,
  className = "",
}: {
  media: MediaAsset;
  alt: string;
  onView: (media: MediaAsset) => void;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return failed ? (
    <div className="MediaImage__Error">
      <p>이미지를 불러오지 못했어요.</p>
      <Button
        variant="outline"
        onClick={() => {
          setAttempt(attempt + 1);
          setFailed(false);
        }}
      >
        <RotateCcw />
        다시 시도
      </Button>
    </div>
  ) : (
    <button
      type="button"
      className={`MediaImage ${className}`}
      onClick={() => onView(media)}
      aria-label={`${alt} 크게 보기`}
    >
      <img
        key={attempt}
        src={media.url}
        width={media.width}
        height={media.height}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

export default function EntryCard({
  entry,
  own,
  onEdit,
  onDelete,
  onView,
}: {
  entry: EditEntry;
  own: boolean;
  onEdit: (entry: EditEntry) => void;
  onDelete: (entry: EditEntry) => void;
  onView: (media: MediaAsset) => void;
}) {
  return (
    <article
      className="EntryCard"
      data-entry-id={entry.id}
      aria-label={`${entry.nickname}의 인사`}
    >
      <header className="EntryCard__Header">
        <span className="Avatar" aria-hidden="true">
          {Array.from(entry.nickname)[0]}
        </span>
        <div className="EntryCard__Identity">
          <div className="EntryCard__Name">
            {entry.nickname}
            {own && <span className="EntryCard__Own">나</span>}
          </div>
          <div className="EntryCard__Metadata">
            <time
              dateTime={entry.createdAt}
              title={new Date(entry.createdAt).toLocaleString("ko-KR")}
            >
              {relativeTime(entry.createdAt)}
            </time>
            {entry.version > 1 && <span> · 수정됨</span>}
          </div>
        </div>
        {own && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${entry.nickname}의 게시물 메뉴`}
                id={`entry-menu-${entry.id}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="EntryCard__Menu">
              <DropdownMenuItem onSelect={() => onEdit(entry)}>
                <Pencil />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(entry)}
              >
                <Trash2 />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {entry.text.trim() && <p className="EntryCard__Body">{entry.text}</p>}
      {entry.images.length > 0 && (
        <div
          className={`EntryCard__Images ${entry.images.length > 1 ? "EntryCard__Images--Multiple" : ""}`}
        >
          {entry.images.map((image, index) => (
            <MediaImage
              key={image.id}
              media={image}
              alt={`${entry.nickname}의 첨부 이미지 ${index + 1}`}
              onView={onView}
            />
          ))}
        </div>
      )}
      {entry.drawing && (
        <div className="EntryCard__Drawing">
          <MediaImage
            media={entry.drawing}
            alt={`${entry.nickname}의 그림`}
            onView={onView}
            className="MediaImage--Drawing"
          />
          <span className="EntryCard__DrawingLabel">
            <Pencil size={13} aria-hidden="true" />
            직접 그린 그림
          </span>
        </div>
      )}
    </article>
  );
}
