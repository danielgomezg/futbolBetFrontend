/**
 * Helpers para hablar con un backend que puede estar "dormido" (plan gratis de Render):
 * la primera consulta despues de un rato sin uso puede tardar hasta ~1 minuto o fallar
 * mientras el servidor despierta. Aca esperamos con paciencia en vez de rendirnos.
 */

export type ResultadoClave = "ok" | "invalida" | "sin_conexion";

export async function fetchConTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null; // error de red, timeout, o servidor aun despertando
  } finally {
    clearTimeout(t);
  }
}

/** Pregunta a /health hasta que responda OK. Devuelve false si se agotan los intentos. */
export async function esperarServidor(
  apiUrl: string,
  intentos = 10,
  esperaEntreIntentosMs = 3000,
  timeoutPorIntentoMs = 15000,
): Promise<boolean> {
  for (let i = 0; i < intentos; i++) {
    const res = await fetchConTimeout(
      `${apiUrl}/health`,
      {},
      timeoutPorIntentoMs,
    );
    if (res && res.ok) return true;
    if (i < intentos - 1)
      await new Promise((r) => setTimeout(r, esperaEntreIntentosMs));
  }
  return false;
}

/** Distingue "la clave esta mal" (401) de "no pude conectarme" (cualquier otra cosa). */
export async function probarClave(
  apiUrl: string,
  key: string,
  timeoutMs = 15000,
): Promise<ResultadoClave> {
  const res = await fetchConTimeout(
    `${apiUrl}/equipos/`,
    { headers: key ? { "X-API-Key": key } : {} },
    timeoutMs,
  );
  if (!res) return "sin_conexion";
  if (res.ok) return "ok";
  if (res.status === 401) return "invalida";
  return "sin_conexion";
}
