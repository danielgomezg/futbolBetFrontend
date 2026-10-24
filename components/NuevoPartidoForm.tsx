"use client";

import { useState } from "react";
import { crearPartido } from "@/lib/api";
import type { Equipo } from "@/lib/types";

const TEMPORADA_ID = 1; // mismo id que usa el resto de la app

export default function NuevoPartidoForm({
  equipos,
  onCreado,
}: {
  equipos: Equipo[];
  onCreado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [localId, setLocalId] = useState<number | "">("");
  const [visitaId, setVisitaId] = useState<number | "">("");
  const [fechaJornada, setFechaJornada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equiposOrdenados = [...equipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (localId === "" || visitaId === "" || !fechaJornada) return;
    if (localId === visitaId) {
      setError("El equipo local y visita no pueden ser el mismo");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await crearPartido({
        temporada_id: TEMPORADA_ID,
        local_id: Number(localId),
        visita_id: Number(visitaId),
        fecha_jornada: Number(fechaJornada),
      });
      setLocalId("");
      setVisitaId("");
      setFechaJornada("");
      setAbierto(false);
      onCreado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el partido");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        + Agregar partido
      </button>
    );
  }

  return (
    <form
      onSubmit={crear}
      className="border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Agregar partido nuevo</p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={localId}
          onChange={(e) =>
            setLocalId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          required
        >
          <option value="" disabled>
            Local
          </option>
          {equiposOrdenados.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nombre}
            </option>
          ))}
        </select>

        <span className="text-gray-400 text-sm">vs</span>

        <select
          value={visitaId}
          onChange={(e) =>
            setVisitaId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          required
        >
          <option value="" disabled>
            Visita
          </option>
          {equiposOrdenados.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nombre}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Fecha (jornada)"
          value={fechaJornada}
          onChange={(e) => setFechaJornada(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-32"
          min={1}
          required
        />

        <button
          type="submit"
          disabled={enviando}
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Creando..." : "Crear"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
