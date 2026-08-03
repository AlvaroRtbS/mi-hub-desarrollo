import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad · Portal de clientas",
  description:
    "Qué datos tratamos en el portal, para qué, durante cuánto tiempo y qué derechos tienes.",
  robots: { index: false, follow: false },
};

// Página PÚBLICA a propósito (fuera de (panel) y de /c): tiene que poder leerse
// ANTES de crear la cuenta, desde el enlace de invitación. El art. 13 del RGPD
// exige informar "en el momento de la recogida", no después.
//
// Datos del responsable facilitados por Álvaro el 2-ago-2026.

const ACTUALIZADO = "2 de agosto de 2026";

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-100">{titulo}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPortalPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Privacidad de tu portal</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Qué datos tuyos guardamos, para qué, cuánto tiempo y qué puedes pedir
          en cualquier momento. Actualizado el {ACTUALIZADO}.
        </p>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
          <p className="font-medium text-neutral-100">En dos líneas</p>
          <p className="mt-1">
            Tus datos los usamos <strong>solo</strong> para prepararte tu plan y
            hacerte el seguimiento. No se venden, no se ceden a nadie para
            publicidad y no se publican en ningún sitio. Puedes pedir una copia o
            que se borre todo cuando quieras.
          </p>
        </div>

        <Seccion titulo="Quién es responsable de tus datos">
          <p>
            Álvaro Arisqueta Alonso, entrenador personal online (Álvaro RTBS).
            NIF <strong>72075753D</strong>, con domicilio en{" "}
            <strong>c/ Marià Canals, 24 · 07005 Palma de Mallorca</strong>.
          </p>
          <p>
            Para cualquier cosa relacionada con tus datos, incluido pedir una
            copia o el borrado, escribe a{" "}
            <a
              href="mailto:alvaroarisquetaalonso@gmail.com"
              className="underline underline-offset-4"
            >
              alvaroarisquetaalonso@gmail.com
            </a>{" "}
            o dímelo directamente por WhatsApp.
          </p>
        </Seccion>

        <Seccion titulo="Qué datos guardamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Identificación y contacto:</strong> nombre, email,
              teléfono, ciudad y fecha de nacimiento.
            </li>
            <li>
              <strong>Datos de salud:</strong> peso, medidas, patologías,
              medicación, lesiones, alergias e intolerancias, y lo que cuentes en
              los formularios. Son datos sensibles y por eso van aparte (ver el
              apartado siguiente).
            </li>
            <li>
              <strong>Fotos de progreso</strong>, si decides subirlas. Son
              opcionales: el portal funciona igual sin ellas.
            </li>
            <li>
              <strong>Actividad del programa:</strong> entrenos completados,
              pesos y repeticiones, pasos, check-ins semanales y los mensajes que
              intercambiamos por el portal.
            </li>
            <li>
              <strong>Pagos:</strong> el importe y la fecha. Los datos de tu
              tarjeta los gestiona Stripe y nosotros no los vemos nunca.
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="Los datos de salud y las fotos son especiales">
          <p>
            La ley trata la información sobre tu salud y las fotos de tu cuerpo
            con más protección que el resto. Por eso necesitamos tu{" "}
            <strong>permiso explícito y por separado</strong> para cada una de
            esas dos cosas, además del contrato del servicio.
          </p>
          <p>
            Ese permiso lo das tú y puedes retirarlo cuando quieras, sin dar
            explicaciones y sin que eso afecte a lo que ya hicimos antes. Si
            retiras el de las fotos, se borran. Si retiras el de los datos de
            salud, no podemos seguir haciéndote el plan, porque es justo la
            información con la que se construye.
          </p>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Prepararte el plan de entrenamiento y de alimentación.</li>
            <li>Ver tu evolución y ajustar el plan cada semana.</li>
            <li>Hablar contigo sobre tu proceso.</li>
            <li>Gestionar el cobro del servicio y cumplir con Hacienda.</li>
          </ul>
          <p>
            No usamos tus datos para publicidad ni para tomar decisiones
            automáticas sobre ti. Nada de lo tuyo se publica ni se enseña a otras
            personas sin que tú lo autorices expresamente y por separado.
          </p>
        </Seccion>

        <Seccion titulo="Quién más los toca">
          <p>
            Para que el portal funcione hay empresas que alojan la información.
            Trabajan solo siguiendo nuestras instrucciones:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Supabase</strong> — la base de datos y tus archivos.
              Servidores en Fráncfort (Alemania).
            </li>
            <li>
              <strong>Vercel</strong> — el alojamiento de la web.
            </li>
            <li>
              <strong>Cloudflare</strong> — los vídeos de los ejercicios.
            </li>
            <li>
              <strong>Stripe</strong> — los cobros.
            </li>
            <li>
              <strong>Google</strong> — el correo y los formularios de
              onboarding.
            </li>
          </ul>
          <p>
            Algunas de estas empresas son estadounidenses. En esos casos la
            transferencia se ampara en las cláusulas contractuales tipo aprobadas
            por la Comisión Europea.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los guardamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Mientras seas clienta</strong>, y un año más por si
              vuelves y quieres retomar el hilo.
            </li>
            <li>
              <strong>Las facturas, cuatro años</strong>, porque lo exige la ley
              fiscal.
            </li>
            <li>
              <strong>Las fotos se borran antes</strong>: en cuanto termines,
              salvo que pidas conservarlas para comparar más adelante.
            </li>
          </ul>
          <p>Si pides el borrado, se hace antes de esos plazos.</p>
        </Seccion>

        <Seccion titulo="Qué puedes pedir">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Ver qué datos tuyos tenemos.</li>
            <li>Corregir lo que esté mal.</li>
            <li>Que se borre todo.</li>
            <li>
              Llevarte una copia en un archivo, para ti o para otro profesional.
            </li>
            <li>Retirar los permisos de salud o de fotos.</li>
            <li>Oponerte a un tratamiento concreto o pedir que se limite.</li>
          </ul>
          <p>
            Basta con que lo digas por WhatsApp o por email. Se responde en un
            mes como máximo. Si crees que no se ha hecho bien, puedes reclamar
            ante la Agencia Española de Protección de Datos (
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              aepd.es
            </a>
            ).
          </p>
        </Seccion>

        <Seccion titulo="Seguridad">
          <p>
            El portal exige contraseña y cada clienta solo puede ver lo suyo: la
            base de datos lo impide a nivel técnico, no solo en la pantalla. Las
            fotos y los PDFs no son públicos — se sirven con enlaces temporales
            que caducan en una hora. Los enlaces de invitación caducan en 72
            horas y solo sirven para el email al que van dirigidos.
          </p>
          <p>
            Si aun así ocurriera una brecha que pueda suponer un riesgo para ti,
            te avisaríamos.
          </p>
        </Seccion>

        <Seccion titulo="Cookies">
          <p>
            El portal no usa cookies de publicidad ni de análisis. Solo guarda lo
            imprescindible para mantener tu sesión abierta mientras lo usas.
          </p>
        </Seccion>

        <p className="mt-10 text-xs text-neutral-600">
          Si cambiamos algo importante de este texto, te avisaremos por el propio
          portal antes de que entre en vigor.
        </p>
      </div>
    </main>
  );
}
