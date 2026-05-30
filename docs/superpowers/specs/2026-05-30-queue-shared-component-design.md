# Queue Shared Component Design

**Date:** 2026-05-30
**Status:** Approved

## Goal

Unify the admin and accountant queue pages under a single shared `QueuePageContent` component. Both pages have the same grouped RED → YELLOW → GREEN layout. The only difference is that the admin page shows an accountant filter dropdown and an accountant column in the table; the accountant page hides both.

## Component: `QueuePageContent`

**Location:** `frontend/src/components/queue/QueuePageContent.tsx`

### Props

```ts
interface Props {
  showAccountant?: boolean  // default: false
  reviewBasePath: string    // '/admin/queue' | '/accountant/queue'
}
```

### Data fetching (internal)

The component owns all data fetching:
- Always: `useApprovalQueue()` for queue items + `batchApprove`
- Always: client list — `showAccountant={true}` → `getClients()` (admin API); `showAccountant={false}` → `getAccountantClients()` (accountant API)
- Only when `showAccountant={true}`: accountant list via `getAccountants()`

### Filter state (internal)

- `clientFilter` — string, default `''`
- `flagFilter` — string, default `''`
- `accountantFilter` — string, default `''` (only relevant when `showAccountant={true}`)
- `selected` — `Set<string>` for checked GREEN document IDs
- `approving` — boolean

### GREEN pre-selection

When `items` loads (or changes), all GREEN document IDs are pre-populated into `selected`. This mirrors the existing `QueueTable` behaviour. Uses a `useEffect` on `items`.

## Layout

### Header

```
Queue
12 items — [3 RED] · [4 YELLOW] · [5 GREEN]   (counts colored red/amber/green)
```

No "Approve Selected" button in the header.

### Filters toolbar

Inside the table card, above the table:

| Filter | Condition |
|---|---|
| All clients dropdown | Always shown |
| All flags dropdown | Always shown |
| All accountants dropdown | Only when `showAccountant={true}` |

### Table columns

| Column | When `showAccountant=false` | When `showAccountant=true` |
|---|---|---|
| Checkbox (w-9) | Shown (empty for RED/YELLOW, checkbox for GREEN) | Same |
| CLIENT | ✓ | ✓ |
| DOCUMENT | ✓ | ✓ |
| TYPE | ✓ | ✓ |
| AMOUNT | ✓ | ✓ |
| UPLOADED | ✓ | ✓ |
| ACCOUNTANT | **Hidden** | ✓ |
| FLAG | ✓ | ✓ |
| Review button | ✓ | ✓ |

### Grouped sections

Three sections rendered in order: RED → YELLOW → GREEN. Each section is omitted entirely if it has zero items.

**RED section**
- Group header row: red background (`bg-red-50`), `border-t-2 border-red-200`
- Label: `⚠ RED — N items · Must be reviewed individually · not eligible for batch approval`
- Rows: left border `3px solid #ef4444`, no checkbox, Review button links to `{reviewBasePath}/{documentId}`

**YELLOW section**
- Group header row: yellow background (`bg-yellow-50`), `border-t-2 border-yellow-200`
- Label: `● YELLOW — N items · Must be reviewed individually · not eligible for batch approval`
- Rows: left border `3px solid #f59e0b`, no checkbox, Review button

**GREEN section**
- Group header row: green background (`bg-green-50`), `border-t-2 border-green-200`
- Left side: `✓ GREEN — N items · Pre-selected for batch approval`
- Right side: `Select all` · `Deselect all` links
- Rows: left border `3px solid #16a34a`, light green background `bg-green-50/50`, checkbox pre-checked

### Sticky bottom bar

Visible only when `selected.size > 0`. Fixed to bottom of viewport, full width, white background with top border and shadow.

```
[N GREEN items selected]        [Approve Selected (N)]
```

Approve button triggers `batchApprove`, clears approved IDs from `selected` on success, shows toast on success/failure.

## Page files

Both page files become thin wrappers (~10 lines each):

**`frontend/src/app/admin/queue/page.tsx`**
```tsx
import { QueuePageContent } from '@/components/queue/QueuePageContent'

export default function AdminQueuePage() {
  return <QueuePageContent showAccountant reviewBasePath="/admin/queue" />
}
```

**`frontend/src/app/accountant/queue/page.tsx`**
```tsx
import { QueuePageContent } from '@/components/queue/QueuePageContent'

export default function AccountantQueuePage() {
  return <QueuePageContent reviewBasePath="/accountant/queue" />
}
```

## Files changed

| File | Action |
|---|---|
| `frontend/src/components/queue/QueuePageContent.tsx` | **Create** — shared component |
| `frontend/src/app/admin/queue/page.tsx` | **Rewrite** — thin wrapper |
| `frontend/src/app/accountant/queue/page.tsx` | **Rewrite** — thin wrapper |
| `frontend/src/components/queue/QueueTable.tsx` | **Delete** — replaced |
| `frontend/src/components/queue/QueueItem.tsx` | **Delete** — replaced |
| `frontend/src/components/queue/BatchApproveBar.tsx` | **Delete** — replaced |

## Out of scope

- Backend changes — queue API is unchanged
- `[id]` review pages — unchanged
- `useApprovalQueue` hook — unchanged
- Real-time socket updates — unchanged (hook handles this)
