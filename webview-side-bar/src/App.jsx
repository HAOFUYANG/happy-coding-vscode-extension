import React, { useState, useEffect, useMemo, use } from "react";
import { Tabs, ConfigProvider, message, theme } from "antd";
import {
  OrderedListOutlined,
  FormOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import ControlPanel from "./components/ControlPanel";
import FileTable from "./components/FileTable";
import LogTable from "./components/LogTable";
import SettingsModal from "./components/SettingsModal";
import CliTab from "./components/CliTab/index";
import GitTab from "./components/GitTab/index";
import "./style/antd.css";
import { vscodeApi } from "./utils/message";
const { darkAlgorithm, defaultSeed, getDesignToken } = theme;
import { useCoding } from "@/hooks/useCoding";
const getTokenWithVscodeTheme = () => {
  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--vscode-editor-background")
      ?.trim() || "#212121";

  // 修改 defaultSeed（基础 token）
  const customSeed = {
    ...defaultSeed,
    colorBgBase: bg,
  };

  // 传入暗黑算法生成完整 token
  const mergedToken = getDesignToken({
    ...customSeed,
    algorithm: [darkAlgorithm],
  });

  return mergedToken;
};

const CodingBarragePanel = ({
  acceptDetails,
  botFiles,
  onOpenFile,
  onDeleteFile,
  onRefreshFile,
  onStart,
  onStop,
  loading,
}) => (
  <>
    <ControlPanel onStart={onStart} onStop={onStop} loading={loading} />
    <Tabs
      defaultActiveKey="LOG"
      items={[
        {
          key: "LOG",
          label: (
            <>
              <OrderedListOutlined /> 采纳日志
            </>
          ),
          children: <LogTable data={acceptDetails} />,
        },
        {
          key: "FILE",
          label: (
            <>
              <FormOutlined /> 文件
            </>
          ),
          children: (
            <FileTable
              data={botFiles}
              onOpen={onOpenFile}
              onDelete={onDeleteFile}
              onRefresh={onRefreshFile}
            />
          ),
        },
      ]}
    />
  </>
);

const App = () => {
  const {
    startCoding,
    stopCoding,
    acceptDetails,
    scanFile,
    openFile,
    deleteFile,
    loading,
  } = useCoding();

  const [botFiles, setBotFiles] = useState([]);
  const [maxLines, setMaxLines] = useState(100);
  const [acceptRatio, setAcceptRatio] = useState(100);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const token = useMemo(() => getTokenWithVscodeTheme(), []);
  //添加展示隐藏tab的逻辑
  const [_clickCount, setClickCount] = useState(0);
  //初始状态读取当前持久化数据
  const [barrageUnlocked, setBarrageUnlocked] = useState(() => {
    const saved = vscodeApi.getState?.();
    return saved?.barrageUnlocked || false;
  });
  useEffect(() => {
    handleScanFile();
  }, []);

  const handleConfirmSettings = async () => {
    setConfigModalVisible(false);
    await startCoding({ maxGeneratedLines: maxLines, acceptRatio });
  };

  const handleStopCoding = async () => {
    await stopCoding();
  };
  const handleScanFile = async () => {
    const fileList = await scanFile();
    setBotFiles(fileList);
  };
  const handleOpenGenerateFile = async (file) => {
    await openFile(file.path);
  };
  const handelDeleteGenerateFile = async (file) => {
    const result = await deleteFile(file.path);
    console.log("result :>> ", result);
    if (result) {
      message.success("删除成功");
      //删除成功之后刷新列表
      handleScanFile();
    }
  };
  const handleSecretClick = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        const newUnlocked = !barrageUnlocked;
        setBarrageUnlocked(newUnlocked);
        vscodeApi.setState?.({ barrageUnlocked: newUnlocked });
        return 0; // reset clickCount
      }
      return next;
    });
  };
  const extraContent = (
    <div
      style={{
        width: 36,
        height: 24,
        cursor: "pointer",
        opacity: 0, // 看不见
      }}
      onClick={handleSecretClick}
    >
      <EyeInvisibleOutlined />
    </div>
  );
  const tabItems = [
    {
      key: "CLI_TOOLS",
      label: <>脚手架</>,
      children: <CliTab />,
    },
    {
      key: "GIT_TOOLS",
      label: <>git工具</>,
      children: <GitTab />,
    },
  ];

  if (barrageUnlocked) {
    tabItems.push({
      key: "BARRAGE",
      label: <>代码</>,
      children: (
        <CodingBarragePanel
          acceptDetails={acceptDetails}
          botFiles={botFiles}
          onOpenFile={(file) => handleOpenGenerateFile(file)}
          onDeleteFile={(file) => handelDeleteGenerateFile(file)}
          onRefreshFile={() => {
            handleScanFile();
          }}
          onStart={() => setConfigModalVisible(true)}
          onStop={handleStopCoding}
          loading={loading}
        />
      ),
    });
  }

  return (
    <ConfigProvider
      componentSize="small"
      theme={{
        token: {
          ...token,
          fontSize: 12,
          size: "small",
        },
        components: {
          Tabs: {
            // inkBarColor: "var(--vscode-editor-foreground)",
            // itemActiveColor: "var(--vscode-editor-foreground)",
            // itemColor: "var(--vscode-disabledForeground,#fff)",
          },
        },
      }}
    >
      <div className="container">
        <Tabs
          size="middle"
          defaultActiveKey="CLI_TOOLS"
          type="card"
          tabBarExtraContent={extraContent}
          items={tabItems}
        />
        <SettingsModal
          visible={configModalVisible}
          onClose={() => setConfigModalVisible(false)}
          onConfirm={handleConfirmSettings}
          maxLines={maxLines}
          setMaxLines={setMaxLines}
          acceptRatio={acceptRatio}
          setAcceptRatio={setAcceptRatio}
          disabled={loading}
        />
      </div>
    </ConfigProvider>
  );
};

export default App;
