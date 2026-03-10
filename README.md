# BloomVe

**Slogan:** _Opportunities bloom via people._

BloomVe is a collaborative, people-first job-sharing platform with:
- a Next.js web app
- a Chrome extension for one-click sharing

---

## Current Product Status

This repo now includes a complete MVP+ flow with:
- account creation and login
- strong password policy
- forgot password by email
- membership-based room visibility
- invite links and participant management
- room-level privacy and member limits
- profile settings and account actions
- modern pink “BloomVe” visual system and consistent branding

---

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- React 19
- Tailwind CSS 4
- Firebase Auth
- Firestore (realtime listeners)
- Firebase Storage (room avatar uploads)
- Chrome Extension (Manifest V3)

---

## Core Features

### 1) Authentication

- Signup fields: **username, email, password, confirm password**
- Password requirements:
  - minimum 8 characters
  - at least one number
  - at least one special character
- Duplicate validation:
  - email already in use → friendly error
  - username already in use → friendly error
- Login with email/password
- Forgot password flow (email reset from login screen)

### 2) Room Visibility and Discovery

- Users only see rooms/channels where they are a member
- Public channels appear as suggestions if user is not yet a member
- Private rooms are not shown in suggestions

### 3) Room Creation + Invites

- Create chat or channel
- Set room privacy (public/private)
- Add participants during creation
- Generate shareable invite link
- Join room using invite token

### 4) Room Management (Owner Controls)

- Rename room
- Update room avatar (upload/camera)
- Add participant by username
- Remove participant
- Block participant
- Unblock participant (from settings)
- Set max users per room
- Delete room

### 5) Posting Behavior

- Chat: all members can post
- Channel: owner-only posting
- Realtime feed updates

### 6) User Settings

- Edit username/email
- Duplicate checks during update
- Delete account
- Logout
- Help center/contact section
- Global blocked participants management (owned rooms)

### 7) Branding and UX

- Unified slogan usage: **“Opportunities bloom via people.”**
- “BloomVe” name emphasized in hero/welcome UI
- Modern pink glass/3D-inspired theme
- Symbolic icon set and consistent visual language
- Username shown in navbar (email moved to settings)

---

## Data Model (Current)

### `users` collection

- `uid`
- `username`
- `usernameLower`
- `email`

### `rooms` collection

- `name`
- `type` (`chat` | `channel`)
- `privacy` (`public` | `private`)
- `ownerId`
- `memberIds` (array)
- `blockedUserIds` (array)
- `inviteToken`
- `maxMembers`
- `avatarUrl`
- `createdAt`

### `rooms/{roomId}/posts` subcollection

- `roomId`
- `userId`
- `title`
- `text`
- `jobUrl`
- `createdAt`

---

## Security / Rules

`firestore.rules` has been updated for:
- membership-aware reads
- controlled joins and invite behavior
- owner-scoped admin actions
- blocked-user restrictions
- users profile access rules
- room max-members constraints

After changing rules locally, publish them in Firebase Console.

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- Firebase project (Auth + Firestore + Storage)
- Google Chrome (for extension testing)

### Install

```bash
npm install
```

### Run app

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

---

## Chrome Extension (Local)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `/extension`

Configure popup with your web app base URL and shared secret, then share current tab into a room.

---

## Known Notes

- ESLint currently reports `@next/next/no-img-element` warnings in room list/room page for image tags.
- Functionality is working; switching to `next/image` can remove these warnings.

---

## Key Paths

- App shell and routes: `src/app`
- Auth logic: `src/lib/auth.ts`
- Firestore + room logic: `src/lib/firestore.ts`
- Shared UI components: `src/components`
- Extension files: `extension/`
- Firestore rules: `firestore.rules`
