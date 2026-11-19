import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { ControlesNutricionalesController } from './controles/controles-nutricionales.controller';
import { ControlesNutricionalesService } from './controles/controles-nutricionales.service';
import { ControlNutricional } from './entities/control-nutricional.entity';
import { EvaluacionMna } from './entities/evaluacion-mna.entity';
import { ValoracionNutricional } from './entities/valoracion-nutricional.entity';
import { EvaluacionesMnaController } from './mna/evaluaciones-mna.controller';
import { EvaluacionesMnaService } from './mna/evaluaciones-mna.service';
import { ValoracionesNutricionalesController } from './valoraciones/valoraciones-nutricionales.controller';
import { ValoracionesNutricionalesService } from './valoraciones/valoraciones-nutricionales.service';

@Module({
  imports: [
    // RolPermisoAccion/RolUsuario: los necesitan RolesAccionesGuard/SeccionGuard.
    TypeOrmModule.forFeature([ValoracionNutricional, ControlNutricional, EvaluacionMna, RolPermisoAccion, RolUsuario]),
  ],
  controllers: [ValoracionesNutricionalesController, ControlesNutricionalesController, EvaluacionesMnaController],
  providers: [ValoracionesNutricionalesService, ControlesNutricionalesService, EvaluacionesMnaService],
  exports: [TypeOrmModule],
})
export class NutricionModule {}
