import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useGetFacturasPorNumero } from "../hooks/proveedoresHooks"
import useDebounce from "@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce"
import type { BuscarFactura } from "../models/proveedores"
import PrevFactura from "./PrevFactura"

const BuscarPorNumFactura = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [numeroFactura, setNumeroFactura] = useState("")

    const debouncedNumber = useDebounce(numeroFactura, 600)
    const isTyping = numeroFactura !== debouncedNumber
    const hasQuery = debouncedNumber.trim().length > 0

    const {
        FacturasProveedorNumero,
        loadingFacturasProveedorNumero,
        errorFacturasProveedorNumero,
    } = useGetFacturasPorNumero(debouncedNumber)

    const facturas: BuscarFactura[] = Array.isArray(FacturasProveedorNumero)
        ? FacturasProveedorNumero
        : FacturasProveedorNumero && typeof FacturasProveedorNumero === "object"
            ? [FacturasProveedorNumero as BuscarFactura]
            : []

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-auto">
                    <Search className="h-4 w-4" />
                    Buscar por número de factura
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex gap-3 mt-3 items-center">
                        <Input
                            placeholder="Buscar por número de factura"
                            value={numeroFactura}
                            onChange={(e) => setNumeroFactura(e.target.value)}
                            className="max-w-sm mb-3"
                            type="text"
                            autoFocus
                        />
                        {numeroFactura && (
                            <Button
                                variant="outline"
                                onClick={() => setNumeroFactura("")}
                                className="shrink-0"
                            >
                                Limpiar
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <DialogDescription className="flex justify-center text-center">
                    {hasQuery ? (
                        isTyping ? (
                            <span>Buscando por número…</span>
                        ) : loadingFacturasProveedorNumero ? (
                            <span>Cargando resultados…</span>
                        ) : errorFacturasProveedorNumero ? (
                            <span>Ocurrió un error al buscar. Inténtalo de nuevo.</span>
                        ) : facturas.length > 0 ? (
                            <span>
                                {facturas.length} resultado{facturas.length === 1 ? "" : "s"} encontrado{facturas.length === 1 ? "" : "s"}:
                            </span>
                        ) : (
                            <span>No se encontró ninguna factura con ese número.</span>
                        )
                    ) : (
                        <span>Ingresa un número para buscar la factura.</span>
                    )}
                </DialogDescription>

                {!isTyping &&
                    !loadingFacturasProveedorNumero &&
                    !errorFacturasProveedorNumero &&
                    hasQuery &&
                    facturas.length > 0 && (
                        <div className="mt-4 max-h-[55vh] overflow-auto pr-1 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
                            <div className="space-y-3">
                                {facturas.map((factura) => (
                                    <PrevFactura
                                        key={factura.id_factura}
                                        factura={factura}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
            </DialogContent>
        </Dialog>
    )
}

export default BuscarPorNumFactura
