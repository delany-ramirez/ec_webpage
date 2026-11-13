/**
 * Paquetes .zip de material para el estudiante: uno por sesión y uno de pre-trabajos.
 * La integración `integrations/archivos.ts` los escribe en `/descargas/<carpeta>.zip`; las
 * páginas usan este mismo inventario para mostrar qué trae cada uno. Sin `astro:content`.
 */
import fs from "node:fs";
import path from "node:path";
import { MODULOS, PUBLICAR_SOLUCIONES_EJERCICIOS, esDelDocente, urlPaquete } from "./rutas";

export const RAIZ_CONTENIDO = path.resolve(process.cwd(), "content");

export interface Paquete {
  carpeta: string;
  titulo: string;
  /** Para qué sirve, en una línea */
  uso: string;
  url: string;
}

export const PAQUETES: Paquete[] = [
  {
    carpeta: "pre-trabajos",
    titulo: "Pre-trabajos",
    uso: "install.R, el tutorial de R, las plantillas de los pre-trabajos y sus datos. Es el primero que necesitas.",
    url: urlPaquete("pre-trabajos"),
  },
  ...MODULOS.map((m) => ({
    carpeta: m.carpeta,
    titulo: `Sesión ${m.numero} · ${m.corto}`,
    uso: `Prácticas .Rmd, datos, enunciados de ejercicios${m.numero === 1 ? ", plantilla del taller integrador" : ""}${PUBLICAR_SOLUCIONES_EJERCICIOS ? " y soluciones de los ejercicios de práctica" : ""}, con la estructura de carpetas que usan las prácticas.`,
    url: urlPaquete(m.carpeta),
  })),
];

export function paquetePorCarpeta(carpeta: string): Paquete | undefined {
  return PAQUETES.find((p) => p.carpeta === carpeta);
}

export function* recorrer(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(abs);
    else yield path.relative(RAIZ_CONTENIDO, abs).split(path.sep).join("/");
  }
}

/** Rutas (relativas al contenido) que entran en el .zip de una carpeta; `install.R` va en todos. */
export function contenidoPaquete(carpeta: string): string[] {
  const propios = [...recorrer(path.join(RAIZ_CONTENIDO, carpeta))].filter((r) => /\.(md|Rmd|csv)$/i.test(r) && !esDelDocente(r));
  return ["install.R", ...propios];
}

/** Resumen para mostrar: «3 prácticas .Rmd · 8 datos .csv · …». */
export function resumenPaquete(carpeta: string): string {
  const rutas = contenidoPaquete(carpeta);
  const contar = (re: RegExp) => rutas.filter((r) => re.test(r)).length;
  const practicas = contar(/\/notebooks\/[^/]+\.Rmd$/i);
  const plantillas = contar(/_plantilla\.Rmd$/i);
  const soluciones = contar(/-sol\.Rmd$/i);
  const partes: [number, string, string][] = [
    [practicas, "práctica", "prácticas"],
    [plantillas, "plantilla", "plantillas"],
    [soluciones, "solución", "soluciones"],
    // p. ej. el tutorial de R de los pre-trabajos
    [contar(/\.Rmd$/i) - practicas - plantillas - soluciones, "otro", "otros"],
  ];
  const textos = partes.filter(([n]) => n > 0).map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios} .Rmd`);
  const datos = contar(/\.csv$/i);
  const docs = contar(/\.md$/i);
  if (datos > 0) textos.push(`${datos} ${datos === 1 ? "dato" : "datos"} .csv`);
  if (docs > 0) textos.push(`${docs} ${docs === 1 ? "documento" : "documentos"} .md`);
  return [...textos, "install.R"].join(" · ");
}
