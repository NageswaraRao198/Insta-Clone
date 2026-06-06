import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { userAPI, postAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Profile.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function Profile() {
  const { user } = useContext(AppContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await userAPI.getUser(user._id);
      setProfile(data.user);
      setPosts(data.posts);
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchSaved = async () => {
    try {
      const data = await postAPI.getSaved();
      setSavedPosts(data);
    } catch (err) {
      toast.error("Failed to load saved posts");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "saved" && savedPosts.length === 0) {
      fetchSaved();
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const updatedUser = await userAPI.uploadProfilePic(formData);
      setProfile(updatedUser);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error("Failed to update profile picture");
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-pic-container">
          <img
            src={profile?.profilePic || DEFAULT_PIC}
            alt=""
            className="profile-pic-large"
          />
          <label className="change-pic-btn">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleProfilePicChange}
            />
            <span className="material-symbols-outlined">photo_camera</span>
          </label>
        </div>

        <div className="profile-info">
          <div className="profile-info-top">
            <h2>{profile?.username}</h2>
            <Link to="/edit-profile" className="btn-secondary">Edit Profile</Link>
          </div>

          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{profile?.followers?.length || 0}</strong> followers</span>
            <span><strong>{profile?.following?.length || 0}</strong> following</span>
          </div>

          <div className="profile-bio">
            <h3>{profile?.fullName}</h3>
            {profile?.bio && <p>{profile.bio}</p>}
            {profile?.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => handleTabChange("posts")}
        >
          <span className="material-symbols-outlined">grid_on</span> Posts
        </button>
        <button
          className={activeTab === "saved" ? "active" : ""}
          onClick={() => handleTabChange("saved")}
        >
          <span className="material-symbols-outlined">bookmark</span> Saved
        </button>
      </div>

      <div className="profile-gallery">
        {displayPosts.length === 0 ? (
          <div className="no-posts">
            <p>{activeTab === "posts" ? "No posts yet" : "No saved posts"}</p>
          </div>
        ) : (
          displayPosts.map((post) => (
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
