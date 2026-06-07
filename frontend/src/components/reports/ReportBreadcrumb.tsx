import Link from 'next/link'

interface Props {
  title: string
}

export function ReportBreadcrumb({ title }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-t-faint mb-1.5">
      <Link href="/client/reports" className="text-t-primary font-medium hover:underline">
        Reports
      </Link>
      <span>›</span>
      <span>{title}</span>
    </div>
  )
}
