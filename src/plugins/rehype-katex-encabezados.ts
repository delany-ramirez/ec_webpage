/**
 * Encabezados con LaTeX (`## 1. Por qué planear $n$`): KaTeX escribe cada fórmula tres veces
 * (MathML, su anotación TeX y la versión visible), y Astro arma el texto del TOC y de las
 * píldoras juntando todo el texto del encabezado → «Por qué planear nnn».
 *
 * Astro ignora los nodos `raw` que son solo HTML, así que aquí el bloque `.katex-mathml` de
 * cada encabezado se convierte en un nodo `raw` con el mismo HTML. La página no cambia (el
 * MathML sigue ahí para lectores de pantalla) y el TOC queda con la versión visible: «… n».
 * Debe ir después de rehype-katex.
 */
import type { Root, Element, ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";

function esMathml(n: ElementContent): boolean {
  if (n.type !== "element") return false;
  const clase = n.properties?.className;
  return Array.isArray(clase) && clase.includes("katex-mathml");
}

function reemplazar(nodo: Element) {
  nodo.children = nodo.children.map((hijo) => {
    if (esMathml(hijo)) return { type: "raw", value: toHtml(hijo).replace(/\n/g, "") } as unknown as ElementContent;
    if (hijo.type === "element") reemplazar(hijo);
    return hijo;
  });
}

function visitar(nodo: Root | Element) {
  for (const hijo of nodo.children) {
    if (hijo.type !== "element") continue;
    if (/^h[1-6]$/.test(hijo.tagName)) reemplazar(hijo);
    else visitar(hijo);
  }
}

export default function rehypeKatexEncabezados() {
  return (tree: Root) => visitar(tree);
}
