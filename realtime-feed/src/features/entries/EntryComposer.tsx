import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal, ConfirmDialog } from "@/components/Modal";
import {
  emptyDraft,
  type Draft,
  type EditEntry,
  type MediaAsset,
} from "@/domain/guestbook";
import { codePoints, draftError } from "@/domain/validation";
import { prepareImage } from "@/features/media/imageCompression";
import DrawingEditor from "@/features/drawing/DrawingEditor";

export type ComposerIntent = "text" | "image" | "drawing";

export default function EntryComposer({
  initial,
  nickname,
  intent,
  onSave,
  onClose,
  returnFocus,
  remote = false,
  onReadLatest,
  onReload,
}: {
  initial: EditEntry | null;
  nickname: string;
  intent: ComposerIntent;
  onSave: (draft: Draft) => Promise<string | null> | string | null;
  onClose: () => void;
  returnFocus: HTMLElement | null;
  remote?: boolean;
  onReadLatest?: () => Promise<EditEntry | string>;
  onReload?: (entry: EditEntry) => void;
}) {
  const initialDraft: Draft = initial
    ? {
        text: initial.text,
        images: initial.images,
        drawing: initial.drawing,
        drawingDocument: initial.drawingDocument,
      }
    : emptyDraft();
  const [draft, setDraft] = useState<Draft>(() =>
    structuredClone(initialDraft),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [latest, setLatest] = useState<EditEntry | null>(null);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const submitting = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const imageButton = useRef<HTMLButtonElement>(null);
  const drawingButton = useRef<HTMLButtonElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const discardOpener = useRef<HTMLElement | null>(null);
  const changed = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  function close() {
    if (busy || submitting.current) return;
    if (changed) {
      discardOpener.current = document.activeElement as HTMLElement;
      setDiscard(true);
    } else onClose();
  }
  function pickImage(index: number | null = null) {
    replaceIndex.current = index;
    if (fileInput.current) {
      fileInput.current.multiple = index === null;
      fileInput.current.click();
    }
  }
  async function filesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const replace = replaceIndex.current;
    if (replace === null && draft.images.length + files.length > 5) {
      setError("이미지는 최대 5장까지 추가할 수 있어요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared: MediaAsset[] = [];
      for (const file of files) prepared.push(await prepareImage(file));
      setDraft((previous) => ({
        ...previous,
        images:
          replace === null
            ? [...previous.images, ...prepared]
            : previous.images.map((image, index) =>
                index === replace ? prepared[0] : image,
              ),
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "이미지를 준비하지 못했어요. 기존 내용은 유지돼요.",
      );
    } finally {
      setBusy(false);
      replaceIndex.current = null;
    }
  }
  function moveImage(index: number, direction: -1 | 1) {
    setDraft((previous) => {
      const images = [...previous.images];
      [images[index], images[index + direction]] = [
        images[index + direction],
        images[index],
      ];
      return { ...previous, images };
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || submitting.current) return;
    const problem = draftError(draft);
    if (problem) {
      setError(problem);
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const saveError = await onSave(draft);
      if (saveError) {
        setError(saveError);
        requestAnimationFrame(() => errorSummary.current?.focus());
      }
    } catch {
      setError(
        "반영하지 못했어요. 작성 중인 내용은 유지돼요. 다시 시도해주세요.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={initial ? "인사 수정하기" : "새로운 인사 남기기"}
      returnFocus={returnFocus}
      description="한 줄의 이야기, 한 장의 이미지, 작은 그림도 좋아요."
      initialFocus={
        intent === "image"
          ? imageButton
          : intent === "drawing"
            ? drawingButton
            : textInput
      }
      className="EntryComposer"
    >
      <form onSubmit={submit} className="Modal__Form">
        <div className="Modal__Body">
          <div className="EntryComposer__Identity">
            <span className="Avatar" aria-hidden="true">
              {Array.from(nickname)[0]}
            </span>
            <div>
              <strong>{nickname}</strong>
              <p>이 이름으로 인사를 남겨요</p>
            </div>
          </div>
          <div className="EntryComposer__Field">
            <label className="FieldLabel" htmlFor="message">
              메시지 <span>· 선택</span>
            </label>
            <Textarea
              id="message"
              ref={textInput}
              placeholder="오늘은 어떤 하루였나요?"
              rows={5}
              value={draft.text}
              disabled={busy}
              onChange={(event) => {
                setDraft((previous) => ({
                  ...previous,
                  text: event.target.value,
                }));
                setError(null);
              }}
              aria-invalid={codePoints(draft.text) > 1000}
              aria-describedby="message-hint composer-error"
            />
            <div id="message-hint" className="FieldHint">
              <span>줄바꿈도 그대로 남아요</span>
              <span
                className={codePoints(draft.text) > 1000 ? "FieldError" : ""}
              >
                {codePoints(draft.text).toLocaleString()}/1,000
              </span>
            </div>
          </div>
          <section className="EntryComposer__Field" aria-label="첨부 이미지">
            <div className="FieldHeading">
              <span className="FieldLabel">
                이미지 <span>· 선택</span>
              </span>
              <span className="Hint">{draft.images.length}/5장</span>
            </div>
            {draft.images.length > 0 && (
              <ol className="AttachmentList">
                {draft.images.map((image, index) => (
                  <li className="Attachment" key={image.id}>
                    <img
                      src={image.url}
                      width={64}
                      height={64}
                      alt={`선택한 이미지 ${index + 1}`}
                    />
                    <div className="Attachment__Details">
                      <p title={image.name}>
                        {index + 1}. {image.name ?? "첨부 이미지"}
                      </p>
                      <div className="Attachment__Actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy || index === 0}
                          aria-label={`이미지 ${index + 1} 앞으로 이동`}
                          onClick={() => moveImage(index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy || index === draft.images.length - 1}
                          aria-label={`이미지 ${index + 1} 뒤로 이동`}
                          onClick={() => moveImage(index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={`이미지 ${index + 1} 교체`}
                          onClick={() => pickImage(index)}
                        >
                          <RefreshCw />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={`이미지 ${index + 1} 제거`}
                          onClick={() => {
                            setDraft((previous) => ({
                              ...previous,
                              images: previous.images.filter(
                                (_, i) => i !== index,
                              ),
                            }));
                            setError(null);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Button
              ref={imageButton}
              type="button"
              variant="outline"
              className="AttachmentButton"
              disabled={busy || draft.images.length >= 5}
              onClick={() => pickImage()}
            >
              <ImagePlus />
              {busy ? "이미지 준비 중" : "이미지 추가"}
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="첨부할 이미지 파일"
              onChange={filesSelected}
            />
            <p className="Hint">
              JPEG·PNG·WebP, 원본 15 MiB 이하 · 최대 5장
              <br />긴 변 1,600px, 장당 1 MiB 이하로 자동 변환해요.
            </p>
          </section>
          <section className="EntryComposer__Field" aria-label="첨부 그림">
            <div className="FieldHeading">
              <span className="FieldLabel">
                그림 <span>· 선택</span>
              </span>
              <span className="Hint">{draft.drawing ? "1/1개" : "0/1개"}</span>
            </div>
            {draft.drawing && (
              <img
                className="EntryComposer__DrawingPreview"
                src={draft.drawing.url}
                width={900}
                height={600}
                alt="작성 중인 그림"
              />
            )}
            <div className="EntryComposer__DrawingActions">
              <Button
                ref={drawingButton}
                type="button"
                variant="outline"
                disabled={busy}
                className="AttachmentButton"
                onClick={() => setDrawing(true)}
              >
                <Pencil />
                {draft.drawing ? "다시 그리기" : "그림 그리기"}
              </Button>
              {draft.drawing && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  aria-label="그림 제거"
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      drawing: null,
                      drawingDocument: null,
                    }))
                  }
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </section>
          <p className="EntryComposer__Notice">
            메시지·이미지·그림 중 하나 이상을 남겨주세요.
            <br />
            {remote
              ? "인사와 첨부는 공개돼요. 서버에서 저장을 확인한 뒤 반영해요."
              : "샘플 화면에서는 현재 탭에만 반영돼요."}
          </p>
          {error && (
            <p
              ref={errorSummary}
              tabIndex={-1}
              id="composer-error"
              className="FieldError FieldError--Summary"
              role="alert"
            >
              {error}
            </p>
          )}
          {error && initial && onReadLatest && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const result = await onReadLatest();
                if (typeof result === "string") setError(result);
                else setLatest(result);
              }}
            >
              최신 내용 확인
            </Button>
          )}
        </div>
        <footer className="Modal__Footer">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={close}
          >
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            <Send />
            {busy ? "처리 중…" : initial ? "수정하기" : "인사 남기기"}
          </Button>
        </footer>
      </form>
      {drawing && (
        <DrawingEditor
          returnFocus={drawingButton.current}
          initial={draft.drawingDocument}
          onCancel={() => setDrawing(false)}
          onDone={(document, preview) => {
            setDraft((previous) => ({
              ...previous,
              drawingDocument: document,
              drawing: preview,
            }));
            setDrawing(false);
            setError(null);
          }}
        />
      )}
      {latest && (
        <Modal
          open
          title="최신 저장 내용"
          description="현재 작성 중인 초안은 그대로 유지돼요."
          onOpenChange={(open) => {
            if (!open) setLatest(null);
          }}
        >
          <div className="Modal__Body">
            <p>저장 버전 {latest.version}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {latest.text || "(메시지 없음)"}
            </p>
            <p>
              이미지 {latest.images.length}장 · 그림{" "}
              {latest.drawing ? "있음" : "없음"}
            </p>
          </div>
          <footer className="Modal__Footer">
            <Button variant="outline" onClick={() => setLatest(null)}>
              초안으로 돌아가기
            </Button>
            <Button onClick={() => setReloadConfirm(true)}>
              최신 내용으로 다시 시작
            </Button>
          </footer>
          <ConfirmDialog
            open={reloadConfirm}
            onOpenChange={setReloadConfirm}
            title="현재 초안을 버리고 다시 읽을까요?"
            description="현재 초안을 버리고 최신 저장 내용으로 수정 창을 다시 열어요."
            action="다시 시작"
            onConfirm={() => {
              if (latest) onReload?.(latest);
            }}
          />
        </Modal>
      )}
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="작성 중인 내용을 버릴까요?"
        returnFocus={discardOpener.current}
        fallbackFocus={returnFocus}
        description="아직 반영하지 않은 메시지와 첨부 내용이 사라져요."
        action="버리기"
        cancel="계속 작성"
        onConfirm={onClose}
      />
    </Modal>
  );
}
