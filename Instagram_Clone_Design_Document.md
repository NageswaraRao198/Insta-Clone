# Instagram Clone - Production Grade Technical Design Document

## Tech Stack
- MongoDB
- Express.js
- React.js
- Node.js
- JWT Authentication
- Google OAuth
- Cloudinary
- Socket.io
- Redis (Optional)
- Docker (Optional)

## Features
### Authentication
- Signup/Login
- JWT Access + Refresh Tokens
- Google OAuth
- Logout

### User Features
- Edit Profile
- Upload Profile Picture
- Bio & Website
- Follow / Unfollow
- Search Users
- View Profiles

### Post Features
- Create Posts
- Multiple Image Uploads
- Carousel Posts
- Like / Unlike
- Save / Unsave
- Edit Caption
- Delete Post

### Comment Features
- Comments
- Replies
- Comment Likes

### Feed Features
- Home Feed
- Following Feed
- Explore Feed

### Notifications
- Likes
- Comments
- Follows
- Replies

### Realtime
- Live Notifications
- Live Likes
- Live Comments
- Messaging

### Stories
- Upload Stories
- 24 Hour Expiry

---

# Recommended Architecture

Frontend (React)
→ API Layer
→ Express Backend
→ Service Layer
→ MongoDB
→ Cloudinary
→ Socket.io

---

# Database Design

## User

```js
{
  username,
  fullName,
  email,
  password,
  profilePic,
  bio,
  website,
  followers: [],
  following: [],
  posts: [],
  savedPosts: [],
  googleId
}
```

## Post

```js
{
  userId,
  images:[{url, publicId}],
  caption,
  likes:[],
  commentsCount,
  savedBy:[]
}
```

## Comment

```js
{
  postId,
  userId,
  text,
  likes:[],
  parentComment,
  replies:[]
}
```

## Notification

```js
{
  receiverId,
  senderId,
  type,
  postId,
  isRead
}
```

## Story

```js
{
  userId,
  image,
  viewers:[],
  expiresAt
}
```

---

# API Endpoints

## Auth

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/google
POST /api/auth/refresh
POST /api/auth/logout
```

## Users

```text
GET /api/users/:id
PUT /api/users/profile
POST /api/users/follow/:id
POST /api/users/unfollow/:id
GET /api/users/search
```

## Posts

```text
POST /api/posts
GET /api/posts/feed
GET /api/posts/explore
GET /api/posts/:id
PUT /api/posts/:id
DELETE /api/posts/:id
```

## Comments

```text
POST /api/comments
DELETE /api/comments/:id
POST /api/comments/:id/reply
```

## Notifications

```text
GET /api/notifications
PUT /api/notifications/read
```

## Stories

```text
POST /api/stories
GET /api/stories
```

---

# Authentication

## JWT

Access Token: 15 minutes

Refresh Token: 7 days

Store refresh token in HttpOnly cookie.

## Google OAuth

Use Passport.js Google OAuth Strategy.

---

# Cloudinary

Use Cloudinary for:

- Profile Pictures
- Posts
- Stories
- Chat Images

Upload Response:

```js
{
  url,
  publicId
}
```

---

# Socket.io Events

```text
POST_LIKED
NEW_COMMENT
NEW_FOLLOWER
NEW_NOTIFICATION
NEW_MESSAGE
```

---

# Security

- bcrypt
- helmet
- express-rate-limit
- xss-clean
- express-mongo-sanitize
- JWT Middleware

---

# Performance

- Cursor Pagination
- Redis Caching
- Cloudinary Image Optimization
- Lazy Loading
- Infinite Scroll

---

# Deployment

Frontend:
- Vercel
- Netlify

Backend:
- Render
- Railway
- Fly.io

Database:
- MongoDB Atlas

Media:
- Cloudinary

---

# Future Features

- Reels
- AI Caption Generator
- AI Hashtag Generator
- Video Uploads
- Live Streaming
- Recommendation Engine
