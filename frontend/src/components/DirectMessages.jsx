import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";

function DirectMessages({ user, selectedConversationId, onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    function updateConversation(message) {
      setConversations((items) => sortConversations(items.map((item) => {
        if (item.id !== message.conversationId) return item;
        const messages = mergePreview(item.messages || [], message);
        return {
          ...item,
          messages,
          updatedAt: message.updatedAt || message.createdAt || item.updatedAt,
        };
      })));
    }

    function removeMessagePreview(data) {
      setConversations((items) => items.map((item) => {
        if (item.id !== data.conversationId) return item;
        return {
          ...item,
          messages: (item.messages || []).filter(
            (message) => message.id !== data.messageId,
          ),
        };
      }));
    }

    socket.on("directMessageCreated", updateConversation);
    socket.on("directMessageUpdated", updateConversation);
    socket.on("directMessageDeleted", removeMessagePreview);

    api.get("/conversations")
      .then((response) => {
        if (active) setConversations(response.data.conversations || []);
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError, "Could not load conversations."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      socket.off("directMessageCreated", updateConversation);
      socket.off("directMessageUpdated", updateConversation);
      socket.off("directMessageDeleted", removeMessagePreview);
    };
  }, [user.id]);

  async function openConversation(event) {
    event.preventDefault();
    const value = identifier.trim();
    if (!value || busy) return;

    setBusy(true);
    setError("");
    try {
      const response = await api.post("/conversations", { username: value });
      const conversation = response.data.conversation;
      setConversations((items) =>
        sortConversations(mergeConversation(items, conversation)),
      );
      setIdentifier("");
      onSelect(conversation);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not open conversation."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="nav-section direct-message-section">
      <div className="section-heading">
        <span>Direct messages</span>
      </div>

      <form className="inline-form" onSubmit={openConversation}>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Username or email"
          aria-label="Username or email for a direct message"
          autoComplete="off"
          required
        />
        <button className="secondary-button" type="submit" disabled={busy}>
          {busy ? "…" : "Open"}
        </button>
      </form>

      <div className="channel-list">
        {conversations.map((conversation) => {
          const otherMember = conversation.members?.find(
            (member) => member.userId !== user.id,
          );
          const otherUser = otherMember?.user;
          const preview = conversation.messages?.[0]?.content;

          return (
            <div
              className={`channel-row${selectedConversationId === conversation.id ? " active" : ""}`}
              key={conversation.id}
            >
              <button
                className="channel-link"
                type="button"
                onClick={() => onSelect(conversation)}
              >
                <span className="channel-hash">@</span>
                <span>
                  {otherUser?.name || otherUser?.username || "Conversation"}
                  {preview && <small className="dm-preview">{preview}</small>}
                </span>
              </button>
            </div>
          );
        })}
        {loading && <p className="muted-copy">Loading conversations…</p>}
        {!loading && conversations.length === 0 && (
          <p className="muted-copy">No direct messages yet.</p>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

function mergeConversation(items, conversation) {
  return [
    conversation,
    ...items.filter((item) => item.id !== conversation.id),
  ];
}

function mergePreview(messages, message) {
  return [
    message,
    ...messages.filter((item) => item.id !== message.id),
  ].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  ).slice(0, 1);
}

function sortConversations(items) {
  return [...items].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default DirectMessages;
