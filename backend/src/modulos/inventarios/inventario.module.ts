import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './services/inventario.service';
import { InventarioController } from './controllers/inventario.controller';
import { Producto } from './entities/producto.entity';
import { CreateProductoUseCase } from './use-cases/producto/create-producto.use-case';
import { GetProductosUseCase } from './use-cases/producto/get-producto.use-case';
import { UpdateProductoUseCase } from './use-cases/producto/update-producto.use-case';
import { GetInventarioUseCase } from './use-cases/inventario/get-inventario.use-case';
import { Inventario } from './entities/inventario.entity';
import { Entrada } from './entities/entrada.entity';
import { Salida } from './entities/salida.entity';
import { CreateEntradaUseCase } from './use-cases/entrada/create-entrada.use-case';
import { Unidad_Medida } from '../unidades-medida/entities/unidadMedida.entity';
import { GetEntradaUseCase } from './use-cases/entrada/get-entrada.use-case';
import { CreateSalidaUseCase } from './use-cases/salida/create-salida.use-case';
import { GetSalidaUseCase } from './use-cases/salida/get-salida.use-case';
import { ReportesInventarioService } from './services/reporteInventario.service';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { Subcategoria_Producto } from './entities/subCategoriaProducto.entity';
import { SubcategoriaUseCase } from './use-cases/subCategoria/subCategoria.use-case';
import { EntradaMedicamento } from './entities/entradaMedicamento.entity';
import { CreateEntradaMedicamentoUseCase } from './use-cases/entradaMedicamentos/create-entradaMedicamento.use-case';
import { GetEntradaMedicamentoUseCase } from './use-cases/entradaMedicamentos/get-entradaMedicamento.use-case';
import { ReporteEntradaMedicamentoService } from './services/reporteEntradaMedicamentos.service';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { PermisosInventarioService } from './services/permisosInventario.service';
import { ListarCategoriasSedeUseCase } from './use-cases/categoria/listar-categorias-sede.use-case';
import { ListarExistenciasUseCase } from './use-cases/existencia/listar-existencias.use-case';
import { DetalleExistenciaUseCase } from './use-cases/existencia/detalle-existencia.use-case';
import { CrearExistenciaUseCase } from './use-cases/existencia/crear-existencia.use-case';
import { ArchivarExistenciaUseCase } from './use-cases/existencia/archivar-existencia.use-case';
import { RegistrarEntradaExistenciaUseCase } from './use-cases/movimiento/registrar-entrada-existencia.use-case';
import { ListarEntradasExistenciaUseCase } from './use-cases/movimiento/listar-entradas-existencia.use-case';
import { RegistrarSalidaExistenciaUseCase } from './use-cases/movimiento/registrar-salida-existencia.use-case';
import { ListarSalidasExistenciaUseCase } from './use-cases/movimiento/listar-salidas-existencia.use-case';



@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, Inventario, Entrada, Salida, Unidad_Medida, Subcategoria_Producto, EntradaMedicamento, RolPermisoAccion, RolUsuario]),
    ],
  providers: [
    InventarioService, CreateProductoUseCase, GetProductosUseCase, UpdateProductoUseCase, GetInventarioUseCase, CreateEntradaUseCase, GetEntradaUseCase, CreateSalidaUseCase, GetSalidaUseCase, ReportesInventarioService, PdfHtmlService, SubcategoriaUseCase, CreateEntradaMedicamentoUseCase, GetEntradaMedicamentoUseCase, ReporteEntradaMedicamentoService,
    // Bloque A.1.6/A.1.7 (inventario/facturación CECUIDAM):
    PermisosInventarioService,
    ListarCategoriasSedeUseCase,
    ListarExistenciasUseCase,
    DetalleExistenciaUseCase,
    CrearExistenciaUseCase,
    ArchivarExistenciaUseCase,
    RegistrarEntradaExistenciaUseCase,
    ListarEntradasExistenciaUseCase,
    RegistrarSalidaExistenciaUseCase,
    ListarSalidasExistenciaUseCase,
  ],
  controllers: [InventarioController]
})
export class InventarioModule {}