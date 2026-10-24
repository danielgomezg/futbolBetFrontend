"use client";

import { useState } from "react";
import {
  getPrediccion,
  crearApuesta,
  cargarResultado,
  eliminarPartido,
} from "@/lib/api";
import type {
  Partido,
  Prediccion,
  TipoMercado,
  Direccion,
  ResultadoInput,
  OverUnder,
} from "@/lib/types";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function BadgeEstado({ jugado }: { jugado: boolean }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        jugado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {jugado ? "Jugado" : "Pendiente"}
    </span>
  );
}

export default function PartidoCard({
  partido,
  nombreLocal,
  nombreVisita,
  onResuelto,
  onEliminado,
}: {
  partido: Partido;
  nombreLocal: string;
  nombreVisita: string;
  onResuelto: () => void;
  onEliminado?: () => void;
}) {
  const [modo, setModo] = useState<"cerrado" | "prediccion" | "resultado">(
    "cerrado",
  );
  const [prediccion, setPrediccion] = useState<Prediccion | null>(null);
  const [pesoForma, setPesoForma] = useState(0.5);
  const [cargandoPrediccion, setCargandoPrediccion] = useState(false);
  const [errorPrediccion, setErrorPrediccion] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function pedirPrediccion(peso: number) {
    setCargandoPrediccion(true);
    setErrorPrediccion(null);
    try {
      const p = await getPrediccion(
        partido.temporada_id,
        partido.local_id,
        partido.visita_id,
        peso,
      );
      setPrediccion(p);
    } catch (e) {
      setErrorPrediccion(
        e instanceof Error ? e.message : "Error al calcular la prediccion",
      );
    } finally {
      setCargandoPrediccion(false);
    }
  }

  async function abrirPrediccion() {
    setModo("prediccion");
    if (prediccion) return;
    pedirPrediccion(pesoForma);
  }

  async function recalcular(nuevoPeso: number) {
    setPesoForma(nuevoPeso);
    pedirPrediccion(nuevoPeso);
  }

  async function eliminar() {
    if (!onEliminado) return;
    const confirmado = window.confirm(
      `¿Borrar el partido ${nombreLocal} vs ${nombreVisita}? Esto tambien borra cualquier apuesta ligada a el. No se puede deshacer.`,
    );
    if (!confirmado) return;
    setEliminando(true);
    try {
      await eliminarPartido(partido.id);
      onEliminado();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al borrar el partido");
      setEliminando(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-400">
              Fecha {partido.fecha_jornada}
            </span>
            <BadgeEstado jugado={partido.jugado} />
          </div>
          <p className="font-medium">
            {nombreLocal} <span className="text-gray-400">vs</span>{" "}
            {nombreVisita}
            {partido.jugado && (
              <span className="text-gray-500 font-normal">
                {" "}
                ({partido.goles_totales_local}-{partido.goles_totales_visita},{" "}
                {partido.corners_totales} corners)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={abrirPrediccion}
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Ver prediccion / apostar
          </button>
          <button
            onClick={() =>
              setModo(modo === "resultado" ? "cerrado" : "resultado")
            }
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {partido.jugado ? "Corregir resultado" : "Cargar resultado"}
          </button>
          {onEliminado && (
            <button
              onClick={eliminar}
              disabled={eliminando}
              className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {eliminando ? "..." : "Borrar"}
            </button>
          )}
        </div>
      </div>

      {modo === "prediccion" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <PesoFormaSlider
            pesoForma={pesoForma}
            deshabilitado={cargandoPrediccion}
            onRecalcular={recalcular}
          />
          {cargandoPrediccion && (
            <p className="text-sm text-gray-500 mt-2">Calculando...</p>
          )}
          {errorPrediccion && (
            <p className="text-sm text-red-600 mt-2">{errorPrediccion}</p>
          )}
          {prediccion && !cargandoPrediccion && (
            <BloquePrediccion
              partido={partido}
              prediccion={prediccion}
              nombreLocal={nombreLocal}
              nombreVisita={nombreVisita}
            />
          )}
        </div>
      )}

      {modo === "resultado" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <FormResultado
            partido={partido}
            nombreLocal={nombreLocal}
            nombreVisita={nombreVisita}
            onGuardado={() => {
              setModo("cerrado");
              onResuelto();
            }}
          />
        </div>
      )}
    </div>
  );
}

function PesoFormaSlider({
  pesoForma,
  deshabilitado,
  onRecalcular,
}: {
  pesoForma: number;
  deshabilitado: boolean;
  onRecalcular: (nuevoPeso: number) => void;
}) {
  const [valorLocal, setValorLocal] = useState(pesoForma);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>Peso forma reciente</span>
        <span className="font-medium text-gray-700">
          {Math.round(valorLocal * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={valorLocal}
        onChange={(e) => setValorLocal(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
        <span>0% solo temporada</span>
        <span>100% solo ultimos 5</span>
      </div>
      {valorLocal !== pesoForma && (
        <button
          onClick={() => onRecalcular(valorLocal)}
          disabled={deshabilitado}
          className="mt-2 text-xs px-2 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Recalcular con este peso
        </button>
      )}
    </div>
  );
}

function BloquePrediccion({
  partido,
  prediccion,
  nombreLocal,
  nombreVisita,
}: {
  partido: Partido;
  prediccion: Prediccion;
  nombreLocal: string;
  nombreVisita: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 mb-1">Goles esperados</p>
          <p>
            {nombreLocal}: <strong>{prediccion.goles.esperado_local}</strong> —{" "}
            {nombreVisita}: <strong>{prediccion.goles.esperado_visita}</strong>
          </p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Corners esperados</p>
          <p>
            {nombreLocal}: <strong>{prediccion.corners.esperado_local}</strong>{" "}
            — {nombreVisita}:{" "}
            <strong>{prediccion.corners.esperado_visita}</strong>
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        1X2 — Local {pct(prediccion.resultado_1x2.gana_local)} · Empate{" "}
        {pct(prediccion.resultado_1x2.empate)} · Visita{" "}
        {pct(prediccion.resultado_1x2.gana_visita)}
      </div>

      <FormApuesta partido={partido} prediccion={prediccion} />
    </div>
  );
}

type Seleccion = {
  tipo: TipoMercado;
  direccion: Direccion;
  linea: number;
  probabilidad: number;
};

function TablaLineas({
  tipo,
  lineas,
  seleccion,
  onElegir,
}: {
  tipo: TipoMercado;
  lineas: OverUnder[];
  seleccion: Seleccion | null;
  onElegir: (direccion: Direccion, linea: number, probabilidad: number) => void;
}) {
  function esSeleccionado(direccion: Direccion, linea: number) {
    return (
      seleccion?.tipo === tipo &&
      seleccion?.direccion === direccion &&
      seleccion?.linea === linea
    );
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 pr-3 font-normal">Linea</th>
          <th className="py-1 pr-3 font-normal">Mas</th>
          <th className="py-1 font-normal">Menos</th>
        </tr>
      </thead>
      <tbody>
        {lineas.map((l) => (
          <tr key={l.linea} className="border-t border-gray-100">
            <td className="py-1.5 pr-3 text-gray-600">{l.linea}</td>
            <td className="py-1.5 pr-3">
              <button
                type="button"
                onClick={() => onElegir("mas", l.linea, l.p_over)}
                className={`w-full text-left px-2 py-1 rounded-md ${
                  esSeleccionado("mas", l.linea)
                    ? "bg-blue-600 text-white"
                    : "hover:bg-blue-50 text-gray-700"
                }`}
              >
                {pct(l.p_over)}
              </button>
            </td>
            <td className="py-1.5">
              <button
                type="button"
                onClick={() => onElegir("menos", l.linea, l.p_under)}
                className={`w-full text-left px-2 py-1 rounded-md ${
                  esSeleccionado("menos", l.linea)
                    ? "bg-blue-600 text-white"
                    : "hover:bg-blue-50 text-gray-700"
                }`}
              >
                {pct(l.p_under)}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function claseEdge(edge: number): { color: string; etiqueta: string } {
  if (edge < 0)
    return {
      color: "text-red-600",
      etiqueta: "Sin edge (probabilidad implicita mayor a la tuya)",
    };
  if (edge < 0.02)
    return { color: "text-gray-500", etiqueta: "Edge casi nulo" };
  if (edge <= 0.1)
    return { color: "text-green-600", etiqueta: "Edge razonable" };
  if (edge <= 0.15)
    return { color: "text-amber-600", etiqueta: "Edge alto, revisa el numero" };
  return {
    color: "text-red-600",
    etiqueta: "Edge muy alto: sospechoso, probablemente tu numero esta mal",
  };
}

const EDGE_MIN = 0.02;
const EDGE_BUENO_MAX = 0.1;
const EDGE_ADVERTENCIA_MAX = 0.15;

function rangoCuotaSugerida(probabilidad: number): {
  cuotaMin: number;
  cuotaBuenaMax: number | null;
  cuotaAdvertenciaMax: number | null;
} | null {
  if (probabilidad <= EDGE_MIN) return null;
  return {
    cuotaMin: 1 / (probabilidad - EDGE_MIN),
    cuotaBuenaMax:
      probabilidad > EDGE_BUENO_MAX
        ? 1 / (probabilidad - EDGE_BUENO_MAX)
        : null,
    cuotaAdvertenciaMax:
      probabilidad > EDGE_ADVERTENCIA_MAX
        ? 1 / (probabilidad - EDGE_ADVERTENCIA_MAX)
        : null,
  };
}

function FormApuesta({
  partido,
  prediccion,
}: {
  partido: Partido;
  prediccion: Prediccion;
}) {
  const [tipo, setTipo] = useState<TipoMercado>("goles");
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [monto, setMonto] = useState("");
  const [cuota, setCuota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  const lineas =
    tipo === "goles"
      ? prediccion.goles.over_under
      : prediccion.corners.over_under;

  const cuotaNum = Number(cuota);
  const edge =
    seleccion && cuotaNum > 0 ? seleccion.probabilidad - 1 / cuotaNum : null;

  function elegirTipo(t: TipoMercado) {
    setTipo(t);
    setSeleccion(null);
  }

  function elegirLinea(
    direccion: Direccion,
    linea: number,
    probabilidad: number,
  ) {
    setSeleccion({ tipo, direccion, linea, probabilidad });
  }

  async function apostar(e: React.FormEvent) {
    e.preventDefault();
    if (!seleccion || !monto || !cuota) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const apuesta = await crearApuesta({
        partido_id: partido.id,
        cuenta_id: 1,
        tipo: seleccion.tipo,
        direccion: seleccion.direccion,
        linea: seleccion.linea,
        monto: Number(monto),
        cuota: Number(cuota),
      });
      setMensaje({
        tipo: "ok",
        texto: `Apuesta registrada (probabilidad calculada: ${apuesta.probabilidad}%)`,
      });
      setMonto("");
      setCuota("");
      setSeleccion(null);
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e instanceof Error ? e.message : "Error al apostar",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">Registrar apuesta</p>

      <div className="flex text-sm border border-gray-300 rounded-lg overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => elegirTipo("goles")}
          className={`px-3 py-1 ${tipo === "goles" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
        >
          Goles
        </button>
        <button
          type="button"
          onClick={() => elegirTipo("corners")}
          className={`px-3 py-1 ${tipo === "corners" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
        >
          Corners
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Haz clic en la probabilidad que quieras apostar (Mas o Menos, en
        cualquier linea).
      </p>

      <TablaLineas
        tipo={tipo}
        lineas={lineas}
        seleccion={seleccion}
        onElegir={elegirLinea}
      />

      <form
        onSubmit={apostar}
        className="space-y-2 pt-2 border-t border-gray-200"
      >
        {seleccion ? (
          <>
            <p className="text-xs text-gray-600">
              Elegiste:{" "}
              <strong className="capitalize">
                {seleccion.tipo} {seleccion.direccion} {seleccion.linea}
              </strong>{" "}
              (probabilidad {pct(seleccion.probabilidad)})
            </p>
            <RangoCuotaHint probabilidad={seleccion.probabilidad} />
          </>
        ) : (
          <p className="text-xs text-gray-400">
            Todavia no elegiste una linea de la tabla de arriba.
          </p>
        )}

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-28"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cuota"
            value={cuota}
            onChange={(e) => setCuota(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-24"
            required
          />
          <button
            type="submit"
            disabled={enviando || !seleccion}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Apostar"}
          </button>
        </div>

        {edge !== null && (
          <p className={`text-xs font-medium ${claseEdge(edge).color}`}>
            Edge: {edge >= 0 ? "+" : ""}
            {(edge * 100).toFixed(1)} pts — {claseEdge(edge).etiqueta}
          </p>
        )}

        {mensaje && (
          <p
            className={`text-xs ${mensaje.tipo === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {mensaje.texto}
          </p>
        )}
      </form>
    </div>
  );
}

function RangoCuotaHint({ probabilidad }: { probabilidad: number }) {
  const rango = rangoCuotaSugerida(probabilidad);

  if (!rango) {
    return (
      <p className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
        Con esta probabilidad tan baja, casi ninguna cuota te va a dar un buen
        edge — probablemente no vale la pena apostarle a esta linea.
      </p>
    );
  }

  return (
    <div className="text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-2 space-y-0.5">
      <p>
        Para un edge razonable (2%-10%), busca una cuota entre{" "}
        <strong>{rango.cuotaMin.toFixed(2)}</strong>
        {rango.cuotaBuenaMax ? (
          <>
            {" "}
            y <strong>{rango.cuotaBuenaMax.toFixed(2)}</strong>
          </>
        ) : (
          " en adelante"
        )}
        .
      </p>
      {rango.cuotaBuenaMax && rango.cuotaAdvertenciaMax && (
        <p className="text-amber-600">
          Entre {rango.cuotaBuenaMax.toFixed(2)} y{" "}
          {rango.cuotaAdvertenciaMax.toFixed(2)} el edge ya es alto (revisalo).
          Por sobre {rango.cuotaAdvertenciaMax.toFixed(2)}, sospechoso.
        </p>
      )}
    </div>
  );
}

function FormResultado({
  partido,
  nombreLocal,
  nombreVisita,
  onGuardado,
}: {
  partido: Partido;
  nombreLocal: string;
  nombreVisita: string;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<ResultadoInput>({
    goles_1t_local: partido.goles_1t_local ?? 0,
    goles_2t_local: partido.goles_2t_local ?? 0,
    goles_1t_visita: partido.goles_1t_visita ?? 0,
    goles_2t_visita: partido.goles_2t_visita ?? 0,
    tiros_arco_local: partido.tiros_arco_local ?? 0,
    tiros_arco_visita: partido.tiros_arco_visita ?? 0,
    corners_local: partido.corners_local ?? 0,
    corners_visita: partido.corners_visita ?? 0,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function campo(nombre: keyof ResultadoInput, label: string) {
    return (
      <label className="flex flex-col text-xs text-gray-500">
        {label}
        <input
          type="number"
          min={0}
          value={datos[nombre]}
          onChange={(e) =>
            setDatos({ ...datos, [nombre]: Number(e.target.value) })
          }
          className="mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1 w-16"
        />
      </label>
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await cargarResultado(partido.id, datos);
      onGuardado();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al guardar el resultado",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {campo("goles_1t_local", `Goles 1T ${nombreLocal}`)}
        {campo("goles_2t_local", `Goles 2T ${nombreLocal}`)}
        {campo("goles_1t_visita", `Goles 1T ${nombreVisita}`)}
        {campo("goles_2t_visita", `Goles 2T ${nombreVisita}`)}
        {campo("tiros_arco_local", `Tiros arco ${nombreLocal}`)}
        {campo("tiros_arco_visita", `Tiros arco ${nombreVisita}`)}
        {campo("corners_local", `Corners ${nombreLocal}`)}
        {campo("corners_visita", `Corners ${nombreVisita}`)}
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {enviando
          ? "Guardando..."
          : "Guardar resultado (resuelve apuestas solas)"}
      </button>
      {partido.jugado && (
        <p className="text-xs text-amber-600">
          Ojo: si ya habia apuestas resueltas en este partido, corregir el
          resultado NO las vuelve a calcular (solo resuelve apuestas que sigan
          &quot;pendiente&quot;). Si necesitas corregir una apuesta ya resuelta,
          borrala y creala de nuevo despues de corregir esto.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
