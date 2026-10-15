import { expect, test } from "@playwright/test";

test("FAQ 카테고리마다 해당 질문만 표시하고 전체로 돌아온다", async ({
  page,
}) => {
  const backendRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:59999"))
      backendRequests.push(request.url());
  });
  await page.goto("/");

  const faq = page.locator("#questions");
  const filters = faq.getByRole("group", { name: "FAQ 카테고리" });
  const summaries = faq.locator("summary");
  const allQuestions = await summaries.allTextContents();
  expect(allQuestions.length).toBeGreaterThan(0);
  await expect(
    filters.getByRole("button", { name: "전체", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(faq.getByRole("status")).toHaveText(
    `전체 질문 ${allQuestions.length}개를 보여드려요.`,
  );

  const categories = [
    { label: "작성", question: "회원가입이 필요한가요?" },
    { label: "첨부", question: "글, 사진, 그림을 함께 남길 수 있나요?" },
    { label: "권한", question: "내가 남긴 인사를 수정하거나 지울 수 있나요?" },
  ];
  const categoryQuestions: string[] = [];

  for (const category of categories) {
    await filters
      .getByRole("button", { name: category.label, exact: true })
      .click();
    await expect(
      filters.getByRole("button", { name: category.label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(filters.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(summaries.filter({ hasText: category.question })).toBeVisible();
    for (const other of categories.filter((item) => item !== category)) {
      await expect(summaries.filter({ hasText: other.question })).toHaveCount(0);
    }
    if (category.label === "권한") {
      await expect(
        summaries.filter({ hasText: "누가 내 인사를 볼 수 있나요?" }),
      ).toBeVisible();
    }

    const visibleQuestions = await summaries.allTextContents();
    expect(visibleQuestions.length).toBeGreaterThan(0);
    expect(visibleQuestions.length).toBeLessThan(allQuestions.length);
    categoryQuestions.push(...visibleQuestions);
    await expect(faq.getByRole("status")).toHaveText(
      `${category.label} 질문 ${visibleQuestions.length}개를 보여드려요.`,
    );
    const firstQuestion = faq.locator("details").first();
    await firstQuestion.locator("summary").click();
    await expect(firstQuestion).toHaveAttribute("open", "");
    await expect(firstQuestion.locator("p")).toBeVisible();
  }

  expect(categoryQuestions.sort()).toEqual([...allQuestions].sort());
  await filters.getByRole("button", { name: "전체", exact: true }).click();
  await expect(summaries).toHaveText(allQuestions);
  await expect(faq.getByRole("status")).toHaveText(
    `전체 질문 ${allQuestions.length}개를 보여드려요.`,
  );
  expect(backendRequests).toEqual([]);
});

test("320px에서 키보드로 FAQ 필터와 펼침을 조작한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const faq = page.locator("#questions");
  const filters = faq.getByRole("group", { name: "FAQ 카테고리" });
  await filters.getByRole("button", { name: "전체", exact: true }).focus();

  for (const [label, key] of [
    ["작성", "Enter"],
    ["첨부", "Space"],
    ["권한", "Enter"],
  ] as const) {
    await page.keyboard.press("Tab");
    const button = filters.getByRole("button", { name: label, exact: true });
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("outline-style", "solid");
    await page.keyboard.press(key);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }

  await page.keyboard.press("Tab");
  const firstQuestion = faq.locator("details").first();
  await expect(firstQuestion.locator("summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(firstQuestion.locator("p")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(firstQuestion).not.toHaveAttribute("open");

  for (const button of await filters.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  expect(
    await filters.evaluate((element) => getComputedStyle(element).flexWrap),
  ).toBe("wrap");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
