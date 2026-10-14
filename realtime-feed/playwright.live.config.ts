import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
if (process.env.SUPABASE_TEST_PROJECT_CONFIRMED !== "yes")
  throw new Error("A confirmed dedicated test project is required.");

export default defineConfig({
  testDir: "./tests/live",
  workers: 1,
  timeout: 150000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5182", headless: true, trace: "off" },
  webServer: {
    command: "npm.cmd run dev -- --port 5182 --strictPort",
    url: "http://127.0.0.1:5182",
    reuseExistingServer: false,
    env: { VITE_GUESTBOOK_MODE: "supabase" },
  },
});
