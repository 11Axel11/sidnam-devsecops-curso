import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from 'src/common/auditoria/auditable.entity';

/**
 * Base de los catálogos administrables del Bloque B (RF-TR-03).
 *
 * Regla de negocio crítica: un ítem se DESACTIVA, nunca se elimina. Las
 * valoraciones históricas guardan la FK al ítem, así que éste debe seguir
 * existiendo y resolviéndose aunque `activo = false`. Por eso no hay DELETE
 * físico en ninguno de los endpoints de catálogos.
 *
 * `nombre` es único por catálogo (la comparación en MySQL es insensible a
 * mayúsculas con la collation por defecto).
 */
export abstract class CatalogoBase extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
