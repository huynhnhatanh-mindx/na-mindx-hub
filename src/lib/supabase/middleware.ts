import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname;

  // Allow static assets, API routes, and public files without interception
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allowed public routes for unauthenticated guests
  const publicRoutes = [
    '/',
    '/upload',
    '/submissions',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/contact-admin',
  ]

  const isPublicRoute = publicRoutes.some(path => pathname === path || (path !== '/' && pathname.startsWith(path)))

  // 1. Unauthenticated users — block non-public routes & redirect to /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Authenticated users — check Google Drive connection requirement
  if (user && pathname !== '/google-setup' && pathname !== '/login') {
    let profile: any = null;
    if (user.id) {
      const { data } = await supabase.from('profiles').select('google_refresh_token').eq('id', user.id).maybeSingle();
      profile = data;
    }

    if (!profile && user.email) {
      const usernamePart = user.email.split('@')[0];
      const { data } = await supabase.from('profiles').select('google_refresh_token').or(`username.eq.${usernamePart},email.eq.${user.email}`).maybeSingle();
      profile = data;
    }

    // If user has not linked Google Drive -> Block all routes and redirect to /google-setup
    if (!profile || !profile.google_refresh_token || profile.google_refresh_token === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/google-setup'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
