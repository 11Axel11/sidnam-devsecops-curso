import type { DefinicionInstrumento } from "@/components/app/clinico/instrumento";

// Mini Nutritional Assessment — MNA-v1 (RF-NU-03, Anexo D, Tablas 26 a 30). Transcrito de los dos bloques
// JSON de docs/fase3/CONTRATO_MNA.md §1.1 (generados desde la constante del backend): campos, puntos y
// etiquetas EXACTOS. No se edita a mano: ante un cambio del instrumento se actualiza el contrato y se
// corre `npm run verificar:instrumentos`.
// · Los puntos de K, M, P y Q admiten medios puntos (0.5, número JSON; en pantalla se muestra con coma).
// · Ítem Q = 0 / 0,5 / 1,0 (decisión P2, 28/09/2026): con eso G–R suman 16 y el global máximo es 30.
// · Los títulos de sección son texto de la interfaz; la letra A–R de cada ítem sale de su `campo`.
// El frontend nunca suma estos puntos: subtotales, global, interpretaciones e `itemF` derivado los
// calcula y devuelve el backend.
export const MNA_V1 = {
  version: "MNA-v1",
  secciones: [
    {
      clave: "cribaje",
      titulo: "I. Cribaje (A–F, máx. 14)",
      items: [
        {
          campo: "itemA",
          nombre: "¿Ha perdido el apetito? ¿Ha comido menos por falta de apetito, problemas digestivos, dificultades de masticación o deglución en los últimos 3 meses?",
          opciones: [
            { puntos: 0, etiqueta: "Anorexia grave" },
            { puntos: 1, etiqueta: "Anorexia moderada" },
            { puntos: 2, etiqueta: "Sin anorexia" },
          ],
        },
        {
          campo: "itemB",
          nombre: "Pérdida reciente de peso (menos de 3 meses)",
          opciones: [
            { puntos: 0, etiqueta: "Pérdida de peso mayor a 3 kg" },
            { puntos: 1, etiqueta: "No lo sabe" },
            { puntos: 2, etiqueta: "Pérdida de peso entre 1 y 3 kg" },
            { puntos: 3, etiqueta: "No ha habido pérdida de peso" },
          ],
        },
        {
          campo: "itemC",
          nombre: "Movilidad",
          opciones: [
            { puntos: 0, etiqueta: "De la cama al sillón" },
            { puntos: 1, etiqueta: "Autonomía en el interior" },
            { puntos: 2, etiqueta: "Sale del domicilio" },
          ],
        },
        {
          campo: "itemD",
          nombre: "¿Ha tenido una enfermedad aguda o situación de estrés psicológico en los últimos 3 meses?",
          opciones: [
            { puntos: 0, etiqueta: "Sí" },
            { puntos: 2, etiqueta: "No" },
          ],
        },
        {
          campo: "itemE",
          nombre: "Problemas neuropsicológicos",
          opciones: [
            { puntos: 0, etiqueta: "Demencia o depresión grave" },
            { puntos: 1, etiqueta: "Demencia o depresión moderada" },
            { puntos: 2, etiqueta: "Sin problemas psicológicos" },
          ],
        },
        {
          campo: "itemF",
          nombre: "Índice de masa corporal",
          opciones: [
            { puntos: 0, etiqueta: "IMC menor a 19" },
            { puntos: 1, etiqueta: "IMC de 19 a menos de 21" },
            { puntos: 2, etiqueta: "IMC de 21 a menos de 23" },
            { puntos: 3, etiqueta: "IMC de 23 o más" },
          ],
        },
      ],
    },
    {
      clave: "evaluacion",
      titulo: "II. Evaluación (G–R, máx. 16)",
      items: [
        {
          campo: "itemG",
          nombre: "¿La persona vive independiente en su domicilio?",
          opciones: [
            { puntos: 0, etiqueta: "No" },
            { puntos: 1, etiqueta: "Sí" },
          ],
        },
        {
          campo: "itemH",
          nombre: "¿Toma más de 3 medicamentos al día?",
          opciones: [
            { puntos: 0, etiqueta: "Sí" },
            { puntos: 1, etiqueta: "No" },
          ],
        },
        {
          campo: "itemI",
          nombre: "¿Presenta úlceras o lesiones cutáneas?",
          opciones: [
            { puntos: 0, etiqueta: "Sí" },
            { puntos: 1, etiqueta: "No" },
          ],
        },
        {
          campo: "itemJ",
          nombre: "¿Cuántas comidas completas toma al día? (equivalentes a dos platos y postre)",
          opciones: [
            { puntos: 0, etiqueta: "1 comida" },
            { puntos: 1, etiqueta: "2 comidas" },
            { puntos: 2, etiqueta: "3 comidas" },
          ],
        },
        {
          campo: "itemK",
          nombre: "Consumo de: productos lácteos al menos 1 vez al día; huevos o legumbres 1 o 2 veces por semana; carnes, pescados o aves diariamente",
          opciones: [
            { puntos: 0, etiqueta: "0 o 1 respuesta afirmativa" },
            { puntos: 0.5, etiqueta: "2 respuestas afirmativas" },
            { puntos: 1, etiqueta: "3 respuestas afirmativas" },
          ],
        },
        {
          campo: "itemL",
          nombre: "¿Consume frutas o verduras al menos 2 veces al día?",
          opciones: [
            { puntos: 0, etiqueta: "No" },
            { puntos: 1, etiqueta: "Sí" },
          ],
        },
        {
          campo: "itemM",
          nombre: "¿Cuántos vasos de agua u otros líquidos toma al día? (agua, jugo, café, té, leche, vino, cerveza, etcétera)",
          opciones: [
            { puntos: 0, etiqueta: "Menos de 3 vasos" },
            { puntos: 0.5, etiqueta: "De 3 a 5 vasos" },
            { puntos: 1, etiqueta: "Más de 5 vasos" },
          ],
        },
        {
          campo: "itemN",
          nombre: "Forma de alimentarse",
          opciones: [
            { puntos: 0, etiqueta: "Necesita ayuda" },
            { puntos: 1, etiqueta: "Se alimenta solo con dificultad" },
            { puntos: 2, etiqueta: "Se alimenta solo sin dificultad" },
          ],
        },
        {
          campo: "itemO",
          nombre: "¿Se considera la persona que está bien nutrida? (problemas nutricionales)",
          opciones: [
            { puntos: 0, etiqueta: "Malnutrición grave" },
            { puntos: 1, etiqueta: "No lo sabe o malnutrición moderada" },
            { puntos: 2, etiqueta: "Sin problemas de nutrición" },
          ],
        },
        {
          campo: "itemP",
          nombre: "En comparación con las personas de su edad, ¿cómo encuentra su estado de salud?",
          opciones: [
            { puntos: 0, etiqueta: "Peor" },
            { puntos: 0.5, etiqueta: "No lo sabe" },
            { puntos: 1, etiqueta: "Igual" },
            { puntos: 2, etiqueta: "Mejor" },
          ],
        },
        {
          campo: "itemQ",
          nombre: "Circunferencia braquial (CB, en cm)",
          opciones: [
            { puntos: 0, etiqueta: "CB menor a 21" },
            { puntos: 0.5, etiqueta: "CB de 21 a 22" },
            { puntos: 1, etiqueta: "CB mayor a 22" },
          ],
        },
        {
          campo: "itemR",
          nombre: "Circunferencia de la pantorrilla (CP, en cm)",
          opciones: [
            { puntos: 0, etiqueta: "CP menor a 31" },
            { puntos: 1, etiqueta: "CP de 31 o más" },
          ],
        },
      ],
    },
  ],
} as const satisfies DefinicionInstrumento;
