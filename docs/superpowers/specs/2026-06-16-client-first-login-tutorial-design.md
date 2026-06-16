# Client First-Login Tutorial — Design

**Date:** 2026-06-16
**Status:** Approved, ready for implementation planning

## Problem

The accountant-first-login tutorial covers the Dashboard and Queue. Client (business-owner) users get no equivalent walkthrough of their own Dashboard or how to upload documents.

## Goal

Extend the existing tour engine to a new client-facing journey: Dashboard → Upload, auto-starting on first login for client users, replayable from the Help page. Reuses all existing tour infrastructure (`useTour`, `TourOverlay`, `tourSession`) — this is a content + wiring addition, not a new engine.

## 1. Trigger condition

Same `hasSeenTutorial` field already on `User`, already returned by `login`/`me`, already has the `PATCH /api/me/tutorial` endpoint. No backend changes needed.

Trigger condition for auto-start: `user.role === 'client' && !user.hasSeenTutorial`.

## 2. Step content & cross-page sequencing

**Dashboard steps** (new `data-tour` attributes added to `frontend/src/app/client/dashboard/page.tsx`):

1. `client-dash-mascot` — *Meet your AI co-pilot* — the mascot/brief callout.
2. `client-dash-stats` — *Your numbers at a glance* — the 4 stat cards (Total Documents, Returned, Income, Expenses).
3. `client-dash-recent` — *Track what you've sent* — Recent Documents list, explains status chips (Parked / Posted / Returned / Processing).
4. `client-dash-upload-btn` — *Ready to upload* — the "Upload a Document" button. Final step; advancing here navigates to `/client/upload`.

**Upload steps** (new `data-tour` attributes added to `frontend/src/app/client/upload/page.tsx` and `frontend/src/components/upload/TwoAreaUpload.tsx`):

1. `upload-summary-cards` — *Your month at a glance* — the 3 summary cards (Income, Expense, In Progress).
2. `upload-drop-zones` — *Drop it where it belongs* — wraps both `UploadZone` areas; explains income (left) vs expense (right) and mentions the manual-entry fallback button.
3. `upload-in-progress` — *Watch it move* — the In Progress table; explains it clears automatically once a document posts.

**Sequencing:** same chained pattern as accountant tour:

1. `CLIENT_DASHBOARD_TOUR_STEPS` exported from `frontend/src/components/tour/steps.ts`.
2. `CLIENT_UPLOAD_TOUR_STEPS` exported from the same file.
3. `TourContinueTarget` in `frontend/src/components/tour/tourSession.ts` extended from `'dashboard' | 'queue'` to `'dashboard' | 'queue' | 'client-upload'`.
4. Finishing the dashboard tour's last step navigates to `/client/upload` and sets the continue flag to `client-upload`.
5. The upload page checks the flag on mount; if `client-upload`, clears it and auto-starts its tour.
6. `PATCH /api/me/tutorial` fires only when the Upload tour finishes or is skipped — mirrors the accountant flow where the whole journey, not just the first page, marks "seen."
7. Skip is available at every step in either segment and immediately marks the tutorial seen, ending the whole flow.

## 3. Replay entry point

`frontend/src/components/help/ReplayTutorialButton.tsx` currently has a hard `if (user?.role !== 'accountant') return null` gate and always restarts from `/accountant/dashboard`. Update it to:

- Render for both `accountant` and `client` roles (still hidden for `admin` or other roles).
- Branch the replay target by role: accountants get `setTourContinueFlag('dashboard')` + push to `/accountant/dashboard` (unchanged); clients get `setTourContinueFlag('dashboard')` + push to `/client/dashboard` (new). Note: `'dashboard'` is reused as the continue-flag value for both roles' first step — each dashboard page only checks the flag while mounted on its own route, so there's no collision.
- As today, replay does not touch the backend flag — it's a purely client-side restart of an already-completed tutorial.

This button already renders on the shared `HelpPageContent`, which is used by both `/accountant/help` and `/client/help`, so no new placement work is needed — only the role gate and target logic change.

## Summary of changes

**Backend:** none.

**Frontend:**
- `tour/steps.ts`: add `CLIENT_DASHBOARD_TOUR_STEPS`, `CLIENT_UPLOAD_TOUR_STEPS`.
- `tour/tourSession.ts`: widen `TourContinueTarget` to include `'client-upload'`.
- `client/dashboard/page.tsx`: wire `useTour`, auto-start on `!hasSeenTutorial`, `data-tour` attributes, navigate-and-handoff on last step (mirrors `accountant/dashboard/page.tsx`).
- `client/upload/page.tsx`: wire `useTour`, continue-flag check on mount, `data-tour` attributes, finish/skip both mark tutorial seen (mirrors `QueuePageContent.tsx`).
- `upload/TwoAreaUpload.tsx`: add a wrapping `data-tour="upload-drop-zones"` element around the two `UploadZone`s.
- `help/ReplayTutorialButton.tsx`: replace accountant-only gate with role-based branching.

## Testing

Mirror existing patterns:
- Extend `ReplayTutorialButton.test.tsx` to cover the client-role branch (renders, navigates to `/client/dashboard`).
- Add tour auto-start/continue-flag tests to `client/dashboard/__tests__/page.test.tsx`, modeled on `accountant/dashboard/__tests__/page.test.tsx`.
- Add a new `client/upload/__tests__/page.test.tsx` (or extend the existing one) covering continue-flag pickup and finish/skip marking the tutorial seen, modeled on `QueuePageContent.test.tsx`.

## Out of scope

- Tutorial coverage of other client pages (Reports, Settings, Returned).
- Admin role tutorial.
- Changes to the tour engine (`useTour`, `TourOverlay`) itself — content and wiring only.
