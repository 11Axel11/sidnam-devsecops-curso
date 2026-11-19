import IfPerm from "@/components/auth/IfPerm";
import FormEditarProducto from "@/modules/inventarios/components/FormEditarProducto";
import type { Inventario } from "@/modules/inventarios/models/inventario";
import  { requireFor } from "@/modules/inventarios/permissions";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";

function RowActions({
  row,
  categoryId,
  onArchivar,
}: {
  row: Inventario;
  categoryId: string;
  onArchivar: (id: number) => void;
}) {

  return (
    <div className="flex gap-2">
      <IfPerm perm={requireFor(categoryId, 'Actualizar')!}>
        <FormEditarProducto
          idInventario={row.id}
          initialValues={{
            nombre: row.nombre,
            codigo: row.codigo,
            unidadMedida: row.unidadMedida.id,
            subcategoriaId: row.subCategoriaId,
            imagen_url: row.imagen
          }}
          categoriaId={Number(categoryId)}
        />
      </IfPerm>

      <IfPerm anyOf={[
        requireFor(categoryId, 'Eliminar')!,
        requireFor(categoryId, 'Actualizar')!,
      ]}>
        <Button variant="destructive" onClick={() => onArchivar(row.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </IfPerm>
    </div>
  );
}
export default RowActions