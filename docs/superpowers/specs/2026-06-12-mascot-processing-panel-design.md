# Design: Animated Mascot Processing Panel

**Date:** 2026-06-12
**Status:** Approved

---

## Overview

Replace the static `PipelineSteps` component in `DocumentDetailModal.tsx` with an animated pug mascot panel that has two states: a working state (document is being processed) and a done state (processing just completed).

---

## Files

| File | Action |
|---|---|
| `frontend/src/components/shared/PugMascot.tsx` | Create — SVG mascot component |
| `frontend/src/components/documents/MascotProcessingPanel.tsx` | Create — working + done panel |
| `frontend/src/app/globals.css` | Modify — add 8 keyframe animations |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Modify — swap `<PipelineSteps>` for `<MascotProcessingPanel>` |

---

## PugMascot component

Located at `components/shared/PugMascot.tsx`. Pure presentational — no data fetching.

**Props:**
- `variant?: 'sofia' | 'yoda'` — fur/tongue behavior (default `'sofia'`)
- `accent?: string` — headset/collar color; accepts CSS variable strings (e.g. `'var(--t-primary)'`)
- `accentGlow?: string` — glow highlight color; same format
- `happy?: boolean` — tongue out, used alongside bounce animation
- `peeking?: boolean` — paws over eyes (not used in this feature)

**Implementation note — CSS variables in SVG:** SVG presentation attributes (`fill`, `stroke`, `stop-color`) do not support CSS custom properties. All accent-colored SVG elements must use `style={{ fill: accent }}` / `style={{ stopColor: accentGlow }}` instead of bare `fill={accent}`. Follow the same pattern as `BFBLogo.tsx`.

**Internal behavior:**
- Idle blinking via `setTimeout` loop (2.2–5.8 s interval, occasional double-blink)
- Cursor-follow pupils via `mousemove` listener on `window` (disabled when `peeking=true`)
- Both effects use `useEffect` with cleanup

---

## MascotProcessingPanel component

Located at `components/documents/MascotProcessingPanel.tsx`. Owns all state for the mascot feature.

**Props:**
```ts
interface Props {
  docId: string
}
```

**Internal state:**
- Calls `useDocumentStatus(docId)` to get `{ stage }`
- Derives `stageIndex` and `isDone` from `stage`:

```
uploading / preprocessing  →  stageIndex 0
ai                         →  stageIndex 1
anomaly_check              →  stageIndex 2
parked / read_failed / *   →  isDone = true
```

**Stage messages:**

| stageIndex | msg | sub |
|---|---|---|
| 0 | "Scanning your document…" | "Sharpening the image for AI" |
| 1 | "Reading through entries…" | "Mapping accounts and amounts" |
| 2 | "Running a quality check…" | "Almost there!" |

**Rendering:**
- When `isDone = false`: renders `MascotWorkingPanel`
- When `isDone = true`: renders `MascotDonePanel`

Both sub-panels are defined in the same file as private components.

---

## MascotWorkingPanel

Fills the right panel height with:

1. **Background** — subtle radial gradient tinted with `var(--t-primary)` at low opacity
2. **Sparkles** — 5 `SparkStar` elements with staggered `sparkA/B/C` animations, alternating accent and glow colors
3. **Mascot row** — `PugMascot` + `PaperProp` side-by-side, the whole row animated with `pugBob`
4. **Stage message block** — `key={stage.key}` forces remount → re-runs `stageIn` animation on each stage change
5. **Bouncing dots** — 3 dots with staggered `dotBounce` animations

**PaperProp** — small white card (44×56 px) with 5 faint ruled lines and a `scanBeam` div sweeping top-to-bottom on repeat.

**Accent colors** passed down from `MascotProcessingPanel`:
- `accentColor = 'var(--t-primary)'`
- `accentGlow = 'var(--t-primary-soft)'` — the existing theme soft-tint variable (pale primary). Used only in SVG gradient stops for the headset glow; acceptable opacity at that use.

---

## MascotDonePanel

Fills the right panel height with:

1. **Background** — subtle radial gradient tinted green (`#3C8E6C`)
2. **Sparkles** — 6 `SparkStar` elements in green tones
3. **Mascot** — `PugMascot happy={true}`, whole element animated with `pugBounceIn`
4. **Check badge** — green circle, positioned `top: 16, right: -8` on the mascot wrapper, animated with `checkPop` (delayed 0.28 s)
5. **Done copy** — "All done!" + "Your document is ready for review." animated with `stageIn` (delayed 0.38 s)

---

## CSS Keyframes

Added to `frontend/src/app/globals.css`:

```css
@keyframes pugBob       { /* gentle bob + slight rotation, 3.5 s */ }
@keyframes stageIn      { /* fade + slide up 7px, 0.35 s */ }
@keyframes dotBounce    { /* vertical bounce + opacity, 1.25 s */ }
@keyframes sparkA       { /* float + scale, 2.4 s */ }
@keyframes sparkB       { /* float + scale, 2.9 s */ }
@keyframes sparkC       { /* float + scale, 2.2 s */ }
@keyframes checkPop     { /* scale + rotate spring, 0.45 s */ }
@keyframes pugBounceIn  { /* scale + translate spring, 0.52 s */ }
@keyframes scanBeam     { /* top: -3px → 100%, fade in/out, 1.7 s */ }
```

(9 keyframes total — exact values from the spec)

---

## Wiring into DocumentDetailModal

In `DocumentDetailModal.tsx`, delete the `PipelineSteps` component and its helper `stepStatus` function and `PIPELINE_STEPS` / `STEP_ORDER` constants. Replace the render call:

```diff
- {doc.status === 'PROCESSING' && (
-   <PipelineSteps doc={doc} />
- )}
+ {doc.status === 'PROCESSING' && (
+   <MascotProcessingPanel docId={doc.id} />
+ )}
```

Add import for `MascotProcessingPanel`.

---

## Done-state lifecycle

`MascotProcessingPanel` derives `isDone` purely from `useDocumentStatus`. When the WebSocket fires the final stage event (`parked`, `read_failed`, etc.), the mascot transitions to done state in the same render cycle that causes the parent to switch from PROCESSING to the next panel. The done state is briefly visible before the parent re-renders — this transient flash is intentional and provides positive feedback to the user.

No artificial delay is added at this stage. If a longer done-state dwell is needed in the future, the parent can hold a `justFinishedProcessing` buffer flag.

---

## Out of scope

- The peeking variant
- Yoda variant
- Mobile-specific mascot layout
- Any changes to other status panels (PARKED, RETURNED, APPROVED, etc.)
