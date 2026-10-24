"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  getKpis,
  getSaldoHistorico,
  getApuestas,
  getPartido,
  getEquipos,
  eliminarApuesta,
  descargarRespaldoExcel,
} from "@/lib/api";
import type {
  Kpis,
  SaldoPunto,
  MercadoKpi,
  Apuesta,
  Partido,
  Equipo,
} from "@/lib/types";

const CUENTA_ID = 1;
const TEMPORADA_ID = 1;

function formatoCLP(valor: number): string {
  return valor.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function TarjetaKpi({ titulo, kpi }: { titulo: string; kpi: MercadoKpi }) {
  const roiColor =
    kpi.roi === null
      ? "text-gray-400"
      : kpi.roi >= 0
        ? "text-green-600"
        : "text-red-600";
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-sm text-gray-500 mb-3">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-gray-500">Apuestas</dt>
        <dd className="text-right">{kpi.n_apuestas}</dd>
        <dt className="text-gray-500">% Acierto</dt>
        <dd className="text-right">
          {kpi.porcentaje_acierto !== null
            ? `${(kpi.porcentaje_acierto * 100).toFixed(1)}%`
            : "-"}
        </dd>
        <dt className="text-gray-500">Utilidad</dt>
        <dd className="text-right">{formatoCLP(kpi.utilidad)}</dd>
        <dt className="text-gray-500">ROI</dt>
        <dd className={`text-right font-semibold ${roiColor}`}>
          {kpi.roi !== null ? `${(kpi.roi * 100).toFixed(1)}%` : "-"}
        </dd>
      </dl>
    </div>
  );
}

function BadgeResultado({ resultado }: { resultado: Apuesta["resultado"] }) {
  const estilos =
    resultado === "ganada"
      ? "bg-green-100 text-green-700"
      : resultado === "perdida"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  const texto =
    resultado === "ganada"
      ? "Ganada"
      : resultado === "perdida"
        ? "Perdida"
        : "Pendiente";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estilos}`}>
      {texto}
    </span>
  );
}

function BotonExportar() {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportar() {
    setExportando(true);
    setError(null);
    try {
      await descargarRespaldoExcel(TEMPORADA_ID, CUENTA_ID);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <button
        onClick={exportar}
        disabled={exportando}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {exportando ? "Generando..." : "Exportar respaldo (.xlsx)"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [saldo, setSaldo] = useState<SaldoPunto[] | null>(null);
  const [apuestas, setApuestas] = useState<Apuesta[] | null>(null);
  const [partidos, setPartidos] = useState<Record<number, Partido>>({});
  const [equipos, setEquipos] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [mostrarResueltas, setMostrarResueltas] = useState(false);
  const [limiteResueltas, setLimiteResueltas] = useState(10);

  const cargar = useCallback(async () => {
    try {
      const [k, s, todasApuestas, eq] = await Promise.all([
        getKpis(CUENTA_ID),
        getSaldoHistorico(CUENTA_ID),
        getApuestas(CUENTA_ID),
        getEquipos(),
      ]);
      setKpis(k);
      setSaldo(s);
      setApuestas(todasApuestas);

      const mapaEquipos: Record<number, string> = {};
      for (const e of eq as Equipo[]) mapaEquipos[e.id] = e.nombre;
      setEquipos(mapaEquipos);

      const idsUnicos = [...new Set(todasApuestas.map((a) => a.partido_id))];
      const listaPartidos = await Promise.all(
        idsUnicos.map((id) => getPartido(id)),
      );
      const mapaPartidos: Record<number, Partido> = {};
      for (const p of listaPartidos) mapaPartidos[p.id] = p;
      setPartidos(mapaPartidos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrarApuesta(id: number) {
    if (!window.confirm("¿Borrar esta apuesta? No se puede deshacer.")) return;
    try {
      await eliminarApuesta(id);
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al borrar la apuesta");
    }
  }

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

  if (!kpis || !saldo || !apuestas) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  const pendientes = apuestas.filter((a) => a.resultado === "pendiente");
  const resueltas = apuestas
    .filter((a) => a.resultado !== "pendiente")
    .sort((a, b) => b.id - a.id); // mas recientes primero

  const datosGrafico = saldo.map((p) => ({
    ...p,
    fechaCorta: new Date(p.fecha).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    }),
  }));

  function filaApuesta(a: Apuesta, conBorrar: boolean) {
    const p = partidos[a.partido_id];
    const nombreLocal = p ? (equipos[p.local_id] ?? p.local_id) : "...";
    const nombreVisita = p ? (equipos[p.visita_id] ?? p.visita_id) : "...";
    return (
      <tr key={a.id} className="border-b border-gray-100">
        <td className="py-2 pr-4">
          {nombreLocal} vs {nombreVisita}
        </td>
        <td className="py-2 pr-4 capitalize">
          {a.tipo} {a.direccion} {a.linea}
        </td>
        <td className="py-2 pr-4">{a.probabilidad}%</td>
        <td className="py-2 pr-4">{formatoCLP(a.monto)}</td>
        <td className="py-2 pr-4">{a.cuota}</td>
        <td className="py-2 pr-4">
          <BadgeResultado resultado={a.resultado} />
        </td>
        {a.resultado !== "pendiente" && (
          <td className="py-2 pr-4">
            {a.utilidad !== undefined && a.utilidad !== null && (
              <span
                className={a.utilidad >= 0 ? "text-green-600" : "text-red-600"}
              >
                {formatoCLP(a.utilidad)}
              </span>
            )}
          </td>
        )}
        {conBorrar && (
          <td className="py-2">
            <button
              onClick={() => borrarApuesta(a.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Borrar
            </button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500">Cuenta #{CUENTA_ID}</p>
        </div>
        <BotonExportar />
      </div>

      <div className="bg-gray-50 rounded-xl p-6 flex items-baseline gap-4">
        <span className="text-sm text-gray-500">Saldo actual</span>
        <span className="text-3xl font-bold">
          {formatoCLP(kpis.saldo_actual)}
        </span>
        <span className="text-sm text-gray-400">
          (depositado: {formatoCLP(kpis.total_depositado)})
        </span>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Evolucion del saldo</h2>
        {datosGrafico.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Todavia no hay depositos ni apuestas resueltas para graficar.
          </p>
        ) : (
          <div className="h-72 border border-gray-200 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fechaCorta" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v) => formatoCLP(v)}
                  width={90}
                />
                <Tooltip
                  formatter={(value) => formatoCLP(Number(value))}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.detalle ?? ""
                  }
                />
                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Apuestas pendientes</h2>
        {pendientes.length === 0 && (
          <p className="text-gray-500 text-sm">
            No tienes apuestas pendientes ahora mismo.
          </p>
        )}
        {pendientes.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">Partido</th>
                <th className="py-2 pr-4">Mercado</th>
                <th className="py-2 pr-4">Probabilidad</th>
                <th className="py-2 pr-4">Monto</th>
                <th className="py-2 pr-4">Cuota</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>{pendientes.map((a) => filaApuesta(a, true))}</tbody>
          </table>
        )}
      </div>

      <div>
        <button
          onClick={() => setMostrarResueltas(!mostrarResueltas)}
          className="font-semibold mb-3 flex items-center gap-1 hover:text-blue-600"
        >
          Apuestas resueltas ({resueltas.length})
          <span className="text-xs text-gray-400">
            {mostrarResueltas ? "▲" : "▼"}
          </span>
        </button>
        {mostrarResueltas && (
          <>
            {resueltas.length === 0 && (
              <p className="text-gray-500 text-sm">
                Todavia no tienes apuestas resueltas.
              </p>
            )}
            {resueltas.length > 0 && (
              <>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-gray-200 text-gray-500">
                      <th className="py-2 pr-4">Partido</th>
                      <th className="py-2 pr-4">Mercado</th>
                      <th className="py-2 pr-4">Probabilidad</th>
                      <th className="py-2 pr-4">Monto</th>
                      <th className="py-2 pr-4">Cuota</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Utilidad</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resueltas
                      .slice(0, limiteResueltas)
                      .map((a) => filaApuesta(a, true))}
                  </tbody>
                </table>
                {limiteResueltas < resueltas.length && (
                  <button
                    onClick={() => setLimiteResueltas((n) => n + 10)}
                    className="text-sm text-blue-600 hover:underline mt-3"
                  >
                    Ver mas ({resueltas.length - limiteResueltas} restantes)
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">KPIs por mercado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TarjetaKpi titulo="Goles" kpi={kpis.goles} />
          <TarjetaKpi titulo="Corners" kpi={kpis.corners} />
          <TarjetaKpi titulo="Total" kpi={kpis.total} />
        </div>
      </div>
    </main>
  );
}
