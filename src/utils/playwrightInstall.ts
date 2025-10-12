import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

export async function ensurePlaywrightInstalled(): Promise<void> {
  // 检查全局
  let globalExists = false;
  try {
    const globalRoot = await new Promise<string>((resolve, reject) => {
      exec("npm root -g", (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      });
    });
    const globalPlaywrightPath = path.join(globalRoot, "@playwright", "test");
    console.log("globalPlaywrightPath :>> ", globalPlaywrightPath);
    globalExists = fs.existsSync(globalPlaywrightPath);
  } catch {
    // 忽略
  }

  if (globalExists) {
    vscode.window.showInformationMessage(
      "@playwright/test 已经安装，无需再次安装。"
    );
    return;
  }

  vscode.window.showInformationMessage(
    "未检测到 @playwright/test，正在全局安装..."
  );
  await installPlaywright();
}

function installPlaywright() {
  const terminal = vscode.window.createTerminal({
    name: "Playwright安装",
  });
  // 执行安装命令
  terminal.sendText("npm i -g @playwright/test", true);
  terminal.show(true);
  vscode.window.showInformationMessage(
    "已启动 @playwright/test 安装，请稍候..."
  );
}
