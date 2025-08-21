import {
  callable,
  controller,
  subscribable,
} from "cec-client-server/decorator";
import path from "path";
import {
  checkNodeVersion,
  checkHappyCliInstalled,
} from "@/utils/happyCliUtils";
import * as vscode from "vscode";
import { processStep } from "@/constants/cli";
import { createTemplateByOptions } from "@/core/cli/createTemplateByOptions";
import { downloadTemplate } from "@/core/cli/downloadTemplate";
import { installTemplate } from "@/core/cli/installTemplate";
/**
 * 脚手架控制器类
 */
@controller("Cli")
export class CliController {
  constructor() {}
  @subscribable("processStepUpdate")
  processStepUpdate(next: (data: any) => void) {
    this.subscribers.push(next);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== next);
    };
  }
  private subscribers: ((data: any) => void)[] = [];
  private emitProcessStepUpdate(data: any) {
    this.subscribers.forEach((cb) => cb(data));
  }
  @callable("checkEnvironment")
  checkEnvironment(): Promise<any> {
    return new Promise((resolve, reject) => {
      const nodeVersionCheckResult = checkNodeVersion();
      console.log("nodeVersionCheckResult :>> ", nodeVersionCheckResult);
      const cliInstalled = checkHappyCliInstalled();
      console.log("cliInstalled :>> ", cliInstalled);
      resolve({
        nodeVersionCheckResult,
        cliInstalled,
      });
    });
  }
  @callable("executeCli")
  async executeCli(params: {
    name: string;
    type: string;
    template: any;
  }): Promise<any> {
    const { name, type, template } = params;
    try {
      //1.这对应了脚手架项目的第一步选择模版
      const folder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "请选择项目模版文件生成位置",
      });
      if (!folder) return;
      //获取文件安装地址
      const baseDir = folder[0].fsPath;
      const selectedTemplate = await createTemplateByOptions({
        name,
        type,
        template,
      });
      //1.创建项目模版
      this.emitProcessStepUpdate(processStep.STEP1);
      await installTemplate(selectedTemplate, baseDir);
      //2.下载项目模版至缓存目录
      this.emitProcessStepUpdate(processStep.STEP2);
      await downloadTemplate(selectedTemplate);
      //3.安装项目模版至项目目录
      this.emitProcessStepUpdate(processStep.STEP3);
      await installTemplate(selectedTemplate, baseDir);

      this.emitProcessStepUpdate(processStep.STEP4);
      const projectPath = path.join(baseDir, name);
      //5.打开新的项目窗口，执行hook
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(projectPath),
        true
      );
      return true;
      //6.打开项目之后会出现用户信任确认窗口，所有插件端暂时不做脚手架自动安装的能力
    } catch (error) {
      return Promise.reject(error);
    }
  }

  @callable("installHappyCli")
  async installHappyCli() {
    return new Promise<boolean>((resolve, reject) => {
      const terminal = vscode.window.createTerminal("安装 Happy CLI");
      terminal.show();
      terminal.sendText("npm install -g @happy.cli/cli", true);
      resolve(true);
    });
  }

  @callable("createHappyApp")
  async createHappyApp(): Promise<any> {
    return new Promise((resolve, reject) => {
      const terminal = vscode.window.createTerminal("Create Happy App构建模版");
      terminal.show();
      terminal.sendText(
        "npx create-happy-app my-app --type project -p template-vue",
        true
      );
      resolve(true);
    });
  }
}
