import { Card, CardTitle } from "@/components/ui/card"
import type { CardAreaProveedorProps } from "../types/proveedoresTypes"

const CardAreaProveedor = ({ area, clickAction }: CardAreaProveedorProps) => {
    return (
        <div className="flex justify-center hover:cursor-pointer" onClick={() => clickAction(area.id_area)} >
            <Card className="w-xs p-5 max-h-full flex items-center justify-center 
            hover:shadow-md transition-transform duration-200">
            <CardTitle className="break-all">{area.nombre}</CardTitle>
        </Card>
    </div>
  )
}

export default CardAreaProveedor
