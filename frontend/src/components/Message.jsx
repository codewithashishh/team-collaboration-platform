import { useState } from "react";

function Message({ message, currentUser, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(message.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOwner = message.userId === currentUser.id;
  const edited = new Date(message.updatedAt).getTime() >
    new Date(message.createdAt).getTime() + 1000;

  async function saveEdit(event) {
    event.preventDefault();
    const nextContent = content.trim();
    if (!nextContent || nextContent === message.content) {
      setEditing(false);
      setContent(message.content);
      return;
    }

    setBusy(true);
    setError("");
    const saved = await onEdit(message, nextContent);
    if (saved) {
      setEditing(false);
    } else {
      setError("Could not save this message.");
    }
    setBusy(false);
  }

  async function deleteMessage() {
    if (!window.confirm("Delete this message?")) return;
    setBusy(true);
    setError("");
    const deleted = await onDelete(message.id);
    if (!deleted) setError("Could not delete this message.");
    setBusy(false);
  }

  return (
    <article className={`message${isOwner ? " own-message" : ""}`}>
      <div className="message-avatar">
        {(message.user?.name || message.user?.username || "U")[0].toUpperCase()}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <strong>{message.user?.name || message.user?.username || "Former member"}</strong>
          {message.user?.username && <span>@{message.user.username}</span>}
          <time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {edited && <span className="edited-label">edited</span>}
        </div>

        {editing ? (
          <form className="edit-message-form" onSubmit={saveEdit}>
            <textarea
              autoFocus
              maxLength={5000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              aria-label="Edit message"
            />
            <div className="edit-message-actions">
              <span>{content.length}/5000</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setContent(message.content);
                  setEditing(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={busy || !content.trim()}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <p className="message-content">{message.content}</p>
        )}

        {isOwner && !editing && (
          <div className="message-actions">
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="text-button danger-button"
              type="button"
              disabled={busy}
              onClick={deleteMessage}
            >
              Delete
            </button>
          </div>
        )}
        {error && <p className="message-error">{error}</p>}
      </div>
    </article>
  );
}

export default Message;
