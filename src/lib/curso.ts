/**
 * Metadatos del curso derivados del repositorio de contenido (`content/`).
 *
 * El contenido no lleva frontmatter: cada archivo empieza con `# Título` y un bloque de cita
 * con objetivos y resultados de aprendizaje (`· **RAA1**`). La sesión sale de la carpeta y el
 * orden del prefijo `NN-` del archivo. Aquí se parsea eso una sola vez y se expone un modelo
 * uniforme (sesión, orden, título, ruta pública) para páginas, sidebar y navegación.
 */
import { getCollection, type CollectionEntry } from "astro:content";

import { MODULOS, moduloPorCarpeta, moduloPorNumero, DOCS, docsDelGrupo, type Modulo } from "./rutas";
export { MODULOS, moduloPorCarpeta, moduloPorNumero, DOCS, docsDelGrupo, type Modulo };

// ---------------------------------------------------------------------------
// Parseo de una entrada
// ---------------------------------------------------------------------------

export type TipoEntrada = "teoria" | "ejercicios" | "modulos";

export interface Leccion {
  /** id de la colección, p. ej. `sesion-1-variabilidad-inferencia/teoria/03-normalidad-tcl` */
  id: string;
  tipo: TipoEntrada;
  modulo: Modulo;
  /** `NN` del nombre de archivo (1 para READMEs; 90 + N para el taller integrador N) */
  orden: number;
  /** último segmento de la ruta, p. ej. `03-normalidad-tcl` */
  slug: string;
  /** Título sin el prefijo `Ejercicio NN —`, tal cual en Markdown (puede traer `código`) */
  titulo: string;
  /** Rótulo corto para listas: "01", "Ej. 02", "Taller 1" */
  rotulo: string;
  /** Sesión a la que pertenece (la carpeta del contenido) */
  sesion: string;
  /** Resultados de aprendizaje citados al inicio, p. ej. "RAA1, RAA2" */
  tema: string | null;
  /** Duración si aparece en la cabecera, p. ej. "40 min" */
  duracion: string | null;
  /** Talleres integradores: peso en la nota, p. ej. "20 %" */
  peso: string | null;
  /** true para el taller integrador (calificable) */
  taller: boolean;
  /** Ruta pública */
  ruta: string;
}

const RE_H1 = /^#\s+(.+?)\s*$/m;
const RE_RAA = /\*\*(RAA\d(?:\s*,\s*RAA\d)*)\*\*/;
const RE_DURACION = /\*\*Duración:\*\*\s*([^·\n]+?)\s*(?:·|$)/im;
const RE_PESO = /\*\*Peso:\*\*\s*([\d.,]+\s*%)/i;

function quitarPrefijo(titulo: string): string {
  // "Ejercicio 01 — Título" | "Taller integrador 1 — Título"
  return titulo.replace(/^(?:Ejercicio\s+\d{2}|Taller integrador\s+\d+)\s+[—–-]\s+/, "");
}

function ordenDesdeSlug(slug: string): number {
  const taller = slug.match(/^taller-integrador-(\d+)$/);
  if (taller) return 90 + parseInt(taller[1], 10);
  const m = slug.match(/^(?:ej)?(\d{2})-/);
  return m ? parseInt(m[1], 10) : 1;
}

function rutaPublica(tipo: TipoEntrada, modulo: Modulo, slug: string): string {
  switch (tipo) {
    case "teoria":
      return `/sesion/${modulo.numero}/teoria/${slug}/`;
    case "ejercicios":
      return `/sesion/${modulo.numero}/ejercicios/${slug}/`;
    case "modulos":
      return `/sesion/${modulo.numero}/`;
  }
}

export function parseLeccion(
  entry: CollectionEntry<"teoria" | "ejercicios" | "modulos">,
  tipo: TipoEntrada,
): Leccion | null {
  const [carpeta, ...resto] = entry.id.split("/");
  const modulo = moduloPorCarpeta(carpeta);
  if (!modulo) return null;

  const slug = resto[resto.length - 1] ?? "";
  const body = entry.body ?? "";
  const cabecera = body.slice(0, 700);

  const h1 = cabecera.match(RE_H1)?.[1] ?? slug;
  const orden = ordenDesdeSlug(slug);
  const taller = orden > 90;
  const rotulo = taller ? `Taller ${orden - 90}` : tipo === "ejercicios" ? `Ej. ${nn(orden)}` : nn(orden);

  return {
    id: entry.id,
    tipo,
    modulo,
    orden,
    slug,
    titulo: entry.data.title ?? quitarPrefijo(h1),
    rotulo,
    sesion: String(modulo.numero),
    tema: cabecera.match(RE_RAA)?.[1]?.replace(/\s*,\s*/g, " · ") ?? null,
    duracion: entry.data.duracion ?? cabecera.match(RE_DURACION)?.[1]?.trim() ?? null,
    peso: cabecera.match(RE_PESO)?.[1] ?? null,
    taller,
    ruta: rutaPublica(tipo, modulo, slug),
  };
}

// ---------------------------------------------------------------------------
// Índice del curso (orden global sesión → NN) y navegación
// ---------------------------------------------------------------------------

function porModuloYOrden(a: Leccion, b: Leccion): number {
  return a.modulo.numero - b.modulo.numero || a.orden - b.orden;
}

export async function lecciones(): Promise<Leccion[]> {
  const entradas = await getCollection("teoria");
  return entradas
    .map((e) => parseLeccion(e, "teoria"))
    .filter((l): l is Leccion => l !== null)
    .sort(porModuloYOrden);
}

export async function ejerciciosDe(numeroModulo: number): Promise<Leccion[]> {
  const entradas = await getCollection("ejercicios");
  return entradas
    .map((e) => parseLeccion(e, "ejercicios"))
    .filter((l): l is Leccion => l !== null && l.modulo.numero === numeroModulo)
    .sort(porModuloYOrden);
}

export async function ejerciciosPorModulo(): Promise<Map<number, Leccion[]>> {
  const entradas = await getCollection("ejercicios");
  const mapa = new Map<number, Leccion[]>();
  for (const m of MODULOS) mapa.set(m.numero, []);
  for (const e of entradas) {
    const l = parseLeccion(e, "ejercicios");
    if (l) mapa.get(l.modulo.numero)!.push(l);
  }
  for (const lista of mapa.values()) lista.sort(porModuloYOrden);
  return mapa;
}

/** Documento suelto (pre-trabajos, recursos) por id de colección. */
export function docDeEntrada(entry: CollectionEntry<"docs">) {
  const clave = Object.keys(DOCS).find((k) => k.toLowerCase() === entry.id.toLowerCase());
  return clave ? DOCS[clave] : null;
}

export async function leccionesPorModulo(): Promise<Map<number, Leccion[]>> {
  const todas = await lecciones();
  const mapa = new Map<number, Leccion[]>();
  for (const m of MODULOS) mapa.set(m.numero, []);
  for (const l of todas) mapa.get(l.modulo.numero)!.push(l);
  return mapa;
}

export async function prevNext(id: string): Promise<{ prev: Leccion | null; next: Leccion | null }> {
  const todas = await lecciones();
  const i = todas.findIndex((l) => l.id === id);
  return {
    prev: i > 0 ? todas[i - 1] : null,
    next: i >= 0 && i < todas.length - 1 ? todas[i + 1] : null,
  };
}

// ---------------------------------------------------------------------------
// Utilidades de presentación
// ---------------------------------------------------------------------------

/** Convierte `código` inline del título a <code>, escapando el resto. */
export function tituloHtml(titulo: string): string {
  const esc = titulo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Título plano (para <title>, aria-label, búsqueda). */
export function tituloTexto(titulo: string): string {
  return titulo.replace(/`/g, "");
}

export function etiquetaSesion(l: Pick<Leccion, "sesion">): string {
  return `Sesión ${l.sesion}`;
}

/** Clave corta y estable de una lección para el progreso en localStorage: "1/03-normalidad-tcl". */
export function claveProgreso(l: Pick<Leccion, "modulo" | "slug">): string {
  return `${l.modulo.numero}/${l.slug}`;
}

export function nn(n: number): string {
  return String(n).padStart(2, "0");
}
