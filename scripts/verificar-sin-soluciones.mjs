/**
 * Segunda barrera contra la publicación de material del docente.
 * Falla (exit 1) si en dist/ aparece algo de `docente/` (soluciones de talleres y
 * pre-trabajos, evaluación individual, rúbricas, clave del diagnóstico), ya sea como archivo,
 * dentro de los paquetes .zip o enlazado desde una página.
 *
 * Las únicas soluciones permitidas son las de los ejercicios de práctica
 * (`sesion-N-*\/ejercicios/ejNN-*-sol.Rmd`), que el contenido ofrece al estudiante
 * (ver PUBLICAR_SOLUCIONES_EJERCICIOS en src/lib/rutas.ts).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const SOLUCION_PERMITIDA = /sesion-\d-[^/\\]+[/\\]ejercicios[/\\]ej\d{2}-[^/\\]+-sol\.Rmd$/i;
// Nombres de archivos que solo existen en docente/ del repositorio de contenido.
const MARCAS = [
  "docente/",
  "diagnostico-clave",
  "evaluacion-individual",
  "rubrica-evaluacion",
  "taller-integrador-1-sol",
  "pre-trabajo-1-sol",
  "pre-trabajo-2-sol",
  "generar-datos.R",
];

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else yield ruta;
  }
}

const problemas = [];
for (const ruta of archivos(DIST)) {
  if (/[/\\]docente[/\\]/i.test(ruta)) problemas.push(`ruta del docente: ${ruta}`);
  if (/-sol\.[a-z]+$/i.test(ruta) && !SOLUCION_PERMITIDA.test(ruta)) problemas.push(`solución no permitida: ${ruta}`);

  if (ruta.endsWith(".zip")) {
    // Los nombres de las entradas van sin comprimir en el directorio central del .zip.
    const texto = readFileSync(ruta).toString("latin1");
    for (const nombre of texto.match(/[\w./-]+-sol\.(?:Rmd|md|qmd|R)(?=PK|[^A-Za-z]|$)/g) ?? []) {
      if (!SOLUCION_PERMITIDA.test(nombre)) problemas.push(`solución no permitida "${nombre}" en ${ruta}`);
    }
    for (const marca of MARCAS) if (texto.includes(marca)) problemas.push(`"${marca}" en ${ruta}`);
  }

  if (ruta.endsWith(".html")) {
    const html = readFileSync(ruta, "utf8");
    for (const marca of MARCAS) {
      // Solo cuenta si aparece en un enlace: el texto puede mencionar «docente/» sin exponer nada.
      if (new RegExp(`href="[^"]*${marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(html)) {
        problemas.push(`enlace a "${marca}" en ${ruta}`);
      }
    }
  }
}

if (problemas.length > 0) {
  console.error("✖ Material del docente detectado en el build:\n  " + problemas.join("\n  "));
  process.exit(1);
}
console.log("✓ dist/ sin material del docente");
