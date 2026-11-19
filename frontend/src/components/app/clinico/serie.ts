import type { ColumnDef } from "@tanstack/react-table";

// El `DataTable` fija `max-w-0` en las celdas: sin un ancho mínimo por columna, el contenido sin salto
// de línea se encima sobre la columna vecina. Cada pantalla pasa los anchos que necesita (por `id`
// de columna); la tabla desplaza horizontalmente dentro de su contenedor.
export function conAnchos<T>(
  cols: ColumnDef<T>[],
  anchos: Record<string, string> = {},
  porDefecto = "min-w-[92px]",
): ColumnDef<T>[] {
  return cols.map((c) => ({ ...c, meta: { className: `${anchos[c.id ?? ""] ?? porDefecto} max-w-none` } }));
}

// Filtro por rango de fechas de las series: «desde» posterior a «hasta» no se envía al backend.
export const rangoInvertido = (desde: string, hasta: string) => !!desde && !!hasta && desde > hasta;
