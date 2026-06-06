import React, { useContext, useState } from "react";
import "../css/Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { authAPI, userAPI } from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const { isLoggedIn, logout, unreadCount, darkMode, toggleDarkMode } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const results = await userAPI.search(query);
        setSearchResults(results);
        setShowSearch(true);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // logout even if API fails
    }
    logout();
    setShowLogoutModal(false);
    navigate("/signin");
  };

  if (!isLoggedIn) {
    return (
      <div className="navbar">
        <Link to="/" className="nav-logo">
          <h2>Instagram</h2>
        </Link>
        <ul className="nav-menu">
          <Link to="/signin"><li>Sign In</li></Link>
          <Link to="/signup"><li>Sign Up</li></Link>
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="navbar">
        <Link to="/" className="nav-logo">
          <h2>Instagram</h2>
        </Link>

        <div className="nav-search">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
          />
          {showSearch && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="search-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(`/profile/${user._id}`);
                    setSearchQuery("");
                    setShowSearch(false);
                  }}
                >
                  <img
                    src={user.profilePic || "https://cdn-icons-png.flaticon.com/128/3177/3177440.png"}
                    alt=""
                  />
                  <div>
                    <p className="search-username">{user.username}</p>
                    <p className="search-fullname">{user.fullName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ul className="nav-menu">
          <Link to="/"><li><span className="material-symbols-outlined">home</span></li></Link>
          <Link to="/explore"><li><span className="material-symbols-outlined">explore</span></li></Link>
          <Link to="/create"><li><span className="material-symbols-outlined">add_box</span></li></Link>
          <Link to="/notifications">
            <li className="nav-notification">
              <span className="material-symbols-outlined">favorite</span>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </li>
          </Link>
          <Link to="/messages"><li><span className="material-symbols-outlined">chat</span></li></Link>
          <Link to="/profile"><li><span className="material-symbols-outlined">account_circle</span></li></Link>
          <li onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
            <span className="material-symbols-outlined">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </li>
          <li onClick={() => setShowLogoutModal(true)}>
            <span className="material-symbols-outlined">logout</span>
          </li>
        </ul>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Log Out</h3>
            <p>Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleLogout}>Yes, Log Out</button>
              <button className="btn-secondary" onClick={() => setShowLogoutModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
