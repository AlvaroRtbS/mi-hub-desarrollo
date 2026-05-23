"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Nombre del parámetro en la URL. Por defecto "q". */
  param?: string;
  placeholder?: string;
  className?: string;
  /** ms de debounce. Por defecto 300. */
  debounce?: number;
};

/**
 * Input de búsqueda que sincroniza con un searchParam de la URL aplicando
 * debounce — al teclear se actualiza la URL (router.replace) tras N ms sin
 * cambios, lo que dispara la re-fetch del server component.
 */
export function BuscadorDebounced({
  param = "q",
  placeholder = "Buscar...",
  className,
  debounce = 300,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const valorEnUrl = params.get(param) ?? "";

  const [valor, setValor] = useState(valorEnUrl);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el param cambia desde fuera (ej. al navegar atrás), sincronizamos.
  useEffect(() => {
    setValor(valorEnUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorEnUrl]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (valor) sp.set(param, valor);
      else sp.delete(param);
      const query = sp.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }, debounce);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <input
      type="search"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      placeholder={placeholder}
      className={
        className ??
        "w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
      }
    />
  );
}
