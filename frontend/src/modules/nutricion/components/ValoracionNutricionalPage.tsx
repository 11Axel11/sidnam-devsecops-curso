import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import EncabezadoVolver from "@/components/app/clinico/EncabezadoVolver";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import HistorialValoraciones from "@/components/app/clinico/HistorialValoraciones";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import IfPerm from "@/components/auth/IfPerm";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { useAuthz } from "@/hooks/useAuth";
import { PERM } from "@/lib/permisosClinicos";
import { mensajeError } from "@/utils/apiError";
import {
  useHistorialValoracionesNutricionales, useValoracionNutricionalDetalle, useValoracionNutricionalVigente,
} from "../hooks/valoracionNutricionalHooks";
import type { ValoracionNutricionalDetalle } from "../models/valoracionNutricional";
import AnularValoracionNutricionalDialogo from "./AnularValoracionNutricionalDialogo";
import ValoracionNutricionalFormulario from "./ValoracionNutricionalFormulario";
import ValoracionNutricionalLectura from "./ValoracionNutricionalLectura";

type Props = {
  expedienteId: number;
  valoracionId?: number;
  nueva?: boolean;
  onAbrir: (id: number, opciones?: { replace?: boolean }) => void;
  onNueva: () => void;
  onVolver: () => void;
};

export default function ValoracionNutricionalPage({ expedienteId, valoracionId, nueva, onAbrir, onNueva, onVolver }: Props) {
  const { can } = useAuthz({ ignoreWildcard: true, normalize: true });
  const puedeCrear = can(PERM.nutricion.crear);
  const puedeActualizar = can(PERM.nutricion.actualizar);
  const [anularId, setAnularId] = useState<number | null>(null);

  const dialogoAnular = anularId !== null && (
    <AnularValoracionNutricionalDialogo
      valoracionId={anularId}
      open
      onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
    />
  );

  const botonAnular = (v: ValoracionNutricionalDetalle) =>
    !v.anulado && (
      <IfPerm perm={PERM.nutricion.anular}>
        <Button type="button" variant="destructive" onClick={() => setAnularId(v.id)}>Anular valoración</Button>
      </IfPerm>
    );

  // ---- valoración nueva ----
  if (nueva) {
    return (
      <div className="space-y-4">
        <EncabezadoVolver titulo="Nueva valoración nutricional" onVolver={onVolver} />
        {puedeCrear ? (
          <ValoracionNutricionalFormulario
            key="nueva"
            expedienteId={expedienteId}
            onCreada={(id) => onAbrir(id, { replace: true })}
            onCerrada={onVolver}
            onSalir={onVolver}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No tienes permiso para crear valoraciones nutricionales.</p>
        )}
      </div>
    );
  }

  // ---- una valoración concreta (borrador editable o lectura) ----
  if (valoracionId) {
    return (
      <DetalleValoracion
        valoracionId={valoracionId}
        expedienteId={expedienteId}
        puedeActualizar={puedeActualizar}
        onVolver={onVolver}
        botonAnular={botonAnular}
        dialogoAnular={dialogoAnular}
      />
    );
  }

  // ---- vista principal ----
  return (
    <VistaPrincipal
      expedienteId={expedienteId}
      puedeActualizar={puedeActualizar}
      onAbrir={onAbrir}
      onNueva={onNueva}
      botonAnular={botonAnular}
      dialogoAnular={dialogoAnular}
    />
  );
}

type DetalleProps = {
  valoracionId: number;
  expedienteId: number;
  puedeActualizar: boolean;
  onVolver: () => void;
  botonAnular: (v: ValoracionNutricionalDetalle) => React.ReactNode;
  dialogoAnular: React.ReactNode;
};

function DetalleValoracion({ valoracionId, expedienteId, puedeActualizar, onVolver, botonAnular, dialogoAnular }: DetalleProps) {
  const { data, isLoading, error } = useValoracionNutricionalDetalle(valoracionId);

  if (isLoading) return <WebLoader />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <EncabezadoVolver titulo="Valoración nutricional" onVolver={onVolver} />
        <p className="text-sm text-red-700" role="alert">{mensajeError(error, "No se pudo cargar la valoración.")}</p>
      </div>
    );
  }

  // Editable solo si es borrador y no está anulada (contrato §0) y la persona puede actualizar.
  // Vigente, reemplazada y anulada son siempre solo lectura.
  const editable = data.estado === "borrador" && !data.anulado && puedeActualizar;

  return (
    <div className="space-y-4">
      <EncabezadoVolver titulo="Valoración nutricional" onVolver={onVolver} />
      {editable ? (
        <ValoracionNutricionalFormulario
          key={data.id}
          expedienteId={expedienteId}
          valoracion={data}
          onCreada={() => undefined}
          onCerrada={onVolver}
          onSalir={onVolver}
        />
      ) : (
        <>
          <ValoracionNutricionalLectura valoracion={data} />
          <div className="flex gap-3">{botonAnular(data)}</div>
        </>
      )}
      {dialogoAnular}
    </div>
  );
}

type PrincipalProps = {
  expedienteId: number;
  puedeActualizar: boolean;
  onAbrir: (id: number) => void;
  onNueva: () => void;
  botonAnular: (v: ValoracionNutricionalDetalle) => React.ReactNode;
  dialogoAnular: React.ReactNode;
};

function VistaPrincipal({ expedienteId, puedeActualizar, onAbrir, onNueva, botonAnular, dialogoAnular }: PrincipalProps) {
  const historial = useHistorialValoracionesNutricionales(expedienteId);
  const vigente = useValoracionNutricionalVigente(expedienteId);

  // `…/vigente` no devuelve borradores: el borrador abierto se busca en el historial
  // (viene de la más reciente a la más antigua).
  const borrador = useMemo(
    () => historial.data?.find((v) => v.estado === "borrador" && !v.anulado),
    [historial.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Valoración nutricional</h3>
        {borrador ? (
          puedeActualizar ? (
            <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => onAbrir(borrador.id)}>
              Retomar borrador
            </BotonRegistro>
          ) : (
            <Button type="button" variant="create" onClick={() => onAbrir(borrador.id)}>Ver borrador</Button>
          )
        ) : (
          <IfPerm perm={PERM.nutricion.crear}>
            <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={onNueva}>
              <Plus /> Nueva valoración
            </BotonRegistro>
          </IfPerm>
        )}
      </div>

      {borrador && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hay un borrador en elaboración con fecha {formatearFechaClinica(borrador.fecha)}.
          {puedeActualizar ? " Retómalo para continuar o cerrarlo." : ""}
        </div>
      )}

      <section className="space-y-3">
        <h4 className="font-medium">Valoración vigente</h4>
        {vigente.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : vigente.error ? (
          <p className="text-sm text-red-700" role="alert">{mensajeError(vigente.error, "No se pudo cargar la valoración vigente.")}</p>
        ) : vigente.data ? (
          <>
            <ValoracionNutricionalLectura valoracion={vigente.data} />
            <div className="flex gap-3">{botonAnular(vigente.data)}</div>
          </>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin valoración vigente
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="font-medium">Historial</h4>
        <HistorialValoraciones
          datos={historial.data}
          cargando={historial.isLoading}
          error={historial.error}
          onAbrir={onAbrir}
        />
      </section>

      {dialogoAnular}
    </div>
  );
}
