import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { commentAPI } from "../api";
import "../css/Home.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export default function PostCard({ post, currentUser, onLike, onUnlike, onComment, onSave, onUnsave }) {
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    if (showComments && comments.length === 0 && post.commentsCount > 0) {
      commentAPI.getComments(post._id)
        .then(data => setComments(data.comments))
        .catch(() => {});
    }
  }, [showComments, post._id, post.commentsCount, comments.length]);

  const isLiked = post.likes.includes(currentUser?._id);
  const isSaved = post.savedBy?.includes(currentUser?._id);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap detected
      if (!isLiked) {
        onLike(post._id);
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (comment.trim()) {
      onComment(post._id, comment.trim());
      setComment("");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this post', url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      // Brief visual feedback
      const el = document.getElementById(`share-${post._id}`);
      if (el) {
        el.style.transform = 'scale(1.3)';
        setTimeout(() => { el.style.transform = ''; }, 200);
      }
    }
  };

  const nextImage = () => {
    if (currentImageIndex < post.images.length - 1) {
      setImageLoaded(false);
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setImageLoaded(false);
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  return (
    <div className="post-card">
      {/* Header */}
      <div className="post-header">
        <Link to={`/profile/${post.userId._id}`} className="post-user-info">
          <img
            src={post.userId.profilePic || DEFAULT_PIC}
            alt=""
            className="post-avatar"
          />
          <div className="post-header-text">
            <span className="post-username">{post.userId.username}</span>
            <span className="post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        <Link to={`/post/${post._id}`} className="post-more-btn">
          <span className="material-symbols-outlined">more_horiz</span>
        </Link>
      </div>

      {/* Image Carousel */}
      <div className="post-image-container" onClick={handleDoubleTap}>
        {!imageLoaded && <div className="image-skeleton" />}
        <img
          src={post.images[currentImageIndex]?.url}
          alt=""
          className={`post-image ${imageLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setImageLoaded(true)}
        />
        {/* Double-tap heart animation */}
        {showHeart && (
          <div className="heart-animation">
            <span className="material-symbols-outlined">favorite</span>
          </div>
        )}
        {post.images.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button className="carousel-btn carousel-prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>‹</button>
            )}
            {currentImageIndex < post.images.length - 1 && (
              <button className="carousel-btn carousel-next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>›</button>
            )}
            <div className="carousel-dots">
              {post.images.map((_, i) => (
                <span key={i} className={`dot ${i === currentImageIndex ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="post-actions">
        <div className="post-actions-left">
          <span
            className={`material-symbols-outlined action-icon ${isLiked ? 'liked' : ''}`}
            onClick={() => isLiked ? onUnlike(post._id) : onLike(post._id)}
          >
            favorite
          </span>
          <span
            className="material-symbols-outlined action-icon"
            onClick={() => setShowComments(!showComments)}
          >
            chat_bubble
          </span>
          <span
            id={`share-${post._id}`}
            className="material-symbols-outlined action-icon"
            onClick={handleShare}
          >
            send
          </span>
        </div>
        <span
          className={`material-symbols-outlined action-icon ${isSaved ? 'saved' : ''}`}
          onClick={() => isSaved ? onUnsave(post._id) : onSave(post._id)}
        >
          bookmark
        </span>
      </div>

      {/* Likes */}
      <div className="post-likes">
        <strong>{post.likes.length}</strong> {post.likes.length === 1 ? 'like' : 'likes'}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="post-caption">
          <Link to={`/profile/${post.userId._id}`}>
            <strong>{post.userId.username}</strong>
          </Link>{" "}
          {post.caption}
        </div>
      )}

      {/* Comments count */}
      {post.commentsCount > 0 && (
        <p className="view-comments" onClick={() => setShowComments(!showComments)}>
          {showComments ? "Hide comments" : `View all ${post.commentsCount} comments`}
        </p>
      )}

      {/* Inline comments */}
      {showComments && comments.length > 0 && (
        <div className="post-comments-list">
          {comments.map(c => (
            <div key={c._id} className="post-comment-item">
              <Link to={`/profile/${c.userId._id}`}>
                <strong>{c.userId.username}</strong>
              </Link>{" "}
              {c.text}
            </div>
          ))}
          <Link to={`/post/${post._id}`} className="view-all-link">
            View full post
          </Link>
        </div>
      )}

      {/* Comment input */}
      <form className="comment-form" onSubmit={handleCommentSubmit}>
        <input
          type="text"
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {comment.trim() && (
          <button type="submit" className="post-comment-btn">Post</button>
        )}
      </form>
    </div>
  );
}
