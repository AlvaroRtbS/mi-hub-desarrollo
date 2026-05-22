export function Proximamente({
  titulo,
  descripcion,
  sprint,
}: {
  titulo: string;
  descripcion: string;
  sprint: string;
}) {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">{titulo}</h1>
      <p className="text-sm text-neutral-400 mb-6">{descripcion}</p>
      <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
        <div className="text-neutral-400">Próximamente</div>
        <div className="text-sm text-neutral-500 mt-2">{sprint}</div>
      </div>
    </div>
  );
}
