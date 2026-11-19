import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Clase base para columnas de auditoría. Cualquier entidad nueva de las
 * fases CECUIDAM / Nutrición-Terapia Física que necesite registrar quién y
 * cuándo la creó/editó debe extenderla:
 *
 *   @Entity()
 *   export class MiEntidadNueva extends Auditable {
 *     @PrimaryGeneratedColumn()
 *     id: number;
 *     // ...resto de columnas propias
 *   }
 *
 * Ver src/common/auditoria/README.md para el uso completo (cómo se
 * completan estos campos desde el service/controller).
 *
 * -----------------------------------------------------------------------
 * MECANISMO ELEGIDO PARA COMPLETAR creadoPorId / modificadoPorId
 * -----------------------------------------------------------------------
 * Se evaluaron las dos opciones típicas para este problema:
 *
 *   A) Un método en un BaseService/BaseController que reciba el
 *      usuarioActualId como parámetro y lo aplique antes de save().
 *   B) Un EntitySubscriberInterface (beforeInsert/beforeUpdate) combinado
 *      con un mecanismo de contexto de petición (nestjs-cls o
 *      AsyncLocalStorage) para leer el usuario actual sin pasarlo
 *      explícitamente en cada service.
 *
 * Este proyecto HOY no tiene ninguna de las dos cosas: no existe una capa
 * BaseService/BaseController (cada módulo tiene su propio service
 * independiente), y no usa ningún mecanismo de contexto de petición
 * (nestjs-cls, AsyncLocalStorage, etc.) en ningún lado. Lo que SÍ existe,
 * de forma consistente en todo el proyecto, es leer `request.user` (puesto
 * por AuthGuard) con `@Req() req` en el controller y pasarlo explícitamente
 * al service como parámetro — así es como ya se maneja, por ejemplo, en
 * ResidentesController.createExpediente(dto, req.user) o en
 * GestionUsuarioController (req.user.id).
 *
 * Se eligió entonces una variante mínima de la Opción A, sin inventar una
 * jerarquía BaseService/BaseController que no existe: un par de funciones
 * utilitarias explícitas (aplicarAuditoriaCreacion / aplicarAuditoriaModificacion
 * en ./auditoria.helper.ts) que reciben `usuarioActualId` como parámetro
 * obligatorio y estampan los campos de auditoría sobre la entidad antes de
 * guardarla. Esto es exactamente el mismo patrón "leer request.user en el
 * controller, pasarlo explícito al service" que el proyecto ya usa hoy, sin
 * agregar una dependencia nueva (nestjs-cls) ni un patrón implícito
 * (AsyncLocalStorage) que nada más en el proyecto utiliza.
 *
 * No se usó la Opción B (subscriber + contexto de petición) porque hubiera
 * significado introducir infraestructura completamente nueva (una
 * dependencia o un patrón de contexto asíncrono) solo para este mecanismo,
 * en un proyecto que en todos los demás lugares resuelve "quién es el
 * usuario actual" pasándolo explícito de controller a service.
 *
 * -----------------------------------------------------------------------
 * ZONA HORARIA DE fechaCreacion / fechaModificacion
 * -----------------------------------------------------------------------
 * app.module.ts configura el driver con `timezone: '-06:00'`: el driver
 * escribe y lee los Date asumiendo que la base guarda hora de Costa Rica. Si
 * la marca la genera MySQL (DEFAULT CURRENT_TIMESTAMP), el servidor la guarda
 * en SU zona (UTC en el entorno local y, según el VPS, quizá en producción) y
 * el driver la lee como si fuera hora -06:00: sale 6 horas ADELANTADA.
 *
 * Por eso las dos marcas se estampan desde Node (`new Date()`), igual que
 * `fechaAnulacion` y el resto de columnas `datetime` escritas desde código.
 * Se conservan @CreateDateColumn/@UpdateDateColumn (mismo DDL
 * `datetime(6)`, sin cambio de esquema) y el DEFAULT de MySQL solo queda como
 * respaldo para inserciones que no pasen por el hook (SQL crudo, `insert()`
 * con objetos planos). Los hooks de una clase abstracta los heredan todas las
 * entidades que la extienden. Ver src/common/auditoria/README.md.
 *
 * Mientras se escribe `fechaModificacion` desde acá, TypeORM ya no la fija a
 * precisión de segundo con el CURRENT_TIMESTAMP de MySQL: conserva milisegundos.
 */
export abstract class Auditable {
  @Column({ type: 'int', nullable: true })
  creadoPorId?: number | null;

  @CreateDateColumn({ type: 'datetime' })
  fechaCreacion!: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId?: number | null;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  fechaModificacion?: Date | null;
}

/**
 * Hooks de las marcas de tiempo. Se registran como listeners de TypeORM SIN
 * declararlos como métodos de la clase: un método (aunque sea `protected`)
 * pasaría a formar parte del tipo de toda entidad, y entonces los objetos
 * armados con spread (`{ ...entidad, extra }`) o literales de ese tipo dejarían
 * de compilar. Al estar en el prototipo de la clase abstracta los heredan
 * todas las entidades que extienden Auditable.
 */
const HOOK_CREACION = 'estamparFechasDeCreacion';
const HOOK_MODIFICACION = 'estamparFechaDeModificacion';

/** Al crear, ambas marcas valen lo mismo (el DEFAULT de MySQL ya llenaba `fechaModificacion` al crear). */
function estamparFechasDeCreacion(this: Auditable): void {
  const ahora = new Date();
  this.fechaCreacion = ahora;
  this.fechaModificacion = ahora;
}

/** Solo corre cuando `save()` detecta cambios: un guardado sin cambios no toca la fila ni la marca. */
function estamparFechaDeModificacion(this: Auditable): void {
  this.fechaModificacion = new Date();
}

for (const [nombre, hook, decorador] of [
  [HOOK_CREACION, estamparFechasDeCreacion, BeforeInsert()],
  [HOOK_MODIFICACION, estamparFechaDeModificacion, BeforeUpdate()],
] as const) {
  Object.defineProperty(Auditable.prototype, nombre, { value: hook, enumerable: false, writable: true, configurable: true });
  decorador(Auditable.prototype, nombre);
}
