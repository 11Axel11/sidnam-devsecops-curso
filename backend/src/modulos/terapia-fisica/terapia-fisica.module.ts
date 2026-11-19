import { Module } from '@nestjs/common';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { AntecedenteTraumatico } from './entities/antecedente-traumatico.entity';
import { AplicacionTestMovimiento } from './entities/aplicacion-test-movimiento.entity';
import { AplicacionTestMovimientoEjercicio } from './entities/aplicacion-test-movimiento-ejercicio.entity';
import { EvaluacionBarthel } from './entities/evaluacion-barthel.entity';
import { EvaluacionTinetti } from './entities/evaluacion-tinetti.entity';
import { EventoImportanteTf } from './entities/evento-importante-tf.entity';
import { ValoracionFisioterapeutica } from './entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from './entities/valoracion-tf-antecedente-personal.entity';
import { EvaluacionesBarthelController } from './barthel/evaluaciones-barthel.controller';
import { EvaluacionesBarthelService } from './barthel/evaluaciones-barthel.service';
import { EvaluacionesTinettiController } from './tinetti/evaluaciones-tinetti.controller';
import { EvaluacionesTinettiService } from './tinetti/evaluaciones-tinetti.service';
import { EventosImportantesController } from './eventos-importantes/eventos-importantes.controller';
import { EventosImportantesService } from './eventos-importantes/eventos-importantes.service';
import { AplicacionesTestMovimientoController } from './test-movimiento/aplicaciones-test-movimiento.controller';
import { AplicacionesTestMovimientoService } from './test-movimiento/aplicaciones-test-movimiento.service';
import { AntecedentesValoracionController } from './valoraciones/antecedentes-valoracion.controller';
import { AntecedentesValoracionService } from './valoraciones/antecedentes-valoracion.service';
import { ValoracionesFisioterapeuticasController } from './valoraciones/valoraciones-fisioterapeuticas.controller';
import { ValoracionesFisioterapeuticasService } from './valoraciones/valoraciones-fisioterapeuticas.service';
import { ReporteSemestralController } from './reporte-semestral/reporte-semestral.controller';
import { ReporteSemestralService } from './reporte-semestral/reporte-semestral.service';

@Module({
  imports: [
    // RolPermisoAccion/RolUsuario: los necesitan RolesAccionesGuard/SeccionGuard.
    TypeOrmModule.forFeature([
      ValoracionFisioterapeutica,
      ValoracionTfAntecedentePersonal,
      AntecedenteTraumatico,
      EventoImportanteTf,
      AplicacionTestMovimiento,
      AplicacionTestMovimientoEjercicio,
      EvaluacionBarthel,
      EvaluacionTinetti,
      RolPermisoAccion,
      RolUsuario,
    ]),
  ],
  controllers: [
    ValoracionesFisioterapeuticasController,
    AntecedentesValoracionController,
    EventosImportantesController,
    AplicacionesTestMovimientoController,
    EvaluacionesBarthelController,
    EvaluacionesTinettiController,
    ReporteSemestralController,
  ],
  providers: [
    ValoracionesFisioterapeuticasService,
    AntecedentesValoracionService,
    EventosImportantesService,
    AplicacionesTestMovimientoService,
    EvaluacionesBarthelService,
    EvaluacionesTinettiService,
    // RF-TF-12: reporte semestral en PDF (servicio y plantilla compartidos, F.10)
    ReporteSemestralService,
    PdfHtmlService,
  ],
  exports: [TypeOrmModule],
})
export class TerapiaFisicaModule {}
