import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CatalogoBase } from '../entities/catalogo-base.entity';
import {
  AntecedentePersonal,
  DatoFuncionalNutricion,
  EjercicioTestMovimiento,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
} from '../entities/catalogos.entities';
import {
  ANTECEDENTES_PERSONALES,
  DATOS_FUNCIONALES_NUTRICION,
  EJERCICIOS_TEST_MOVIMIENTO,
  TIPOS_ANTECEDENTE_TRAUMATICO,
  TIPOS_EVENTO_IMPORTANTE,
} from './catalogos-iniciales';

/**
 * Carga inicial de catálogos (el sistema no tiene mecanismo de carga inicial
 * ni migraciones, Anexo F). Es idempotente y respetuosa con la administración:
 * un catálogo se siembra SOLO si su tabla está vacía. Así, si el departamento
 * desactiva o agrega ítems, un reinicio del back nunca los repone ni duplica.
 *
 * Se ejecuta en todos los entornos (incluido producción): los catálogos
 * necesitan su contenido inicial para que los formularios funcionen. Es
 * aditivo: nunca borra ni modifica filas.
 */
@Injectable()
export class CatalogosSeedService implements OnModuleInit {
  private readonly logger = new Logger(CatalogosSeedService.name);

  constructor(
    @InjectRepository(DatoFuncionalNutricion) private readonly datoFuncional: Repository<DatoFuncionalNutricion>,
    @InjectRepository(AntecedentePersonal) private readonly antecedente: Repository<AntecedentePersonal>,
    @InjectRepository(TipoAntecedenteTraumatico) private readonly tipoTraumatico: Repository<TipoAntecedenteTraumatico>,
    @InjectRepository(TipoEventoImportante) private readonly tipoEvento: Repository<TipoEventoImportante>,
    @InjectRepository(EjercicioTestMovimiento) private readonly ejercicio: Repository<EjercicioTestMovimiento>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sembrar(this.datoFuncional, DATOS_FUNCIONALES_NUTRICION);
    await this.sembrar(this.antecedente, ANTECEDENTES_PERSONALES);
    await this.sembrar(this.tipoTraumatico, TIPOS_ANTECEDENTE_TRAUMATICO);
    await this.sembrar(this.tipoEvento, TIPOS_EVENTO_IMPORTANTE);
    await this.sembrar(this.ejercicio, EJERCICIOS_TEST_MOVIMIENTO);
  }

  /** Devuelve cuántos ítems insertó (0 si la tabla ya tenía contenido). */
  async sembrar<T extends CatalogoBase>(repo: Repository<T>, nombres: string[]): Promise<number> {
    if ((await repo.count()) > 0) return 0;
    // creadoPorId queda null: lo creó el sistema, no un usuario.
    const filas = nombres.map((nombre) => repo.create({ nombre, activo: true } as DeepPartial<T>));
    await repo.save(filas);
    this.logger.log(`Catálogo ${repo.metadata.tableName}: ${nombres.length} ítems iniciales sembrados`);
    return nombres.length;
  }
}
