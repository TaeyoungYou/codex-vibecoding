import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5180",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev -- --port 5180 --strictPort`,
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
    env: {
      VITE_GUESTBOOK_MODE: "supabase",
      VITE_SUPABASE_URL: "http://127.0.0.1:59999",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_fixture",
    },
  },
});
