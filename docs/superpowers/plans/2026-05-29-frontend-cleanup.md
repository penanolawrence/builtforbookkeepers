# Frontend Cleanup & Render Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead UI components, unused npm packages, the Next.js boilerplate root page, and redundant client-side role guards from all three portal layouts.

**Architecture:** Pure removal — no new logic. Dead files deleted, packages pruned from `package.json`, root page replaced with a server redirect, and `useEffect` role guards stripped from `admin/`, `accountant/`, and `client/` layouts. `middleware.ts` already enforces routing; the layouts just become thin wrappers.

**Tech Stack:** Next.js 14 App Router, TypeScript, shadcn/ui. TypeScript (`npx tsc --noEmit`) is the verification tool after each task. All tsc checks run inside Docker via `docker exec sofia-frontend`.

---

## File Map

**Deleted:**
- `frontend/src/components/ui/scroll-area.tsx`
- `frontend/src/components/ui/separator.tsx`

**Modified:**
- `frontend/package.json` — remove 3 packages
- `frontend/src/app/page.tsx` — replace boilerplate with redirect
- `frontend/src/app/admin/layout.tsx` — remove role guard
- `frontend/src/app/accountant/layout.tsx` — remove role guard
- `frontend/src/app/client/layout.tsx` — remove role guard

---

## Task 1: Delete unused UI components

**Files:**
- Delete: `frontend/src/components/ui/scroll-area.tsx`
- Delete: `frontend/src/components/ui/separator.tsx`

Neither file is imported anywhere in the codebase. Deleting them removes their Radix UI transitive dependencies from the TypeScript surface.

- [ ] Delete `scroll-area.tsx`:

```
del "c:\sofia-books\frontend\src\components\ui\scroll-area.tsx"
```

- [ ] Delete `separator.tsx`:

```
del "c:\sofia-books\frontend\src\components\ui\separator.tsx"
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Commit:

```
git -C c:\sofia-books add frontend/src/components/ui/scroll-area.tsx frontend/src/components/ui/separator.tsx
git -C c:\sofia-books commit -m "chore: remove unused scroll-area and separator UI components"
```

---

## Task 2: Remove unused packages from package.json

**Files:**
- Modify: `frontend/package.json`

Remove `@radix-ui/react-popover`, `@radix-ui/react-scroll-area`, and `@radix-ui/react-separator` from the `dependencies` section. These are direct deps with no direct usage in the codebase.

- [ ] Open `frontend/package.json`. The `dependencies` block currently contains these three lines — delete all three:

```json
"@radix-ui/react-popover": "^1.1.15",
"@radix-ui/react-scroll-area": "^1.2.10",
"@radix-ui/react-separator": "^1.1.8",
```

The resulting `dependencies` block (packages in alphabetical order — maintain sort order):

```json
"dependencies": {
  "@hookform/resolvers": "^5.4.0",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-progress": "^1.1.8",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-slot": "^1.2.4",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.2.15",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@tanstack/react-query": "^5.100.14",
  "axios": "^1.16.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "laravel-echo": "^2.3.4",
  "lucide-react": "^1.16.0",
  "next": "14.2.35",
  "pusher-js": "^8.5.0",
  "react": "^18",
  "react-dom": "^18",
  "react-hook-form": "^7.76.1",
  "tailwind-merge": "^3.6.0",
  "tailwindcss-animate": "^1.0.7",
  "zod": "^4.4.3"
},
```

- [ ] Update `package-lock.json` by running npm install in the frontend directory:

```
cd c:\sofia-books\frontend && npm install
```

Expected: no new packages installed; lock file updated to remove the 3 packages.

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors. (The packages are still in the container's node_modules until a rebuild — this step just keeps `package.json` honest.)

- [ ] Commit:

```
git -C c:\sofia-books add frontend/package.json frontend/package-lock.json
git -C c:\sofia-books commit -m "chore: remove unused radix-ui packages (popover, scroll-area, separator)"
```

---

## Task 3: Replace root page with redirect

**Files:**
- Modify: `frontend/src/app/page.tsx`

The current file renders the default Next.js boilerplate (Vercel logos, links to nextjs.org). Replace it entirely with a server-side redirect to `/login`.

- [ ] Replace the entire contents of `frontend/src/app/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Commit:

```
git -C c:\sofia-books add frontend/src/app/page.tsx
git -C c:\sofia-books commit -m "chore: replace Next.js boilerplate root page with login redirect"
```

---

## Task 4: Remove role guard from admin layout

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`

The layout currently has a `useEffect` that checks `localStorage` for `sofia_user` and redirects if the role is not `admin`. This fires after the first render (causing a flash) and is redundant — `middleware.ts` already enforces this at the edge.

- [ ] Replace the entire contents of `frontend/src/app/admin/layout.tsx` with:

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

Note: `'use client'`, `useEffect`, and `useRouter` are all removed. `Topbar` is itself `'use client'` — Next.js handles this automatically; the layout file does not need the directive.

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Commit:

```
git -C c:\sofia-books add frontend/src/app/admin/layout.tsx
git -C c:\sofia-books commit -m "perf: remove redundant client-side role guard from admin layout"
```

---

## Task 5: Remove role guard from accountant layout

**Files:**
- Modify: `frontend/src/app/accountant/layout.tsx`

Same pattern as Task 4 — the `useEffect` checks `role !== 'accountant'` but middleware already enforces this.

- [ ] Replace the entire contents of `frontend/src/app/accountant/layout.tsx` with:

```tsx
import { Topbar } from '@/components/layout/Topbar'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
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

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Commit:

```
git -C c:\sofia-books add frontend/src/app/accountant/layout.tsx
git -C c:\sofia-books commit -m "perf: remove redundant client-side role guard from accountant layout"
```

---

## Task 6: Remove role guard from client layout

**Files:**
- Modify: `frontend/src/app/client/layout.tsx`

Same pattern — `role !== 'client'` guard removed. Middleware handles it.

- [ ] Replace the entire contents of `frontend/src/app/client/layout.tsx` with:

```tsx
import { Topbar } from '@/components/layout/Topbar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Commit:

```
git -C c:\sofia-books add frontend/src/app/client/layout.tsx
git -C c:\sofia-books commit -m "perf: remove redundant client-side role guard from client layout"
```

---

## Task 7: Final verification

- [ ] Run a final TypeScript check across the whole frontend:

```
docker exec sofia-frontend npx tsc --noEmit
```

Expected: zero errors.

- [ ] Confirm deleted files are gone (run in PowerShell):

```powershell
Test-Path "c:\sofia-books\frontend\src\components\ui\scroll-area.tsx"
Test-Path "c:\sofia-books\frontend\src\components\ui\separator.tsx"
```

Expected: both print `False`.

- [ ] Confirm layouts have no role guard remaining (run in PowerShell):

```powershell
Select-String -Path "c:\sofia-books\frontend\src\app\admin\layout.tsx","c:\sofia-books\frontend\src\app\accountant\layout.tsx","c:\sofia-books\frontend\src\app\client\layout.tsx" -Pattern "sofia_user"
```

Expected: no output (zero matches).
