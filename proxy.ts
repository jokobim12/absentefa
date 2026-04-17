import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Halaman publik — tidak perlu auth
  const publicPaths = ['/login', '/register', '/'];
  if (publicPaths.includes(pathname)) {
    // Jika sudah login, cek profile dulu
    if (user && (pathname === '/login' || pathname === '/register')) {
      const { data: profile } = await supabase.from('users').select('status, role').eq('id', user.id).single();
      if (profile && (profile.status === 'pending' || profile.status === 'rejected')) {
         return NextResponse.redirect(new URL('/pending', request.url));
      }
      return NextResponse.redirect(new URL('/absen', request.url));
    }
    return supabaseResponse;
  }

  // Jika belum login, redirect ke login (tapi abaikan rute API)
  if (!user && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login, kita butuh profil untuk cek status dan role
  if (user && !pathname.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Jika profile tidak ada, bisa jadi trigger belum selesai, redirect amannya ke login.
      return supabaseResponse; 
    }

    // Jika pending atau rejected, paksa ke /pending
    if ((profile.status === 'pending' || profile.status === 'rejected') && pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }

    // Jika mengakses halaman admin yang butuh role admin
    if (pathname.startsWith('/admin')) {
      if (profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/absen', request.url));
      }
    }
    
    // Jika sudah approved tapi akses /pending, balikan ke /absen
    if (profile.status === 'approved' && pathname === '/pending') {
      return NextResponse.redirect(new URL('/absen', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
