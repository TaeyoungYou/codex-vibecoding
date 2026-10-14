export type ErrorCode =
  | "invalid"
  | "not_authenticated"
  | "forbidden"
  | "conflict"
  | "network"
  | "server";
export interface AppError {
  code: ErrorCode;
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = <T = never>(
  code: ErrorCode,
  message?: string,
): Result<T> => ({
  ok: false,
  error: { code, message: message ?? messages[code] },
});
const messages: Record<ErrorCode, string> = {
  invalid: "입력이나 첨부 파일을 확인해주세요. 작성 중인 내용은 유지돼요.",
  not_authenticated:
    "인증을 확인하지 못했어요. 닉네임 설정부터 다시 확인해주세요.",
  forbidden: "이 인사를 변경할 권한이 없어요. 작성 중인 내용은 유지돼요.",
  conflict: "다른 창에서 수정되었거나 삭제된 인사예요. 초안을 유지했어요.",
  network: "서버와 연결하지 못했어요. 작성 중인 내용은 유지돼요.",
  server: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
};
export function apiError(error: unknown): AppError {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const status =
    typeof error === "object" && error && "status" in error
      ? Number(error.status)
      : 0;
  const kind: ErrorCode =
    code === "PT400" || code === "22023"
      ? "invalid"
      : code === "PT401" || code === "PGRST301" || status === 401
        ? "not_authenticated"
        : code === "PT403" || code === "42501" || status === 403
          ? "forbidden"
          : code === "PT409" || code === "23505"
            ? "conflict"
            : error instanceof TypeError || (status === 0 && !code)
              ? "network"
              : "server";
  return { code: kind, message: messages[kind] };
}
