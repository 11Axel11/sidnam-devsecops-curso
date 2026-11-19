import type { DefinicionInstrumento } from "@/components/app/clinico/instrumento";

// Índice de Barthel — Barthel-v1 (RF-TF-08, Anexo A, Tabla 18). Transcrito de los bloques JSON de
// docs/fase3/CONTRATO_BARTHEL_TINETTI.md §1.1 (generados desde las constantes del backend): campos,
// puntos y etiquetas EXACTOS. No se edita a mano: ante un cambio del instrumento se actualiza el
// contrato y se corre `npm run verificar:instrumentos`.
export const BARTHEL_V1 = {
  version: "Barthel-v1",
  secciones: [
    {
      clave: "items",
      titulo: "Índice de Barthel",
      items: [
        {
          campo: "comer",
          nombre: "Comer",
          opciones: [
            { puntos: 10, etiqueta: "Totalmente independiente" },
            { puntos: 5, etiqueta: "Necesita ayuda para cortar carne, el pan, etc." },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "lavarse",
          nombre: "Lavarse",
          opciones: [
            { puntos: 5, etiqueta: "Independiente: entra y sale solo del baño" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "vestirse",
          nombre: "Vestirse",
          opciones: [
            { puntos: 10, etiqueta: "Independiente: capaz de ponerse y quitarse la ropa, abotonarse, atarse los zapatos" },
            { puntos: 5, etiqueta: "Necesita ayuda" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "arreglarse",
          nombre: "Arreglarse",
          opciones: [
            { puntos: 5, etiqueta: "Independiente para lavarse la cara, las manos, peinarse, afeitarse, maquillarse, etc." },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "deposiciones",
          nombre: "Deposiciones (valórese la semana previa)",
          opciones: [
            { puntos: 10, etiqueta: "Continencia normal" },
            { puntos: 5, etiqueta: "Ocasionalmente algún episodio de incontinencia, o necesita ayuda para administrarse supositorios o lavativas" },
            { puntos: 0, etiqueta: "Incontinencia" },
          ],
        },
        {
          campo: "miccion",
          nombre: "Micción (valórese la semana previa)",
          opciones: [
            { puntos: 10, etiqueta: "Continencia normal, o es capaz de cuidarse de la sonda si tiene una puesta" },
            { puntos: 5, etiqueta: "Un episodio diario como máximo de incontinencia, o necesita ayuda para cuidar de la sonda" },
            { puntos: 0, etiqueta: "Incontinencia" },
          ],
        },
        {
          campo: "usarRetrete",
          nombre: "Usar el retrete",
          opciones: [
            { puntos: 10, etiqueta: "Independiente para ir al cuarto de aseo, quitarse y ponerse la ropa" },
            { puntos: 5, etiqueta: "Necesita ayuda para ir al retrete, pero se limpia solo" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "trasladarse",
          nombre: "Trasladarse",
          opciones: [
            { puntos: 15, etiqueta: "Independiente para ir del sillón a la cama" },
            { puntos: 10, etiqueta: "Mínima ayuda física o supervisión para hacerlo" },
            { puntos: 5, etiqueta: "Necesita gran ayuda, pero es capaz de mantenerse sentado solo" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "deambular",
          nombre: "Deambular",
          opciones: [
            { puntos: 15, etiqueta: "Independiente, camina solo 50 metros" },
            { puntos: 10, etiqueta: "Necesita ayuda física o supervisión para caminar 50 metros" },
            { puntos: 5, etiqueta: "Independiente en silla de ruedas sin ayuda" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
        {
          campo: "escalones",
          nombre: "Escalones",
          opciones: [
            { puntos: 10, etiqueta: "Independiente para bajar y subir escaleras" },
            { puntos: 5, etiqueta: "Necesita ayuda física o supervisión para hacerlo" },
            { puntos: 0, etiqueta: "Dependiente" },
          ],
        },
      ],
    },
  ],
} as const satisfies DefinicionInstrumento;
