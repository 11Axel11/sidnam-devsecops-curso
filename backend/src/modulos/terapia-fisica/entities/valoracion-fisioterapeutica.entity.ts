import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { CaracteristicaDolor } from '../enums/caracteristicaDolor.enum';

/**
 * Cabecera de la valoración fisioterapéutica (RF-TF-01 a RF-TF-06).
 *
 * - RN-01: cuelga de `expediente_residente` (nunca de `residente`).
 * - RN-02: jamás se borra; se ANULA (`anulado`, con motivo/usuario/fecha).
 * - RN-03: máquina de estados borrador → vigente → reemplazada; a lo sumo una
 *   `vigente` NO anulada por expediente (se garantiza en el servicio con un
 *   bloqueo de fila del expediente, ver ValoracionesFisioterapeuticasService).
 * - Texto libre: `text` sin fragmentar (docs/CONVENCIONES.md, CA-06).
 *
 * Columnas respecto al ERD (decisiones del 14/10/2026, documento fuente gana):
 *   + caracteristicasDolor, direccionIrradiacion          (RF-TF-04)
 *   + fuerzaMuscularDinamometria, postura, riesgoUlcera   (RF-TF-06)
 *   + motivoAnulacion, anuladoPorId, fechaAnulacion       (RN-02 / RF-TR-04)
 * Todas nullable: cambio aditivo sobre un esquema con `synchronize`.
 */
@Entity('valoracion_fisioterapeutica')
@Index('idx_valoracion_tf_expediente_fecha', ['expedienteId', 'fecha'])
export class ValoracionFisioterapeutica extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Fecha de la valoración 'YYYY-MM-DD' (la propone el sistema = hoy; editable, nunca futura). */
  @Column({ type: 'date' })
  fecha: string;

  /** Persona profesional responsable = usuario autenticado al crear. Nunca viene del body. */
  @Column({ name: 'usuario_responsable_id', type: 'int' })
  usuarioResponsableId: number;

  @Column({ type: 'enum', enum: EstadoValoracion, default: EstadoValoracion.BORRADOR })
  estado: EstadoValoracion;

  // ── RF-TF-02 (cabecera de antecedentes; los catálogos van en B.1.4) ──
  @Column({ type: 'text', nullable: true })
  otrosDiagnosticos?: string | null;

  @Column({ type: 'boolean', default: false })
  antecedentesCaidas: boolean;

  @Column({ type: 'text', nullable: true })
  detalleCaidas?: string | null;

  @Column({ type: 'boolean', default: false })
  usoAyudasBiomecanicas: boolean;

  @Column({ type: 'text', nullable: true })
  detalleAyudasBiomecanicas?: string | null;

  // ── RF-TF-04: dolor ──
  @Column({ type: 'boolean', default: false })
  presentaDolor: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  zonaDolorosa?: string | null;

  /** Varias a la vez (punzante + irradiado…). Se guarda como lista separada por comas. */
  @Column({ type: 'simple-array', nullable: true })
  caracteristicasDolor?: CaracteristicaDolor[] | null;

  /** Solo tiene sentido si `caracteristicasDolor` incluye «irradiado». */
  @Column({ type: 'varchar', length: 255, nullable: true })
  direccionIrradiacion?: string | null;

  /** Entero 1–10, solo si `presentaDolor`. */
  @Column({ type: 'tinyint', nullable: true })
  intensidadDolor?: number | null;

  // ── RF-TF-05: estado cognitivo y conductual ──
  @Column({ type: 'boolean', default: true })
  orientacionPersona: boolean;

  @Column({ type: 'boolean', default: true })
  orientacionEspacio: boolean;

  @Column({ type: 'boolean', default: true })
  orientacionTiempo: boolean;

  /**
   * Valoración global de consciencia/orientación: criterio profesional,
   * se registra explícitamente y NO se deduce de las tres orientaciones.
   */
  @Column({ type: 'boolean', default: true })
  conscienteOrientado: boolean;

  @Column({ type: 'text', nullable: true })
  cambiosConductuales?: string | null;

  @Column({ type: 'text', nullable: true })
  estadosAnimo?: string | null;

  // ── RF-TF-06: pruebas generales, diagnóstico diferencial y tratamiento ──
  @Column({ type: 'text', nullable: true })
  rangoMovimiento?: string | null;

  @Column({ type: 'text', nullable: true })
  fuerzaMuscularDinamometria?: string | null;

  @Column({ type: 'text', nullable: true })
  postura?: string | null;

  @Column({ type: 'text', nullable: true })
  riesgoUlcera?: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosticoDiferencial?: string | null;

  @Column({ type: 'text', nullable: true })
  tratamiento?: string | null;

  /**
   * «Avances»: texto abierto OPCIONAL al final de la valoración (decisión de la Jefatura, octubre 2026; RF-TF-12:
   * «observaciones sobre los avances» del reporte semestral). No se exige para confirmar.
   */
  @Column({ type: 'text', nullable: true })
  avances?: string | null;
  // RN-02: anulación (anulado, motivoAnulacion, anuladoPorId, fechaAnulacion) viene de `Anulable`.
}
