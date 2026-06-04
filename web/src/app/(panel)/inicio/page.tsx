import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Dia } from "@/lib/supabase/tipos";
import { inicialesNombre, formatearFecha } from "@/lib/utilidades";
import { BotonCargarDemo } from "./boton-demo";
import { SugerenciasHoy } from "./sugerencias-hoy";
import { ResumenSemana } from "./resumen-semana";

type AsignacionConSnapshot = {
  id: string;
  clienta_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estructura_snapshot: EstructuraPrograma;
  clientas: {
    id: string;
    nombre: string;
    apellidos: string | null;
    estado: string;
  } | null;
};

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

function diaProgramaPara(
  asignacion: AsignacionConSnapshot,
  fecha: string
): { semana: number; dia: number; def: Dia } | null {
  const offset = diasEntre(asignacion.fecha_inicio, fecha);
  if (offset < 0) return null;
  const est = asignacion.estructura_snapshot;
  if (!Array.isArray(est)) return null;
  const semanaIdx = Math.floor(offset / 7);
  const diaIdx = offset % 7;
  const semana = est[semanaIdx];
  const def = semana?.dias?.[diaIdx];
  if (!def) return null;
  return { semana: semanaIdx + 1, dia: diaIdx + 1, def };
}

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient();
  const hoy = fechaISO(new Date());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre")
    .eq("user_id", user.id)
    .maybeSingle();

  const [
    asignacionesActivasRes,
    contadores,
    mensajesNoLeidosRes,
    fotosRecientesRes,
    sesionesUltimasRes,
  ] = await Promise.all([
    supabase
      .from("asignaciones")
      .select(
        "id, clienta_id, fecha_inicio, fecha_fin, estructura_snapshot, clientas(id, nombre, apellidos, estado)"
      )
      .eq("activa", true),
    Promise.all([
      supabase
        .from("clientas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa"),
      supabase
        .from("clientas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "invitada"),
      supabase.from("programas").select("id", { count: "exact", head: true }),
      supabase.from("ejercicios").select("id", { count: "exact", head: true }),
    ]),
    supabase
      .from("mensajes")
      .select(
        "id, contenido, enviado_en, clienta_id, clientas(id, nombre, apellidos)"
      )
      .eq("remitente", "clienta")
      .eq("leido", false)
      .order("enviado_en", { ascending: false })
      .limit(5),
    supabase
      .from("fotos_progreso")
      .select("id, clienta_id, fecha, subida_en, clientas(nombre, apellidos)")
      .order("subida_en", { ascending: false })
      .limit(3),
    supabase
      .from("sesiones")
      .select("id, fecha, clienta_id, clientas(id, nombre, apellidos)")
      .order("fecha", { ascending: false })
      .limit(5),
  ]);

  const asignaciones = (asignacionesActivasRes.data ?? []) as unknown as AsignacionConSnapshot[];
  const [clientasActivas, clientasInvitadas, programas, ejercicios] = contadores;

  const programadoHoy = asignaciones
    .map((a) => ({ asignacion: a, dia: diaProgramaPara(a, hoy) }))
    .filter((p) => p.dia !== null && !p.dia.def.descanso && p.dia.def.bloques.length > 0);

  const descansoHoy = asignaciones
    .map((a) => ({ asignacion: a, dia: diaProgramaPara(a, hoy) }))
    .filter((p) => p.dia !== null && p.dia.def.descanso);

  const mensajesNoLeidos = mensajesNoLeidosRes.data ?? [];
  const fotosRecientes = (fotosRecientesRes.data ?? []) as unknown as Array<{
    id: string;
    clienta_id: string;
    fecha: string;
    subida_en: string;
    clientas: { nombre: string; apellidos: string | null } | null;
  }>;

  // Clientas sin actividad reciente (sin sesión en últimos 7 días)
  const sesionesUltimas = (sesionesUltimasRes.data ?? []) as unknown as Array<{
    id: string;
    fecha: string;
    clienta_id: string;
    clientas: { id: string; nombre: string; apellidos: string | null } | null;
  }>;
  const ultimaSesionPorClienta = new Map<string, string>();
  sesionesUltimas.forEach((s) => {
    if (!ultimaSesionPorClienta.has(s.clienta_id)) {
      ultimaSesionPorClienta.set(s.clienta_id, s.fecha);
    }
  });

  const sinActividad = asignaciones
    .map((a) => {
      const ultima = ultimaSesionPorClienta.get(a.clienta_id);
      const dias = ultima ? diasEntre(ultima, hoy) : 999;
      return { asignacion: a, dias };
    })
    .filter((s) => s.dias >= 5)
    .slice(0, 5);

  const saludoHora = new Date().getHours();
  const saludo =
    saludoHora < 6
      ? "Buenas noches"
      : saludoHora < 13
      ? "Buenos días"
      : saludoHora < 21
      ? "Buenas tardes"
      : "Buenas noches";

  const fechaLarga = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="p-8 mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          {saludo}, {coach?.nombre?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-sm text-neutral-400 mt-1 capitalize">{fechaLarga}</p>
      </div>

      {(clientasActivas.count ?? 0) === 0 &&
        (clientasInvitadas.count ?? 0) === 0 && (
          <div className="mb-6">
            <BotonCargarDemo />
          </div>
        )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat
          label="Clientas activas"
          valor={clientasActivas.count ?? 0}
          href="/clientas"
        />
        <Stat
          label="Pendientes alta"
          valor={clientasInvitadas.count ?? 0}
          href="/clientas?estado=invitada"
          variante={(clientasInvitadas.count ?? 0) > 0 ? "atencion" : "normal"}
        />
        <Stat label="Programas" valor={programas.count ?? 0} href="/programas" />
        <Stat label="Ejercicios" valor={ejercicios.count ?? 0} href="/ejercicios" />
      </div>

      <div className="mb-4">
        <ResumenSemana />
      </div>

      <div className="mb-4">
        <SugerenciasHoy />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hoy entrenan */}
        <div className="border border-neutral-800 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Hoy entrenan ({programadoHoy.length})</h2>
            <Link href="/calendario" className="text-xs text-brand-500 hover:text-brand-400">
              Ver calendario →
            </Link>
          </div>
          {programadoHoy.length === 0 ? (
            <div className="text-sm text-neutral-500">
              Nadie tiene entreno hoy.
              {descansoHoy.length > 0 && (
                <span className="text-neutral-600">
                  {" "}
                  ({descansoHoy.length} en descanso programado)
                </span>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {programadoHoy.map(({ asignacion, dia }) => {
                const c = asignacion.clientas;
                if (!c) return null;
                return (
                  <li
                    key={asignacion.id}
                    className="flex items-center gap-3 py-2 border-b border-neutral-900 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0">
                      {inicialesNombre(c.nombre, c.apellidos)}
                    </div>
                    <Link
                      href={`/clientas/${c.id}`}
                      className="text-sm font-medium hover:text-brand-500 flex-1 truncate"
                    >
                      {c.nombre} {c.apellidos ?? ""}
                    </Link>
                    <div className="text-xs text-neutral-500 truncate">
                      {dia!.def.titulo} ·{" "}
                      {dia!.def.bloques.reduce((a, b) => a + b.elementos.length, 0)}{" "}
                      elem.
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Mensajes no leídos */}
        <div className="border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Mensajes ({mensajesNoLeidos.length})
            </h2>
            <Link href="/mensajes" className="text-xs text-brand-500 hover:text-brand-400">
              Ver todos →
            </Link>
          </div>
          {mensajesNoLeidos.length === 0 ? (
            <div className="text-sm text-neutral-500">Sin mensajes nuevos.</div>
          ) : (
            <ul className="space-y-2">
              {mensajesNoLeidos.map((m) => {
                const c = m.clientas as unknown as {
                  id: string;
                  nombre: string;
                  apellidos: string | null;
                } | null;
                if (!c) return null;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/mensajes/${c.id}`}
                      className="block hover:bg-neutral-900/50 -mx-2 px-2 py-2 rounded-lg"
                    >
                      <div className="text-sm font-medium truncate">
                        {c.nombre} {c.apellidos ?? ""}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        {m.contenido}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sin actividad */}
        <div className="border border-neutral-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-4">A revisar</h2>
          {sinActividad.length === 0 ? (
            <div className="text-sm text-neutral-500">Todo al día 👌</div>
          ) : (
            <ul className="space-y-2">
              {sinActividad.map(({ asignacion, dias }) => {
                const c = asignacion.clientas;
                if (!c) return null;
                return (
                  <li
                    key={asignacion.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/clientas/${c.id}`}
                      className="text-sm hover:text-brand-500 truncate"
                    >
                      {c.nombre} {c.apellidos ?? ""}
                    </Link>
                    <span className="text-xs text-amber-400 flex-shrink-0">
                      {dias === 999 ? "sin sesiones" : `${dias} días sin entrenar`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Fotos recientes */}
        <div className="border border-neutral-800 rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold mb-4">Fotos de progreso recientes</h2>
          {fotosRecientes.length === 0 ? (
            <div className="text-sm text-neutral-500">
              Ninguna foto subida aún.
            </div>
          ) : (
            <ul className="space-y-2">
              {fotosRecientes.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between text-sm border-b border-neutral-900 last:border-0 pb-2 last:pb-0"
                >
                  <Link
                    href={`/clientas/${f.clienta_id}`}
                    className="hover:text-brand-500"
                  >
                    {f.clientas?.nombre} {f.clientas?.apellidos ?? ""}
                  </Link>
                  <span className="text-xs text-neutral-500">
                    {formatearFecha(f.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  valor,
  href,
  variante = "normal",
}: {
  label: string;
  valor: number;
  href: string;
  variante?: "normal" | "atencion";
}) {
  return (
    <Link
      href={href}
      className={
        "block border rounded-2xl p-4 hover:bg-neutral-900/50 transition " +
        (variante === "atencion"
          ? "border-amber-900/50 bg-amber-950/20"
          : "border-neutral-800")
      }
    >
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{valor}</div>
    </Link>
  );
}
