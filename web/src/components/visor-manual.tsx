"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";

/**
 * Visor de manual por TARJETAS: trocea un markdown por secciones `## N. emoji
 * Título` y muestra una rejilla de tarjetas (emoji + título + resumen). Al
 * tocar una, se abre solo esa sección con navegación anterior/siguiente y
 * vuelta a la rejilla. La sección "Índice" del .md se omite (las tarjetas YA
 * son el índice) y el `# título` del documento también (lo pone la página).
 */

type Seccion = {
  emoji: string;
  titulo: string;
  resumen: string;
  md: string;
};

function limpiarInline(texto: string): string {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function trocear(md: string): { intro: string; secciones: Seccion[] } {
  const partes = md.replace(/\r\n/g, "\n").split(/^## /m);
  const intro = partes[0]!
    .split("\n")
    .filter((l) => !l.startsWith("# ")) // el h1 lo pone la página
    .join("\n")
    .replace(/\n*---\n*$/g, "")
    .trim();

  const secciones: Seccion[] = [];
  for (const parte of partes.slice(1)) {
    const finLinea = parte.indexOf("\n");
    const cabecera = parte.slice(0, finLinea).trim();
    if (/^índice/i.test(cabecera)) continue; // las tarjetas son el índice

    // "N. emoji Título" → separar número, emoji y título
    const m = cabecera.match(/^(?:\d+\.\s+)?(\S+)\s+(.*)$/u);
    let emoji = "📄";
    let titulo = cabecera.replace(/^\d+\.\s+/, "");
    if (m && /\p{Extended_Pictographic}/u.test(m[1]!)) {
      emoji = m[1]!;
      titulo = m[2]!;
    }

    const cuerpo = parte
      .slice(finLinea + 1)
      .replace(/\n*---\n*$/g, "")
      .trim();

    // Resumen: primera línea de texto normal (ni lista, ni tabla, ni cita…)
    const lineaResumen =
      cuerpo
        .split("\n")
        .find((l) => l.trim() && !/^([#>|\-*]|\d+\.|\||!)/.test(l.trim())) ?? "";
    const resumenPlano = limpiarInline(lineaResumen.trim());
    const resumen =
      resumenPlano.length > 110 ? resumenPlano.slice(0, 110) + "…" : resumenPlano;

    secciones.push({ emoji, titulo, resumen, md: cuerpo });
  }
  return { intro, secciones };
}

export function VisorManual({ texto }: { texto: string }) {
  const [{ intro, secciones }] = useState(() => trocear(texto));
  const [activa, setActiva] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Al cambiar de sección, volver arriba (el scroll vive en el contenedor padre)
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [activa]);

  if (activa !== null) {
    const s = secciones[activa]!;
    const prev = activa > 0 ? secciones[activa - 1]! : null;
    const next = activa < secciones.length - 1 ? secciones[activa + 1]! : null;
    return (
      <div ref={topRef} className="scroll-mt-4">
        <button
          onClick={() => setActiva(null)}
          className="text-sm text-neutral-400 hover:text-white mb-4 inline-flex items-center gap-1"
        >
          ← Todas las secciones
        </button>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{s.emoji}</span>
          <h2 className="text-lg font-semibold">{s.titulo}</h2>
        </div>
        <Markdown texto={s.md} />
        <div className="flex justify-between gap-3 mt-8 pt-4 border-t border-neutral-800 text-sm">
          {prev ? (
            <button
              onClick={() => setActiva(activa - 1)}
              className="text-left text-neutral-400 hover:text-white min-w-0"
            >
              ← {prev.emoji} <span className="truncate">{prev.titulo}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              onClick={() => setActiva(activa + 1)}
              className="text-right text-neutral-400 hover:text-white min-w-0"
            >
              {next.emoji} <span className="truncate">{next.titulo}</span> →
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-4">
      {intro && (
        <div className="mb-5">
          <Markdown texto={intro} />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {secciones.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiva(i)}
            className="text-left border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/60 hover:border-neutral-700 transition flex flex-col gap-1.5"
          >
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-sm font-medium leading-snug">{s.titulo}</span>
            {s.resumen && (
              <span className="text-xs text-neutral-500 leading-snug line-clamp-2">
                {s.resumen}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
