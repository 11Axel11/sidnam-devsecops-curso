import { Controller, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import {
  AntecedentePersonal,
  DatoFuncionalNutricion,
  EjercicioTestMovimiento,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
} from '../entities/catalogos.entities';
import { CatalogoService } from '../services/catalogo.service';
import { CatalogosPermisosService } from '../services/catalogos-permisos.service';
import { CatalogoBaseController } from './catalogo-base.controller';

// Un controller por catálogo; todo el comportamiento vive en CatalogoBaseController.

@ApiTags('Catálogos')
@UseGuards(AuthGuard)
@Controller('catalogos/dato-funcional-nutricion')
export class DatoFuncionalNutricionController extends CatalogoBaseController<DatoFuncionalNutricion> {
  constructor(
    @InjectRepository(DatoFuncionalNutricion) repo: Repository<DatoFuncionalNutricion>,
    permisos: CatalogosPermisosService,
  ) {
    super(new CatalogoService(repo, 'Datos funcionales de Nutrición'), permisos);
  }
}

@ApiTags('Catálogos')
@UseGuards(AuthGuard)
@Controller('catalogos/antecedente-personal')
export class AntecedentePersonalController extends CatalogoBaseController<AntecedentePersonal> {
  constructor(
    @InjectRepository(AntecedentePersonal) repo: Repository<AntecedentePersonal>,
    permisos: CatalogosPermisosService,
  ) {
    super(new CatalogoService(repo, 'Antecedentes personales'), permisos);
  }
}

@ApiTags('Catálogos')
@UseGuards(AuthGuard)
@Controller('catalogos/tipo-antecedente-traumatico')
export class TipoAntecedenteTraumaticoController extends CatalogoBaseController<TipoAntecedenteTraumatico> {
  constructor(
    @InjectRepository(TipoAntecedenteTraumatico) repo: Repository<TipoAntecedenteTraumatico>,
    permisos: CatalogosPermisosService,
  ) {
    super(new CatalogoService(repo, 'Tipos de antecedente traumático'), permisos);
  }
}

@ApiTags('Catálogos')
@UseGuards(AuthGuard)
@Controller('catalogos/tipo-evento-importante')
export class TipoEventoImportanteController extends CatalogoBaseController<TipoEventoImportante> {
  constructor(
    @InjectRepository(TipoEventoImportante) repo: Repository<TipoEventoImportante>,
    permisos: CatalogosPermisosService,
  ) {
    super(new CatalogoService(repo, 'Tipos de evento importante'), permisos);
  }
}

@ApiTags('Catálogos')
@UseGuards(AuthGuard)
@Controller('catalogos/ejercicio-test-movimiento')
export class EjercicioTestMovimientoController extends CatalogoBaseController<EjercicioTestMovimiento> {
  constructor(
    @InjectRepository(EjercicioTestMovimiento) repo: Repository<EjercicioTestMovimiento>,
    permisos: CatalogosPermisosService,
  ) {
    super(new CatalogoService(repo, 'Ejercicios del test de movimiento'), permisos);
  }
}

export const CATALOGO_CONTROLLERS = [
  DatoFuncionalNutricionController,
  AntecedentePersonalController,
  TipoAntecedenteTraumaticoController,
  TipoEventoImportanteController,
  EjercicioTestMovimientoController,
];
