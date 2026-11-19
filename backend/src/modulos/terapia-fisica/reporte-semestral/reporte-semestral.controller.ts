import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { ReporteSemestralQueryDto } from './reporte-semestral.dto';
import { ReporteSemestralService } from './reporte-semestral.service';

/**
 * Reporte semestral de Terapia Física (RF-TF-12). Sección «TerapiaFisica», acción Ver (RF-TR-02). Devuelve un PDF, no JSON:
 * NO lleva `NombresDeUsuarioInterceptor` (convención de BE-9) y responde con `@Res()`.
 */
@ApiTags('Terapia Física · Reporte semestral')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@Controller()
export class ReporteSemestralController {
  constructor(private readonly service: ReporteSemestralService) {}

  @Get('reportes/terapia-fisica/semestral/pdf')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Descargar el informe semestral de Terapia Física (PDF A4 apaisado)' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Archivo PDF', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  async pdf(@Query() query: ReporteSemestralQueryDto, @Res() res: ExpressResponse): Promise<void> {
    await this.service.generarPdf(query, res);
  }
}
