import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BuscarFactura } from "../models/proveedores"
import { useNavigate } from "@tanstack/react-router";

type PrevFacturaProps ={
    factura: BuscarFactura;
}

const PrevFactura = ({ factura }: PrevFacturaProps) => {
    const navigate = useNavigate();

    const gotoProveedor = () => {

        navigate({
            to: "/proveeduria/$idAreaProv/$idProveedor",
            params: { 
                        idProveedor: factura.proveedor.id_proveedor, 
                        idAreaProv: factura.proveedor.area.id_area 
                    },
        });
    }

    const clickable = !!factura.proveedor.area?.id_area

  return (
      <Card
          className={`w-full ${clickable ? "cursor-pointer hover:shadow-md transition-shadow" : "opacity-75"}`}
          onClick={clickable ? gotoProveedor : undefined}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : -1}
          onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && gotoProveedor() : undefined}
      >
        <CardHeader>
            <CardTitle>
                  {factura.numero_factura}
            </CardTitle>
            <CardContent>
                <p>Fecha de emisión: {factura.fecha_emitida} </p>
                <p>Estado: {factura.estado}</p>
            </CardContent>
        </CardHeader>
    </Card>
  )
}

export default PrevFactura
