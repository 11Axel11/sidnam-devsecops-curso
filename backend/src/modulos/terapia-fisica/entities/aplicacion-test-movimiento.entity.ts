import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Cabecera de una aplicación del Test de Movimiento y Coordinación (RF-TF-10, Anexo C; B.1.8). Cada
 * aplicación es un registro independiente, sin límite de número, que NO sobrescribe a la anterior; el
 * detalle por ejercicio está en `aplicacion_test_movimiento_ejercicio`. Sin máquina de estados.
 *
 * Nunca se borra ni se edita; se ANULA con motivo (columnas de `Anulable`) y, si hubo un error, se
 * registra otra aplicación. Anclada a `expediente_residente` (RN-01).
 */
@Entity('aplicacion_test_movimiento')
@Index('idx_aplicacion_test_movimiento_expediente_fecha', ['expedienteId', 'fecha'])
export class AplicacionTestMovimiento extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Fecha de la aplicación 'YYYY-MM-DD' (propuesta = hoy; nunca futura). */
  @Column({ type: 'date' })
  fecha: string;

  /** Persona responsable = usuario autenticado al registrar (Anexo C.1). Nunca viene del body. */
  @Column({ name: 'usuario_responsable_id', type: 'int' })
  usuarioResponsableId: number;
}
