import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { storyAPI } from "../api";
import { AppContext } from "../context/AppContext";
import "../css/Home.css";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";
const STORY_DURATION = 5000; // 5 seconds per story

export default function Stories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AppContext);

  const [stories, setStories] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [currentStory, setCurrentStory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Use refs so the timer always reads fresh values
  const currentGroupRef = useRef(0);
  const currentStoryRef = useRef(0);
  const storiesRef = useRef([]);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);
  const animFrameRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);
  useEffect(() => { currentStoryRef.current = currentStory; }, [currentStory]);
  useEffect(() => { storiesRef.current = stories; }, [stories]);

  const fetchStories = useCallback(async () => {
    try {
      const data = await storyAPI.getAll();
      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }
      setStories(data);

      // If a user query param is passed, start on that user's story group
      const targetUserId = searchParams.get("user");
      if (targetUserId) {
        const idx = data.findIndex(g => g.user._id === targetUserId);
        if (idx >= 0) {
          setCurrentGroup(idx);
          currentGroupRef.current = idx;
        }
      }
    } catch (err) {
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Mark current story as viewed
  useEffect(() => {
    if (stories.length === 0) return;
    const group = stories[currentGroup];
    if (!group) return;
    const story = group.stories[currentStory];
    if (story && !story.viewers?.includes(user?._id)) {
      storyAPI.view(story._id).catch(() => {});
    }
  }, [currentGroup, currentStory, stories, user]);

  const stopTimer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (startTimeRef.current) {
      elapsedRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = null;
    }
  }, []);

  const advanceStory = useCallback(() => {
    const grpIdx = currentGroupRef.current;
    const stIdx = currentStoryRef.current;
    const allStories = storiesRef.current;
    const group = allStories[grpIdx];

    if (!group || !group.stories || group.stories.length === 0) {
      navigate(-1);
      return;
    }

    if (stIdx < group.stories.length - 1) {
      setCurrentStory(stIdx + 1);
    } else if (grpIdx < allStories.length - 1) {
      setCurrentGroup(grpIdx + 1);
      setCurrentStory(0);
    } else {
      navigate(-1);
    }
  }, [navigate]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;

    const animate = () => {
      if (!startTimeRef.current) return;
      const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        advanceStory();
        return;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [advanceStory]);

  useEffect(() => {
    if (stories.length === 0 || paused) return;
    setProgress(0);
    elapsedRef.current = 0;
    startTimer();
    return () => stopTimer();
  }, [currentGroup, currentStory, stories.length, paused, startTimer, stopTimer]);

  const goBack = () => {
    if (currentStory > 0) {
      setCurrentStory(currentStory - 1);
    } else if (currentGroup > 0) {
      const prevGroup = stories[currentGroup - 1];
      setCurrentGroup(currentGroup - 1);
      setCurrentStory(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  };

  const goForward = () => {
    advanceStory();
  };

  const handlePause = () => {
    setPaused(true);
    stopTimer();
  };

  const handleResume = () => {
    setPaused(false);
  };

  const handleClose = () => {
    stopTimer();
    navigate(-1);
  };

  const handleDeleteStory = async () => {
    const group = stories[currentGroup];
    if (!group) return;
    const story = group.stories[currentStory];
    if (!story) return;

    // Stop the timer first to prevent race conditions
    stopTimer();
    setPaused(true);

    try {
      await storyAPI.delete(story._id);
      toast.success("Story deleted");

      // Deep clone to avoid mutation issues
      const updatedStories = stories.map(g => ({
        ...g,
        stories: [...g.stories]
      }));
      updatedStories[currentGroup].stories.splice(currentStory, 1);

      // If group is now empty, remove it
      if (updatedStories[currentGroup].stories.length === 0) {
        updatedStories.splice(currentGroup, 1);
        if (updatedStories.length === 0) {
          navigate(-1);
          return;
        }
        const newGroup = Math.min(currentGroup, updatedStories.length - 1);
        setCurrentGroup(newGroup);
        setCurrentStory(0);
      } else if (currentStory >= updatedStories[currentGroup].stories.length) {
        setCurrentStory(updatedStories[currentGroup].stories.length - 1);
      }

      setStories(updatedStories);
      setPaused(false);
    } catch (err) {
      setPaused(false);
      toast.error("Failed to delete story");
    }
  };

  if (loading) {
    return (
      <div className="stories-page">
        <div className="stories-loading">
          <div className="story-loading-spinner" />
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="stories-page">
        <div className="no-stories">
          <span className="material-symbols-outlined" style={{ fontSize: 64, marginBottom: 16 }}>
            photo_camera
          </span>
          <h3>No stories yet</h3>
          <p>Stories from people you follow will appear here.</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const activeGroup = stories[currentGroup];
  const activeStory = activeGroup?.stories[currentStory];
  const isOwnStory = activeGroup?.user?._id === user?._id;

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  return (
    <div className="stories-page" onClick={(e) => e.target.className === 'stories-page' && handleClose()}>
      {/* Close button */}
      <button className="story-close-btn" onClick={handleClose}>
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="story-viewer">
        {/* Progress bars */}
        <div className="story-progress">
          {activeGroup?.stories.map((_, i) => (
            <div key={i} className="progress-bar-wrapper">
              <div
                className="progress-bar-fill"
                style={{
                  width: i < currentStory ? '100%' : i === currentStory ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-header-left">
            <img
              src={activeGroup?.user?.profilePic || DEFAULT_PIC}
              alt=""
              className="story-user-pic"
            />
            <div className="story-header-info">
              <span className="story-header-username">{activeGroup?.user?.username}</span>
              <span className="story-header-time">{timeAgo(activeStory?.createdAt)}</span>
            </div>
          </div>
          <div className="story-header-right">
            {isOwnStory && (
              <button className="story-action-btn" onClick={handleDeleteStory} title="Delete story">
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            {isOwnStory && activeStory?.viewers && (
              <span className="story-viewers-count" title="Viewers">
                <span className="material-symbols-outlined">visibility</span>
                {activeStory.viewers.length}
              </span>
            )}
          </div>
        </div>

        {/* Story image */}
        <img
          src={activeStory?.image?.url}
          alt=""
          className="story-image"
          onMouseDown={handlePause}
          onMouseUp={handleResume}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
          draggable={false}
        />

        {/* Navigation areas */}
        <div className="story-navigation">
          <div className="story-nav-left" onClick={goBack} />
          <div className="story-nav-right" onClick={goForward} />
        </div>
      </div>
    </div>
  );
}
