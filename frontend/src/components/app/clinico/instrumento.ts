// Definición de un instrumento de evaluación de Terapia Física (Barthel, Tinetti). Es la ÚNICA fuente
// de los formularios: cada ítem es una selección única entre sus opciones; lo que se envía es el
// `puntos` de la opción elegida. El frontend nunca suma puntos ni deriva un resultado: total, grado,
// riesgo, subtotales, edad, número de control y versión los calcula y devuelve el backend.
export interface OpcionInstrumento {
  puntos: number;
  /** Texto exacto del anexo del instrumento. */
  etiqueta: string;
}

export interface ItemInstrumento {
  /** Nombre de la propiedad del body del POST. */
  campo: string;
  nombre: string;
  opciones: readonly OpcionInstrumento[];
}

export interface SeccionInstrumento {
  clave: string;
  titulo: string;
  instruccion?: string;
  items: readonly ItemInstrumento[];
}

export interface DefinicionInstrumento {
  /** Misma versión que guarda el servidor en `versionInstrumento`. */
  version: string;
  secciones: readonly SeccionInstrumento[];
}
