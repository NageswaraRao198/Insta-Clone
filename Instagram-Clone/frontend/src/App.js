import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import Home from "./screens/HomeNew";
import Explore from "./screens/Explore";
import SignUp from "./components/SignUpNew";
import SignIn from "./components/SignIn";
import Profile from "./screens/Profile";
import UserProfile from "./components/UserProfile";
import CreatePost from "./screens/CreatePostNew";
import Notifications from "./screens/Notifications";
import Messages from "./screens/Messages";
import Stories from "./screens/Stories";
import EditProfile from "./screens/EditProfile";
import PostDetail from "./screens/PostDetail";

const GOOGLE_CLIENT_ID = "852972554695-d2h4p1s3mqdn7ojl61ue21c9melgnjc5.apps.googleusercontent.com";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("jwt");
  if (!token) return <Navigate to="/signin" />;
  return children;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <BrowserRouter>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userid" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
              <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
            </Routes>
            <BottomNav />
            <ToastContainer theme="dark" position="bottom-right" />
          </div>
        </BrowserRouter>
      </AppProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
