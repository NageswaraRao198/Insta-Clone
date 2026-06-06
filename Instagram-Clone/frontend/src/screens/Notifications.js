import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { notificationAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Home.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function Notifications() {
  const navigate = useNavigate();
  const { setUnreadCount } = useContext(AppContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async (nextCursor = null) => {
    try {
      const data = await notificationAPI.getAll(nextCursor);
      if (nextCursor) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await notificationAPI.markRead();
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case "like": return "liked your post";
      case "comment": return "commented on your post";
      case "follow": return "started following you";
      case "reply": return "replied to your comment";
      default: return "";
    }
  };

  const handleClick = (notification) => {
    if (notification.type === "follow") {
      navigate(`/profile/${notification.senderId._id}`);
    } else if (notification.postId) {
      navigate(`/`);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <p className="no-notifications">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`notification-item ${!n.isRead ? 'unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <img
                src={n.senderId?.profilePic || DEFAULT_PIC}
                alt=""
                className="notification-avatar"
              />
              <div className="notification-content">
                <p>
                  <strong>{n.senderId?.username}</strong>{" "}
                  {getNotificationText(n)}
                </p>
                <span className="notification-time">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              {n.postId?.images?.[0] && (
                <img
                  src={n.postId.images[0].url}
                  alt=""
                  className="notification-post-thumb"
                />
              )}
            </div>
          ))
        )}
      </div>
      {hasMore && (
        <button className="btn-secondary" onClick={() => fetchNotifications(cursor)}>
          Load More
        </button>
      )}
    </div>
  );
}
