# Instagram Clone - Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technologies Used](#technologies-used)
3. [Architecture](#architecture)
4. [Authentication System](#authentication-system)
5. [User Management](#user-management)
6. [Post Management](#post-management)
7. [Comments System](#comments-system)
8. [Direct Messaging](#direct-messaging)
9. [Stories](#stories)
10. [Notifications](#notifications)
11. [Real-Time Communication](#real-time-communication)
12. [UI/UX Features](#uiux-features)
13. [Security Implementation](#security-implementation)
14. [Database Design](#database-design)
15. [API Reference](#api-reference)
16. [Frontend Architecture](#frontend-architecture)
17. [Deployment Configuration](#deployment-configuration)

---

## Project Overview

A full-stack Instagram clone application replicating core Instagram features including photo sharing, social interactions, real-time messaging, stories, and notifications. The application follows a client-server architecture with a RESTful API backend and a React single-page application frontend, connected via WebSockets for real-time features.

**Version:** 2.0.0

---

## Technologies Used

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v24.x | Server runtime environment |
| Express.js | ^4.18.2 | HTTP web framework |
| MongoDB | Atlas (Cloud) | NoSQL document database |
| Mongoose | ^8.0.3 | MongoDB ODM (Object Document Mapper) |
| Socket.io | ^4.7.2 | Real-time bidirectional WebSocket communication |
| JSON Web Token | ^9.0.2 | Stateless authentication tokens |
| bcrypt | ^5.1.1 | Password hashing (salt rounds: 12) |
| Cloudinary | ^1.41.0 | Cloud-based image storage and transformation |
| Multer | ^1.4.5-lts.1 | Multipart form-data file upload handling |
| Helmet | ^7.1.0 | HTTP security headers |
| express-rate-limit | ^7.1.4 | API rate limiting |
| express-mongo-sanitize | ^2.2.0 | NoSQL injection prevention |
| google-auth-library | ^9.4.1 | Google OAuth token verification |
| cookie-parser | ^1.4.6 | HTTP cookie parsing |
| dotenv | ^16.3.1 | Environment variable management |
| cors | ^2.8.5 | Cross-Origin Resource Sharing |
| nodemon | ^3.0.2 | Development auto-reload |

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.2.0 | Component-based UI framework |
| React DOM | ^18.2.0 | DOM rendering engine |
| React Router DOM | ^6.20.1 | Client-side routing (SPA navigation) |
| Socket.io Client | ^4.7.2 | WebSocket client for real-time events |
| React Toastify | ^9.1.3 | Toast notification library |
| @react-oauth/google | ^0.12.1 | Google OAuth login UI component |
| react-icons | ^4.12.0 | Icon component library |
| Google Material Symbols | CDN | Primary icon system (Outlined variant) |
| Create React App | 5.0.1 | Build toolchain (Webpack, Babel, ESLint) |

### External Services

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud-hosted database cluster |
| Cloudinary | Image upload, storage, and CDN delivery |
| Google OAuth 2.0 | Third-party authentication provider |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Screens │  │Components│  │  Context  │  │   API Layer      │   │
│  │  (Pages) │  │(Reusable)│  │(AppContext│  │(Centralized Fetch│   │
│  │          │  │          │  │ + Socket) │  │ + Token Refresh) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└────────────────────────────┬────────────────────────┬──────────────┘
                             │ HTTP/REST              │ WebSocket
                             ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Routes  │  │Middleware│  │ Socket.io │  │    Models         │   │
│  │ (7 mods) │  │(Auth,Sec)│  │(Events)  │  │  (6 schemas)     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└────────────────────────────┬────────────────────────┬──────────────┘
                             │                        │
                             ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │  MongoDB Atlas  │     │   Cloudinary    │
                    │  (Data Store)   │     │ (Image Storage) │
                    └─────────────────┘     └─────────────────┘
```

### Communication Flow

- **REST API**: All CRUD operations use JSON over HTTP with JWT Bearer authentication
- **WebSocket**: Real-time events (messages, notifications, typing, online status) via Socket.io with JWT handshake authentication
- **Proxy**: Frontend dev server proxies `/api/*` requests to backend port 5000

---

## Authentication System

### Functional Description

The application supports two authentication methods:

1. **Email/Password Registration and Login** - Traditional credentials with server-side validation
2. **Google OAuth 2.0** - One-click social login using Google accounts

Session management uses a dual-token approach for security and seamless user experience.

### Technical Implementation

#### Token Strategy

| Token | Type | Expiry | Storage | Purpose |
|-------|------|--------|---------|---------|
| Access Token | JWT | 15 minutes | localStorage | API request authorization |
| Refresh Token | JWT | 7 days | HttpOnly cookie + DB | Silent access token renewal |

#### Registration Flow

```
Client → POST /api/auth/signup
  Body: { fullName, username, email, password }
  Validation:
    - Email format check
    - Password minimum 8 characters
    - Username unique, lowercase, 3-30 chars
  Process:
    - bcrypt hash password (12 salt rounds)
    - Create User document in MongoDB
  Response: 201 { message: 'User created successfully' }
```

#### Login Flow

```
Client → POST /api/auth/login
  Body: { email, password }
  Process:
    - Find user by email
    - bcrypt.compare password
    - Generate access token (15min expiry)
    - Generate refresh token (7 day expiry)
    - Store refresh token hash in User document
    - Set httpOnly cookie with refresh token
  Response: 200 { token, user: { _id, fullName, username, email, profilePic } }
```

#### Google OAuth Flow

```
Client → Google Sign-In button → Google ID Token
Client → POST /api/auth/google
  Body: { credential: googleIdToken }
  Process:
    - Verify token with google-auth-library
    - Extract email, name, sub (googleId)
    - Find or create user (link googleId)
    - Generate access + refresh tokens
  Response: 200 { token, user }
```

#### Token Refresh Flow

```
Client → API returns 401 (expired token)
Client → POST /api/auth/refresh (httpOnly cookie sent automatically)
  Process:
    - Validate refresh token from cookie
    - Verify against stored hash in DB
    - Issue new access + refresh tokens
    - Rotate refresh token in DB + cookie
  Response: 200 { token }
Client → Retry original request with new token
```

#### Logout Flow

```
Client → POST /api/auth/logout
  Process:
    - Clear refreshToken in User document
    - Clear httpOnly cookie
    - Client clears localStorage
    - Client disconnects WebSocket
```

---

## User Management

### Functional Description

Users can create profiles, upload profile pictures, edit their bio and personal information, search for other users, and follow/unfollow to build social connections.

### Features

| Feature | Description |
|---------|-------------|
| Profile Display | Username, full name, bio, website, profile picture, follower/following counts |
| Profile Edit | Update display name, bio (150 char limit), website URL |
| Profile Picture | Upload via Cloudinary with automatic optimization |
| User Search | Real-time search by username or full name (minimum 2 characters) |
| Follow/Unfollow | Social graph connections with real-time notifications |
| User Discovery | Explore section shows content from non-followed users |

### Technical Implementation

#### Profile Picture Upload

```
Client → PUT /api/users/profile-pic (FormData with 'image' field)
  Middleware: multer (memory storage, 5MB limit, image/* filter)
  Process:
    - Buffer uploaded to Cloudinary
    - Transformation: 400x400 crop, auto quality
    - Old image deleted from Cloudinary (if exists)
    - User.profilePic updated with new URL
  Response: 200 { profilePic: cloudinaryUrl }
```

#### Search Implementation

```
Client → GET /api/users/search?q=searchTerm
  Process:
    - MongoDB text search on username + fullName indexes
    - Minimum 2 character query length
    - Returns top 20 matches
    - Excludes password and sensitive fields
  Response: 200 [ { _id, username, fullName, profilePic } ]
```

#### Follow/Unfollow

```
Client → POST /api/users/follow/:id
  Process:
    - Add targetId to current user's 'following' array
    - Add currentUserId to target user's 'followers' array
    - Create Notification { type: 'follow', senderId, receiverId }
    - Emit socket 'NEW_FOLLOWER' to target user
    - Emit socket 'NEW_NOTIFICATION' to target user
  Response: 200 { message: 'Followed successfully' }
```

---

## Post Management

### Functional Description

Users can create image posts with captions, supporting multiple images (carousel) per post. Posts appear in followers' feeds and can be liked, saved, commented on, and shared.

### Features

| Feature | Description |
|---------|-------------|
| Multi-Image Upload | Up to 10 images per post with drag & drop support |
| Image Carousel | Swipe/navigate between multiple images |
| Caption | Optional text (max 2200 characters) |
| Like/Unlike | Toggle like with optimistic UI update |
| Double-Tap Like | Touch gesture triggers animated heart overlay |
| Save/Unsave | Bookmark posts to private saved collection |
| Share | Web Share API (mobile) or clipboard copy (desktop) |
| Delete | Post owner can remove with Cloudinary cleanup |
| Feed Algorithm | Chronological posts from followed users |
| Explore Feed | Posts from non-followed users for discovery |

### Technical Implementation

#### Post Creation

```
Client → POST /api/posts (FormData)
  Fields: images[] (1-10 files), caption (optional)
  Middleware: multer (memory, 10MB/file, max 10 files)
  Process:
    - Upload each image buffer to Cloudinary
    - Store: [{ url: cloudinaryUrl, publicId: cloudinaryId }]
    - Create Post document with userId, images, caption
  Response: 201 { post }
```

#### Feed (Cursor-Based Pagination)

```
Client → GET /api/posts/feed?cursor=lastPostId&limit=10
  Process:
    - Get current user's 'following' list + self
    - Query posts where userId in list
    - Sort by createdAt descending
    - If cursor provided, filter createdAt < cursor post's date
    - Populate userId (username, profilePic)
    - Return posts + nextCursor (last post _id)
  Response: 200 { posts, nextCursor, hasMore }
```

#### Like with Notification

```
Client → POST /api/posts/:id/like
  Process:
    - Add userId to post.likes array (addToSet)
    - If post owner !== liker:
      - Create Notification { type: 'like', postId }
      - Emit socket 'NEW_NOTIFICATION'
      - Emit socket 'POST_LIKED'
  Response: 200 { likes: updatedArray }
```

#### Double-Tap Like (Frontend)

```javascript
// Touch/click handler tracks last tap time
const handleDoubleTap = () => {
  const now = Date.now();
  if (now - lastTap.current < 300) {  // 300ms threshold
    if (!isLiked) onLike(post._id);
    setShowHeart(true);  // Trigger CSS animation
    setTimeout(() => setShowHeart(false), 1000);
  }
  lastTap.current = now;
};
```

#### Image Skeleton Loading

```javascript
// Shimmer placeholder shown while image loads
const [imageLoaded, setImageLoaded] = useState(false);

// In JSX:
{!imageLoaded && <div className="image-skeleton" />}
<img
  className={`post-image ${imageLoaded ? 'loaded' : 'loading'}`}
  onLoad={() => setImageLoaded(true)}
/>
```

---

## Comments System

### Functional Description

Users can comment on posts, reply to existing comments (threaded), like comments, and delete their own comments. Comments support nested replies with a parent-child relationship.

### Features

| Feature | Description |
|---------|-------------|
| Top-Level Comments | Direct comments on posts |
| Threaded Replies | Reply to specific comments (one level deep) |
| Comment Likes | Like/unlike individual comments |
| Delete | Remove own comments with cascade delete of replies |
| Real-Time | New comments emit socket events to post owner |
| Pagination | Cursor-based loading (20 per page) |
| Reply Preview | Shows up to 3 replies inline, expandable |

### Technical Implementation

#### Comment Creation

```
Client → POST /api/comments
  Body: { postId, text }
  Process:
    - Create Comment document
    - Increment Post.commentsCount
    - Create Notification { type: 'comment', postId, commentId }
    - Emit socket 'NEW_COMMENT' to post owner
    - Emit socket 'NEW_NOTIFICATION' to post owner
  Response: 201 { comment: populated }
```

#### Reply to Comment

```
Client → POST /api/comments/:parentId/reply
  Body: { text }
  Process:
    - Create Comment with parentComment reference
    - Push reply _id to parent's replies array
    - Create Notification { type: 'reply' } for parent author
    - Emit socket events
  Response: 201 { reply: populated }
```

#### Fetch Comments with Replies

```
Client → GET /api/comments/:postId?cursor&limit=20
  Process:
    - Find top-level comments (parentComment: null)
    - For each comment, populate replies (limit 3)
    - Populate userId for all (username, profilePic)
    - Cursor-based pagination on createdAt
  Response: 200 { comments, nextCursor, hasMore }
```

---

## Direct Messaging

### Functional Description

Instagram-style direct messaging with one-on-one conversations, real-time message delivery, typing indicators, online/offline status, read receipts, and image sharing.

### Features

| Feature | Description |
|---------|-------------|
| Text Messages | Real-time text chat between users |
| Image Messages | Send images in conversation (Cloudinary upload) |
| Typing Indicators | Live "typing..." display when other user is composing |
| Online Status | Green dot indicator for online users |
| Read Receipts | Messages marked as read when conversation is opened |
| Conversation List | All conversations with last message preview and unread count |
| Date Separators | Visual date dividers between message groups |
| Optimistic Sending | Messages appear instantly before server confirmation |

### Technical Implementation

#### Send Message

```
Client → POST /api/messages
  Body: { receiverId, text?, image? }
  Process:
    - Create Message document
    - Emit socket 'NEW_MESSAGE' to receiver's socket room
  Response: 201 { message: populated }
```

#### Real-Time Message Delivery

```
// Server socket handler (on 'NEW_MESSAGE' from route)
io.to(receiverId).emit('NEW_MESSAGE', {
  _id, senderId, receiverId, text, image, read, createdAt
});

// Client socket listener
socket.on('NEW_MESSAGE', (message) => {
  // Add to active conversation or update conversation list
  // Show notification if not in conversation
});
```

#### Typing Indicators

```
// Client emits
socket.emit('TYPING', { receiverId });
socket.emit('STOP_TYPING', { receiverId });

// Server relays
socket.on('TYPING', ({ receiverId }) => {
  io.to(receiverId).emit('USER_TYPING', { userId: socket.userId });
});

// Client displays typing animation
```

#### Read Receipts

```
// Auto-mark read when opening conversation
Client → GET /api/messages/:userId
  Process:
    - Find messages where senderId=userId, receiverId=me, read=false
    - Update all to read: true
    - Emit socket 'MESSAGES_READ' to sender
  Response: 200 { messages, nextCursor }
```

#### Responsive Layout (Three-Tier)

| Viewport | Layout |
|----------|--------|
| > 900px | Full sidebar (350px) + chat panel |
| 577-900px | Icon-only sidebar (72px) + chat panel |
| ≤ 576px | Full-screen toggle (list OR chat, not both) |

---

## Stories

### Functional Description

24-hour ephemeral content sharing similar to Instagram Stories. Users can post images that disappear after 24 hours, view others' stories, and see who viewed theirs. The story bar is always visible on the home feed with a prominent "Your Story" upload button as the first item.

### Features

| Feature | Description |
|---------|-------------|
| Create Story (StoryBar) | "Your Story" button always first in the story bar with blue "+" badge on profile pic |
| Upload with Spinner | Loading spinner in the badge while image uploads to Cloudinary |
| Story Bar | Horizontal scrollable avatars at top of feed (always visible, even with no stories) |
| Full-Screen Viewer | Dark overlay viewer with rounded card, opens on story click |
| Auto-Advance Timer | 5-second timer per story with animated progress bars |
| Pause/Resume | Hold (long-press) on story image to pause, release to resume |
| Tap Navigation | Tap left half to go back, right half to go forward |
| Deep Linking | Click a user's story avatar → opens viewer at that user's group (`/stories?user=id`) |
| Close Button | X button top-right, click outside viewer, or auto-close when all stories viewed |
| Delete Own Story | Trash icon visible on own stories, removes from Cloudinary + DB |
| Viewer Count | Eye icon with count displayed on own stories |
| Relative Timestamps | "Just now", "5m ago", "2h ago" on each story |
| View Tracking | Records which users viewed each story |
| Auto-Delete | MongoDB TTL index automatically removes stories after 24 hours |
| Grouped Display | Stories grouped by user in the story bar |
| File Validation | Client-side image type check and 10MB size limit before upload |

### Technical Implementation

#### Story Upload (from StoryBar)

```javascript
// StoryBar component - always first item in feed
<div className="story-item add-story" onClick={() => fileRef.current?.click()}>
  <div className="story-avatar-wrapper add-story-wrapper">
    <img src={user.profilePic} className="story-avatar" />
    <div className="add-story-badge">
      {uploading ? <span className="add-story-spinner" /> : <Icon>add</Icon>}
    </div>
  </div>
  <span className="story-username">Your story</span>
  <input type="file" accept="image/*" onChange={handleUpload} hidden />
</div>

// Upload flow:
// 1. Validates file type (image/*) and size (< 10MB)
// 2. Creates FormData, shows spinner
// 3. POST /api/stories → Cloudinary upload + DB save
// 4. Calls onStoryCreated() to refresh story list in parent
```

#### Create Story (Backend)

```
Client → POST /api/stories (FormData with 'image')
  Middleware: requireAuth, multer (single file)
  Process:
    - Validate file exists
    - Upload buffer to Cloudinary (instagram-clone/stories folder)
    - Create Story document with expiresAt = now + 24 hours
    - Populate userId and return
  Response: 201 { story }
```

#### Get Active Stories

```
Client → GET /api/stories
  Process:
    - Get following[] + self
    - Query stories where userId in list AND expiresAt > now
    - Sort by createdAt descending
    - Group by userId into { user, stories[], hasUnviewed }
    - hasUnviewed = true if any story not in viewers[]
  Response: 200 [{ user, stories[], hasUnviewed }]
```

#### Story Viewer (Auto-Advance with Refs)

```javascript
// Timer uses refs to always read fresh state (avoids stale closure bugs)
const currentGroupRef = useRef(0);
const currentStoryRef = useRef(0);
const storiesRef = useRef([]);

// Sync refs with state
useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);
useEffect(() => { currentStoryRef.current = currentStory; }, [currentStory]);
useEffect(() => { storiesRef.current = stories; }, [stories]);

// startTimer: requestAnimationFrame loop reading elapsed time
// advanceStory: reads from refs, moves to next story or next group
// On last story of last group → navigate(-1) to go back

// Pause: onMouseDown/onTouchStart → stopTimer()
// Resume: onMouseUp/onTouchEnd → setPaused(false) triggers useEffect restart
```

#### Delete Story (with Race Condition Prevention)

```javascript
// Frontend:
const handleDeleteStory = async () => {
  stopTimer();          // 1. Stop timer FIRST
  setPaused(true);      // 2. Prevent timer restart

  await storyAPI.delete(story._id);  // 3. API call

  // 4. Deep clone stories (avoid shared reference mutation)
  const updatedStories = stories.map(g => ({ ...g, stories: [...g.stories] }));
  updatedStories[currentGroup].stories.splice(currentStory, 1);

  // 5. Handle empty group or out-of-bounds index
  // 6. Update state, unpause
};

// Backend:
router.delete('/api/stories/:id', requireAuth, async (req, res) => {
  // Find story, verify ownership
  // Delete image from Cloudinary (publicId)
  // Delete document from MongoDB
});
```

#### Auto-Deletion (TTL Index)

```javascript
// In Story schema
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// MongoDB automatically deletes documents when expiresAt passes
```

---

## Notifications

### Functional Description

Activity notifications for social interactions: likes, comments, follows, and replies. Real-time delivery via WebSocket with unread badge count in the navigation.

### Features

| Feature | Description |
|---------|-------------|
| Like Notification | When someone likes your post |
| Comment Notification | When someone comments on your post |
| Follow Notification | When someone follows you |
| Reply Notification | When someone replies to your comment |
| Unread Badge | Numeric count on notification icon in navbar |
| Mark All Read | One-click to mark all notifications as read |
| Real-Time Delivery | Instant notification via WebSocket |

### Technical Implementation

#### Notification Schema

```javascript
{
  receiverId: ObjectId,   // Who receives
  senderId: ObjectId,     // Who triggered
  type: 'like' | 'comment' | 'follow' | 'reply',
  postId: ObjectId,       // Related post (optional)
  commentId: ObjectId,    // Related comment (optional)
  isRead: Boolean,
  timestamps: true
}
```

#### Real-Time Notification Flow

```
1. User A likes User B's post
2. Server creates Notification document
3. Server emits socket: io.to(userB._id).emit('NEW_NOTIFICATION', notification)
4. Client B's AppContext listener receives event
5. Client B increments unreadCount badge
6. Client B adds notification to state (if on notifications page)
```

---

## Real-Time Communication

### Functional Description

Socket.io enables instant bidirectional communication for messaging, notifications, typing indicators, and online presence tracking across all connected clients.

### Socket Events Reference

#### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `TYPING` | `{ receiverId }` | Inform receiver that user is typing |
| `STOP_TYPING` | `{ receiverId }` | Inform receiver that user stopped typing |
| `MESSAGE_READ` | `{ senderId }` | Inform sender their messages were read |
| `GET_ONLINE_USERS` | - | Request current online users list |

#### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `NEW_MESSAGE` | `{ message }` | Deliver new chat message |
| `NEW_NOTIFICATION` | `{ notification }` | Deliver activity notification |
| `NEW_COMMENT` | `{ comment }` | Notify post owner of new comment |
| `POST_LIKED` | `{ postId, userId }` | Notify post owner of like |
| `NEW_FOLLOWER` | `{ user }` | Notify user of new follower |
| `USER_ONLINE` | `{ userId }` | Broadcast user came online |
| `USER_OFFLINE` | `{ userId }` | Broadcast user went offline |
| `ONLINE_USERS` | `[userId]` | List of currently online users |
| `USER_TYPING` | `{ userId }` | Show typing indicator |
| `USER_STOP_TYPING` | `{ userId }` | Hide typing indicator |
| `MESSAGES_READ` | `{ readerId }` | Update read receipts UI |

### Online Presence Tracking

```javascript
// Server maintains Map of online users
const onlineUsers = new Map();  // userId → Set<socketId>

// Multi-tab support: tracks all socket connections per user
// Only emits USER_OFFLINE when last socket disconnects
io.on('connection', (socket) => {
  const userId = socket.userId;  // From JWT auth middleware
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
    io.emit('USER_ONLINE', { userId });
  }
  onlineUsers.get(userId).add(socket.id);

  socket.on('disconnect', () => {
    onlineUsers.get(userId).delete(socket.id);
    if (onlineUsers.get(userId).size === 0) {
      onlineUsers.delete(userId);
      io.emit('USER_OFFLINE', { userId });
    }
  });
});
```

---

## UI/UX Features

### Dark Mode

| Aspect | Implementation |
|--------|---------------|
| Toggle | Icon button in navbar (sun/moon) |
| Persistence | localStorage `darkMode` flag |
| Application | CSS custom properties (variables) on `body.dark-mode` |
| Transition | Smooth 300ms background/color transitions |
| Scope | All components: cards, navbar, inputs, modals, sidebars |

CSS Variables System:

```css
:root {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --text-primary: #262626;
  --border-color: #dbdbdb;
  /* ... */
}

body.dark-mode {
  --bg-primary: #000000;
  --bg-secondary: #121212;
  --text-primary: #f5f5f5;
  --border-color: #363636;
  /* ... */
}
```

### Responsive Design

| Breakpoint | Layout |
|------------|--------|
| > 900px | Full desktop layout with sidebars |
| 577-900px | Compact layout (icon sidebars) |
| ≤ 768px | Mobile layout with bottom navigation |
| ≤ 576px | Full-screen panels (single view at a time) |

### Mobile Bottom Navigation

Visible at ≤768px viewport with 5 primary navigation items (Home, Explore, Create, Messages, Profile). Active state highlighted. Fixed position at screen bottom.

### Post Interactions

| Feature | UX Detail |
|---------|-----------|
| Double-tap like | 300ms threshold, animated heart overlay (scale + fade) |
| Image loading | Shimmer skeleton placeholder, fade-in on load |
| Relative time | "now", "5m", "2h", "3d", "1w" format |
| Share button | Native share sheet on mobile, clipboard + scale animation on desktop |
| Carousel | Previous/next buttons + dot indicators |
| Optimistic updates | Like/save state changes immediately, reverts on API failure |

### Post Creation

| Feature | UX Detail |
|---------|-----------|
| Drag & Drop | Visual border highlight on drag-over |
| Multi-select | Up to 10 images with grid preview |
| Caption counter | Character count display (max 2200) |
| Image removal | Click-to-remove from preview grid |
| Upload feedback | Loading spinner during Cloudinary upload |

---

## Security Implementation

### Measures

| Layer | Implementation | Protection Against |
|-------|---------------|-------------------|
| Password Storage | bcrypt (12 salt rounds) | Credential theft, rainbow tables |
| Authentication | JWT with short expiry (15min) | Session hijacking |
| Token Storage | HttpOnly cookies for refresh | XSS token theft |
| Token Rotation | New refresh token on each renewal | Token replay attacks |
| HTTP Headers | Helmet.js security headers | Clickjacking, MIME sniffing, XSS |
| Input Sanitization | express-mongo-sanitize | NoSQL injection ($gt, $ne operators) |
| Rate Limiting | express-rate-limit on /api/* | Brute force, DoS |
| CORS | Explicit origin whitelist | Cross-origin attacks |
| File Upload | Type validation + size limits (5-10MB) | Malicious file uploads |
| Request Size | Body limit 10MB | Request bombing |
| Socket Auth | JWT verification on connection | Unauthorized WebSocket access |

### Authentication Middleware

```javascript
// requireLogin middleware
const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ error: 'Login required' });
  const token = authorization.replace('Bearer ', '');
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = payload._id;
    next();
  });
};
```

---

## Database Design

### MongoDB Collections

#### Users Collection

```javascript
{
  _id: ObjectId,
  username: String,        // unique, lowercase, 3-30 chars
  fullName: String,        // required, max 50 chars
  email: String,           // unique, lowercase
  password: String,        // bcrypt hash (optional if Google auth)
  profilePic: String,      // Cloudinary URL
  bio: String,             // max 150 chars
  website: String,
  followers: [ObjectId],   // ref: User
  following: [ObjectId],   // ref: User
  savedPosts: [ObjectId],  // ref: Post
  googleId: String,        // Google OAuth identifier
  refreshToken: String,    // hashed refresh token
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { username: 'text', fullName: 'text' }
```

#### Posts Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // ref: User
  images: [{
    url: String,           // Cloudinary URL
    publicId: String       // For Cloudinary deletion
  }],
  caption: String,         // max 2200 chars
  likes: [ObjectId],       // ref: User
  commentsCount: Number,   // denormalized count
  savedBy: [ObjectId],     // ref: User
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { userId: 1, createdAt: -1 }, { createdAt: -1 }
```

#### Comments Collection

```javascript
{
  _id: ObjectId,
  postId: ObjectId,        // ref: Post
  userId: ObjectId,        // ref: User
  text: String,            // max 1000 chars
  likes: [ObjectId],       // ref: User
  parentComment: ObjectId, // ref: Comment (null for top-level)
  replies: [ObjectId],     // ref: Comment
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { postId: 1, createdAt: -1 }
```

#### Messages Collection

```javascript
{
  _id: ObjectId,
  senderId: ObjectId,      // ref: User
  receiverId: ObjectId,    // ref: User
  text: String,
  image: String,           // Cloudinary URL
  read: Boolean,           // default: false
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { senderId: 1, receiverId: 1, createdAt: -1 }
```

#### Stories Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // ref: User
  image: {
    url: String,           // Cloudinary URL
    publicId: String
  },
  viewers: [ObjectId],     // ref: User
  expiresAt: Date,         // 24 hours from creation
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { expiresAt: 1 } (TTL, auto-delete), { userId: 1, createdAt: -1 }
```

#### Notifications Collection

```javascript
{
  _id: ObjectId,
  receiverId: ObjectId,    // ref: User
  senderId: ObjectId,      // ref: User
  type: String,            // enum: 'like', 'comment', 'follow', 'reply'
  postId: ObjectId,        // ref: Post (optional)
  commentId: ObjectId,     // ref: Comment (optional)
  isRead: Boolean,         // default: false
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { receiverId: 1, createdAt: -1 }, { receiverId: 1, isRead: 1 }
```

### Pagination Strategy

All list endpoints use **cursor-based pagination** instead of offset-based:

- **Advantages**: Consistent results with real-time inserts, no "skipped items" problem, performant at scale
- **Implementation**: Last item's `_id` used as cursor, queries filter `createdAt < cursor.createdAt`
- **Response format**: `{ data, nextCursor, hasMore }`

---

## API Reference

### Base URL

```
Development: http://localhost:5000/api
Production: /api (same-origin, served by Express static)
```

### Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Register new user |
| POST | `/auth/login` | No | Login with credentials |
| POST | `/auth/google` | No | Google OAuth login |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Yes | Logout and clear tokens |
| GET | `/users/search?q=` | Yes | Search users |
| GET | `/users/:id` | Yes | Get user profile |
| PUT | `/users/profile` | Yes | Update profile info |
| PUT | `/users/profile-pic` | Yes | Upload profile picture |
| POST | `/users/follow/:id` | Yes | Follow user |
| POST | `/users/unfollow/:id` | Yes | Unfollow user |
| POST | `/posts` | Yes | Create post |
| GET | `/posts/feed` | Yes | Get home feed |
| GET | `/posts/explore` | Yes | Get explore feed |
| GET | `/posts/:id` | Yes | Get single post |
| PUT | `/posts/:id` | Yes | Update post caption |
| DELETE | `/posts/:id` | Yes | Delete post |
| POST | `/posts/:id/like` | Yes | Like post |
| POST | `/posts/:id/unlike` | Yes | Unlike post |
| POST | `/posts/:id/save` | Yes | Save post |
| POST | `/posts/:id/unsave` | Yes | Unsave post |
| GET | `/posts/saved/me` | Yes | Get saved posts |
| GET | `/posts/user/:userId` | Yes | Get user's posts |
| POST | `/comments` | Yes | Create comment |
| GET | `/comments/:postId` | Yes | Get post comments |
| DELETE | `/comments/:id` | Yes | Delete comment |
| POST | `/comments/:id/reply` | Yes | Reply to comment |
| POST | `/comments/:id/like` | Yes | Like comment |
| POST | `/comments/:id/unlike` | Yes | Unlike comment |
| POST | `/messages` | Yes | Send message |
| GET | `/messages` | Yes | Get conversations list |
| GET | `/messages/:userId` | Yes | Get conversation messages |
| GET | `/notifications` | Yes | Get notifications |
| PUT | `/notifications/read` | Yes | Mark all read |
| GET | `/notifications/unread-count` | Yes | Get unread count |
| POST | `/stories` | Yes | Create story |
| GET | `/stories` | Yes | Get active stories |
| POST | `/stories/:id/view` | Yes | Mark story viewed |
| DELETE | `/stories/:id` | Yes | Delete story |
| GET | `/health` | No | Health check |

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── App.js              # Root component, routing, providers
├── App.css             # Global styles, CSS variables, dark mode
├── index.js            # React DOM entry point
├── api/
│   └── index.js        # Centralized API layer with token refresh
├── context/
│   └── AppContext.js   # Global state (auth, socket, theme)
├── components/
│   ├── Navbar.js       # Top navigation bar
│   ├── BottomNav.js    # Mobile bottom navigation
│   ├── PostCard.js     # Reusable post component
│   ├── StoryBar.js     # "Your story" upload + story avatars with unviewed ring
│   ├── SignIn.js       # Login form
│   ├── SignUpNew.js    # Registration form
│   └── Modal.js        # Logout confirmation
├── screens/
│   ├── HomeNew.js      # Feed page
│   ├── Explore.js      # Discovery grid
│   ├── Profile.js      # Own profile
│   ├── UserProfile.js  # Other user profile
│   ├── PostDetail.js   # Full post view
│   ├── Messages.js     # Direct messaging
│   ├── Notifications.js # Activity feed
│   ├── Stories.js      # Full-screen viewer with auto-advance, pause, delete
│   ├── CreatePostNew.js # Post creation
│   └── EditProfile.js  # Profile editor
└── css/
    ├── Home.css        # Feed, post cards, explore, stories
    ├── Navbar.css      # Top navigation styles
    ├── BottomNav.css   # Mobile bottom nav
    ├── Messages.css    # Three-tier responsive messaging
    ├── Profile.css     # Profile page, gallery grid
    ├── Createpost.css  # Upload area, drag & drop
    ├── SignIn.css       # Auth pages
    └── PostDetail.css  # Full post view
```

### State Management

The application uses React Context API with a single `AppContext` provider:

```javascript
AppContext = {
  user: Object | null,        // Current user data
  isLoggedIn: Boolean,        // Auth state
  socket: SocketIO,           // WebSocket instance
  notifications: Array,       // Notification list
  unreadCount: Number,        // Badge count
  darkMode: Boolean,          // Theme state
  login: Function,            // Set auth state
  logout: Function,           // Clear auth state
  toggleDarkMode: Function    // Toggle theme
}
```

### API Layer Design

Centralized fetch wrapper with automatic token refresh:

```javascript
// All API calls go through handleResponse()
async function handleResponse(response) {
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry original request with new token
    } else {
      // Force logout
    }
  }
  return response.json();
}
```

### Routing

Protected routes wrapped in `<ProtectedRoute>` component that checks localStorage for JWT and redirects to `/signin` if absent.

---

## Deployment Configuration

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development|production

# Database
MONGO_URL=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
GOOGLE_CLIENT_ID=your-google-client-id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Client
CLIENT_URL=http://localhost:3000
```

### Scripts

```json
// Backend
"dev": "nodemon app.js"     // Development with auto-reload
"start": "node app.js"      // Production

// Frontend
"start": "react-scripts start"    // Dev server (port 3000)
"build": "react-scripts build"    // Production build
"test": "react-scripts test"      // Jest test runner
```

### Production Build

Frontend builds to `frontend/build/` static files. Backend serves these in production mode with SPA fallback routing (all non-API routes serve `index.html`).

---

## Summary

This Instagram Clone implements a comprehensive social media platform with:

- **30+ REST API endpoints** across 7 route modules
- **6 MongoDB collections** with optimized indexes
- **10+ real-time WebSocket events** for instant communication
- **Dual-token authentication** with automatic refresh
- **Responsive design** with 4 breakpoint tiers
- **Dark mode** with CSS variable theming
- **Security hardening** with 10+ protection layers
- **Cursor-based pagination** throughout for performance at scale
- **Optimistic UI updates** for seamless user experience
- **Cloud image storage** via Cloudinary with automatic cleanup
- **24-hour ephemeral stories** with auto-advance viewer, pause/resume, deep-linking, and TTL auto-deletion
- **Story upload** directly from the home feed story bar with real-time spinner feedback
