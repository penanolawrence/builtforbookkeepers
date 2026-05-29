# Frontend Cleanup & Render Optimization Design

**Date:** 2026-05-29
**Project:** Sofia Books (Philippine SME Bookkeeping SaaS)
**Working directory:** `c:\sofia-books\frontend\`

---

## Overview

Removes dead files and unused dependencies from the frontend, and eliminates a source of unnecessary re-renders: redundant client-side role guards in the three portal layouts.

No UI changes. No new features. Strictly removal and targeted fixes.

---

## Section 1: Dead file and package removals

### Files to delete

| File | Reason |
|---|---|
| `src/components/ui/scroll-area.tsx` | No imports anywhere in the codebase |
| `src/components/ui/separator.tsx` | No imports anywhere in the codebase |

### Packages to remove from `package.json` dependencies

| Package | Reason |
|---|---|
| `@radix-ui/react-popover` | Never directly imported; no `popover.tsx` component exists |
| `@radix-ui/react-scroll-area` | Only used by the deleted `scroll-area.tsx` |
| `@radix-ui/react-separator` | Only used by the deleted `separator.tsx` |

Run `npm install` after editing `package.json` to update `package-lock.json`.

### Root page replacement

`src/app/page.tsx` currently renders the default Next.js boilerplate (Vercel logos, external nextjs.org links). Replace with a server-side redirect to `/login`:

```tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
```

Middleware already redirects unauthenticated users before this renders. This makes the intent explicit and prevents providers from wrapping an empty shell.

---

## Section 2: Remove redundant client-side role guards

### Problem

`middleware.ts` enforces role-based routing server-side. Each portal layout also repeats this check via `useEffect` + `localStorage`:

```ts
useEffect(() => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem('sofia_user')
  if (!raw) { router.replace('/login'); return }
  const user = JSON.parse(raw)
  if (user.role !== 'admin') router.replace('/login')
}, [router])
```

Because `useEffect` runs after the first render, the layout briefly renders before the redirect fires. It also adds a render cycle on every valid navigation and forces the layout to be `'use client'`.

### Fix

Remove the `useEffect` role check, `useRouter`, and `'use client'` from all three portal layouts. Each becomes a plain server component wrapper.

**`src/app/admin/layout.tsx` — before:**
```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('sofia_user')
    if (!raw) { router.replace('/login'); return }
    const user = JSON.parse(raw)
    if (user.role !== 'admin') router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
```

**After:**
```tsx
import { Topbar } from '@/components/layout/Topbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
```

Same pattern for `accountant/layout.tsx` (remove `role !== 'accountant'` guard) and `client/layout.tsx` (remove `role !== 'client'` guard). All three have the same structure.

**Important:** `Topbar` is a `'use client'` component itself. The layout doesn't need to be client just because it renders Topbar — Next.js handles this automatically.

---

## Verification

After all changes:

```bash
docker exec sofia-frontend npx tsc --noEmit
```

Must return zero errors.

---

## Files changed

| File | Change |
|---|---|
| `src/app/page.tsx` | Replace with redirect to `/login` |
| `src/components/ui/scroll-area.tsx` | Delete |
| `src/components/ui/separator.tsx` | Delete |
| `package.json` | Remove 3 packages, then run `npm install` |
| `src/app/admin/layout.tsx` | Remove role guard, `useEffect`, `useRouter`, `'use client'` |
| `src/app/accountant/layout.tsx` | Remove role guard, `useEffect`, `useRouter`, `'use client'` |
| `src/app/client/layout.tsx` | Remove role guard, `useEffect`, `useRouter`, `'use client'` |
