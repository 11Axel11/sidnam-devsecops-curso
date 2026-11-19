import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import {
  ActualizarValoracionNutricionalDto,
  CrearValoracionNutricionalDto,
} from './dto/valoracion-nutricional.dto';
import { ValoracionNutricionalDetalle } from './nutricion.lectura';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Valoración nutricional (B.1.11). Sección única «Nutricion» (RF-TR-02); verbos del catálogo
 * existente: Ver / Crear / Actualizar. `confirmar` y `anular` se mapean a Actualizar. NO hay DELETE.
 * Mismo contrato que la valoración fisioterapéutica.
 */
@ApiTags('Nutrición · Valoración nutricional')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.NUTRICION)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class ValoracionesNutricionalesController {
  constructor(private readonly service: ValoracionesNutricionalesService) {}

  @Get('expedientes/:expedienteId/valoraciones-nutricionales')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Historial completo del expediente, solo cabeceras (RN-03)' })
  listar(@Param('expedienteId', ParseIntPipe) expedienteId: number): Promise<ValoracionNutricional[]> {
    return this.service.listar(expedienteId);
  }

  // Ruta fija declarada antes que cualquier ':id' para que no se confunda con un parámetro.
  @Get('expedientes/:expedienteId/valoraciones-nutricionales/vigente')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Solo la valoración vigente, con el dato funcional resuelto (404 si no hay)' })
  vigente(@Param('expedienteId', ParseIntPipe) expedienteId: number): Promise<ValoracionNutricionalDetalle> {
    return this.service.obtenerVigente(expedienteId);
  }

  @Get('valoraciones-nutricionales/:id')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Detalle de una valoración con el dato funcional resuelto' })
  detalle(@Param('id', ParseIntPipe) id: number): Promise<ValoracionNutricionalDetalle> {
    return this.service.obtenerDetalle(id);
  }

  @Post('expedientes/:expedienteId/valoraciones-nutricionales')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Crea una valoración en BORRADOR (guardado parcial permitido)' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearValoracionNutricionalDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionNutricional> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('valoraciones-nutricionales/:id')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Edita una valoración, solo mientras esté en borrador' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarValoracionNutricionalDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionNutricional> {
    return this.service.actualizar(id, dto, req.user.id);
  }

  @Patch('valoraciones-nutricionales/:id/confirmar')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'borrador → vigente; la vigente anterior pasa a reemplazada (misma transacción)' })
  confirmar(@Param('id', ParseIntPipe) id: number, @Req() req: ReqConUsuario): Promise<ValoracionNutricional> {
    return this.service.confirmar(id, req.user.id);
  }

  @Patch('valoraciones-nutricionales/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula la valoración con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<ValoracionNutricional> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
