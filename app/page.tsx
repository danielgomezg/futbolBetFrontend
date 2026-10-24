"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getEquipos, getPartidosPendientes, getPartidos } from "@/lib/api";
import type { Equipo, Partido } from "@/lib/types";
import PartidoCard from "@/components/PartidoCard";
import NuevoPartidoForm from "@/components/NuevoPartidoForm";
import NuevaFechaForm from "@/components/NuevaFechaForm";

const TEMPORADA_ID = 1;

export default function Home() {
  const [vista, setVista] = useState<"pendientes" | "todos">("pendientes");
  const [partidos, setPartidos] = useState<Partido[] | null>(null);
  const [listaEquipos, setListaEquipos] = useState<Equipo[]>([]);
  const [equipos, setEquipos] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [eq, listaPartidos] = await Promise.all([
        getEquipos(),
        vista === "pendientes"
          ? getPartidosPendientes(TEMPORADA_ID)
          : getPartidos(TEMPORADA_ID),
      ]);
      setListaEquipos(eq);
      const mapa: Record<number, string> = {};
      for (const e of eq) mapa[e.id] = e.nombre;
      setEquipos(mapa);
      const ordenados = [...listaPartidos].sort((a, b) => {
        if (a.jugado !== b.jugado) return a.jugado ? 1 : -1;
        return b.fecha_jornada - a.fecha_jornada;
      });
      setPartidos(ordenados);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, [vista]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // cuando cambias de vista, no tiene sentido mantener un filtro de fecha viejo
  useEffect(() => {
    setFiltroFecha("");
  }, [vista]);

  const partidosFiltrados = useMemo(() => {
    if (!partidos) return partidos;
    if (vista !== "todos" || filtroFecha === "") return partidos;
    return partidos.filter((p) => p.fecha_jornada === Number(filtroFecha));
  }, [partidos, vista, filtroFecha]);

  const fechasDisponibles = useMemo(() => {
    if (!partidos) return [];
    return [...new Set(partidos.map((p) => p.fecha_jornada))].sort(
      (a, b) => a - b,
    );
  }, [partidos]);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Partidos</h1>
        <div className="flex text-sm border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setVista("pendientes")}
            className={`px-3 py-1.5 ${vista === "pendientes" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setVista("todos")}
            className={`px-3 py-1.5 ${vista === "todos" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Todos
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Ve la prediccion y aposta, o carga el resultado cuando el partido
        termine (las apuestas se resuelven solas). Si te equivocas al crear uno,
        lo puedes borrar.
      </p>

      {vista === "todos" && partidos && partidos.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm text-gray-500">Filtrar por fecha:</label>
          <input
            type="number"
            list="fechas-disponibles"
            placeholder="Ej: 20"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 w-24"
          />
          <datalist id="fechas-disponibles">
            {fechasDisponibles.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          {filtroFecha !== "" && (
            <button
              onClick={() => setFiltroFecha("")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Quitar filtro
            </button>
          )}
          {filtroFecha !== "" && partidosFiltrados && (
            <span className="text-xs text-gray-400">
              {partidosFiltrados.length} partido
              {partidosFiltrados.length !== 1 ? "s" : ""} en la fecha{" "}
              {filtroFecha}
            </span>
          )}
        </div>
      )}

      {listaEquipos.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 items-start">
          <NuevoPartidoForm equipos={listaEquipos} onCreado={cargar} />
          <NuevaFechaForm equipos={listaEquipos} onCreado={cargar} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">No se pudo conectar con la API</p>
          <p>{error}</p>
        </div>
      )}

      {!error && partidosFiltrados === null && (
        <p className="text-gray-500">Cargando...</p>
      )}

      {!error &&
        partidosFiltrados !== null &&
        partidosFiltrados.length === 0 && (
          <p className="text-gray-500">
            {filtroFecha !== ""
              ? `No hay partidos cargados en la fecha ${filtroFecha}.`
              : vista === "pendientes"
                ? `No hay partidos pendientes en la temporada ${TEMPORADA_ID}.`
                : `No hay partidos cargados en la temporada ${TEMPORADA_ID}.`}
          </p>
        )}

      <div className="space-y-3">
        {partidosFiltrados?.map((p) => (
          <PartidoCard
            key={p.id}
            partido={p}
            nombreLocal={equipos[p.local_id] ?? String(p.local_id)}
            nombreVisita={equipos[p.visita_id] ?? String(p.visita_id)}
            onResuelto={cargar}
            onEliminado={cargar}
          />
        ))}
      </div>
    </main>
  );
}
