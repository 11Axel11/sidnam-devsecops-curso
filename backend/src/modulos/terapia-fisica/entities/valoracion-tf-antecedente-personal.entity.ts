import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Auditable } from 'src/common/auditoria/auditable.entity';
import { AntecedentePersonal } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionFisioterapeutica } from './valoracion-fisioterapeutica.entity';

/**
 * Estado de UN ítem del catálogo de antecedentes personales dentro de una
 * valoración (RF-TF-02). Tabla intermedia CON atributos (no una N:M simple):
 * se guarda también `presente = false` para dejar constancia explícita de que
 * el antecedente fue evaluado y descartado (una fila ausente significa «no
 * evaluado»).
 *
 * `(valoracion_id, antecedente_id)` es único: respaldo en la base del upsert
 * (la exclusión mutua real la da el candado de la fila de la valoración).
 * No se anula: se corrige reenviando `presente`/`observacion` mientras la
 * valoración sea borrador. El ítem de catálogo puede desactivarse después sin
 * romper esta fila (la FK sigue resolviendo).
 */
@Entity('valoracion_tf_antecedente_personal')
@Unique('uq_valoracion_tf_antecedente', ['valoracionId', 'antecedenteId'])
export class ValoracionTfAntecedentePersonal extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ValoracionFisioterapeutica, { nullable: false })
  @JoinColumn({ name: 'valoracion_id' })
  valoracion?: ValoracionFisioterapeutica;

  @Column({ name: 'valoracion_id', type: 'int' })
  valoracionId: number;

  @ManyToOne(() => AntecedentePersonal, { nullable: false })
  @JoinColumn({ name: 'antecedente_id' })
  antecedente?: AntecedentePersonal;

  @Column({ name: 'antecedente_id', type: 'int' })
  antecedenteId: number;

  @Column({ type: 'boolean' })
  presente: boolean;

  @Column({ type: 'text', nullable: true })
  observacion?: string | null;
}
