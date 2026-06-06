import React, { useEffect, useState, useContext, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { postAPI, commentAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Home.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AppContext);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentCursor, setCommentCursor] = useState(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchPost = useCallback(async () => {
    try {
      const data = await postAPI.getPost(postId);
      setPost(data);
    } catch (err) {
      toast.error("Failed to load post");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [postId, navigate]);

  const fetchComments = useCallback(async (cursor = null) => {
    try {
      const data = await commentAPI.getComments(postId, cursor);
      if (cursor) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      setCommentCursor(data.nextCursor);
      setHasMoreComments(data.hasMore);
    } catch (err) {
      toast.error("Failed to load comments");
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    try {
      const updated = await postAPI.like(postId);
      setPost(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnlike = async () => {
    try {
      const updated = await postAPI.unlike(postId);
      setPost(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const newComment = await commentAPI.create({ postId, text: commentText.trim() });
      setComments(prev => [newComment, ...prev]);
      setCommentText("");
      setPost(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentAPI.delete(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setPost(prev => ({ ...prev, commentsCount: prev.commentsCount - 1 }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await postAPI.deletePost(postId);
      toast.success("Post deleted");
      navigate("/profile");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    try {
      await postAPI.save(postId);
      setPost(prev => ({ ...prev, savedBy: [...(prev.savedBy || []), user._id] }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnsave = async () => {
    try {
      await postAPI.unsave(postId);
      setPost(prev => ({ ...prev, savedBy: (prev.savedBy || []).filter(id => id !== user._id) }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!post) return <div className="loading">Post not found</div>;

  const isLiked = post.likes.includes(user?._id);
  const isSaved = post.savedBy?.includes(user?._id);
  const isOwner = post.userId._id === user?._id;

  return (
    <div className="post-detail-page">
      <div className="post-detail-container">
        {/* Image section */}
        <div className="post-detail-image">
          <img src={post.images[currentImageIndex]?.url} alt="" />
          {post.images.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button className="carousel-btn carousel-prev" onClick={() => setCurrentImageIndex(i => i - 1)}>‹</button>
              )}
              {currentImageIndex < post.images.length - 1 && (
                <button className="carousel-btn carousel-next" onClick={() => setCurrentImageIndex(i => i + 1)}>›</button>
              )}
              <div className="carousel-dots">
                {post.images.map((_, i) => (
                  <span key={i} className={`dot ${i === currentImageIndex ? 'active' : ''}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="post-detail-info">
          {/* Header */}
          <div className="post-detail-header">
            <Link to={`/profile/${post.userId._id}`} className="post-user-info">
              <img src={post.userId.profilePic || DEFAULT_PIC} alt="" className="post-avatar" />
              <span className="post-username">{post.userId.username}</span>
            </Link>
            {isOwner && (
              <button className="delete-btn" onClick={handleDeletePost}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>

          {/* Caption */}
          {post.caption && (
            <div className="post-detail-caption">
              <Link to={`/profile/${post.userId._id}`}>
                <strong>{post.userId.username}</strong>
              </Link>{" "}
              {post.caption}
            </div>
          )}

          {/* Comments */}
          <div className="post-detail-comments">
            {comments.map(comment => (
              <div key={comment._id} className="comment-item">
                <Link to={`/profile/${comment.userId._id}`}>
                  <img src={comment.userId.profilePic || DEFAULT_PIC} alt="" className="comment-avatar" />
                </Link>
                <div className="comment-body">
                  <p>
                    <Link to={`/profile/${comment.userId._id}`}>
                      <strong>{comment.userId.username}</strong>
                    </Link>{" "}
                    {comment.text}
                  </p>
                  <span className="comment-time">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {(comment.userId._id === user?._id || isOwner) && (
                  <button className="comment-delete" onClick={() => handleDeleteComment(comment._id)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            ))}
            {hasMoreComments && (
              <button className="load-more-btn" onClick={() => fetchComments(commentCursor)}>
                Load more comments
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="post-actions">
            <div className="post-actions-left">
              <span
                className={`material-symbols-outlined ${isLiked ? 'liked' : ''}`}
                onClick={isLiked ? handleUnlike : handleLike}
              >
                favorite
              </span>
            </div>
            <span
              className={`material-symbols-outlined ${isSaved ? 'saved' : ''}`}
              onClick={isSaved ? handleUnsave : handleSave}
            >
              bookmark
            </span>
          </div>

          <div className="post-likes">
            <strong>{post.likes.length}</strong> {post.likes.length === 1 ? 'like' : 'likes'}
          </div>

          {/* Comment form */}
          <form className="comment-form" onSubmit={handleComment}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            {commentText.trim() && (
              <button type="submit" className="post-comment-btn">Post</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
