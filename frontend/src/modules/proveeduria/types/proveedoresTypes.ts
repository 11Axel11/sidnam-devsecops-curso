import type { AreaProveedor, Factura } from "../models/proveedores"

export type CardAreaProveedorProps = {
    area: AreaProveedor,
    clickAction: (id:string) => void;
}

export type TablaProveedoresProps = {
  idArea: string;
};


export type TablaFacturasProps = {
  idProveedor?: string; 
  facturas?: Factura[]; 
  totalOverride?: number;
  pageIndexExternal?: number;
  pageSizeExternal?: number;
  onPageIndexChange?: React.Dispatch<React.SetStateAction<number>>;
  onPageSizeChange?: React.Dispatch<React.SetStateAction<number>>;
  toolbar?: React.ReactElement | null;
  mostrarSedeProveedor?: boolean;
};

export type FormEditarFacturaProps = {
  idFactura: number;
  initial: {
    proveedor_id?: string | null;
    numero_factura?: number | null;
    fecha_emitida?: string | null;
    fecha_pago?: string | null;
    monto?: number | null;
  };
  onSuccess?: () => void;
};

export type FormEditarProveedorProps = {
  idProveedor: number;
  initial: {
    nombre?: string | null;
    numero?: number | null;
    direccion?: string | null;
    correo?: string | null;
  };
  onSuccess?: () => void;
};