import {
  callable,
  controller,
  subscribable,
} from "cec-client-server/decorator";
import { ContextService } from "@/service/context.service";
@controller("User")
export class UserController {
  private subscribers: ((data: any) => void)[] = [];
  constructor() {
    // 空的，不从 DI 取
  }

  @callable("saveUser")
  async saveUser(userInfo: any): Promise<{ success: boolean }> {
    await ContextService.setState("userInfo", JSON.stringify(userInfo));
    return { success: true };
  }
  @callable("getUser")
  async getUser(): Promise<any> {
    return ContextService.getState("userInfo");
  }
  @callable("clearUser")
  async clearUser(): Promise<{ success: boolean }> {
    await ContextService.setState("userInfo", null);
    // 给所有订阅者推送一个事件，例如 loginExpired
    this.subscribers.forEach((cb) => cb({ isLogin: false }));
    return { success: true };
  }
  @subscribable("updateLoginStatus")
  updateLoginStatus(next: (data: any) => void) {
    this.subscribers.push(next);
    // 退订逻辑
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== next);
    };
  }
}
