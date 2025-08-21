import React, { useState, useEffect } from "react";
import {
  Typography,
  Form,
  Col,
  Flex,
  Row,
  Input,
  Select,
  Button,
  message,
  Space,
  Divider,
  Steps,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { vscodeApi } from "@/utils/message";
const { Option } = Select;
const { Paragraph, Text } = Typography;
import "./index.css";
import { useCli } from "@/hooks/useCli";
const templateOptions = [
  { label: "Vue-Arco-Vite模版", value: "template-vue-arco-vite" },
  { label: "Vue3模版", value: "template-vue" },
  { label: "React模版", value: "template-react" },
];
const CliTab = () => {
  const {
    checkEnvironment,
    executeCli,
    steps,
    currentStep,
    installHappyCli,
    createHappyApp,
  } = useCli();

  const [form] = Form.useForm();
  //环境检查loading
  const [checking, setChecking] = useState(false);
  const [nodeCheckPassedResult, setNodeCheckPassedResult] = useState({
    version: null,
    result: false,
  });
  const [cliInstalled, setCliInstalled] = useState(false);

  useEffect(() => {
    //获取当前环境信息的缓存数据比如node和cli的信息
    const saved = vscodeApi.getState?.();
    const cachedEnv = saved?.cachedEnvCheck;
    if (cachedEnv) {
      setNodeCheckPassedResult(cachedEnv.nodeVersionCheckResult);
      setCliInstalled(cachedEnv.cliInstalled);
    } else {
      runEnvironmentCheck(false);
    }
  }, []);

  const runEnvironmentCheck = async (isManual = false) => {
    if (isManual) {
      setChecking(true);
    }
    const result = await checkEnvironment();
    const { nodeVersionCheckResult, cliInstalled } = result;
    setNodeCheckPassedResult(nodeVersionCheckResult);
    setCliInstalled(cliInstalled);
    // 缓存当前检查结果
    vscodeApi.setState?.({
      cachedEnvCheck: { nodeVersionCheckResult, cliInstalled },
    });
    setChecking(false);
  };
  const handleExecuteCli = async (values) => {
    message.success("正在创建项目...");
    const result = await executeCli(values);
    if (result) {
      message.success("创建成功");
    }
  };

  const handleInstallHappyCli = async () => {
    const result = await installHappyCli();
    if (result) {
      message.success("执行成功");
    }
  };

  const handleCreateHappyApp = async () => {
    const result = await createHappyApp();
    if (result) {
      message.success("执行成功");
    }
  };

  return (
    <div style={{ padding: 0 }}>
      <div className="section">
        <div className="section-body">
          <Space direction="vertical" style={{ display: "flex" }}>
            <div className="card">
              <Row>
                <Col flex="auto">
                  <Paragraph style={{ fontSize: 14 }} strong>
                    环境检查
                  </Paragraph>
                </Col>
                <Col flex="50px" style={{ textAlign: "right" }}>
                  <Button
                    type="primary"
                    size="small"
                    loading={checking}
                    onClick={() => runEnvironmentCheck(true)}
                  >
                    检查
                  </Button>
                </Col>
              </Row>
              <div className="card-body">
                <Paragraph>
                  1. nodejs版本需大于18
                  {nodeCheckPassedResult?.result ? (
                    <Text type="success" style={{ marginLeft: 8 }} strong>
                      {nodeCheckPassedResult?.version}
                    </Text>
                  ) : (
                    <Text type="danger" style={{ marginLeft: 8 }} strong>
                      <ExclamationCircleOutlined /> 当前版本
                      {nodeCheckPassedResult?.version} 过低，请升级
                    </Text>
                  )}
                </Paragraph>
              </div>
              <Divider orientation="left" size="small" />
            </div>

            <div className="card">
              <Row>
                <Col flex="auto">
                  <Paragraph style={{ fontSize: 14 }} strong>
                    Create Happy App构建
                  </Paragraph>
                </Col>
                <Col flex="50px" style={{ textAlign: "right" }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleCreateHappyApp}
                  >
                    构建
                  </Button>
                </Col>
              </Row>

              <div className="card-body">
                <Paragraph>使用以下命令，直接创建，或点击构建按钮</Paragraph>
                <Paragraph code copyable>
                  npx create-happy-app my-app --type project -p template-vue
                </Paragraph>
                <Paragraph code copyable>
                  npm create happy-app@latest my-app -- --type project -p
                  template-vue
                </Paragraph>
              </div>
              <Divider orientation="left" size="small" />
            </div>

            <div className="card">
              <Row>
                <Col flex="auto">
                  <Paragraph style={{ fontSize: 14 }} strong>
                    Happy Init构建
                  </Paragraph>
                </Col>
                <Col flex="110px" style={{ textAlign: "right" }}>
                  <Flex gap="small" wrap>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleInstallHappyCli}
                    >
                      安装Cli
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleInstallHappyCli}
                    >
                      升级
                    </Button>
                  </Flex>
                </Col>
              </Row>

              <div className="card-body">
                <Paragraph>
                  {cliInstalled ? (
                    <Text type="success" strong style={{ marginLeft: 8 }}>
                      已安装
                    </Text>
                  ) : (
                    <>
                      <Paragraph type="danger">
                        <ExclamationCircleOutlined /> cli未安装
                      </Paragraph>

                      <Paragraph>使用如下命令安装，或点击安装按钮</Paragraph>
                      <Paragraph code copyable>
                        npm install -g @happy.cli/cli
                      </Paragraph>
                    </>
                  )}
                </Paragraph>

                <Form
                  form={form}
                  size="small"
                  labelCol={{ span: 4 }}
                  wrapperCol={{ span: 14 }}
                  layout="horizontal"
                  onFinish={handleExecuteCli}
                >
                  <Form.Item
                    name="type"
                    label="初始化类型"
                    rules={[{ required: true }]}
                    initialValue="project"
                  >
                    <Select>
                      <Option value="project">项目</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="name"
                    label="项目名称"
                    rules={[{ required: true, message: "请输入项目名称" }]}
                    initialValue="my-app-vue"
                  >
                    <Input placeholder="例如 my-app" />
                  </Form.Item>

                  <Form.Item
                    name="template"
                    label="模板选择"
                    rules={[{ required: true, message: "请选择模板" }]}
                    initialValue="template-vue-arco-vite"
                  >
                    <Select options={templateOptions} placeholder="请选择" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      构建
                    </Button>
                  </Form.Item>
                </Form>
                <Steps
                  direction="vertical"
                  size="small"
                  current={currentStep}
                  items={steps.map((step) => ({
                    title: step.title,
                    description: step.description,
                  }))}
                />
                <Divider orientation="left" />
              </div>
            </div>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default CliTab;
