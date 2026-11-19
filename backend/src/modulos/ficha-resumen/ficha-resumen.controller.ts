import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { FichaResumenDto } from './ficha-resumen.dto';
import { FichaResumenService } from './ficha-resumen.service';

/**
 * Ficha resumen interdisciplinaria (RF-TR-01). Sección única «FichaResumen» con la acción Ver (RF-TR-02): el endpoint NO exige
 * `Nutricion` ni `TerapiaFisica` (CA-23: Enfermería la ve completa sin acceder a las valoraciones). Solo lectura: no hay POST,
 * PATCH ni DELETE. La respuesta no lleva ids de usuario, así que no se aplica `NombresDeUsuarioInterceptor` (BE-9).
 */
@ApiTags('Ficha resumen interdisciplinaria')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.FICHA_RESUMEN)
@Controller()
export class FichaResumenController {
  constructor(private readonly service: FichaResumenService) {}

  @Get('expedientes/:expedienteId/ficha-resumen')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Ficha resumen del expediente (RF-TR-01): solo lectura, sin el detalle de las valoraciones' })
  obtener(@Param('expedienteId', ParseIntPipe) expedienteId: number): Promise<FichaResumenDto> {
    return this.service.obtener(expedienteId);
  }
}
