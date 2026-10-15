import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 320, height: 568 },
]) {
  test(`${viewport.width}px에서 사진 제한과 그림 재편집 FAQ를 펼쳐 읽는다`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/#questions");

    const faq = page.locator("#questions");
    const photos = faq.locator("details").filter({
      hasText: "사진은 어떤 형식으로 몇 장까지 올릴 수 있나요?",
    });
    const photoAnswer = photos.locator("p");
    await expect(photoAnswer).toBeHidden();
    await photos.locator("summary").click();
    await expect(photoAnswer).toBeVisible();
    await expect(photoAnswer).toContainText("JPEG·PNG·WebP");
    await expect(photoAnswer).toContainText("최대 5장");
    await expect(photoAnswer).toContainText("파일당 15 MiB 이하");
    await expect(photoAnswer).toContainText("장당 1 MiB 이하");
    await expect(photoAnswer).toContainText("사진 합계 5 MiB 이하");

    const drawing = faq.locator("details").filter({
      hasText: "저장한 그림을 다시 열어 고칠 수 있나요?",
    });
    const drawingAnswer = drawing.locator("p");
    await expect(drawingAnswer).toBeHidden();
    await drawing.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(drawingAnswer).toBeVisible();
    await expect(drawingAnswer).toContainText("익명 세션이 유지");
    await expect(drawingAnswer).toContainText("‘다시 그리기’");
    await expect(drawingAnswer).toContainText(
      "‘그림 완료’를 누른 뒤 인사의 ‘수정하기’까지 마쳐야",
    );
    await expect(drawingAnswer).toContainText("사진 최대 5장과 별도로");
    await page.keyboard.press("Enter");
    await expect(drawingAnswer).toBeHidden();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
