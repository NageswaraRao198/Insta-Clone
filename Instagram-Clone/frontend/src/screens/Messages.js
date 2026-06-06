import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { messageAPI, userAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Messages.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function Messages() {
  const { userId } = useParams();
  const { user, socket } = useContext(AppContext);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(userId || null);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatAreaRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch active chat user info & messages
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
      fetchChatUser(activeChat);
      // Mark messages as read
      if (socket) {
        socket.emit("MESSAGE_READ", { senderId: activeChat });
      }
    }
  }, [activeChat, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const senderId = message.senderId?._id || message.senderId;
      const receiverId = message.receiverId?._id || message.receiverId;

      if (senderId === activeChat || receiverId === activeChat) {
        setMessages(prev => [...prev, { ...message, isNew: true }]);
        // Mark as read immediately if chat is active
        if (senderId === activeChat) {
          socket.emit("MESSAGE_READ", { senderId: activeChat });
        }
      }
      fetchConversations();
    };

    const handleTyping = ({ userId: typingUserId }) => {
      if (typingUserId === activeChat) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ userId: typingUserId }) => {
      if (typingUserId === activeChat) {
        setIsTyping(false);
      }
    };

    const handleMessagesRead = ({ readBy }) => {
      if (readBy === activeChat) {
        setMessages(prev => prev.map(msg => {
          const senderId = msg.senderId?._id || msg.senderId;
          if (senderId === user._id) {
            return { ...msg, read: true };
          }
          return msg;
        }));
      }
    };

    const handleOnlineStatus = (data) => {
      setOnlineUsers(new Set(data.onlineUsers));
    };

    const handleUserOnline = ({ userId: onlineId }) => {
      setOnlineUsers(prev => new Set([...prev, onlineId]));
    };

    const handleUserOffline = ({ userId: offlineId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(offlineId);
        return next;
      });
    };

    socket.on("NEW_MESSAGE", handleNewMessage);
    socket.on("USER_TYPING", handleTyping);
    socket.on("USER_STOP_TYPING", handleStopTyping);
    socket.on("MESSAGES_READ", handleMessagesRead);
    socket.on("ONLINE_USERS", handleOnlineStatus);
    socket.on("USER_ONLINE", handleUserOnline);
    socket.on("USER_OFFLINE", handleUserOffline);

    // Request online users list
    socket.emit("GET_ONLINE_USERS");

    return () => {
      socket.off("NEW_MESSAGE", handleNewMessage);
      socket.off("USER_TYPING", handleTyping);
      socket.off("USER_STOP_TYPING", handleStopTyping);
      socket.off("MESSAGES_READ", handleMessagesRead);
      socket.off("ONLINE_USERS", handleOnlineStatus);
      socket.off("USER_ONLINE", handleUserOnline);
      socket.off("USER_OFFLINE", handleUserOffline);
    };
  }, [socket, activeChat, user._id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const fetchConversations = async () => {
    try {
      const data = await messageAPI.getConversations();
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatUserId) => {
    try {
      const data = await messageAPI.getMessages(chatUserId);
      setMessages(data.messages);
    } catch (err) {
      toast.error("Failed to load messages");
    }
  };

  const fetchChatUser = async (chatUserId) => {
    try {
      const data = await userAPI.getUser(chatUserId);
      setActiveChatUser(data.user);
    } catch {
      setActiveChatUser(null);
    }
  };

  // Typing indicator logic
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (socket && activeChat) {
      socket.emit("TYPING", { receiverId: activeChat });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("STOP_TYPING", { receiverId: activeChat });
      }, 2000);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || sendingMessage) return;

    // Stop typing indicator
    if (socket) {
      socket.emit("STOP_TYPING", { receiverId: activeChat });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: { _id: user._id, username: user.username, profilePic: user.profilePic },
      receiverId: { _id: activeChat },
      text: messageText,
      read: false,
      createdAt: new Date().toISOString(),
      sending: true,
      isNew: true
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const message = await messageAPI.send({
        receiverId: activeChat,
        text: messageText
      });
      // Replace optimistic with real message
      setMessages(prev => prev.map(msg =>
        msg._id === tempId ? { ...message, isNew: true } : msg
      ));
      fetchConversations();
    } catch (err) {
      // Mark as failed
      setMessages(prev => prev.map(msg =>
        msg._id === tempId ? { ...msg, sending: false, failed: true } : msg
      ));
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const groupMessagesByDate = useCallback((msgs) => {
    const groups = [];
    let currentDate = null;

    msgs.forEach(msg => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msgDate, id: `date-${msgDate}` });
      }
      groups.push({ type: 'message', data: msg, id: msg._id });
    });

    return groups;
  }, []);

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Find last sent message that is read
  const getLastReadIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const senderId = msg.senderId?._id || msg.senderId;
      if (senderId === user._id && msg.read) {
        return i;
      }
    }
    return -1;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const groupedMessages = groupMessagesByDate(messages);
  const lastReadIdx = getLastReadIndex();

  return (
    <div className={`messages-page ${activeChat ? 'chat-active' : ''}`}>
      {/* Conversations list */}
      <div className="conversations-list">
        <div className="conversations-header">
          <h3>{user.username}</h3>
        </div>
        {conversations.length === 0 ? (
          <div className="no-messages">
            <span className="material-symbols-outlined">forum</span>
            <p>No conversations yet</p>
            <small>Find people to message</small>
          </div>
        ) : (
          <div className="conversations-items">
            {conversations.map((conv) => (
              <div
                key={conv._id?._id}
                className={`conversation-item ${activeChat === conv._id?._id ? 'active' : ''}`}
                onClick={() => setActiveChat(conv._id?._id)}
              >
                <div className="conv-avatar-wrapper">
                  <img src={conv._id?.profilePic || DEFAULT_PIC} alt="" />
                  {onlineUsers.has(conv._id?._id) && <span className="online-dot" />}
                </div>
                <div className="conversation-info">
                  <h4>{conv._id?.username}</h4>
                  <p className={conv.unreadCount > 0 ? 'unread-text' : ''}>
                    {conv.lastMessage?.text?.substring(0, 30) || "Image"}
                    {conv.lastMessage?.text?.length > 30 ? '...' : ''}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="unread-badge">{conv.unreadCount}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="chat-area">
        {!activeChat ? (
          <div className="no-chat-selected">
            <div className="no-chat-icon">
              <span className="material-symbols-outlined">send</span>
            </div>
            <h3>Your Messages</h3>
            <p>Send private messages to friends</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-header-user">
                <button className="back-btn" onClick={() => setActiveChat(null)}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="chat-avatar-wrapper">
                  <img src={activeChatUser?.profilePic || DEFAULT_PIC} alt="" />
                  {onlineUsers.has(activeChat) && <span className="online-dot" />}
                </div>
                <div className="chat-header-info">
                  <h4>{activeChatUser?.username || 'Loading...'}</h4>
                  {onlineUsers.has(activeChat) ? (
                    <span className="online-status">Active now</span>
                  ) : (
                    <span className="offline-status">Offline</span>
                  )}
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="chat-messages" ref={chatAreaRef}>
              {groupedMessages.map((item) => {
                if (item.type === 'date') {
                  return (
                    <div key={item.id} className="message-date-separator">
                      <span>{getDateLabel(item.date)}</span>
                    </div>
                  );
                }

                const msg = item.data;
                const senderId = msg.senderId?._id || msg.senderId;
                const isMine = senderId === user._id;
                const msgIdx = messages.indexOf(msg);

                return (
                  <div
                    key={item.id}
                    className={`message-wrapper ${isMine ? 'sent' : 'received'} ${msg.isNew ? 'animate-in' : ''}`}
                  >
                    {!isMine && (
                      <img
                        src={msg.senderId?.profilePic || DEFAULT_PIC}
                        alt=""
                        className="message-avatar"
                      />
                    )}
                    <div className={`message ${isMine ? 'sent' : 'received'} ${msg.sending ? 'sending' : ''} ${msg.failed ? 'failed' : ''}`}>
                      <p>{msg.text}</p>
                      <div className="message-meta">
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <span className="message-status">
                            {msg.sending && <span className="status-sending">●</span>}
                            {msg.failed && <span className="status-failed">!</span>}
                            {!msg.sending && !msg.failed && msg.read && <span className="status-seen">✓✓</span>}
                            {!msg.sending && !msg.failed && !msg.read && <span className="status-sent">✓</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Show "Seen" label under the last read message */}
                    {isMine && msgIdx === lastReadIdx && (
                      <span className="seen-label">Seen</span>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="message-wrapper received animate-in">
                  <img
                    src={activeChatUser?.profilePic || DEFAULT_PIC}
                    alt=""
                    className="message-avatar"
                  />
                  <div className="message received typing-bubble">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <form className="chat-input" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Message..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className={newMessage.trim() ? 'active' : ''}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
