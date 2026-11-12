/**
 * Inventario de prácticas R Markdown (`sesion-N/notebooks/*.Rmd`) leído del sistema de
 * archivos (sin `astro:content`, para poder usarse desde la integración de build).
 *
 * Dos fuentes que mantiene el docente en el README de cada sesión:
 *   - la tabla «Prácticas (R Markdown)», de donde sale la descripción de cada práctica;
 *   - la tabla «Agenda», cuya columna Material dice qué práctica y qué ejercicio acompañan a
 *     cada teoría («Teoría 03 · Práctica 02 · Ej. 02»). De ahí se arma el bloque Practica.
 */
import fs from "node:fs";
import path from "node:path";
import { MODULOS, moduloPorNumero, urlGitHub, urlDescarga } from "./rutas";

export const RAIZ_CONTENIDO = path.resolve(process.cwd(), "content");

export interface Notebook {
  modulo: number;
  orden: number;
  archivo: string;
  /** `title:` del YAML del .Rmd, sin el prefijo `NN ·`; el nombre de archivo si no hay */
  titulo: string;
  /** ruta relativa al repositorio de contenido */
  rutaContenido: string;
  /** Markdown inline del README (puede traer `código`) */
  descripcion: string | null;
  github: string;
  /** ruta pública del archivo en este sitio */
  descarga: string;
}

// | 01 | [`notebooks/x.Rmd`](notebooks/x.Rmd) | contenido |
const RE_FILA = /^\|\s*\d+\s*\|\s*\[`notebooks\/([^`]+\.Rmd)`\][^|]*\|\s*(.*?)\s*\|\s*$/;

function leerReadme(carpeta: string): string[] {
  const ruta = path.join(RAIZ_CONTENIDO, carpeta, "README.md");
  return fs.existsSync(ruta) ? fs.readFileSync(ruta, "utf8").split(/\r?\n/) : [];
}

function descripcionesReadme(carpeta: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const linea of leerReadme(carpeta)) {
    const m = linea.match(RE_FILA);
    if (m) mapa.set(m[1], m[2]);
  }
  return mapa;
}

/** Lee `title:` del encabezado YAML del .Rmd. */
function tituloDesdeRmd(rutaAbs: string, archivo: string): string {
  try {
    const texto = fs.readFileSync(rutaAbs, "utf8");
    const yaml = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const t = yaml.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
    if (t) return t.replace(/^\d{2}\s+·\s+/, "");
  } catch {
    /* archivo ilegible: se usa el nombre */
  }
  return archivo.replace(/\.Rmd$/, "");
}

let cache: Notebook[] | null = null;

export function listarNotebooks(): Notebook[] {
  if (cache) return cache;
  const lista: Notebook[] = [];
  for (const modulo of MODULOS) {
    const dir = path.join(RAIZ_CONTENIDO, modulo.carpeta, "notebooks");
    if (!fs.existsSync(dir)) continue;
    const descripciones = descripcionesReadme(modulo.carpeta);
    for (const archivo of fs.readdirSync(dir).filter((f) => /^\d{2}-[a-z0-9-]+\.Rmd$/.test(f)).sort()) {
      const rutaContenido = `${modulo.carpeta}/notebooks/${archivo}`;
      lista.push({
        modulo: modulo.numero,
        orden: parseInt(archivo.slice(0, 2), 10),
        archivo,
        titulo: tituloDesdeRmd(path.join(dir, archivo), archivo),
        rutaContenido,
        descripcion: descripciones.get(archivo) ?? null,
        github: urlGitHub(rutaContenido),
        descarga: urlDescarga(rutaContenido),
      });
    }
  }
  cache = lista;
  return lista;
}

export function notebooksDe(numeroModulo: number): Notebook[] {
  return listarNotebooks().filter((n) => n.modulo === numeroModulo);
}

// ---------------------------------------------------------------------------
// Agenda: qué práctica y qué ejercicio acompañan a cada teoría
// ---------------------------------------------------------------------------

export interface PracticaCitada {
  notebook: Notebook;
  /** secciones citadas en la agenda, p. ej. "§1–3"; null si es la práctica completa */
  secciones: string | null;
}

interface FilaAgenda {
  teorias: number[];
  practicas: { orden: number; secciones: string | null }[];
  ejercicios: number[];
}

function filasAgenda(numeroModulo: number): FilaAgenda[] {
  const modulo = moduloPorNumero(numeroModulo);
  if (!modulo) return [];
  const filas: FilaAgenda[] = [];
  for (const linea of leerReadme(modulo.carpeta)) {
    if (!/^\|.*Teoría\s+\d{2}/.test(linea)) continue;
    const celdas = linea.split("|").map((c) => c.trim());
    const material = celdas[celdas.length - 2] ?? "";
    filas.push({
      teorias: Array.from(material.matchAll(/Teoría\s+(\d{2})/g), (m) => parseInt(m[1], 10)),
      practicas: Array.from(material.matchAll(/Práctica\s+(\d{2})(?:\s*\(([^)]+)\))?/g), (m) => ({ orden: parseInt(m[1], 10), secciones: m[2] ?? null })),
      ejercicios: Array.from(material.matchAll(/Ej\.\s+(\d{2})/g), (m) => parseInt(m[1], 10)),
    });
  }
  return filas;
}

function aPracticas(numeroModulo: number, filas: FilaAgenda[]): PracticaCitada[] {
  const propias = notebooksDe(numeroModulo);
  const vistas = new Map<number, PracticaCitada>();
  for (const f of filas) {
    for (const p of f.practicas) {
      const notebook = propias.find((n) => n.orden === p.orden);
      if (!notebook) continue;
      const previa = vistas.get(p.orden);
      if (!previa) vistas.set(p.orden, { notebook, secciones: p.secciones });
      // Si una fila la cita completa y otra por secciones, gana «completa».
      else if (previa.secciones && !p.secciones) previa.secciones = null;
      else if (previa.secciones && p.secciones && previa.secciones !== p.secciones) previa.secciones = `${previa.secciones} · ${p.secciones}`;
    }
  }
  return [...vistas.values()].sort((a, b) => a.notebook.orden - b.notebook.orden);
}

/** Prácticas y números de ejercicio que la agenda asocia a la teoría `NN` de la sesión. */
export function materialDeTeoria(numeroModulo: number, ordenTeoria: number): { practicas: PracticaCitada[]; ejercicios: number[] } {
  const filas = filasAgenda(numeroModulo).filter((f) => f.teorias.includes(ordenTeoria));
  return { practicas: aPracticas(numeroModulo, filas), ejercicios: [...new Set(filas.flatMap((f) => f.ejercicios))].sort((a, b) => a - b) };
}

/** Prácticas que la agenda asocia al ejercicio `NN` de la sesión. */
export function practicasDeEjercicio(numeroModulo: number, ordenEjercicio: number): PracticaCitada[] {
  return aPracticas(numeroModulo, filasAgenda(numeroModulo).filter((f) => f.ejercicios.includes(ordenEjercicio)));
}
