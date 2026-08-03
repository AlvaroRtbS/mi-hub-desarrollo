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
    path.startsWith("/auth/") || // callback de magic link / recuperación
    path.startsWith("/reset-password") || // fijar nueva contraseña
    path.startsWith("/p/") || // programa compartido por link público
    path.startsWith("/i/") || // invitación de clienta (acepta sin login)
    path.startsWith("/legal/") || // privacidad: el RGPD obliga a informar ANTES
    // de crear la cuenta, así que no puede exigir sesión
    path.startsWith("/api/whatsapp/") || // webhook entrante
    path.startsWith("/api/pasos/") || // ingesta de pasos (atajo iPhone, token propio)
    path.startsWith("/api/consentimientos/") || // firma de contrato (Google Form, secreto propio)
    path === "/api/ping"; // keep-alive de Supabase (cron de Vercel)

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
    // Regla robusta (no una lista que se queda coja con rutas nuevas):
    //   - /c/* es zona de clienta.
    //   - /api/* gestiona su propia auth (no redirigir, devolvería HTML).
    //   - lo público ya se filtró arriba.
    //   - TODO lo demás del panel es zona de coach.
    const esRutaClienta = path.startsWith("/c/");
    const esRutaCoach =
      !esRutaClienta && !esRutaPublica && !path.startsWith("/api/");

    if (esRutaCoach || esRutaClienta) {
      const { data: coach, error: errorCoach } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Si la consulta falla (red/BD), no podemos saber el rol: dejamos pasar
      // y que decida el layout del panel (que también comprueba el rol). Así un
      // fallo transitorio no expulsa al coach a la vista de clienta. Los datos
      // siguen protegidos por RLS en cualquier caso.
      if (errorCoach) return response;

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
