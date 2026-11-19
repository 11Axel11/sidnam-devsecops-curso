import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Auditable } from 'src/common/auditoria/auditable.entity';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AplicacionTestMovimiento } from './aplicacion-test-movimiento.entity';

/**
 * Resultado de UN ejercicio del catálogo dentro de una aplicación del test (RF-TF-10, Anexo C.2).
 * Se escribe junto con la cabecera, en una sola transacción (todo o nada), y no se modifica: si la
 * aplicación es errónea se anula la cabecera (el detalle no tiene `anulado` propio).
 *
 * `modalidad`, `modificacion` y `resultado` son TEXTO DESCRIPTIVO: el instrumento no define escalas ni
 * valores predefinidos (Anexo C.3). `modalidad` y `resultado` son obligatorios; `modificacion` es opcional.
 * `(aplicacion_id, ejercicio_id)` es único: respaldo en la base de «un elemento por ejercicio».
 */
@Entity('aplicacion_test_movimiento_ejercicio')
@Unique('uq_aplicacion_test_ejercicio', ['aplicacionId', 'ejercicioId'])
export class AplicacionTestMovimientoEjercicio extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AplicacionTestMovimiento, { nullable: false })
  @JoinColumn({ name: 'aplicacion_id' })
  aplicacion?: AplicacionTestMovimiento;

  @Column({ name: 'aplicacion_id', type: 'int' })
  aplicacionId: number;

  @ManyToOne(() => EjercicioTestMovimiento, { nullable: false })
  @JoinColumn({ name: 'ejercicio_id' })
  ejercicio?: EjercicioTestMovimiento;

  /** Ejercicio ACTIVO del catálogo al registrar; uno desactivado después sigue resolviéndose. */
  @Column({ name: 'ejercicio_id', type: 'int' })
  ejercicioId: number;

  @Column({ type: 'varchar', length: 255 })
  modalidad: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modificacion?: string | null;

  @Column({ type: 'varchar', length: 255 })
  resultado: string;
}
