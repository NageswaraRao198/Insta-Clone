import React, { useEffect, useState, useContext, useCallback } from "react";
import "../css/Home.css";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { postAPI, commentAPI, storyAPI } from "../api";
import { AppContext } from "../context/AppContext";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";

export default function Home() {
  const { user } = useContext(AppContext);
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);

  const fetchPosts = useCallback(async (nextCursor = null) => {
    try {
      const data = await postAPI.getFeed(nextCursor);
      if (nextCursor) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      const data = await storyAPI.getAll();
      setStories(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, [fetchPosts, fetchStories]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading
      ) {
        fetchPosts(cursor);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [cursor, hasMore, loading, fetchPosts]);

  const handleLike = async (postId) => {
    try {
      const updatedPost = await postAPI.like(postId);
      setPosts(posts.map(p => p._id === postId ? updatedPost : p));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnlike = async (postId) => {
    try {
      const updatedPost = await postAPI.unlike(postId);
      setPosts(posts.map(p => p._id === postId ? updatedPost : p));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      await commentAPI.create({ postId, text });
      // Refresh posts to get updated comment count
      const updatedPost = await postAPI.getPost(postId);
      setPosts(posts.map(p => p._id === postId ? updatedPost : p));
      toast.success("Comment added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async (postId) => {
    try {
      await postAPI.save(postId);
      setPosts(posts.map(p =>
        p._id === postId
          ? { ...p, savedBy: [...(p.savedBy || []), user._id] }
          : p
      ));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnsave = async (postId) => {
    try {
      await postAPI.unsave(postId);
      setPosts(posts.map(p =>
        p._id === postId
          ? { ...p, savedBy: (p.savedBy || []).filter(id => id !== user._id) }
          : p
      ));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home">
      <StoryBar stories={stories} onStoryCreated={fetchStories} />

      <div className="posts-container">
        {posts.length === 0 ? (
          <div className="no-posts">
            <h3>No posts yet</h3>
            <p>Follow people to see their posts in your feed</p>
            <Link to="/explore" className="btn-primary">Explore</Link>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUser={user}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onComment={handleComment}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          ))
        )}

        {hasMore && <div className="loading">Loading more...</div>}
      </div>
    </div>
  );
}
