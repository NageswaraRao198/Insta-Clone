import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { postAPI } from "../api";
import "../css/Home.css";

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (nextCursor = null) => {
    try {
      const data = await postAPI.getExplore(nextCursor);
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="explore-page">
      <h2>Explore</h2>
      <div className="explore-grid">
        {posts.map((post) => (
          <Link key={post._id} to={`/post/${post._id}`} className="explore-item">
            <img src={post.images[0]?.url} alt="" />
            <div className="explore-overlay">
              <span>❤️ {post.likes.length}</span>
              <span>💬 {post.commentsCount}</span>
            </div>
          </Link>
        ))}
      </div>
      {posts.length === 0 && (
        <div className="no-posts">
          <p>No posts to explore yet</p>
        </div>
      )}
      {hasMore && <div className="loading">Loading more...</div>}
    </div>
  );
}
