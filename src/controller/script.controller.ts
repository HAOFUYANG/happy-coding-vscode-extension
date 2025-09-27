import { exec } from "child_process";
import * as vscode from "vscode";
import { controller, callable } from "cec-client-server/decorator";
import path from "path";
import { ContextService } from "@/service/context.service";

@controller("Playwright")
export class PlaywrightController {
  /**
   * 执行 playwright 测试脚本
   * @returns { success: boolean, output: string }
   */
  @callable("runMerge")
  async runMerge(account: any): Promise<{ success: boolean; output: string }> {
    console.log("account :>> ", account);
    const ctx = ContextService.getContext(); // 从全局服务取
    const cwd = ctx.extensionPath;
    const configPath = path.join(cwd, "playwright.config.ts");
    const env = {
      ...process.env,
      TEST_USER: account.name,
      TEST_PSD: account.psd,
    };
    return new Promise((resolve) => {
      exec(
        `npx playwright test "script/tests/bilibiliBanner.spec.ts" --config="${configPath}" --ui`,
        {
          cwd,
          shell: true,
          env,
        },
        (err, stdout, stderr) => {
          if (err) {
            console.log("err :>> ", err);
            console.log("stderr || stdout :>> ", stderr || stdout);
            vscode.window.showErrorMessage("Playwright 执行失败，请检查日志。");
            return resolve({ success: false, output: stderr || stdout });
          }
          vscode.window.showInformationMessage("Playwright 执行完成！");
          resolve({ success: true, output: stdout });
        }
      );
    });
  }
}
