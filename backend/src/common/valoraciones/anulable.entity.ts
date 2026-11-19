import { Column } from 'typeorm';
import { Auditable } from 'src/common/auditoria/auditable.entity';

/**
 * Base para registros clínicos que se ANULAN en lugar de borrarse (RN-02 /
 * RF-TR-04). Convención uniforme del Bloque B: `PATCH /:id/anular` con
 * `{ motivo }` obligatorio, que deja `anulado = true` más motivo, usuario y
 * fecha. Nunca hay DELETE físico. Ver `anularRegistro` en anulacion.helper.ts.
 *
 * Todas las columnas tienen `default` o son nullable: aditivo para `synchronize`.
 */
export abstract class Anulable extends Auditable {
  @Column({ type: 'boolean', default: false })
  anulado: boolean;

  @Column({ type: 'text', nullable: true })
  motivoAnulacion?: string | null;

  @Column({ name: 'anulado_por_id', type: 'int', nullable: true })
  anuladoPorId?: number | null;

  @Column({ type: 'datetime', nullable: true })
  fechaAnulacion?: Date | null;
}
