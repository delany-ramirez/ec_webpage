/**
 * Enlaza el progreso con el DOM. Se carga en todas las páginas (Base.astro) y reacciona a
 * `progress:change`. Contratos de marcado:
 *   [data-marca="clave"]            punto de lección → clase .hecha
 *   [data-completar="clave"]        botón que alterna la lección; aria-pressed + texto
 *   [data-cuenta-modulo="n"]        texto "hechas/total" del módulo (total se cuenta en el DOM
 *                                   del sidebar o se lee de #curso-indice)
 *   [data-progreso-modulo="n"]      barra: width = % del módulo
 *   [data-progreso-global]          barra global; [data-progreso-texto] "hechas / total · %"
 *   #curso-indice                   JSON { "n": ["clave", ...] } para páginas sin sidebar
 */
import { leer, alternar, type Progreso } from "./progress";

type Indice = Record<string, string[]>;

function indiceDelCurso(): Indice {
  const el = document.getElementById("curso-indice");
  if (el?.textContent) {
    try {
      return JSON.parse(el.textContent) as Indice;
    } catch {
      /* cae al DOM */
    }
  }
  // Sin JSON: contar las marcas del sidebar agrupadas por módulo.
  const indice: Indice = {};
  document.querySelectorAll<HTMLElement>("#sidebar details[data-modulo]").forEach((d) => {
    const n = d.dataset.modulo!;
    indice[n] = [...d.querySelectorAll<HTMLElement>("[data-marca]")].map((m) => m.dataset.marca!);
  });
  return indice;
}

function pintar(p: Progreso): void {
  const hechas = new Set(p.completadas);

  document.querySelectorAll<HTMLElement>("[data-marca]").forEach((m) => {
    m.classList.toggle("hecha", hechas.has(m.dataset.marca!));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-completar]").forEach((b) => {
    const hecha = hechas.has(b.dataset.completar!);
    b.setAttribute("aria-pressed", String(hecha));
    b.classList.toggle("hecha", hecha);
    const txt = b.querySelector<HTMLElement>("[data-completar-texto]");
    if (txt) txt.textContent = hecha ? "Completada" : "Marcar como completada";
  });

  const indice = indiceDelCurso();
  let totalCurso = 0;
  let hechasCurso = 0;
  for (const [n, claves] of Object.entries(indice)) {
    const total = claves.length;
    const h = claves.filter((c) => hechas.has(c)).length;
    totalCurso += total;
    hechasCurso += h;
    document.querySelectorAll<HTMLElement>(`[data-cuenta-modulo="${n}"]`).forEach((el) => {
      if (total > 0) el.textContent = `${h}/${total}`;
    });
    document.querySelectorAll<HTMLElement>(`[data-progreso-modulo="${n}"]`).forEach((el) => {
      el.style.width = total > 0 ? `${Math.round((100 * h) / total)}%` : "0%";
    });
    document.querySelectorAll<HTMLElement>(`[data-porcentaje-modulo="${n}"]`).forEach((el) => {
      el.textContent = total > 0 ? `${Math.round((100 * h) / total)}%` : "—";
    });
  }
  const pct = totalCurso > 0 ? Math.round((100 * hechasCurso) / totalCurso) : 0;
  document.querySelectorAll<HTMLElement>("[data-progreso-global]").forEach((el) => (el.style.width = `${pct}%`));
  document.querySelectorAll<HTMLElement>("[data-progreso-texto]").forEach((el) => {
    el.textContent = `${hechasCurso} / ${totalCurso} · ${pct}%`;
  });
}

export function iniciarProgresoUI(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-completar]").forEach((b) => {
    b.addEventListener("click", () => alternar(b.dataset.completar!));
  });
  document.addEventListener("progress:change", (e) => pintar((e as CustomEvent<Progreso>).detail));
  // Cambios hechos en otra pestaña
  window.addEventListener("storage", () => pintar(leer()));
  pintar(leer());
}
