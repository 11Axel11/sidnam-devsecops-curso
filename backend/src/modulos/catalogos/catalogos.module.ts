import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import {
  AntecedentePersonal,
  DatoFuncionalNutricion,
  EjercicioTestMovimiento,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
} from './entities/catalogos.entities';
import { CATALOGO_CONTROLLERS } from './controllers/catalogos.controllers';
import { CatalogosPermisosService } from './services/catalogos-permisos.service';
import { CatalogosSeedService } from './seed/catalogos-seed.service';

const ENTIDADES_CATALOGO = [
  DatoFuncionalNutricion,
  AntecedentePersonal,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
  EjercicioTestMovimiento,
];

@Module({
  imports: [
    // RolPermisoAccion/RolUsuario: los necesitan RolesAccionesGuard/SeccionGuard
    // y CatalogosPermisosService (mismo patrón que FacturasProveedoresModule).
    TypeOrmModule.forFeature([...ENTIDADES_CATALOGO, RolPermisoAccion, RolUsuario]),
  ],
  controllers: CATALOGO_CONTROLLERS,
  providers: [CatalogosPermisosService, CatalogosSeedService],
  // Los módulos de valoraciones (B.1.2+) inyectarán estos repositorios.
  exports: [TypeOrmModule],
})
export class CatalogosModule {}
