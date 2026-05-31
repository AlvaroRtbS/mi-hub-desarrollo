"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Apple,
  Ruler,
  Camera,
  MessageCircle,
} from "lucide-react";

type Tab = { href: string; label: string; badge?: number };

const ICONS = {
  "/c/hoy": Home,
  "/c/programa": ClipboardList,
  "/c/nutricion": Apple,
  "/c/metricas": Ruler,
  "/c/fotos": Camera,
  "/c/mensajes": MessageCircle,
} as const;

export function TabBar({
  tabs,
  colorMarca,
}: {
  tabs: Tab[];
  colorMarca: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950 z-10 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-6">
        {tabs.map((t) => {
          const Icon = ICONS[t.href as keyof typeof ICONS];
          const activa = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center py-2 text-[10px] transition relative"
              style={{
                color: activa ? colorMarca : undefined,
              }}
            >
              {activa && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: colorMarca }}
                />
              )}
              <span className="relative">
                {Icon && <Icon size={20} strokeWidth={activa ? 2 : 1.75} />}
                {t.badge != null && t.badge > 0 && (
                  <span
                    className="absolute -top-1 -right-2 text-[9px] text-white px-1 rounded-full min-w-[1rem] text-center font-medium"
                    style={{ backgroundColor: colorMarca }}
                    aria-label={`${t.badge} sin leer`}
                  >
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </span>
              <span className="mt-0.5">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
