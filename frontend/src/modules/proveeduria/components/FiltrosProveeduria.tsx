import BuscarNombreProveedor from "./BuscarNombreProveedor"
import BuscarPorNumFactura from "./BuscarPorNumFactura"

const FiltrosProveeduria = () => {
  return (
    <nav className="flex gap-4">
      <BuscarNombreProveedor />
      <BuscarPorNumFactura />
    </nav>
  )
}

export default FiltrosProveeduria
