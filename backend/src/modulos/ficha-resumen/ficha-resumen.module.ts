import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { FichaResumenController } from './ficha-resumen.controller';
import { FichaResumenService } from './ficha-resumen.service';

@Module({
  imports: [
    // RolPermisoAccion/RolUsuario: los necesitan RolesAccionesGuard/SeccionGuard. Los datos se leen con el DataSource
    // (repositorios internos), sin importar los módulos de Nutrición ni Terapia Física.
    TypeOrmModule.forFeature([RolPermisoAccion, RolUsuario]),
  ],
  controllers: [FichaResumenController],
  providers: [FichaResumenService],
})
export class FichaResumenModule {}
