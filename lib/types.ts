export interface OverUnder {
  linea: number;
  p_under: number;
  p_over: number;
}

export interface Prediccion {
  local: string;
  visita: string;
  goles: {
    esperado_local: number;
    esperado_visita: number;
    esperado_total: number;
    over_under: OverUnder[];
  };
  corners: {
    esperado_local: number;
    esperado_visita: number;
    esperado_total: number;
    over_under: OverUnder[];
  };
  resultado_1x2: {
    gana_local: number;
    empate: number;
    gana_visita: number;
  };
}

export type TipoMercado = "goles" | "corners";
export type Direccion = "mas" | "menos";
export type ResultadoApuesta = "pendiente" | "ganada" | "perdida";

export interface ApuestaCreateInput {
  partido_id: number;
  cuenta_id: number;
  tipo: TipoMercado;
  direccion: Direccion;
  linea: number;
  monto: number;
  cuota: number;
}

export interface Apuesta {
  id: number;
  partido_id: number;
  cuenta_id: number;
  tipo: TipoMercado;
  direccion: Direccion;
  linea: number;
  probabilidad: number;
  cuota: number;
  monto: number;
  resultado: ResultadoApuesta;
  ganancia?: number | null;
  utilidad?: number | null;
}

export interface ResultadoInput {
  goles_1t_local: number;
  goles_2t_local: number;
  goles_1t_visita: number;
  goles_2t_visita: number;
  tiros_arco_local: number;
  tiros_arco_visita: number;
  corners_local: number;
  corners_visita: number;
}

export interface PartidoCreateInput {
  temporada_id: number;
  local_id: number;
  visita_id: number;
  fecha_jornada: number;
}

export interface Equipo {
  id: number;
  liga_id: number;
  nombre: string;
}

export interface MercadoKpi {
  n_apuestas: number;
  ganadas: number;
  porcentaje_acierto: number | null;
  monto_apostado: number;
  utilidad: number;
  roi: number | null;
}

export interface Kpis {
  total_depositado: number;
  saldo_actual: number;
  goles: MercadoKpi;
  corners: MercadoKpi;
  total: MercadoKpi;
}

export interface SaldoPunto {
  fecha: string;
  saldo: number;
  tipo: "deposito" | "apuesta";
  detalle: string;
}

export interface Partido {
  id: number;
  temporada_id: number;
  local_id: number;
  visita_id: number;
  fecha_jornada: number;
  fecha_partido: string | null;

  goles_1t_local: number | null;
  goles_2t_local: number | null;
  goles_1t_visita: number | null;
  goles_2t_visita: number | null;
  tiros_arco_local: number | null;
  tiros_arco_visita: number | null;
  corners_local: number | null;
  corners_visita: number | null;

  jugado: boolean;
  goles_totales_local: number | null;
  goles_totales_visita: number | null;
  corners_totales: number | null;
}

// --- Calibracion (equivalente a la hoja Aciertos del Excel) ---
export interface ResumenCalibracion {
  n_apuestas: number;
  aciertos: number;
  pct_acierto_real: number | null;
  prob_promedio_predicha: number | null;
  diferencia: number | null;
}

export interface BucketCalibracion extends ResumenCalibracion {
  rango: string;
}

export interface Calibracion {
  resumen: {
    goles: ResumenCalibracion;
    corners: ResumenCalibracion;
    combinado: ResumenCalibracion;
  };
  calibracion_por_rango: {
    goles: BucketCalibracion[];
    corners: BucketCalibracion[];
  };
}

export interface BucketEdge {
  rango: string;
  n_apuestas: number;
  aciertos: number;
  pct_acierto_real: number | null;
  monto_apostado: number;
  utilidad: number;
  roi: number | null;
}

export interface RendimientoPorEdge {
  por_rango_edge: BucketEdge[];
  total_apuestas_analizadas: number;
}
