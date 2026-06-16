# Accountant First-Login Tutorial — Design

**Date:** 2026-06-16
**Status:** Approved, ready for implementation planning

## Problem

New accountants land on the dashboard with no introduction to the layout, the queue triage system, or how batch approval works. There's already a static written guide at `/accountant/help` ("How Sofia Books Works"), but nothing walks a first-time user through the live UI.

## Goal

An interactive product tour that auto-starts the first time an accountant logs in, spotlighting real UI elements across two pages (Dashboard, then Queue), narrated by the existing themed mascot (Sofia/Yoda). Replayable later from the Help page.

## 1. Data model & persistence

- **Migration:** add `has_seen_tutorial` boolean, default `false`, to the `users` table.
- **`User` model** (`backend/app/Models/User.php`): add `has_seen_tutorial` to `$fillable` and to `$casts` as `'has_seen_tutorial' => 'boolean'`.
- **`AuthController`:** include `hasSeenTutorial` (camelCase) in the JSON payloads returned by `login()` and `me()`.
- **New endpoint:** `PATCH /api/me/tutorial` → sets `has_seen_tutorial = true` on the authenticated user, returns `{ hasSeenTutorial: true }`. Kept separate from `updateProfile` since it isn't a profile field.
- **Frontend type:** add `hasSeenTutorial: boolean` to `User` in `frontend/src/types/auth.ts`.

Trigger condition for auto-start: `user.role === 'accountant' && !user.hasSeenTutorial`.

## 2. Tour engine (reusable, content-agnostic)

- **`useTour(steps)` hook** (new, `frontend/src/components/tour/`) — manages `currentStepIndex`, `isActive`; exposes `next()`, `back()`, `skip()`, `finish()`. A step is `{ targetId: string, title: string, body: string }`. `targetId` matches a `data-tour="<id>"` attribute placed on real page elements.
- **`<TourOverlay>` component** — when active, renders:
  - A full-screen fixed backdrop (`pointer-events: auto`) blocking interaction with the underlying page and dimming it.
  - A "spotlight" box positioned over the current target's `getBoundingClientRect()`, via `box-shadow: 0 0 0 9999px rgba(0,0,0,.55)` plus an accent-colored border (no need for separate masking panels).
  - A tooltip card anchored next to the spotlight, flipping above/below/left/right based on available viewport space, styled with the existing `--t-*` theme CSS vars so it matches the active sofia/yoda theme automatically.
  - Tooltip contents: small `PugMascot` icon + theme name ("Sofia" / "Yoda"), step title, body copy, step counter ("2 of 5"), Back / Next / Skip buttons. Escape key triggers skip.
  - Recomputes target position on scroll/resize (`ResizeObserver` + scroll listener).
- **Step content lives separately from the engine** in `frontend/src/components/tour/steps.ts`, exporting `DASHBOARD_TOUR_STEPS` and `QUEUE_TOUR_STEPS`, so copy can change without touching engine logic.

## 3. Step content & cross-page sequencing

**Dashboard steps** (`data-tour` attributes added to existing elements in `frontend/src/app/accountant/dashboard/page.tsx`):

1. Greeting/mascot row — introduces the AI co-pilot mascot.
2. Tier card grid — explains the four auto-sorted buckets (Needs review / Check needed / Ready to approve / Pending entries).
3. My Clients table — assigned clients with live per-bucket counts.
4. This week panel — weekly stats (entries processed, auto-categorized %, time saved).
5. "Go to Queue" button — final step; advancing here also navigates to `/accountant/queue`.

**Queue steps** (`data-tour` attributes added to elements in `frontend/src/components/queue/QueuePageContent.tsx`):

1. Filters row (client / flag / accountant).
2. Red / Yellow / Green sections — what each flag tier means.
3. Selection + batch approve bar — selecting Green items and approving in bulk.

**Sequencing:** the dashboard and queue tours are two separate step lists chained into one journey:

1. Reaching the end of the dashboard tour (Next on step 5) navigates to `/accountant/queue` and sets a `sessionStorage` flag (`tour:continue=queue`).
2. The queue page checks this flag on mount; if present, it auto-starts the queue tour and clears the flag.
3. `PATCH /api/me/tutorial` is **not** called until the queue tour finishes (or is skipped) — that's the point the whole journey is considered "seen."
4. Skip is available at every step in either segment and immediately fires the same "mark seen" call — skipping anywhere ends the entire flow, not just the current segment.

## 4. Replay entry point

- A "Replay tutorial" button is added to `frontend/src/components/help/HelpPageContent.tsx`, near the top of the page.
- Clicking it does **not** touch the backend flag (already `true`). It sets the same `tour:continue` sessionStorage mechanism and navigates to `/accountant/dashboard`, which detects the flag and starts the dashboard tour locally — bypassing the `hasSeenTutorial` auto-start check for this explicit replay path.
- Finishing or skipping a replay does not call the backend endpoint again — it's a purely client-side replay of an already-completed tutorial.

## Summary of changes

**Backend:** 1 migration, `User` model fillable/cast addition, new `AuthController` method + route, `hasSeenTutorial` added to `login`/`me` response payloads.

**Frontend:** `useTour` hook, `TourOverlay` component, `tour/steps.ts` content file, `data-tour` attributes added to dashboard and queue elements, sessionStorage-based dashboard→queue handoff, replay button on the Help page, `hasSeenTutorial` added to the `User` type.

## Out of scope

- Tour coverage beyond Dashboard and Queue (Clients, Reports, Adjusting Entries pages) — not included in this pass.
- Admin or client role tutorials — accountant-only for now.
- Any third-party tour library — built custom to match the existing hand-rolled, theme-var-driven UI style.
