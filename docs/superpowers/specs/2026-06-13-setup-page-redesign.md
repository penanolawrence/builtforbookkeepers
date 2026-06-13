# Setup Page Redesign — Spec

**Date:** 2026-06-13
**File:** `frontend/src/app/(auth)/setup/page.tsx`

## Goal

Redesign the account setup page to match the login page's two-pane `lv2-*` layout. The right art pane is reused verbatim from the login page. Only the left form pane content changes.

## Approach

Copy the `lv2-shell` structure directly into `setup/page.tsx` — self-contained, no new shared components, mirrors how `login/page.tsx` is structured. Same `lv2-*` CSS classes throughout.

## Layout

Two-pane layout, identical to login:

- **Left:** `lv2-pane lv2-form-pane` — brand header + setup form
- **Right:** `lv2-pane lv2-art-pane` — unchanged from login (blobs, grid dots, mascot toggle, PugMascot, marketing copy + chips)

## Left Pane — Content

Top to bottom:

1. **Brand header** — same `lv2-brand` markup as login ("Built for Bookkeepers" logo)
2. **Role chip** — displayed above the headline: `● Client` (pink) or `● Accountant` (teal), derived from validated token role
3. **Headline:** `"Set up your account"`
4. **Subhead:** role-aware
   - Client: `"Welcome! Set your name and a password to get started."`
   - Accountant/Admin: `"Welcome to Built for Bookkeepers. Set your name and choose a password."`
5. **Error alert** — `lv2-error` if API returns an error
6. **Full Name field** — `User` icon, `lv2-input` wrapper, hint text "How you'll appear in the system"
7. **New Password field** — `Lock` icon, show/hide toggle (same `lv2-reveal` button as login), strength bars below the input
8. **Confirm Password field** — `Lock` icon, show/hide toggle
9. **Submit button** — `lv2-submit` class, states: idle `"Create Account & Sign In"` / loading `"Setting up…"` / success `"You're all set!"`
10. **Footer line** — `"By continuing, you agree to the Terms of Service and Privacy Policy"` (same `lv2-legal` style)

## Right Pane — Unchanged

Identical to `login/page.tsx`. Includes:
- Blobs and grid-dots decorations
- Sofia/Yoda mascot toggle (reads/writes `localStorage('sofia_login_theme')`)
- Animated `PugMascot` component
- Marketing copy: "An AI co-pilot for your clients' books."
- Feature chips: Upload yourself or invite clients / AI-categorized entries / You approve every account

## Mascot State

| Condition | Mascot State |
|---|---|
| Password or Confirm Password field focused, password hidden | `peeking = true` |
| Password visible (show toggled) | `peeking = false` |
| Setup succeeded (before redirect) | `happy = true` |

`peeking` applies to both password fields — either one focused triggers it.

## Theme

On mount, read `localStorage('sofia_login_theme')` — same key as login page. If present and valid (`'sofia'` or `'yoda'`), use it. Adds `theme-sofia` or `theme-yoda` to `document.body` for accent color. Cleaned up on unmount.

## Form Validation

Unchanged from current implementation — Zod schema via react-hook-form:
- Name: min 2 characters
- Password: min 8 characters
- Confirm Password: must match password

Password strength indicator (weak / fair / strong) shown below the New Password field when the user has typed something.

## Error / Loading States

The token validation states (`loading`, `invalid`, `expired`) are also wrapped in the full `lv2-shell` layout so the right pane (mascot) always renders. The left pane shows a centered message:

- **loading** — spinner + "Validating your invite link…"
- **invalid** — "This link is invalid" + explanation text
- **expired** — "This link has expired" + explanation text

## Token Flow

No change to the underlying logic:
- Token read from `?token=` search param
- `validateSetupToken(token)` called on mount — determines `role` and state
- `setupPassword(token, name, password)` called on submit
- On success: brief `happy` mascot state, then `router.push('/${user.role}/dashboard')`
- No token → redirect to `/login`

## Files Changed

- `frontend/src/app/(auth)/setup/page.tsx` — full rewrite of JSX/state; logic unchanged
- No new files, no CSS changes (all `lv2-*` classes already exist in `auth.css`)
