import { FormularioClienta } from "../formulario";
import { crearClienta } from "../acciones";

export default function NuevaClientaPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Nueva clienta</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Crea la ficha. Recibirá una invitación por email para entrar a la app.
      </p>
      <FormularioClienta accion={crearClienta} textoBoton="Crear clienta" />
    </div>
  );
}
