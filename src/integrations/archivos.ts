/**
 * Publica los archivos de trabajo del contenido sin copiarlos al repositorio:
 *   - `/archivos/<ruta>`: cada práctica `.Rmd`, plantilla, dato `.csv` e `install.R`
 *     (criterio en `esDescargable()` de lib/rutas.ts);
 *   - `/descargas/<carpeta>.zip`: todo el material de una sesión o de los pre-trabajos con su
 *     estructura de carpetas (`notebooks/`, `datos/`, `ejercicios/`), listo para hacer Knit:
 *     las prácticas leen los datos con rutas relativas `../datos/`.
 * En build se escriben en `dist/`; en `astro dev` se sirven desde el submodule con un
 * middleware. Nada de `docente/` ni soluciones no publicadas entra en ninguno de los dos.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { AstroIntegration } from "astro";
import { MODULOS, esDelDocente, esDescargable } from "../lib/rutas";
import { RAIZ_CONTENIDO } from "../lib/notebooks-fs";

/** Carpetas con paquete .zip propio. */
export const PAQUETES = [...MODULOS.map((m) => m.carpeta), "pre-trabajos"];

function* recorrer(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(abs);
    else yield path.relative(RAIZ_CONTENIDO, abs).split(path.sep).join("/");
  }
}

function descargables(): string[] {
  return [...recorrer(RAIZ_CONTENIDO)].filter(esDescargable);
}

function contenidoPaquete(carpeta: string): string[] {
  const propios = [...recorrer(path.join(RAIZ_CONTENIDO, carpeta))].filter((r) => /\.(md|Rmd|csv)$/i.test(r) && !esDelDocente(r));
  return ["install.R", ...propios];
}

// ---------------------------------------------------------------------------
// ZIP mínimo (deflate, sin dependencias)
// ---------------------------------------------------------------------------

function fechaDos(d: Date): { hora: number; fecha: number } {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function crearZip(entradas: { nombre: string; datos: Buffer }[]): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  const { hora, fecha } = fechaDos(new Date());

  for (const { nombre, datos } of entradas) {
    const nombreBuf = Buffer.from(nombre, "utf8");
    const comprimido = zlib.deflateRawSync(datos);
    const crc = zlib.crc32(datos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBuf.length, 26);
    locales.push(local, nombreBuf, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(fecha, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombreBuf.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    centrales.push(central, nombreBuf);

    desplazamiento += local.length + nombreBuf.length + comprimido.length;
  }

  const tamCentral = centrales.reduce((n, b) => n + b.length, 0);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(tamCentral, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, ...centrales, fin]);
}

function zipDe(carpeta: string): Buffer {
  return crearZip(contenidoPaquete(carpeta).map((rel) => ({ nombre: rel, datos: fs.readFileSync(path.join(RAIZ_CONTENIDO, rel)) })));
}

const TIPOS: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".rmd": "text/plain; charset=utf-8",
  ".r": "text/plain; charset=utf-8",
};

export default function archivos(): AstroIntegration {
  return {
    name: "ec-archivos",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const url = decodeURIComponent(req.url?.split("?")[0] ?? "");
          const archivo = url.match(/^\/archivos\/(.+)$/)?.[1];
          if (archivo && esDescargable(archivo) && fs.existsSync(path.join(RAIZ_CONTENIDO, archivo))) {
            res.setHeader("Content-Type", TIPOS[path.extname(archivo).toLowerCase()] ?? "application/octet-stream");
            fs.createReadStream(path.join(RAIZ_CONTENIDO, archivo)).pipe(res);
            return;
          }
          const paquete = url.match(/^\/descargas\/([a-z0-9-]+)\.zip$/)?.[1];
          if (paquete && PAQUETES.includes(paquete)) {
            res.setHeader("Content-Type", "application/zip");
            res.end(zipDe(paquete));
            return;
          }
          next();
        });
      },
      "astro:build:done": ({ dir, logger }) => {
        let n = 0;
        for (const rel of descargables()) {
          const destino = new URL(`archivos/${rel}`, dir);
          fs.mkdirSync(new URL("./", destino), { recursive: true });
          fs.copyFileSync(path.join(RAIZ_CONTENIDO, rel), destino);
          n++;
        }
        const descargas = new URL("descargas/", dir);
        fs.mkdirSync(descargas, { recursive: true });
        for (const carpeta of PAQUETES) fs.writeFileSync(new URL(`${carpeta}.zip`, descargas), zipDe(carpeta));
        logger.info(`${n} archivos en /archivos/ y ${PAQUETES.length} paquetes en /descargas/`);
      },
    },
  };
}
