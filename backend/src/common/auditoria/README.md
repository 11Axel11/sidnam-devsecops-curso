# Auditoría (`Auditable`)

Mecanismo reutilizable para que las entidades nuevas de esta fase
(inventario/facturación CECUIDAM, nutrición, terapia física — ~25 entidades)
registren quién y cuándo las creó/editó, sin tener que resolver esto de
nuevo en cada una.

## Cómo usarlo en una entidad nueva

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Auditable } from 'src/common/auditoria/auditable.entity';

@Entity()
export class ControlNutricional extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  // ...resto de columnas propias de la entidad
}
```

Esto agrega automáticamente 4 columnas: `creadoPorId`, `fechaCreacion`,
`modificadoPorId`, `fechaModificacion`. Todas `nullable: true` salvo
`fechaCreacion` (que TypeORM completa siempre), para que cualquier fila
histórica pueda quedar con estos campos en `NULL` sin necesidad de un script
de backfill.

## Cómo completarlos desde el controller/service

**Nunca** se completan desde el DTO/body. Siempre desde el usuario
autenticado de la petición (`request.user`, puesto por `AuthGuard` — ver
`src/modulos/autenticacion/guard/auth.guard.ts`), leído con `@Req() req` en
el controller y pasado explícito al service, igual que ya se hace hoy en
otros módulos (por ejemplo `ResidentesController.createExpediente`).

Los DTOs de creación/edición de una entidad `Auditable` **no deben declarar**
un campo `creadoPorId` ni `modificadoPorId` — ni siquiera opcional.

**Crear:**

```ts
// controller
@Post()
crear(@Body() dto: CrearControlNutricionalDto, @Req() req) {
  return this.service.crear(dto, req.user.id);
}

// service
async crear(dto: CrearControlNutricionalDto, usuarioActualId: number) {
  const entidad = this.repo.create(dto);
  aplicarAuditoriaCreacion(entidad, usuarioActualId);
  return this.repo.save(entidad);
}
```

**Editar:**

```ts
// controller
@Patch(':id')
editar(@Param('id') id: number, @Body() dto: ActualizarControlNutricionalDto, @Req() req) {
  return this.service.editar(id, dto, req.user.id);
}

// service
async editar(id: number, dto: ActualizarControlNutricionalDto, usuarioActualId: number) {
  const entidad = await this.repo.findOneByOrFail({ id });
  Object.assign(entidad, dto);
  aplicarAuditoriaModificacion(entidad, usuarioActualId);
  return this.repo.save(entidad);
}
```

`fechaCreacion` y `fechaModificacion` no se tocan a mano al usar `save()`:
`Auditable` las estampa desde Node (hooks `@BeforeInsert` / `@BeforeUpdate`,
`new Date()`), no con el `CURRENT_TIMESTAMP` de MySQL.

### Zona horaria (importante)

El driver usa `timezone: '-06:00'`; una marca generada por MySQL (que corre en
UTC) salía **6 horas adelantada**. Por eso se generan en Node. Consecuencias:

- `fechaModificacion` se llena también al crear (igual valor que `fechaCreacion`)
  y conserva milisegundos.
- Un `save()` sin cambios no toca la fila ni la marca.
- `repository.update(...)`, `createQueryBuilder().update()` e `insert()` con
  objetos planos **no pasan por los hooks**: en un `update` hay que incluir
  `fechaModificacion: new Date()` en el `set`, o MySQL volverá a poner su hora
  (+6 h). En un insert sin marca queda el DEFAULT de MySQL como respaldo.
- Las filas creadas antes de este cambio en una base local pueden traer +6 h.

## Por qué está hecho así

Ver el comentario al inicio de
[`auditable.entity.ts`](auditable.entity.ts): se evaluó un `BaseService`
(no existe en el proyecto) contra un `EntitySubscriberInterface` +
contexto de petición tipo `nestjs-cls`/`AsyncLocalStorage` (tampoco existe),
y se eligió una variante explícita —los helpers de
[`auditoria.helper.ts`](auditoria.helper.ts)— que sigue exactamente el
patrón que el proyecto ya usa hoy: leer `request.user` en el controller y
pasarlo explícito al service.

## Pruebas

[`auditoria.spec.ts`](auditoria.spec.ts) demuestra el contrato completo
(creación ignora un `creadoPorId` falso del body; edición actualiza
`modificadoPorId`/`fechaModificacion` sin tocar `creadoPorId`/`fechaCreacion`)
contra una entidad mínima de prueba (`EntidadPruebaAuditable`) que no forma
parte del esquema real — es solo para poder ejercer el contrato.
