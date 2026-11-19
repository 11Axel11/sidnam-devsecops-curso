import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DECIMAL_A_NUMERO } from 'src/common/utils/decimal.transformer';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { ControlNutricional } from './control-nutricional.entity';

/**
 * Evaluación del Mini Nutritional Assessment (RF-NU-03, Anexo D; B.1.10), versión del instrumento `MNA-v1`. Cada
 * evaluación es un registro independiente anclado a `expediente_residente` (RN-01), SIN máquina de estados. Nunca
 * se borra ni se edita; se ANULA con motivo (columnas de `Anulable`) y, si hubo un error, se registra otra.
 *
 * - Cribaje (A–F) siempre completo. Evaluación (G–R) NULLABLE: obligatoria con cribaje < 12; con cribaje ≥ 12 es
 *   opcional («no es necesario continuar», RN-07) y, si se omite, `subtotalEvaluacion`, `evaluacionGlobal` e
 *   `interpretacionGlobal` quedan en `null`.
 * - Los ítems guardan los PUNTOS de la opción elegida. K, M, P y Q admiten medios puntos (`decimal(2,1)`); los
 *   subtotales y la global son `decimal(3,1)` (como el ERD). Todo con `DECIMAL_A_NUMERO`: se devuelve `number`.
 * - `itemF` se DERIVA del IMC del control vinculado (`controlNutricionalId`, opcional); sin vínculo se elige
 *   manualmente. El control puede anularse después sin alterar el `itemF` guardado (RN-04: no se recalcula).
 * - Subtotales, global, interpretaciones y `versionInstrumento` los calcula el backend (`calcularMna`), se
 *   almacenan y NO se recalculan (RN-04/09/10); ningún DTO los acepta.
 * - `usuarioResponsableId` = usuario autenticado. No se guarda la edad ni observaciones: RF-NU-03 y el ERD no las
 *   piden.
 * - A lo sumo UNA evaluación NO anulada por control (1 a 1 del ERD): lo garantiza el servicio con el candado de la
 *   fila del control. No hay `UNIQUE` en la base a propósito: impediría volver a vincular el control después de
 *   anular una evaluación errónea.
 *
 * Respecto del ERD: solo las columnas de anulación (`Anulable`).
 */
@Entity('evaluacion_mna')
@Index('idx_evaluacion_mna_expediente_fecha', ['expedienteId', 'fecha'])
export class EvaluacionMna extends Anulable {
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

  @Column({ name: 'usuario_responsable_id', type: 'int' })
  usuarioResponsableId: number;

  @ManyToOne(() => ControlNutricional, { nullable: true })
  @JoinColumn({ name: 'control_nutricional_id' })
  controlNutricional?: ControlNutricional | null;

  /** Control del que se tomó el IMC del ítem F (opcional). */
  @Column({ name: 'control_nutricional_id', type: 'int', nullable: true })
  controlNutricionalId?: number | null;

  // ── Primera parte — Cribaje (Tabla 26) ──
  @Column({ type: 'tinyint' }) itemA: number;
  @Column({ type: 'tinyint' }) itemB: number;
  @Column({ type: 'tinyint' }) itemC: number;
  @Column({ type: 'tinyint' }) itemD: number;
  @Column({ type: 'tinyint' }) itemE: number;
  @Column({ type: 'tinyint' }) itemF: number;

  /** CALCULADO: suma de A–F (máx. 14). */
  @Column({ type: 'decimal', precision: 3, scale: 1, transformer: DECIMAL_A_NUMERO })
  subtotalCribaje: number;

  /** CALCULADA: Tabla 27, texto exacto. */
  @Column({ type: 'varchar', length: 100 })
  interpretacionCribaje: string;

  // ── Segunda parte — Evaluación (Tabla 28), nullable ──
  @Column({ type: 'tinyint', nullable: true }) itemG?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemH?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemI?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemJ?: number | null;
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO }) itemK?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemL?: number | null;
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO }) itemM?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemN?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemO?: number | null;
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO }) itemP?: number | null;
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO }) itemQ?: number | null;
  @Column({ type: 'tinyint', nullable: true }) itemR?: number | null;

  /** CALCULADO: suma de G–R (máx. 16); `null` si no se registró la segunda parte. */
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  subtotalEvaluacion?: number | null;

  /** CALCULADA: cribaje + evaluación (máx. 30); `null` sin segunda parte. */
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  evaluacionGlobal?: number | null;

  /** CALCULADA: Tabla 30, texto exacto; `null` sin segunda parte. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  interpretacionGlobal?: string | null;

  /** Versión del instrumento aplicada (RN-09): «MNA-v1». */
  @Column({ type: 'varchar', length: 30 })
  versionInstrumento: string;
}
