"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Calendar,
  Users,
  ClipboardList,
  Dumbbell,
  Apple,
  LineChart,
  MessageSquare,
  FileText,
  Sparkles,
  Settings,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "@/components/logout-button";
import { BusquedaGlobal } from "@/components/busqueda-global";

const GRUPOS: {
  titulo: string | null;
  enlaces: { href: string; label: string; Icon: typeof Home }[];
}[] = [
  {
    titulo: null,
    enlaces: [
      { href: "/inicio", label: "Inicio", Icon: Home },
      { href: "/asistente", label: "Asistente", Icon: Sparkles },
    ],
  },
  {
    titulo: "Gestión",
    enlaces: [
      { href: "/clientas", label: "Clientas", Icon: Users },
      { href: "/clientas/comparativa", label: "Comparativa", Icon: LineChart },
      { href: "/calendario", label: "Calendario", Icon: Calendar },
      { href: "/formularios", label: "Formularios", Icon: FileText },
      { href: "/mensajes", label: "Mensajes", Icon: MessageSquare },
    ],
  },
  {
    titulo: "Biblioteca",
    enlaces: [
      { href: "/programas", label: "Programas", Icon: ClipboardList },
      { href: "/ejercicios", label: "Ejercicios", Icon: Dumbbell },
      { href: "/nutricion", label: "Nutrición", Icon: Apple },
    ],
  },
];

const ENLACE_AJUSTES = { href: "/ajustes", label: "Ajustes", Icon: Settings };

const TODOS_HREFS = [
  ...GRUPOS.flatMap((g) => g.enlaces.map((e) => e.href)),
  ENLACE_AJUSTES.href,
];

export function Sidebar({
  coachLabel,
  badgeMensajes = 0,
}: {
  coachLabel: string;
  badgeMensajes?: number;
}) {
  const pathname = usePathname() ?? "";
  const [abierta, setAbierta] = useState(false);

  // El enlace activo es el de coincidencia de prefijo MÁS LARGA, para que
  // "/clientas/comparativa" gane a "/clientas" y no se marquen ambos.
  const hrefActivo = (() => {
    let best: string | null = null;
    for (const h of TODOS_HREFS) {
      if ((pathname === h || pathname.startsWith(h + "/")) && (!best || h.length > best.length)) {
        best = h;
      }
    }
    return best;
  })();

  function esActiva(href: string) {
    return href === hrefActivo;
  }

  function getBadge(href: string): number {
    if (href === "/mensajes") return badgeMensajes;
    return 0;
  }

  return (
    <>
      {/* Botón hamburguesa (solo móvil) */}
      <button
        onClick={() => setAbierta(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300"
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      {/* Overlay para cerrar tocando fuera (móvil) */}
      {abierta && (
        <div
          onClick={() => setAbierta(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          aria-hidden
        />
      )}

      <aside
        className={
          "w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col fixed md:sticky top-0 left-0 h-screen z-40 transition-transform " +
          (abierta ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
      >
        <div className="px-5 py-5 border-b border-neutral-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-semibold">mi-hub</div>
            <div className="text-xs text-neutral-500 mt-0.5 truncate">
              {coachLabel}
            </div>
          </div>
          <button
            onClick={() => setAbierta(false)}
            className="md:hidden p-1 text-neutral-500 hover:text-neutral-200"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          <BusquedaGlobal />
        </div>

        <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto">
          {GRUPOS.map((grupo, gi) => (
            <div key={gi} className="space-y-0.5">
              {grupo.titulo && (
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                  {grupo.titulo}
                </div>
              )}
              {grupo.enlaces.map((e) => {
                const activa = esActiva(e.href);
                const badge = getBadge(e.href);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    onClick={() => setAbierta(false)}
                    className={
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition " +
                      (activa
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-300 hover:bg-neutral-900 hover:text-white")
                    }
                    style={
                      activa
                        ? { borderLeft: "2px solid var(--brand)", paddingLeft: "10px" }
                        : undefined
                    }
                  >
                    <e.Icon
                      size={16}
                      className={activa ? "" : "text-neutral-500"}
                      style={activa ? { color: "var(--brand)" } : undefined}
                    />
                    <span className="flex-1">{e.label}</span>
                    {badge > 0 && (
                      <span
                        className="text-[10px] text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center font-medium"
                        style={{ backgroundColor: "var(--brand)" }}
                        aria-label={`${badge} sin leer`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-2">
          <Link
            href={ENLACE_AJUSTES.href}
            onClick={() => setAbierta(false)}
            className={
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition " +
              (esActiva(ENLACE_AJUSTES.href)
                ? "bg-neutral-900 text-white"
                : "text-neutral-300 hover:bg-neutral-900 hover:text-white")
            }
            style={
              esActiva(ENLACE_AJUSTES.href)
                ? { borderLeft: "2px solid var(--brand)", paddingLeft: "10px" }
                : undefined
            }
          >
            <ENLACE_AJUSTES.Icon
              size={16}
              className={esActiva(ENLACE_AJUSTES.href) ? "" : "text-neutral-500"}
              style={
                esActiva(ENLACE_AJUSTES.href)
                  ? { color: "var(--brand)" }
                  : undefined
              }
            />
            <span>{ENLACE_AJUSTES.label}</span>
          </Link>
        </div>

        <div className="p-3 border-t border-neutral-800">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
