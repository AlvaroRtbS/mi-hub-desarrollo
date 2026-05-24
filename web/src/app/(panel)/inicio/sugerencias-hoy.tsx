import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MessageSquare,
  Camera,
  Flame,
  Calendar,
  TrendingUp,
  Sparkles,
} from "lucide-react";

type Sesion = {
  fecha: string;
  completada: boolean;
  clienta_id: string;
};

type Sugerencia = {
  id: string;
  tipo: "felicitar" | "contactar" | "pedir_foto" | "celebrar_metricas" | "resumen";
  icono: React.ReactNode;
  iconoColor: string;
  titulo: string;
  detalle: string;
  href: string;
};

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  return Math.floor(
    (new Date(b + "T00:00:00Z").getTime() -
      new Date(a + "T00:00:00Z").getTime()) /
      86400000
  );
}

/**
 * Widget "Sugerencias para hoy" — detecta oportunidades concretas para
 * que la coach actúe: felicitar rachas, contactar inactividad, pedir
 * fotos pendientes, celebrar evolución de métricas, hacer check-in
 * semanal.
 *
 * Todo es heurística simple sobre los datos existentes, no LLM. Cada
 * sugerencia lleva un CTA que abre /mensajes/{id} o la página relevante.
 */
export async function SugerenciasHoy() {
  const supabase = await createSupabaseServerClient();

  const hoy = fechaISO(new Date());
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);

  // Clientas activas con sus últimas actividades
  const { data: clientasData } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, estado")
    .eq("estado", "activa")
    .order("nombre");

  const clientas = (clientasData ?? []) as Array<{
    id: string;
    nombre: string;
    apellidos: string | null;
  }>;
  if (clientas.length === 0) return null;
  const ids = clientas.map((c) => c.id);

  const [sesionesRes, fotosRes, mensajesRes, pesosRes] = await Promise.all([
    supabase
      .from("sesiones")
      .select("clienta_id, fecha, completada")
      .in("clienta_id", ids)
      .gte("fecha", fechaISO(hace30))
      .order("fecha", { ascending: false }),
    supabase
      .from("fotos_progreso")
      .select("clienta_id, fecha")
      .in("clienta_id", ids)
      .order("fecha", { ascending: false }),
    supabase
      .from("mensajes")
      .select("clienta_id, enviado_en, remitente")
      .in("clienta_id", ids)
      .order("enviado_en", { ascending: false }),
    supabase
      .from("metricas")
      .select("clienta_id, valor, fecha")
      .in("clienta_id", ids)
      .eq("tipo", "peso")
      .order("fecha", { ascending: true }),
  ]);

  const sesiones = (sesionesRes.data ?? []) as Sesion[];
  const fotos = (fotosRes.data ?? []) as Array<{
    clienta_id: string;
    fecha: string;
  }>;
  const mensajes = (mensajesRes.data ?? []) as Array<{
    clienta_id: string;
    enviado_en: string;
    remitente: string;
  }>;
  const pesos = (pesosRes.data ?? []) as Array<{
    clienta_id: string;
    valor: number;
    fecha: string;
  }>;

  const sugerencias: Sugerencia[] = [];
  const yaAgregado = new Set<string>();
  const agregar = (clientaId: string, s: Omit<Sugerencia, "id">) => {
    const id = `${clientaId}_${s.tipo}`;
    if (yaAgregado.has(id)) return;
    yaAgregado.add(id);
    sugerencias.push({ id, ...s });
  };

  for (const c of clientas) {
    const nombre = `${c.nombre} ${c.apellidos ?? ""}`.trim();
    const sesionesCl = sesiones.filter((s) => s.clienta_id === c.id);
    const completadas = sesionesCl.filter((s) => s.completada);
    const ultimaCompletada = completadas[0];
    const diasSinEntrenar = ultimaCompletada
      ? diasEntre(ultimaCompletada.fecha, hoy)
      : null;

    // Racha actual (sesiones consecutivas completadas desde la última)
    let racha = 0;
    for (const s of sesionesCl) {
      if (s.completada) racha++;
      else break;
    }

    // 1) Felicitar racha (≥5)
    if (racha >= 5) {
      agregar(c.id, {
        tipo: "felicitar",
        icono: <Flame className="size-4" />,
        iconoColor: "text-orange-400",
        titulo: `${c.nombre} lleva ${racha} días seguidos entrenando`,
        detalle: "Reconoce el esfuerzo con un mensaje rápido.",
        href: `/mensajes/${c.id}`,
      });
    }

    // 2) Contactar inactividad (≥5 días sin entrenar)
    if (diasSinEntrenar != null && diasSinEntrenar >= 5) {
      agregar(c.id, {
        tipo: "contactar",
        icono: <MessageSquare className="size-4" />,
        iconoColor: "text-amber-400",
        titulo: `${c.nombre} lleva ${diasSinEntrenar} días sin entrenar`,
        detalle: "Escríbele para saber si necesita ajustar el plan.",
        href: `/mensajes/${c.id}`,
      });
    }

    // 3) Pedir foto si no sube en >30 días
    const fotosCl = fotos.filter((f) => f.clienta_id === c.id);
    const ultimaFoto = fotosCl[0];
    if (!ultimaFoto || diasEntre(ultimaFoto.fecha, hoy) >= 30) {
      const diasDesdeUltima = ultimaFoto
        ? diasEntre(ultimaFoto.fecha, hoy)
        : null;
      if (completadas.length >= 5) {
        // Solo si ya está entrenando, para no spamear a recién inscritas
        agregar(c.id, {
          tipo: "pedir_foto",
          icono: <Camera className="size-4" />,
          iconoColor: "text-blue-400",
          titulo: `${c.nombre} no sube foto desde hace ${
            diasDesdeUltima != null ? diasDesdeUltima + " días" : "siempre"
          }`,
          detalle:
            "Para comparar evolución visual, pídele una foto de progreso.",
          href: `/mensajes/${c.id}`,
        });
      }
    }

    // 4) Celebrar evolución de peso (cambio significativo)
    const pesosCl = pesos.filter((p) => p.clienta_id === c.id);
    if (pesosCl.length >= 2) {
      const inicial = pesosCl[0]!.valor;
      const actual = pesosCl[pesosCl.length - 1]!.valor;
      const diff = actual - inicial;
      if (Math.abs(diff) >= 2) {
        agregar(c.id, {
          tipo: "celebrar_metricas",
          icono: <TrendingUp className="size-4" />,
          iconoColor: diff < 0 ? "text-green-400" : "text-amber-400",
          titulo: `${c.nombre}: ${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg desde el inicio`,
          detalle:
            diff < 0
              ? "¡Buena evolución! Refuerza el mensaje."
              : "Habla con ella sobre la tendencia.",
          href: `/mensajes/${c.id}`,
        });
      }
    }

    // 5) Check-in semanal (si no le escribes hace ≥7 días Y ella tampoco)
    const ultimoCoach = mensajes.find(
      (m) => m.clienta_id === c.id && m.remitente === "coach"
    );
    const ultimoClienta = mensajes.find(
      (m) => m.clienta_id === c.id && m.remitente === "clienta"
    );
    const diasUltimoMensajeCoach = ultimoCoach
      ? diasEntre(ultimoCoach.enviado_en.slice(0, 10), hoy)
      : 999;
    const diasUltimoMensajeClienta = ultimoClienta
      ? diasEntre(ultimoClienta.enviado_en.slice(0, 10), hoy)
      : 999;
    if (
      diasUltimoMensajeCoach >= 7 &&
      diasUltimoMensajeClienta >= 7 &&
      completadas.length >= 3 // está activa
    ) {
      agregar(c.id, {
        tipo: "resumen",
        icono: <Calendar className="size-4" />,
        iconoColor: "text-purple-400",
        titulo: `${c.nombre}: 7+ días sin contacto`,
        detalle: "Haz un check-in rápido para mantener el vínculo.",
        href: `/mensajes/${c.id}`,
      });
    }
  }

  // Limita y prioriza: felicitar > contactar > celebrar > resumen > foto
  const prioridad: Record<Sugerencia["tipo"], number> = {
    felicitar: 0,
    contactar: 1,
    celebrar_metricas: 2,
    resumen: 3,
    pedir_foto: 4,
  };
  sugerencias.sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo]);
  const top = sugerencias.slice(0, 6);

  if (top.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4" style={{ color: "var(--brand)" }} />
          <h2 className="font-semibold">Sugerencias para hoy</h2>
        </div>
        <div className="text-sm text-neutral-500">
          Todas tus clientas están al día 🎉 Buen trabajo.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4" style={{ color: "var(--brand)" }} />
        <h2 className="font-semibold">Sugerencias para hoy</h2>
        <span className="text-xs text-neutral-500 ml-auto">{top.length}</span>
      </div>
      <ul className="space-y-2">
        {top.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className="flex items-start gap-3 px-3 py-2 -mx-3 rounded-lg hover:bg-neutral-900/50 transition group"
            >
              <span className={"shrink-0 mt-0.5 " + s.iconoColor}>
                {s.icono}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-neutral-100">{s.titulo}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {s.detalle}
                </div>
              </div>
              <span
                className="text-xs text-neutral-600 group-hover:text-neutral-300 transition shrink-0 mt-1"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
