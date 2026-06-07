import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbProps {
  crumbs: Crumb[]
}

export function Breadcrumb({ crumbs }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 mb-[18px] text-[13px] text-t-muted">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-t-faint flex-none" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-t-ink transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold text-t-ink" aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
