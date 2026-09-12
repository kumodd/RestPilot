import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database.types'

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin']
const AUTH_ROUTES = ['/auth/login']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based routing
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !(profile as any).is_active) {
      // If inactive or missing profile, clear session or redirect
      const loginUrl = new URL('/auth/login?error=account_inactive', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const role = (profile as any).role

    // Admin restrictions
    if (pathname.startsWith('/admin') && role !== 'platform_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Waiter restrictions
    if (role === 'waiter') {
      const isAllowed = pathname === '/dashboard' || 
        pathname.match(/^\/dashboard\/[^\/]+(\/)?$/) || 
        pathname.match(/^\/dashboard\/[^\/]+\/[^\/]+\/(orders|tables)($|\/)/)
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Chef/Kitchen restrictions
    if (role === 'chef' || role === 'kitchen_manager') {
      const isAllowed = pathname === '/dashboard' || 
        pathname.match(/^\/dashboard\/[^\/]+(\/)?$/) || 
        pathname.match(/^\/dashboard\/[^\/]+\/[^\/]+\/(kitchen)($|\/)/)
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    
    // Cashier restrictions
    if (role === 'cashier') {
      const isAllowed = pathname === '/dashboard' || 
        pathname.match(/^\/dashboard\/[^\/]+(\/)?$/) || 
        pathname.match(/^\/dashboard\/[^\/]+\/[^\/]+\/(cashier|orders)($|\/)/)
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}
