import type { ReactNode } from "react";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import { formatearFechaClinica, formatearInstanteCR } from "@/components/app/clinico/fechaClinica";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { Label } from "@/components/ui/label";
import { etiquetaNivelDeterioro, type ValoracionNutricionalDetalle } from "../models/valoracionNutricional";

const si = (v: boolean) => (v ? "Sí" : "No");
const texto = (t: string | null) => (t && t.trim() ? t : "—");

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{etiqueta}</Label>
      <div className="whitespace-pre-wrap break-words text-sm">{children}</div>
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(160px,280px)_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm">{children}</dd>
    </div>
  );
}

// Vista de solo lectura (vigente, reemplazadas, anuladas y borradores que la persona no puede editar),
// con las filas etiqueta/valor del Figma «Nutrición — Valoración nutricional».
export default function ValoracionNutricionalLectura({ valoracion: v }: { valoracion: ValoracionNutricionalDetalle }) {
  const dato = v.datoFuncional;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 xl:grid-cols-3">
        <Dato etiqueta="Fecha de la valoración">{formatearFechaClinica(v.fecha)}</Dato>
        <Dato etiqueta="Persona profesional responsable"><ResponsableValoracion id={v.usuarioResponsableId} nombre={v.usuarioResponsableNombre} /></Dato>
        <Dato etiqueta="Estado de la valoración"><EstadoValoracionBadge estado={v.estado} anulado={v.anulado} /></Dato>
        <Dato etiqueta="Registro">
          <AuditoriaRegistro registro={v} />
        </Dato>
      </div>

      {v.anulado && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="mb-2 font-semibold">Valoración anulada</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Dato etiqueta="Motivo">{texto(v.motivoAnulacion)}</Dato>
            <Dato etiqueta="Anulada por"><ResponsableValoracion id={v.anuladoPorId} nombre={v.anuladoPorNombre} /></Dato>
            <Dato etiqueta="Fecha de anulación">{formatearInstanteCR(v.fechaAnulacion)}</Dato>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h4 className="font-semibold">Historia clínica — datos generales</h4>
        <dl className="divide-y rounded-md border px-4 text-left">
          <Fila etiqueta="Problema visual">{si(v.problemaVisual)}</Fila>
          <Fila etiqueta="Problema de cavidad oral">{si(v.problemaCavidadOral)}</Fila>
          <Fila etiqueta="Alergia a medicamentos">
            {v.alergiaMedicamentos ? `Sí — ${texto(v.detalleAlergiaMedicamentos)}` : "No"}
          </Fila>
          <Fila etiqueta="Datos funcionales">
            {dato ? `${dato.nombre}${dato.activo ? "" : " (desactivado)"}` : "—"}
          </Fila>
          <Fila etiqueta="Estado cognitivo">
            {v.estadoCognitivo === "con_deterioro"
              ? `Con deterioro cognitivo — nivel: ${v.nivelDeterioroCognitivo?.trim() ? etiquetaNivelDeterioro(v.nivelDeterioroCognitivo) : "—"}`
              : "Normal"}
          </Fila>
          <Fila etiqueta="Estado emocional">
            Depresión: {si(v.depresion)} <span className="mx-2">·</span> Ansiedad: {si(v.ansiedad)}
          </Fila>
        </dl>
      </section>
    </div>
  );
}
