// Búsqueda global server-side. Devuelve resultados de clientas, programas y
// ejercicios que coincidan con el query. RLS asegura que solo se devuelve lo
// del coach autenticado.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = {
  tipo: "clienta" | "programa" | "ejercicio";
  id: string;
  titulo: string;
  subtitulo?: string;
  href: string;
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, results: [] }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const pattern = `%${q}%`;

  const [clientasRes, programasRes, ejerciciosRes] = await Promise.all([
    supabase
      .from("clientas")
      .select("id, nombre, apellidos, email, estado")
      .or(`nombre.ilike.${pattern},apellidos.ilike.${pattern},email.ilike.${pattern}`)
      .limit(8),
    supabase
      .from("programas")
      .select("id, nombre, descripcion, num_semanas")
      .ilike("nombre", pattern)
      .limit(8),
    supabase
      .from("ejercicios")
      .select("id, nombre, descripcion")
      .ilike("nombre", pattern)
      .limit(8),
  ]);

  const results: ResultadoBusqueda[] = [];

  (clientasRes.data ?? []).forEach((c) => {
    results.push({
      tipo: "clienta",
      id: c.id,
      titulo: `${c.nombre} ${c.apellidos ?? ""}`.trim(),
      subtitulo: `${c.email} · ${c.estado}`,
      href: `/clientas/${c.id}`,
    });
  });

  (programasRes.data ?? []).forEach((p) => {
    results.push({
      tipo: "programa",
      id: p.id,
      titulo: p.nombre,
      subtitulo: `${p.num_semanas} sem · ${p.descripcion?.slice(0, 60) ?? ""}`,
      href: `/programas/${p.id}`,
    });
  });

  (ejerciciosRes.data ?? []).forEach((e) => {
    results.push({
      tipo: "ejercicio",
      id: e.id,
      titulo: e.nombre,
      subtitulo: e.descripcion?.slice(0, 60),
      href: `/ejercicios/${e.id}/editar`,
    });
  });

  return NextResponse.json({ ok: true, results });
}
