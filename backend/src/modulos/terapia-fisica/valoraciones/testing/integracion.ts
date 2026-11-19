/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-function-type -- utilidades de pruebas contra MySQL real */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Sexo } from 'src/common/enums/rol.enum';
import { estado_civil } from 'src/common/enums/estadoCivil.enum';
import { Dependencia } from 'src/common/enums/dependencia.enum';
import { linea_pobreza } from 'src/common/enums/lineaProbeza.enum';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { Residente } from 'src/modulos/residentes/entities/residente.entity';

/**
 * Utilidades de las pruebas de INTEGRACIÓN contra un MySQL real (opt-in).
 *
 * Salvaguardas: el host debe ser local y la base debe llamarse
 * `sidnam_scratch_*`, así que NUNCA pueden apuntar a dev ni a prod. La base se
 * sincroniza (`synchronize`) con todas las entidades del proyecto.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b2b npx jest integration
 */
export const INTEGRACION_ACTIVA = process.env.RUN_DB_INTEGRATION === '1';

const cargarEntidades = (): Function[] => {
  const raiz = path.resolve(__dirname, '../../../..'); // .../src
  const archivos: string[] = [];
  const caminar = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) caminar(p);
      else if (/(\.entity|\.entities)\.ts$/.test(f) || /^(administracioneMedicamento|contactoEmergenciaPendiente)\.ts$/.test(f)) archivos.push(p);
    }
  };
  caminar(raiz);
  const clases: Function[] = [];
  for (const f of archivos) {
    const mod = require(f);
    for (const k of Object.keys(mod)) if (typeof mod[k] === 'function') clases.push(mod[k]);
  }
  return clases;
};

export async function abrirDataSourceDeIntegracion(): Promise<DataSource> {
  require('dotenv').config();
  const base = process.env.DB_TEST_NAME ?? '';
  if (!base.startsWith('sidnam_scratch_')) throw new Error('DB_TEST_NAME debe empezar por sidnam_scratch_');
  if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST as string)) throw new Error('DB_HOST no es local');
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: base,
    entities: cargarEntidades(),
    synchronize: true,
    timezone: '-06:00',
    extra: { connectionLimit: 20 },
  });
  await ds.initialize();
  return ds;
}

export async function nuevoExpediente(ds: DataSource): Promise<number> {
  const r = await ds.getRepository(Expediente_Residente).insert({ tipo_pension: 'test', fecha_ingreso: new Date() } as any);
  return r.identifiers[0].id_expediente as number;
}

/**
 * Expediente CON residente, para probar el cálculo de la edad. `fechaNacimiento` se guarda como la guarda la
 * app: el frontend envía 'YYYY-MM-DD' (medianoche UTC) y el driver (`timezone: '-06:00'`) la escribe como
 * «día anterior 18:00». Pásela como `new Date('1940-05-12')`.
 */
export async function nuevoExpedienteConResidente(ds: DataSource, fechaNacimiento: Date): Promise<number> {
  const residente = await ds.getRepository(Residente).save({
    cedula: `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    nombre: 'Prueba',
    apellido1: 'Integración',
    sexo: Sexo.F,
    fecha_nacimiento: fechaNacimiento,
    edad: 80,
    estado_civil: estado_civil.Soltero,
    dependencia: Dependencia.Independiente,
    linea_pobreza: linea_pobreza.sin_registro,
  });
  const r = await ds.getRepository(Expediente_Residente).insert({
    tipo_pension: 'test',
    fecha_ingreso: new Date(),
    residente: { id_adulto_mayor: residente.id_adulto_mayor },
  } as any);
  return r.identifiers[0].id_expediente as number;
}
