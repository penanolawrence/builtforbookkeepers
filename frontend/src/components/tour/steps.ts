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
