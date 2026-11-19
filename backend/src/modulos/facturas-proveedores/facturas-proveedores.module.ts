import { Module } from '@nestjs/common';
import { FacturasProveedoresController } from './facturas-proveedores.controller';
import { FacturasProveedoresService } from './facturas-proveedores.service';
import { Type } from 'class-transformer';
import { Area } from './entities/area.entity';
import { Proveedor } from './entities/proveedor.entity';
import { Factura } from './entities/factura.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReporteFacturaService } from './reporte/reporteFacturas.service';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';

@Module({
  imports: [
    // RolPermisoAccion/RolUsuario: los necesitan RolesAccionesGuard/SeccionGuard
    // (mismo patrón que ResidentesModule).
    TypeOrmModule.forFeature([Factura, Proveedor, Area, RolPermisoAccion, RolUsuario]),
  ],
  controllers: [FacturasProveedoresController],
  providers: [FacturasProveedoresService, ReporteFacturaService, PdfHtmlService]
})
export class FacturasProveedoresModule {}
