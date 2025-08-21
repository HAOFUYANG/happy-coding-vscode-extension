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
  private subscribers: ((data: any) => void)[] = [];
  private emitUpdate(data: any) {
    this.subscribers.forEach((cb) => cb(data));
  }
  @callable("start")
  async startCoding(params?: {
    maxGeneratedLines?: number;
    acceptRatio?: number;
  }) {
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
  async stopCoding() {
    if (!this.isGenerating) {
      vscode.window.showInformationMessage("doing nothing...");
      return;
    }
    this.targetEditor?.document.save().then(() => {
      this.outputChannel.appendLine("save success!");
    });
    this.isGenerating = false;
    this.targetEditor = null;
    this.stopInlineLoop();
    this.outputChannel.appendLine("stop inline generator success");
    vscode.window.showInformationMessage("stop inline generator success");
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
      if (!this.isGenerating) return;
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

    if (editor.document.lineCount >= this.maxGeneratedLines) {
      this.outputChannel.appendLine(
        "code generation completed, max line reached."
      );
      this.isGenerating = false;
      this.stopInlineLoop();
      vscode.window.showInformationMessage(
        "code generation completed, stop coding"
      );
      editor.document.save().then(() => {
        this.outputChannel.appendLine("save success");
      });
      return;
    }

    if (!this.hasInsertedTrigger) {
      await editor.edit((edit) =>
        edit.insert(editor.selection.active, "const")
      );
      this.hasInsertedTrigger = true;
      this.outputChannel.appendLine("first trigger success");
    }

    const prevLineCount = editor.document.lineCount;
    await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
    this.outputChannel.appendLine("trigger inline suggestion");

    const currentLineCount = editor.document.lineCount;
    const generatedRatio = this.acceptedCount / currentLineCount;
    const shouldAccept =
      Math.random() < this.acceptRatio / 100 - generatedRatio;
    let didAccept = false;
    if (shouldAccept) {
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.commit"
      );
      await editor.document.save().then(() => {
        this.outputChannel.appendLine(
          "accept inline suggestion success and save once"
        );
      });
      didAccept = true;
    } else {
      await insertRandomSnippet(editor);
      this.outputChannel.appendLine(
        "insert random code block instead of accepting"
      );
    }
    const newLineCount = editor.document.lineCount;
    let addedContent = "";
    if (newLineCount > prevLineCount) {
      for (let i = prevLineCount - 1; i < newLineCount - 1; i++) {
        addedContent += editor.document.lineAt(i).text + "\n";
      }
    } else {
      const lastLineNumber = newLineCount - 2;
      if (lastLineNumber >= 0) {
        addedContent = editor.document.lineAt(lastLineNumber).text;
      }
    }
    if (didAccept) {
      this.acceptedCount++;
      this.acceptedContentDetails.push({
        count: this.acceptedCount,
        prevLineCount,
        newLineCount: editor.document.lineCount,
        content: addedContent.trim(),
      });
    }
    if (this.reportViewProvider) {
      this.emitUpdate(this.acceptedContentDetails);
    }
    this.emitUpdate(this.acceptedContentDetails);
    await this.moveCursorToEndAndInsertNewLine(editor);
    if (this.shouldTriggerOnEmptyLines(editor, 3, 2)) {
      await this.insertTriggerWord(editor);
    }
  }

  private async moveCursorToEndAndInsertNewLine(editor: vscode.TextEditor) {
    const lastLine = editor.document.lineCount - 1;
    const lastChar = editor.document.lineAt(lastLine).text.length;
    const pos = new vscode.Position(lastLine, lastChar);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos));
    await editor.edit((edit) => edit.insert(pos, "\n"));
  }

  private shouldTriggerOnEmptyLines(
    editor: vscode.TextEditor,
    linesCount = 3,
    emptyThreshold = 2
  ) {
    const doc = editor.document;
    let emptyLines = 0;
    for (
      let i = doc.lineCount - 1;
      i >= Math.max(0, doc.lineCount - linesCount);
      i--
    ) {
      if (doc.lineAt(i).text.trim() === "") emptyLines++;
    }
    return emptyLines > emptyThreshold;
  }

  private async insertTriggerWord(editor: vscode.TextEditor) {
    const lastLine = editor.document.lineCount - 1;
    const lastChar = editor.document.lineAt(lastLine).text.length;
    await editor.edit((edit) =>
      edit.insert(new vscode.Position(lastLine, lastChar), "\nconst getData =")
    );
  }
}
