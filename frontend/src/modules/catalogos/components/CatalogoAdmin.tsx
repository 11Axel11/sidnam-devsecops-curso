import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import DataTable from "@/components/DataTable";
import IfPerm from "@/components/auth/IfPerm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { PERM } from "@/lib/permisosClinicos";
import { mensajeError } from "@/utils/apiError";
import { CATALOGOS, CATALOGO_KEYS, type CatalogoKey } from "../catalogosConfig";
import type { ItemCatalogo } from "../models/catalogos";
import { useCatalogoQuery, usePatchEstadoItemCatalogo } from "../hooks/catalogosHooks";
import AgregarItemCatalogoDialogo from "./AgregarItemCatalogoDialogo";

// Una sola pantalla para los cinco catálogos: lo que cambia entre ellos vive en CATALOGOS.
export default function CatalogoAdmin() {
  const [catalogo, setCatalogo] = useState<CatalogoKey>(CATALOGO_KEYS[0]);
  const [verInactivos, setVerInactivos] = useState(false);
  const confirmar = useConfirmacion();
  const cambiarEstado = usePatchEstadoItemCatalogo();

  const { data, isLoading, error } = useCatalogoQuery(catalogo, { soloActivos: !verInactivos });

  const alternarEstado = async (item: ItemCatalogo) => {
    const activar = !item.activo;
    const ok = await confirmar(
      activar
        ? `¿Reactivar "${item.nombre}"? Volverá a aparecer en los formularios.`
        : `¿Desactivar "${item.nombre}"? Dejará de aparecer en los formularios nuevos; las valoraciones ya guardadas no cambian.`,
      activar ? "approve" : "destructive",
    );
    if (!ok) return;
    try {
      await cambiarEstado.mutateAsync({ catalogo, id: item.id, activar });
      toast.success(activar ? "Ítem reactivado" : "Ítem desactivado");
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo cambiar el estado del ítem."));
    }
  };

  const columns = useMemo<ColumnDef<ItemCatalogo>[]>(() => [
    { header: "Nombre", accessorKey: "nombre" },
    {
      header: "Estado",
      accessorKey: "activo",
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? "accepted" : "outline"}>
          {row.original.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      id: "acciones",
      cell: ({ row }) => (
        <IfPerm perm={PERM.catalogos.actualizar}>
          <Button
            size="sm"
            variant={row.original.activo ? "destructive" : "approve"}
            disabled={cambiarEstado.isPending}
            onClick={() => alternarEstado(row.original)}
          >
            {row.original.activo ? "Desactivar" : "Reactivar"}
          </Button>
        </IfPerm>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [catalogo, cambiarEstado.isPending]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label>Catálogo</Label>
          <Select value={catalogo} onValueChange={(v) => setCatalogo(v as CatalogoKey)}>
            <SelectTrigger className="w-[320px] max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATALOGO_KEYS.map((k) => (
                <SelectItem key={k} value={k}>{CATALOGOS[k].etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <IfPerm perm={PERM.catalogos.ver}>
            <div className="flex items-center gap-2">
              <Switch id="ver-inactivos" checked={verInactivos} onCheckedChange={setVerInactivos} />
              <Label htmlFor="ver-inactivos">Ver inactivos</Label>
            </div>
          </IfPerm>
          <IfPerm perm={PERM.catalogos.crear}>
            <AgregarItemCatalogoDialogo key={catalogo} catalogo={catalogo} />
          </IfPerm>
        </div>
      </div>

      {error ? (
        <p className="text-center text-red-700">{mensajeError(error, "No se pudo cargar el catálogo.")}</p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground">Cargando…</p>
      ) : (
        <DataTable columns={columns} data={data ?? []} />
      )}
    </div>
  );
}
