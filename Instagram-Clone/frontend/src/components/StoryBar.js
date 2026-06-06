import React, { useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { storyAPI } from "../api";
import { AppContext } from "../context/AppContext";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

export default function StoryBar({ stories, onStoryCreated }) {
  const { user } = useContext(AppContext);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);

    try {
      await storyAPI.create(formData);
      toast.success("Story added!");
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      toast.error("Failed to upload story");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="story-bar">
      {/* Add Story button - always first */}
      <div className="story-item add-story" onClick={() => fileRef.current?.click()}>
        <div className="story-avatar-wrapper add-story-wrapper">
          <img
            src={user?.profilePic || DEFAULT_PIC}
            alt=""
            className="story-avatar"
          />
          <div className="add-story-badge">
            {uploading ? (
              <span className="add-story-spinner" />
            ) : (
              <span className="material-symbols-outlined">add</span>
            )}
          </div>
        </div>
        <span className="story-username">Your story</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>

      {/* Story list */}
      {stories && stories.map((storyGroup) => (
        <Link
          key={storyGroup.user._id}
          to={`/stories?user=${storyGroup.user._id}`}
          className={`story-item ${storyGroup.hasUnviewed ? 'unviewed' : ''}`}
        >
          <div className="story-avatar-wrapper">
            <img
              src={storyGroup.user.profilePic || DEFAULT_PIC}
              alt=""
              className="story-avatar"
            />
          </div>
          <span className="story-username">{storyGroup.user.username}</span>
        </Link>
      ))}
    </div>
  );
}
