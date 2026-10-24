"use client";

import { useEffect, useState } from "react";
import { getCalibracion, getRendimientoPorEdge } from "@/lib/api";
import type {
  Calibracion,
  ResumenCalibracion,
  BucketCalibracion,
  RendimientoPorEdge,
  BucketEdge,
} from "@/lib/types";

const CUENTA_ID = 1;

function pct(v: number | null): string {
  return v === null ? "-" : `${(v * 100).toFixed(1)}%`;
}

function formatoCLP(valor: number): string {
  return valor.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function colorDiferencia(v: number | null): string {
  if (v === null) return "text-gray-400";
  if (v < -0.1) return "text-red-600"; // el modelo esta siendo sobreconfiado
  if (v > 0.1) return "text-blue-600"; // el modelo esta siendo subconfiado
  return "text-green-600";
}

function colorRoi(v: number | null): string {
  if (v === null) return "text-gray-400";
  return v >= 0 ? "text-green-600" : "text-red-600";
}

function FilaResumen({ nombre, r }: { nombre: string; r: ResumenCalibracion }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4 font-medium">{nombre}</td>
      <td className="py-2 pr-4">{r.n_apuestas}</td>
      <td className="py-2 pr-4">{r.aciertos}</td>
      <td className="py-2 pr-4">{pct(r.pct_acierto_real)}</td>
      <td className="py-2 pr-4">{pct(r.prob_promedio_predicha)}</td>
      <td
        className={`py-2 pr-4 font-semibold ${colorDiferencia(r.diferencia)}`}
      >
        {r.diferencia === null
          ? "-"
          : `${r.diferencia >= 0 ? "+" : ""}${(r.diferencia * 100).toFixed(1)} pts`}
      </td>
    </tr>
  );
}

function TablaBuckets({
  titulo,
  buckets,
}: {
  titulo: string;
  buckets: BucketCalibracion[];
}) {
  return (
    <div>
      <h3 className="font-medium text-sm mb-2">{titulo}</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4">Rango</th>
            <th className="py-2 pr-4">Apuestas</th>
            <th className="py-2 pr-4">Aciertos</th>
            <th className="py-2 pr-4">% Real</th>
            <th className="py-2 pr-4">% Predicho</th>
            <th className="py-2 pr-4">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <FilaResumen key={b.rango} nombre={b.rango} r={b} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaEdge({ b }: { b: BucketEdge }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4 font-medium">{b.rango}</td>
      <td className="py-2 pr-4">{b.n_apuestas}</td>
      <td className="py-2 pr-4">{pct(b.pct_acierto_real)}</td>
      <td className="py-2 pr-4">{formatoCLP(b.monto_apostado)}</td>
      <td className={`py-2 pr-4 font-semibold ${colorRoi(b.roi)}`}>
        {pct(b.roi)}
      </td>
    </tr>
  );
}

export default function CalibracionPage() {
  const [datos, setDatos] = useState<Calibracion | null>(null);
  const [edge, setEdge] = useState<RendimientoPorEdge | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCalibracion(CUENTA_ID), getRendimientoPorEdge(CUENTA_ID)])
      .then(([c, e]) => {
        setDatos(c);
        setEdge(e);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error desconocido"),
      );
  }, []);

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">No se pudo conectar con la API</p>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!datos || !edge) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  const sinDatos = datos.resumen.combinado.n_apuestas === 0;

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Calibracion</h1>
        <p className="text-sm text-gray-500">
          Compara la probabilidad que calcula el modelo contra lo que realmente
          paso, para detectar si esta siendo sobreconfiado (o subconfiado) en
          algun rango.
        </p>
      </div>

      {sinDatos && (
        <p className="text-gray-500 text-sm">
          Todavia no tienes apuestas resueltas para analizar. Esto se llena solo
          a medida que apuestes y cargues resultados.
        </p>
      )}

      {!sinDatos && (
        <>
          <div>
            <h2 className="font-semibold mb-3">Resumen general</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500">
                  <th className="py-2 pr-4">Mercado</th>
                  <th className="py-2 pr-4">Apuestas</th>
                  <th className="py-2 pr-4">Aciertos</th>
                  <th className="py-2 pr-4">% Acierto real</th>
                  <th className="py-2 pr-4">% Prob. predicha</th>
                  <th className="py-2 pr-4">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <FilaResumen nombre="Goles" r={datos.resumen.goles} />
                <FilaResumen nombre="Corners" r={datos.resumen.corners} />
                <FilaResumen nombre="Combinado" r={datos.resumen.combinado} />
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">
              Diferencia = % acierto real − % probabilidad predicha. Negativo
              (rojo) = el modelo fue mas optimista de lo que deberia. Positivo
              (azul) = fue mas conservador de lo necesario.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="font-semibold">
              Calibracion por rango de probabilidad
            </h2>
            <TablaBuckets
              titulo="Goles"
              buckets={datos.calibracion_por_rango.goles}
            />
            <TablaBuckets
              titulo="Corners"
              buckets={datos.calibracion_por_rango.corners}
            />
            <p className="text-xs text-gray-400">
              Con pocas apuestas por rango, estos porcentajes son poco
              confiables todavia - esta tabla se vuelve util de verdad con mas
              volumen acumulado a lo largo de la temporada.
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-1">
              Rendimiento por rango de edge
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Responde la pregunta: las apuestas con edge alto (el que calcula
              el formulario al apostar) realmente rinden mejor, o los edges muy
              grandes suelen ser un numero mal calculado en vez de una ventaja
              real?
            </p>
            {edge.total_apuestas_analizadas === 0 ? (
              <p className="text-gray-500 text-sm">
                Todavia no hay apuestas resueltas para analizar.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-500">
                    <th className="py-2 pr-4">Rango de edge</th>
                    <th className="py-2 pr-4">Apuestas</th>
                    <th className="py-2 pr-4">% Acierto</th>
                    <th className="py-2 pr-4">Apostado</th>
                    <th className="py-2 pr-4">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {edge.por_rango_edge.map((b) => (
                    <FilaEdge key={b.rango} b={b} />
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Si el ROI de &quot;15%+&quot; es mas bajo (o negativo) que el de
              &quot;2%-10%&quot;, es la senal de que los edges muy grandes no
              son confiables. Con pocas apuestas por rango esto todavia es
              ruido, no una conclusion firme.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
