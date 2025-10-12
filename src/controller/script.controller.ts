import { exec } from "child_process";
import * as vscode from "vscode";
import {
  controller,
  callable,
  subscribable,
} from "cec-client-server/decorator";
import * as path from "path";
import { ContextService } from "@/service/context.service";
import { ensurePlaywrightInstalled } from "@/utils/playwrightInstall";

@controller("Playwright")
export class PlaywrightController {
  @subscribable("playwright/result")
  resultStream(_: { success: boolean; output: string }) {
    // 运行时由框架替换
  }

  /**
   * 执行 playwright 测试脚本
   */
  @callable("runMerge")
  async runMerge(account: {
    name: string;
    psd: string;
  }): Promise<{ success: boolean; output: string }> {
    const ctx = ContextService.getContext();
    const cwd = ctx.extensionPath;
    const configPath = path.join(cwd, "playwright.config.ts");

    const env = {
      ...process.env,
      TEST_USER: account.name,
      TEST_PSD: account.psd,
    };

    try {
      return await new Promise<{ success: boolean; output: string }>(
        (resolve) => {
          exec(
            `npx playwright test "script/tests/bilibiliBanner.spec.ts" --config="${configPath}" --ui`,
            {
              cwd,
              shell: true,
              env,
              timeout: 1000 * 60 * 10, // 10分钟
            },
            (err, stdout, stderr) => {
              if (err) {
                const output = stderr || stdout || String(err);
                this.resultStream({ success: false, output });
                vscode.window.showErrorMessage(
                  "Playwright 执行失败，请检查日志。"
                );
                return resolve({ success: false, output });
              }

              this.resultStream({ success: true, output: stdout });
              vscode.window.showInformationMessage("Playwright 执行完成！");
              resolve({ success: true, output: stdout });
            }
          );
        }
      );
    } catch (error: any) {
      const output = String(error);
      this.resultStream({ success: false, output });
      vscode.window.showErrorMessage("Playwright 执行失败，请检查日志。");
      return { success: false, output };
    }
  }

  @callable("installPlaywright")
  async installPlaywright() {
    await ensurePlaywrightInstalled();
  }
}
