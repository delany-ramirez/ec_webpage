/**
 * Elimina el primer `# H1` (y una línea de metadatos `**Sesión N**` si la siguiera).
 * La página ya muestra título y sesión en su propia cabecera (ver lib/curso.ts). El bloque
 * de cita con los objetivos se conserva: es parte de la lección.
 */
import type { Root, RootContent } from "mdast";

function esLineaMeta(nodo: RootContent): boolean {
  if (nodo.type !== "paragraph" || nodo.children.length === 0) return false;
  const primero = nodo.children[0];
  if (primero.type !== "strong") return false;
  const texto = primero.children.map((c) => ("value" in c ? c.value : "")).join("");
  return /^Sesi(ón|ones)\s+[\d–-]+/i.test(texto);
}

export default function remarkQuitarH1() {
  return (tree: Root) => {
    const i = tree.children.findIndex((n) => n.type === "heading" && n.depth === 1);
    if (i === -1) return;
    tree.children.splice(i, 1);
    if (tree.children[i] && esLineaMeta(tree.children[i])) {
      tree.children.splice(i, 1);
    }
  };
}
