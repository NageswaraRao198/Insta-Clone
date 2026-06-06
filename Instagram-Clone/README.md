# Instagram Clone - Production Grade MERN Application

A full-featured Instagram clone built with MongoDB, Express.js, React.js, and Node.js.

## Features

- JWT Access + Refresh Tokens with Google OAuth
- Follow/Unfollow, Search Users, Edit Profile
- Create posts with multiple images (carousel), Like/Unlike, Save/Unsave
- Comments with replies, Comment likes
- Home Feed, Explore Feed with cursor-based infinite scroll
- Real-time notifications and messaging via Socket.io
- Stories with 24-hour auto-expiry
- Cloudinary media uploads
- Security: Helmet, Rate Limiting, Mongo Sanitize

## Quick Start

```bash
cd Instagram-Clone
cp .env.example .env   # Edit with your credentials
npm install
npm run dev            # Backend on :5000

cd frontend
npm install
npm start              # Frontend on :3000
```

See the full technical design in `Instagram_Clone_Design_Document.md`.
