import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { FechaPagoFacturaValida } from "src/common/validators/fecha-pago-factura.validator";
import { SedeEnum } from "src/common/enums/sede.enum";

// Nota de nombres (Bloque A.1.8): se mantienen los nombres de propiedad
// existentes (proveedor_id, fecha_emision, numero_factura) en vez de los
// del ejemplo de la tarea (proveedorIdProveedor, fechaEmitida,
// numeroFactura) para no romper el contrato de este endpoint ya existente
// y en uso — solo se agrega `sede`, que es el campo nuevo.
@FechaPagoFacturaValida()
export class CreateFacturaDto {


    @IsNotEmpty()
    @IsNumber()
    proveedor_id: number;

    @IsNotEmpty()
    @IsNumber()
    numero_factura: number;

    @IsNotEmpty()
    @IsString()
    fecha_emision: string;

    @IsNotEmpty()
    @IsString()
    fecha_pago: string;

    @IsNotEmpty()
    @IsNumber()
    monto: number;

    @IsNotEmpty()
    @IsEnum(SedeEnum)
    sede: SedeEnum;
}