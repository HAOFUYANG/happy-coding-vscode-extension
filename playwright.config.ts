import { defineConfig, devices } from "@playwright/test";
import * as os from "os";
import * as path from "path";

function getChromePath() {
  switch (process.platform) {
    case "darwin": // macOS
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    case "win32": // Windows
      // Windows 上通常安装在这两个位置之一
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    case "linux":
      return "/usr/bin/google-chrome";
    default:
      return undefined;
  }
}

export default defineConfig({
  testDir: "./script/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        launchOptions: {
          executablePath: getChromePath(),
          headless: false,
          args: ["--disable-gpu"],
        },
      },
    },
  ],
});
