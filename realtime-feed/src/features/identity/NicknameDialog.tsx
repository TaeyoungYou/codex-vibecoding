import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nicknameError, codePoints } from "@/domain/validation";

export default function NicknameDialog({
  initial,
  onDone,
  onCancel,
  returnFocus,
  remote = false,
  identityNotice,
}: {
  initial: string | null;
  onDone: (nickname: string) => Promise<string | null> | string | null | void;
  onCancel: () => void;
  returnFocus: HTMLElement | null;
  remote?: boolean;
  identityNotice?: string;
}) {
  const [name, setName] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const problem = nicknameError(name);
    if (problem) {
      setError(problem);
      input.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result = await onDone(name.trim());
      if (result) setError(result);
    } catch {
      setError("인증·프로필 저장에 실패했어요. 입력한 이름은 유지돼요.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current) onCancel();
      }}
      title="어떤 이름으로 남길까요?"
      returnFocus={returnFocus}
      description="인사에 표시할 이름이에요. 편하게 불러주세요."
      initialFocus={input}
      className="NicknameDialog"
    >
      <form onSubmit={submit} className="Modal__Form">
        <div className="Modal__Body">
          <label className="FieldLabel" htmlFor="nickname">
            닉네임
          </label>
          <Input
            id="nickname"
            ref={input}
            value={name}
            disabled={busy}
            placeholder="예: 오후산책"
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby="nickname-hint nickname-error"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          <div className="FieldHint" id="nickname-hint">
            <span>2~16자 · 중복된 이름도 괜찮아요</span>
            <span>{codePoints(name.trim())}/16</span>
          </div>
          {error && (
            <p id="nickname-error" className="FieldError" role="alert">
              {error}
            </p>
          )}
          <p className="NicknameDialog__Notice">
            {remote
              ? "이 브라우저의 익명 계정으로 인사를 남겨요. 사이트 데이터를 지우면 이전 인사를 변경할 수 없어요."
              : "이 이름과 작성한 인사는 현재 탭에서만 유지돼요."}
          </p>
          {identityNotice && (
            <p className="FieldError" role="status">
              {identityNotice}
            </p>
          )}
        </div>
        <footer className="Modal__Footer">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            나중에
          </Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? "인증·저장 중…"
              : initial
                ? "이름 바꾸기"
                : "이 이름으로 시작하기"}
            <ArrowRight />
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
