import { useCallback, useEffect, useState } from "react";
import api from "./services/api";
import socket from "./services/socket";

import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const connectSocket = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await api.get("/auth/me");
        if (active) {
          setUser(response.data.user);
          connectSocket();
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [connectSocket]);

  function handleLogin(userData) {
    setUser(userData);
    connectSocket();
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
      socket.disconnect();
      setUser(null);
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setChannels([]);
      setSelectedChannel(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (loading) {
    return <div className="center">Loading your workspace…</div>;
  }

  if (!user) {
    return showRegister ? (
      <Register
        onRegister={() => setShowRegister(false)}
        onLoginClick={() => setShowRegister(false)}
      />
    ) : (
      <Login
        onLogin={handleLogin}
        onRegisterClick={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        user={user}
        workspaces={workspaces}
        setWorkspaces={setWorkspaces}
        selectedWorkspace={selectedWorkspace}
        setSelectedWorkspace={setSelectedWorkspace}
        channels={channels}
        setChannels={setChannels}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        onLogout={handleLogout}
      />
      <Chat
        key={selectedChannel?.id || "no-channel"}
        user={user}
        workspace={selectedWorkspace}
        channel={selectedChannel}
      />
    </div>
  );
}

export default App;
