import { useCall, useSubscribe } from "./useCecClient";

export function useScript() {
  const autoMerge = async (data: any) => {
    return await useCall("Playwright.runMerge", data);
  };
  const installPlaywright = async () => {
    return await useCall("Playwright.installPlaywright");
  };

  return { autoMerge, installPlaywright };
}
