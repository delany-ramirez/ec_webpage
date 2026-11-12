/**
 * Mapa entre rutas del repositorio de contenido (`content/...`) y rutas públicas del sitio.
 *
 * Sin dependencias de `astro:content` para poder usarse también desde plugins remark
 * (que corren en el proceso de build de Vite, fuera del runtime de Astro).
 *
 * El curso se organiza en dos sesiones presenciales (sábados de 6 h) precedidas de
 * pre-trabajos. Internamente cada sesión se modela como un `Modulo` (mismo papel que los
 * módulos del portal de Machine Learning); en la interfaz siempre se dice «Sesión».
 */

export const REPO_CONTENIDO = "https://github.com/delany-ramirez/intro_estadistica_calidad";
export const RAMA_CONTENIDO = "main";

/**
 * Las soluciones de los ejercicios de práctica (`sesion-*\/ejercicios/ejNN-*-sol.Rmd`) están
 * pensadas para el estudiante: cada enunciado termina con «Solución en … Intenta resolverlo
 * antes de mirarla». Con `true` se publican como descarga. Las soluciones de talleres,
 * pre-trabajos y evaluación viven en `docente/` y nunca se publican.
 */
export const PUBLICAR_SOLUCIONES_EJERCICIOS = true;

export interface Modulo {
  numero: number;
  carpeta: string;
  nombre: string;
  corto: string;
  /** Resultados de aprendizaje que trabaja la sesión */
  raa: string[];
  horas: number;
  /** Peso de lo que se califica en la sesión */
  peso: string;
}

/** Espejo de la tabla «Programa» del README del contenido (fuente de verdad). */
export const MODULOS: Modulo[] = [
  { numero: 1, carpeta: "sesion-1-variabilidad-inferencia", nombre: "Variabilidad, normalidad e inferencia", corto: "Variabilidad e inferencia", raa: ["RAA1", "RAA2", "RAA3"], horas: 6, peso: "Taller integrador 1 · 20 %" },
  { numero: 2, carpeta: "sesion-2-inferencia-regresion", nombre: "Inferencia aplicada, regresión y supuestos", corto: "Inferencia y regresión", raa: ["RAA3", "RAA4"], horas: 6, peso: "Evaluación individual · 50 %" },
];

export function moduloPorNumero(n: number): Modulo | undefined {
  return MODULOS.find((m) => m.numero === n);
}

export function moduloPorCarpeta(carpeta: string): Modulo | undefined {
  return MODULOS.find((m) => m.carpeta === carpeta);
}

export interface Doc {
  ruta: string;
  titulo: string;
  nav: string;
  grupo: "pre" | "recursos";
}

/** Documentos sueltos del contenido publicados como página propia (clave: ruta sin `.md`). */
export const DOCS: Record<string, Doc> = {
  "pre-trabajos/README": { ruta: "/pre-trabajos/", titulo: "Pre-trabajos", nav: "Calendario y entrega", grupo: "pre" },
  "pre-trabajos/00-instalacion-r": { ruta: "/pre-trabajos/instalacion/", titulo: "Instalación de R y RStudio", nav: "Instalación de R", grupo: "pre" },
  "pre-trabajos/diagnostico-entrada": { ruta: "/pre-trabajos/diagnostico/", titulo: "Diagnóstico de entrada", nav: "Diagnóstico de entrada", grupo: "pre" },
  "pre-trabajos/pre-trabajo-1": { ruta: "/pre-trabajos/1/", titulo: "Pre-trabajo 1", nav: "Pre-trabajo 1", grupo: "pre" },
  "pre-trabajos/pre-trabajo-2": { ruta: "/pre-trabajos/2/", titulo: "Pre-trabajo 2", nav: "Pre-trabajo 2", grupo: "pre" },
  "recursos/README": { ruta: "/recursos/", titulo: "Recursos generales", nav: "Recursos", grupo: "recursos" },
  "recursos/cheatsheet-estadistica-r": { ruta: "/recursos/cheatsheet/", titulo: "Cheatsheet de estadística en R", nav: "Cheatsheet", grupo: "recursos" },
  "recursos/plantillas/checklist-analisis": { ruta: "/recursos/checklist/", titulo: "Checklist de análisis", nav: "Checklist", grupo: "recursos" },
  "recursos/bibliografia": { ruta: "/recursos/bibliografia/", titulo: "Bibliografía", nav: "Bibliografía", grupo: "recursos" },
  "recursos/enlaces": { ruta: "/recursos/enlaces/", titulo: "Enlaces", nav: "Enlaces", grupo: "recursos" },
};

export function docsDelGrupo(grupo: Doc["grupo"]): Doc[] {
  return Object.values(DOCS).filter((d) => d.grupo === grupo);
}

export function docPorRuta(rutaContenido: string) {
  const clave = rutaContenido.replace(/\.md$/i, "").replace(/\/$/, "");
  const directa = DOCS[clave];
  if (directa) return directa;
  // Una carpeta enlaza a su README: `pre-trabajos/` → `pre-trabajos/README`
  return DOCS[`${clave}/README`];
}

export function urlGitHub(rutaContenido: string, esDirectorio = false): string {
  const tipo = esDirectorio ? "tree" : "blob";
  return `${REPO_CONTENIDO}/${tipo}/${RAMA_CONTENIDO}/${rutaContenido.replace(/^\/+/, "")}`;
}

/** Material del docente: nunca se enlaza ni se publica. */
export function esDelDocente(rutaContenido: string): boolean {
  const ruta = rutaContenido.replace(/^\.?\//, "");
  if (/^docente(\/|$)/.test(ruta)) return true;
  if (/-sol\.[a-z]+$/i.test(ruta)) {
    const esSolucionDeEjercicio = /^sesion-\d-[^/]+\/ejercicios\/ej\d{2}-[^/]+-sol\.Rmd$/i.test(ruta);
    return !(esSolucionDeEjercicio && PUBLICAR_SOLUCIONES_EJERCICIOS);
  }
  return false;
}

/**
 * Archivos del contenido que el sitio sirve como descarga en `/archivos/<ruta>`: prácticas y
 * plantillas `.Rmd`, datos `.csv` e `install.R`. Se sirven desde el mismo origen para que el
 * atributo `download` guarde el archivo (GitHub raw lo mostraría como texto).
 */
export function esDescargable(rutaContenido: string): boolean {
  const ruta = rutaContenido.replace(/^\.?\//, "");
  if (esDelDocente(ruta)) return false;
  if (ruta === "install.R") return true;
  return /^(sesion-\d-[^/]+|pre-trabajos|recursos)\/.*\.(Rmd|csv)$/i.test(ruta);
}

export function urlDescarga(rutaContenido: string): string {
  return `/archivos/${rutaContenido.replace(/^\.?\//, "")}`;
}

/** Paquete .zip con todo el material de una sesión o de los pre-trabajos (ver integración). */
export function urlPaquete(carpeta: string): string {
  return `/descargas/${carpeta}.zip`;
}

/**
 * Traduce una ruta relativa al repositorio de contenido a un destino público.
 * Devuelve `null` cuando el destino no debe enlazarse (material del docente).
 */
export function destinoDeContenido(rutaContenido: string): string | null {
  const ruta = rutaContenido.replace(/^\.?\//, "").replace(/\\/g, "/");
  const esDir = ruta.endsWith("/") || !/\.[a-z0-9]+$/i.test(ruta);

  if (esDelDocente(ruta)) return null;

  const doc = docPorRuta(ruta);
  if (doc) return doc.ruta;

  const m = ruta.match(/^(sesion-\d-[^/]+)\/?(.*)$/);
  if (m) {
    const modulo = moduloPorCarpeta(m[1]);
    const resto = m[2];
    if (modulo) {
      if (resto === "" || /^README\.md$/i.test(resto)) return `/sesion/${modulo.numero}/`;
      let t = resto.match(/^teoria\/([^/]+)\.md$/i);
      if (t) return `/sesion/${modulo.numero}/teoria/${t[1]}/`;
      t = resto.match(/^ejercicios\/([^/]+)\.md$/i);
      if (t) return `/sesion/${modulo.numero}/ejercicios/${t[1]}/`;
    }
  }

  if (esDescargable(ruta)) return urlDescarga(ruta);
  return urlGitHub(ruta, esDir);
}
