import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Evaluación de la Escala de Tinetti (RF-TF-09, Anexo B; B.1.7), versión del instrumento `Tinetti-v1`. Cada
 * evaluación es un registro independiente anclado a `expediente_residente` (RN-01), SIN máquina de estados:
 * los veinte ítems son obligatorios al registrar. Nunca se borra ni se edita; se ANULA con motivo (columnas de
 * `Anulable`) y, si hubo un error, se registra otra.
 *
 * - Los veinte ítems guardan los PUNTOS de la opción elegida (solo los valores discretos del anexo; ver
 *   `ITEMS_TINETTI_V1`). El ERD solo traía los totales; el documento (RF-TF-09, RN-10) pide también los
 *   ítems individuales, así que se guardan.
 * - `puntajeEquilibrio`, `puntajeMarcha`, `puntajeTotal` y `riesgoCaida` los calcula el backend
 *   (`calcularTinetti`), se almacenan con `versionInstrumento` y NO se recalculan (RN-04/09/10).
 * - `edadMomentoEvaluacion`: años cumplidos a `fecha`, desde la fecha de nacimiento del residente (nunca
 *   `residente.edad`); valor histórico de esta evaluación.
 * - `numeroControl`: consecutivo POR EXPEDIENTE (1, 2, 3…) asignado por el servidor bajo el candado del
 *   expediente. Se cuenta también a las anuladas, así que un número nunca se reutiliza. Su edición manual
 *   (RF-TF-09) sigue pendiente de la Jefatura (P8).
 * - `usuarioExaminadorId` = usuario autenticado; nunca viene del body.
 *
 * Respecto del ERD: los veinte ítems, las columnas de anulación (`Anulable`) y `observaciones` (opcional en
 * RF-TF-09). `UNIQUE (expediente_id, numero_control)` es el respaldo en la base de la numeración.
 */
@Entity('evaluacion_tinetti')
@Index('idx_evaluacion_tinetti_expediente_fecha', ['expedienteId', 'fecha'])
@Unique('uq_evaluacion_tinetti_expediente_control', ['expedienteId', 'numeroControl'])
export class EvaluacionTinetti extends Anulable {
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

  /** CALCULADA: años cumplidos del residente a `fecha`. */
  @Column({ type: 'int' })
  edadMomentoEvaluacion: number;

  @Column({ name: 'usuario_examinador_id', type: 'int' })
  usuarioExaminadorId: number;

  /** CALCULADO: consecutivo por expediente, asignado por el servidor. */
  @Column({ name: 'numero_control', type: 'int' })
  numeroControl: number;

  // ── Parte I — Equilibrio (Tabla 21) ──
  @Column({ type: 'tinyint' }) equilibrioSentado: number;
  @Column({ type: 'tinyint' }) levantarse: number;
  @Column({ type: 'tinyint' }) intentosLevantarse: number;
  @Column({ type: 'tinyint' }) equilibrioInmediato: number;
  @Column({ type: 'tinyint' }) equilibrioEnPie: number;
  @Column({ type: 'tinyint' }) empujon: number;
  @Column({ type: 'tinyint' }) ojosCerrados: number;
  @Column({ type: 'tinyint' }) giro360Continuidad: number;
  @Column({ type: 'tinyint' }) giro360Estabilidad: number;
  @Column({ type: 'tinyint' }) sentarse: number;

  // ── Parte II — Marcha (Tabla 22) ──
  @Column({ type: 'tinyint' }) inicioMarcha: number;
  @Column({ type: 'tinyint' }) longitudPasoDerecho: number;
  @Column({ type: 'tinyint' }) alturaPasoDerecho: number;
  @Column({ type: 'tinyint' }) longitudPasoIzquierdo: number;
  @Column({ type: 'tinyint' }) alturaPasoIzquierdo: number;
  @Column({ type: 'tinyint' }) simetriaPaso: number;
  @Column({ type: 'tinyint' }) continuidadPasos: number;
  @Column({ type: 'tinyint' }) trayectoria: number;
  @Column({ type: 'tinyint' }) tronco: number;
  @Column({ type: 'tinyint' }) posturaMarcha: number;

  /** CALCULADO: suma de la Parte I (máx. 16). */
  @Column({ type: 'tinyint' })
  puntajeEquilibrio: number;

  /** CALCULADO: suma de la Parte II (máx. 12). */
  @Column({ type: 'tinyint' })
  puntajeMarcha: number;

  /** CALCULADO: equilibrio + marcha (máx. 28). */
  @Column({ type: 'tinyint' })
  puntajeTotal: number;

  /** CALCULADO: Riesgo alto de caídas / Riesgo de caídas / Riesgo bajo o leve. */
  @Column({ type: 'varchar', length: 40 })
  riesgoCaida: string;

  /** Versión del instrumento aplicada (RN-09): «Tinetti-v1». */
  @Column({ type: 'varchar', length: 30 })
  versionInstrumento: string;

  /** Observaciones de la persona examinadora (texto libre sin fragmentar). */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;
}
