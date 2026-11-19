import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { hash } from 'bcryptjs';
import { migrationChecksums } from '../config/migration-checksum';

// Compiled entities retain src/* imports; resolve them without changing production modules.
require('tsconfig-paths').register({ baseUrl: join(__dirname, '..'), paths: { 'src/*': ['*'] } });
const source = new DataSource({ type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), username: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME, entities: [join(__dirname, '../modulos/**/entities/*.js')], synchronize: false, timezone: '-06:00' });

async function main() {
  if (process.env.APP_ENV !== 'staging' || !process.env.DB_NAME?.startsWith('sidnam_staging')) throw new Error('This tool only operates on an isolated staging database');
  await source.initialize();
  const file = join(process.cwd(), 'migrations', '001-initial.json');
  const operation = process.argv[2];
  if (operation === 'generate') {
    if (existsSync(file)) throw new Error('Initial migration already exists');
    const tables = await source.query('SHOW TABLES');
    if (tables.length) throw new Error('Generate only against an empty staging database');
    const sql = await source.driver.createSchemaBuilder().log();
    mkdirSync(join(process.cwd(), 'migrations'), { recursive: true });
    writeFileSync(file, JSON.stringify(sql.upQueries, null, 2) + '\n');
    console.log(`Generated ${sql.upQueries.length} versioned migration statements`);
  } else if (operation === 'migrate') {
    const content = readFileSync(file, 'utf8');
    const checksums = migrationChecksums(content);
    const checksum = checksums.canonical;
    await source.query('CREATE TABLE IF NOT EXISTS devsecops_migrations (version VARCHAR(100) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    const previous = await source.query('SELECT checksum FROM devsecops_migrations WHERE version = ?', ['001-initial']);
    if (previous.length && previous[0].checksum !== checksum) {
      if (!checksums.legacy.includes(previous[0].checksum)) throw new Error('Applied migration checksum mismatch');
      await source.query('UPDATE devsecops_migrations SET checksum = ? WHERE version = ?', [checksum, '001-initial']);
    }
    if (!previous.length) {
      // MySQL DDL implicitly commits. A partial failure requires a fresh empty database or backup restoration.
      for (const statement of JSON.parse(content)) await source.query(statement.query, statement.parameters);
      await source.query('INSERT INTO devsecops_migrations(version, checksum) VALUES (?, ?)', ['001-initial', checksum]);
    }
  } else if (operation === 'seed') {
    const { Usuario } = require('../modulos/gestion-usuario/entities/usuario.entity');
    const { RolUsuario } = require('../modulos/gestion-usuario/entities/rol.entity');
    const { Permiso } = require('../modulos/gestion-usuario/entities/permiso.entity');
    const { Accion } = require('../modulos/gestion-usuario/entities/accion.entity');
    const { RolPermisoAccion } = require('../modulos/gestion-usuario/entities/rolPermisoAccion.entity');
    const roles = source.getRepository(RolUsuario), users = source.getRepository(Usuario), permissions = source.getRepository(Permiso), actions = source.getRepository(Accion), links = source.getRepository(RolPermisoAccion);
    let permission: any = await permissions.findOneBy({ seccion: 'Catalogos' });
    permission ??= await permissions.save({ modulo: 'Catalogos', seccion: 'Catalogos' });
    for (const [kind, cedula, estado] of [['ADMIN', '900000001', 'activo'], ['READER', '900000002', 'activo'], ['INACTIVE', '900000003', 'inactivo']]) {
      const password = process.env[`E2E_${kind}_PASSWORD`];
      if (!password || password.length < 16) throw new Error(`E2E_${kind}_PASSWORD must contain at least 16 characters`);
      let role: any = await roles.findOneBy({ nombre: `E2E_${kind}` });
      role ??= await roles.save({ nombre: `E2E_${kind}`, descripcion: 'Synthetic DevSecOps account', estado: true });
      for (const verb of kind === 'ADMIN' ? ['Ver', 'Crear', 'Actualizar'] : ['Ver']) {
        let action: any = await actions.findOneBy({ accion: verb });
        action ??= await actions.save({ accion: verb });
        if (!await links.findOne({ where: { rol: { id_rol: role.id_rol }, permiso: { id_permiso: permission.id_permiso }, accion: { id_accion: action.id_accion } } })) await links.save({ rol: role, permiso: permission, accion: action });
      }
      const user: any = await users.findOneBy({ cedula });
      await users.save({ ...user, cedula, email: `${kind.toLowerCase()}@example.invalid`, name: 'DevSecOps', apellido1: kind, password: await hash(password, 12), rol: role, estado });
    }
    console.log('Synthetic accounts ready');
  } else throw new Error('Expected generate, migrate or seed');
}
main().catch(error => {
  let message = String(error.message).slice(0, 2000);
  for (const [key, value] of Object.entries(process.env)) if (/PASS|SECRET|TOKEN/.test(key) && value && value.length >= 8) message = message.replaceAll(value, '[REDACTED]');
  console.error('Database operation failed: ' + message);
  process.exitCode = 1;
}).finally(async () => { if (source.isInitialized) await source.destroy(); });
