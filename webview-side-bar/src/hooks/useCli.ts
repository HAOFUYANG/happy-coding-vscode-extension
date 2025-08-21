import { useCall, useSubscribe } from "./useCecClient";
import { useEffect, useState } from "react";

export function useCli() {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState([
    { title: "Waiting", description: "准备创建项目模版..." },
    { title: "Waiting", description: "项目模版下载成功" },
    { title: "Waiting", description: "拷贝模版并开始渲染..." },
    { title: "Waiting", description: "模版项目创建成功" },
  ]);
  const checkEnvironment = async () => {
    return await useCall("Cli.checkEnvironment");
  };

  const executeCli = async (params: {
    name: string;
    type: string;
    template: any;
  }): Promise<any> => {
    return await useCall("Cli.executeCli", params);
  };

  const installHappyCli = async () => {
    return await useCall("Cli.installHappyCli");
  };
  const createHappyApp = async () => {
    return await useCall("Cli.createHappyApp");
  };
  useEffect(() => {
    const processStepData = useSubscribe(
      "Cli.processStepUpdate",
      (data: any) => {
        const { current, stepDetails } = data;
        setCurrentStep(current);
        setSteps(stepDetails);
      }
    );
    return () => processStepData();
  }, []);
  return {
    checkEnvironment,
    executeCli,
    steps,
    currentStep,
    installHappyCli,
    createHappyApp,
  };
}
