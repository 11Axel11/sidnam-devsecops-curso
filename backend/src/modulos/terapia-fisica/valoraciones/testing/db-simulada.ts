/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-function-type -- doble de prueba en memoria */
import { FindOperator } from 'typeorm';
import {
  AntecedentePersonal,
  DatoFuncionalNutricion,
  EjercicioTestMovimiento,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
} from 'src/modulos/catalogos/entities/catalogos.entities';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Base de datos simulada en memoria para las pruebas unitarias del módulo.
 * A diferencia de un mock plano:
 *  - tiene una tabla por ENTIDAD (`getRepository(Entidad)` devuelve su repo);
 *  - entiende `In(...)`, `Not(...)`, `Between/MoreThanOrEqual/LessThanOrEqual(...)`, `order` de varias
 *    claves y `relations` (antecedente / tipo / datoFuncional / tipoEvento / ejercicio);
 *  - cada expediente simulado trae su residente con `fecha_nacimiento` (por defecto
 *    `NACIMIENTO_SIMULADO_POR_DEFECTO`, como la lee el driver: medianoche UTC; `null` = sin residente);
 *  - `transaction(...)` hace ROLLBACK real si el callback lanza (restaura filas
 *    modificadas y elimina las insertadas), así que «no se guarda nada» se
 *    comprueba de verdad y no solo porque el código lanzó antes de escribir;
 *  - registra los candados en `log` (`lock:<Entidad>:<id>`, `lock-expediente:<id>`).
 * No sustituye a las pruebas de integración con MySQL (concurrencia real).
 */

/** Fecha de nacimiento de los residentes simulados: 1940-05-12, medianoche UTC (así la devuelve el driver). */
export const NACIMIENTO_SIMULADO_POR_DEFECTO = new Date('1940-05-12T00:00:00.000Z');

const RELACIONES: Record<string, Function> = {
  antecedente: AntecedentePersonal,
  tipo: TipoAntecedenteTraumatico,
  datoFuncional: DatoFuncionalNutricion,
  tipoEvento: TipoEventoImportante,
  ejercicio: EjercicioTestMovimiento,
};

// Valores por defecto que MySQL aplica al insertar (columnas con `default` en la entidad).
const DEFAULTS: Record<string, Record<string, unknown>> = {
  AntecedenteTraumatico: { anulado: false },
  ValoracionFisioterapeutica: { anulado: false },
  EventoImportanteTf: { anulado: false },
  AplicacionTestMovimiento: { anulado: false },
  ControlNutricional: { anulado: false },
  EvaluacionBarthel: { anulado: false },
  EvaluacionTinetti: { anulado: false },
  EvaluacionMna: { anulado: false },
  ValoracionNutricional: {
    anulado: false,
    problemaVisual: false,
    problemaCavidadOral: false,
    alergiaMedicamentos: false,
    depresion: false,
    ansiedad: false,
    estadoCognitivo: 'normal',
  },
};

/** Las fechas se comparan por instante; las cadenas 'YYYY-MM-DD' y los números, tal cual. */
const comparable = (x: any) => (x instanceof Date ? x.getTime() : x);

/**
 * @param expedientes ids de expedientes que existen.
 * @param nacimientos fecha de nacimiento del residente por expediente (`null` = el expediente no tiene
 *                    residente); los no listados usan `NACIMIENTO_SIMULADO_POR_DEFECTO`.
 * @param inactivos ids de expedientes que están `Inactivo` (opcional; por defecto todos `Activo`, como siempre).
 *                  Se pueden cambiar después con `cambiarEstadoExpediente`.
 */
export function crearDbSimulada(
  expedientes: number[] = [1],
  nacimientos: Record<number, Date | null> = {},
  inactivos: number[] = [],
) {
  const tablas = new Map<Function, any[]>();
  const secuencias = new Map<Function, number>();
  const log: string[] = [];

  const tabla = (e: Function): any[] => {
    if (!tablas.has(e)) tablas.set(e, []);
    return tablas.get(e)!;
  };

  for (const id of expedientes) {
    const nacimiento = id in nacimientos ? nacimientos[id] : NACIMIENTO_SIMULADO_POR_DEFECTO;
    tabla(Expediente_Residente).push({
      id,
      id_expediente: id,
      estado: inactivos.includes(id) ? EstadoExpediente.Inactivo : EstadoExpediente.Activo,
      residente: nacimiento === null ? null : { id_adulto_mayor: id, fecha_nacimiento: nacimiento },
    });
  }

  const cumple = (fila: any, where: Record<string, any> = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (v instanceof FindOperator) {
        if (v.type === 'in') return (v.value as any[]).includes(fila[k]);
        if (v.type === 'not') return fila[k] !== v.value;
        if (v.type === 'moreThanOrEqual') return comparable(fila[k]) >= comparable(v.value);
        if (v.type === 'lessThanOrEqual') return comparable(fila[k]) <= comparable(v.value);
        if (v.type === 'between') {
          const [desde, hasta] = v.value as any[];
          return comparable(fila[k]) >= comparable(desde) && comparable(fila[k]) <= comparable(hasta);
        }
      }
      return fila[k] === v;
    });

  const conRelaciones = (fila: any, relations: Record<string, boolean> = {}) => {
    const copia = { ...fila };
    for (const rel of Object.keys(relations)) {
      const destino = RELACIONES[rel];
      if (destino) copia[rel] = tabla(destino).find((r) => r.id === fila[`${rel}Id`]);
    }
    return copia;
  };

  const repoDe = (entidad: Function) => ({
    metadata: { tableName: entidad.name },
    create: (d: any) => ({ ...d }),
    find: async ({ where, relations, order }: any = {}) => {
      let r = tabla(entidad).filter((f) => cumple(f, where));
      if (order) {
        r = [...r].sort((a, b) => {
          for (const [campo, dir] of Object.entries(order)) {
            const x = comparable(a[campo]);
            const y = comparable(b[campo]);
            if (x === y) continue;
            return (x > y ? 1 : -1) * (dir === 'DESC' ? -1 : 1);
          }
          return 0;
        });
      }
      return r.map((f) => conRelaciones(f, relations));
    },
    findOne: async ({ where, lock, relations }: any = {}) => {
      const f = tabla(entidad).find((x) => cumple(x, where));
      if (!f) return null;
      if (lock) log.push(`lock:${entidad.name}:${f.id}`);
      return relations ? conRelaciones(f, relations) : f;
    },
    save: async (e: any) => {
      const guardar = (fila: any) => {
        if (!fila.id) {
          const n = (secuencias.get(entidad) ?? 0) + 1;
          secuencias.set(entidad, n);
          fila.id = n;
          fila.fechaCreacion ??= new Date();
          for (const [k, v] of Object.entries(DEFAULTS[entidad.name] ?? {})) fila[k] ??= v;
          tabla(entidad).push(fila);
        } else if (!tabla(entidad).includes(fila)) {
          Object.assign(tabla(entidad).find((x) => x.id === fila.id) ?? {}, fila);
        }
        return fila;
      };
      return Array.isArray(e) ? e.map(guardar) : guardar(e);
    },
    update: async (criterio: any, parcial: any) => {
      const afectadas = tabla(entidad).filter((f) => cumple(f, criterio));
      afectadas.forEach((f) => Object.assign(f, parcial));
      log.push(`update:${entidad.name}:${afectadas.map((a) => a.id).join(',')}`);
      return { affected: afectadas.length };
    },
  });

  const manager: any = {
    getRepository: (e: Function) => repoDe(e),
    createQueryBuilder: () => {
      let id: number;
      let bloquea = false;
      const qb: any = {
        select: () => qb,
        where: (_: string, p: any) => ((id = p.expedienteId), qb),
        setLock: () => ((bloquea = true), qb),
        getOne: async () => {
          if (!expedientes.includes(id)) return null;
          if (bloquea) log.push(`lock-expediente:${id}`);
          return { id_expediente: id, estado: tabla(Expediente_Residente).find((e) => e.id_expediente === id)?.estado };
        },
      };
      return qb;
    },
  };

  const transaction = async (_iso: string, cb: (m: any) => Promise<any>) => {
    // Instantánea para el rollback.
    const foto = new Map<Function, { ref: any; copia: any }[]>();
    tablas.forEach((filas, e) => foto.set(e, filas.map((ref) => ({ ref, copia: { ...ref } }))));
    try {
      return await cb(manager);
    } catch (error) {
      tablas.forEach((filas, e) => {
        const previas = foto.get(e) ?? [];
        filas.splice(0, filas.length, ...previas.map((p) => p.ref)); // quita las insertadas
        previas.forEach(({ ref, copia }) => {
          Object.keys(ref).forEach((k) => delete ref[k]);
          Object.assign(ref, copia);
        });
      });
      throw error;
    }
  };

  const dataSource: any = { manager, getRepository: (e: Function) => repoDe(e), transaction };

  return {
    dataSource,
    log,
    /** Inserta una fila con id propio (o autoasignado) y devuelve la referencia viva. */
    insertar: <T extends Record<string, any>>(entidad: Function, fila: T): T & { id: number } => {
      const n = fila.id ?? (secuencias.get(entidad) ?? 0) + 1;
      secuencias.set(entidad, Math.max(n, secuencias.get(entidad) ?? 0));
      const f: any = { fechaCreacion: new Date(), ...(DEFAULTS[entidad.name] ?? {}), ...fila, id: n };
      tabla(entidad).push(f);
      return f;
    },
    filas: (entidad: Function): any[] => tabla(entidad),
    /** Cierra o reactiva un expediente (como `cambiarEstadoExpediente` de residentes). */
    cambiarEstadoExpediente: (id: number, estado: EstadoExpediente): void => {
      const e = tabla(Expediente_Residente).find((x) => x.id_expediente === id);
      if (e) e.estado = estado;
    },
  };
}
