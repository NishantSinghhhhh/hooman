import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // If accessing /dashboard (without ID), redirect to user-specific dashboard
    if (pathname === '/dashboard' && token?.userId) {
      return NextResponse.redirect(new URL(`/dashboard/${token.userId}`, req.url))
    }

    // If accessing /dashboard/[id], check if it's their own dashboard
    if (pathname.startsWith('/dashboard/')) {
      const urlUserId = pathname.split('/dashboard/')[1]
      if (urlUserId !== token?.userId) {
        // Redirect to their own dashboard if trying to access someone else's
        return NextResponse.redirect(new URL(token?.userId ? `/dashboard/${token.userId}` : '/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Protect dashboard routes
        if (pathname.startsWith('/dashboard')) {
          return !!token // Only allow if token exists
        }
        
        return true
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    // Don't protect login page
  ]
}