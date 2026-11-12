import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Todas las colecciones leen del submodule `content/` (repo intro_estadistica_calidad).
// El contenido NO lleva frontmatter obligatorio: los metadatos (sesión, orden, título, RAA)
// se derivan de la ruta y del cuerpo en `src/lib/curso.ts`. Por eso los schemas son
// opcionales: si algún día el contenido añade frontmatter, se acepta sin romper nada.
//
// Solo se cargan `.md`: las soluciones (`*-sol.Rmd`) y la carpeta `docente/` nunca entran
// como páginas. `scripts/verificar-sin-soluciones.mjs` vuelve a comprobarlo sobre `dist/`.

const BASE = "./content";

const metaOpcional = z.object({
  title: z.string().optional(),
  duracion: z.string().optional(),
});

const teoria = defineCollection({
  loader: glob({ base: BASE, pattern: ["sesion-*/teoria/*.md"] }),
  schema: metaOpcional,
});

const ejercicios = defineCollection({
  loader: glob({ base: BASE, pattern: ["sesion-*/ejercicios/*.md", "!**/*-sol.md"] }),
  schema: metaOpcional,
});

// README de cada sesión: objetivos, agenda, núcleo/opcional, tablas de materiales.
const modulos = defineCollection({
  loader: glob({ base: BASE, pattern: ["sesion-*/README.md"] }),
  schema: metaOpcional,
});

// Documentos sueltos del curso que se publican como páginas propias (ver DOCS en lib/rutas.ts).
const docs = defineCollection({
  loader: glob({
    base: BASE,
    pattern: [
      "pre-trabajos/*.md",
      "recursos/*.md",
      "recursos/plantillas/checklist-analisis.md",
    ],
  }),
  schema: metaOpcional,
});

// Autoevaluación interactiva (opción múltiple, autocalificada). Vive en ESTE repo, no en el
// de contenido: es un complemento formativo, sin nota, distinto de los pre-trabajos y del
// taller integrador (que se entregan en la plataforma).
const pregunta = z.object({
  id: z.string().regex(/^s\d-\d{2}$/, "id con forma sN-NN"),
  /** slug de la lección a la que pertenece (bloque Comprueba); opcional */
  leccion: z.string().optional(),
  pregunta: z.string().min(10),
  opciones: z.array(z.string().min(1)).min(2).max(6),
  /** índice (base 0) de la opción correcta */
  correcta: z.number().int().min(0),
  explicacion: z.string().min(10),
}).refine((q) => q.correcta < q.opciones.length, { message: "correcta fuera de rango" });

const autoevaluacion = defineCollection({
  loader: glob({ base: "./src/data/autoevaluacion", pattern: "sesion-*.json" }),
  schema: z.object({
    modulo: z.number().int().min(1).max(2),
    preguntas: z.array(pregunta).min(1),
  }),
});

export const collections = { teoria, ejercicios, modulos, docs, autoevaluacion };
