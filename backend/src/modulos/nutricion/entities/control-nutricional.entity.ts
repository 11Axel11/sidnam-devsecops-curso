import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DECIMAL_A_NUMERO } from 'src/common/utils/decimal.transformer';
import { Anulable } from 'src/common/valoraciones/anulable.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Control y evaluación del estado nutricional (RF-NU-01, Anexo E.1; B.1.9): una fila de la serie
 * histórica del residente. Sin máquina de estados: cada control es independiente y ninguno sobrescribe
 * al anterior (RN-02). Nunca se borra ni se edita; se ANULA con motivo (columnas de `Anulable`) y, si
 * hubo un error, se registra uno nuevo.
 *
 * - RN-01: cuelga de `expediente_residente`.
 * - Valores calculados por el backend (RN-04, regla 5): `edadMomentoControl` (años cumplidos a `fecha`,
 *   desde `residente.fecha_nacimiento`) e `imc` (peso / talla²). Se almacenan y no se recalculan; ningún
 *   DTO los acepta.
 * - Unidades: peso kg · talla, circunferencias y altura de la rodilla cm · fuerza muscular kgf (P4).
 *   Decimales hasta 1 posición; se devuelven como `number`.
 *
 * Respecto del ERD: se agregan las columnas de anulación (`Anulable`) y `fuerzaMuscular` pasa de
 * `varchar` a `decimal(5,1)` (P4 fijó la unidad en kgf, por lo que es una medida numérica). El ERD no
 * trae `usuarioResponsableId`: la persona que lo registró es `creadoPorId`. `interpretacion` es texto
 * libre digitado por el profesional (no hay tabla fuente de interpretación del IMC).
 */
@Entity('control_nutricional')
@Index('idx_control_nutricional_expediente_fecha', ['expedienteId', 'fecha'])
export class ControlNutricional extends Anulable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente_Residente, { nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente_Residente;

  @Column({ name: 'expediente_id', type: 'int' })
  expedienteId: number;

  /** Fecha del control 'YYYY-MM-DD' (propuesta = hoy; nunca futura). */
  @Column({ type: 'date' })
  fecha: string;

  /** CALCULADA: años cumplidos a `fecha`. */
  @Column({ type: 'int' })
  edadMomentoControl: number;

  /** kg */
  @Column({ type: 'decimal', precision: 5, scale: 1, transformer: DECIMAL_A_NUMERO })
  peso: number;

  /** cm */
  @Column({ type: 'decimal', precision: 5, scale: 1, transformer: DECIMAL_A_NUMERO })
  talla: number;

  /** CB — circunferencia braquial, cm. */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  circunferenciaBraquial?: number | null;

  /** CP — circunferencia de la pantorrilla, cm. */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  circunferenciaPantorrilla?: number | null;

  /** AR — altura de la rodilla, cm. */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  alturaRodilla?: number | null;

  /** FM — fuerza muscular, kgf. */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, transformer: DECIMAL_A_NUMERO })
  fuerzaMuscular?: number | null;

  /** CALCULADO: peso / (talla/100)², 1 decimal, kg/m². */
  @Column({ type: 'decimal', precision: 5, scale: 1, transformer: DECIMAL_A_NUMERO })
  imc: number;

  /** Interpretación digitada por la persona profesional (texto libre, sin fragmentar). */
  @Column({ type: 'text', nullable: true })
  interpretacion?: string | null;
}
