"use client";

import { useState } from "react";
import { crearPartido } from "@/lib/api";
import type { Equipo } from "@/lib/types";

const TEMPORADA_ID = 1;

interface Fila {
  localId: number | "";
  visitaId: number | "";
}

function filaVacia(): Fila {
  return { localId: "", visitaId: "" };
}

export default function NuevaFechaForm({
  equipos,
  onCreado,
}: {
  equipos: Equipo[];
  onCreado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [fechaJornada, setFechaJornada] = useState("");
  const [filas, setFilas] = useState<Fila[]>(
    Array.from({ length: 8 }, () => filaVacia()),
  );
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    creados: number;
    errores: string[];
  } | null>(null);

  const equiposOrdenados = [...equipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  function actualizarFila(idx: number, campo: keyof Fila, valor: number | "") {
    setFilas((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)),
    );
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(idx: number) {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function crearTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!fechaJornada) return;

    const filasCompletas = filas.filter(
      (f) => f.localId !== "" && f.visitaId !== "",
    );
    if (filasCompletas.length === 0) return;

    setEnviando(true);
    setResultado(null);

    let creados = 0;
    const errores: string[] = [];

    for (const fila of filasCompletas) {
      if (fila.localId === fila.visitaId) {
        errores.push(
          `Local y visita iguales (equipo id ${fila.localId}), se omitio`,
        );
        continue;
      }
      try {
        await crearPartido({
          temporada_id: TEMPORADA_ID,
          local_id: Number(fila.localId),
          visita_id: Number(fila.visitaId),
          fecha_jornada: Number(fechaJornada),
        });
        creados++;
      } catch (err) {
        errores.push(
          err instanceof Error ? err.message : "Error desconocido en una fila",
        );
      }
    }

    setResultado({ creados, errores });
    setEnviando(false);
    if (creados > 0) onCreado();
  }

  function cerrarYReiniciar() {
    setAbierto(false);
    setFechaJornada("");
    setFilas(Array.from({ length: 8 }, () => filaVacia()));
    setResultado(null);
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        + Agregar fecha completa
      </button>
    );
  }

  return (
    <form
      onSubmit={crearTodo}
      className="border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Agregar fecha completa</p>
        <button
          type="button"
          onClick={cerrarYReiniciar}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Fecha (jornada):</label>
        <input
          type="number"
          placeholder="Ej: 20"
          value={fechaJornada}
          onChange={(e) => setFechaJornada(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-24"
          min={1}
          required
        />
      </div>

      <div className="space-y-2">
        {filas.map((fila, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <select
              value={fila.localId}
              onChange={(e) =>
                actualizarFila(
                  idx,
                  "localId",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1"
            >
              <option value="">Local</option>
              {equiposOrdenados.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
            <span className="text-gray-400 text-xs">vs</span>
            <select
              value={fila.visitaId}
              onChange={(e) =>
                actualizarFila(
                  idx,
                  "visitaId",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1"
            >
              <option value="">Visita</option>
              {equiposOrdenados.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => quitarFila(idx)}
              className="text-xs text-red-500 hover:text-red-700 px-1"
              title="Quitar esta fila"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={agregarFila}
          className="text-xs text-blue-600 hover:underline"
        >
          + Agregar otra fila
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Creando..." : "Crear partidos de esta fecha"}
        </button>
      </div>

      {resultado && (
        <div className="text-xs space-y-1">
          <p className="text-green-600">
            Se crearon {resultado.creados} partidos.
          </p>
          {resultado.errores.length > 0 && (
            <div className="text-red-600">
              {resultado.errores.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
