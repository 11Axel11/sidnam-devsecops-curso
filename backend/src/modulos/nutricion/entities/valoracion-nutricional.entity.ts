import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { NivelDeterioroCognitivo } from '../enums/nivel-deterioro-cognitivo';

/**
 * Datos generales de la valoración nutricional (RF-NU-04; B.1.11).
 *
 * - RN-01: cuelga de `expediente_residente` (nunca de `residente`).
 * - RN-02: jamás se borra; se ANULA (columnas de `Anulable`, con motivo/usuario/fecha).
 * - RN-03: máquina de estados borrador → vigente → reemplazada, la misma de la valoración
 *   fisioterapéutica (helper común `confirmarValoracion`, src/common/valoraciones).
 *
 * Respecto del ERD solo se agregan las columnas de anulación (`Anulable`): el ERD ya cubría todos
 * los datos de RF-NU-04. Todas las columnas booleanas tienen `default` y las demás son nullable:
 * guardado parcial en borrador (RNF-08) y cambio aditivo para `synchronize`.
 *
 * No se registran aquí (RF-NU-04): medicamentos en uso y patologías (se consultan del expediente
 * general) ni «observaciones generales» (documentadas fuera del alcance).
 */
@Entity('valoracion_nutricional')
@Index('idx_valoracion_nutricional_expediente_fecha', ['expedienteId', 'fecha'])
export class ValoracionNutricional extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Fecha de la valoración 'YYYY-MM-DD' (propuesta = hoy; editable, nunca futura). */
  @Column({ type: 'date' })
  fecha: string;

  /** Persona profesional responsable = usuario autenticado al crear. Nunca viene del body. */
  @Column({ name: 'usuario_responsable_id', type: 'int' })
  usuarioResponsableId: number;

  @Column({ type: 'enum', enum: EstadoValoracion, default: EstadoValoracion.BORRADOR })
  estado: EstadoValoracion;

  // ── Datos biomédicos ──
  @Column({ type: 'boolean', default: false })
  problemaVisual: boolean;

  @Column({ type: 'boolean', default: false })
  problemaCavidadOral: boolean;

  // ── Datos farmacológicos: alergia a medicamentos (sí/no, con detalle) ──
  @Column({ type: 'boolean', default: false })
  alergiaMedicamentos: boolean;

  /** «Cuáles»: obligatorio al confirmar solo si `alergiaMedicamentos = true`; no admitido si es false. */
  @Column({ type: 'text', nullable: true })
  detalleAlergiaMedicamentos?: string | null;

  // ── Datos funcionales: selección única de un catálogo administrable ──
  @ManyToOne(() => DatoFuncionalNutricion, { nullable: true })
  @JoinColumn({ name: 'dato_funcional_id' })
  datoFuncional?: DatoFuncionalNutricion | null;

  /** Nullable en BD (borrador parcial); obligatorio para confirmar. Un ítem inactivo solo se rechaza al asignarlo. */
  @Column({ name: 'dato_funcional_id', type: 'int', nullable: true })
  datoFuncionalId?: number | null;

  // ── Datos cognitivos ──
  @Column({ type: 'enum', enum: EstadoCognitivo, default: EstadoCognitivo.NORMAL })
  estadoCognitivo: EstadoCognitivo;

  /**
   * Nivel del deterioro: lista cerrada leve / moderado / severo (decisión de la Jefatura, octubre 2026). Solo con
   * `con_deterioro`; obligatorio al confirmar en ese caso. Sigue siendo `varchar(255)` (no `enum` de MySQL) para
   * que `synchronize` no emita ningún ALTER sobre bases con filas de cuando era texto libre; la lista se
   * valida en el DTO.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  nivelDeterioroCognitivo?: NivelDeterioroCognitivo | null;

  // ── Datos emocionales ──
  @Column({ type: 'boolean', default: false })
  depresion: boolean;

  @Column({ type: 'boolean', default: false })
  ansiedad: boolean;
}
