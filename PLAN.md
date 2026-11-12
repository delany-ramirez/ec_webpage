# PLAN — Portal web del curso Análisis Estadístico (`ec.delanyr.dev`)

> Bitácora de construcción del sitio. Se lee al inicio de cada sesión de trabajo y se actualiza
> en el mismo commit que cierra cada hito.

## 1. Qué es

Portal estático del nivelatorio **AS001 · Análisis Estadístico** (Maestría en Sistemas
Integrados de Gestión de la Calidad, UTP — 12 h, 2 sábados, aprendizaje invertido), construido
a partir de `ml_webpage` (portal de Machine Learning). El contenido vive en
`intro_estadistica_calidad`, montado como submodule en `content/`; **nunca se copia al repo**.

### Decisiones heredadas de `ml_webpage` (sin cambios)

Astro 5 estático sin framework UI · tokens CSS oscuro/claro · KaTeX + Shiki · progreso en
`localStorage` con código exportable · Pagefind con Ctrl+K · widgets en iframe con el contrato de
`_plantilla.html` · Cloudflare Workers Static Assets con Workers Builds.

### Adaptaciones al curso de estadística

| Tema | ML | Este sitio |
|---|---|---|
| Unidad | 6 módulos, `/modulo/N/` | 2 sesiones, `/sesion/N/`. Internamente se reusa el tipo `Modulo` |
| Metadatos | línea `**Módulo N · Sesión S**` | sesión por carpeta; RAA del bloque de objetivos (`· **RAA1**`) |
| Notebooks | `.ipynb` con Colab | prácticas `.Rmd`: descarga + GitHub; sin Colab |
| Datos | GitHub | descarga directa en `/archivos/…` y **paquete `.zip` por sesión** con la estructura que esperan las rutas `../datos/` (zip escrito sin dependencias en `integrations/archivos.ts`) |
| Bloque Practica | notebooks citados en el texto | se deriva de la columna *Material* de la **agenda** del README («Teoría 03 · Práctica 02 · Ej. 02») |
| Quiz formal | `quiz-modulo-N.md` | no existe; en su lugar **pre-trabajos** (`/pre-trabajos/…`) y **taller integrador** como ejercicio especial (rótulo «Taller 1», peso) |
| Soluciones | `*-sol.md` nunca | `docente/` nunca; `ejNN-*-sol.Rmd` sí (el contenido las ofrece al estudiante). Interruptor `PUBLICAR_SOLUCIONES_EJERCICIOS` |
| Programa | `docs/programa.md` | no hay doc de programa para estudiantes: la portada muestra cronograma, pesos y RAA (espejo del README raíz) |
| Claves | `ml.delanyr.dev/*`, `MLDR1-` | `ec.delanyr.dev/*`, `ECDR1-` |

## 2. Estado

| Hito | Contenido | Estado |
|---|---|---|
| 0 | Esqueleto adaptado: submodule, colecciones, rutas, sidebar con pre-trabajos y recursos, portada, sesiones, lecciones, ejercicios/taller, documentos | ✅ 2026-11-12 |
| 1 | Descargas `/archivos/` y `.zip` por sesión; verificación anti-docente (archivos, enlaces y entradas de los .zip) | ✅ 2026-11-12 |
| 2 | Autoevaluaciones: 15 preguntas por sesión, 3 por lección (bloque Comprueba) | ✅ 2026-11-12 |
| 3 | Widgets: `tcl.html` (S1·03), `cobertura-ic.html` (S1·04), `potencia.html` (S2·02; t no central por integración, verificado contra `power.t.test()` de R) | ✅ 2026-11-12 |
| 4 | Deploy: repo en GitHub, Worker `ec-delanyr`, dominio `ec.delanyr.dev` | ⬜ pendiente |
| 5 | Más widgets: estratificación del caso bimodal (S1·01), ANOVA como partición de SC (S2·03), residuales e influencia (S2·05) | ⬜ ideas |
| 6 | Diapositivas Quarto (`slides_qmd/`) renderizadas en build o enlazadas como HTML | ⬜ ideas |

## 3. Notas

- Los widgets copian sus funciones de distribución (lgamma, pnorm, t por integración sobre
  s = √(V/gl)); si se corrige una, corregirla en los tres.
- `e2e-interactivos.mjs` de ML no se trajo (probaba widgets de ML). `e2e-progreso` y
  `e2e-busqueda` pasan contra este contenido.
- Al detener el preview no usar `taskkill node.exe`; matar solo el proceso del puerto 4321.
