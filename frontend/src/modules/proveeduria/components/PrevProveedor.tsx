import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Proveedores } from "../models/proveedores"
import { useNavigate } from "@tanstack/react-router"

type PrevProveedorProps = {
  proveedor: Proveedores
}

const PrevProveedor = ({ proveedor }: PrevProveedorProps) => {
  const navigate = useNavigate()

  const gotoProveedor = () => {
    const idProveedor = String(proveedor.id_proveedor)
    const idAreaProv = proveedor.area?.id_area != null ? String(proveedor.area.id_area) : null

    if (!idAreaProv) {
      console.warn("Proveedor sin área, no se puede navegar:", proveedor)
      return
    }

    navigate({
      to: "/proveeduria/$idAreaProv/$idProveedor",
      params: { idProveedor, idAreaProv },
    })
  }

  const clickable = !!proveedor.area?.id_area

  return (
    <Card
      className={`w-full ${clickable ? "cursor-pointer hover:shadow-md transition-shadow" : "opacity-75"}`}
      onClick={clickable ? gotoProveedor : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && gotoProveedor() : undefined}
    >
      <CardHeader>
        <CardTitle>{proveedor.nombre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Contactos:</p>
        <div className="grid gap-1">
          {proveedor.numero && <p>{proveedor.numero}</p>}
          {proveedor.correo && <p>{proveedor.correo}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default PrevProveedor
