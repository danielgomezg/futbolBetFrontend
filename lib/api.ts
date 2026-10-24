import { getApiKey } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const cuerpo = await res.text();
    throw new Error(`Error ${res.status} llamando a ${path}: ${cuerpo}`);
  }
  return res.json() as Promise<T>;
}

import type {
  Equipo,
  Partido,
  Kpis,
  SaldoPunto,
  Prediccion,
  ApuestaCreateInput,
  Apuesta,
  ResultadoInput,
  PartidoCreateInput,
  Calibracion,
  RendimientoPorEdge,
} from "./types";

export function getEquipos(): Promise<Equipo[]> {
  return apiFetch<Equipo[]>("/equipos/");
}

export function getPartidosPendientes(temporadaId: number): Promise<Partido[]> {
  return apiFetch<Partido[]>(
    `/partidos/?temporada_id=${temporadaId}&solo_pendientes=true`,
  );
}

export function getPartidos(temporadaId: number): Promise<Partido[]> {
  return apiFetch<Partido[]>(`/partidos/?temporada_id=${temporadaId}`);
}

export function eliminarPartido(partidoId: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/partidos/${partidoId}`, {
    method: "DELETE",
  });
}

export function eliminarApuesta(apuestaId: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/apuestas/${apuestaId}`, {
    method: "DELETE",
  });
}

export function crearPartido(datos: PartidoCreateInput): Promise<Partido> {
  return apiFetch<Partido>("/partidos/", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function getKpis(cuentaId: number): Promise<Kpis> {
  return apiFetch<Kpis>(`/apuestas/kpis?cuenta_id=${cuentaId}`);
}

export function getSaldoHistorico(cuentaId: number): Promise<SaldoPunto[]> {
  return apiFetch<SaldoPunto[]>(
    `/apuestas/saldo-historico?cuenta_id=${cuentaId}`,
  );
}

export function getPrediccion(
  temporadaId: number,
  localId: number,
  visitaId: number,
  pesoForma: number = 0.5,
): Promise<Prediccion> {
  return apiFetch<Prediccion>(
    `/predicciones/?temporada_id=${temporadaId}&local_id=${localId}&visita_id=${visitaId}&peso_forma=${pesoForma}`,
  );
}

export function crearApuesta(datos: ApuestaCreateInput): Promise<Apuesta> {
  return apiFetch<Apuesta>("/apuestas/", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function cargarResultado(
  partidoId: number,
  datos: ResultadoInput,
): Promise<Partido> {
  return apiFetch<Partido>(`/partidos/${partidoId}/resultado`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

// Todas las apuestas de la cuenta, sin filtrar por resultado - se separan
// en pendientes/resueltas del lado del frontend, para no pegarle 2 veces a la API.
export function getApuestas(cuentaId: number): Promise<Apuesta[]> {
  return apiFetch<Apuesta[]>(`/apuestas/?cuenta_id=${cuentaId}`);
}

export function getApuestasPendientes(cuentaId: number): Promise<Apuesta[]> {
  return apiFetch<Apuesta[]>(
    `/apuestas/?cuenta_id=${cuentaId}&resultado=pendiente`,
  );
}

export function getPartido(partidoId: number): Promise<Partido> {
  return apiFetch<Partido>(`/partidos/${partidoId}`);
}

export function getCalibracion(cuentaId: number): Promise<Calibracion> {
  return apiFetch<Calibracion>(`/apuestas/calibracion?cuenta_id=${cuentaId}`);
}

export function getRendimientoPorEdge(
  cuentaId: number,
): Promise<RendimientoPorEdge> {
  return apiFetch<RendimientoPorEdge>(
    `/apuestas/rendimiento-por-edge?cuenta_id=${cuentaId}`,
  );
}

/**
 * Descarga el respaldo en Excel (no usa apiFetch porque la respuesta no es JSON,
 * es un archivo binario). Arma un link temporal en el navegador y lo "clickea" solo.
 */
export async function descargarRespaldoExcel(
  temporadaId: number,
  cuentaId: number,
) {
  const apiKey = getApiKey();
  const res = await fetch(
    `${API_URL}/export/excel?temporada_id=${temporadaId}&cuenta_id=${cuentaId}`,
    { headers: apiKey ? { "X-API-Key": apiKey } : {} },
  );
  if (!res.ok) {
    const cuerpo = await res.text();
    throw new Error(`Error ${res.status} exportando: ${cuerpo}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chile_futbol_respaldo.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
