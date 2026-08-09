import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Anyone can browse the site freely. Only creating a profile or visiting the
// admin panel requires being logged in — reacting/reporting are gated inline
// in their own components instead (they just prompt "log in" on click).
const PROTECTED_PREFIXES = ['/create', '/admin', '/my-profiles'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    // Send first-time visitors to /create straight to registration (not login) —
    // most people clicking "share" won't have an account yet. /admin still isn't
    // reachable this way since only real admins pass the role check below.
    const destination = path.startsWith('/create') ? '/register' : '/login';
    const redirectUrl = new URL(destination, request.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/create/:path*', '/admin/:path*', '/my-profiles/:path*'],
};
