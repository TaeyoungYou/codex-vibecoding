import { test, expect, type Page } from "@playwright/test";

// A routed backend validates browser failure UX only. These tests do not prove
// real Supabase authentication, authorization, Storage or Realtime delivery.
async function backend(page: Page) {
  const uid = "10000000-0000-4000-8000-000000000001";
  let nickname: string | null = null;
  let signupCount = 0,
    saveCount = 0,
    failProfile = true,
    failSave = true,
    failDelete = true;
  let entries: Record<string, unknown>[] = [];
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "",
    is_anonymous: true,
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
  };
  const jwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: uid,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "browser-fixture",
  ].join(".");
  await page.routeWebSocket("ws://127.0.0.1:59999/**", (ws) => {
    ws.onMessage((message) => {
      const frame = JSON.parse(String(message));
      if (Array.isArray(frame)) {
        const [joinRef, ref, topic, event] = frame;
        if (event === "heartbeat" || event === "phx_join")
          ws.send(
            JSON.stringify([
              joinRef,
              ref,
              topic,
              "phx_reply",
              {
                status: "ok",
                response: {
                  postgres_changes: [
                    { id: 1, event: "*", schema: "public", table: "entries" },
                  ],
                },
              },
            ]),
          );
      }
    });
  });
  await page.route("http://127.0.0.1:59999/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const fulfill = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (path === "/auth/v1/signup") {
      signupCount++;
      return fulfill({
        access_token: jwt,
        refresh_token: "synthetic-refresh-fixture",
        expires_in: 3600,
        token_type: "bearer",
        user,
      });
    }
    if (path === "/auth/v1/user") return fulfill(user);
    if (path === "/rest/v1/profiles")
      return fulfill(nickname ? { id: uid, nickname } : null);
    if (path.endsWith("/list_entries"))
      return fulfill({ entries, nextCursor: null });
    const args = request.postDataJSON() ?? {};
    if (path.endsWith("/set_nickname")) {
      if (failProfile) {
        failProfile = false;
        return fulfill({ code: "PT500" }, 500);
      }
      nickname = args.p_nickname;
      return fulfill({ id: uid, nickname });
    }
    if (path.endsWith("/save_entry")) {
      saveCount++;
      if (failSave) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        failSave = false;
        return fulfill({ code: "PT400" }, 400);
      }
      const old = entries.find((e) => e.id === args.p_id);
      if (old && old.version !== args.p_expected_version)
        return fulfill({ code: "PT409" }, 409);
      const entry = {
        id: args.p_id,
        authorId: uid,
        nickname,
        text: args.p_text,
        version: Number(old?.version ?? 0) + 1,
        createdAt: old?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: [],
        drawing: null,
      };
      entries = [entry];
      return fulfill(entry);
    }
    if (path.endsWith("/read_entry_for_edit"))
      return fulfill({
        ...entries.find((e) => e.id === args.p_id),
        strokesJson: null,
      });
    if (path.endsWith("/read_entry"))
      return fulfill(entries.find((e) => e.id === args.p_id) ?? null);
    if (path.endsWith("/delete_entry")) {
      if (failDelete) {
        failDelete = false;
        return fulfill({ code: "PT409" }, 409);
      }
      entries = [];
      return fulfill(null);
    }
    return fulfill({ code: "PT500" }, 500);
  });
  return {
    counts: () => ({ signupCount, saveCount }),
    changeExternally: () => {
      entries = entries.map((e) => ({
        ...e,
        version: Number(e.version) + 1,
        text: "다른 창에서 저장한 내용",
      }));
    },
  };
}
test("keeps nickname and draft on failure, prevents duplicate pending saves and closes only on success", async ({
  page,
}) => {
  const mock = await backend(page);
  await page.goto("/guestbook");
  const name = page.getByRole("dialog", { name: "어떤 이름으로 남길까요?" });
  await name.getByLabel("닉네임", { exact: true }).fill("테스트방문");
  await name.getByRole("button", { name: "이 이름으로 시작하기" }).click();
  await expect(name.getByRole("alert")).toBeVisible();
  await expect(name.getByLabel("닉네임", { exact: true })).toHaveValue(
    "테스트방문",
  );
  await name.getByRole("button", { name: "이 이름으로 시작하기" }).click();
  await expect(name).toBeHidden();
  expect(mock.counts().signupCount).toBe(1);
  await page.getByRole("button", { name: "인사 남기기", exact: true }).click();
  const composer = page.getByRole("dialog", { name: "새로운 인사 남기기" });
  await composer.getByLabel("메시지").fill("실패해도 유지할 초안");
  await composer
    .getByRole("button", { name: "인사 남기기", exact: true })
    .click();
  await expect(
    composer.getByRole("button", { name: "처리 중…" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(composer).toBeVisible();
  await expect(composer.getByRole("alert")).toBeVisible();
  await expect(composer.getByLabel("메시지")).toHaveValue(
    "실패해도 유지할 초안",
  );
  expect(mock.counts().saveCount).toBe(1);
  await composer
    .getByRole("button", { name: "인사 남기기", exact: true })
    .click();
  await expect(composer).toBeHidden();
  await expect(page.locator(".EntryCard__Body")).toHaveText(
    "실패해도 유지할 초안",
  );
  await page.reload();
  await expect(page.locator("#identity-menu")).toContainText("테스트방문");
  expect(mock.counts().signupCount).toBe(1);
  await page.getByRole("button", { name: "테스트방문의 게시물 메뉴" }).click();
  await page.getByRole("menuitem", { name: "수정", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "인사 수정하기" });
  await edit.getByLabel("메시지").fill("충돌해도 유지할 초안");
  mock.changeExternally();
  await edit.getByRole("button", { name: "수정하기", exact: true }).click();
  await expect(edit.getByRole("alert")).toBeVisible();
  await expect(edit.getByLabel("메시지")).toHaveValue("충돌해도 유지할 초안");
  await edit.getByRole("button", { name: "최신 내용 확인" }).click();
  const latest = page.getByRole("dialog", { name: "최신 저장 내용" });
  await expect(
    latest.getByText("다른 창에서 저장한 내용", { exact: true }),
  ).toBeVisible();
  await latest.getByRole("button", { name: "초안으로 돌아가기" }).click();
  await expect(edit.getByLabel("메시지")).toHaveValue("충돌해도 유지할 초안");
  await edit.getByRole("button", { name: "취소", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "버리기" })
    .click();
  await page.getByRole("button", { name: "테스트방문의 게시물 메뉴" }).click();
  await page.getByRole("menuitem", { name: "삭제", exact: true }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "삭제하기" }).click();
  await expect(confirm.getByRole("alert")).toBeVisible();
  await expect(page.locator(".EntryCard")).toHaveCount(1);
  await confirm.getByRole("button", { name: "삭제하기" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator(".EntryCard")).toHaveCount(0);
});
test("keeps the live composer reachable at 320x568 and traps keyboard focus", async ({
  page,
}) => {
  await backend(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/guestbook");
  const name = page.getByRole("dialog");
  await name.getByRole("button", { name: "나중에" }).click();
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "인사 남기기", exact: true }).click();
  await page.getByLabel("닉네임", { exact: true }).fill("모바일방문");
  await page.getByRole("button", { name: "이 이름으로 시작하기" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "이 이름으로 시작하기" }).click();
  const composer = page.getByRole("dialog", { name: "새로운 인사 남기기" });
  await expect(composer).toBeVisible();
  await composer.getByLabel("메시지").fill("모바일 초안");
  await composer
    .getByRole("button", { name: "인사 남기기", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    composer.getByRole("button", { name: "인사 남기기", exact: true }),
  ).toBeInViewport();
  for (let n = 0; n < 15; n++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"]'),
      ),
    ).toBe(true);
  }
});
