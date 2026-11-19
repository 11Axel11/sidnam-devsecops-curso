import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Evento importante del residente (RF-TF-07; B.1.5): bitácora histórica INDEPENDIENTE de la valoración
 * (una caída, una hospitalización… ocurren en cualquier momento). Sin máquina de estados: cada evento es
 * un registro propio, anclado a `expediente_residente` (RN-01).
 *
 * Nunca se borra ni se edita; se ANULA con motivo (columnas de `Anulable`) y, si hubo un error, se
 * registra otro evento. La persona que lo registra es `creadoPorId` (el ERD no trae otra columna).
 *
 * Respecto del ERD: se agregan las columnas de anulación (`Anulable`) y `descripcion` es nullable, porque
 * solo es obligatoria cuando el tipo es «Otro» (regla del servicio, constante `TIPO_EVENTO_IMPORTANTE_OTRO`).
 */
@Entity('evento_importante_tf')
@Index('idx_evento_importante_tf_expediente_fecha', ['expedienteId', 'fechaHora'])
export class EventoImportanteTf extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Cuándo ocurrió (instante; no puede ser futuro). Segundos enteros; el driver guarda hora de Costa Rica. */
  @Column({ type: 'datetime' })
  fechaHora: Date;

  @ManyToOne(() => TipoEventoImportante, { nullable: false })
  @JoinColumn({ name: 'tipo_evento_id' })
  tipoEvento?: TipoEventoImportante;

  /** Debe estar activo al registrar; un tipo desactivado después sigue resolviéndose en el historial. */
  @Column({ name: 'tipo_evento_id', type: 'int' })
  tipoEventoId: number;

  /** Texto libre sin fragmentar (T0.5). Obligatoria solo si el tipo es «Otro». */
  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;
}
