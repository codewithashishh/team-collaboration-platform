import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import DirectMessages from "./DirectMessages";

function Sidebar({
  user,
  workspaces,
  setWorkspaces,
  selectedWorkspace,
  setSelectedWorkspace,
  channels,
  setChannels,
  selectedChannel,
  setSelectedChannel,
  selectedConversation,
  onSelectConversation,
  onLogout,
}) {
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectionRequest = useRef(0);

  const clearFeedback = useCallback(() => {
    setError("");
    setNotice("");
  }, []);

  const selectWorkspace = useCallback(async (workspace) => {
    const requestId = ++selectionRequest.current;
    clearFeedback();
    setSelectedWorkspace(workspace);
    setSelectedChannel(null);
    onSelectConversation(null);
    setChannels([]);

    try {
      const [workspaceResponse, channelResponse] = await Promise.all([
        api.get(`/workspaces/${workspace.id}`),
        api.get(`/workspaces/${workspace.id}/channels`),
      ]);

      if (requestId !== selectionRequest.current) return;

      const selected = {
        ...workspaceResponse.data.workspace,
        role: workspaceResponse.data.role,
      };
      setSelectedWorkspace(selected);
      setChannels(channelResponse.data.channels || []);
    } catch (requestError) {
      if (requestId === selectionRequest.current) {
        setError(getErrorMessage(requestError, "Could not open this workspace"));
      }
    }
  }, [
    clearFeedback,
    onSelectConversation,
    setChannels,
    setSelectedChannel,
    setSelectedWorkspace,
  ]);

  useEffect(() => {
    let active = true;

    async function loadWorkspaces() {
      try {
        const response = await api.get("/workspaces");
        if (!active) return;

        const items = response.data.workspaces || [];
        setWorkspaces(items);
        if (items.length > 0) {
          await selectWorkspace(items[0]);
        }
      } catch (requestError) {
        if (active) {
          setError(getErrorMessage(requestError, "Could not load workspaces"));
        }
      }
    }

    loadWorkspaces();

    return () => {
      active = false;
      selectionRequest.current += 1;
    };
  }, [selectWorkspace, setWorkspaces]);

  async function createWorkspace(event) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;

    setBusy(true);
    clearFeedback();
    try {
      const response = await api.post("/workspaces", { name });
      const workspace = {
        ...response.data.workspace,
        role: response.data.role,
      };
      setWorkspaces((items) => [...items, workspace]);
      setWorkspaceName("");
      setShowWorkspaceForm(false);
      await selectWorkspace(workspace);
      setNotice("Workspace created.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not create workspace"));
    } finally {
      setBusy(false);
    }
  }

  async function createChannel(event) {
    event.preventDefault();
    if (!selectedWorkspace || !channelName.trim()) return;

    setBusy(true);
    clearFeedback();
    try {
      const response = await api.post(
        `/workspaces/${selectedWorkspace.id}/channels`,
        { name: channelName.trim() },
      );
      const channel = response.data.channel;
      setChannels((items) => [...items, channel]);
      setSelectedChannel(channel);
      onSelectConversation(null);
      setChannelName("");
      setShowChannelForm(false);
      setNotice("Channel created.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not create channel"));
    } finally {
      setBusy(false);
    }
  }

  async function selectChannel(channel) {
    clearFeedback();
    try {
      const response = await api.get(`/channels/${channel.id}`);
      setSelectedChannel(response.data.channel);
      onSelectConversation(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not open this channel"));
    }
  }

  async function deleteChannel(channel) {
    if (!window.confirm(`Delete #${channel.name} and its messages?`)) return;

    setBusy(true);
    clearFeedback();
    try {
      await api.delete(`/channels/${channel.id}`);
      setChannels((items) => items.filter((item) => item.id !== channel.id));
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(null);
      }
      setNotice("Channel deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete channel"));
    } finally {
      setBusy(false);
    }
  }

  async function renameWorkspace() {
    const name = window.prompt("Rename workspace", selectedWorkspace?.name || "");
    if (!selectedWorkspace || !name?.trim()) return;

    setBusy(true);
    clearFeedback();
    try {
      const response = await api.patch(`/workspaces/${selectedWorkspace.id}`, {
        name: name.trim(),
      });
      const workspace = {
        ...response.data.workspace,
        role: selectedWorkspace.role,
      };
      setSelectedWorkspace(workspace);
      setWorkspaces((items) =>
        items.map((item) => (item.id === workspace.id ? workspace : item)),
      );
      setNotice("Workspace renamed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not rename workspace"));
    } finally {
      setBusy(false);
    }
  }

  async function renameChannel(channel) {
    const name = window.prompt("Rename channel", channel.name);
    if (!name?.trim()) return;

    setBusy(true);
    clearFeedback();
    try {
      const response = await api.patch(`/channels/${channel.id}`, {
        name: name.trim(),
      });
      const renamedChannel = response.data.channel;
      setChannels((items) =>
        items.map((item) => (item.id === channel.id ? renamedChannel : item)),
      );
      if (selectedChannel?.id === channel.id) {
        setSelectedChannel(renamedChannel);
      }
      setNotice("Channel renamed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not rename channel"));
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedWorkspace || !memberEmail.trim()) return;

    setBusy(true);
    clearFeedback();
    try {
      await api.post(`/workspaces/${selectedWorkspace.id}/members`, {
        email: memberEmail.trim(),
      });
      setMemberEmail("");
      setNotice("Member added. They can now join this workspace's channels.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not add member"));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(event) {
    event.preventDefault();
    const id = Number(memberId);
    if (!selectedWorkspace || !Number.isInteger(id) || id < 1) {
      setError("Enter a valid member user ID.");
      return;
    }

    setBusy(true);
    clearFeedback();
    try {
      await api.delete(`/workspaces/${selectedWorkspace.id}/members/${id}`);
      setMemberId("");
      setNotice("Member removed from the workspace.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not remove member"));
    } finally {
      setBusy(false);
    }
  }

  const isOwner = selectedWorkspace?.role === "OWNER";

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <a className="brand" href="/" aria-label="Teamspace home">
          <span className="brand-mark">t</span>
          <span>teamspace</span>
        </a>
        <button
          className="icon-button mobile-logout"
          type="button"
          onClick={onLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          ↗
        </button>
      </div>

      <div className="account-card">
        <div className="avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
        <div className="account-copy">
          <strong>{user?.name}</strong>
          <span>@{user?.username}</span>
        </div>
        <button className="text-button signout-button" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>

      <section className="nav-section workspace-section">
        <div className="section-heading">
          <span>Your workspaces</span>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              clearFeedback();
              setShowWorkspaceForm((visible) => !visible);
            }}
            title="Create workspace"
            aria-label="Create workspace"
          >
            +
          </button>
        </div>

        {showWorkspaceForm && (
          <form className="inline-form" onSubmit={createWorkspace}>
            <input
              autoFocus
              maxLength={80}
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              aria-label="Workspace name"
              required
            />
            <button className="primary-button" type="submit" disabled={busy}>
              Create
            </button>
          </form>
        )}

        <div className="workspace-list">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              className={`workspace-item${selectedWorkspace?.id === workspace.id ? " active" : ""}`}
              type="button"
              onClick={() => selectWorkspace(workspace)}
            >
              <span className="workspace-avatar">{workspace.name?.[0]?.toUpperCase() || "W"}</span>
              <span className="workspace-item-name">{workspace.name}</span>
              <span className="role-label">{workspace.role === "OWNER" ? "Owner" : ""}</span>
            </button>
          ))}
          {workspaces.length === 0 && (
            <p className="muted-copy">No workspaces yet. Create one to get started.</p>
          )}
        </div>
      </section>

      <div className="nav-divider" />

      {selectedWorkspace ? (
        <section className="nav-section channel-section">
          <div className="selected-workspace-heading">
            <div>
              <span className="eyebrow">Workspace</span>
              <h2>{selectedWorkspace.name}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              title="Workspace options"
              aria-label="Workspace options"
              onClick={() => setShowWorkspaceSettings((visible) => !visible)}
            >
              ⋯
            </button>
          </div>

          {showWorkspaceSettings && (
            <div className="workspace-settings">
              {isOwner ? (
                <>
                  <button
                    className="text-button"
                    type="button"
                    disabled={busy}
                    onClick={renameWorkspace}
                  >
                    Rename workspace
                  </button>
                  <h3>Manage members</h3>
                  <form className="inline-form" onSubmit={addMember}>
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      placeholder="Member email"
                      aria-label="Member email"
                      required
                    />
                    <button className="secondary-button" type="submit" disabled={busy}>
                      Add
                    </button>
                  </form>
                  <form className="inline-form" onSubmit={removeMember}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={memberId}
                      onChange={(event) => setMemberId(event.target.value)}
                      placeholder="Member user ID"
                      aria-label="Member user ID"
                      required
                    />
                    <button className="secondary-button" type="submit" disabled={busy}>
                      Remove
                    </button>
                  </form>
                  <p className="fine-print">
                    Add people by email. To remove someone, enter their user ID.
                  </p>
                </>
              ) : (
                <p className="fine-print">Only workspace owners can manage members.</p>
              )}
            </div>
          )}

          <div className="section-heading channel-heading">
            <span>Channels</span>
            {isOwner && (
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  clearFeedback();
                  setShowChannelForm((visible) => !visible);
                }}
                title="Create channel"
                aria-label="Create channel"
              >
                +
              </button>
            )}
          </div>

          {showChannelForm && isOwner && (
            <form className="inline-form" onSubmit={createChannel}>
              <input
                autoFocus
                maxLength={80}
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                placeholder="Channel name"
                aria-label="Channel name"
                required
              />
              <button className="primary-button" type="submit" disabled={busy}>
                Create
              </button>
            </form>
          )}

          <div className="channel-list">
            {channels.map((channel) => (
              <div
                className={`channel-row${selectedChannel?.id === channel.id ? " active" : ""}`}
                key={channel.id}
              >
                <button
                  className="channel-link"
                  type="button"
                  onClick={() => selectChannel(channel)}
                >
                  <span className="channel-hash">#</span>
                  <span>{channel.name}</span>
                </button>
                {isOwner && (
                  <button
                    className="text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => renameChannel(channel)}
                  >
                    Rename
                  </button>
                )}
                {isOwner && (
                  <button
                    className="channel-delete"
                    type="button"
                    title={`Delete #${channel.name}`}
                    aria-label={`Delete #${channel.name}`}
                    disabled={busy}
                    onClick={() => deleteChannel(channel)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {channels.length === 0 && (
              <p className="muted-copy">
                No channels yet{isOwner ? ". Create one to start chatting." : "."}
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="sidebar-empty">
          <p>Select a workspace to see its channels.</p>
        </div>
      )}

      <div className="nav-divider" />

      <DirectMessages
        user={user}
        selectedConversationId={selectedConversation?.id}
        onSelect={onSelectConversation}
      />

      <div className="sidebar-feedback" aria-live="polite">
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
      </div>
    </aside>
  );
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default Sidebar;
