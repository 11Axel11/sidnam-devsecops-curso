import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import IfPerm from "@/components/auth/IfPerm";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { useAuthz } from "@/hooks/useAuth";
import { PERM } from "@/lib/permisosClinicos";
import { mensajeError } from "@/utils/apiError";
import { useValoracionContexto } from "../hooks/useValoracionContexto";
import type { AntecedenteTraumaticoValoracion } from "../models/valoracion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import AnularAntecedenteTraumaticoDialogo from "./AnularAntecedenteTraumaticoDialogo";
import AntecedenteTraumaticoDialogo from "./AntecedenteTraumaticoDialogo";
import ContextoValoracion from "./ContextoValoracion";

type Props = {
  expedienteId: number;
  valoracionId?: number;
};

const texto = (t: string | null) => (t && t.trim() ? t : "—");

type DialogoAbierto =
  | { tipo: "alta" }
  | { tipo: "editar"; registro: AntecedenteTraumaticoValoracion }
  | { tipo: "retirar"; registro: AntecedenteTraumaticoValoracion }
  | null;

export default function AntecedentesTraumaticosPage({ expedienteId, valoracionId }: Props) {
  const { can } = useAuthz({ ignoreWildcard: true, normalize: true });
  const { valoracion, origen, borradorAbierto, cargando, error } = useValoracionContexto(expedienteId, valoracionId);
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);

  // Editable solo si es borrador y no está anulada (contrato §0); además hace falta el permiso de la acción.
  const editable = !!valoracion && valoracion.estado === "borrador" && !valoracion.anulado;
  const puedeAgregar = editable && can(PERM.terapiaFisica.crear);
  const puedeModificar = editable && can(PERM.terapiaFisica.actualizar);

  const registros = valoracion?.antecedentesTraumaticos ?? [];

  const columns = useMemo<ColumnDef<AntecedenteTraumaticoValoracion>[]>(() => {
    const base: ColumnDef<AntecedenteTraumaticoValoracion>[] = [
      { header: "Tipo", id: "tipo", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.tipo.nombre}</span> },
      { header: "Localización anatómica", id: "localizacion", cell: ({ row }) => texto(row.original.localizacionAnatomica) },
      { header: "Tiempo transcurrido", id: "tiempo", cell: ({ row }) => texto(row.original.tiempoTranscurrido) },
      {
        header: "Descripción",
        id: "descripcion",
        cell: ({ row }) => (
          <span className="block max-w-prose whitespace-pre-wrap break-words text-left">{texto(row.original.descripcion)}</span>
        ),
      },
    ];
    if (!puedeModificar) return base;
    return [
      ...base,
      {
        header: "Acciones",
        id: "acciones",
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <BotonRegistro
              expedienteId={expedienteId}
              size="icon" variant="outline" title="Editar"
              aria-label={`Editar antecedente ${row.original.tipo.nombre}`}
              onClick={() => setDialogo({ tipo: "editar", registro: row.original })}
            >
              <Pencil />
            </BotonRegistro>
            <Button
              size="icon" variant="outline" title="Retirar"
              aria-label={`Retirar antecedente ${row.original.tipo.nombre}`}
              onClick={() => setDialogo({ tipo: "retirar", registro: row.original })}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ];
  }, [puedeModificar, expedienteId]);

  if (cargando) return <WebLoader />;
  if (error) {
    return <p className="text-sm text-red-700" role="alert">{mensajeError(error, "No se pudo cargar la valoración.")}</p>;
  }

  // ---- sin valoración: no hay sobre qué registrar ----
  if (!valoracion) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Antecedentes traumáticos registrados</h3>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>No hay una valoración en elaboración ni vigente para este residente. Los antecedentes traumáticos se registran dentro de una valoración en elaboración.</p>
          <IfPerm perm={PERM.terapiaFisica.crear}>
            <Button asChild variant="create" className="mt-4">
              <Link
                to="/residentes/$id/terapia-fisica/valoracion"
                params={{ id: expedienteId } as never}
                search={{ nueva: true }}
              >
                <Plus /> Nueva valoración
              </Link>
            </Button>
          </IfPerm>
        </div>
      </div>
    );
  }

  // Motivo visible por el que no se puede registrar (el botón queda deshabilitado, no oculto).
  const motivoBloqueo = valoracion.anulado
    ? `Esta valoración está anulada: sus antecedentes no se pueden modificar.${valoracion.motivoAnulacion ? ` Motivo: ${valoracion.motivoAnulacion}` : ""}`
    : valoracion.estado !== "borrador"
      ? "Esta valoración ya está cerrada: sus antecedentes no se pueden modificar. Se registran sobre una valoración en elaboración."
      : null;

  return (
    <div className="space-y-4">
      <ContextoValoracion expedienteId={expedienteId} valoracion={valoracion} origen={origen} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Antecedentes traumáticos registrados</h3>
        <IfPerm perm={PERM.terapiaFisica.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" disabled={!puedeAgregar} onClick={() => setDialogo({ tipo: "alta" })}>
            <Plus /> Nuevo antecedente
          </BotonRegistro>
        </IfPerm>
      </div>

      {motivoBloqueo && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{motivoBloqueo}</p>
          <p className="mt-1 flex flex-wrap gap-x-4">
            {borradorAbierto && borradorAbierto.id !== valoracion.id && (
              <Link
                to="/residentes/$id/terapia-fisica/antecedentes-traumaticos"
                params={{ id: expedienteId } as never}
                search={{ valoracion: borradorAbierto.id }}
                className="font-medium underline underline-offset-4"
              >
                Ir a los antecedentes del borrador abierto
              </Link>
            )}
            {!borradorAbierto && can(PERM.terapiaFisica.crear) && (
              <Link
                to="/residentes/$id/terapia-fisica/valoracion"
                params={{ id: expedienteId } as never}
                search={{ nueva: true }}
                className="font-medium underline underline-offset-4"
              >
                Crear una nueva valoración
              </Link>
            )}
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={registros}
        emptyMessage="Sin antecedentes traumáticos registrados"
      />

      {dialogo?.tipo === "alta" && (
        <AntecedenteTraumaticoDialogo key="alta" expedienteId={expedienteId} valoracionId={valoracion.id} onClose={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "editar" && (
        <AntecedenteTraumaticoDialogo
          key={`editar-${dialogo.registro.id}`}
          expedienteId={expedienteId}
          valoracionId={valoracion.id}
          registro={dialogo.registro}
          onClose={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "retirar" && (
        <AnularAntecedenteTraumaticoDialogo
          antecedenteId={dialogo.registro.id}
          open
          onOpenChange={(abierto) => { if (!abierto) setDialogo(null); }}
        />
      )}
    </div>
  );
}
