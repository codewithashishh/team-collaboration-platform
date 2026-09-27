import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import Message from "./Message";

function DirectMessageChat({ user, conversation }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const conversationId = conversation.id;
  const otherMember = conversation.members?.find(
    (member) => member.userId !== user.id,
  );
  const otherUser = otherMember?.user;
  const conversationName = otherUser?.name || otherUser?.username || "Direct message";

  useEffect(() => {
    let active = true;

    function handleMessageCreated(message) {
      if (message.conversationId !== conversationId) return;
      setMessages((current) => mergeMessages(current, [message]));
    }

    function handleMessageUpdated(message) {
      if (message.conversationId !== conversationId) return;
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? message : item)),
      );
    }

    function handleMessageDeleted(data) {
      if (data.conversationId !== conversationId) return;
      setMessages((current) => current.filter((item) => item.id !== data.messageId));
    }

    socket.on("directMessageCreated", handleMessageCreated);
    socket.on("directMessageUpdated", handleMessageUpdated);
    socket.on("directMessageDeleted", handleMessageDeleted);

    if (!socket.connected) socket.connect();
    socket.emit("joinConversation", { conversationId }, (response) => {
      if (active && !response?.success) {
        setError(response?.message || "Could not join this conversation.");
      }
    });

    api.get(`/conversations/${conversationId}/messages`)
      .then((response) => {
        if (active) {
          setMessages((current) =>
            mergeMessages(current, response.data.messages || []),
          );
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
      if (socket.connected) socket.emit("leaveConversation", { conversationId });
      socket.off("directMessageCreated", handleMessageCreated);
      socket.off("directMessageUpdated", handleMessageUpdated);
      socket.off("directMessageDeleted", handleMessageDeleted);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationId]);

  function sendMessage(event) {
    event.preventDefault();
    const content = text.trim();
    if (!content || busy) return;

    setBusy(true);
    setError("");
    socket.emit("sendDirectMessage", { conversationId, content }, (response) => {
      setBusy(false);
      if (!response?.success) {
        setError(response?.message || "Message could not be sent.");
        return;
      }
      if (response.message) {
        setMessages((current) => mergeMessages(current, [response.message]));
      }
      setText("");
    });
  }

  function editMessage(message, content) {
    return new Promise((resolve) => {
      socket.emit("editDirectMessage", { messageId: message.id, content }, (response) => {
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
      socket.emit("deleteDirectMessage", { messageId }, (response) => {
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

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div className="chat-title">
          <span className="header-hash">@</span>
          <div>
            <h1>{conversationName}</h1>
            <span>Private conversation</span>
          </div>
        </div>
        <div className="channel-status">
          <span className="status-dot" />
          Direct message
        </div>
      </header>

      <section className="messages" aria-label={`Direct messages with ${conversationName}`}>
        {loading && <p className="conversation-state">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <div className="conversation-state empty-conversation">
            <span className="empty-hash">@</span>
            <h2>Start a private conversation</h2>
            <p>Only you and {conversationName} can see these messages.</p>
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
          onChange={(event) => setText(event.target.value)}
          placeholder={`Message ${conversationName}`}
          aria-label={`Message ${conversationName}`}
          maxLength={5000}
          rows={1}
          disabled={busy}
        />
        <div className="composer-footer">
          <span>Private · {text.length}/5000</span>
          <button
            className="send-button"
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send direct message"
          >
            {busy ? "Sending…" : "Send"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </main>
  );
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

export default DirectMessageChat;
