# BloomVe MVP

BloomVe is a collaborative job-sharing platform (web app + Chrome extension).

## Tech Stack

- Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4
- React 19
- Firebase 12 (client SDK) + Firebase Admin 13
- Firebase Authentication (email/password)
- Firebase Firestore (with realtime listeners)
- Chrome Extension (Manifest V3)

## 1) Prerequisites

Install these first:

- Node.js 20+
- npm
- Google Chrome
- Firebase account
- Vercel account (for deployment)

## 2) Project Initialization Commands

Run these commands from your workspace root:

```bash
npx create-next-app@latest bloomve --typescript --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*"
cd bloomve
npm install firebase@^12 firebase-admin@^13
```

## 3) Folder Structure

```txt
bloomve/
	extension/
		manifest.json
		popup.html
		popup.js
	src/
		app/
			page.tsx
			login/page.tsx
			signup/page.tsx
			dashboard/page.tsx
			rooms/[roomId]/page.tsx
			api/share/route.ts
		components/
			AuthGuard.tsx
			Navbar.tsx
			CreateRoomForm.tsx
			RoomList.tsx
			ShareComposer.tsx
		lib/
			firebase.ts
			auth.ts
			firestore.ts
	public/
	firestore.rules
	.env.local.example
	package.json
	README.md
```

## 4) Firebase Setup (Beginner Steps)

1. Go to Firebase Console and create a project named `bloomve`.
2. In **Build > Authentication**:
	 - Click **Get started**
	 - Enable **Email/Password**
3. In **Build > Firestore Database**:
	 - Click **Create database**
	 - Start in production mode (we will add rules)
4. In **Project settings > General**:
	 - Create a web app
	 - Copy Firebase web config values
5. In **Project settings > Service accounts**:
	 - Generate new private key
	 - Use values for admin env variables
6. In Firestore, create the required index when prompted (for `privacy + createdAt` room query).

## 5) Environment Variables

Create `.env.local` in project root by copying `.env.local.example`.

macOS / Linux:

```bash
cp .env.local.example .env.local
```

Windows (PowerShell):

```powershell
Copy-Item .env.local.example .env.local
```

Fill all values in `.env.local`.

## 6) Firestore Rules (MVP)

1. Open Firebase Console > Firestore Database > Rules
2. Paste content from `firestore.rules`
3. Publish rules

## 7) Run Locally

```bash
npm run dev
```

Open: `http://localhost:3000`

## 8) MVP User Flow Test (Web)

1. Sign up
2. Go to dashboard
3. Create a room (`chat` + `public` is easiest for first test)
4. Open the room
5. Share a job link manually in the room page
6. Confirm post appears in realtime

## 9) Chrome Extension Setup (Local)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select folder: `bloomve/extension`

In popup, set:

- API base URL: `http://localhost:3000`
- Temporary shared secret: same as `EXTENSION_SHARED_SECRET`
- Click `Refresh rooms` and pick a public room

Then:

1. Open any job post page in Chrome
2. Click BloomVe extension icon
3. Click `Share to BloomVe`
4. Check room feed in web app for new post

## 10) API Contract for Extension

### POST `/api/share`

Headers:

- `X-Bloomve-Secret: <EXTENSION_SHARED_SECRET>`

Body:

```json
{
	"roomId": "ROOM_ID",
	"jobUrl": "https://example.com/job/123",
	"title": "Optional title"
}
```

### GET `/api/share`

Used by extension popup to fetch public rooms.

## 11) Vercel Deployment

1. Push code to GitHub
2. Import repo in Vercel
3. Add all `.env.local` variables into Vercel project env settings
4. Deploy
5. Update extension `API base URL` to production domain

## 12) Security Note (Important)

The extension uses a temporary shared secret in MVP mode. This is **not production-grade auth**.

For production later:

- Replace shared secret with real user auth (Firebase ID tokens / session-based auth)
- Add membership checks for private rooms
- Add role-based access for channel posting

## 13) Data Model

### `rooms` collection

- `name`
- `type` (`chat` or `channel`)
- `privacy` (`public` or `private`)
- `ownerId`
- `createdAt`

### `rooms/{roomId}/posts` subcollection

- `roomId`
- `userId`
- `title`
- `text`
- `jobUrl`
- `createdAt`

Optional next step for future: add `roomMembers` collection for invite/member management.
