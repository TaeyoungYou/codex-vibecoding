import { expect, test } from "@playwright/test";

test("소개에서 미리보기를 바꾸고 기존 방명록으로 이동한다", async ({
  page,
}) => {
  const backendRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:59999"))
      backendRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "작은 인사로,",
  );
  await page.getByRole("button", { name: "오늘의 한 장" }).click();
  await expect(
    page.getByRole("button", { name: "오늘의 한 장" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "말 대신, 사진으로 전해요." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "손끝의 작은 그림" }).click();
  await expect(
    page.getByRole("heading", { name: "잘 그리지 않아도, 마음은 전해져요." }),
  ).toBeVisible();
  await page.getByText("회원가입이 필요한가요?", { exact: true }).click();
  await expect(
    page.getByText(
      "이메일이나 비밀번호 없이 닉네임만 정하면 인사를 남길 수 있어요.",
      { exact: false },
    ),
  ).toBeVisible();
  expect(backendRequests).toEqual([]);
  await expect(
    page.getByRole("link", { name: "첫 인사 남기기" }),
  ).toHaveAttribute("href", "/guestbook");
});

test("모바일 메뉴와 320px 화면에서 소개를 읽을 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(
    page.getByRole("navigation", { name: "모바일 주요 메뉴" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 주요 메뉴" })
    .getByRole("link", { name: "방명록 소개" })
    .click();
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(
    page.getByRole("heading", { name: /인사에 정해진/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "방명록 가기", exact: true }),
  ).toBeVisible();
});
