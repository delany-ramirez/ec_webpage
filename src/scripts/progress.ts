/**
 * Progreso del estudiante, sin cuentas: vive en localStorage de este navegador.
 * Para cambiar de dispositivo se exporta un código (base64url de este mismo objeto) y se
 * importa en el otro. Las claves de lección son "N/slug" (ver claveProgreso en lib/curso.ts).
 */
export interface ResultadoQuiz {
  score: number;
  total: number;
  fecha: string;
}

export interface Progreso {
  completadas: string[];
  autoevaluacion: Record<string, ResultadoQuiz>;
  actualizado: string;
}

export const CLAVE_PROGRESO = "ec.delanyr.dev/progress/v1";
const PREFIJO_CODIGO = "ECDR1-";

const vacio = (): Progreso => ({ completadas: [], autoevaluacion: {}, actualizado: new Date(0).toISOString() });

function normalizar(x: unknown): Progreso | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const completadas = Array.isArray(o.completadas) ? o.completadas.filter((c): c is string => typeof c === "string") : [];
  const autoevaluacion: Record<string, ResultadoQuiz> = {};
  if (o.autoevaluacion && typeof o.autoevaluacion === "object") {
    for (const [k, v] of Object.entries(o.autoevaluacion as Record<string, unknown>)) {
      const r = v as Partial<ResultadoQuiz>;
      if (typeof r?.score === "number" && typeof r?.total === "number") {
        autoevaluacion[k] = { score: r.score, total: r.total, fecha: typeof r.fecha === "string" ? r.fecha : new Date().toISOString() };
      }
    }
  }
  return { completadas: [...new Set(completadas)], autoevaluacion, actualizado: typeof o.actualizado === "string" ? o.actualizado : new Date().toISOString() };
}

export function leer(): Progreso {
  try {
    const raw = localStorage.getItem(CLAVE_PROGRESO);
    return (raw && normalizar(JSON.parse(raw))) || vacio();
  } catch {
    return vacio();
  }
}

function guardar(p: Progreso): void {
  p.actualizado = new Date().toISOString();
  try {
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible: el progreso vive solo en memoria de esta página */
  }
  document.dispatchEvent(new CustomEvent<Progreso>("progress:change", { detail: p }));
}

export function estaHecha(clave: string): boolean {
  return leer().completadas.includes(clave);
}

export function marcar(clave: string, hecha: boolean): Progreso {
  const p = leer();
  const i = p.completadas.indexOf(clave);
  if (hecha && i === -1) p.completadas.push(clave);
  if (!hecha && i !== -1) p.completadas.splice(i, 1);
  guardar(p);
  return p;
}

export function alternar(clave: string): boolean {
  const hecha = !estaHecha(clave);
  marcar(clave, hecha);
  return hecha;
}

/** Guarda el resultado de una autoevaluación si mejora el anterior (o si no había). */
export function guardarQuiz(clave: string, score: number, total: number): Progreso {
  const p = leer();
  const previo = p.autoevaluacion[clave];
  if (!previo || score / total >= previo.score / previo.total) {
    p.autoevaluacion[clave] = { score, total, fecha: new Date().toISOString() };
  }
  guardar(p);
  return p;
}

export function reiniciar(): void {
  guardar(vacio());
}

// --- exportar / importar ---------------------------------------------------

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(norm);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportar(): string {
  const p = leer();
  const compacto = { c: p.completadas, q: p.autoevaluacion, t: p.actualizado };
  return PREFIJO_CODIGO + aBase64Url(JSON.stringify(compacto));
}

/** Devuelve el progreso importado, o null si el código no es válido. Fusiona con lo local. */
export function importar(codigo: string, fusionar = true): Progreso | null {
  const limpio = codigo.trim();
  if (!limpio.startsWith(PREFIJO_CODIGO)) return null;
  try {
    const raw = JSON.parse(deBase64Url(limpio.slice(PREFIJO_CODIGO.length)));
    const externo = normalizar({ completadas: raw.c, autoevaluacion: raw.q, actualizado: raw.t });
    if (!externo) return null;
    const base = fusionar ? leer() : vacio();
    const p: Progreso = {
      completadas: [...new Set([...base.completadas, ...externo.completadas])],
      autoevaluacion: { ...base.autoevaluacion },
      actualizado: base.actualizado,
    };
    for (const [k, r] of Object.entries(externo.autoevaluacion)) {
      const prev = p.autoevaluacion[k];
      if (!prev || r.score / r.total >= prev.score / prev.total) p.autoevaluacion[k] = r;
    }
    guardar(p);
    return p;
  } catch {
    return null;
  }
}
