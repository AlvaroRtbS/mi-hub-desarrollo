import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esRutaPublica =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/p/") || // programa compartido por link público
    path.startsWith("/i/") || // invitación de clienta (acepta sin login)
    path.startsWith("/api/whatsapp/") || // webhook entrante
    path.startsWith("/api/pasos/"); // ingesta de pasos (atajo iPhone, token propio)

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si está logueado, decidir si es coach o clienta y redirigir a su zona
  if (user) {
    // Solo necesitamos comprobar cuando va a /login o a la raíz; el resto
    // del panel ya está protegido por su layout.
    if (path.startsWith("/login") || path === "/") {
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const url = request.nextUrl.clone();
      url.pathname = coach ? "/inicio" : "/c/hoy";
      return NextResponse.redirect(url);
    }

    // Bloquear acceso cruzado: una clienta no debería poder entrar al panel
    // de coach (y viceversa). Si lo intenta, redirige a su zona.
    const esRutaCoach =
      path.startsWith("/clientas") ||
      path.startsWith("/programas") ||
      path.startsWith("/ejercicios") ||
      path.startsWith("/calendario") ||
      path.startsWith("/nutricion") ||
      path.startsWith("/metricas") ||
      path.startsWith("/mensajes") ||
      path.startsWith("/inicio");

    const esRutaClienta = path.startsWith("/c/");

    if (esRutaCoach || esRutaClienta) {
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (esRutaCoach && !coach) {
        const url = request.nextUrl.clone();
        url.pathname = "/c/hoy";
        return NextResponse.redirect(url);
      }
      if (esRutaClienta && coach) {
        const url = request.nextUrl.clone();
        url.pathname = "/inicio";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Excluimos estáticos e imágenes y los ficheros públicos de la PWA
    // (manifest, service worker y página offline) para que se sirvan directos
    // sin pasar por la redirección de sesión a /login.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
