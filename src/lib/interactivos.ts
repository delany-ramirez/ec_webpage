/**
 * Acceso a los interactivos que viven en este repo: autoevaluaciones (colección
 * `autoevaluacion`) y visualizadores (`src/data/widgets.json` → `public/widgets/`).
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { z } from "astro:content";
import widgetsRaw from "../data/widgets.json";

export type Pregunta = CollectionEntry<"autoevaluacion">["data"]["preguntas"][number];

const widgetSchema = z.object({
  archivo: z.string().regex(/^[a-z0-9-]+\.html$/),
  titulo: z.string(),
  descripcion: z.string().optional(),
  /** clave de progreso de la lección: "N/slug" */
  leccion: z.string().regex(/^\d\/[a-z0-9-]+$/),
  alto: z.number().int().min(200).max(1200).default(520),
});
export type Widget = z.infer<typeof widgetSchema>;

export const WIDGETS: Widget[] = z.array(widgetSchema).parse(widgetsRaw);

export function widgetsDe(claveLeccion: string): Widget[] {
  return WIDGETS.filter((w) => w.leccion === claveLeccion);
}

/** Todos los visualizadores registrados para una sesión (tenga o no publicada la lección). */
export function widgetsDelModulo(numeroModulo: number): Widget[] {
  return WIDGETS.filter((w) => w.leccion.startsWith(`${numeroModulo}/`));
}

export async function autoevaluacionDe(numeroModulo: number): Promise<Pregunta[]> {
  const entradas = await getCollection("autoevaluacion");
  const e = entradas.find((x) => x.data.modulo === numeroModulo);
  return e ? e.data.preguntas : [];
}

export async function modulosConAutoevaluacion(): Promise<Set<number>> {
  const entradas = await getCollection("autoevaluacion");
  return new Set(entradas.map((e) => e.data.modulo));
}

export async function preguntasDeLeccion(numeroModulo: number, slug: string): Promise<Pregunta[]> {
  return (await autoevaluacionDe(numeroModulo)).filter((p) => p.leccion === slug);
}
