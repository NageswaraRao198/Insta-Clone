import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../css/BottomNav.css";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const token = localStorage.getItem("jwt");

  if (!token) return null;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`bottom-nav-item ${path === '/' ? 'active' : ''}`}>
        <span className="material-symbols-outlined">home</span>
      </Link>
      <Link to="/explore" className={`bottom-nav-item ${path === '/explore' ? 'active' : ''}`}>
        <span className="material-symbols-outlined">explore</span>
      </Link>
      <Link to="/create" className={`bottom-nav-item ${path === '/create' ? 'active' : ''}`}>
        <span className="material-symbols-outlined">add_box</span>
      </Link>
      <Link to="/messages" className={`bottom-nav-item ${path.startsWith('/messages') ? 'active' : ''}`}>
        <span className="material-symbols-outlined">chat</span>
      </Link>
      <Link to="/profile" className={`bottom-nav-item ${path === '/profile' ? 'active' : ''}`}>
        <span className="material-symbols-outlined">account_circle</span>
      </Link>
    </nav>
  );
}
