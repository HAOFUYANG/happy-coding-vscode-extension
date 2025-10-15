import { exec, execSync } from "child_process";
import * as vscode from "vscode";
import {
  controller,
  callable,
  subscribable,
} from "cec-client-server/decorator";
import * as path from "path";
import { ContextService } from "@/service/context.service";
import { ensurePlaywrightInstalled } from "@/utils/playwrightInstall";

function getGlobalNpmBin(): string {
  try {
    return execSync("npm bin -g").toString().trim();
  } catch {
    return "";
  }
}
function getGlobalNodeModules(): string {
  try {
    return execSync("npm root -g").toString().trim();
  } catch {
    return "";
  }
}

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
    const extensionPath = ctx.extensionPath;
    const configPath = path.join(extensionPath, "playwright.config.ts");

    const globalNpmBin = getGlobalNpmBin();
    const globalNodeModules = getGlobalNodeModules();
    console.log("global npm bin:", getGlobalNpmBin());
    console.log("global node_modules:", getGlobalNodeModules());
    const env = {
      ...process.env,
      PATH: `${globalNpmBin}:${process.env.PATH}`,
      NODE_PATH: `${globalNodeModules}:${process.env.NODE_PATH || ""}`,
      TEST_USER: account.name,
      TEST_PSD: account.psd,
    };
    console.log("env :>> ", env);
    try {
      return await new Promise<{ success: boolean; output: string }>(
        (resolve) => {
          exec(
            `npx playwright test "script/tests/bilibiliBanner.spec.ts" --config="${configPath}"`,
            {
              cwd: extensionPath,
              shell: true,
              env,
              timeout: 1000 * 60 * 10, // 10分钟
            },
            (err, stdout, stderr) => {
              if (err) {
                const output = stderr || stdout || String(err);
                console.log("output :>> ", output);
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
