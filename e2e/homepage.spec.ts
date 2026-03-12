import { test, expect } from "@playwright/test";

test.describe("トップページ", () => {
  test("ページが正常に表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ClaudeNote/);
  });

  test("ヒーローセクションが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("AIツールの最新情報を、")
    ).toBeVisible();
    await expect(page.getByText("あなたのペースで")).toBeVisible();
  });

  test("ナビゲーションリンクが存在する", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("🔰 まずはここから")).toBeVisible();
    await expect(page.getByText("📰 今週のまとめ")).toBeVisible();
    await expect(page.getByText("🔍 全記事")).toBeVisible();
  });

  test("カテゴリフィルタが表示される", async ({ page }) => {
    await page.goto("/");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "すべて" })).toBeVisible();
    await expect(main.getByRole("link", { name: "ニュース" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Tips" })).toBeVisible();
    await expect(
      main.getByRole("link", { name: "チュートリアル" })
    ).toBeVisible();
  });

  test("今週のハイライトセクションが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("今週のハイライト")).toBeVisible();
  });

  test("機能で探すセクションが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "機能で探す" })
    ).toBeVisible();
  });

  test("記事カードが表示される", async ({ page }) => {
    await page.goto("/");
    // 記事が1つ以上存在すること
    const articles = page.locator("article, [data-testid='article-card'], a[href^='/articles/']");
    await expect(articles.first()).toBeVisible();
  });

  test("フッターが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("ClaudeNote — 引用元を明示した上で")
    ).toBeVisible();
  });
});

test.describe("タブナビゲーション", () => {
  test("「まずはここから」タブに遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.getByText("🔰 まずはここから").click();
    await expect(page).toHaveURL(/tab=beginner/);
  });

  test("「今週のまとめ」タブに遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.getByText("📰 今週のまとめ").click();
    await expect(page).toHaveURL(/tab=featured/);
  });

  test("カテゴリフィルタで絞り込める", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "ニュース" }).click();
    await expect(page).toHaveURL(/category=news/);
  });
});

test.describe("ヘッダー", () => {
  test("ヘッダーロゴが表示される", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });
});
