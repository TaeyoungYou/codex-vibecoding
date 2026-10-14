import { test, expect, type Page } from "@playwright/test";

async function begin(page: Page, name: string) {
  await page.goto("/");
  await page.getByLabel("닉네임", { exact: true }).fill(name);
  await page.getByRole("button", { name: "이 이름으로 시작하기" }).click();
  await expect(page.locator("#identity-menu")).toContainText(name);
  await expect(page.getByText("실시간 연결됨", { exact: true })).toBeVisible();
}
async function draw(page: Page, offset = 0) {
  const canvas = page.getByLabel("그림 캔버스");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Drawing canvas missing");
  await page.mouse.move(box.x + 30, box.y + 40 + offset);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 80 + offset, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "그림 완료", exact: true }).click();
}

test("two real anonymous sessions preserve ownership, media, drafts and realtime recovery", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await a.newPage();
  const other = await b.newPage();
  const marker = "live-" + Date.now();
  const ids: string[] = [];
  try {
    // Identical nicknames must still have separate ownership.
    await begin(owner, "연동검증");
    await begin(other, "연동검증");
    await owner
      .getByRole("button", { name: "인사 남기기", exact: true })
      .click();
    await owner.getByLabel("메시지", { exact: false }).fill(marker);
    const png = await owner.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 30;
      canvas.getContext("2d")!.fillRect(3, 3, 20, 15);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await owner.getByLabel("첨부할 이미지 파일").setInputFiles({
      name: "verification.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await expect(owner.getByText("1/5장", { exact: true })).toBeVisible();
    await owner
      .getByRole("button", { name: "그림 그리기", exact: true })
      .click();
    await draw(owner);
    await owner
      .getByRole("dialog", { name: "새로운 인사 남기기", exact: true })
      .getByRole("button", { name: "인사 남기기", exact: true })
      .click();
    await expect(owner.getByRole("dialog")).toHaveCount(0, { timeout: 30000 });
    const card = owner.locator("article").filter({ hasText: marker });
    await expect(card).toBeVisible();
    const id = (await card.getAttribute("data-entry-id"))!;
    ids.push(id);
    const remote = other.locator(`[data-entry-id="${id}"]`);
    await expect(remote).toContainText(marker);
    await expect(remote.locator("img")).toHaveCount(2);
    await expect
      .poll(() =>
        remote
          .locator("img")
          .evaluateAll((imgs) =>
            imgs.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await expect(
      remote.getByRole("button", { name: "연동검증의 게시물 메뉴" }),
    ).toHaveCount(0);
    const denied = await other.evaluate(async (id) => {
      // @ts-expect-error Vite serves this source module in the browser.
      const { guestbookClient: client } = await import("/src/lib/supabase.ts");
      const edit = await client.rpc("read_entry_for_edit", { p_id: id });
      const write = await client.rpc("delete_entry", {
        p_id: id,
        p_expected_version: 1,
      });
      const direct = await client
        .from("entries")
        .update({ body: "denied" })
        .eq("id", id);
      return {
        edit: edit.error?.code,
        write: write.error?.code,
        direct: !!direct.error,
      };
    }, id);
    expect(denied).toEqual({ edit: "PT403", write: "PT403", direct: true });

    await card.getByRole("button", { name: "연동검증의 게시물 메뉴" }).click();
    await owner.getByRole("menuitem", { name: "수정", exact: true }).click();
    await owner.getByLabel("메시지", { exact: false }).fill(marker + "-draft");
    const strokes = await owner.evaluate(async (id) => {
      // @ts-expect-error Vite browser module.
      const { guestbookClient: client } = await import("/src/lib/supabase.ts");
      const result = await client.rpc("read_entry_for_edit", { p_id: id });
      return result.data?.strokesJson
        ? JSON.parse(result.data.strokesJson).strokes.length
        : null;
    }, id);
    expect(strokes).toBe(1);
    await other
      .getByRole("button", { name: "인사 남기기", exact: true })
      .click();
    await other.getByLabel("메시지", { exact: false }).fill(marker + "-other");
    await other
      .getByRole("dialog", { name: "새로운 인사 남기기", exact: true })
      .getByRole("button", { name: "인사 남기기", exact: true })
      .click();
    await expect(other.getByRole("dialog")).toHaveCount(0);
    const otherId = (await other
      .locator("article")
      .filter({ hasText: marker + "-other" })
      .getAttribute("data-entry-id"))!;
    ids.push(otherId);
    await expect(owner.getByLabel("메시지", { exact: false })).toHaveValue(
      marker + "-draft",
    );
    await owner
      .getByRole("button", { name: "다시 그리기", exact: true })
      .click();
    await draw(owner, 25);
    await owner.getByRole("button", { name: "수정하기", exact: true }).click();
    await expect(owner.getByRole("dialog")).toHaveCount(0, { timeout: 30000 });
    await expect(remote).toContainText(marker + "-draft");
    await owner.reload();
    await expect(owner.locator("#identity-menu")).toContainText("연동검증");
    await expect(owner.locator(`#entry-menu-${id}`)).toBeVisible();
    await b.setOffline(true);
    await owner.locator(`#entry-menu-${id}`).click();
    await owner.getByRole("menuitem", { name: "삭제", exact: true }).click();
    await owner.getByRole("button", { name: "삭제하기", exact: true }).click();
    await expect(owner.locator(`[data-entry-id="${id}"]`)).toHaveCount(0);
    await b.setOffline(false);
    await other.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(remote).toHaveCount(0);
    await other.locator(`#entry-menu-${otherId}`).click();
    await other.getByRole("menuitem", { name: "삭제", exact: true }).click();
    await other.getByRole("button", { name: "삭제하기", exact: true }).click();
    await expect(other.locator(`[data-entry-id="${otherId}"]`)).toHaveCount(0);
  } finally {
    // Only delete the explicitly recorded verification entries, never other data.
    for (const page of [owner, other]) {
      await page
        .evaluate(async (ids) => {
          const { guestbookClient: client } =
            // @ts-expect-error Vite browser module.
            await import("/src/lib/supabase.ts");
          for (const id of ids) {
            const current = await client.rpc("read_entry", { p_id: id });
            if (current.data)
              await client.rpc("delete_entry", {
                p_id: id,
                p_expected_version: current.data.version,
              });
          }
        }, ids)
        .catch(() => {});
    }
    await a.close();
    await b.close();
  }
});
