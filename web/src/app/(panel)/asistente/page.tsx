import { ChatAsistente } from "./chat-asistente";

export default function AsistentePage() {
  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Asistente</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Tu copiloto: pregúntale en lenguaje natural sobre tus clientas.
      </p>
      <ChatAsistente />
    </div>
  );
}
