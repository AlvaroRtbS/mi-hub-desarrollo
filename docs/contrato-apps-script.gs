/****************************************************************************
 * mi-hub · Detección de firma del contrato "Peso a Paso"
 * --------------------------------------------------------------------------
 * Avisa a mi-hub cuando una clienta envía el Google Form del contrato.
 * Casa la respuesta con la clienta por su EMAIL.
 *
 * CÓMO INSTALARLO (una sola vez):
 *  1. Abre el formulario en modo edición.
 *  2. Menú ⋮ (arriba a la derecha) -> "Editor de secuencias de comandos"
 *     (Apps Script).
 *  3. Borra lo que haya y pega TODO este archivo. Guarda (💾).
 *  4. En el panel izquierdo: "Activadores" (icono de reloj ⏰) -> "Añadir
 *     activador":
 *        - Función:           alFirmarContrato
 *        - Evento:            "Al enviarse el formulario"
 *        - Tipo de origen:    "Desde el formulario"
 *     Guarda y AUTORIZA los permisos cuando lo pida.
 *  5. (Opcional) Ejecuta una vez la función `probar()` para mandar una firma
 *     de prueba y ver que mi-hub responde.
 *
 * SEGURIDAD: el secreto de abajo debe coincidir con la variable
 * CONTRATO_WEBHOOK_SECRET configurada en Vercel.
 ****************************************************************************/

var MIHUB_URL    = 'https://mi-hub-desarrollo.vercel.app/api/consentimientos/firma';
// ⚠️ NO se commitea el secreto. Pega aquí el MISMO valor que pusiste en Vercel
// como CONTRATO_WEBHOOK_SECRET (solo en el editor de Apps Script de Google,
// nunca en el repositorio).
var SECRETO      = 'PEGA_AQUI_EL_SECRETO_DE_VERCEL';
var VERSION_DOC  = 'peso-a-paso-v1';

function alFirmarContrato(e) {
  var resp = e.response;
  var items = resp.getItemResponses();

  var email = '', aceptacion = '', fecha = '', nombre = '';

  for (var i = 0; i < items.length; i++) {
    var titulo = String(items[i].getItem().getTitle()).toLowerCase();
    var valor  = items[i].getResponse();
    if (titulo.indexOf('email') > -1 || titulo.indexOf('correo') > -1) {
      email = String(valor).trim();
    } else if (titulo.indexOf('acept') > -1 || titulo.indexOf('condicion') > -1) {
      aceptacion = String(valor);
    } else if (titulo.indexOf('fecha') > -1) {
      fecha = String(valor);
    } else if (titulo.indexOf('nombre') > -1 || titulo.indexOf('direcci') > -1) {
      nombre = String(valor);
    }
  }

  // Si el formulario recoge el email automáticamente, úsalo como respaldo.
  if (!email) {
    try { email = resp.getRespondentEmail() || ''; } catch (_) {}
  }

  // "Acepto..." cuenta como firmado; "No acepto..." no.
  var acepta = /acept/i.test(aceptacion) && !/no\s*acept/i.test(aceptacion);

  enviar({
    email: email,
    acepta: acepta,
    version: VERSION_DOC,
    evidencia: {
      fecha: fecha,
      nombre: nombre,
      aceptacion: aceptacion,
      enviado_en: new Date().toISOString()
    }
  });
}

function enviar(payload) {
  UrlFetchApp.fetch(MIHUB_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-contrato-secret': SECRETO },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// Firma de prueba (cambia el email por el de una clienta real de tu BD).
function probar() {
  enviar({
    email: 'CAMBIA_ESTO@ejemplo.com',
    acepta: true,
    version: VERSION_DOC,
    evidencia: { nota: 'prueba manual desde Apps Script' }
  });
}
