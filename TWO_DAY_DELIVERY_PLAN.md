# BloomVe Two-Day Delivery Plan (Finish by Monday)

Last updated: 2026-03-07
Target finish: Monday (2026-03-09)

## Goal
Ship a working MVP where this full flow works end-to-end:
1. User signs up
2. User creates a room
3. User opens a job posting page
4. User uses extension to share URL
5. URL appears in room feed in realtime

---

## Day 1 (Today): Stabilize Core Product + Backend

## Priority Outcome
By end of Day 1, web app auth/rooms/realtime/API are fully stable and testable.

## Block 1 — Firebase Final Setup (1-2 hrs)
- Confirm Firebase Authentication is enabled (Email/Password ON).
- Confirm Firestore database exists in the correct project (`bloomve-79277`).
- Confirm Firestore composite indexes are enabled:
  - `privacy` ASC + `createdAt` DESC
  - `ownerId` ASC + `createdAt` DESC
- Confirm `.env.local` is complete and correct.

### Exit Criteria
- Signup works without configuration error.
- Authorized `GET /api/share` returns `200`.

## Block 2 — Web App Functional QA (2 hrs)
- Test landing → signup → dashboard flow.
- Create 4 room variants:
  - Public Chat
  - Private Chat
  - Public Channel
  - Private Channel
- Validate room list visibility and room type/privacy badges.
- Validate channel posting restriction (owner-only).

### Exit Criteria
- Room creation works consistently.
- Role behavior between chat and channel works correctly.

## Block 3 — Realtime Feed Validation (1 hr)
- Open one room in two browser windows.
- Share manual job URL from window A.
- Confirm window B receives update in realtime.

### Exit Criteria
- Realtime listener behavior is reliable.

## Block 4 — API + Security Baseline (1-1.5 hrs)
- Test `/api/share` with invalid secret → must return `401`.
- Test `/api/share` with valid secret + valid body → must create post.
- Test invalid payload handling (`roomId`, `jobUrl`) → must return `400`.

### Exit Criteria
- API validation and secret-guard behavior verified.

## Block 5 — Day 1 Wrap (30 mins)
- Update `PROJECT_DEVELOPMENT_PLAN.md` with status.
- Capture known bugs (if any) and rank by severity.

### Day 1 Deliverables
- Stable auth + room creation + realtime + `/api/share` backend.
- Verified API behavior matrix (401/400/200 cases).

---

## Day 2 (Tomorrow): Extension E2E + Deployment + Handoff

## Priority Outcome
By end of Day 2, extension flow and deployment are complete, and project is demo-ready.

## Block 1 — Extension End-to-End Validation (2 hrs)
- Load unpacked extension from `extension/`.
- Configure popup values:
  - API base URL
  - shared secret
- Refresh room list and select target room.
- Open live job pages and share URLs.
- Confirm room feed receives extension posts instantly.

### Exit Criteria
- Extension reliably shares active tab URL to selected room.

## Block 2 — UX Polish + Beginner Guardrails (1.5 hrs)
- Improve small error messages if any confusion remains.
- Ensure all primary flows have clear empty/error states.
- Verify responsive behavior on mobile-width browser.

### Exit Criteria
- New users can complete flow without backend knowledge.

## Block 3 — Pre-Deploy Checks (1 hr)
- Run `npm run lint`.
- Run `npm run build`.
- Fix only release-blocking issues.

### Exit Criteria
- Build and lint pass.

## Block 4 — Vercel Deploy (1-1.5 hrs)
- Push repo to GitHub.
- Import project in Vercel.
- Add production environment variables.
- Deploy and verify production URL.
- Test `/api/share` against production URL.

### Exit Criteria
- Public deployment works.

## Block 5 — Monday Handoff Pack (1 hr)
- Finalize `README.md` with exact setup + run + extension steps.
- Add a short “Known Limitations” section (MVP shared-secret auth).
- Record 1 short demo script (manual test sequence).

### Day 2 Deliverables
- Extension end-to-end verified.
- Production deployment live.
- Beginner-friendly docs and handoff complete.

---

## Monday Final Acceptance Checklist

Mark all as done before declaring completion:
- [ ] Signup works with Firebase Auth.
- [ ] Login works.
- [ ] Room creation works for chat/channel and public/private.
- [ ] Manual room sharing works.
- [ ] Realtime feed updates work across clients.
- [ ] Extension shares active tab URL into selected room.
- [ ] `/api/share` secure enough for MVP (secret required).
- [ ] Build passes (`npm run build`).
- [ ] Lint passes (`npm run lint`).
- [ ] README enables a beginner to run from zero.

---

## Risk Watchlist (Do Early)

1. Firebase Auth disabled/misconfigured
- Mitigation: verify Email/Password provider first.

2. Firestore indexes still building
- Mitigation: create indexes early on Day 1.

3. Port/lock conflicts in local dev (`.next/dev/lock`)
- Mitigation: keep one dev server process only.

4. Secret mismatch between extension and app env
- Mitigation: use one shared value and re-check in popup.

---

## Suggested Work Rhythm
- 90-minute focused blocks
- 10-minute verification after each block
- Keep a short changelog at end of each block

This plan is intentionally execution-focused so you can finish by Monday with a stable MVP.