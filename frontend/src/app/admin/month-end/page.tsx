import { MonthEndPage } from '@/components/month-end/MonthEndPage'

export const metadata = { title: 'Month-End Closing' }

export default function AdminMonthEndPage() {
  return <MonthEndPage showAccountantFilter={true} />
}
