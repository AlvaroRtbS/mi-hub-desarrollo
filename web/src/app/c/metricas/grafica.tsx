type Punto = { fecha: string; valor: number };

export function MiniGrafica({ puntos }: { puntos: Punto[] }) {
  if (puntos.length === 0) return null;
  if (puntos.length === 1) {
    return (
      <div className="text-xs text-neutral-500 text-center py-3">
        Necesitas al menos 2 medidas para ver la evolución.
      </div>
    );
  }

  const W = 320;
  const H = 80;
  const PAD = 12;

  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const x0 = puntos[0]!.fecha;
  const xLast = puntos[puntos.length - 1]!.fecha;
  const diasTotal = Math.max(
    1,
    Math.floor(
      (new Date(xLast + "T00:00:00Z").getTime() -
        new Date(x0 + "T00:00:00Z").getTime()) /
        86400000
    )
  );

  function x(fecha: string) {
    const d =
      (new Date(fecha + "T00:00:00Z").getTime() -
        new Date(x0 + "T00:00:00Z").getTime()) /
      86400000;
    return PAD + (d / diasTotal) * (W - PAD * 2);
  }
  function y(v: number) {
    return PAD + (1 - (v - min) / rango) * (H - PAD * 2);
  }

  const path = puntos
    .map((p, i) => (i === 0 ? "M" : "L") + x(p.fecha) + "," + y(p.valor))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
      <path d={path} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((p) => (
        <circle key={p.fecha} cx={x(p.fecha)} cy={y(p.valor)} r={3} fill="#22c55e" />
      ))}
    </svg>
  );
}
