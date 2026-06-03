"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Select } from "@/components/ui/campo";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { formatearFecha } from "@/lib/utilidades";
import {
  agregarFoto,
  eliminarFoto,
  alternarComparador,
} from "./acciones";
import { ComparadorAntesDespues } from "./comparador";

type FotoCliente = {
  id: string;
  url: string;
  tipo: string | null;
  fecha: string;
  notas: string | null;
  subida_en: string;
  urlFirmada: string | null;
};

const TIPOS = ["frontal", "lateral", "trasera", "otra"] as const;

export function GestorFotos({
  clientaId,
  coachId,
  comparadorActivo: comparadorActivoInicial,
  fotos,
}: {
  clientaId: string;
  coachId: string;
  comparadorActivo: boolean;
  fotos: FotoCliente[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const [vista, setVista] = useState<"galeria" | "comparador">("galeria");
  const [comparadorActivo, setComparadorActivo] = useState(comparadorActivoInicial);
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [antesId, setAntesId] = useState<string | null>(null);
  const [despuesId, setDespuesId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [tipoNueva, setTipoNueva] = useState<string>("frontal");
  const [fechaNueva, setFechaNueva] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notasNueva, setNotasNueva] = useState("");

  const fotosFiltradas = tipoFiltro
    ? fotos.filter((f) => f.tipo === tipoFiltro)
    : fotos;

  function toggleComparador() {
    const nuevo = !comparadorActivo;
    setComparadorActivo(nuevo);
    startTransition(async () => {
      const r = await alternarComparador(clientaId, nuevo);
      if (!r.ok) {
        setError(r.error);
        setComparadorActivo(!nuevo);
      }
    });
  }

  function guardarFoto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("clienta_id", clientaId);
    fd.set("tipo", tipoNueva);
    fd.set("fecha", fechaNueva);
    fd.set("notas", notasNueva);
    startTransition(async () => {
      const r = await agregarFoto(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAgregando(false);
      setNotasNueva("");
      router.refresh();
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    startTransition(async () => {
      const r = await eliminarFoto(id, clientaId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  const antes = fotos.find((f) => f.id === antesId);
  const despues = fotos.find((f) => f.id === despuesId);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex gap-1">
          <button
            onClick={() => setVista("galeria")}
            className={
              "text-sm px-3 py-1.5 rounded-lg border " +
              (vista === "galeria"
                ? "bg-neutral-800 border-neutral-700 text-white"
                : "border-neutral-800 text-neutral-400 hover:text-white")
            }
          >
            Galería
          </button>
          <button
            onClick={() => setVista("comparador")}
            disabled={!comparadorActivo}
            className={
              "text-sm px-3 py-1.5 rounded-lg border " +
              (vista === "comparador"
                ? "bg-neutral-800 border-neutral-700 text-white"
                : "border-neutral-800 text-neutral-400 hover:text-white") +
              (!comparadorActivo ? " opacity-30 cursor-not-allowed" : "")
            }
            title={!comparadorActivo ? "Comparador desactivado para esta clienta" : ""}
          >
            Comparador
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={comparadorActivo}
              onChange={toggleComparador}
              className="accent-brand-600"
            />
            Comparador activado para esta clienta
          </label>
          <Boton tamano="sm" onClick={() => setAgregando((v) => !v)}>
            {agregando ? "Cancelar" : "+ Añadir foto"}
          </Boton>
        </div>
      </div>

      {agregando && (
        <form
          onSubmit={guardarFoto}
          className="border border-neutral-800 rounded-2xl p-5 mb-6 space-y-4"
        >
          <h3 className="font-medium">Subir nueva foto</h3>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tipo">
              <Select
                value={tipoNueva}
                onChange={(e) => setTipoNueva(e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Fecha">
              <input
                type="date"
                value={fechaNueva}
                onChange={(e) => setFechaNueva(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
            </Campo>
          </div>
          <Campo label="Imagen" hint="JPG/PNG/WebP hasta 10 MB.">
            <SubirArchivo
              bucket="fotos-progreso"
              accept="image/jpeg,image/png,image/webp"
              coachId={coachId}
              subcarpeta={clientaId}
              nombre="url"
              descripcion="Privada — solo tú y la clienta tendréis acceso."
            />
          </Campo>
          <Campo label="Notas (opcional)">
            <input
              value={notasNueva}
              onChange={(e) => setNotasNueva(e.target.value)}
              placeholder="Contexto, posición..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
          </Campo>
          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Boton type="submit" disabled={enviando}>
              {enviando ? "Subiendo..." : "Guardar foto"}
            </Boton>
            <Boton variante="secundario" onClick={() => setAgregando(false)}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}

      {vista === "galeria" ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-neutral-500">Filtrar:</span>
            <button
              onClick={() => setTipoFiltro("")}
              className={
                "text-xs px-2 py-1 rounded-full border " +
                (!tipoFiltro
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-white")
              }
            >
              Todas ({fotos.length})
            </button>
            {TIPOS.map((t) => {
              const c = fotos.filter((f) => f.tipo === t).length;
              if (c === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={
                    "text-xs px-2 py-1 rounded-full border capitalize " +
                    (tipoFiltro === t
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "border-neutral-800 text-neutral-400 hover:text-white")
                  }
                >
                  {t} ({c})
                </button>
              );
            })}
          </div>

          {fotosFiltradas.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center text-sm text-neutral-500">
              No hay fotos {tipoFiltro && `de tipo "${tipoFiltro}"`} aún.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {fotosFiltradas.map((f) => (
                <div
                  key={f.id}
                  className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950"
                >
                  <div className="aspect-[3/4] bg-neutral-900">
                    {f.urlFirmada ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.urlFirmada}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-700">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-xs">
                    <div className="text-neutral-300">
                      {formatearFecha(f.fecha)}
                      {f.tipo && (
                        <span className="text-neutral-500 capitalize ml-1">
                          · {f.tipo}
                        </span>
                      )}
                    </div>
                    {f.notas && (
                      <div className="text-neutral-500 mt-0.5 truncate">{f.notas}</div>
                    )}
                    <button
                      onClick={() => quitar(f.id)}
                      className="text-[10px] text-neutral-500 hover:text-red-400 mt-1"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          {!comparadorActivo ? (
            <div className="text-sm text-neutral-500 py-12 text-center">
              Comparador desactivado para esta clienta.
            </div>
          ) : fotos.length < 2 ? (
            <div className="text-sm text-neutral-500 py-12 text-center">
              Necesitas al menos 2 fotos para comparar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SelectorFoto
                  label="Antes"
                  fotos={fotos}
                  valor={antesId ?? fotos[0]!.id}
                  onChange={setAntesId}
                />
                <SelectorFoto
                  label="Después"
                  fotos={fotos}
                  valor={despuesId ?? fotos[fotos.length - 1]!.id}
                  onChange={setDespuesId}
                />
              </div>

              {(() => {
                const a = antes ?? fotos[0]!;
                const d = despues ?? fotos[fotos.length - 1]!;
                if (!a.urlFirmada || !d.urlFirmada) {
                  return (
                    <div className="text-sm text-neutral-500 py-8 text-center">
                      No se pueden cargar las URLs firmadas de las fotos.
                    </div>
                  );
                }
                return (
                  <ComparadorAntesDespues
                    antesUrl={a.urlFirmada}
                    despuesUrl={d.urlFirmada}
                    antesFecha={a.fecha}
                    despuesFecha={d.fecha}
                  />
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectorFoto({
  label,
  fotos,
  valor,
  onChange,
}: {
  label: string;
  fotos: FotoCliente[];
  valor: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-1">{label}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
      >
        {fotos.map((f) => (
          <option key={f.id} value={f.id}>
            {f.fecha} {f.tipo ? `· ${f.tipo}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
