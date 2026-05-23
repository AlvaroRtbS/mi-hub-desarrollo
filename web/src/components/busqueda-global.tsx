"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  tipo: "clienta" | "programa" | "ejercicio";
  id: string;
  titulo: string;
  subtitulo?: string;
  href: string;
};

const ICONOS: Record<Resultado["tipo"], string> = {
  clienta: "👤",
  programa: "📋",
  ejercicio: "💪",
};

export function BusquedaGlobal() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResultados([]);
      setIndice(0);
    }
  }, [abierto]);

  // Buscar con debounce
  useEffect(() => {
    if (query.length < 2) {
      setResultados([]);
      return;
    }
    const ctrl = new AbortController();
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data = await r.json();
        if (data.ok) {
          setResultados(data.results);
          setIndice(0);
        }
      } catch {
        // abortado
      } finally {
        setCargando(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function navegar(r: Resultado) {
    router.push(r.href);
    setAbierto(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultados[indice]) navegar(resultados[indice]);
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 border border-neutral-800 rounded-lg px-3 py-1.5 w-full text-left"
      >
        <span>🔍 Buscar...</span>
        <span className="ml-auto text-[10px] bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-20 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-neutral-800 px-4 py-3 flex items-center gap-2">
              <span className="text-neutral-500">🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar clientas, programas, ejercicios..."
                className="flex-1 bg-transparent text-sm focus:outline-none text-neutral-100 placeholder:text-neutral-600"
              />
              <span className="text-[10px] text-neutral-600 border border-neutral-800 rounded px-1.5 py-0.5">
                Esc
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {query.length < 2 ? (
                <div className="px-4 py-8 text-center text-xs text-neutral-500">
                  Empieza a escribir para buscar...
                </div>
              ) : cargando ? (
                <div className="px-4 py-8 text-center text-xs text-neutral-500">
                  Buscando...
                </div>
              ) : resultados.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-neutral-500">
                  Sin resultados para "{query}".
                </div>
              ) : (
                resultados.map((r, i) => (
                  <button
                    key={`${r.tipo}-${r.id}`}
                    onClick={() => navegar(r)}
                    onMouseEnter={() => setIndice(i)}
                    className={
                      "w-full text-left px-4 py-2.5 flex items-center gap-3 " +
                      (i === indice ? "bg-neutral-900" : "hover:bg-neutral-900/50")
                    }
                  >
                    <span className="text-lg">{ICONOS[r.tipo]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-100 truncate">
                        {r.titulo}
                      </div>
                      {r.subtitulo && (
                        <div className="text-[10px] text-neutral-500 truncate">
                          {r.subtitulo}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-600 uppercase">
                      {r.tipo}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-neutral-800 px-4 py-2 text-[10px] text-neutral-600 flex items-center justify-between">
              <span>↑↓ para moverse · Enter para abrir</span>
              <span>{resultados.length} resultados</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
