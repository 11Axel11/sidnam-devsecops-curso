import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormEditarProducto from "./FormEditarProducto";
import { useExistenciaDetalle } from "../hooks/existenciaHooks";
import type { Existencia } from "../models/existencia";

export default function EditarExistenciaBoton({ existencia, categoriaId }: { existencia: Existencia; categoriaId: number }) {
  const [open, setOpen] = useState(false);
  const { data } = useExistenciaDetalle(existencia.id, open);

  return (
    <>
      <Button variant="update" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" />
      </Button>
      {open && data && (
        <FormEditarProducto
          idInventario={existencia.id}
          categoriaId={categoriaId}
          controlledOpen={open}
          onControlledOpenChange={setOpen}
          initialValues={{
            nombre: existencia.producto?.nombre ?? '',
            codigo: existencia.producto?.codigo ?? '',
            unidadMedida: existencia.unidadMedida?.id ?? 0,
            subcategoriaId: data.producto?.subcategoriaId,
            imagen_url: data.producto?.imagenUrl ?? '',
          }}
        />
      )}
    </>
  );
}
