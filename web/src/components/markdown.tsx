import React from "react";

/**
 * Renderer de Markdown minimalista para contenido PROPIO y de confianza (los
 * manuales del cajón de tutoriales y /c/ayuda). No es un parser general: cubre lo que
 * usan esos documentos — encabezados, negrita/cursiva/código, enlaces, listas
 * (con un nivel de anidado), citas, tablas y separadores. Sin dependencias.
 *
 * Los h2/h3 reciben un id estilo GitHub para que funcionen los enlaces de
 * índice tipo [Sección](#1-mi-sección).
 */

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

const RE_INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(texto: string): React.ReactNode {
  const partes = texto.split(RE_INLINE);
  return partes.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-[0.85em] text-neutral-200"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-neutral-100">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const externo = /^https?:\/\//.test(link[2]!);
      return (
        <a
          key={i}
          href={link[2]}
          className="underline underline-offset-2"
          style={{ color: "var(--brand)" }}
          {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

type ItemLista = { texto: string; hijos: string[] };

export function Markdown({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const bloques: React.ReactNode[] = [];
  let parrafo: string[] = [];
  let key = 0;

  const flushParrafo = () => {
    if (!parrafo.length) return;
    bloques.push(
      <p key={key++} className="text-sm text-neutral-300 leading-relaxed">
        {inline(parrafo.join(" "))}
      </p>
    );
    parrafo = [];
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]!;
    const limpia = linea.trim();

    // Línea en blanco → cierra el párrafo en curso
    if (!limpia) {
      flushParrafo();
      continue;
    }

    // Separador
    if (/^-{3,}$/.test(limpia)) {
      flushParrafo();
      bloques.push(<hr key={key++} className="border-neutral-800 my-2" />);
      continue;
    }

    // Encabezados
    const h = limpia.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushParrafo();
      const nivel = h[1]!.length;
      const contenido = h[2]!;
      if (nivel === 1) {
        bloques.push(
          <h1 key={key++} className="text-2xl font-semibold text-neutral-50">
            {inline(contenido)}
          </h1>
        );
      } else if (nivel === 2) {
        bloques.push(
          <h2
            key={key++}
            id={slug(contenido)}
            className="text-lg font-semibold text-neutral-50 mt-8 pt-4 border-t border-neutral-800/60 scroll-mt-4"
          >
            {inline(contenido)}
          </h2>
        );
      } else {
        bloques.push(
          <h3
            key={key++}
            id={slug(contenido)}
            className="font-semibold text-neutral-100 mt-5 scroll-mt-4"
          >
            {inline(contenido)}
          </h3>
        );
      }
      continue;
    }

    // Cita (líneas > consecutivas)
    if (limpia.startsWith(">")) {
      flushParrafo();
      const cita: string[] = [];
      while (i < lineas.length && lineas[i]!.trim().startsWith(">")) {
        cita.push(lineas[i]!.trim().replace(/^>\s?/, ""));
        i++;
      }
      i--;
      bloques.push(
        <blockquote
          key={key++}
          className="border-l-2 pl-3 py-1 text-sm text-neutral-400 leading-relaxed"
          style={{ borderColor: "var(--brand)" }}
        >
          {cita.map((c, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {inline(c)}
            </React.Fragment>
          ))}
        </blockquote>
      );
      continue;
    }

    // Tabla (líneas | consecutivas; la 2ª es el separador ---)
    if (limpia.startsWith("|")) {
      flushParrafo();
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i]!.trim().startsWith("|")) {
        const celdas = lineas[i]!
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        filas.push(celdas);
        i++;
      }
      i--;
      const cabecera = filas[0] ?? [];
      const cuerpo = filas.slice(2); // saltar separador |---|---|
      bloques.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full text-sm border border-neutral-800 rounded-lg">
            <thead>
              <tr className="bg-neutral-900/60">
                {cabecera.map((c, j) => (
                  <th
                    key={j}
                    className="text-left font-medium text-neutral-200 px-3 py-2 border-b border-neutral-800"
                  >
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuerpo.map((fila, j) => (
                <tr key={j} className="border-b border-neutral-800/60 last:border-0">
                  {fila.map((c, k) => (
                    <td key={k} className="px-3 py-2 text-neutral-300 align-top">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Listas (con un nivel de anidado por sangría)
    const esItem = (l: string) => /^(\s*)([-*]|\d+\.)\s+/.test(l) && l.trim();
    if (esItem(linea)) {
      flushParrafo();
      const items: ItemLista[] = [];
      const ordenada = /^\s*\d+\./.test(linea);
      while (i < lineas.length && esItem(lineas[i]!)) {
        const l = lineas[i]!;
        const sangria = l.match(/^(\s*)/)![1]!.length;
        const contenido = l.trim().replace(/^([-*]|\d+\.)\s+/, "");
        if (sangria > 0 && items.length > 0) {
          items[items.length - 1]!.hijos.push(contenido);
        } else {
          items.push({ texto: contenido, hijos: [] });
        }
        i++;
      }
      i--;
      const Tag = ordenada ? "ol" : "ul";
      bloques.push(
        <Tag
          key={key++}
          className={
            (ordenada ? "list-decimal" : "list-disc") +
            " pl-5 text-sm text-neutral-300 leading-relaxed space-y-1.5"
          }
        >
          {items.map((it, j) => (
            <li key={j}>
              {inline(it.texto)}
              {it.hijos.length > 0 && (
                <ul className="list-[circle] pl-5 mt-1.5 space-y-1">
                  {it.hijos.map((hijo, k) => (
                    <li key={k}>{inline(hijo)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Tag>
      );
      continue;
    }

    // Texto normal → acumular en el párrafo
    parrafo.push(limpia);
  }
  flushParrafo();

  return <div className="space-y-3">{bloques}</div>;
}
