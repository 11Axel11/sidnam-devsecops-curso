import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionFisioterapeutica } from './valoracion-fisioterapeutica.entity';

/**
 * Antecedente traumático (RF-TF-03): registro INDEPENDIENTE, 0..N por
 * valoración (no 4 casillas fijas). Se corrige con PATCH y se retira con
 * `PATCH /:id/anular` (nunca DELETE), solo mientras la valoración sea borrador.
 *
 * Respecto del ERD se agregan las columnas de `Anulable` (anulado, motivoAnulacion,
 * anuladoPorId, fechaAnulacion): convención de anulación uniforme del Bloque B.
 * `descripcion` es obligatoria solo cuando el tipo es «Otro» (regla en el servicio).
 */
@Entity('antecedente_traumatico')
@Index('idx_antecedente_traumatico_valoracion', ['valoracionId'])
export class AntecedenteTraumatico extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ValoracionFisioterapeutica, { nullable: false })
  @JoinColumn({ name: 'valoracion_id' })
  valoracion?: ValoracionFisioterapeutica;

  @Column({ name: 'valoracion_id', type: 'int' })
  valoracionId: number;

  @ManyToOne(() => TipoAntecedenteTraumatico, { nullable: false })
  @JoinColumn({ name: 'tipo_id' })
  tipo?: TipoAntecedenteTraumatico;

  @Column({ name: 'tipo_id', type: 'int' })
  tipoId: number;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  localizacionAnatomica?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tiempoTranscurrido?: string | null;
}
