import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { postAPI } from "../api";
import "../css/Createpost.css";

export default function CreatePost() {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length + images.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }
    setImages(prev => [...prev, ...fileArr]);
    const newPreviews = fileArr.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      images.forEach(img => formData.append("images", img));
      if (caption) formData.append("caption", caption);

      await postAPI.create(formData);
      toast.success("Post created successfully");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-page">
      <div className="create-post-container">
        <h2>Create New Post</h2>

        <div
          className="image-upload-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {previews.length === 0 ? (
            <div
              className={`upload-placeholder ${dragActive ? 'drag-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                add_photo_alternate
              </span>
              <p>Drag photos here or click to select</p>
              <p className="upload-hint">Up to 10 images</p>
            </div>
          ) : (
            <div className="image-previews">
              {previews.map((preview, i) => (
                <div key={i} className="preview-item">
                  <img src={preview} alt="" />
                  <button className="remove-btn" onClick={() => removeImage(i)}>×</button>
                </div>
              ))}
              {images.length < 10 && (
                <div className="add-more" onClick={() => fileInputRef.current?.click()}>
                  <span className="material-symbols-outlined">add</span>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        <div className="caption-area">
          <textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2200}
            rows={4}
          />
          <span className="char-count">{caption.length}/2200</span>
        </div>

        <button
          className="btn-primary share-btn"
          onClick={handleSubmit}
          disabled={loading || images.length === 0}
        >
          {loading ? "Posting..." : "Share"}
        </button>
      </div>
    </div>
  );
}
