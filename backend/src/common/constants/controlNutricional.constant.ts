// Decisión de negocio confirmada (Jefatura de Administración, fase CECUIDAM):
// unidades de medida de los campos antropométricos del control nutricional.
//
// La entidad `control_nutricional` todavía no existe en el esquema (se crea
// en una tarea posterior). Cuando se modele:
//   - `circunferenciaBraquial` (AR) se mide en centímetros (cm).
//   - `fuerzaMuscular` (FM) se mide en kilogramos-fuerza (kgf).
// No hace falta cambiar el tipo de columna (deben quedar `decimal`), pero
// cualquier DTO de respuesta, comentario o documentación Swagger/OpenAPI de
// esos campos debe indicar la unidad explícitamente (por ejemplo, en la
// descripción del `@ApiProperty` o en el nombre visible para el frontend),
// para que se pueda mostrar junto al valor.
export const CONTROL_NUTRICIONAL_UNIDADES = {
  circunferenciaBraquial: 'cm',
  fuerzaMuscular: 'kgf',
} as const;
