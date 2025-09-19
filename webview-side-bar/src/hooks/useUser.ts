import { useCall, useSubscribe } from "./useCecClient";

export function useUser() {
  const saveUser = async (userInfo: any) => {
    return await useCall("User.saveUser", userInfo);
  };

  const getUser = async () => {
    const result = await useCall<any | null>("User.getUser");
    return JSON.parse(result);
  };

  const clearUser = async () => {
    return await useCall("User.clearUser");
  };

  const updateLoginStatus = (updateLogin: () => void) => {
    return useSubscribe("User.updatesLoginStatus", (data: any) => {
      if (data.isLogin) {
        return;
      }
      updateLogin();
    });
  };

  return { saveUser, getUser, clearUser, updateLoginStatus };
}
