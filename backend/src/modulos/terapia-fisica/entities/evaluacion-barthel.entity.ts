import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Evaluación del Índice de Barthel (RF-TF-08, Anexo A; B.1.6), versión del instrumento `Barthel-v1`. Cada
 * evaluación es un registro independiente anclado a `expediente_residente` (RN-01), SIN máquina de estados:
 * todos los ítems son obligatorios al registrar (no hay borrador). Nunca se borra ni se edita; se ANULA con
 * motivo (columnas de `Anulable`) y, si hubo un error, se registra otra.
 *
 * - Los diez ítems guardan los PUNTOS de la opción elegida (solo los valores discretos del anexo; ver
 *   `ITEMS_BARTHEL_V1`).
 * - `puntajeTotal` y `gradoDependencia` los calcula el backend (`calcularBarthel`), se almacenan junto con
 *   `versionInstrumento` y NO se recalculan (RN-04/09/10); ningún DTO los acepta.
 * - `usuarioExaminadorId` = usuario autenticado (Anexo: «examinador»); nunca viene del body.
 *
 * Respecto del ERD: se agregan las columnas de anulación (`Anulable`) y `observaciones` (opcional en RF-TF-08).
 */
@Entity('evaluacion_barthel')
@Index('idx_evaluacion_barthel_expediente_fecha', ['expedienteId', 'fecha'])
export class EvaluacionBarthel extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Fecha de la evaluación 'YYYY-MM-DD' (propuesta = hoy; nunca futura). */
  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'usuario_examinador_id', type: 'int' })
  usuarioExaminadorId: number;

  @Column({ type: 'tinyint' }) comer: number;
  @Column({ type: 'tinyint' }) lavarse: number;
  @Column({ type: 'tinyint' }) vestirse: number;
  @Column({ type: 'tinyint' }) arreglarse: number;
  @Column({ type: 'tinyint' }) deposiciones: number;
  @Column({ type: 'tinyint' }) miccion: number;
  @Column({ type: 'tinyint' }) usarRetrete: number;
  @Column({ type: 'tinyint' }) trasladarse: number;
  @Column({ type: 'tinyint' }) deambular: number;
  @Column({ type: 'tinyint' }) escalones: number;

  /** CALCULADO: suma de los diez ítems (0–100). */
  @Column({ type: 'tinyint' })
  puntajeTotal: number;

  /** CALCULADO: Dependencia Total / Severa / Moderada / Escasa / Independencia / Independencia — uso de silla de ruedas. */
  @Column({ type: 'varchar', length: 60 })
  gradoDependencia: string;

  /** Versión del instrumento aplicada (RN-09): «Barthel-v1». */
  @Column({ type: 'varchar', length: 30 })
  versionInstrumento: string;

  /** Observaciones de la persona examinadora (texto libre sin fragmentar). */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;
}
