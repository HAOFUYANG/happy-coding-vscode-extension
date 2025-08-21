import * as vscode from "vscode";
import * as path from "path";
import { getControllers } from "cec-client-server/decorator";
import { CecServer } from "cec-client-server";
export class SideViewProvider implements vscode.WebviewViewProvider {
  private _webview: vscode.Webview | undefined;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "happyCoding.inlineReportView",
        this
      )
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._webview = webviewView.webview;

    const mediaPath = vscode.Uri.file(
      path.join(this._context.extensionPath, "media")
    );
    this._webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaPath],
    };

    const htmlUri = vscode.Uri.file(
      path.join(this._context.extensionPath, "media", "index.html")
    );
    vscode.workspace.fs.readFile(htmlUri).then((buffer) => {
      let html = buffer.toString("utf8");
      // 替换资源路径为 webviewUri
      html = html.replace(/(src|href)="(.+?)"/g, (_, attr, relativePath) => {
        const resourcePath = vscode.Uri.file(
          path.join(this._context.extensionPath, "media", relativePath)
        );
        return `${attr}="${this._webview!.asWebviewUri(resourcePath)}"`;
      });
      this._webview!.html = html;

      // 注册 CEC Server
      const { callables, subscribables } = getControllers();
      const cecServer = new CecServer(
        this._webview!.postMessage.bind(this._webview!),
        this._webview!.onDidReceiveMessage.bind(this._webview!)
      );

      Object.entries(callables).forEach(([name, handler]) =>
        cecServer.onCall(name, handler)
      );
      Object.entries(subscribables).forEach(([name, handler]) =>
        cecServer.onSubscribe(name, handler)
      );
    });
  }

  /** 推送最新生成内容给 webview */
  postUpdateMessage(data: any) {
    this._webview?.postMessage({
      type: "update",
      data,
    });
  }

  /** 推送当前 Bot 文件列表给 webview */
  postUpdateBotFiles(files: any[]) {
    this._webview?.postMessage({
      type: "botFiles",
      botFiles: files,
    });
  }

  /** 通知 webview 生成已停止 */
  postGenerationStopped() {
    this._webview?.postMessage({
      type: "generationStopped",
    });
  }
}
