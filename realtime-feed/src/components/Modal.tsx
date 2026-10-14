import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ModalDepth = createContext(0);

// Radix registers dismissal layers in a passive effect. Route Escape using the
// committed modal stack so a key pressed immediately after opening a child
// cannot dismiss its parent before that effect has run.
const escapeStack: { id: symbol; depth: number; close: () => void }[] = [];

function useModalEscape(
  open: boolean,
  depth: number,
  onOpenChange: (open: boolean) => void,
) {
  const id = useRef(Symbol("modal"));
  const close = useRef(onOpenChange);
  close.current = onOpenChange;
  useLayoutEffect(() => {
    if (!open) return;
    const entry = { id: id.current, depth, close: () => close.current(false) };
    escapeStack.push(entry);
    return () => {
      const index = escapeStack.findIndex((item) => item.id === entry.id);
      if (index >= 0) escapeStack.splice(index, 1);
    };
  }, [open, depth]);
  return (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const top = escapeStack.reduce<(typeof escapeStack)[number] | null>(
      (current, entry) =>
        !current || entry.depth >= current.depth ? entry : current,
      null,
    );
    top?.close();
  };
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  className = "",
  initialFocus,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  returnFocus?: HTMLElement | null;
}) {
  // Programmatic entry points have no DialogTrigger. Let Radix trap focus and
  // use its lifecycle hooks solely to restore the element that opened the dialog.
  const opener = useRef<HTMLElement | null>(null);
  const depth = useContext(ModalDepth);
  const handleEscape = useModalEscape(open, depth, onOpenChange);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={{ zIndex: 50 + depth * 20 }}
        overlayStyle={{ zIndex: 40 + depth * 20 }}
        className={`Modal ${wide ? "Modal--Wide" : ""} ${className}`}
        onEscapeKeyDown={handleEscape}
        onOpenAutoFocus={(event) => {
          opener.current = document.activeElement as HTMLElement;
          if (initialFocus?.current) {
            event.preventDefault();
            initialFocus.current.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus ?? opener.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <header className="Modal__Header">
          <div>
            <DialogTitle className="Modal__Title">{title}</DialogTitle>
            <DialogDescription className="Modal__Description">
              {description}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={`${title} 닫기`}>
              <X />
            </Button>
          </DialogClose>
        </header>
        <ModalDepth.Provider value={depth + 1}>{children}</ModalDepth.Provider>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  cancel = "취소",
  onConfirm,
  returnFocus,
  fallbackFocus,
  busy = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: string;
  cancel?: string;
  onConfirm: () => void;
  returnFocus?: HTMLElement | null;
  fallbackFocus?: HTMLElement | null;
  busy?: boolean;
  error?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const depth = useContext(ModalDepth);
  const handleEscape = useModalEscape(open, depth, onOpenChange);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <AlertDialogContent
        className="ConfirmDialog"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
          else handleEscape(event);
        }}
        style={{ zIndex: 50 + depth * 20 }}
        overlayStyle={{ zIndex: 40 + depth * 20 }}
        onOpenAutoFocus={() => {
          opener.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          const preferred = returnFocus ?? opener.current;
          const target = preferred?.isConnected ? preferred : fallbackFocus;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="FieldError" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? "처리 중…" : action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
