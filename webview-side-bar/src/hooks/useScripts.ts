import { useCall, useSubscribe } from "./useCecClient";

export function useScript() {
  const autoMerge = async (data: any) => {
    return await useCall("Playwright.runMerge", data);
  };

  return { autoMerge };
}
