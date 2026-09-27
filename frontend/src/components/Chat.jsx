import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import Message from "./Message";

function Chat({ user, workspace, channel }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(Boolean(channel));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const channelId = channel?.id;

  useEffect(() => {
    if (!channelId) return undefined;

    let active = true;

    function handleMessageCreated(message) {
      if (message.channelId !== channelId) return;
      setMessages((current) => mergeMessage(current, message));
    }

    function handleMessageUpdated(message) {
      if (message.channelId !== channelId) return;
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? message : item)),
      );
    }

    function handleMessageDeleted(data) {
      if (data.channelId !== channelId) return;
      setMessages((current) => current.filter((item) => item.id !== data.messageId));
    }

    function handleUserTyping(data) {
      if (data.channelId !== channelId || data.userId === user.id) return;
      setTypingUsers((current) =>
        current.includes(data.username) ? current : [...current, data.username],
      );
    }

    function handleUserStoppedTyping(data) {
      if (data.channelId !== channelId) return;
      setTypingUsers((current) => current.filter((name) => name !== data.username));
    }

    socket.on("messageCreated", handleMessageCreated);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    if (!socket.connected) socket.connect();
    socket.emit("joinChannel", { channelId }, (response) => {
      if (active && !response?.success) {
        setError(response?.message || "Could not join this channel.");
      }
    });

    api.get(`/channels/${channelId}/messages`)
      .then((response) => {
        if (active) {
          setMessages((current) => mergeMessages(current, response.data.messages || []));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError, "Could not load messages."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(typingTimer.current);
      if (isTyping.current && socket.connected) {
        socket.emit("stopTyping", { channelId });
      }
      isTyping.current = false;
      if (socket.connected) socket.emit("leaveChannel", { channelId });
      socket.off("messageCreated", handleMessageCreated);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [channelId, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channel?.id]);

  function updateText(value) {
    setText(value);
    if (!channel || !socket.connected) return;

    if (!isTyping.current) {
      socket.emit("typing", { channelId: channel.id });
      isTyping.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (socket.connected) socket.emit("stopTyping", { channelId: channel.id });
      isTyping.current = false;
    }, 1200);
  }

  function stopTyping() {
    clearTimeout(typingTimer.current);
    if (isTyping.current && channel && socket.connected) {
      socket.emit("stopTyping", { channelId: channel.id });
    }
    isTyping.current = false;
  }

  function sendMessage(event) {
    event.preventDefault();
    const content = text.trim();
    if (!content || !channel || busy) return;

    setBusy(true);
    setError("");
    stopTyping();
    socket.emit("sendMessage", { channelId: channel.id, content }, (response) => {
      setBusy(false);
      if (!response?.success) {
        setError(response?.message || "Message could not be sent.");
        return;
      }
      if (response.message) {
        setMessages((current) => mergeMessage(current, response.message));
      }
      setText("");
    });
  }

  function editMessage(message, content) {
    return new Promise((resolve) => {
      socket.emit("editMessage", { messageId: message.id, content }, (response) => {
        if (!response?.success) {
          setError(response?.message || "Message could not be updated.");
          resolve(false);
          return;
        }
        if (response.message) {
          setMessages((current) =>
            current.map((item) => (item.id === message.id ? response.message : item)),
          );
        }
        resolve(true);
      });
    });
  }

  function deleteMessage(messageId) {
    return new Promise((resolve) => {
      socket.emit("deleteMessage", { messageId }, (response) => {
        if (!response?.success) {
          setError(response?.message || "Message could not be deleted.");
          resolve(false);
          return;
        }
        setMessages((current) => current.filter((item) => item.id !== messageId));
        resolve(true);
      });
    });
  }

  if (!channel) {
    return (
      <main className="chat-main">
        <div className="welcome-state">
          <div className="welcome-mark">t</div>
          <p className="eyebrow">A calmer place to work together</p>
          <h1>Make room for good work.</h1>
          <p>Select a channel or create a workspace to start a conversation.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div className="chat-title">
          <span className="header-hash">#</span>
          <div>
            <h1>{channel.name}</h1>
            <span>{workspace?.name || "Workspace"}</span>
          </div>
        </div>
        <div className="channel-status">
          <span className="status-dot" />
          Channel
        </div>
      </header>

      <section className="messages" aria-label={`Messages in ${channel.name}`}>
        {loading && <p className="conversation-state">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <div className="conversation-state empty-conversation">
            <span className="empty-hash">#</span>
            <h2>It’s quiet in here</h2>
            <p>Start the conversation in #{channel.name}.</p>
          </div>
        )}
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={user}
            onEdit={editMessage}
            onDelete={deleteMessage}
          />
        ))}
        <div ref={bottomRef} />
      </section>

      <div className="typing-line" aria-live="polite">
        {typingUsers.length > 0 &&
          `${typingUsers.slice(0, 2).join(", ")}${typingUsers.length > 2 ? " and others" : ""} typing…`}
      </div>

      {error && (
        <div className="chat-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <form className="message-composer" onSubmit={sendMessage}>
        <textarea
          value={text}
          onChange={(event) => updateText(event.target.value)}
          onBlur={stopTyping}
          placeholder={`Message #${channel.name}`}
          aria-label={`Message #${channel.name}`}
          maxLength={5000}
          rows={1}
          disabled={busy}
        />
        <div className="composer-footer">
          <span>Visible to workspace members · {text.length}/5000</span>
          <button
            className="send-button"
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send message"
          >
            {busy ? "Sending…" : "Send"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </main>
  );
}

function mergeMessage(messages, incoming) {
  return mergeMessages(messages, [incoming]);
}

function mergeMessages(current, incoming) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default Chat;
