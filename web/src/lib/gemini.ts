// Cliente mínimo de la API gratuita de Gemini (Google Generative Language) vía
// REST — sin SDK. Requiere GEMINI_API_KEY en el entorno (Vercel).
// Se usa en las rutas IA del coach (resumen de clienta, generar programa).

type OpcionesGemini = {
  system: string;
  user: string;
  /** Pide salida JSON (responseMimeType application/json). */
  json?: boolean;
  maxTokens?: number;
  /** Modelo del free tier. Por defecto gemini-2.5-flash. */
  model?: string;
  temperature?: number;
};

export async function generarTextoGemini(opts: OpcionesGemini): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Falta GEMINI_API_KEY en Vercel → Settings → Environment Variables."
    );
  }
  const model = opts.model ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 2048,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detalle.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texto =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!texto.trim()) {
    throw new Error("Gemini no devolvió texto (posible límite o filtro).");
  }
  return texto.trim();
}

/** Extrae el primer objeto JSON de un texto (quita fences ```json y texto alrededor). */
export function extraerJSON(texto: string): string {
  const limpio = texto.replace(/```json\s*/gi, "").replace(/```/g, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  return limpio.slice(inicio, fin + 1);
}
