# BloomVe MVP Development Plan

Last updated: 2026-03-07

## 1) Current Progress Snapshot

### ✅ Completed
- Next.js App Router project initialized with TypeScript + Tailwind.
- Firebase SDKs installed (`firebase`, `firebase-admin`).
- Core app pages created:
  - Landing
  - Signup
  - Login
  - Dashboard
  - Room details (`rooms/[roomId]`)
- Reusable components created:
  - AuthGuard
  - Navbar
  - CreateRoomForm
  - RoomList
  - ShareComposer
- Firestore client layer implemented (rooms + posts + realtime listeners).
- Extension API route implemented at `/api/share`:
  - `GET` (fetch public rooms)
  - `POST` (share job URL)
  - shared-secret validation
- Chrome extension MVP implemented:
  - `manifest.json`
  - `popup.html`
  - `popup.js`
  - active-tab URL capture + room selection + share action
- Firestore rules file added.
- Build and lint checks passed.

### ✅ Backend Integration Status
- Firebase web config is connected via `.env.local`.
- Firebase Admin SDK credentials are wired via `.env.local`.
- Authorized `/api/share` call reached success state previously (`200`) and returned rooms payload.
- Unauthorized `/api/share` call correctly blocks access (`401`).

### ⚠️ Requires User Console Confirmation
- Firebase Authentication must be fully enabled in Console (Email/Password provider ON).
- Firestore indexes for `rooms` queries must be created and in `Enabled` state.

---

## 2) Immediate Next Steps (From Current State)

## Step A — Final Firebase Console Validation
1. Firebase Console → Authentication → Sign-in method.
2. Confirm **Email/Password** is enabled.
3. Firebase Console → Firestore → Indexes.
4. Confirm these composite indexes are enabled:
   - `privacy` (ASC) + `createdAt` (DESC)
   - `ownerId` (ASC) + `createdAt` (DESC)

## Step B — Verify Auth Works End-to-End
1. Run app locally:
   - `npm run dev`
2. Open `http://localhost:3000`.
3. Create account from Signup page.
4. Confirm redirect to Dashboard.

If signup fails again with configuration error:
- Re-check Firebase project selected in Console (`bloomve-79277`).
- Re-check Authentication setup (`Get started` + Email/Password enabled).

## Step C — Verify Room + Post Flow (Web)
1. Create room:
   - Type: `chat`
   - Privacy: `public`
2. Open room page.
3. Share a job URL manually.
4. Confirm post appears immediately in feed.

## Step D — Verify Share API Write
1. Copy room ID from URL (`/rooms/<ROOM_ID>`).
2. Run:

```powershell
$SECRET="bloomve-dev-secret"
$ROOM_ID="PASTE_ROOM_ID"
$body = @{ roomId=$ROOM_ID; jobUrl="https://jobs.example.com/123"; title="Backend API test" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/share" -Method Post -Headers @{"X-Bloomve-Secret"=$SECRET} -ContentType "application/json" -Body $body
```

3. Refresh room page and confirm the new post appears.

## Step E — Verify Chrome Extension Flow
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension folder: `bloomve/extension`.
4. In popup, set:
   - API base URL: `http://localhost:3000`
   - Secret: `bloomve-dev-secret` (or your updated secret)
5. Click **Refresh rooms** and select room.
6. Open any job page and click **Share to BloomVe**.
7. Confirm shared link appears in room feed.

---

## 3) Recommended Cleanup/Security Tasks (After MVP Works)

1. Rotate Firebase service account key (the current key has been exposed in chat context).
2. Replace extension shared-secret approach with real user auth (Firebase ID token verification).
3. Add membership model for private rooms (`roomMembers` collection).
4. Add owner/admin roles for channel moderation.
5. Add basic monitoring/logging for API route failures.

---

## 4) Definition of Done (MVP)

BloomVe MVP is complete when all checks below are true:
- User can sign up and log in.
- User can create a public chat room.
- User can manually share a job link in room.
- Room feed updates in realtime.
- Extension can capture active tab URL and post it to selected room.
- `/api/share` rejects invalid secret and accepts valid secret.

---

## 5) Quick Run Commands

```powershell
cd D:\BloomVe\bloomve
npm run dev
```

Optional checks:

```powershell
npm run lint
npm run build
```
