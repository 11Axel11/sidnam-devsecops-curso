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
import PrevProveedor from "./PrevProveedor"
import { useGetProveedoresPorNombre } from "../hooks/proveedoresHooks"
import useDebounce from "@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce"
import type { Proveedores } from "../models/proveedores"

const BuscarNombreProveedor = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nombre, setNombre] = useState("")

  const debouncedNombre = useDebounce(nombre, 600)
  const isTyping = nombre !== debouncedNombre

  const { proveedoresNombre, loadingProveedoresNombre, errorProveedoresNombre } =
    useGetProveedoresPorNombre(debouncedNombre)

  const hasQuery = debouncedNombre.trim().length > 0
  const results: Proveedores[] = Array.isArray(proveedoresNombre) ? proveedoresNombre : []

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-auto">
          <Search/>
          Buscar por nombre de proveedor
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex gap-3 mt-3 items-center">
            <Input
              placeholder="Buscar por nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="max-w-sm mb-3"
              type="text"
              inputMode="text"
              autoFocus
            />
            {nombre && (
              <Button
                variant="outline"
                onClick={() => setNombre("")}
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
              <span>Buscando por nombre…</span>
            ) : loadingProveedoresNombre ? (
              <span>Cargando resultados…</span>
            ) : errorProveedoresNombre ? (
              <span>Ocurrió un error al buscar. Inténtalo de nuevo.</span>
            ) : results.length > 0 ? (
              <span>
                {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado
                {results.length !== 1 ? "s" : ""}:
              </span>
            ) : (
              <span>No se encontraron proveedores con ese nombre.</span>
            )
          ) : (
            <span>Ingresa un nombre para buscar proveedores.</span>
          )}
        </DialogDescription>

              {!isTyping && !loadingProveedoresNombre && !errorProveedoresNombre && hasQuery && results.length > 0 && (
                  <div className="mt-4 max-h-[55vh] overflow-auto pr-1 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent flex flex-col gap-4">
                      {results.map((p) => (
                          <PrevProveedor key={p.id_proveedor} proveedor={p} />
                      ))}
                  </div>
              )}
      </DialogContent>
    </Dialog>
  )
}

export default BuscarNombreProveedor
