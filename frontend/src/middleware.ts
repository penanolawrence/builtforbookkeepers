import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const role = req.cookies.get('b4b_role')?.value
  const status = req.cookies.get('b4b_status')?.value
  const path = req.nextUrl.pathname

  if (
    path.startsWith('/login') ||
    path.startsWith('/setup') ||
    path.startsWith('/blocked')
  ) {
    return NextResponse.next()
  }

  if (!role) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (
    role === 'client' &&
    (status === 'SUSPENDED' || status === 'INACTIVE') &&
    path !== '/blocked'
  ) {
    return NextResponse.redirect(new URL('/blocked', req.url))
  }

  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }
  if (path.startsWith('/accountant') && role !== 'accountant') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }
  if (path.startsWith('/client') && role !== 'client') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
