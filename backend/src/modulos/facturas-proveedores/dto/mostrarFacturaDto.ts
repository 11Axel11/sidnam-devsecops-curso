import { Expose, Transform, Type } from "class-transformer";
import { MostrarProveedoresFacturas } from "./mostrarProveedorEnFacturaDto";
import { SedeEnum } from "src/common/enums/sede.enum";

export class MostrarFacturaDto{

    @Expose()
    id_factura: number;

    @Expose()
    sede: SedeEnum;

    @Expose()
    numero_factura: number;

    @Expose()
    @Transform(({ value }) => {
        const d = value.getDate().toString().padStart(2, '0');
        const m = (value.getMonth() + 1).toString().padStart(2, '0');
        const y = value.getFullYear().toString().slice(-2);
        return `${d}-${m}-${y}`;
    })
    fecha_emitida: string;

    @Expose()
    @Transform(({ value }) => {
        const d = value.getDate().toString().padStart(2, '0');
        const m = (value.getMonth() + 1).toString().padStart(2, '0');
        const y = value.getFullYear().toString().slice(-2);
        return `${d}-${m}-${y}`;
    })
    fecha_pago: string;

    // Fecha en que se pagó realmente (dd-mm-yy); null mientras esté pendiente.
    // `fecha_pago` de arriba es la fecha LÍMITE de pago.
    @Expose()
    @Transform(({ value }) => {
        if (!value) return null;
        const d = value.getDate().toString().padStart(2, '0');
        const m = (value.getMonth() + 1).toString().padStart(2, '0');
        const y = value.getFullYear().toString().slice(-2);
        return `${d}-${m}-${y}`;
    })
    fecha_pagada: string | null;

    @Expose()
    monto: number;

    @Expose()
    estado: 'pagada' | 'pendiente'

    @Expose()
    @Type(() => MostrarProveedoresFacturas)
    proveedor: MostrarProveedoresFacturas;

}