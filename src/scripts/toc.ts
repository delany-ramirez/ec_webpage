/** Scroll-spy del índice lateral: resalta el encabezado visible más alto. */
export function iniciarToc(): void {
  const enlaces = document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]");
  if (enlaces.length === 0) return;

  const porSlug = new Map<string, HTMLAnchorElement>();
  enlaces.forEach((a) => porSlug.set(a.dataset.tocLink!, a));
  const encabezados = [...porSlug.keys()]
    .map((slug) => document.getElementById(slug))
    .filter((el): el is HTMLElement => el !== null);
  if (encabezados.length === 0) return;

  let activo: string | null = null;
  const marcar = (slug: string) => {
    if (slug === activo) return;
    activo = slug;
    enlaces.forEach((a) => a.classList.toggle("activo", a.dataset.tocLink === slug));
  };

  // El encabezado activo es el último cuyo borde superior pasó la línea de lectura (~30% alto).
  const actualizar = () => {
    const linea = window.innerHeight * 0.3;
    let candidato = encabezados[0];
    for (const h of encabezados) {
      if (h.getBoundingClientRect().top <= linea) candidato = h;
      else break;
    }
    marcar(candidato.id);
  };

  let pendiente = false;
  window.addEventListener(
    "scroll",
    () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        actualizar();
        pendiente = false;
      });
    },
    { passive: true },
  );
  actualizar();
}
