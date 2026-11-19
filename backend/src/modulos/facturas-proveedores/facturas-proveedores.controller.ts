import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { FacturasProveedoresService } from './facturas-proveedores.service';
import { CreateAreaDto } from './dto/createAreaDto';
import { CreateProveedor } from './dto/createProveedorDto';
import { CreateFacturaDto } from './dto/createFacturaDto';
import { ActualizarFacturaDto } from './dto/actualizarFacturaDto';
import { MarcarFacturaPagadaDto } from './dto/marcarFacturaPagadaDto';
import { ReporteFacturaService } from './reporte/reporteFacturas.service';
import { Response as ExpressResponse } from 'express';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiQuery } from '@nestjs/swagger';
import { UpdateProveedorDto } from './dto/updateProveedorDto';
import { AuthGuard } from '../autenticacion/guard/auth.guard';
import { RolesAccionesGuard } from '../autenticacion/guard/actions.guard';
import { SeccionGuard } from '../autenticacion/guard/seccion.guard';
import { AccionRequerida } from '../autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from '../autenticacion/decorators/seccionRequerida.decorator';
import { SedeEnum } from 'src/common/enums/sede.enum';



@UseGuards(AuthGuard)
@Controller('facturas-proveedores')
export class FacturasProveedoresController {


    constructor(
        private readonly facturasproveedoresService: FacturasProveedoresService,
        private readonly reporteFacturaService: ReporteFacturaService,
    ){}

    @Post('areas')
    createAreas(@Body() createArea: CreateAreaDto){
        return this.facturasproveedoresService.createArea(createArea)
    }

    @Get('areas')
    getAreas(){
        return this.facturasproveedoresService.getAreas()
    }

    @Get('areas/id/:id_area')
    getAreasById(@Param('id_area', ParseIntPipe) id_area: number){
        return this.facturasproveedoresService.getAreaByID(id_area)
    }

    @Get('areas/activas')
    getAreasActivas(@Query('page') page?: number, @Query('limit') limit?: number){
        return this.facturasproveedoresService.getAreasActivas(page, limit)
    }

    @Post('proveedores')
    createProveedores(@Body() createProveedor: CreateProveedor){
        return this.facturasproveedoresService.createProveedor(createProveedor)
    }

    @Get('proveedores')
    getProveedores(){
        return this.facturasproveedoresService.getProveedores()
    }

    @Get('proveedores/filtrar-nombre')
    getProveedoresPorNombre(@Query('filtro') filtro: string) {
        return this.facturasproveedoresService.buscarProveedoresPorNombre(filtro);
    }

    @Get('proveedores/area/:idArea')
    getProveedoresPorArea(@Param('idArea', ParseIntPipe) idArea: number){
        return this.facturasproveedoresService.getProveedoresPorArea(idArea)
    }

    @Get('proveedores/activos')
    getProveedoresActivos(){
        return this.facturasproveedoresService.getProveedoresActivos()
    }

    // Requiere 'Crear' en la sección Facturas Proveduría
    @Post('facturas')
    @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
    @AccionRequerida('Crear')
    @SeccionRequerida('Facturas Proveduría')
    createFactura(@Body() createFactura: CreateFacturaDto){
        return this.facturasproveedoresService.createFactura(createFactura)
    }

    @Get('facturas/proveedor/:idProveedor')
    getFacturasPorProveedor(@Param('idProveedor', ParseIntPipe) idProveedor: number, @Query('page') page?: number, @Query('limit') limit?: number,) {
        return this.facturasproveedoresService.getFacturasPorProveedor(idProveedor, page, limit);
    }

    @Get('facturas/numero/:numeroFactura')
    getFacturaPorNumero(@Param('numeroFactura') numeroFactura: string) {
    return this.facturasproveedoresService.getFacturasPorNumero(numeroFactura);
    }

    @Get('facturas/estados')
    getEstadosFacturas(){
        return this.facturasproveedoresService.getEstadosFacturas()
    }

    @Get('facturas/estados/:idEstadoFactura')
    getFacturasPorEstado(@Param('idEstadoFactura', ParseIntPipe) idEstadoFactura: number, @Query('page') page?: number, @Query('limit') limit?: number,){
        return this.facturasproveedoresService.getFacturasPorEstado(idEstadoFactura, page, limit)
    }

    @Patch('facturas/:idFactura')
    actualizarFactura(@Param('idFactura', ParseIntPipe) idFactura: number, @Body() actualizarFactura: ActualizarFacturaDto){
        return this.facturasproveedoresService.actualizarFactura(idFactura, actualizarFactura)
    }

    @Patch('facturas/estado/:id')
    async actualizarEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: MarcarFacturaPagadaDto) {
       return this.facturasproveedoresService.actualizarEstadoFactura(id, dto?.fecha_pagada);
    }

    @Patch('proveedor/handleArchivado/:id')
    async handleArchivado(@Param('id', ParseIntPipe) id: number) {
       return this.facturasproveedoresService.toggleArchivadoProveedor(id);
    }

    @Get('proveedores/archivados/:id')
    getArchivados(@Param('id', ParseIntPipe) id: number) {
       return this.facturasproveedoresService.getProveedoresArchivados(id);
    }

    @Get('reportes/pdf')
    @ApiOperation({ summary: 'Descargar PDF de facturas por mes/año, estado y sede' })
    @ApiProduces('application/pdf')
    @ApiOkResponse({
      description: 'Archivo PDF',
      content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    })
    @ApiQuery({ name: 'mes', required: true, type: Number, description: '1-12' })
    @ApiQuery({ name: 'anio', required: true, type: Number })
    @ApiQuery({ name: 'estado', required: true, type: Number, description: '0 = todas, 1 = pagadas, 2 = pendientes' })
    @ApiQuery({ name: 'sede', required: false, enum: SedeEnum, description: 'Sin sede = ambas sedes' })
     async reporteFacturasPdf(
      @Query('anio') anio: number,
      @Query('mes') mes: number,
      @Query('estado') estado: number,
      @Res() res: ExpressResponse,
      @Query('sede') sede?: SedeEnum,
    ) {
      if (sede && !Object.values(SedeEnum).includes(sede)) {
        throw new BadRequestException(`Sede inválida: ${sede}`);
      }
      await this.reporteFacturaService.generarReporteFacturas(Number(anio), Number(mes), Number(estado), sede, res);
    }


  @Patch('proveedores/:idProveedor')
  @ApiOkResponse({ description: 'Proveedor actualizado correctamente' })
   async updateProveedor(@Param('idProveedor', ParseIntPipe) id: number,@Body() dto: UpdateProveedorDto) {
     return this.facturasproveedoresService.updateProveedor(id, dto);
  }

    // Requiere 'Ver' en la sección Facturas Proveduría — el mismo para ambas sedes. `sede`
    // es un filtro opcional: sin ella se listan las facturas de ambas sedes.
    @Get('facturas')
    @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
    @AccionRequerida('Ver')
    @SeccionRequerida('Facturas Proveduría')
    async getFacturas(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('estado', ParseIntPipe) estado?: number,
        @Query('sede') sede?: SedeEnum,
        @Query('proveedorId') proveedorId?: number,
    ) {
        if (sede && !Object.values(SedeEnum).includes(sede)) {
            throw new BadRequestException(`Sede inválida: ${sede}`);
        }

        return this.facturasproveedoresService.getFacturas(
            page,
            limit,
            estado,
            sede,
            proveedorId,
        );
    }

    // Requiere 'Ver' en la sección Facturas Proveduría
    @Get('facturas/:id/pdf')
    @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
    @AccionRequerida('Ver')
    @SeccionRequerida('Facturas Proveduría')
    @ApiOperation({ summary: 'Descargar PDF de una factura individual' })
    @ApiProduces('application/pdf')
    @ApiOkResponse({
      description: 'Archivo PDF',
      content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    })
    async getFacturaPdf(@Param('id', ParseIntPipe) id: number, @Res() res: ExpressResponse) {
        await this.reporteFacturaService.generarPdfFacturaIndividual(id, res);
    }
}


