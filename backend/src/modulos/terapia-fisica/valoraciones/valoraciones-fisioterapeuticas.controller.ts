import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import {
  ActualizarValoracionFisioterapeuticaDto,
  CrearValoracionFisioterapeuticaDto,
} from './dto/valoracion-fisioterapeutica.dto';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';
import { ValoracionFisioterapeuticaDetalle } from './antecedentes.lectura';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Valoración fisioterapéutica (B.1.3). Sección única «TerapiaFisica» (RF-TR-02);
 * verbos del catálogo existente: Ver / Crear / Actualizar. `confirmar` y
 * `anular` se mapean a Actualizar (decisión del 14/10/2026). NO hay DELETE.
 */
@ApiTags('Terapia Física · Valoración fisioterapéutica')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class ValoracionesFisioterapeuticasController {
  constructor(private readonly service: ValoracionesFisioterapeuticasService) {}

  @Get('expedientes/:expedienteId/valoraciones-fisioterapeuticas')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Historial completo del expediente (RN-03)' })
  listar(@Param('expedienteId', ParseIntPipe) expedienteId: number): Promise<ValoracionFisioterapeutica[]> {
    return this.service.listar(expedienteId);
  }

  // Ruta fija declarada antes que cualquier ':id' para que no se confunda con un parámetro.
  @Get('expedientes/:expedienteId/valoraciones-fisioterapeuticas/vigente')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Solo la valoración vigente, con sus antecedentes (404 si no hay)' })
  vigente(@Param('expedienteId', ParseIntPipe) expedienteId: number): Promise<ValoracionFisioterapeuticaDetalle> {
    return this.service.obtenerVigente(expedienteId);
  }

  @Get('valoraciones-fisioterapeuticas/:id')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Detalle de una valoración con sus antecedentes personales y traumáticos (no anulados)' })
  detalle(@Param('id', ParseIntPipe) id: number): Promise<ValoracionFisioterapeuticaDetalle> {
    return this.service.obtenerDetalle(id);
  }

  @Post('expedientes/:expedienteId/valoraciones-fisioterapeuticas')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Crea una valoración en BORRADOR (guardado parcial permitido)' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearValoracionFisioterapeuticaDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionFisioterapeutica> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('valoraciones-fisioterapeuticas/:id')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Edita una valoración, solo mientras esté en borrador' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarValoracionFisioterapeuticaDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionFisioterapeutica> {
    return this.service.actualizar(id, dto, req.user.id);
  }

  @Patch('valoraciones-fisioterapeuticas/:id/confirmar')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'borrador → vigente; la vigente anterior pasa a reemplazada (misma transacción)' })
  confirmar(@Param('id', ParseIntPipe) id: number, @Req() req: ReqConUsuario): Promise<ValoracionFisioterapeutica> {
    return this.service.confirmar(id, req.user.id);
  }

  @Patch('valoraciones-fisioterapeuticas/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula la valoración con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionFisioterapeutica> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
