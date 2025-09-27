import "reflect-metadata";
import * as vscode from "vscode";
// import "./controller/index";
import { ContextService } from "@/service/context.service";
import {
  registerControllers,
  registerServices,
} from "cec-client-server/decorator";
import { GitController } from "./controller/git.controller";
import { AxiosController } from "./controller/axios.controller";
import { UserController } from "./controller/user.controller";
import { CodingController } from "./controller/coding.controller";
import { CliController } from "./controller/cli.controller";
import { PlaywrightController } from "./controller/script.controller";
export function activate(context: vscode.ExtensionContext): void {
  //1.注册全局context
  ContextService.register(context);
  //2.注册控制器
  // registerControllers：负责暴露 HTTP / RPC 调用接口
  registerControllers([
    GitController,
    AxiosController,
    UserController,
    CodingController,
    CliController,
    PlaywrightController,
  ]);
  // registerServices：负责暴露订阅流（@subscribable）
  registerServices([CodingController]);
}
