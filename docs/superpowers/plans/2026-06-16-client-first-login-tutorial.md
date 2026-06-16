# Client First-Login Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-role first-login product tour covering the Client Dashboard and Upload pages, chained together and replayable from the Help page — reusing the existing tour engine built for the accountant tutorial.

**Architecture:** Pure content + wiring addition on top of the existing `useTour`/`TourOverlay`/`tourSession` engine. No backend changes (the `hasSeenTutorial` flag and `PATCH /api/me/tutorial` endpoint already exist and are role-agnostic). Two new step lists are added to `tour/steps.ts`, the `TourContinueTarget` union is widened by one value, the client Dashboard and Upload pages get `data-tour` attributes and `useTour` wiring mirroring the accountant Dashboard/Queue pages, and `ReplayTutorialButton` is extended to branch by role instead of hard-gating to `accountant`.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Testing Library / Jest.

**Spec:** `docs/superpowers/specs/2026-06-16-client-first-login-tutorial-design.md`

---

### Task 1: Widen `TourContinueTarget` to support the client→upload handoff

**Files:**
- Modify: `frontend/src/components/tour/tourSession.ts`
- Test: `frontend/src/components/tour/__tests__/tourSession.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('tourSession', ...)` block in `frontend/src/components/tour/__tests__/tourSession.test.ts`:

```typescript
  it('accepts client-upload as a valid continue target', () => {
    setTourContinueFlag('client-upload')
    expect(getTourContinueFlag()).toBe('client-upload')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tourSession.test.ts -t "client-upload"`
Expected: FAIL — TypeScript compile error, `'client-upload'` is not assignable to type `TourContinueTarget`.

- [ ] **Step 3: Widen the type and the parser**

In `frontend/src/components/tour/tourSession.ts`, replace:

```typescript
export type TourContinueTarget = 'dashboard' | 'queue'
```

with:

```typescript
export type TourContinueTarget = 'dashboard' | 'queue' | 'client-upload'
```

And replace:

```typescript
export function getTourContinueFlag(): TourContinueTarget | null {
  const value = sessionStorage.getItem(KEY)
  return value === 'dashboard' || value === 'queue' ? value : null
}
```

with:

```typescript
export function getTourContinueFlag(): TourContinueTarget | null {
  const value = sessionStorage.getItem(KEY)
  return value === 'dashboard' || value === 'queue' || value === 'client-upload' ? value : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tourSession.test.ts`
Expected: PASS (all tests in the file, including the new one)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tour/tourSession.ts frontend/src/components/tour/__tests__/tourSession.test.ts
git commit -m "feat: add client-upload tour continue target"
```

---

### Task 2: Add client dashboard and upload tour step content

**Files:**
- Modify: `frontend/src/components/tour/steps.ts`

There is no dedicated test file for step content (the existing `DASHBOARD_TOUR_STEPS`/`QUEUE_TOUR_STEPS` are exercised indirectly through the page tests in Tasks 3 and 5). This task is a direct content addition.

- [ ] **Step 1: Add the two new step lists**

Append to `frontend/src/components/tour/steps.ts` (after the existing `QUEUE_TOUR_STEPS` export):

```typescript
export const CLIENT_DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'client-dash-mascot',
    title: 'Meet your AI co-pilot',
    body: "This is your AI co-pilot. It keeps you posted on what's parked, what's posted, and what needs your attention.",
  },
  {
    targetId: 'client-dash-stats',
    title: 'Your numbers at a glance',
    body: 'See how many documents you sent this month, how many were returned, and your income and expenses from posted entries.',
  },
  {
    targetId: 'client-dash-recent',
    title: 'Track what you sent',
    body: "Every document you upload shows up here, with its current status — Processing, Parked, Posted, or Returned.",
  },
  {
    targetId: 'client-dash-upload-btn',
    title: "Let's upload something",
    body: "This button takes you to the Upload page, where you'll send receipts and invoices to your bookkeeper. Let's go take a look.",
  },
]

export const CLIENT_UPLOAD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'upload-summary-cards',
    title: 'Your month at a glance',
    body: "See how many income and expense files you've uploaded this month, and how many are still in progress.",
  },
  {
    targetId: 'upload-drop-zones',
    title: 'Drop it where it belongs',
    body: "Drop income receipts on the left, expenses on the right. No physical receipt? Use the manual entry button below instead.",
  },
  {
    targetId: 'upload-in-progress',
    title: 'Watch it move',
    body: 'This list shows documents that are still processing, parked, or returned. Once a document is posted, it disappears from this list automatically.',
  },
]
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p frontend/tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tour/steps.ts
git commit -m "feat: add client dashboard and upload tour step content"
```

---

### Task 3: Wire the tour into the Client Dashboard page

**Files:**
- Modify: `frontend/src/app/client/dashboard/page.tsx`
- Modify: `frontend/src/app/client/dashboard/__tests__/page.test.tsx`

This page currently has no tour wiring at all (unlike the accountant dashboard). We first update the test file's mocks to match the accountant dashboard test's shape (so the upcoming tour tests have something to mock against), add the new tour-behavior tests, watch them fail, then implement.

- [ ] **Step 1: Update test mocks and add tour tests**

Replace the full contents of `frontend/src/app/client/dashboard/__tests__/page.test.tsx` with:

```typescript
import { render, screen } from '@testing-library/react'
import type { User } from '@/types/auth'
import type { TourStep } from '@/components/tour/types'
import ClientDashboard from '../page'
import { setTourContinueFlag } from '@/components/tour/tourSession'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
let mockUser: Partial<User> = { name: 'Maria Santos', hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: { step: TourStep }) => <div data-testid="tour-overlay">{step.title}</div>,
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: ({ brief }: { brief?: string }) => (
    <div data-testid="mascot">{brief}</div>
  ),
}))
jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'doc-1',
        refNumber: 'MNL-0012',
        status: 'PARKED',
        declaredType: 'expense',
        amount: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
      {
        id: 'doc-2',
        refNumber: 'MNL-0011',
        status: 'APPROVED',
        declaredType: 'income',
        amount: 10300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
    ],
    isLoading: false,
  }),
}))

afterEach(() => {
  mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
  sessionStorage.clear()
})

function wrap() {
  return render(
    <div data-theme="sofia">
      <ClientDashboard />
    </div>
  )
}

describe('ClientDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good .+, Maria!/)).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText('Total Documents')).toBeInTheDocument()
    expect(screen.getByText('Returned')).toBeInTheDocument()
    expect(screen.getByText(/Income \(/)).toBeInTheDocument()
    expect(screen.getByText(/Expenses \(/)).toBeInTheDocument()
  })

  it('renders Recent Documents section', () => {
    wrap()
    expect(screen.getByText('Recent Documents')).toBeInTheDocument()
  })

  it('renders View all link pointing to /client/documents', () => {
    wrap()
    const link = screen.getByText('View all →')
    expect(link.closest('a')).toHaveAttribute('href', '/client/documents')
  })

  it('renders Recent Activity section', () => {
    wrap()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders Upload a Document link pointing to /client/upload', () => {
    wrap()
    const link = screen.getByText('Upload a Document')
    expect(link.closest('a')).toHaveAttribute('href', '/client/upload')
  })

  it('renders mascot companion with brief mentioning parked count', () => {
    wrap()
    const mascot = screen.getByTestId('mascot')
    expect(mascot.textContent).toMatch(/\b1 document/)
  })

  it('renders status chip for PARKED document', () => {
    wrap()
    expect(screen.getByText('Parked')).toBeInTheDocument()
  })

  it('renders status chip for APPROVED document as Posted', () => {
    wrap()
    expect(screen.getByText('Posted')).toBeInTheDocument()
  })

  it('auto-starts the tour when the user has not seen it', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: false }
    wrap()
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })

  it('does not start the tour when the user has already seen it', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
    wrap()
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument()
  })

  it('starts the tour when the sessionStorage continue flag is set to dashboard, even if already seen', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
    setTourContinueFlag('dashboard')
    wrap()
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest client/dashboard/page.test.tsx`
Expected: the 9 pre-existing tests still PASS; the 3 new tests (`auto-starts the tour...`, `does not start the tour...`, `starts the tour when the sessionStorage continue flag...`) FAIL because `page.tsx` doesn't render any `tour-overlay` yet.

- [ ] **Step 3: Wire the tour into the page**

In `frontend/src/app/client/dashboard/page.tsx`, add these imports after the existing `import type { Document, DocumentStatus } from '@/types/document'` line:

```typescript
import { useRouter } from 'next/navigation'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { useTour } from '@/components/tour/useTour'
import { CLIENT_DASHBOARD_TOUR_STEPS } from '@/components/tour/steps'
import { getTourContinueFlag, setTourContinueFlag, clearTourContinueFlag } from '@/components/tour/tourSession'
```

Replace:

```typescript
export default function ClientDashboard() {
  const { user }    = useAuth()
  const { theme }   = useTheme()
  const { data: docsPage, isLoading } = useQuery({
    queryKey: ['client-docs-all'],
    queryFn:  () => getDocuments({ per_page: 500 }),
  })
```

with:

```typescript
export default function ClientDashboard() {
  const router      = useRouter()
  const { user, markTutorialSeen } = useAuth()
  const { theme }   = useTheme()
  const { data: docsPage, isLoading } = useQuery({
    queryKey: ['client-docs-all'],
    queryFn:  () => getDocuments({ per_page: 500 }),
  })

  const tour = useTour(CLIENT_DASHBOARD_TOUR_STEPS, {
    onFinish: () => {
      setTourContinueFlag('client-upload')
      router.push('/client/upload')
    },
    onSkip: () => {
      clearTourContinueFlag()
      if (!user?.hasSeenTutorial) markTutorialSeen()
    },
  })

  useEffect(() => {
    if (!user) return
    if (!user.hasSeenTutorial || getTourContinueFlag() === 'dashboard') {
      clearTourContinueFlag()
      tour.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.hasSeenTutorial])
```

Add `data-tour="client-dash-mascot"` to the mascot wrapper:

```typescript
        <div className="dashboard-mascot" style={{ width: 430, flexShrink: 0 }}>
```
→
```typescript
        <div className="dashboard-mascot" data-tour="client-dash-mascot" style={{ width: 430, flexShrink: 0 }}>
```

Add `data-tour="client-dash-stats"` to the stat cards row:

```typescript
      <div className="dashboard-stats" style={{ display: 'flex', gap: 16 }}>
```
→
```typescript
      <div className="dashboard-stats" data-tour="client-dash-stats" style={{ display: 'flex', gap: 16 }}>
```

Add `data-tour="client-dash-recent"` to the Recent Documents card (the first child of the bottom grid):

```typescript
        <div style={{
          background: 'var(--t-card)', border: '1px solid var(--t-line)',
          borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)',
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--t-line)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 16, color: 'var(--t-ink)', flex: 1,
            }}>
              Recent Documents
            </span>
```
→
```typescript
        <div data-tour="client-dash-recent" style={{
          background: 'var(--t-card)', border: '1px solid var(--t-line)',
          borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)',
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--t-line)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 16, color: 'var(--t-ink)', flex: 1,
            }}>
              Recent Documents
            </span>
```

Add `data-tour="client-dash-upload-btn"` to the Upload link:

```typescript
          <Link href="/client/upload" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 20px', borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            color: '#fff', textDecoration: 'none',
            background:  'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow:   '0 12px 22px -12px var(--t-primary-deep)',
          }}>
            Upload a Document
          </Link>
```
→
```typescript
          <Link href="/client/upload" data-tour="client-dash-upload-btn" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 20px', borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            color: '#fff', textDecoration: 'none',
            background:  'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow:   '0 12px 22px -12px var(--t-primary-deep)',
          }}>
            Upload a Document
          </Link>
```

Finally, render the overlay just before the closing tag of the root `dashboard-root` div. Replace the file's last 5 lines:

```typescript
        </div>
      </div>
    </div>
  )
}
```

with:

```typescript
        </div>
      </div>

      {tour.isActive && tour.currentStep && (
        <TourOverlay
          step={tour.currentStep}
          stepNumber={tour.currentIndex + 1}
          totalSteps={tour.total}
          theme={theme}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
          nextLabel={tour.currentIndex === tour.total - 1 ? 'Go to Upload' : undefined}
        />
      )}
    </div>
  )
}
```

(The first `</div>` closes the sidebar column, the second closes the `dashboard-grid` row — the tour block is inserted between that and the closing `</div>` of the root `dashboard-root` container.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest client/dashboard/page.test.tsx`
Expected: PASS — all 12 tests (9 original + 3 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/client/dashboard/page.tsx frontend/src/app/client/dashboard/__tests__/page.test.tsx
git commit -m "feat: wire first-login tour into client dashboard"
```

---

### Task 4: Add a tour target around the upload drop zones

**Files:**
- Modify: `frontend/src/components/upload/TwoAreaUpload.tsx`
- Test: `frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx`, inside the existing `describe('TwoAreaUpload', ...)` block:

```typescript
  it('wraps both zones in a data-tour target for the upload tour', () => {
    const { container } = wrap()
    const target = container.querySelector('[data-tour="upload-drop-zones"]')
    expect(target).not.toBeNull()
    expect(target?.textContent).toContain('Income')
    expect(target?.textContent).toContain('Expense')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest TwoAreaUpload.test.tsx -t "data-tour target"`
Expected: FAIL — `target` is `null`.

- [ ] **Step 3: Add the attribute**

In `frontend/src/components/upload/TwoAreaUpload.tsx`, replace:

```typescript
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadZone
          declaredType="income"
          onFilesSelect={(files) => onFilePicked(files, 'income')}
          count={incomeCount}
        />
        <UploadZone
          declaredType="expense"
          onFilesSelect={(files) => onFilePicked(files, 'expense')}
          count={expenseCount}
        />
      </div>
```

with:

```typescript
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="upload-drop-zones">
        <UploadZone
          declaredType="income"
          onFilesSelect={(files) => onFilePicked(files, 'income')}
          count={incomeCount}
        />
        <UploadZone
          declaredType="expense"
          onFilesSelect={(files) => onFilePicked(files, 'expense')}
          count={expenseCount}
        />
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest TwoAreaUpload.test.tsx`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/upload/TwoAreaUpload.tsx frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx
git commit -m "feat: add tour target around upload drop zones"
```

---

### Task 5: Wire the tour into the Upload page

**Files:**
- Modify: `frontend/src/app/client/upload/page.tsx`
- Create: `frontend/src/app/client/upload/__tests__/page.test.tsx`

There is no existing test file for this page. We create one focused on the tour behavior, mocking out the document-upload machinery the same way `QueuePageContent.test.tsx` mocks out queue machinery to isolate the tour logic.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/client/upload/__tests__/page.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import type { User } from '@/types/auth'
import type { TourStep } from '@/components/tour/types'
import UploadPage from '../page'
import { setTourContinueFlag, getTourContinueFlag } from '@/components/tour/tourSession'

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { data: [] }, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))
jest.mock('@/lib/api/documents', () => ({
  uploadDocument: jest.fn(),
  getDocuments: jest.fn(),
  reuploadDocument: jest.fn(),
  cancelDocument: jest.fn(),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/components/upload/TwoAreaUpload', () => ({
  TwoAreaUpload: () => <div data-testid="two-area-upload" />,
}))
jest.mock('@/components/upload/ConfirmUploadDialog', () => ({
  ConfirmUploadDialog: () => null,
}))
jest.mock('@/components/documents/DocumentsTable', () => ({
  DocumentsTable: () => <div data-testid="documents-table" />,
}))
jest.mock('@/components/documents/DocumentDetailModal', () => ({
  DocumentDetailModal: () => null,
}))
let mockUser: Partial<User> = { hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: { step: TourStep }) => <div data-testid="tour-overlay">{step.title}</div>,
}))

describe('UploadPage tour', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockUser = { hasSeenTutorial: true }
    mockMarkTutorialSeen.mockClear()
  })

  it('does not start the upload tour when no continue flag is set', () => {
    render(<UploadPage />)
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument()
  })

  it('auto-starts the upload tour when the dashboard tour set the continue flag', () => {
    setTourContinueFlag('client-upload')
    render(<UploadPage />)
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })

  it('consumes the continue flag so it does not retrigger on remount', () => {
    setTourContinueFlag('client-upload')
    render(<UploadPage />)
    expect(getTourContinueFlag()).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest client/upload/page.test.tsx`
Expected: FAIL on all 3 — the page doesn't read the continue flag or render any `tour-overlay` yet.

- [ ] **Step 3: Wire the tour into the page**

In `frontend/src/app/client/upload/page.tsx`, change the React import from:

```typescript
import { useState } from 'react'
```

to:

```typescript
import { useState, useEffect } from 'react'
```

Add these imports after `import { SummaryCard } from '@/components/shared/SummaryCard'`:

```typescript
import { useAuth } from '@/lib/hooks/useAuth'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { useTour } from '@/components/tour/useTour'
import { CLIENT_UPLOAD_TOUR_STEPS } from '@/components/tour/steps'
import { getTourContinueFlag, clearTourContinueFlag } from '@/components/tour/tourSession'
```

Replace:

```typescript
export default function UploadPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
```

with:

```typescript
export default function UploadPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user, markTutorialSeen } = useAuth()

  const tour = useTour(CLIENT_UPLOAD_TOUR_STEPS, {
    onFinish: () => {
      clearTourContinueFlag()
      if (!user?.hasSeenTutorial) markTutorialSeen()
    },
    onSkip: () => {
      clearTourContinueFlag()
      if (!user?.hasSeenTutorial) markTutorialSeen()
    },
  })

  useEffect(() => {
    if (getTourContinueFlag() === 'client-upload') {
      clearTourContinueFlag()
      tour.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

Add `data-tour="upload-summary-cards"` to the summary cards row:

```typescript
      <div className="grid grid-cols-3 gap-2 md:flex md:gap-[14px] mb-[22px]">
```
→
```typescript
      <div className="grid grid-cols-3 gap-2 md:flex md:gap-[14px] mb-[22px]" data-tour="upload-summary-cards">
```

Add `data-tour="upload-in-progress"` to the In Progress table wrapper:

```typescript
      <div className="mt-4">
        <DocumentsTable
```
→
```typescript
      <div className="mt-4" data-tour="upload-in-progress">
        <DocumentsTable
```

Render the overlay right after the `<DocumentDetailModal ... />` block, before the root `</div>`:

```typescript
      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
        onCancel={handleCancel}
      />
    </div>
  )
}
```
→
```typescript
      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
        onCancel={handleCancel}
      />

      {tour.isActive && tour.currentStep && (
        <TourOverlay
          step={tour.currentStep}
          stepNumber={tour.currentIndex + 1}
          totalSteps={tour.total}
          theme="sofia"
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest client/upload/page.test.tsx`
Expected: PASS (all 3 tests)

Also run the full test suite for this file's neighbors to make sure nothing else broke:

Run: `npx jest frontend/src/app/client/upload`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/client/upload/page.tsx frontend/src/app/client/upload/__tests__/page.test.tsx
git commit -m "feat: wire upload-page tour continuation after client dashboard tour"
```

---

### Task 6: Extend the Replay button to support the client role

**Files:**
- Modify: `frontend/src/components/help/ReplayTutorialButton.tsx`
- Modify: `frontend/src/components/help/__tests__/ReplayTutorialButton.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `frontend/src/components/help/__tests__/ReplayTutorialButton.test.tsx` with:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import type { User } from '@/types/auth'
import { ReplayTutorialButton } from '../ReplayTutorialButton'
import { getTourContinueFlag } from '@/components/tour/tourSession'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

let mockUser: Partial<User> = { role: 'accountant' }
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('ReplayTutorialButton', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockPush.mockClear()
    mockUser = { role: 'accountant' }
  })

  it('renders for an accountant', () => {
    render(<ReplayTutorialButton />)
    expect(screen.getByRole('button', { name: 'Replay tutorial' })).toBeInTheDocument()
  })

  it('renders for a client', () => {
    mockUser = { role: 'client' }
    render(<ReplayTutorialButton />)
    expect(screen.getByRole('button', { name: 'Replay tutorial' })).toBeInTheDocument()
  })

  it('does not render for an admin', () => {
    mockUser = { role: 'admin' }
    render(<ReplayTutorialButton />)
    expect(screen.queryByRole('button', { name: 'Replay tutorial' })).not.toBeInTheDocument()
  })

  it('sets the dashboard continue flag and navigates to the accountant dashboard for an accountant', () => {
    mockUser = { role: 'accountant' }
    render(<ReplayTutorialButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))
    expect(getTourContinueFlag()).toBe('dashboard')
    expect(mockPush).toHaveBeenCalledWith('/accountant/dashboard')
  })

  it('sets the dashboard continue flag and navigates to the client dashboard for a client', () => {
    mockUser = { role: 'client' }
    render(<ReplayTutorialButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))
    expect(getTourContinueFlag()).toBe('dashboard')
    expect(mockPush).toHaveBeenCalledWith('/client/dashboard')
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest ReplayTutorialButton.test.tsx`
Expected: the original 2 surviving tests (renders for accountant, does not render for admin, sets flag for accountant) PASS; `renders for a client` and `sets the dashboard continue flag and navigates to the client dashboard for a client` FAIL because the component currently returns `null` for any non-accountant role.

- [ ] **Step 3: Implement role branching**

Replace the full contents of `frontend/src/components/help/ReplayTutorialButton.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { setTourContinueFlag } from '@/components/tour/tourSession'

const REPLAY_TARGET: Record<string, string> = {
  accountant: '/accountant/dashboard',
  client: '/client/dashboard',
}

export function ReplayTutorialButton() {
  const router = useRouter()
  const { user } = useAuth()

  const target = user?.role ? REPLAY_TARGET[user.role] : undefined
  if (!target) return null

  const replayTutorial = () => {
    setTourContinueFlag('dashboard')
    router.push(target)
  }

  return (
    <button
      type="button"
      onClick={replayTutorial}
      style={{
        marginTop: 16,
        background: 'none',
        border: '1px solid var(--t-line)',
        borderRadius: 10,
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--t-primary)',
      }}
    >
      Replay tutorial
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest ReplayTutorialButton.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/help/ReplayTutorialButton.tsx frontend/src/components/help/__tests__/ReplayTutorialButton.test.tsx
git commit -m "feat: extend replay tutorial button to support the client role"
```

---

### Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npx jest`
Expected: PASS, zero failures, including all files touched in Tasks 1–6 and anything that imports them (e.g. `HelpPageContent`, `accountant/dashboard/page.test.tsx`, `QueuePageContent.test.tsx`).

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd frontend && npx eslint src/app/client/dashboard/page.tsx src/app/client/upload/page.tsx src/components/upload/TwoAreaUpload.tsx src/components/help/ReplayTutorialButton.tsx src/components/tour/tourSession.ts src/components/tour/steps.ts`
Expected: no errors.

No commit for this task — it's a verification checkpoint. If anything fails, fix it within the task where the issue originated and re-commit there.
