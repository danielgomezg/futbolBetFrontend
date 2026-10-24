"use client";

import { useCallback, useEffect, useState } from "react";
import { clearApiKey, getApiKey, setApiKey } from "@/lib/auth";
import { esperarServidor, probarClave } from "@/lib/servidor";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Estado = "despertando" | "autorizado" | "pidiendo" | "sin_conexion";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>("despertando");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const iniciar = useCallback(async () => {
    setEstado("despertando");

    // 1) Esperar a que el servidor este despierto (en el plan gratis se duerme tras un rato sin uso)
    const vivo = await esperarServidor(API_URL);
    if (!vivo) {
      setEstado("sin_conexion");
      return;
    }

    // 2) Si ya tienes una clave guardada, verificar que siga siendo valida
    const guardada = getApiKey();
    if (!guardada) {
      setEstado("pidiendo");
      return;
    }
    const resultado = await probarClave(API_URL, guardada);
    if (resultado === "ok") {
      setEstado("autorizado");
    } else if (resultado === "invalida") {
      clearApiKey(); // la clave guardada ya no sirve (cambiaste API_SECRET, por ejemplo)
      setEstado("pidiendo");
    } else {
      setEstado("sin_conexion"); // no es que la clave este mal: simplemente no pude conectarme
    }
  }, []);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const resultado = await probarClave(API_URL, clave);
    if (resultado === "ok") {
      setApiKey(clave);
      setEstado("autorizado");
    } else if (resultado === "invalida") {
      setError("Clave incorrecta.");
    } else {
      setError(
        "No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.",
      );
    }
    setEnviando(false);
  }

  if (estado === "despertando") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-gray-500 text-sm">Conectando con el servidor...</p>
        <p className="text-gray-400 text-xs max-w-xs">
          Si hace rato que no lo usas puede tardar hasta 1 minuto en despertar.
          Es normal.
        </p>
      </div>
    );
  }

  if (estado === "sin_conexion") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-red-600">
          No se pudo conectar con el servidor.
        </p>
        <button
          onClick={iniciar}
          className="text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (estado === "pidiendo") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <form onSubmit={entrar} className="w-full max-w-xs space-y-3">
          <h1 className="text-lg font-semibold text-center mb-4">
            Chile Futbol
          </h1>
          <input
            type="password"
            placeholder="Clave de acceso"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={enviando}
            className="w-full text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? "Verificando..." : "Entrar"}
          </button>
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
