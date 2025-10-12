import React, { useState, useEffect } from "react";
import { Flex, message, Space, Input, Button } from "antd";
import { useScript } from "@/hooks/useScripts";

const ScriptTab = () => {
  const { autoMerge } = useScript();
  const handleMerge = () => {
    const { autoMerge } = useScript();
    let data = {
      name: "yang",
      psd: "******",
    };
    autoMerge(data);
  };
  const handleInstallPlaywright = () => {
    const { installPlaywright } = useScript();
    installPlaywright();
  };

  return (
    <div style={{ padding: 0 }}>
      <Flex gap="small" wrap>
        <Button type="primary" onClick={handleInstallPlaywright}>
          安装Playwright
        </Button>
        <Button type="primary" onClick={handleMerge}>
          MergeOne
        </Button>
      </Flex>
    </div>
  );
};
export default ScriptTab;
