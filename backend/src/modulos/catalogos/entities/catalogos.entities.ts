import { Entity } from 'typeorm';
import { CatalogoBase } from './catalogo-base.entity';

// Los cinco catálogos del Bloque B comparten exactamente la misma forma
// (id, nombre, activo + auditoría); solo cambian el nombre de tabla y quién
// los referencia. Nombres de tabla tomados de los ERD (docs/*.mermaid).

/** Referenciado por `valoracion_nutricional.datoFuncionalId`. */
@Entity('dato_funcional_nutricion')
export class DatoFuncionalNutricion extends CatalogoBase {}

/** Referenciado por `valoracion_tf_antecedente_personal.antecedenteId`. */
@Entity('antecedente_personal')
export class AntecedentePersonal extends CatalogoBase {}

/** Referenciado por `antecedente_traumatico.tipoId`. */
@Entity('tipo_antecedente_traumatico')
export class TipoAntecedenteTraumatico extends CatalogoBase {}

/** Referenciado por `evento_importante_tf.tipoEventoId`. */
@Entity('tipo_evento_importante')
export class TipoEventoImportante extends CatalogoBase {}

/** Referenciado por `aplicacion_test_movimiento_ejercicio.ejercicioId`. */
@Entity('ejercicio_test_movimiento')
export class EjercicioTestMovimiento extends CatalogoBase {}
