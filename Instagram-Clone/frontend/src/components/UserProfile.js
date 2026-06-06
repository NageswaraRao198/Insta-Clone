import React, { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { userAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Profile.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function UserProfile() {
  const { userid } = useParams();
  const { user } = useContext(AppContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userid]);

  const fetchUser = async () => {
    try {
      const data = await userAPI.getUser(userid);
      setProfile(data.user);
      setPosts(data.posts);
      setIsFollowing(data.user.followers.includes(user?._id));
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await userAPI.follow(userid);
      setIsFollowing(true);
      setProfile(prev => ({
        ...prev,
        followers: [...prev.followers, user._id]
      }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnfollow = async () => {
    try {
      await userAPI.unfollow(userid);
      setIsFollowing(false);
      setProfile(prev => ({
        ...prev,
        followers: prev.followers.filter(id => id !== user._id)
      }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!profile) {
    return <div className="loading">User not found</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-pic-container">
          <img
            src={profile.profilePic || DEFAULT_PIC}
            alt=""
            className="profile-pic-large"
          />
        </div>

        <div className="profile-info">
          <div className="profile-info-top">
            <h2>{profile.username}</h2>
            {user?._id !== userid && (
              <div className="profile-action-btns">
                <button
                  className={isFollowing ? "btn-secondary" : "btn-primary"}
                  onClick={isFollowing ? handleUnfollow : handleFollow}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
                <Link to={`/messages/${userid}`} className="btn-secondary">
                  Message
                </Link>
              </div>
            )}
          </div>

          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{profile.followers?.length || 0}</strong> followers</span>
            <span><strong>{profile.following?.length || 0}</strong> following</span>
          </div>

          <div className="profile-bio">
            <h3>{profile.fullName}</h3>
            {profile.bio && <p>{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="profile-gallery">
        {posts.length === 0 ? (
          <div className="no-posts">
            <p>No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post._id} to={`/post/${post._id}`} className="gallery-item">
              <img src={post.images[0]?.url} alt="" />
              <div className="gallery-overlay">
                <span>❤️ {post.likes.length}</span>
                <span>💬 {post.commentsCount}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
