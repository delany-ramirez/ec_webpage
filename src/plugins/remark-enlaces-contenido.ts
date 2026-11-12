/**
 * Reescribe los enlaces relativos del contenido (`teoria/01-x.md`, `../pre-trabajos/`,
 * `notebooks/01-x.Rmd`, `datos/x.csv`, `../install.R`) para que funcionen en el sitio: a la
 * ruta pública si la página existe, a `/archivos/…` si es una descarga (prácticas, plantillas,
 * datos) o a GitHub si es otro archivo. Los enlaces a material del docente (`docente/`,
 * soluciones no publicadas) se convierten en texto plano.
 */
import path from "node:path";
import type { Root, Link } from "mdast";
import type { VFile } from "vfile";
import { destinoDeContenido } from "../lib/rutas";

const RAIZ_CONTENIDO = path.resolve(process.cwd(), "content");

function esRelativo(url: string): boolean {
  return !/^([a-z]+:|\/|#|mailto:)/i.test(url);
}

function visitar(nodo: any, fn: (link: Link, padre: any, indice: number) => void) {
  const hijos = nodo.children;
  if (!Array.isArray(hijos)) return;
  for (let i = 0; i < hijos.length; i++) {
    const h = hijos[i];
    if (h.type === "link") fn(h, nodo, i);
    visitar(h, fn);
  }
}

export default function remarkEnlacesContenido() {
  return (tree: Root, file: VFile) => {
    if (!file.path) return;
    const relArchivo = path.relative(RAIZ_CONTENIDO, file.path);
    if (relArchivo.startsWith("..")) return; // no es un archivo del contenido
    const dirArchivo = path.posix.dirname(relArchivo.split(path.sep).join("/"));

    visitar(tree, (link, padre, i) => {
      if (!esRelativo(link.url)) return;
      const [destino, ancla] = link.url.split("#");
      const resuelta = path.posix.normalize(path.posix.join(dirArchivo, destino));
      if (resuelta.startsWith("..")) return;

      const publico = destinoDeContenido(resuelta);
      if (publico === null) {
        // Material del docente: dejar solo el texto del enlace.
        padre.children.splice(i, 1, ...link.children);
        return;
      }
      link.url = ancla ? `${publico}#${ancla}` : publico;
      if (/^https?:/.test(publico)) {
        link.data = { ...(link.data ?? {}), hProperties: { target: "_blank", rel: ["noopener"] } };
      } else if (publico.startsWith("/archivos/")) {
        link.data = { ...(link.data ?? {}), hProperties: { download: path.posix.basename(publico), class: "ref-descarga" } };
      }
    });
  };
}
