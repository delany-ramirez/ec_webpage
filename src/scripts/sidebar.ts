/**
 * Temario: persiste qué módulos están abiertos y maneja el drawer en móvil.
 */
const CLAVE_ABIERTOS = "ec.delanyr.dev/sidebar/abiertos";

function leerAbiertos(): Set<number> {
  try {
    const raw = localStorage.getItem(CLAVE_ABIERTOS);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function guardarAbiertos(set: Set<number>): void {
  try {
    localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify([...set]));
  } catch {
    /* sin almacenamiento */
  }
}

export function iniciarSidebar(): void {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // --- acordeones: el módulo activo siempre abierto; el resto según lo guardado ---
  const abiertos = leerAbiertos();
  const detalles = sidebar.querySelectorAll<HTMLDetailsElement>("details[data-modulo]");
  detalles.forEach((d) => {
    const n = Number(d.dataset.modulo);
    if (d.open) abiertos.add(n);
    else if (abiertos.has(n)) d.open = true;
    d.addEventListener("toggle", () => {
      if (d.open) abiertos.add(n);
      else abiertos.delete(n);
      guardarAbiertos(abiertos);
    });
  });
  guardarAbiertos(abiertos);

  // --- llevar la lección activa a la vista ---
  const activo = sidebar.querySelector<HTMLElement>(".sb-leccion.activo, .sb-chip.activo");
  if (activo) {
    const y = activo.getBoundingClientRect().top - sidebar.getBoundingClientRect().top + sidebar.scrollTop;
    sidebar.scrollTop = Math.max(0, y - sidebar.clientHeight / 2);
  }

  // --- drawer móvil ---
  const fondo = document.querySelector<HTMLElement>("[data-sidebar-fondo]");
  let origenFoco: HTMLElement | null = null;
  const abrir = () => {
    origenFoco = document.activeElement as HTMLElement;
    sidebar.classList.add("abierto");
    if (fondo) fondo.hidden = false;
    document.body.style.overflow = "hidden";
    sidebar.querySelector<HTMLElement>("[data-sidebar-cerrar]")?.focus();
  };
  const cerrar = () => {
    if (!sidebar.classList.contains("abierto")) return;
    sidebar.classList.remove("abierto");
    if (fondo) fondo.hidden = true;
    document.body.style.overflow = "";
    origenFoco?.focus();
  };
  document.querySelectorAll("[data-sidebar-abrir]").forEach((b) => b.addEventListener("click", abrir));
  document.querySelectorAll("[data-sidebar-cerrar]").forEach((b) => b.addEventListener("click", cerrar));
  fondo?.addEventListener("click", cerrar);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrar();
  });
}
