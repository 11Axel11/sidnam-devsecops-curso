import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Auditable } from './auditable.entity';
import {
  aplicarAuditoriaCreacion,
  aplicarAuditoriaModificacion,
} from './auditoria.helper';

/**
 * Entidad mínima solo para esta prueba. No se registra en app.module.ts ni
 * forma parte del esquema real — existe únicamente para poder ejercer el
 * contrato de Auditable con un objeto concreto. Las entidades reales de las
 * tareas A.1.x/B.1.x simplemente extienden Auditable de la misma forma.
 */
@Entity()
class EntidadPruebaAuditable extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;
}

/**
 * Repositorio falso que simula, de forma controlada y sin reloj real (para
 * que el test no sea sensible a milisegundos), el comportamiento de
 * TypeORM que nos interesa acá:
 *   - create(dto): arma la entidad a partir del dto, tal cual haría
 *     repository.create() (incluyendo, a propósito, cualquier campo extra
 *     que el dto pudiera traer -como un creadoPorId falso- para poder
 *     probar que se sobrescribe después).
 *   - save(entidad): si es la primera vez (no tiene id), asigna id y pone
 *     fechaCreacion + fechaModificacion (igual que @CreateDateColumn y
 *     @UpdateDateColumn de TypeORM hacen en el insert real). Si ya tenía
 *     id, es una edición: solo actualiza fechaModificacion.
 * No es un mock de TypeORM ni pretende probarlo (TypeORM ya está probado
 * por su propio proyecto) - solo simula lo mínimo necesario para poder
 * verificar, de punta a punta, el contrato de los helpers de auditoría.
 */
class FakeAuditableRepository {
  private autoIncrementId = 1;
  private ahora: () => Date;

  constructor(clock: () => Date) {
    this.ahora = clock;
  }

  create(dto: Partial<EntidadPruebaAuditable>): EntidadPruebaAuditable {
    return { ...dto } as EntidadPruebaAuditable;
  }

  async save(
    entidad: EntidadPruebaAuditable,
  ): Promise<EntidadPruebaAuditable> {
    const esCreacion = entidad.id === undefined;

    if (esCreacion) {
      entidad.id = this.autoIncrementId++;
      entidad.fechaCreacion = this.ahora();
    }

    entidad.fechaModificacion = this.ahora();

    return entidad;
  }
}

describe('Auditable - contrato de auditoría', () => {
  let repo: FakeAuditableRepository;
  let tick: number;

  beforeEach(() => {
    // Reloj falso e incremental: cada llamada avanza el tiempo, así las
    // fechas de creación y de modificación son siempre distintas y
    // comparables sin depender del reloj real ni de sleeps.
    tick = 0;
    const clock = () => new Date(2024, 0, 1, 0, 0, ++tick);
    repo = new FakeAuditableRepository(clock);
  });

  it('al crear, creadoPorId queda igual al usuario autenticado y fechaCreacion queda poblada, ignorando cualquier creadoPorId falso del body', async () => {
    const usuarioAutenticadoId = 1;

    // Simula un DTO/body armado por un cliente malicioso que intenta
    // hacerse pasar por otro usuario.
    const dtoConCreadoPorIdFalso = {
      nombre: 'Registro de prueba',
      creadoPorId: 999,
    } as unknown as Partial<EntidadPruebaAuditable>;

    const entidad = repo.create(dtoConCreadoPorIdFalso);
    aplicarAuditoriaCreacion(entidad, usuarioAutenticadoId);
    const guardada = await repo.save(entidad);

    expect(guardada.creadoPorId).toBe(usuarioAutenticadoId);
    expect(guardada.creadoPorId).not.toBe(999);
    expect(guardada.fechaCreacion).toBeInstanceOf(Date);
    expect(guardada.modificadoPorId ?? null).toBeNull();
  });

  it('al editar con un usuario autenticado distinto, modificadoPorId y fechaModificacion cambian, y creadoPorId/fechaCreacion permanecen sin cambios', async () => {
    const usuarioQueCreo = 1;
    const usuarioQueEdita = 2;

    const entidad = repo.create({ nombre: 'Registro de prueba' });
    aplicarAuditoriaCreacion(entidad, usuarioQueCreo);
    const creada = await repo.save(entidad);

    const creadoPorIdOriginal = creada.creadoPorId;
    const fechaCreacionOriginal = creada.fechaCreacion;
    const fechaModificacionTrasCrear = creada.fechaModificacion;

    creada.nombre = 'Registro de prueba (editado)';
    aplicarAuditoriaModificacion(creada, usuarioQueEdita);
    const editada = await repo.save(creada);

    expect(editada.modificadoPorId).toBe(usuarioQueEdita);
    expect(editada.fechaModificacion).toBeInstanceOf(Date);
    expect(editada.fechaModificacion?.getTime()).toBeGreaterThan(
      fechaModificacionTrasCrear!.getTime(),
    );

    // Lo que NUNCA debe tocar una edición:
    expect(editada.creadoPorId).toBe(creadoPorIdOriginal);
    expect(editada.fechaCreacion).toBe(fechaCreacionOriginal);
  });

  it('editar dos veces seguidas sigue actualizando modificadoPorId sin tocar creadoPorId', async () => {
    const entidad = repo.create({ nombre: 'Registro de prueba' });
    aplicarAuditoriaCreacion(entidad, 1);
    const creada = await repo.save(entidad);

    aplicarAuditoriaModificacion(creada, 2);
    await repo.save(creada);

    aplicarAuditoriaModificacion(creada, 3);
    const segundaEdicion = await repo.save(creada);

    expect(segundaEdicion.modificadoPorId).toBe(3);
    expect(segundaEdicion.creadoPorId).toBe(1);
  });
});

describe('Auditable - marcas de tiempo estampadas desde Node (zona horaria)', () => {
  // Los hooks son protegidos: se invocan como lo hace TypeORM en save().
  type ConHooks = {
    estamparFechasDeCreacion(): void;
    estamparFechaDeModificacion(): void;
  };

  afterEach(() => jest.useRealTimers());

  it('al insertar, fechaCreacion y fechaModificacion toman la hora actual de Node', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T21:27:12.345Z'));
    const entidad = new EntidadPruebaAuditable();

    (entidad as unknown as ConHooks).estamparFechasDeCreacion();

    expect(entidad.fechaCreacion.toISOString()).toBe('2026-10-21T21:27:12.345Z');
    expect(entidad.fechaModificacion?.toISOString()).toBe('2026-10-21T21:27:12.345Z');
  });

  it('al actualizar, solo cambia fechaModificacion (con milisegundos) y fechaCreacion queda igual', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T21:27:12.345Z'));
    const entidad = new EntidadPruebaAuditable();
    (entidad as unknown as ConHooks).estamparFechasDeCreacion();

    jest.setSystemTime(new Date('2026-10-21T22:00:01.789Z'));
    (entidad as unknown as ConHooks).estamparFechaDeModificacion();

    expect(entidad.fechaCreacion.toISOString()).toBe('2026-10-21T21:27:12.345Z');
    expect(entidad.fechaModificacion?.toISOString()).toBe('2026-10-21T22:00:01.789Z');
  });
});
