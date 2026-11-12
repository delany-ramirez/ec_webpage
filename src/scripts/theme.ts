/**
 * Tema oscuro/claro. El valor inicial lo fija un script inline en <head> (Base.astro) antes
 * del primer pintado; aquí solo se maneja el toggle y la propagación a iframes de widgets.
 */
export type Tema = "dark" | "light";

export const CLAVE_TEMA = "ec.delanyr.dev/theme";

export function temaActual(): Tema {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function aplicarTema(tema: Tema, guardar = true): void {
  document.documentElement.setAttribute("data-theme", tema);
  if (guardar) {
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* almacenamiento no disponible */
    }
  }
  // Los widgets en iframe reciben el tema por postMessage (contrato en public/widgets/).
  document.querySelectorAll<HTMLIFrameElement>("iframe.widget-iframe").forEach((f) => {
    f.contentWindow?.postMessage({ type: "THEME_CHANGE", theme: tema }, "*");
  });
  document.dispatchEvent(new CustomEvent("theme:change", { detail: { tema } }));
}

export function alternarTema(): Tema {
  const siguiente: Tema = temaActual() === "dark" ? "light" : "dark";
  aplicarTema(siguiente);
  return siguiente;
}

export function iniciarToggleTema(selector = "[data-theme-toggle]"): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((btn) => {
    btn.addEventListener("click", () => alternarTema());
  });
}
