import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Eraser, PenLine, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/Modal";
import {
  blankDrawing,
  type MediaAsset,
  type Stroke,
  type StrokeDocument,
} from "@/domain/guestbook";
import { drawingPreview, renderDrawing } from "./render";

const colors = [
  { name: "검정", value: "#171717" },
  { name: "빨강", value: "#E05252" },
  { name: "노랑", value: "#D59E42" },
  { name: "초록", value: "#5E8D72" },
  { name: "파랑", value: "#5D82B5" },
  { name: "보라", value: "#A18BB3" },
];

export default function DrawingEditor({
  initial,
  onDone,
  onCancel,
  returnFocus,
}: {
  initial: StrokeDocument | null;
  onDone: (document: StrokeDocument, preview: MediaAsset) => void;
  onCancel: () => void;
  returnFocus: HTMLElement | null;
}) {
  const [document, setDocument] = useState(() =>
    initial ? structuredClone(initial) : blankDrawing(),
  );
  const [history, setHistory] = useState<StrokeDocument[]>([]);
  const [tool, setTool] = useState<Stroke["tool"]>("pen");
  const [color, setColor] = useState("#171717");
  const [width, setWidth] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const activePointer = useRef<number | null>(null);
  const discardOpener = useRef<HTMLElement | null>(null);
  const changed =
    JSON.stringify(document) !== JSON.stringify(initial ?? blankDrawing());

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) renderDrawing(ctx, document);
  }, [document]);

  function commit(next: StrokeDocument) {
    setHistory((previous) => [...previous, document].slice(-30));
    setDocument(next);
    setError(null);
  }
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== null || event.button !== 0) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    live.current = { tool, color, widthPx: width, points: [point(event)] };
    paint();
  }
  function paint() {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && live.current)
      renderDrawing(ctx, {
        ...document,
        strokes: [...document.strokes, live.current],
      });
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!live.current || activePointer.current !== event.pointerId) return;
    live.current.points.push(point(event));
    paint();
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (!live.current || activePointer.current !== event.pointerId) return;
    commit({ ...document, strokes: [...document.strokes, live.current] });
    live.current = null;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function close() {
    if (changed) {
      discardOpener.current = window.document.activeElement as HTMLElement;
      setDiscard(true);
    } else onCancel();
  }
  function done() {
    if (!document.strokes.some((stroke) => stroke.tool === "pen")) {
      setError("캔버스에 작은 점이나 선을 남겨주세요.");
      return;
    }
    try {
      onDone(document, drawingPreview(document));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "그림을 준비하지 못했어요.",
      );
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="작은 그림 남기기"
      returnFocus={returnFocus}
      description="잘 그리지 않아도 괜찮아요. 마음 가는 대로 그려보세요."
      wide
      className="DrawingEditor"
    >
      <div className="Modal__Body">
        <div className="DrawingEditor__Toolbar" aria-label="그림 도구">
          <div className="DrawingEditor__Group">
            <Button
              variant={tool === "pen" ? "default" : "ghost"}
              aria-pressed={tool === "pen"}
              onClick={() => setTool("pen")}
            >
              <PenLine />펜
            </Button>
            <Button
              variant={tool === "eraser" ? "default" : "ghost"}
              aria-pressed={tool === "eraser"}
              onClick={() => setTool("eraser")}
            >
              <Eraser />
              지우개
            </Button>
          </div>
          <div className="DrawingEditor__Colors" aria-label="펜 색상">
            {colors.map((option) => (
              <button
                key={option.value}
                type="button"
                className="DrawingEditor__Color"
                aria-label={option.name}
                aria-pressed={color === option.value}
                onClick={() => {
                  setColor(option.value);
                  setTool("pen");
                }}
              >
                <span style={{ backgroundColor: option.value }}>
                  {color === option.value && (
                    <Check
                      size={14}
                      color={option.name === "노랑" ? "#171717" : "#FFFFFF"}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <label className="DrawingEditor__Width">
            굵기{" "}
            <input
              aria-label="펜 굵기"
              type="range"
              min="1"
              max="30"
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
            <output>{width}px</output>
          </label>
          <div className="DrawingEditor__Group">
            <Button
              variant="ghost"
              disabled={!history.length}
              aria-label="실행 취소"
              onClick={() => {
                setDocument(history[history.length - 1]);
                setHistory(history.slice(0, -1));
                setError(null);
              }}
            >
              <Undo2 />
              취소
            </Button>
            <Button
              variant="ghost"
              disabled={!document.strokes.length}
              onClick={() => commit(blankDrawing())}
            >
              <Trash2 />
              전체 지우기
            </Button>
          </div>
        </div>
        <div className="DrawingEditor__CanvasFrame">
          <canvas
            ref={canvas}
            width="900"
            height="600"
            className="DrawingEditor__Canvas"
            aria-label="그림 캔버스"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
          >
            자유곡선 입력은 마우스·터치·펜을 사용해주세요.
          </canvas>
        </div>
        <p className="Hint">
          그림은 이 창을 완료한 뒤, 인사를 남길 때 함께 반영돼요. 실행 취소는
          최근 30번까지 가능해요.
        </p>
        {error && (
          <p className="FieldError" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="Modal__Footer">
        <Button variant="outline" onClick={close}>
          취소
        </Button>
        <Button onClick={done}>
          <Check />
          그림 완료
        </Button>
      </footer>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="그리던 내용을 버릴까요?"
        returnFocus={discardOpener.current}
        fallbackFocus={returnFocus}
        description="이번에 그린 내용은 반영되지 않아요. 이전 그림은 그대로 유지돼요."
        action="버리기"
        cancel="계속 그리기"
        onConfirm={onCancel}
      />
    </Modal>
  );
}
