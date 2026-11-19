import { Body, Controller, DefaultValuePipe, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { InventarioService } from "../services/inventario.service";
import { CreateProductoUseCase } from "../use-cases/producto/create-producto.use-case";
import { ProductoDto } from "../dto/crearProductoDto";
import { GetProductosUseCase } from "../use-cases/producto/get-producto.use-case";
import { UpdateProductoUseCase } from "../use-cases/producto/update-producto.use-case";
import { GetInventarioUseCase } from "../use-cases/inventario/get-inventario.use-case";
import { PatchEditarInventarioDto } from "../dto/actualizarInventarioDto";
import { CrearEntradaDto } from "../dto/crearEntradaDto";
import { CreateEntradaUseCase } from "../use-cases/entrada/create-entrada.use-case";
import { GetEntradaUseCase } from "../use-cases/entrada/get-entrada.use-case";
import { CrearSalidaDto } from "../dto/crearSalidaDto";
import { CreateSalidaUseCase } from "../use-cases/salida/create-salida.use-case";
import { GetSalidaUseCase } from "../use-cases/salida/get-salida.use-case";
import { ReportesInventarioService } from "../services/reporteInventario.service";
import { ReporteMovimientosDto } from "../dto/reporteMovimientosDto";
import { ApiOkResponse, ApiOperation, ApiProduces, ApiQuery } from "@nestjs/swagger";
import { SubcategoriaUseCase } from "../use-cases/subCategoria/subCategoria.use-case";
import { CrearSubcategoriaDto } from "../dto/crearSubCategoriaDto";
import { CrearEntradaMedicamentoDto } from "../dto/crearEntradaMedicamentosDto";
import { CreateEntradaMedicamentoUseCase } from "../use-cases/entradaMedicamentos/create-entradaMedicamento.use-case";
import { GetEntradaMedicamentoUseCase } from "../use-cases/entradaMedicamentos/get-entradaMedicamento.use-case";
import { ReporteEntradaMedicamentoService } from "../services/reporteEntradaMedicamentos.service";
import { AuthGuard } from "src/modulos/autenticacion/guard/auth.guard";
import { RolesAccionesGuard } from "src/modulos/autenticacion/guard/actions.guard";
import { SeccionGuard } from "src/modulos/autenticacion/guard/seccion.guard";
import { PermisosInventarioService, SECCION_SALIDAS } from "../services/permisosInventario.service";
import { getCategoriasId } from "src/common/enums/categoriasPrincipalesProductos.enum";
import { AccionRequerida } from "src/modulos/autenticacion/decorators/roles.decorator";
import { SeccionRequerida } from "src/modulos/autenticacion/decorators/seccionRequerida.decorator";
import { ListarCategoriasSedeUseCase } from "../use-cases/categoria/listar-categorias-sede.use-case";
import { ListarExistenciasUseCase } from "../use-cases/existencia/listar-existencias.use-case";
import { ListarExistenciasDto } from "../dto/listarExistenciasDto";
import { DetalleExistenciaUseCase } from "../use-cases/existencia/detalle-existencia.use-case";
import { CrearExistenciaUseCase } from "../use-cases/existencia/crear-existencia.use-case";
import { CrearExistenciaDto } from "../dto/crearExistenciaDto";
import { ArchivarExistenciaUseCase } from "../use-cases/existencia/archivar-existencia.use-case";
import { ArchivarExistenciaDto } from "../dto/archivarExistenciaDto";
import { RegistrarEntradaExistenciaUseCase } from "../use-cases/movimiento/registrar-entrada-existencia.use-case";
import { RegistrarEntradaExistenciaDto } from "../dto/registrarEntradaExistenciaDto";
import { ListarEntradasExistenciaUseCase } from "../use-cases/movimiento/listar-entradas-existencia.use-case";
import { RegistrarSalidaExistenciaUseCase } from "../use-cases/movimiento/registrar-salida-existencia.use-case";
import { RegistrarSalidaExistenciaDto } from "../dto/registrarSalidaExistenciaDto";
import { ListarSalidasExistenciaUseCase } from "../use-cases/movimiento/listar-salidas-existencia.use-case";
import { SedeEnum } from "src/common/enums/sede.enum";


@UseGuards(AuthGuard)
@Controller('inventario')
export class InventarioController {

    constructor(

        private readonly inventarioService: InventarioService,
        private readonly createProductoUseCase: CreateProductoUseCase,
        private readonly getProductoUseCase: GetProductosUseCase,
        private readonly updateProductosUseCase: UpdateProductoUseCase,
        private readonly getInventarioUseCase: GetInventarioUseCase,
        private readonly createEntradaUseCase: CreateEntradaUseCase,
        private readonly getEntradaUseCase: GetEntradaUseCase,
        private readonly createSalidaUseCase: CreateSalidaUseCase,
        private readonly getSalidasUsecase: GetSalidaUseCase,
        private readonly reporteInventarioService: ReportesInventarioService,
        private readonly subCategoriasUseCase: SubcategoriaUseCase,
        private readonly createEntradaMedicamentosUseCase: CreateEntradaMedicamentoUseCase,
        private readonly getEntradaMedicamentoUseCase: GetEntradaMedicamentoUseCase,
        private readonly reporteEntradaMedicamentoService: ReporteEntradaMedicamentoService,
        // Bloque A.1.6/A.1.7 (inventario/facturación CECUIDAM):
        private readonly listarCategoriasSedeUseCase: ListarCategoriasSedeUseCase,
        private readonly listarExistenciasUseCase: ListarExistenciasUseCase,
        private readonly detalleExistenciaUseCase: DetalleExistenciaUseCase,
        private readonly crearExistenciaUseCase: CrearExistenciaUseCase,
        private readonly archivarExistenciaUseCase: ArchivarExistenciaUseCase,
        private readonly registrarEntradaExistenciaUseCase: RegistrarEntradaExistenciaUseCase,
        private readonly listarEntradasExistenciaUseCase: ListarEntradasExistenciaUseCase,
        private readonly registrarSalidaExistenciaUseCase: RegistrarSalidaExistenciaUseCase,
        private readonly listarSalidasExistenciaUseCase: ListarSalidasExistenciaUseCase,
        private readonly permisos: PermisosInventarioService,

    ){}

    // ── Bloque A.1.6/A.1.7 (inventario/facturación CECUIDAM) ──────────────
    // NOTA DE ROUTING: `GET /inventario/categorias` reemplaza a la antigua
    // `GET /inventario` (bare) — se movió porque el bare `GET /inventario`
    // ahora es el listado de existencias que pide esta tarea. Es un cambio
    // de ruta que rompe a quien llamara `GET /inventario` esperando
    // categorías; hace falta coordinar con el frontend.

    // PERMISOS (los mismos que ya existian para Hogar; la sede NO interviene):
    // la seccion sale de la categoria REAL del producto (Alimentos / Limpieza /
    // Medicamentos), igual que en la UI. Salidas usa la seccion 'Salidas'.
    // Ver PermisosInventarioService.

    // Ver en alguna de las secciones de categoria.
    @Get('categorias')
    async getCategoriasPorSede(@Req() req: ExpressRequest & { user: any }, @Query('sede') sede?: SedeEnum) {
        await this.exigirVerAlgunaCategoria(req);
        return this.listarCategoriasSedeUseCase.listar(sede);
    }

    // Ver sobre la categoria pedida; sin categoria, solo se listan las
    // categorias sobre las que el rol puede Ver. `sede` obligatoria (400 si falta).
    @Get()
    async listarExistencias(@Query() dto: ListarExistenciasDto, @Req() req: ExpressRequest & { user: any }) {
        if (dto.categoria !== undefined) {
            const tipo = getCategoriasId(dto.categoria);
            if (tipo) await this.permisos.exigirCategoria(req.user.roleId, tipo, ['Ver']);
            return this.listarExistenciasUseCase.listar(dto);
        }
        const permitidas = await this.exigirVerAlgunaCategoria(req);
        return this.listarExistenciasUseCase.listar(dto, permitidas);
    }

    // Crear sobre la categoria REAL del producto (se verifica dentro de la
    // transaccion, con el producto ya resuelto por id o por codigo).
    @Post()
    async crearExistencia(@Body() dto: CrearExistenciaDto, @Req() req: ExpressRequest & { user: any }) {
        return this.crearExistenciaUseCase.crear(dto, (cat) =>
            this.permisos.exigirCategoria(req.user.roleId, cat, ['Crear']),
        );
    }

    // Archivar: Actualizar o Eliminar sobre la categoria del producto.
    @Patch(':id/archivar')
    async archivarExistencia(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ArchivarExistenciaDto,
        @Req() req: ExpressRequest & { user: any },
    ) {
        await this.permisos.exigirParaExistencia(req.user.roleId, id, ['Actualizar', 'Eliminar']);
        return this.archivarExistenciaUseCase.archivar(id, dto.archivado);
    }

    // Registrar entrada: Crear sobre la categoria. usuarioResponsableId/
    // fechaRegistro se completan desde request.user, nunca desde el body.
    @Post(':inventarioId/entradas')
    async registrarEntradaExistencia(
        @Param('inventarioId', ParseIntPipe) inventarioId: number,
        @Body() dto: RegistrarEntradaExistenciaDto,
        @Req() req: ExpressRequest & { user: any },
    ) {
        await this.permisos.exigirParaExistencia(req.user.roleId, inventarioId, ['Crear']);
        return this.registrarEntradaExistenciaUseCase.registrar(inventarioId, dto, req.user.id);
    }

    // Historial de entradas: Ver sobre la categoria.
    @Get(':inventarioId/entradas')
    async listarEntradasExistencia(
        @Param('inventarioId', ParseIntPipe) inventarioId: number,
        @Req() req: ExpressRequest & { user: any },
        @Query('mes') mes?: string,
    ) {
        await this.permisos.exigirParaExistencia(req.user.roleId, inventarioId, ['Ver']);
        return this.listarEntradasExistenciaUseCase.listar(inventarioId, mes);
    }

    // Registrar salida: 'Actualizar' en la seccion Salidas (misma regla que la
    // pantalla de Salidas de Hogar).
    @Post(':inventarioId/salidas')
    @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
    @AccionRequerida('Actualizar')
    @SeccionRequerida(SECCION_SALIDAS)
    async registrarSalidaExistencia(
        @Param('inventarioId', ParseIntPipe) inventarioId: number,
        @Body() dto: RegistrarSalidaExistenciaDto,
        @Req() req: ExpressRequest & { user: any },
    ) {
        return this.registrarSalidaExistenciaUseCase.registrar(inventarioId, dto, req.user.id);
    }

    // Historial de salidas: Ver en la seccion Salidas o en la categoria del producto.
    @Get(':inventarioId/salidas')
    async listarSalidasExistencia(
        @Param('inventarioId', ParseIntPipe) inventarioId: number,
        @Req() req: ExpressRequest & { user: any },
        @Query('mes') mes?: string,
    ) {
        await this.permisos.exigirParaExistencia(req.user.roleId, inventarioId, ['Ver'], [SECCION_SALIDAS]);
        return this.listarSalidasExistenciaUseCase.listar(inventarioId, mes);
    }

    // Ver sobre al menos una categoria; devuelve las categorias permitidas.
    private async exigirVerAlgunaCategoria(req: ExpressRequest & { user: any }) {
        const permitidas = await this.permisos.categoriasPermitidas(req.user.roleId, ['Ver']);
        if (permitidas.length === 0) {
            throw new ForbiddenException('No tienes permiso para ver inventario');
        }
        return permitidas;
    }
    // ── fin Bloque A.1.6/A.1.7 ──────────────────────────────────────────


    //Crear una subcategoria.
    @Post('subCategoria')
    crearSubCategoria(@Body() subCategoria: CrearSubcategoriaDto) {
      return this.subCategoriasUseCase.crearSubCategoria(subCategoria);
   }

   //Ver las subcategorias existentes.
    @Get('subcategorias')
    GetAllSubCategorias() {
      return this.subCategoriasUseCase.getAllSubCategorias();
   }

   //Crear un producto, crea un inventario asociado automaticamente (sede hogar).
   // Legacy: delega en el mismo use-case que POST /inventario. Exige Crear sobre
   // la categoria REAL del producto, igual que en Hogar.
    @Post('productos')
    crearProducto(@Body() Producto: ProductoDto, @Req() req: ExpressRequest & { user: any }){
        return this.createProductoUseCase.crearProducto(Producto, (cat) =>
            this.permisos.exigirCategoria(req.user.roleId, cat, ['Crear']),
        )
    }

    //Este no se ocupa ya.
    //Ver los productos existentes.
    @Get('productos')
    findAllProductos() {
        return this.getProductoUseCase.findAllProductos();
    }
  
  
    //Updatear un inventario y toda la información del producto asociado.
    @Patch('update/:inventarioId')
    updateInventario(
      @Param('inventarioId', ParseIntPipe) inventarioId: number,
      @Body() dto: PatchEditarInventarioDto,
    ) {
      return this.updateProductosUseCase.updateInventario(inventarioId, dto);
   } 

    //Busca los inventarios de acuerdo a su categoria (alimentos, limpieza, medicamentos).
   @Get('categoria/:categoriaId')
   getInventarioPorCategoria(
     @Param('categoriaId', ParseIntPipe) categoriaId: number,
     @Query('page') page?: number,
     @Query('limit') limit?: number,
   ) {
     const p = page ? Number(page) : undefined;
     const l = limit ? Number(limit) : undefined;
     return this.getInventarioUseCase.findAllInventarios(categoriaId, p, l); 
  }


     //Archiva/Desarchiva un producto del inventario.
    @Patch('handleArchivado/:inventarioId')
      toggleArchivadoPorInventario(
      @Param('inventarioId', ParseIntPipe) inventarioId: number
    ) {
      return this.updateProductosUseCase.updateArchivadoProducto(inventarioId);
    }

    //Busca los archivados de x categoría.
    @Get('archivados/:categoriaId')
    findProductosArchivadosPorCategoria(
      @Param('categoriaId', ParseIntPipe) categoriaId: number,
      @Query('page',  new DefaultValuePipe(1), ParseIntPipe) page: number,   
      @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit: number, 
    ) {
     return this.getProductoUseCase.findByArchivadoYCategoria(true, categoriaId, page, limit);
   }

    //Busca los inventarios de acuerdo a su categoria (no paginado).(no archivados).
    @Get('categoria/:categoriaId/all')
    getInventariosPorCategoriaSinPaginacion(
       @Param('categoriaId', ParseIntPipe) categoriaId: number,
     ) {
        return this.getInventarioUseCase.findAllByCategoriaSinPaginacion(categoriaId);
     }

     //Entradas
     @Post('entrada')
     async crearEntradas(@Body() dto: CrearEntradaDto, @Req() req: ExpressRequest & { user: any }) {
        // Crear sobre la categoria de CADA existencia del lote.
        await this.permisos.exigirParaExistencias(req.user.roleId, (dto.productos ?? []).map((p) => p.inventarioId), ['Crear']);
        return this.createEntradaUseCase.crearEntradas(dto, req.user.id);
     }

     @Get('entradas/:anio/:mes/:categoriaId')
     getEntradasPorMes(
     @Param('anio', ParseIntPipe) anio: number,
     @Param('mes',  ParseIntPipe) mes: number,
     @Param('categoriaId', ParseIntPipe) categoriaId: number,        
     @Query('page',  new DefaultValuePipe(1), ParseIntPipe) page?: number,
     @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit?: number,
    ) {
       return this.getEntradaUseCase.getEntradasPorMes(mes, anio, categoriaId, page, limit);  
    }


     //Salidas
     @Post('salidas') 
     @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
     @AccionRequerida('Actualizar')
     @SeccionRequerida(SECCION_SALIDAS)
     crearSalidas(@Body() dto: CrearSalidaDto, @Req() req: ExpressRequest & { user: any }) {
        return this.createSalidaUseCase.crearSalidas(dto, req.user.id);
     }

     @Get('salidas/:anio/:mes/:categoriaId')
     getSalidasPorMes(
     @Param('anio', ParseIntPipe) anio: number,
     @Param('mes',  ParseIntPipe) mes: number,
     @Param('categoriaId', ParseIntPipe) categoriaId: number,       
     @Query('page',  new DefaultValuePipe(1), ParseIntPipe) page?: number,
     @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit?: number,
    ) {
      return this.getSalidasUsecase.getSalidasPorMes(mes, anio, categoriaId, page, limit); 
   }


     //reporte de entradas/salidas

     @Get('reportes/entradas/pdf')
     @ApiOperation({ summary: 'Descargar PDF de entradas por categoría/mes/año' })
     @ApiProduces('application/pdf')
     @ApiOkResponse({
     description: 'Archivo PDF',
     content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    })
    @ApiQuery({ name: 'categoriaId', required: true, type: Number })
    @ApiQuery({ name: 'mes', required: true, type: Number, description: '1-12' })
    @ApiQuery({ name: 'anio', required: true, type: Number })
      async reporteEntradasPdf(
      @Query() q: ReporteMovimientosDto,
      @Res() res: ExpressResponse
      ) {
         await this.reporteInventarioService.generarReporteEntradas(q, res);
      }

     @Get('reportes/salidas/pdf')
     @ApiOperation({ summary: 'Descargar PDF de salidas por categoría/mes/año' })
     @ApiProduces('application/pdf')
     @ApiOkResponse({
     description: 'Archivo PDF',
     content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
     })
     @ApiQuery({ name: 'categoriaId', required: true, type: Number })
     @ApiQuery({ name: 'mes', required: true, type: Number, description: '1-12' })
     @ApiQuery({ name: 'anio', required: true, type: Number })
       async reporteSalidasPdf(
       @Query() q: ReporteMovimientosDto,
       @Res() res: ExpressResponse
       ) {
         await this.reporteInventarioService.generarReporteSalidas(q, res);
       }

       //Página de salidas de la cocina.
       //Trae los productos por subcategorias de acuerdo a su id.
     @Get('subcategoria/:subcategoriaId')
     getPorSubcategoria(
     @Param('subcategoriaId', ParseIntPipe) subcategoriaId: number,
     ) {
       return this.getInventarioUseCase.findAllBySubcategoria(subcategoriaId);
    } 

    //Trae los productos sin importar su subcategoría.
    @Get('AllProductos/subCategorias')
    getTodos() {
      return this.getInventarioUseCase.findAllActivosConStock();
    }

    //Para crear una entrada de medicamentos.
    @Post('EntradaMedicamentos')
    crear(@Body() dto: CrearEntradaMedicamentoDto) {
      return this.createEntradaMedicamentosUseCase.crearEntradaMedicamento(dto);
    }

    //Para ver las entradas de medicamentos, paginado por mes y año.
    @Get('EntradaMedicamentos')
    getEntradasMedicamentos(
    @Query('anio') anio?: number,
    @Query('mes') mes?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit?: number,
    ) {
      return this.getEntradaMedicamentoUseCase.findAllEntradasMedicamentos({
      anio: anio ? Number(anio) : undefined,
      mes: mes ? Number(mes) : undefined,
      page,
      limit,
     });
    }

    //Descarga el reporte pdf de las entradas de medicamentos en el mes/año seleccionado.
    @Get('reportes/entrada-medicamentos/pdf')
    @ApiOperation({ summary: 'Descargar PDF de entradas de medicamentos por mes/año' })
    @ApiProduces('application/pdf')
    @ApiOkResponse({
    description: 'Archivo PDF',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    })
    @ApiQuery({ name: 'mes', required: true, type: Number, description: '1-12' })
    @ApiQuery({ name: 'anio', required: true, type: Number })
      async reporteEntradasMedicamentosPdf(
      @Query('anio') anio: number,
      @Query('mes') mes: number,
      @Res() res: ExpressResponse,
      ) {
       await this.reporteEntradaMedicamentoService.generarReporteEntradasMedicamentos(Number(anio), Number(mes), res);
      }

    // IMPORTANTE: esta ruta debe ser la ÚLTIMA ruta GET de un solo segmento
    // del controller (`:id` capturaría cualquier segmento literal como
    // 'categorias', 'subcategorias', 'productos', 'EntradaMedicamentos' si
    // se declarara antes que ellas — NestJS/Express matchea en orden de
    // declaración). No mover más arriba sin revisar esto.
    // Ver sobre la categoria del producto.
    @Get(':id')
    async detalleExistencia(@Param('id', ParseIntPipe) id: number, @Req() req: ExpressRequest & { user: any }) {
        await this.permisos.exigirParaExistencia(req.user.roleId, id, ['Ver']);
        return this.detalleExistenciaUseCase.obtener(id);
    }
}