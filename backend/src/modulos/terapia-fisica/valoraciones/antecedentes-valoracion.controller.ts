import { Body, Controller, HttpCode, Param, ParseIntPipe, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import { AntecedentePersonalDetalle, AntecedenteTraumaticoDetalle } from './antecedentes.lectura';
import { AntecedentesValoracionService } from './antecedentes-valoracion.service';
import {
  ActualizarAntecedenteTraumaticoDto,
  CrearAntecedenteTraumaticoDto,
  RegistrarAntecedentesPersonalesDto,
} from './dto/antecedentes.dto';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Antecedentes personales y traumáticos de la valoración fisioterapéutica
 * (B.1.4). Sección única «TerapiaFisica»; POST = Crear; PATCH (corregir/anular)
 * = Actualizar. Solo con la valoración en borrador (409 si no). NO hay DELETE:
 * un traumático se retira con `PATCH /:id/anular`.
 */
@ApiTags('Terapia Física · Antecedentes de la valoración')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class AntecedentesValoracionController {
  constructor(private readonly service: AntecedentesValoracionService) {}

  // 200 y no 201: es un upsert idempotente, no siempre crea.
  @Post('valoraciones-fisioterapeuticas/:id/antecedentes-personales')
  @HttpCode(200)
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Upsert del estado (presente / descartado) de ítems del catálogo de antecedentes personales' })
  registrarPersonales(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarAntecedentesPersonalesDto,
    @Req() req: ReqConUsuario,
  ): Promise<AntecedentePersonalDetalle[]> {
    return this.service.registrarPersonales(id, dto, req.user.id);
  }

  @Post('valoraciones-fisioterapeuticas/:id/antecedentes-traumaticos')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Agrega un antecedente traumático (registro independiente)' })
  crearTraumatico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearAntecedenteTraumaticoDto,
    @Req() req: ReqConUsuario,
  ): Promise<AntecedenteTraumaticoDetalle> {
    return this.service.crearTraumatico(id, dto, req.user.id);
  }

  @Patch('antecedentes-traumaticos/:id')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Corrige un antecedente traumático (valoración en borrador)' })
  actualizarTraumatico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAntecedenteTraumaticoDto,
    @Req() req: ReqConUsuario,
  ): Promise<AntecedenteTraumaticoDetalle> {
    return this.service.actualizarTraumatico(id, dto, req.user.id);
  }

  @Patch('antecedentes-traumaticos/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Retira un antecedente traumático con justificación (sin DELETE)' })
  anularTraumatico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<AntecedenteTraumaticoDetalle> {
    return this.service.anularTraumatico(id, dto.motivo, req.user.id);
  }
}
