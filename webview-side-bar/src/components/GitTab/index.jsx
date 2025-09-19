import React, { useEffect, useState, useRef } from "react";
import {
  Input,
  Button,
  Select,
  message,
  Progress,
  Alert,
  Avatar,
  List,
  Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";

import Login from "./Login";
import { useGit } from "@/hooks/useGit";
import WorkspaceApi from "@/api/workspaceApi";
import { useUser } from "@/hooks/useUser";
import { useSession } from "@/hooks/useSession";
const { TextArea } = Input;
const { Paragraph, Text } = Typography;
const GitTab = () => {
  const { getUser, updateLoginStatus } = useUser();

  //login
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState("");
  //git工具
  const [remotes, setRemotes] = useState([]);
  const [sstList, setSstList] = useState([]);
  const [selectedSst, setSelectedSst] = useState(null);
  const [selectedRemote, setSelectedRemote] = useState(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [pushResult, setPushResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [_projectPath, setProjectPath] = useState(null);
  const remotesRef = useRef([]);
  const projectRef = useRef(null);
  const { getRemotesWithPath, commitAndPush, projectChange } = useGit();
  //sst列表数据
  const [svmList, setSvmList] = useState([
    {
      title: "Ant Design Title 1",
    },
    {
      title: "Ant Design Title 2",
    },
  ]);
  const requestGitRemote = async () => {
    const { remotes: newRemotes, cwd } = await getRemotesWithPath();
    const uniqueRemotes = [...new Set(newRemotes)];
    remotesRef.current = uniqueRemotes;
    projectRef.current = cwd;
    message.success("获取远程成功!");
    setProjectPath(cwd);
    setRemotes(uniqueRemotes);
    setSelectedRemote(uniqueRemotes[0]);
  };

  useEffect(() => {
    (async () => {
      await requestGitRemote();
      const unsubscribe = projectChange(async () => {
        const { cwd } = await getRemotesWithPath();
        if (cwd !== projectRef.current) {
          projectRef.current = cwd;
          //获取远程
          requestGitRemote();
        }
      });
      return unsubscribe;
    })();
    //登陆失效检查
    const unsubscribe = updateLoginStatus(() => {
      setShowLogin(true);
    });
    return () => unsubscribe;
  }, []);
  const handleLoginSuccess = async () => {
    try {
      setShowLogin(false);
      const { username } = await getUser();
      setUser(username);
      //登陆成功之后获取查询sst
      getSstList();
    } catch (error) {}
  };
  const getSstList = async () => {
    try {
      const session = await useSession();
      let request = {};
      const { code, data } = await WorkspaceApi.getSstList(request, session);
      if (code === 0) {
        setSstList(data);
      }
    } catch (error) {
      console.log("error :>> ", error);
      setShowLogin(true);
    }
  };
  const handleRefresh = async () => {
    requestGitRemote();
    getSstList();
  };

  //推送
  const onPush = async () => {
    try {
      setPushResult(null);
      setLoading(true);
      setProgress(30);
      if (!selectedSst) {
        throw new Error("请先选择sst");
      }
      const data = { selectedSst, commitMessage, remoteName: selectedRemote };
      const result = await commitAndPush(data);
      const { success, err } = result;
      if (success) {
        setProgress(100);
        message.success("代码推送成功!");
      } else {
        setProgress(0);
        setPushResult(err);
      }
    } catch (error) {
      setProgress(0);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ padding: 0 }}>
      {showLogin ? (
        <Login
          onSuccess={() => {
            handleLoginSuccess();
          }}
        />
      ) : (
        <div>
          <Avatar
            style={{ backgroundColor: "#87d068" }}
            icon={<UserOutlined />}
          />
          <span style={{ marginLeft: 8 }}>Hi, {user}</span>
        </div>
      )}
      <div style={{ marginBottom: 12, textAlign: "right" }}>
        <Button type="primary" onClick={handleRefresh}>
          刷新
        </Button>
      </div>
      <Select
        style={{ width: "100%", marginBottom: 12 }}
        value={selectedSst}
        onChange={(val) => setSelectedSst(val)}
        options={sstList.map(({ sst, app, desc }) => ({
          label: `${sst}-${app}-${desc}`,
          value: sst,
        }))}
        placeholder="选择sst"
      />
      <TextArea
        rows={4}
        placeholder="提交内容"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Select
        style={{ width: "100%", marginBottom: 12 }}
        value={selectedRemote}
        onChange={(val) => setSelectedRemote(val)}
        options={remotes.map((r) => ({ label: r, value: r }))}
        placeholder="提交仓库选择"
      />
      <Button type="primary" block loading={loading} onClick={onPush}>
        Commit & Push
      </Button>
      <Progress
        percent={progress}
        status={loading ? "active" : progress === 100 ? "success" : "normal"}
        style={{ marginTop: 16 }}
      />
      {pushResult ? <Alert message={pushResult} type="error" showIcon /> : ""}
      <List
        size="small"
        header={
          <Text strong style={{ margin: 0 }}>
            当前版本
          </Text>
        }
        itemLayout="horizontal"
        dataSource={svmList}
        renderItem={(item, index) => (
          <List.Item actions={[<a key="list-loadmore-edit">提测</a>]}>
            <List.Item.Meta
              title={<a href="">{item.title}</a>}
              description="Ant Design, a design language for background applications, is refined by Ant UED Team"
            />
          </List.Item>
        )}
      />
      <List
        size="small"
        header={
          <Text strong style={{ margin: 0 }}>
            sst对应版本
          </Text>
        }
        itemLayout="horizontal"
        dataSource={svmList}
        renderItem={(item, index) => (
          <List.Item>
            <List.Item.Meta
              title={<a href="">{item.title}</a>}
              description="Ant Design, a design language for background applications, is refined by Ant UED Team"
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default GitTab;
