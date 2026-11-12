# ec.delanyr.dev — Portal del curso Análisis Estadístico (AS001)

Sitio estático (Astro 5) del nivelatorio **Análisis Estadístico** de la Maestría en Sistemas
Integrados de Gestión de la Calidad (UTP). El contenido del curso **no vive aquí**: se consume
desde el repositorio
[`delany-ramirez/intro_estadistica_calidad`](https://github.com/delany-ramirez/intro_estadistica_calidad),
montado como submodule en `content/`.

Es una adaptación del portal [`ml_webpage`](https://github.com/delany-ramirez/ml_webpage)
(mismo diseño, progreso, búsqueda, autoevaluaciones y widgets). La bitácora y las diferencias
con ese proyecto están en [`PLAN.md`](PLAN.md).

## Puesta en marcha

```bash
git clone --recurse-submodules https://github.com/delany-ramirez/ec_webpage.git
cd ec_webpage
npm install
npm run dev          # http://localhost:4321
```

Si ya clonaste sin submodules: `git submodule update --init --recursive`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` (+ Pagefind y verificación anti-soluciones) |
| `npm run preview` | Sirve `dist/` localmente |
| `npm run check` | Diagnóstico de tipos en `.astro`/`.ts` |
| `npm run e2e` | Pruebas end-to-end por CDP (requiere `npm run preview` levantado) |
| `git submodule update --remote content` | Trae la última versión del contenido |

## Estructura

```
content/            submodule → intro_estadistica_calidad (solo lectura)
public/widgets/     visualizadores HTML aislados: tcl, cobertura-ic, potencia (contrato en _plantilla.html)
src/
  content.config.ts colecciones (teoria, ejercicios, modulos = README de sesión, docs, autoevaluacion)
  lib/rutas.ts      sesiones, documentos publicados, qué se descarga y qué es del docente
  lib/curso.ts      metadatos derivados de ruta + H1 + RAA; orden; prev/next
  lib/notebooks-fs.ts prácticas .Rmd y la agenda del README (teoría ↔ práctica ↔ ejercicio)
  integrations/archivos.ts  /archivos/… (Rmd, csv, install.R) y /descargas/<sesión>.zip
  plugins/          remark: quitar H1, reescribir enlaces del contenido, enlazar referencias en backticks
  data/             autoevaluaciones (JSON por sesión) y registro de widgets
  pages/            rutas
scripts/            verificación anti-soluciones y pruebas e2e
wrangler.jsonc      Worker `ec-delanyr` (Cloudflare Workers Static Assets)
```

## Rutas

| Ruta | Origen |
|---|---|
| `/` | Portada: sesiones, programa con pesos, RAA |
| `/pre-trabajos/` · `/instalacion/` · `/diagnostico/` · `/1/` · `/2/` | `pre-trabajos/*.md` |
| `/sesion/N/` | README de la sesión + prácticas + visualizadores |
| `/sesion/N/teoria/<slug>/` | Lección, con bloques Explora / Practica / Comprueba |
| `/sesion/N/ejercicios/<slug>/` | Ejercicios y taller integrador |
| `/sesion/N/autoevaluacion/` | Autoevaluación de opción múltiple (sin nota) |
| `/recursos/…` | README, cheatsheet, checklist, bibliografía, enlaces |
| `/archivos/<ruta>` · `/descargas/<carpeta>.zip` | Descargas generadas en build desde el submodule |

## Despliegue

Cloudflare **Workers** (Static Assets), Worker `ec-delanyr`, conectado a este repositorio
con *Workers Builds*:

| Campo | Valor |
|---|---|
| Build command | `git submodule update --init --recursive && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Node | `24` (leído de `.node-version`) |

Deploy manual (requiere `npx wrangler login`): `npm run build && npx wrangler deploy`.

## Material del docente

Nada de `docente/` se publica: solo se cargan `.md` como páginas, las descargas pasan por
`esDescargable()` y `scripts/verificar-sin-soluciones.mjs` rompe el build si aparece algo del
docente en `dist/` (archivos, enlaces o dentro de los `.zip`).

Las soluciones de los **ejercicios de práctica** (`ejNN-*-sol.Rmd`) **sí** se publican, porque
el propio contenido las ofrece («Solución en … Intenta resolverlo antes de mirarla»). Para
ocultarlas: `PUBLICAR_SOLUCIONES_EJERCICIOS = false` en `src/lib/rutas.ts`.
