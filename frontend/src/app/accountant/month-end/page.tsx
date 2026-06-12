import { MonthEndPage } from '@/components/month-end/MonthEndPage'

export const metadata = { title: 'Month-End Closing' }

export default function AccountantMonthEndPage() {
  return <MonthEndPage showAccountantFilter={false} />
}
