import * as vscode from "vscode";
import * as path from "path";
import {
  callable,
  controller,
  subscribable,
} from "cec-client-server/decorator";
import { ContextService } from "@/service/context.service";
import { SideViewProvider } from "@/provider/SideViewProvider";
import { insertRandomSnippet } from "@/utils/insertRandomSnippet";

@controller("Coding")
export class CodingController {
  private isGenerating = false;
  private targetEditor: vscode.TextEditor | null = null;
  private maxGeneratedLines = 1000;
  private acceptRatio = 30;
  private acceptedContentDetails: any[] = [];
  private acceptedCount = 0;
  private outputChannel: vscode.OutputChannel;
  private reportViewProvider: SideViewProvider;
  private loopTimer: NodeJS.Timeout | null = null;
  private hasInsertedTrigger = false;
  private lastInsertedContent = "";
  // 类中新增字段
  private loopCounter = 0; // 循环计数
  private snippetInterval = 10; // 每 5 次循环插入一次随机 snippet
  constructor() {
    const context = ContextService.getContext();
    this.outputChannel = vscode.window.createOutputChannel(
      "InlineAutoGenerator"
    );
    this.outputChannel.show(true);

    this.reportViewProvider = new SideViewProvider(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "coder-view",
        this.reportViewProvider
      )
    );
  }
  @subscribable("generationUpdates")
  generationUpdates(next: (data: any) => void) {
    this.subscribers.push(next);
    // 返回函数
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== next);
    };
  }
  @subscribable("generationStatus")
  generationStatus(next: (data: { loading: boolean }) => void) {
    this.statusSubscribers.push(next);
    return () => {
      this.statusSubscribers = this.statusSubscribers.filter(
        (cb) => cb !== next
      );
    };
  }
  private statusSubscribers: ((data: { loading: boolean }) => void)[] = [];
  private emitBtnLoading(loading: boolean) {
    this.statusSubscribers.forEach((cb) => cb({ loading }));
  }

  private subscribers: ((data: any) => void)[] = [];
  private emitUpdate(data: any) {
    this.subscribers.forEach((cb) => cb(data));
  }
  @callable("start")
  async startCoding(params?: {
    maxGeneratedLines?: number;
    acceptRatio?: number;
  }) {
    this.emitBtnLoading(true);
    if (this.isGenerating)
      return { success: false, message: "Already generating" };

    this.acceptedContentDetails = [];
    this.acceptedCount = 0;
    this.emitUpdate(this.acceptedContentDetails);

    const folderUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "选择生成文件夹",
    });
    if (!folderUri) return { success: false, message: "No folder selected" };

    const timestamp = Date.now();
    const fileName = `custom-common-utils-${timestamp}.js`;
    const fileUri = vscode.Uri.file(path.join(folderUri[0].fsPath, fileName));
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from("", "utf8"));
    this.targetEditor = await vscode.window.showTextDocument(fileUri);

    this.isGenerating = true;
    this.hasInsertedTrigger = false;
    this.outputChannel.appendLine(`ready to code in the ${fileName}...`);

    this.maxGeneratedLines = params?.maxGeneratedLines ?? 1000;
    this.acceptRatio = params?.acceptRatio ?? 30;

    this.startInlineLoop();

    vscode.window.showInformationMessage(`coding in the ${fileName}....`);
    return { success: true };
  }

  @callable("stop")
  async stopCoding(manualStop = true) {
    if (!this.isGenerating) {
      vscode.window.showInformationMessage("doing nothing...");
      return;
    }

    const editor = this.targetEditor;

    // 停止循环
    this.stopInlineLoop();

    if (manualStop) {
      // 主动停止：不做清理、不重启
      this.isGenerating = false;
      this.targetEditor = null;
      this.outputChannel.appendLine("manual stop: generator stopped");
      vscode.window.showInformationMessage("inline generator stopped manually");
      this.emitBtnLoading(false);
      return;
    }

    // 自动停止：清理空行并判断是否需要重新启动
    if (editor) {
      // 保存当前文档
      await editor.document.save();
      this.outputChannel.appendLine("save success!");

      // 1. 去掉每行末尾空格
      let fullText = editor.document.getText().replace(/[ \t]+$/gm, "");
      // 2. 连续空行压缩为 1 行
      let cleanedText = fullText.replace(/(\r?\n){2,}/g, "\n");
      // 3. 去掉开头空行
      cleanedText = cleanedText.replace(/^(\r?\n)+/, "");
      // 4. 去掉结尾多余空行，保留 1 个换行
      cleanedText = cleanedText.replace(/(\r?\n)+$/, "\n");

      if (cleanedText !== fullText) {
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(fullText.length)
        );
        await editor.edit((edit) => edit.replace(fullRange, cleanedText));
        await editor.document.save();
        this.outputChannel.appendLine("clean blank lines success!");
      }

      // 检查清理后行数
      const cleanedLineCount = editor.document.lineCount;
      if (cleanedLineCount < this.maxGeneratedLines) {
        // 清理后行数不够，重新启动生成
        this.outputChannel.appendLine(
          `lines after cleanup (${cleanedLineCount}) < maxGeneratedLines (${this.maxGeneratedLines}), resume generating...`
        );
        this.isGenerating = true;
        this.startInlineLoop();
        return; // 不显示 stop success，等待生成完成
      }
    }

    // 真正停止逻辑
    this.isGenerating = false;
    this.targetEditor = null;
    this.outputChannel.appendLine("stop inline generator success");
    vscode.window.showInformationMessage("stop inline generator success");
    this.emitBtnLoading(false);
  }

  @callable("scanFile")
  async scanFile() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const files = await vscode.workspace.findFiles(
        "**/custom-common-utils-*.js"
      );
      const fileList = files.map((fileUri) => ({
        name: path.basename(fileUri.fsPath),
        path: fileUri.fsPath,
      }));
      return fileList;
    }
  }
  @callable("openFile")
  async openFile(filePath: string) {
    console.log("filePath :>> ", filePath);
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }
  @callable("deleteFile")
  async deleteFile(filePath: string) {
    try {
      const uri = vscode.Uri.file(filePath);
      await vscode.workspace.fs.delete(uri);
      vscode.window.showInformationMessage(`文件已删除: ${filePath}`);
      return true;
    } catch (error) {
      console.log("error :>> ", error);
      return vscode.window.showErrorMessage(`删除文件失败: ${filePath}`);
    }
  }

  private startInlineLoop(minDelay = 1000, maxDelay = 2000) {
    const loop = async () => {
      if (!this.isGenerating) {
        return;
      }
      await this.triggerAndAcceptInline();
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      this.loopTimer = setTimeout(loop, delay);
    };
    loop();
  }
  private stopInlineLoop() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
    }
    this.loopTimer = null;
    if (this.reportViewProvider) {
      this.reportViewProvider.postGenerationStopped();
    }
  }
  private async triggerAndAcceptInline() {
    const editor = this.targetEditor;
    if (!this.isGenerating || !editor) return;

    // 超过最大行数直接停止
    if (editor.document.lineCount >= this.maxGeneratedLines) {
      this.outputChannel.appendLine(
        "code generation completed, max line reached."
      );
      this.isGenerating = false;
      this.stopInlineLoop();
      vscode.window.showInformationMessage(
        "code generation completed, stop coding"
      );
      this.emitBtnLoading(false);
      await editor.document.save();
      this.outputChannel.appendLine("save success");
      return;
    }

    this.loopCounter++;

    // 超过 10 次循环，主动插入触发词
    if (this.loopCounter > this.snippetInterval) {
      await insertRandomSnippet(editor);
      this.outputChannel.appendLine(
        `loopCounter ${this.loopCounter} > ${this.snippetInterval}, inserted new trigger snippet, reset loopCounter`
      );
      this.loopCounter = 0;

      // 立即触发 inlineSuggest 并 commit
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger"
      );
      await new Promise((r) => setTimeout(r, 300));
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.commit"
      );
      await editor.document.save();
      this.outputChannel.appendLine("trigger + commit after reset");
    }

    // 首次触发，或者到 snippetInterval 时插入触发词
    if (
      !this.hasInsertedTrigger ||
      this.loopCounter % this.snippetInterval === 0
    ) {
      await insertRandomSnippet(editor);
      this.hasInsertedTrigger = true;
      this.outputChannel.appendLine("first trigger success");
    }

    // 获取触发前文档长度
    const prevDocLength = editor.document.getText().length;

    // 触发 inline suggestion
    await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
    this.outputChannel.appendLine("trigger inline suggestion");

    // 等待 300ms 再 commit
    await new Promise((r) => setTimeout(r, 300));

    // 判断是否采纳
    const currentLineCount = editor.document.lineCount;
    const generatedRatio = this.acceptedCount / currentLineCount;
    const shouldAccept =
      Math.random() < this.acceptRatio / 100 - generatedRatio;
    let didAccept = false;

    if (shouldAccept) {
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.commit"
      );
      didAccept = true;
      await editor.document.save();
      this.outputChannel.appendLine(
        "accept inline suggestion success and save once"
      );
    }

    // 获取新增内容，避免重复
    const newDocText = editor.document.getText();
    let addedContent = newDocText.slice(prevDocLength).trim();

    if (addedContent && addedContent !== this.lastInsertedContent) {
      if (didAccept) this.acceptedCount++;
      this.acceptedContentDetails.push({
        count: this.acceptedCount,
        content: addedContent,
        prevLineCount: currentLineCount,
        newLineCount: editor.document.lineCount,
      });
      this.lastInsertedContent = addedContent;
    }

    // 更新报告面板
    this.emitUpdate(this.acceptedContentDetails);

    // 光标移到最后一行
    const lastLine = editor.document.lineCount - 1;
    const lastLineText = editor.document.lineAt(lastLine).text;
    const pos = new vscode.Position(lastLine, lastLineText.length);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos));

    // 如果采纳了，或者到了 snippetInterval，强制加一个换行保证下轮触发
    if (didAccept || this.loopCounter % this.snippetInterval === 0) {
      await editor.edit((edit) => edit.insert(pos, "\n"));
    }
  }
}
