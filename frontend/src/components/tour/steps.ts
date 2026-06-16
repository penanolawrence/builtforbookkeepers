import type { TourStep } from './types'

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'dashboard-greeting',
    title: 'Meet your AI co-pilot',
    body: "This is your AI co-pilot. It flags what needs your attention so you don't have to dig for it.",
  },
  {
    targetId: 'dashboard-tiers',
    title: 'Your queue, pre-sorted',
    body: 'Every document is automatically sorted into four buckets: Needs review, Check needed, Ready to approve, and Pending entries.',
  },
  {
    targetId: 'dashboard-clients',
    title: 'Your clients at a glance',
    body: 'All clients assigned to you, with live counts per bucket so you know where to focus first.',
  },
  {
    targetId: 'dashboard-week',
    title: 'Your weekly stats',
    body: "See how many entries you've processed, how much was auto-categorized, and time saved this week.",
  },
  {
    targetId: 'dashboard-go-queue',
    fallbackTargetId: 'dashboard-go-queue-mobile',
    title: "Let's check the queue",
    body: "This button takes you to the Review Queue, where you'll actually approve documents. Let's go take a look.",
  },
]

export const QUEUE_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'queue-filters',
    title: 'Narrow things down',
    body: 'Filter the queue by client or by flag to focus on what matters right now.',
  },
  {
    targetId: 'queue-list',
    title: 'Red, Yellow, Green',
    body: 'Red needs your eyes on an anomaly. Yellow is missing a receipt. Green is pre-sorted and ready to approve.',
  },
  {
    targetId: 'queue-batch-approve',
    title: 'Approve in bulk',
    body: 'Select Green items with the checkboxes, then approve them all at once with this button.',
  },
]

export const CLIENT_DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'client-dash-mascot',
    fallbackTargetId: 'client-dash-greeting',
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
    fallbackTargetId: 'client-dash-upload-btn-mobile',
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
